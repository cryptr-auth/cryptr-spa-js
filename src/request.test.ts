import AuthorizationFixture from './__fixtures__/authorization.fixture'
import Request, { revokeTokenUrl, refreshTokensUrl } from './request'
import * as RequestAPI from './request'
import RequestFixture from './__fixtures__/request.fixture'
import TransactionFixure from './__fixtures__/transaction.fixture'
import ConfigFixture from './__fixtures__/config.fixture'
import TokenFixture from './__fixtures__/token.fixture'
import { Authorization, Config, Transaction } from './interfaces'

describe('Request.postUniversalAuthorizationcode', () => {
  it('calls universalTokenUrl and universalTokenParams properly when no org domain', () => {
    const universalTokenUrlFn = jest.spyOn(RequestAPI, 'universalTokenUrl')
    const universalTokenParamsFn = jest.spyOn(RequestAPI, 'universalTokenParams')
    const config = ConfigFixture.valid()
    const authorization = AuthorizationFixture.valid()
    const transaction = TransactionFixure.valid()
    Request.postUniversalAuthorizationCode(config, authorization, transaction, 'some-request-id')
    expect(universalTokenUrlFn).toHaveBeenCalledWith(config, undefined)
    expect(universalTokenParamsFn).toHaveBeenCalledWith(
      config,
      authorization,
      transaction,
      'some-request-id',
    )
    universalTokenUrlFn.mockRestore()
    universalTokenParamsFn.mockRestore()
  })
  it('calls universalTokenUrl and universalTokenParams properly when org domain provided', () => {
    const universalTokenUrlFn = jest.spyOn(RequestAPI, 'universalTokenUrl')
    const universalTokenParamsFn = jest.spyOn(RequestAPI, 'universalTokenParams')
    const config = ConfigFixture.valid()
    const authorization = AuthorizationFixture.valid()
    const transaction = TransactionFixure.valid()
    Request.postUniversalAuthorizationCode(
      config,
      authorization,
      transaction,
      'some-request-id',
      'some-domain',
    )
    expect(universalTokenUrlFn).toHaveBeenCalledWith(config, 'some-domain')
    expect(universalTokenParamsFn).toHaveBeenCalledWith(
      config,
      authorization,
      transaction,
      'some-request-id',
    )
    universalTokenUrlFn.mockRestore()
    universalTokenParamsFn.mockRestore()
  })
})

describe('Request.refreshTokens/3', () => {
  it('calls refreshTokensUrl without organization if standard refresh', () => {
    const refreshTokensUrlFn = jest.spyOn(RequestAPI, 'refreshTokensUrl')
    const config = ConfigFixture.valid()
    const transaction = TransactionFixure.valid()
    Request.refreshTokens(config, transaction, '7uIjfSbu1B-kfHLBRe0h6wadacQL4osWpiTIj0siy3k')
    expect(refreshTokensUrlFn).toHaveBeenCalledWith(config, transaction, undefined)
    refreshTokensUrlFn.mockRestore()
  })
})

describe('Request.refreshTokens/4', () => {
  it('calls refreshTokensUrl with organization if org refresh', () => {
    const refreshTokensUrlFn = jest.spyOn(RequestAPI, 'refreshTokensUrl')
    const config = ConfigFixture.valid()
    const transaction = TransactionFixure.valid()
    Request.refreshTokens(
      config,
      transaction,
      'misapret.7uIjfSbu1B-kfHLBRe0h6wadacQL4osWpiTIj0siy3k',
    )
    expect(refreshTokensUrlFn).toHaveBeenCalledWith(config, transaction, 'misapret')
    refreshTokensUrlFn.mockRestore()
  })
})

describe('Request.refreshTokens # network', () => {
  // const handlers = []

  // const server = setupServer(...handlers)

  // beforeAll(() => server.listen())
  // afterAll(() => server.close())

  xit('calls refreshTokensUrl without organization if standard refresh', () => {
    const refreshTokensUrlFn = jest.spyOn(RequestAPI, 'refreshTokensUrl')
    const config = ConfigFixture.valid()
    const transaction = TransactionFixure.valid()
    Request.refreshTokens(config, transaction, '7uIjfSbu1B-kfHLBRe0h6wadacQL4osWpiTIj0siy3k')
    expect(refreshTokensUrlFn).toHaveBeenCalledWith(config, transaction, undefined)
    refreshTokensUrlFn.mockRestore()
  })

  // Valid testing setup with service worker to mock API
  xit('returns access & refresh tokens', async () => {
    Request.refreshTokens(
      ConfigFixture.valid(),
      TransactionFixure.valid(),
      TokenFixture.accessToken.valid(),
    )
      .then((refreshResponse: any) => {
        expect(refreshResponse['data']['access_token']).toMatch(
          RequestFixture.authorizationCodeResponse.valid().access_token,
        )
        expect(refreshResponse['data']['refresh_token']).toMatch(
          RequestFixture.authorizationCodeResponse.valid().refresh_token,
        )
      })
      .catch((reason: any) => {
        console.error(reason)
      })
  })
})

describe('Request.refreshTokensUrl/2', () => {
  it('returns the standard refresh token URL', () => {
    expect(refreshTokensUrl(ConfigFixture.valid())).toEqual(
      'http://localhost:4000/api/v1/tenants/cryptr/1c2417e6-757d-47fe-b564-57b7c6f39b1b/da2379bc-46b2-4e9e-a7c4-62a891827944/oauth/client/token',
    )
  })
})

describe('Request.refreshTokensUrl/3', () => {
  it('returns the refresh token URL using organization_domain', () => {
    expect(refreshTokensUrl(ConfigFixture.valid())).toEqual(
      'http://localhost:4000/api/v1/tenants/misapret/1c2417e6-757d-47fe-b564-57b7c6f39b1b/da2379bc-46b2-4e9e-a7c4-62a891827944/oauth/client/token',
    )
  })
})

describe('Request.revokeRefreshToken/2', () => {
  it('calls revokeTokenUrl without orga if standard refresh', () => {
    const revokeTokenUrlFn = jest.spyOn(RequestAPI, 'revokeTokenUrl')
    const config = ConfigFixture.valid()
    Request.revokeRefreshToken(config, 'LDfDAayusLE0fiBQYIVVtSjnEO5VOXm3Vx2LyYVCymE')
    expect(revokeTokenUrlFn).toHaveBeenCalledWith(config, undefined)
    revokeTokenUrlFn.mockRestore()
  })

  it('calls revokeTokenUrl without orga if domain refresh', () => {
    const revokeTokenUrlFn = jest.spyOn(RequestAPI, 'revokeTokenUrl')
    const config = ConfigFixture.valid()
    Request.revokeRefreshToken(config, 'misapret.LDfDAayusLE0fiBQYIVVtSjnEO5VOXm3Vx2LyYVCymE')
    expect(revokeTokenUrlFn).toHaveBeenCalledWith(config, 'misapret')
    revokeTokenUrlFn.mockRestore()
  })
})

describe('Request.revokeTokenUrl', () => {
  it('returns the proper revoke url', () => {
    expect(revokeTokenUrl(ConfigFixture.valid())).toEqual('http://localhost:4000/oauth/revoke')
  })
})

describe('Request.revokeAccessToken', () => {
  beforeAll(() => {
    // mockedAxios.post.mockResolvedValueOnce({ url: '' })
  })
  xit('calls revokeTokenUrl', async () => {
    const revokeTokenUrlFn = jest.spyOn(RequestAPI, 'revokeTokenUrl')
    await Request.revokeAccessToken(ConfigFixture.valid(), 'access_token')
    expect(revokeTokenUrl).toHaveBeenCalledWith(ConfigFixture.valid())
    revokeTokenUrlFn.mockRestore()
  })
})

describe('revoke tokens', () => {
  xit('returns proper data from revoke refresh', async () => {
    Request.revokeRefreshToken(
      ConfigFixture.valid(),
      TokenFixture.refreshToken.misapretSample(),
    ).then((response: any) => {
      expect(typeof response['data']['revoked_at']).toBe('string')
      expect(response.status).toEqual(200)
    })
  })

  xit('returns proper data from revoke access', async () => {
    Request.revokeAccessToken(
      ConfigFixture.valid(),
      TokenFixture.accessToken.misapretSample(),
    ).then((response: any) => {
      expect(typeof response['data']['revoked_at']).not.toBe('string')
      expect(response.status).toEqual(200)
    })
  })

  xit('fails when revoke wrong refresh', async () => {
    Request.revokeRefreshToken(ConfigFixture.valid(), TokenFixture.refreshToken.wrong()).catch(
      (reason: any) => {
        expect(reason.response['data']).toEqual({ error: "Access token doesn't exist" })
        expect(reason.response.status).toEqual(422)
      },
    )
  })
})

describe('Request.sloAfterRevokeTokenUrl/3', () => {
  let validConfig = ConfigFixture.valid()

  it('should returns proper url', () => {
    let sloUrl = RequestAPI.sloAfterRevokeTokenUrl(
      validConfig,
      'azerty',
      validConfig.default_redirect_uri,
    )
    expect(sloUrl.href).toMatch(
      `http://localhost:4000/api/v1/tenants/cryptr/${validConfig.client_id}/oauth/token/slo-after-revoke-token`,
    )
    expect(sloUrl.searchParams.get('slo_code')).toEqual('azerty')
    expect(sloUrl.searchParams.get('target_url')).toEqual('http://localhost:8000/')
  })

  it('should returns url using organization_domain if present in refresh', () => {
    let sloUrl = RequestAPI.sloAfterRevokeTokenUrl(
      validConfig,
      'azerty',
      validConfig.default_redirect_uri,
      'shark-academy.some_refresh_content',
    )
    expect(sloUrl.href).toMatch(
      `http://localhost:4000/api/v1/tenants/shark-academy/${validConfig.client_id}/oauth/token/slo-after-revoke-token`,
    )
    expect(sloUrl.searchParams.get('slo_code')).toEqual('azerty')
    expect(sloUrl.searchParams.get('target_url')).toEqual('http://localhost:8000/')
  })
})

describe('Request.decoratedRequest', () => {
  it('returns proper headers', () => {
    let request = RequestAPI.decoratedKyOptions('access_token_azerty')
    expect(request).toEqual({
      headers: { Authorization: 'Bearer access_token_azerty' },
    })
  })
})

describe('Request.universalTokenParams', () => {
  it('returns proper formated params', () => {
    let config: Config = ConfigFixture.valid()
    let authorization: Authorization = AuthorizationFixture.valid()
    let transaction: Transaction = TransactionFixure.valid()
    let params = RequestAPI.universalTokenParams(
      config,
      authorization,
      transaction,
      'some-request-id',
    )
    expect(params).toEqual({
      grant_type: 'authorization_code',
      client_id: config.client_id,
      authorization_id: authorization.id,
      code: authorization.code,
      code_verifier: transaction.pkce.code_verifier,
      nonce: transaction.nonce,
      request_id: 'some-request-id',
      client_state: transaction.pkce.state,
    })
  })
})

describe('Request.tokenParams', () => {
  it('returns proper formated params', () => {
    let config: Config = ConfigFixture.valid()
    let authorization: Authorization = AuthorizationFixture.valid()
    let transaction: Transaction = TransactionFixure.valid()
    let params = RequestAPI.tokenParams(config, authorization, transaction)
    expect(params).toEqual({
      grant_type: 'authorization_code',
      client_id: config.client_id,
      authorization_id: authorization.id,
      code: authorization.code,
      code_verifier: transaction.pkce.code_verifier,
      nonce: transaction.nonce,
    })
  })
})
