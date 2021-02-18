import { v4 as uuid } from 'uuid'
import * as I from './interfaces'

import { Sign } from './types'
import {
  STORAGE_KEY_PREFIX,
  DEFAULT_REFRESH_ROTATION_DURATION,
  DEFAULT_REFRESH_EXPIRATION,
  cryptrBaseUrl,
  ALLOWED_LOCALES,
} from './constants'
import Jwt from './jwt'
import Pkce from './pkce'
import Request from './request'
import Storage from './storage'
import * as Sentry from '@sentry/browser'
import { validRedirectUri } from '@cryptr/cryptr-config-validation'
import EventTypes from './event_types'

const newTransaction = (
  signType: Sign,
  scope: string,
  redirect_uri: string,
  locale: string,
): I.Transaction => {
  if (redirect_uri !== undefined && redirect_uri != null) {
    validRedirectUri(redirect_uri)
  }
  return {
    pkce: Pkce.gen(),
    sign_type: signType,
    scope: scope,
    nonce: uuid(),
    locale: locale,
    redirect_uri: redirect_uri,
  }
}

const newTransactionWithState = (
  signType: Sign,
  scope: string,
  state: string,
  redirect_uri: string,
  locale: string,
): I.Transaction => {
  if (redirect_uri !== undefined && redirect_uri != null) {
    validRedirectUri(redirect_uri)
  }
  return {
    pkce: Pkce.gen(state),
    sign_type: signType,
    scope: scope,
    nonce: uuid(),
    locale: locale,
    redirect_uri: redirect_uri,
  }
}

export const validatesNonce = (transaction: I.Transaction, submittedNonce: string): void | true => {
  if (submittedNonce !== transaction.nonce) {
    throw new Error(`Nonce values have to be the sames`)
  }
  return true
}

const signPath = (config: I.Config, transaction: I.Transaction): string => {
  const locale = transaction.locale || config.default_locale || 'en'
  return `/t/${config.tenant_domain}/${locale}/${transaction.pkce.state}/${transaction.sign_type}/new`
}

export const transactionKey = (state: string) => `${STORAGE_KEY_PREFIX}.transaction.${state}`
const setTransactionKey = (transaction: I.Transaction): string =>
  `${STORAGE_KEY_PREFIX}.transaction.${transaction.pkce.state}`

export const refreshKey = (): string => `${STORAGE_KEY_PREFIX}.refresh`

// @thib this not a function to parse (anyway it does), this is a validation function
const validateAndFormatAuthResp = (
  config: I.Config,
  accessToken?: string,
  idToken?: string,
  refreshToken?: string,
) => {
  let valid = true
  let errors: I.AuthResponseError[] = []

  const validIdToken = Jwt.validatesIdToken(idToken || '', config)
  const validAccessToken = Jwt.validatesAccessToken(accessToken || '', config)

  if (!validAccessToken) {
    valid = false
    errors = [{ field: 'idToken', message: 'Not retrieve' }]
  }
  if (!idToken || !validIdToken) {
    valid = false
    errors = validIdToken
      ? errors
      : errors.concat([{ field: 'idToken', message: 'Can’t process request' }])
    errors = idToken ? errors : errors.concat([{ field: 'idToken', message: 'Not retrieve' }])
  }

  return {
    valid: valid,
    accessToken: accessToken || '',
    idToken: idToken || '',
    refreshToken: refreshToken || '',
    errors: [{}],
  }
}

const getRefreshParameters = (resp: any) => {
  let accessExpInputValue = resp.access_token_expiration_date || resp.expires_at
  let accessExpiration =
    typeof accessExpInputValue === 'string'
      ? Date.parse(accessExpInputValue)
      : new Date(accessExpInputValue).getTime()

  let refreshExpInputValue = resp.refresh_expiration_date || resp.refresh_token_expires_at
  let refreshExpiration =
    typeof refreshExpInputValue === 'string'
      ? Date.parse(refreshExpInputValue)
      : new Date(refreshExpInputValue).getTime()
  try {
    return {
      access_token_expiration_date: accessExpiration,
      refresh_token: resp.refresh_token,
      refresh_leeway: resp.refresh_leeway,
      refresh_retry: resp.refresh_retry,
      refresh_expiration_date: refreshExpiration,
    }
  } catch (err) {
    return {}
  }
}

export const tomorrowDate = (): Date => {
  let now = new Date()
  now.setDate(now.getDate() + 1)
  return now
}

const parseTokensAndStoreRefresh = (config: any, response: any, transaction: any, opts: any) => {
  const responseData = response['data']
  const accessToken: string = responseData['access_token']
  const idToken: any = responseData['id_token']
  const refreshToken: any = responseData['refresh_token']

  if (Jwt.validatesAccessToken(accessToken, config)) {
    if (refreshToken) {
      // @thib this is not the good place to store (dont merge getter & setter to make easy to test code)

      const refreshTokenWrapper = getRefreshParameters(responseData)
      let cookieExpirationDate = new Date()
      if (refreshTokenWrapper.refresh_expiration_date) {
        cookieExpirationDate = tomorrowDate()
      } else {
        cookieExpirationDate.setDate(cookieExpirationDate.getDate() + 1)
      }
      Storage.createCookie(
        refreshKey(),
        {
          refresh_token: refreshToken,
          // @thib DEPRECATED
          rotation_duration: DEFAULT_REFRESH_ROTATION_DURATION,
          // @thib DEPRECATED
          expiration_date: Date.now() + DEFAULT_REFRESH_EXPIRATION,
          // @thib new parameters :
          ...getRefreshParameters(responseData),
        },
        cookieExpirationDate,
      )
    }
    if (opts.withPKCE) {
      Storage.deleteCookie(transactionKey(transaction.pkce.state))
    }
  }

  return {
    ...validateAndFormatAuthResp(config, accessToken, idToken, refreshToken),
    ...getRefreshParameters(responseData),
  }
}

const Transaction: any = {
  key: transactionKey,

  new: newTransaction,

  create: (signType: Sign, scope: string, locale: string, redirect_uri: string): I.Transaction => {
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
    const transaction = newTransactionWithState(signType, scope, state, redirect_uri, locale)
    Storage.createCookie(transactionKey(state), transaction, tomorrowDate())
    return transaction
  },

  get: (state: string) => {
    let cookieKey = transactionKey(state)
    let tr = Storage.getCookie(cookieKey)
    return tr
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
  ) => {
    let accessResult = {
      valid: false,
      accessToken: '',
      idToken: '',
      refreshToken: '',
      errors: [{}],
    }
    await Request.postAuthorizationCode(config, authorization, transaction)
      .then((response: any) => {
        validatesNonce(transaction, response['data']['nonce'])

        accessResult = parseTokensAndStoreRefresh(config, response, transaction, { withPKCE: true })
      })
      .catch((error) => {
        const errors = [{ field: '', message: error.message }]
        if (!config) {
          const transactionConfigNullMsg = 'config is null'
          Sentry.captureMessage(transactionConfigNullMsg)
          errors.push({
            field: 'transaction',
            message: transactionConfigNullMsg,
          })
        }
        accessResult = {
          ...accessResult,
          valid: false,
          errors: errors,
        }
        Sentry.captureException(error)
      })
    return accessResult
  },

  /*
  Refresh tokens from previous transaction

  * config of client

  returns tokens + parameters

  */
  //  @thib we could rename refreshTokens by getTokensByRefresh
  getTokensByRefresh: async (config: I.Config, refresh_token: string) => {
    let refreshResult = {
      valid: false,
      accessToken: '',
      idToken: '',
      refreshToken: '',
      errors: [{}],
    }

    if (!refresh_token) {
      return refreshResult
    }

    const transaction = Transaction.create(Sign.Refresh, '')

    // @ts-ignore
    await Request.refreshTokens(config, transaction, refresh_token)
      .then((response: any) => {
        // this.handleRefreshTokens(response))
        // return validateAndFormatAuthResp(config, accessToken, idToken, refreshToken)
        refreshResult = parseTokensAndStoreRefresh(config, response, transaction, {
          withPKCE: false,
        })
      })
      .catch((error) => {
        let response = error.response
        refreshResult = {
          ...refreshResult,
          valid: false,
          errors: [{ http_response: response, ...response.data }],
        }
      })
      .finally(() => {
        // delete temp cookie
        // @thib there is no PKCE in a REFRESH GRANT normally
        Storage.deleteCookie(transactionKey(transaction.pkce.state))
      })
    return refreshResult
  },
  getRefreshParameters: getRefreshParameters,
  signUrl: (config: I.Config, transaction: I.Transaction): URL => {
    let url: URL = new URL(cryptrBaseUrl(config))
    url.pathname = signPath(config, transaction)

    url.searchParams.append('scope', transaction.scope)
    url.searchParams.append('client_id', config.client_id)
    url.searchParams.append('redirect_uri', transaction.redirect_uri || config.default_redirect_uri)
    url.searchParams.append('code_challenge_method', transaction.pkce.code_challenge_method)
    url.searchParams.append('code_challenge', transaction.pkce.code_challenge)

    return url
  },
}

export default Transaction
