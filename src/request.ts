import axios from 'axios'
import { cryptrBaseUrl } from './constants'
import { Authorization, Transaction as TransactionInterface, Config } from './interfaces'

const API_VERSION = 'v1'

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

export const revokeTokenUrl = (config: Config) => {
  return `${cryptrBaseUrl(config)}/api/${API_VERSION}/tenants/${config.tenant_domain}/${
    config.client_id
  }/oauth/token/revoke`
}

export const ssoRevokeTokenUrl = (config: Config, idpId: string) => {
  return `${cryptrBaseUrl(config)}/enterprise/${idpId}/force-logout`
}

export const tokenUrl = (
  config: Config,
  authorization: Authorization,
  transaction: TransactionInterface,
) =>
  `${cryptrBaseUrl(config)}/api/${API_VERSION}/tenants/${config.tenant_domain}/${
    config.client_id
  }/${transaction.pkce.state}/oauth/${transaction.sign_type}/client/${authorization.id}/token`

export const refreshTokensUrl = (config: Config, transaction: TransactionInterface) =>
  `${cryptrBaseUrl(config)}/api/${API_VERSION}/tenants/${config.tenant_domain}/${
    config.client_id
  }/${transaction.pkce.state}/oauth/client/token`

const Request = {
  // POST /t/:tenant_domain/oauth/token
  // postAuthorizationCode: async (authorization: Authorization, transaction: Transaction) => axios.post(tokenUrl(authorization, transaction), tokenParams(authorization, transaction)),

  postAuthorizationCode: async (
    config: Config,
    authorization: Authorization,
    transaction: TransactionInterface,
  ) => {
    let url = tokenUrl(config, authorization, transaction)
    return axios.post(url, tokenParams(config, authorization, transaction))
  },

  // POST /api/v1/tenants/:tenant_domain/client_id/oauth/token/revoke
  revokeAccessToken: async (client_config: Config, accessToken: string) => {
    let url = revokeTokenUrl(client_config)
    return axios.post(url, { token: accessToken, token_type_hint: 'access_token' })
  },

  // POST /api/v1/tenants/:tenant_domain/client_id/oauth/token/revoke
  revokeRefreshToken: async (client_config: Config, refreshToken: string) => {
    let url = revokeTokenUrl(client_config)
    return axios.post(url, { token: refreshToken, token_type_hint: 'refresh_token' })
  },

  // POST /t/:tenant_domain/oauth/token
  refreshTokens: async (
    config: Config,
    transaction: TransactionInterface,
    refresh_token: string,
  ) => {
    let url = refreshTokensUrl(config, transaction)
    return axios.post(url, refreshTokensParams(config, transaction, refresh_token))
  },

  decoratedRequest: (accessToken: any, axiosRequestConfig: any) => {
    if (axiosRequestConfig === null || axiosRequestConfig === undefined) {
      return axiosRequestConfig
    }
    if (accessToken !== undefined) {
      let authBearer = `Bearer ${accessToken}`
      let requestHeaders = axiosRequestConfig.headers || {}
      requestHeaders['Authorization'] = authBearer
      axiosRequestConfig.headers = requestHeaders
    }
    return axios(axiosRequestConfig)
  },
}

export default Request
