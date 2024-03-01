import axios, { AxiosPromise, AxiosRequestConfig } from 'axios'
import { cryptrBaseUrl } from './constants'
import { Authorization, Transaction as TransactionInterface, Config } from './interfaces'
import { organizationDomain } from './utils'
import ky from 'ky'

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
  refresh_token: refresh_token,
})

export const revokeTokenUrl = (config: Config, organization_domain?: string) => {
  return `${cryptrBaseUrl(config)}/api/${API_VERSION}/tenants/${
    organization_domain || config.tenant_domain
  }/${config.client_id}/oauth/token/revoke`
}

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

export const decoratedAxiosRequestConfig = (
  accessToken: any,
  axiosRequestConfig: AxiosRequestConfig | null,
) => {
  if (axiosRequestConfig === null || axiosRequestConfig === undefined) {
    return axiosRequestConfig
  }
  if (accessToken !== undefined) {
    let authBearer = `Bearer ${accessToken}`
    let requestHeaders = axiosRequestConfig.headers || {}
    requestHeaders['Authorization'] = authBearer
    axiosRequestConfig.headers = requestHeaders
  }
  return axiosRequestConfig
}

export const universalTokenUrl = (config: Config, organization_domain?: string) => {
  return [cryptrBaseUrl(config), 'org', organization_domain, 'oauth2', 'token'].join('/')
}

export const tokenUrl = (
  config: Config,
  authorization: Authorization,
  transaction: TransactionInterface,
  organization_domain?: string,
) => {
  return `${cryptrBaseUrl(config)}/api/${API_VERSION}/tenants/${
    organization_domain || config.tenant_domain
  }/${config.client_id}/${transaction.pkce.state}/oauth/${transaction.sign_type}/client/${
    authorization.id
  }/token`
}

export const refreshTokensUrl = (
  config: Config,
  transaction: TransactionInterface,
  organization_domain?: string,
) =>
  `${cryptrBaseUrl(config)}/api/${API_VERSION}/tenants/${
    organization_domain || config.tenant_domain
  }/${config.client_id}/${transaction.pkce.state}/oauth/client/token`

const Request = {
  // POST /t/:tenant_domain/oauth/token
  // postAuthorizationCode: async (authorization: Authorization, transaction: Transaction) => axios.post(tokenUrl(authorization, transaction), tokenParams(authorization, transaction)),

  postAuthorizationCode: async (
    config: Config,
    authorization: Authorization,
    transaction: TransactionInterface,
    organization_domain?: string,
  ) => {
    let url = tokenUrl(config, authorization, transaction, organization_domain)
    return axios.post(url, tokenParams(config, authorization, transaction))
  },

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
  // POST /api/v1/tenants/:tenant_domain/client_id/oauth/token/revoke
  revokeAccessToken: async (client_config: Config, accessToken: string) => {
    let url = revokeTokenUrl(client_config)
    return axios.post(url, { token: accessToken, token_type_hint: 'access_token' })
  },

  // POST /api/v1/tenants/:tenant_domain/client_id/oauth/token/revoke
  revokeRefreshToken: async (client_config: Config, refreshToken: string) => {
    let organization_domain = organizationDomain(refreshToken)
    let url = revokeTokenUrl(client_config, organization_domain)
    return axios.post(url, { token: refreshToken, token_type_hint: 'refresh_token' })
  },

  // POST /t/:tenant_domain/oauth/token
  refreshTokens: async (
    config: Config,
    transaction: TransactionInterface,
    refresh_token: string,
    organization_domain?: string,
  ) => {
    let url = refreshTokensUrl(config, transaction, organization_domain)
    return axios.post(url, refreshTokensParams(config, transaction, refresh_token))
  },

  decoratedRequest: (
    accessToken: any,
    axiosRequestConfig: AxiosRequestConfig | null,
  ): AxiosRequestConfig | AxiosPromise | null => {
    let decoratedConfig = decoratedAxiosRequestConfig(accessToken, axiosRequestConfig)
    if (decoratedConfig !== null) {
      return axios(decoratedConfig)
    }
    return axiosRequestConfig
  },
}

export default Request
