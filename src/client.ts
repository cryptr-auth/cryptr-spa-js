import * as Interface from './interfaces'
import {
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
import EventTypes from './event_types'
import { SsoSignOptsAttrs, TokenError } from './interfaces'
import { locationSearch, parseRedirectParams } from './utils'
import { refreshKey } from './transaction.utils'
import { ResponsePromise } from 'ky'

const CODE_PARAMS = /[?&]code=[^&]+/
const STATE_PARAMS = /[?&]state=[^&]+/
class Client {
  config!: Interface.Config
  private memory: InMemory = new InMemory()
  private worker?: Worker

  constructor(config: Interface.Config) {
    validAppBaseUrl(cryptrBaseUrl(config))
    validClientId(config.client_id)
    validRedirectUri(config.default_redirect_uri)
    if (config.default_slo_after_revoke == undefined) {
      throw new Error(
        "Since v(1.3.0), you have to define boolean value for key 'default_slo_after_revoke'",
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
      console.log('simple worker error', error)
    }
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

  async buildUniversalAttrs(options?: SsoSignOptsAttrs) {
    const transaction = await Transaction.create(
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
        console.error('handling token error', error.error_description)
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
    const tokens =
      redirectParams.request_id &&
      (await Transaction.getUniversalTokens(
        this.config,
        redirectParams.authorization,
        transaction,
        redirectParams.request_id,
        redirectParams.organization_domain,
      ))

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
  canHandleAuthentication(searchParams = locationSearch()): boolean {
    return !this.currentAccessTokenPresent() && this.hasAuthenticationParams(searchParams)
  }

  async logOut(
    callback: any,
    location = window.location,
    targetUrl = window.location.href,
    sloAfterRevoke = this.config.default_slo_after_revoke,
  ) {
    const { refresh_token: refreshToken } = this.getRefreshStore()
    if (refreshToken) {
      try {
        refreshToken == 'disabled_refresh'
          ? await Request.revokeAccessToken(this.config, this.getCurrentAccessToken() || '')
          : await Request.revokeRefreshToken(this.config, refreshToken)
        await Storage.clearCookies(this.config.client_id)
        this.memory.clearTokens()
        this.handleSloCode(null, callback, location, targetUrl, sloAfterRevoke || false)
      } catch (error) {
        console.error('logout SPA error', error)
      }
    } else {
      console.log('No accessToken found')
    }
    return true
  }

  private handleSloCode(
    resp: Interface.RevokeResponse | null,
    callback: any,
    location: Location,
    targetUrl: string,
    sloAfterRevoke: boolean,
  ) {
    if (sloAfterRevoke && resp?.slo_code !== undefined && resp?.slo_code) {
      const url = sloAfterRevokeTokenUrl(this.config, resp.slo_code, targetUrl, resp.refresh_token)
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

  decoratedRequest(url: string, kyOptions?: Object): ResponsePromise {
    if (url === undefined) {
      throw new Error('url is required')
    }
    return Request.decoratedRequest(url, this.getCurrentAccessToken(), kyOptions)
  }
}

export default Client
