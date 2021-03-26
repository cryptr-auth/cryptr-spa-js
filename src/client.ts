import * as Interface from './interfaces'
import * as Sentry from '@sentry/browser'
import axios from 'axios'
import {
  ALLOWED_LOCALES,
  cryptrBaseUrl,
  DEFAULT_LEEWAY_IN_SECONDS,
  DEFAULT_REFRESH_RETRY,
  DEFAULT_SCOPE,
} from './constants'
import { Sign } from './types'
import Request from './request'
import Storage from './storage'
import Transaction, { refreshKey } from './transaction'
import Jwt from './jwt'
import InMemory from './memory'
import { validAppBaseUrl, validClientId, validRedirectUri } from '@cryptr/cryptr-config-validation'
import { Integrations } from '@sentry/tracing'
import EventTypes from './event_types'
import { TokenError } from './interfaces'

const locationSearch = (): string => {
  if (window != undefined && window.location !== undefined) {
    return window.location.search
  } else {
    /* istanbul ignore next */
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
  private worker?: Worker

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
    try {
      const workerString =
        "onmessage = function(oEvt) {setTimeout(() => {postMessage('rotate');}, 10000)};"
      const blob = new Blob([workerString], {})
      this.worker = new Worker(URL.createObjectURL(blob))
      this.worker.onmessage = (rEvt) => {
        if (rEvt.data == 'rotate') {
          this.handleRefreshTokens()
        }
      }
    } catch (error) {
      console.log('simple worker error')
      console.error(error)
    }
  }

  private configureSentry(config: Interface.Config) {
    if (config.telemetry !== undefined && !config.telemetry) {
      return
    }
    Sentry.init({
      dsn: 'https://4fa5d7f40b554570b64af9c4326b0efb@o468922.ingest.sentry.io/5497495',
      integrations: [new Integrations.BrowserTracing()],
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
    return this.currentAccessTokenPresent()
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

  handleTokensErrors(errors: TokenError[]): boolean {
    const invalidGrantError = errors.find((e: TokenError) => e.error === 'invalid_grant')
    if (invalidGrantError) {
      console.error('invalid grant detected')
      window.dispatchEvent(new Event(EventTypes.REFRESH_INVALID_GRANT))
      return true
    } else {
      console.error("error(s) while handling tokens");
      errors.forEach(error => {
        console.error(error.error_description)
        console.debug(error)
      })
    }
    return false
  }

  handleNewTokens(refreshStore: Interface.RefreshStore, tokens?: any) {
    if (tokens?.valid) {
      this.memory.setAccessToken(tokens.accessToken)
      this.memory.setIdToken(tokens.idToken)
      const refreshTokenWrapper = Transaction.getRefreshParameters(tokens)
      const cookieExpirationDate = new Date(refreshTokenWrapper.refresh_expiration_date)
      Storage.createCookie(refreshKey(), refreshTokenWrapper, cookieExpirationDate)

      this.recurringRefreshToken(refreshTokenWrapper)
    } else {
      if (this.handleTokensErrors(tokens.errors)) {
        return
      }
      this.recurringRefreshToken(refreshStore)
    }
  }

  async handleRedirectCallback() {
    const redirectParams = parseRedirectParams()
    const transaction = await Transaction.get(redirectParams.state)
    const tokens = await Transaction.getTokens(
      this.config,
      redirectParams.authorization,
      transaction,
    )

    this.handleNewTokens(this.getRefreshStore(), tokens)

    return tokens
  }

  canRefresh(refreshStore: Interface.RefreshStore): boolean {
    let {
      access_token_expiration_date,
      refresh_leeway,
      refresh_retry,
      refresh_token,
    } = refreshStore
    let tryToRefreshDateStart = new Date(access_token_expiration_date)
    const leeway = refresh_leeway || DEFAULT_LEEWAY_IN_SECONDS
    const retry = refresh_retry || DEFAULT_REFRESH_RETRY
    tryToRefreshDateStart.setSeconds(tryToRefreshDateStart.getSeconds() - leeway * retry)

    const now = new Date()
    return (
      typeof refresh_token === 'string' &&
      (!this.currentAccessTokenPresent() || tryToRefreshDateStart < now)
    )
  }

  getRefreshStore(): Interface.RefreshStore {
    return Storage.getCookie(refreshKey()) as Interface.RefreshStore
  }

  async handleRefreshTokens() {
    const refreshStore = this.getRefreshStore()

    if (this.canRefresh(refreshStore)) {
      const tokens = await Transaction.getTokensByRefresh(this.config, refreshStore.refresh_token)
      this.handleNewTokens(refreshStore, tokens)
    } else if (Object.keys(refreshStore).length === 0) {
      console.log('should log out')
      setTimeout(() => {
        window.dispatchEvent(new Event(EventTypes.REFRESH_INVALID_GRANT))
      }, 1000)
    } else {
      this.recurringRefreshToken(refreshStore)
    }
    return true
  }

  recurringRefreshToken(refreshTokenWrapper: Interface.RefreshStore) {
    const eventData = {
      refreshTokenParameters: refreshTokenWrapper,
    }
    try {
      this.worker?.postMessage(eventData)
    } catch (error) {
      console.error('error while reccurring refresh token')
      console.error(error)
    }
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

  canHandleInvitation(searchParams = locationSearch()) {
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
            this.memory.clearTokens()
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
            console.error('logout response not compliant')
            console.error(resp.data)
          }
        })
        .catch((error) => {
          console.error('logout SPA error')
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
