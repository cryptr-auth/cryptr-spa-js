import { v4 as uuid } from 'uuid'
import { validRedirectUri } from '@cryptr/cryptr-config-validation'
import Pkce from './pkce'
import { Sign } from './types'
import * as I from './interfaces'
import {
  DEFAULT_REFRESH_EXPIRATION,
  DEFAULT_REFRESH_ROTATION_DURATION,
  STORAGE_KEY_PREFIX,
} from './constants'
import Jwt from './jwt'
import Storage from './storage'
import axios from 'axios'

export const newTransaction = (
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

export const newTransactionWithState = (
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

export const ssoSignPath = (idpId: string) => {
  return `/enterprise/${idpId}/login`
}

export const signPath = (config: I.Config, transaction: I.Transaction): string => {
  const locale = transaction.locale || config.default_locale || 'en'
  return `/t/${config.tenant_domain}/${locale}/${transaction.pkce.state}/${transaction.sign_type}/new`
}

export const transactionKey = (state: string) => `${STORAGE_KEY_PREFIX}.transaction.${state}`
export const setTransactionKey = (transaction: I.Transaction): string =>
  `${STORAGE_KEY_PREFIX}.transaction.${transaction.pkce.state}`

export const refreshKey = (): string => `${STORAGE_KEY_PREFIX}.refresh`

export const validateAndFormatAuthResp = (
  config: I.Config,
  accessToken?: string,
  idToken?: string,
  refreshToken?: string,
  organization_domain?: string,
) => {
  let valid = true
  let errors: I.TokenError[] = []
  let validAccessToken = false
  let validIdToken = false
  try {
    validAccessToken = Jwt.validatesAccessToken(accessToken || '', config, organization_domain)
  } catch (error) {
    console.error(error)
  }

  try {
    validIdToken = Jwt.validatesIdToken(idToken || '', config, organization_domain)
  } catch (error) {
    console.error(error)
  }

  if (!validAccessToken) {
    valid = false
    errors = [{ error: 'accessToken', error_description: 'Not retrieve', http_response: null }]
  }
  if (!idToken || !validIdToken) {
    valid = false
    errors = validIdToken
      ? errors
      : errors.concat([
          { error: 'idToken', error_description: 'Can’t process request', http_response: null },
        ])
    errors = idToken
      ? errors
      : errors.concat([
          { error: 'idToken', error_description: 'Not retrieve', http_response: null },
        ])
  }

  return {
    valid: valid,
    accessToken: accessToken || '',
    idToken: idToken || '',
    refreshToken: refreshToken || '',
    errors: errors,
  }
}

export const getRefreshParameters = (resp: any): I.RefreshParameters => {
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
  const refreshParameters = {
    access_token_expiration_date: accessExpiration,
    refresh_token: resp.refresh_token,
    refresh_leeway: resp.refresh_leeway,
    refresh_retry: resp.refresh_retry,
    refresh_expiration_date: refreshExpiration,
  }
  const uniqValues = [...new Set(Object.values(refreshParameters))]
  return uniqValues.includes(NaN) || uniqValues.includes(undefined) ? {} : refreshParameters
}

export const parseTokensAndStoreRefresh = (
  config: any,
  response: any,
  transaction: any,
  opts: any,
): I.TokenResult => {
  const responseData = response['data']
  const accessToken: string = responseData['access_token']
  const idToken: string = responseData['id_token']
  const refreshToken: string = responseData['refresh_token']
  try {
    if (Jwt.validatesAccessToken(accessToken, config, opts.organization_domain)) {
      if (refreshToken) {
        const refreshTokenWrapper = getRefreshParameters(responseData)
        let cookieExpirationDate = new Date()
        if (refreshTokenWrapper.refresh_expiration_date) {
          cookieExpirationDate = new Date(refreshTokenWrapper.refresh_expiration_date)
        } else {
          cookieExpirationDate = tomorrowDate()
        }
        Storage.createCookie(
          refreshKey(),
          {
            refresh_token: refreshToken,
            rotation_duration: DEFAULT_REFRESH_ROTATION_DURATION,
            expiration_date: Date.now() + DEFAULT_REFRESH_EXPIRATION,
            ...getRefreshParameters(responseData),
          },
          cookieExpirationDate,
        )
      }
      if (opts.withPKCE) {
        Storage.deleteCookie(transactionKey(transaction.pkce.state))
      }
    }
  } catch (error) {
    console.error('access token not validated')
    console.error(error)
  }

  return {
    ...validateAndFormatAuthResp(
      config,
      accessToken,
      idToken,
      refreshToken,
      opts.organization_domain,
    ),
    ...getRefreshParameters(responseData),
  }
}

export const handlePostUniversalAuthorizationCode = (
  response: any,
  errors: I.TokenError[],
  accessResult: I.TokenResult,
  transaction: I.Transaction,
  config: I.Config,
  organization_domain?: string,
) => {
  try {
    validatesNonce(transaction, response['data']['nonce'])
    accessResult = parseTokensAndStoreRefresh(config, response, transaction, {
      withPKCE: true,
      organization_domain: organization_domain,
    })
  } catch (error) {
    if (axios.isAxiosError(error)) {
      errors.push({
        error: 'transaction parse tokens',
        error_description: `${error}`,
        http_response: error.response,
      })
    }
    accessResult = {
      ...accessResult,
      valid: false,
      errors: errors,
    }
  }
  return accessResult
}

export const handlePostAuthorizationCode = (
  response: any,
  errors: I.TokenError[],
  accessResult: I.TokenResult,
  transaction: I.Transaction,
  config: I.Config,
  organization_domain?: string,
) => {
  try {
    validatesNonce(transaction, response['data']['nonce'])
    accessResult = parseTokensAndStoreRefresh(config, response, transaction, {
      withPKCE: true,
      organization_domain: organization_domain,
    })
  } catch (error) {
    if (axios.isAxiosError(error)) {
      errors.push({
        error: 'transaction parse tokens',
        error_description: `${error}`,
        http_response: error.response,
      })
    }
    accessResult = {
      ...accessResult,
      valid: false,
      errors: errors,
    }
  }
  return accessResult
}

export const validatesNonce = (transaction: I.Transaction, submittedNonce: string): void | true => {
  if (submittedNonce !== transaction.nonce) {
    throw new Error(`Nonce values have to be the sames`)
  }
  return true
}

export const tomorrowDate = (): Date => {
  let now = new Date()
  now.setDate(now.getDate() + 1)
  return now
}
