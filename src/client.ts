import * as Interface from './interfaces'
import * as Sentry from '@sentry/browser'
import axios from 'axios'
import {
  ALLOWED_LOCALES,
  cryptrBaseUrl,
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
// @ts-ignore
import TokenWorker from './token.worker.js'

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

    if ('serviceWorker' in navigator) {
      this.worker = new TokenWorker()
      // this.worker?.addEventListener('message', (event: MessageEvent) => {
      //   if (event.data == 'rotate') {
      //     this.refreshTokens()
      //   }
      // })
    }
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
      let canAUthenticate = this.hasAuthenticationParams()
      let canInvite = this.hasInvitationParams()

      if (!canInvite && !canAUthenticate) {
        await this.handleRefreshTokens()

        return this.currentAccessTokenPresent()
      }
    }
    return this.currentAccessTokenPresent()
  }

  // @thib DEPRECATED in favor of handleRefresh (will be rename in handleRefreshTokens when ready)
  // handleRefreshTokens(response: any) {
  //   if (response['data'] !== undefined) {
  //     let data = response['data']
  //     console.log('data')
  //     console.log(data)

  //     let access_token_expiration_date = Date.parse(data['expires_at'])
  //     let refresh_token = data['refresh_token']
  //     let refresh_leeway = data['refresh_leeway']
  //     let refresh_retry = data['refresh_retry']
  //     let refresh_expiration_date = Date.parse(data['refresh_token_expires_at'])

  //     if (refresh_token !== undefined) {
  //       let refreshObj = {
  //         refresh_expiration_date: refresh_expiration_date,
  //         refresh_token: refresh_token,
  //         refresh_leeway: refresh_leeway,
  //         refresh_retry: refresh_retry,
  //         access_token_expiration_date: access_token_expiration_date,
  //       }
  //       Storage.createCookie(refreshKey(), refreshObj)

  //       let accessToken = data['access_token']
  //       this.memory.setAccessToken(accessToken)

  //       let idToken = data['id_token']
  //       this.memory.setIdToken(idToken)
  //       // @ts-ignore
  //       refreshObj['access_token'] = accessToken
  //       // this.worker.postMessage(refreshObj)
  //       this.postponeRefresh(refreshObj)
  //     }
  //   }
  // }

  // @thib DEPRECATED
  // private postponeRefresh(refresObj: any) {
  //   let {
  //     access_token_expiration_date,
  //     refresh_expiration_date,
  //     refresh_leeway,
  //     refresh_retry,
  //   } = refresObj
  //   console.log('refresObj')
  //   console.log(refresObj)
  //   let tryToRefreshDateStart = new Date(access_token_expiration_date)

  //   const leeway = refresh_leeway || DEFAULT_LEEWAY_IN_SECONDS
  //   const retry = refresh_retry || DEFAULT_REFRESH_RETRY

  //   // tryToRefreshDateStart with
  //   tryToRefreshDateStart.setSeconds(tryToRefreshDateStart.getSeconds() - leeway * retry)

  //   //  INFINITE LOOP IN N LEEWAY SECONDS
  //   // Should be in service worker js (soon)
  //   // for (;;) {
  //   setTimeout(() => {
  //     if (refresh_expiration_date < new Date()) {
  //       console.error('refresh is no more valid')
  //       window.dispatchEvent(new Event(EventTypes.REFRESH_EXPIRED))
  //       return
  //     } else if (tryToRefreshDateStart < new Date()) {
  //       console.log('time to refresh')
  //       this.refreshTokens()
  //       return
  //     }
  //     console.log('Not time to refresh')
  //     return
  //   }, DEFAULT_LEEWAY_IN_SECONDS)
  // }

  //  @thib SHOULD be in transaction with after getTokens
  // async refreshTokens() {
  //   console.debug('refreshTokens')
  //   let refreshTokenData = Storage.getCookie(refreshKey())
  //   // @ts-ignore
  //   if (refreshTokenData.hasOwnProperty('refresh_token') && refreshTokenData.refresh_token) {
  //     // @ts-ignore
  //     let refreshToken = refreshTokenData.refresh_token
  //     const transaction = await Transaction.create(Sign.Refresh, '')

  //     await Request.refreshTokens(this.config, transaction, refreshToken)
  //       .then((response: any) => this.handleRefreshTokens(response))
  //       .catch((error) => {
  //         let response = error.response
  //         if (response && response.status === 400 && response.data.error === 'invalid_grant') {
  //           window.dispatchEvent(new Event(EventTypes.REFRESH_INVALID_GRANT))
  //         }
  //       })
  //       .finally(() => {
  //         // delete temp cookie
  //         Storage.deleteCookie(transactionKey(transaction.pkce.state))
  //       })
  //   }
  // }

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
    console.log('store tokens in memory')
    this.memory.setAccessToken(tokens.accessToken)
    this.memory.setIdToken(tokens.idToken)

    // @thib storing data should be here not in getter (easier to write test)

    // @thib, here when will be ready to use as option
    // if (config.useRefreshToken && tokens.valid)
    if (tokens.valid) {
      // @thib refresh parameters transaction is the whole refreshToken + parameters of roatation
      console.log('tokens')
      console.debug(tokens)
      const refreshTokenWrapper = Transaction.getRefreshParameters(tokens)
      console.debug('refreshTokenWrapper')
      console.debug(refreshTokenWrapper)
      Storage.createCookie(refreshKey(), refreshTokenWrapper)

      this.recurringRefreshToken(refreshTokenWrapper)
    }

    return tokens
  }

  canRefresh(refreshStore: Interface.RefreshStore): boolean {
    const now = new Date()
    return !this.currentAccessTokenPresent() || refreshStore.access_token_expiration_date < now
  }

  getRefreshStore(): Interface.RefreshStore {
    return Storage.getCookie(refreshKey()) as Interface.RefreshStore
  }

  // @thib, we just need to call handleRefresh before the call of handleRedirectCallback
  async handleRefreshTokens() {
    const refreshStore = this.getRefreshStore()
    console.debug(refreshStore)
    console.debug(refreshStore?.refresh_token)
    if (!refreshStore?.refresh_token) {
      return false
    }
    // @thib with refreshTokenWrapper we can take advantage of dateTime parameters
    // refreshTokenWrapper

    // @thib then if it works , we can handle  leeway too
    if (this.canRefresh(refreshStore)) {
      // @thib refresh parameters transaction is the whole refreshToken + parameters of roatation
      const tokens = await Transaction.getTokensByRefresh(this.config, refreshStore.refresh_token)

      this.memory.setAccessToken(tokens.accessToken)
      this.memory.setIdToken(tokens.idToken)
      // @thib refresh parameters transaction is the whole refreshToken + parameters of roatation
      const refreshTokenWrapper = Transaction.getRefreshParameters(tokens)
      console.log('create cookie')
      Storage.createCookie(refreshKey(), refreshTokenWrapper)

      // @thib with refreshTokenWrapper we can take advantage of dateTime parameters
      this.recurringRefreshToken(refreshTokenWrapper)
    } else {
      this.recurringRefreshToken(refreshStore)
    }
    return true
  }

  recurringRefreshToken(refreshTokenWrapper: Interface.RefreshStore) {
    // @thib instanciation of the function signature in a ready,
    //  we can store JS function without "parenthese" to use it later
    //  also we could just pass the "this" to keep the instanciation of the Client if
    // we can't access to in the worker
    console.debug('recurringRefreshToken')
    console.debug(refreshTokenWrapper)
    const handleRefreshTrigger = () => this.handleRefreshTokens()
    console.debug(handleRefreshTrigger)
    this.worker?.postMessage({
      refreshTokenParameters: refreshTokenWrapper,
      refreshTrigger: handleRefreshTrigger,
    })
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
