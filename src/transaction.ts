import * as I from './interfaces'
import { Sign } from './types'
import {
  cryptrBaseUrl,
  ALLOWED_LOCALES,
} from './constants'
import Request from './request'
import Storage from './storage'
import { organizationDomain } from './utils'
import { getRefreshParameters, handlePostAuthorizationCode, handlePostUniversalAuthorizationCode, newTransaction, newTransactionWithState, parseTokensAndStoreRefresh, setTransactionKey, signPath, ssoSignPath, tomorrowDate, transactionKey } from './transaction.utils'

import { validRedirectUri } from '@cryptr/cryptr-config-validation'

export const parseErrors = (response: any): I.TokenError => {
  if (response) {
    return { http_response: response, ...response.data }
  }
  return {
    error: 'error',
    error_description: 'response is undefined',
    http_response: null,
  }
}

const Transaction: any = {
  key: transactionKey,

  new: newTransaction,

  create: (
    signType: Sign,
    scope: string,
    locale: string,
    redirect_uri: string,
  ): I.Transaction => {
    if (redirect_uri !== undefined && redirect_uri != null) {
      validRedirectUri(redirect_uri)
    }
    if (locale && !ALLOWED_LOCALES.includes(locale)) {
      throw new Error(`'${locale}' locale not valid, possible values ${ALLOWED_LOCALES}`)
    }
    const transaction = newTransaction(signType, scope, redirect_uri, locale)
    Storage.createCookie(setTransactionKey(transaction), transaction, tomorrowDate())
    return transaction
  },

  createFromState: (
    state: string,
    signType: Sign,
    scope: string,
    locale: string,
    redirect_uri: string,
  ): I.Transaction => {
    if (redirect_uri !== undefined && redirect_uri != null) {
      validRedirectUri(redirect_uri)
    }
    if (locale && !ALLOWED_LOCALES.includes(locale)) {
      throw new Error(`'${locale}' locale not valid, possible values ${ALLOWED_LOCALES}`)
    }
    const transaction = newTransactionWithState(
      signType,
      scope,
      state,
      redirect_uri,
      locale,
    )
    Storage.createCookie(transactionKey(state), transaction, tomorrowDate())
    return transaction
  },

  get: (state: string) => {
    let cookieKey = transactionKey(state)
    let tr = Storage.getCookie(cookieKey)
    return tr
  },

  getUniversalTokens: async (
    config: I.Config,
    authorization: I.Authorization,
    transaction: I.Transaction,
    request_id: string,
    organization_domain?: string,
  ): Promise<I.TokenResult> => {
    const errors: I.TokenError[] = []
    let accessResult: I.TokenResult = {
      valid: false,
      accessToken: '',
      idToken: '',
      refreshToken: '',
      errors: errors,
    }
    await Request.postUniversalAuthorizationCode(
      config,
      authorization,
      transaction,
      request_id,
      organization_domain,
    )
      .then((response: any) => {
        accessResult = handlePostUniversalAuthorizationCode(
          response,
          errors,
          accessResult,
          transaction,
          config,
          organization_domain
        )
      })
      .catch((error) => {
        errors.push({
          error: 'getUniversalTokens Error',
          error_description: `${error}`,
          http_response: error.response,
        })
        accessResult = {
          ...accessResult,
          valid: false,
          errors: errors,
        }
      })
    return accessResult
  },

  /*
  Get initial tokens from config & new transaction

  * config of client

  * transaction current state of the Authorization Code Transaction with PKCE

  * transaction has authorization code

  returns tokens + parameters

  */
  getTokens: async (
    config: I.Config,
    authorization: I.Authorization,
    transaction: I.Transaction,
    organization_domain?: string,
  ): Promise<I.TokenResult> => {
    const errors: I.TokenError[] = []
    let accessResult: I.TokenResult = {
      valid: false,
      accessToken: '',
      idToken: '',
      refreshToken: '',
      errors: errors,
    }
    await Request.postAuthorizationCode(config, authorization, transaction, organization_domain)
      .then((response: any) => {
        accessResult = handlePostAuthorizationCode(
          response,
          errors,
          accessResult,
          transaction,
          config,
          organization_domain
        )
      })
      .catch((error) => {
        console.error('error in postAuth catch')
        if (!config) {
          const transactionConfigNullMsg = 'config is null'
          errors.push({
            error: 'transaction',
            error_description: transactionConfigNullMsg,
            http_response: error.response,
          })
        }
        errors.push({
          error: 'getTokens Error',
          error_description: `${error}`,
          http_response: error.response,
        })
        accessResult = {
          ...accessResult,
          valid: false,
          errors: errors,
        }
      })
    return accessResult
  },

  /*
  Refresh tokens from previous transaction

  * config of client

  returns tokens + parameters

  */
  getTokensByRefresh: async (config: I.Config, refresh_token: string): Promise<I.TokenResult> => {
    const errors: I.TokenError[] = []
    let refreshResult: I.TokenResult = {
      valid: false,
      accessToken: '',
      idToken: '',
      refreshToken: '',
      errors: errors,
    }

    if (!refresh_token) {
      return refreshResult
    }

    const transaction = Transaction.create(Sign.Refresh, '')
    let organization_domain = organizationDomain(refresh_token)
    // @ts-ignore
    await Request.refreshTokens(config, transaction, refresh_token, organization_domain)
      .then((response: any) => {
        refreshResult = parseTokensAndStoreRefresh(config, response, transaction, {
          withPKCE: false,
          organization_domain: organization_domain,
        })
      })
      .catch((error) => {
        let response = error.response
        refreshResult = {
          ...refreshResult,
          valid: false,
          errors: [parseErrors(response)],
        }
      })
      .finally(() => {
        // delete temp cookie
        Storage.deleteCookie(transactionKey(transaction.pkce.state))
      })
    return refreshResult
  },
  getRefreshParameters: getRefreshParameters,
  signUrl: (config: I.Config, transaction: I.Transaction, idpId?: string): void | URL => {
    let url: URL = new URL(cryptrBaseUrl(config))
    if (transaction.sign_type == Sign.Sso && !idpId) {
      throw new Error('Should provide idpId when SSO transaction')
    }
    const currentSignPath =
      transaction.sign_type == Sign.Sso && idpId
        ? ssoSignPath(idpId)
        : signPath(config, transaction)
    url.pathname = url.pathname.concat(currentSignPath).replace('//', '/')

    if (transaction.sign_type == Sign.Sso) {
      const locale = transaction.locale || config.default_locale || 'en'
      url.searchParams.append('locale', locale)
      url.searchParams.append('state', transaction.pkce.state)
    }

    url.searchParams.append('scope', transaction.scope)
    url.searchParams.append('client_id', config.client_id)
    url.searchParams.append('redirect_uri', transaction.redirect_uri || config.default_redirect_uri)
    url.searchParams.append('code_challenge_method', transaction.pkce.code_challenge_method)
    url.searchParams.append('code_challenge', transaction.pkce.code_challenge)
    return url
  },
  gatewaySignUrl: (
    config: I.Config,
    transaction: I.Transaction,
    idpId?: string | string[],
  ): void | URL => {
    let subPath = config.dedicated_server ? '' : `/t/${config.tenant_domain}`
    let url: URL = new URL(cryptrBaseUrl(config) + subPath + '/')

    // url.pathname = url.pathname.concat(`/t/${config.tenant_domain}`).replace('//', '/')

    if (idpId !== undefined) {
      if (typeof idpId == 'string') {
        url.searchParams.append('idp_id', idpId)
      } else if (idpId) {
        idpId.forEach((idp_id) => {
          url.searchParams.append('idp_ids[]', idp_id)
        })
      }
    }
    const locale = transaction.locale || config.default_locale || 'en'
    url.searchParams.append('locale', locale)
    url.searchParams.append('client_state', transaction.pkce.state)
    url.searchParams.append('scope', transaction.scope)
    url.searchParams.append('client_id', config.client_id)
    url.searchParams.append('redirect_uri', transaction.redirect_uri || config.default_redirect_uri)
    url.searchParams.append('code_challenge_method', transaction.pkce.code_challenge_method)
    url.searchParams.append('code_challenge', transaction.pkce.code_challenge)
    return url
  },

  universalGatewayUrl({
    config,
    transaction,
    organizationDomain,
    email,
  }: I.UniversalGatewayUrlParams): void | URL {
    if (config && transaction) {
      let subPath = config.dedicated_server ? '' : `/t/${config.tenant_domain}`
      let url: URL = new URL(cryptrBaseUrl(config) + subPath + '/')
      if (organizationDomain) {
        url.searchParams.append('organization', organizationDomain)
      } else if (email) {
        url.searchParams.append('email', email)
      }
      const locale = transaction.locale || config.default_locale || 'en'
      url.searchParams.append('locale', locale)
      url.searchParams.append('client_state', transaction.pkce.state)
      url.searchParams.append('scope', transaction.scope)
      url.searchParams.append('client_id', config.client_id)
      url.searchParams.append(
        'redirect_uri',
        transaction.redirect_uri || config.default_redirect_uri,
      )
      url.searchParams.append('code_challenge_method', transaction.pkce.code_challenge_method)
      url.searchParams.append('code_challenge', transaction.pkce.code_challenge)
      return url
    } else {
      throw Error("'config' and 'transaction are mandatory")
    }
  },
}

export default Transaction
