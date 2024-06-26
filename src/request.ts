import { cryptrBaseUrl } from './constants'
import { Authorization, Transaction as TransactionInterface, Config } from './interfaces'
import { organizationDomain } from './utils'
import ky, { ResponsePromise } from 'ky'

const API_VERSION = 'v1'

export const universalTokenParams = (
  config: Config,
  authorization: Authorization,
  transaction: TransactionInterface,
  request_id: string,
) => ({
  grant_type: 'authorization_code',
  client_id: config.client_id,
  authorization_id: authorization.id,
  code: authorization.code,
  code_verifier: transaction.pkce.code_verifier,
  nonce: transaction.nonce,
  request_id: request_id,
  client_state: transaction.pkce.state,
})

export const tokenParams = (
  config: Config,
  authorization: Authorization,
  transaction: TransactionInterface,
) => ({
  authorization_id: authorization.id,
  client_id: config.client_id,
  code: authorization.code,
  code_verifier: transaction.pkce.code_verifier,
  grant_type: 'authorization_code',
  nonce: transaction.nonce,
})

export const refreshTokensParams = (
  config: Config,
  transaction: TransactionInterface,
  refresh_token: string,
) => ({
  client_id: config.client_id,
  grant_type: 'refresh_token',
  nonce: transaction.nonce,
  token: refresh_token,
})

export const revokeTokenUrl = (config: Config) => `${cryptrBaseUrl(config)}/oauth/revoke`

export const sloAfterRevokeTokenUrl = (
  config: Config,
  sloCode: string,
  targetUrl: string,
  refreshToken?: string,
) => {
  let organization_domain = organizationDomain(refreshToken)
  let url: URL = new URL(cryptrBaseUrl(config))
  url.pathname = `/api/${API_VERSION}/tenants/${organization_domain || config.tenant_domain}/${
    config.client_id
  }/oauth/token/slo-after-revoke-token`
  url.searchParams.append('slo_code', sloCode)
  url.searchParams.append('target_url', targetUrl)
  return url
}

export const decoratedKyOptions = (accessToken: string | undefined): Object => {
  if (accessToken !== undefined) {
    return {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  }
  return {}
}

export const universalTokenUrl = (config: Config, organization_domain?: string) => {
  return [cryptrBaseUrl(config), 'org', organization_domain, 'oauth2', 'token'].join('/')
}

export const refreshTokensUrl = (config: Config) => `${cryptrBaseUrl(config)}/oauth/token`

const Request = {
  postUniversalAuthorizationCode: async (
    config: Config,
    authorization: Authorization,
    transaction: TransactionInterface,
    request_id: string,
    organization_domain?: string,
  ) => {
    let url = universalTokenUrl(config, organization_domain)
    const params = universalTokenParams(config, authorization, transaction, request_id)
    return ky.post(url, { json: params }).json() //.then((v) => console.debug('ky', v)).catch((r) => console.error('ky', r))
  },
  // POST /oauth/revoke
  revokeAccessToken: async (client_config: Config, accessToken: string) => {
    let url = revokeTokenUrl(client_config)
    return ky
      .post(url, {
        json: {
          token: accessToken,
          token_type_hint: 'access_token',
          client_id: client_config.client_id,
        },
      })
      .json()
  },

  // POST /oauth/revoke
  revokeRefreshToken: async (client_config: Config, refreshToken: string) => {
    let url = revokeTokenUrl(client_config)
    return ky
      .post(url, {
        json: {
          token: refreshToken,
          token_type_hint: 'refresh_token',
          client_id: client_config.client_id,
        },
      })
      .json()
  },

  // POST /oauth/token
  refreshTokens: async (
    config: Config,
    transaction: TransactionInterface,
    refresh_token: string,
  ) => {
    let url = refreshTokensUrl(config)
    return ky.post(url, { json: refreshTokensParams(config, transaction, refresh_token) }).json()
  },

  decoratedRequest: (url: string, accessToken: any, kyOptions?: Object): ResponsePromise => {
    let original = ky.create(kyOptions || {})
    const decorated = original.extend(decoratedKyOptions(accessToken))
    return decorated(url)
  },
}

export default Request
