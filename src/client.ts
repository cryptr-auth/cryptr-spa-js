import * as Interface from './interfaces'
import * as Sentry from '@sentry/browser'
import axios from 'axios'
import { ALLOWED_LOCALES, cryptrBaseUrl, DEFAULT_SCOPE } from './constants'
import { Sign } from './types'
import Request from './request'
import Storage from './storage'
import Transaction, { refreshKey, transactionKey } from './transaction'
import Jwt from './jwt'
import InMemory from './memory'
import { validAppBaseUrl, validClientId, validRedirectUri } from '@cryptr/cryptr-config-validation'
import EventTypes from './event_types'
import { Integrations } from '@sentry/tracing'

const locationSearch = (): string => {
  if (window != undefined && window.location !== undefined) {
    return window.location.search
  } else {
    return ''
  }
}

const parseRedirectParams = (): { state: string; authorization: Interface.Authorization } => {
  const urlParams = new URLSearchParams(locationSearch())

  if (urlParams.get('state') && urlParams.get('authorization_id') && urlParams.get('code')) {
    return {
      state: urlParams.get('state') || '',
      authorization: {
        id: urlParams.get('authorization_id') || '',
        code: urlParams.get('code') || '',
      },
    }
  } else {
    throw new Error('Can not parse authorization params')
  }
}

const CODE_PARAMS = /[?&]code=[^&]+/
const STATE_PARAMS = /[?&]state=[^&]+/
const AUTH_PARAMS = /[?&]authorization_id=[^&]+/
class Client {
  config: Interface.Config
  private memory: InMemory = new InMemory()
  // worker: Worker

  constructor(config: Interface.Config) {
    this.configureSentry(config)
    validAppBaseUrl(cryptrBaseUrl(config))
    validClientId(config.client_id)
    validRedirectUri(config.default_redirect_uri)
    if (config.default_locale && !ALLOWED_LOCALES.includes(config.default_locale)) {
      throw new Error(
        `'${config.default_locale}' locale not valid, possible values ${ALLOWED_LOCALES}`,
      )
    }
    this.config = config
    // this.worker = new Worker('/src/token.worker.js')
    // if ('serviceWorker' in navigator) {
    //   navigator.serviceWorker
    //     .register('/src/token.worker.js')
    //     .then(function (registration) {
    //       console.log('Registration successful, scope is:', registration.scope)
    //     })
    //     .catch(function (error) {
    //       console.log(error)
    //       console.log('Service worker registration failed, error:', error)
    //     })
    // }
    // this.worker.addEventListener('message', (event) => {
    //   if (event.data == 'rotate') {
    //     this.refreshTokens()
    //   }
    // })
  }

  private configureSentry(config: Interface.Config) {
    if (config.telemetry !== undefined && !config.telemetry) {
      return
    }
    Sentry.init({
      dsn: 'https://4fa5d7f40b554570b64af9c4326b0efb@o468922.ingest.sentry.io/5497495',
      integrations: [new Integrations.BrowserTracing()],

      // We recommend adjusting this value in production, or using tracesSampler
      // for finer control
      tracesSampleRate: 1.0,
    })
    Sentry.setContext('app', {
      tenant: config.tenant_domain,
      client_id: config.client_id,
      audience: config.audience,
    })
  }

  getCurrentAccessToken(): string | undefined {
    return this.memory.getAccessToken()
  }

  getCurrentIdToken(): string | undefined {
    return this.memory.getIdToken()
  }

  private currentAccessTokenPresent(): boolean {
    let currentAccessToken = this.getCurrentAccessToken()
    return currentAccessToken !== undefined && currentAccessToken.length > 0
  }

  async isAuthenticated() {
    if (!this.currentAccessTokenPresent()) {
      let canAuthentify = this.hasAuthenticationParams()
      let canInvite = this.hasInvitationParams()

      if (!canInvite && !canAuthentify) {
        await this.refreshTokens()

        return this.currentAccessTokenPresent()
      }
    }
    return this.currentAccessTokenPresent()
  }

  handleRefreshTokens(response: any) {
    if (response['data'] !== undefined) {
      let data = response['data']
      let refresh_token = data['refresh_token']
      let expiration_date = Date.parse(data['refresh_token_expires_at'])
      if (refresh_token !== undefined) {
        let refreshObj = {
          refresh_token: refresh_token,
          rotation_duration: DEFAULT_REFRESH_ROTATION_DURATION,
          expiration_date: expiration_date,
        }
        Storage.createCookie(refreshKey(), refreshObj)

        let accessToken = data['access_token']
        this.memory.setAccessToken(accessToken)

        let idToken = data['id_token']
        this.memory.setIdToken(idToken)
        // @ts-ignore
        refreshObj['access_token'] = accessToken
        // this.worker.postMessage(refreshObj)
        this.postponeRefresh(refreshObj)
      }
    }
  }

  private postponeRefresh(refresObj: any) {
    let { rotation_duration, expiration_date } = refresObj
    if (new Date().getTime() <= expiration_date) {
      setTimeout(() => {
        this.refreshTokens()
      }, rotation_duration)
    } else {
      console.error('refresh is no more valid')
      window.dispatchEvent(new Event(EventTypes.REFRESH_EXPIRED))
    }
  }

  async refreshTokens() {
    let refreshTokenData = Storage.getCookie(refreshKey())
    // @ts-ignore
    if (refreshTokenData.hasOwnProperty('refresh_token') && refreshTokenData.refresh_token) {
      // @ts-ignore
      let refreshToken = refreshTokenData.refresh_token
      const transaction = await Transaction.create(Sign.Refresh, '')

      await Request.refreshTokens(this.config, transaction, refreshToken)
        .then((response: any) => this.handleRefreshTokens(response))
        .catch((error) => {
          let response = error.response
          if (response && response.status === 400 && response.data.error === 'invalid_grant') {
            window.dispatchEvent(new Event(EventTypes.REFRESH_INVALID_GRANT))
          }
        })
        .finally(() => {
          // delete temp cookie
          Storage.deleteCookie(transactionKey(transaction.pkce.state))
        })
    }
  }

  finalScope(scope?: string): string {
    if (!scope || scope === DEFAULT_SCOPE) {
      return DEFAULT_SCOPE
    }
    const scopeArray = scope.split(' ')
    const defaultScopeArray = DEFAULT_SCOPE.split(' ')
    const union = [...new Set([...defaultScopeArray, ...scopeArray])]
    return union.join(' ')
  }

  private async signWithoutRedirect(
    sign: Sign,
    scope = DEFAULT_SCOPE,
    locale?: string,
    redirectUri = this.config.default_redirect_uri,
  ) {
    if (redirectUri !== this.config.default_redirect_uri) {
      validRedirectUri(redirectUri)
    }
    await Transaction.create(sign, this.finalScope(scope), locale, redirectUri)
  }

  async signInWithoutRedirect(
    scope = DEFAULT_SCOPE,
    redirectUri = this.config.default_redirect_uri,
    locale?: string,
  ) {
    this.signWithoutRedirect(Sign.In, scope, locale, redirectUri)
  }

  async signUpWithoutRedirect(
    scope = DEFAULT_SCOPE,
    redirectUri = this.config.default_redirect_uri,
    locale?: string,
  ) {
    this.signWithoutRedirect(Sign.Up, scope, locale, redirectUri)
  }

  async inviteWithoutRedirect(
    scope = DEFAULT_SCOPE,
    redirectUri = this.config.default_redirect_uri,
    locale?: string,
  ) {
    this.signWithoutRedirect(Sign.Invite, scope, locale, redirectUri)
  }

  private async signWithRedirect(
    sign: Sign,
    scope = DEFAULT_SCOPE,
    locale?: string,
    redirectUri = this.config.default_redirect_uri,
  ) {
    if (redirectUri !== this.config.default_redirect_uri) {
      validRedirectUri(redirectUri)
    }
    const transaction = await Transaction.create(sign, this.finalScope(scope), locale, redirectUri)
    const url = await Transaction.signUrl(this.config, transaction)

    window.location.assign(url.href)
  }

  async signInWithRedirect(
    scope = DEFAULT_SCOPE,
    redirectUri = this.config.default_redirect_uri,
    locale?: string,
  ) {
    this.signWithRedirect(Sign.In, scope, locale, redirectUri)
  }

  async signUpWithRedirect(
    scope = DEFAULT_SCOPE,
    redirectUri = this.config.default_redirect_uri,
    locale?: string,
  ) {
    this.signWithRedirect(Sign.Up, scope, locale, redirectUri)
  }

  async inviteWithRedirect(
    scope = DEFAULT_SCOPE,
    redirectUri = this.config.default_redirect_uri,
    locale?: string,
  ) {
    this.signWithRedirect(Sign.Invite, scope, locale, redirectUri)
  }

  async handleInvitationState(scope = DEFAULT_SCOPE) {
    const urlParams = new URLSearchParams(locationSearch())
    const state = urlParams.get('state')
    const transaction = await Transaction.createFromState(state, Sign.Invite, scope)
    const url = await Transaction.signUrl(this.config, transaction)
    window.location.assign(url.href)
  }

  async handleRedirectCallback() {
    const redirectParams = parseRedirectParams()
    const transaction = await Transaction.get(redirectParams.state)
    const tokens = await Transaction.getTokens(
      this.config,
      redirectParams.authorization,
      transaction,
    )
    this.memory.setAccessToken(tokens.accessToken)
    this.memory.setIdToken(tokens.idToken)
    return tokens
  }

  getUser() {
    const idToken = this.getCurrentIdToken()
    return idToken === undefined ? idToken : Jwt.body(idToken)
  }

  getClaimsFromAccess(accessToken: string) {
    if (accessToken !== undefined && accessToken.length > 0) {
      return Jwt.body(accessToken)
    }
    return null
  }

  private hasAuthenticationParams(searchParams = locationSearch()): boolean {
    return CODE_PARAMS.test(searchParams) && STATE_PARAMS.test(searchParams)
  }

  private hasInvitationParams(searchParams = locationSearch()) {
    return STATE_PARAMS.test(searchParams) && !AUTH_PARAMS.test(searchParams)
  }

  canHandleAuthentication(searchParams = locationSearch()): boolean {
    return !this.currentAccessTokenPresent() && this.hasAuthenticationParams(searchParams)
  }

  async canHandleInvitation(searchParams = locationSearch()) {
    return !this.currentAccessTokenPresent() && this.hasInvitationParams(searchParams)
  }

  async userAccountAccess() {
    const accessToken = this.getCurrentAccessToken()
    if (accessToken) {
      let url: URL = new URL(cryptrBaseUrl(this.config))
      url.pathname = `/api/v1/client-management/tenants/${this.config.tenant_domain}/account-access`
      let params = {
        client_id: this.config.client_id,
        access_token: accessToken,
      }
      let config = {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
      return axios.post(url.toString(), params, config)
    } else {
      console.log('no accessToken found')
      return
    }
  }

  async logOut(callback: any, location = window.location) {
    const accessToken = this.getCurrentAccessToken()
    if (accessToken) {
      Request.revokeAccessToken(this.config, accessToken)
        .then(async (resp) => {
          if (resp.data.revoked_at !== undefined) {
            await Storage.clearCookies(this.config.client_id)
            await this.memory.clearTokens()
            if (typeof callback === 'function' && callback !== null) {
              callback()
            } else {
              console.info('Default logOut callback : reload page')
              // reload page if no callback defined
              if (location !== undefined) {
                location.replace(location.href.split('?')[0])
              }
            }
          } else {
            console.error(resp.data)
          }
        })
        .catch((error) => {
          if (this.config.telemetry == undefined || this.config.telemetry) {
            Sentry.captureException(error)
          }
          console.error(error)
        })
    } else {
      console.log('No accessToken found')
    }
    return true
  }

  decoratedRequest(axiosRequestConfig: any) {
    return Request.decoratedRequest(this.getCurrentAccessToken(), axiosRequestConfig)
  }
}

export default Client
