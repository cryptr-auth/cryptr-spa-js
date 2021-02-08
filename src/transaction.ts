import { v4 as uuid } from 'uuid'
import * as I from './interfaces'

import { Locale, Sign } from './types'
import {
  STORAGE_KEY_PREFIX,
  DEFAULT_REFRESH_ROTATION_DURATION,
  DEFAULT_REFRESH_EXPIRATION,
  cryptrBaseUrl,
} from './constants'
import Jwt from './jwt'
import Pkce from './pkce'
import Request from './request'
import Storage from './storage'
import * as Sentry from '@sentry/browser'
import { validRedirectUri } from '@cryptr/cryptr-config-validation'

const newTransaction = (
  signType: Sign,
  scope: string,
  redirect_uri: string,
  locale: Locale,
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
  locale: Locale,
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

const Transaction: any = {
  key: transactionKey,

  new: newTransaction,

  create: (
    signType: Sign,
    scope: string,
    locale: Locale,
    redirect_uri: string,
  ): I.Transaction => {
    if (redirect_uri !== undefined && redirect_uri != null) {
      validRedirectUri(redirect_uri)
    }
    const transaction = newTransaction(signType, scope, redirect_uri, locale)
    Storage.createCookie(setTransactionKey(transaction), transaction)
    return transaction
  },

  createFromState: (
    state: string,
    signType: Sign,
    scope: string,
    locale: Locale,
    redirect_uri: string,
  ): I.Transaction => {
    if (redirect_uri !== undefined && redirect_uri != null) {
      validRedirectUri(redirect_uri)
    }
    const transaction = newTransactionWithState(signType, scope, state, redirect_uri, locale)
    Storage.createCookie(transactionKey(state), transaction)
    return transaction
  },

  get: (state: string) => {
    let cookieKey = transactionKey(state)
    let tr = Storage.getCookie(cookieKey)
    return tr
  },

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
        const accessToken: string = response['data']['access_token']
        const idToken: any = response['data']['id_token']
        const refreshToken: any = response['data']['refresh_token']
        if (Jwt.validatesAccessToken(accessToken, config)) {
          // store the refresh token
          if (refreshToken) {
            Storage.createCookie(refreshKey(), {
              refresh_token: refreshToken,
              rotation_duration: DEFAULT_REFRESH_ROTATION_DURATION,
              expiration_date: Date.now() + DEFAULT_REFRESH_EXPIRATION,
            })
          }
          Storage.deleteCookie(transactionKey(transaction.pkce.state))
          if (idToken) {
            if (Jwt.validatesIdToken(idToken, config)) {
              accessResult = {
                ...accessResult,
                valid: true,
                accessToken: accessToken,
                idToken: idToken,
                refreshToken: refreshToken,
                errors: [],
              }
            } else {
              accessResult = {
                ...accessResult,
                valid: false,
                accessToken: accessToken,
                refreshToken: refreshToken,
                errors: accessResult.errors.concat([
                  { field: 'idToken', message: 'Can’t process request' },
                ]),
              }
            }
          } else {
            accessResult = {
              ...accessResult,
              valid: false,
              errors: accessResult.errors.concat([{ field: 'idToken', message: 'Not retrieve' }]),
            }
          }
        } else {
          accessResult = {
            ...accessResult,
            valid: false,
            errors: [{ field: 'accessToken', message: 'Invalid access token' }],
          }
        }
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
