import * as Interface from './interfaces'
import * as Sentry from '@sentry/browser'
import axios, { AxiosPromise, AxiosRequestConfig, AxiosResponse } from 'axios'
import {
  ALLOWED_LOCALES,
  cryptrBaseUrl,
  DEFAULT_LEEWAY_IN_SECONDS,
  DEFAULT_REFRESH_RETRY,
  DEFAULT_SCOPE,
} from './constants'
import { Sign } from './types'
import Request, { sloAfterRevokeTokenUrl } from './request'
import Storage from './storage'
import Transaction from './transaction'
import Jwt from './jwt'
import InMemory from './memory'
import { validAppBaseUrl, validClientId, validRedirectUri } from '@cryptr/cryptr-config-validation'
import { Integrations } from '@sentry/tracing'
import EventTypes from './event_types'
import { SsoSignOptsAttrs, TokenError } from './interfaces'
import { locationSearch, parseRedirectParams } from './utils'
import { refreshKey } from './transaction.utils'

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
    console.warn(
      "[Cryptr] 'fixed_pkce' value in Config will be remove from version '1.4.0' and have behavior related to 'true' value",
    )
    this.config = { ...{ fixed_pkce: false }, ...config }
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
    await Transaction.create(
      this.config.fixed_pkce,
      sign,
      this.finalScope(scope),
      locale,
      redirectUri,
    )
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
    const transaction = await Transaction.create(
      this.config.fixed_pkce,
      sign,
      this.finalScope(scope),
      locale,
      redirectUri,
    )
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

  async signInWithSSO(idpId: string, options?: SsoSignOptsAttrs) {
    const transaction = await Transaction.create(
      this.config.fixed_pkce,
      Sign.Sso,
      this.finalScope(options?.scope || DEFAULT_SCOPE),
      options?.locale,
      options?.redirectUri || this.config.default_redirect_uri,
    )
    var transactionConfig = options?.clientId
      ? { ...this.config, client_id: options.clientId }
      : this.config
    transactionConfig = options?.tenantDomain
      ? { ...transactionConfig, tenant_domain: options.tenantDomain }
      : transactionConfig
    const url = await Transaction.signUrl(transactionConfig, transaction, idpId)

    window.location.assign(url.href)
  }

  async signInWithSSOGateway(idpId?: string | string[], options?: SsoSignOptsAttrs) {
    const transaction = await Transaction.create(
      this.config.fixed_pkce,
      Sign.Sso,
      this.finalScope(options?.scope || DEFAULT_SCOPE),
      options?.locale,
      options?.redirectUri || this.config.default_redirect_uri,
    )
    var transactionConfig = options?.clientId
      ? { ...this.config, client_id: options.clientId }
      : this.config
    transactionConfig = options?.tenantDomain
      ? { ...transactionConfig, tenant_domain: options.tenantDomain }
      : transactionConfig
    const url = await Transaction.gatewaySignUrl(transactionConfig, transaction, idpId)
    window.location.assign(url.href)
  }

  async buildUniversalAttrs(options?: SsoSignOptsAttrs) {
    const transaction = await Transaction.create(
      this.config.fixed_pkce,
      Sign.Sso,
      this.finalScope(options?.scope || DEFAULT_SCOPE),
      options?.locale,
      options?.redirectUri || this.config.default_redirect_uri,
    )
    let transactionConfig = options?.clientId
      ? { ...this.config, client_id: options.clientId }
      : this.config

    transactionConfig = options?.tenantDomain
      ? { ...transactionConfig, tenant_domain: options.tenantDomain }
      : transactionConfig
    return { config: transactionConfig, transaction: transaction }
  }

  async signInWithDomain(organizationDomain?: string, options?: SsoSignOptsAttrs) {
    const attrs = await this.buildUniversalAttrs(options)

    const universalAttrs = organizationDomain
      ? { ...attrs, domain: organizationDomain, organizationDomain: organizationDomain }
      : attrs
    const url = await Transaction.universalGatewayUrl(universalAttrs)
    window.location.assign(url.href)
  }

  async signInWithEmail(email: string, options?: SsoSignOptsAttrs) {
    const attrs = await this.buildUniversalAttrs(options)

    const url = await Transaction.universalGatewayUrl({
      ...attrs,
      email: email,
    })
    console.debug('universal gateway url', url)
    window.location.assign(url.href)
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
    const transaction = await Transaction.createFromState(
      this.config.fixed_pkce,
      state,
      Sign.Invite,
      scope,
    )
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
      console.error('error(s) while handling tokens')
      errors.forEach((error) => {
        console.error(error.error_description)
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

  async handleRedirectCallback(redirectParams = parseRedirectParams()) {
    const transaction = await Transaction.get(redirectParams.state)
    const tokens = redirectParams.request_id
      ? await Transaction.getUniversalTokens(
        this.config,
        redirectParams.authorization,
        transaction,
        redirectParams.request_id,
        redirectParams.organization_domain,
      )
      : await Transaction.getTokens(
        this.config,
        redirectParams.authorization,
        transaction,
        redirectParams.organization_domain,
      )

    this.handleNewTokens(this.getRefreshStore(), tokens)

    return tokens
  }

  canRefresh(refreshStore: Interface.RefreshStore): boolean {
    let { access_token_expiration_date, refresh_leeway, refresh_retry, refresh_token } =
      refreshStore
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

  async userAccountAccess(accessToken = this.getCurrentAccessToken()) {
    if (accessToken) {
      let decoded = Jwt.body(accessToken)
      let domain = decoded.hasOwnProperty('tnt') ? (decoded as any).tnt : this.config.tenant_domain
      let url: URL = new URL(cryptrBaseUrl(this.config))
      url.pathname = `/api/v1/client-management/tenants/${domain}/account-access`
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
      return null
    }
  }

  async logOut(callback: any, location = window.location, targetUrl = window.location.href) {
    const { refresh_token: refreshToken } = this.getRefreshStore()
    if (refreshToken) {
      Request.revokeRefreshToken(this.config, refreshToken)
        .then(async (resp) => {
          if (resp.data.revoked_at !== undefined) {
            await Storage.clearCookies(this.config.client_id)
            this.memory.clearTokens()
            this.handleSloCode(resp, callback, location, targetUrl)
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

  private handleSloCode(
    resp: AxiosResponse<any>,
    callback: any,
    location: Location,
    targetUrl: string,
  ) {
    if (resp.data && resp.data.slo_code !== undefined) {
      const url = sloAfterRevokeTokenUrl(
        this.config,
        resp.data.slo_code,
        targetUrl,
        resp.data.refresh_token,
      )
      window.location.assign(url.href)
    } else if (typeof callback === 'function' && callback !== null) {
      callback()
    } else {
      console.info('Default logOut callback : reload page')
      // reload page if no callback defined
      if (location !== undefined) {
        location.replace(location.href.split('?')[0])
      }
    }
  }

  decoratedRequest(
    axiosRequestConfig: AxiosRequestConfig | null,
  ): AxiosRequestConfig | AxiosPromise | null {
    return Request.decoratedRequest(this.getCurrentAccessToken(), axiosRequestConfig)
  }
}

export default Client
