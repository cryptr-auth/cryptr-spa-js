import { setupServer } from 'msw/node'

import AuthorizationFixture from './__fixtures__/authorization.fixture'
import Request from './request'
import RequestFixture from './__fixtures__/request.fixture'
import RequestMock from './__mocks__/request.mock'
import TransactionFixure from './__fixtures__/transaction.fixture'
import ConfigFixture from './__fixtures__/config.fixture'
import TokenFixture from './__fixtures__/token.fixture'
import { tokenUrl, revokeTokenUrl } from './request'

describe('postAuthorizationCode(authorization, transaction)', () => {
  const handlers = [RequestMock.postAuthorizationCodeResponse()]

  const server = setupServer(...handlers)

  beforeAll(() => server.listen())
  afterAll(() => server.close())

  // Valid testing setup with service worker to mock API
  xit('returns access & refresh tokens', async () => {
    Request.postAuthorizationCode(
      ConfigFixture.valid(),
      AuthorizationFixture.valid(),
      TransactionFixure.valid(),
    ).then((response: any) => {
      expect(response['data']['access_token']).toMatch(
        RequestFixture.authorizationCodeResponse.valid().access_token,
      )
      expect(response['data']['refresh_token']).toMatch(
        RequestFixture.authorizationCodeResponse.valid().refresh_token,
      )
    })
  })
})

describe('refreshTokens(authorization, transaction)', () => {
  const handlers = [RequestMock.postAuthorizationCodeResponse()]

  const server = setupServer(...handlers)

  beforeAll(() => server.listen())
  afterAll(() => server.close())

  // Valid testing setup with service worker to mock API
  it('returns access & refresh tokens', async () => {
    Request.refreshTokens(
      ConfigFixture.valid(),
      TransactionFixure.valid(),
      TokenFixture.accessToken.valid(),
    )
      .then((response: any) => {
        expect(response['data']['access_token']).toMatch(
          RequestFixture.authorizationCodeResponse.valid().access_token,
        )
        expect(response['data']['refresh_token']).toMatch(
          RequestFixture.authorizationCodeResponse.valid().refresh_token,
        )
      })
      .catch((reason: any) => {
        console.error(reason)
      })
  })
})

describe('request generics', () => {
  it('returns the authorization code path', () => {
    expect(
      tokenUrl(ConfigFixture.valid(), AuthorizationFixture.valid(), TransactionFixure.valid()),
    ).toEqual(
      'http://localhost:4000/api/v1/tenants/misapret/42bdb919-b4a4-4816-82c4-9b21ff546876/da2379bc-46b2-4e9e-a7c4-62a891827944/oauth/signin/client/bc3c507d-7ede-412e-b9be-dcc7d2cad1b4/token',
    )
  })
})

describe('revoke tokens', () => {
  //  TODO : reset working stuff
  xit('returns proper data from revoke refresh', async () => {
    Request.revokeRefreshToken(
      ConfigFixture.valid(),
      TokenFixture.refreshToken.validForThibs(),
    ).then((response: any) => {
      expect(typeof response['data']['revoked_at']).toBe('string')
      expect(response.status).toEqual(200)
    })
  })

  xit('returns proper data from revoke access', async () => {
    Request.revokeAccessToken(ConfigFixture.valid(), TokenFixture.accessToken.validForThibs()).then(
      (response: any) => {
        expect(typeof response['data']['revoked_at']).not.toBe('string')
        expect(response.status).toEqual(200)
      },
    )
  })

  xit('fails when revoke wrong refresh', async () => {
    Request.revokeRefreshToken(ConfigFixture.valid(), TokenFixture.refreshToken.wrong()).catch(
      (reason: any) => {
        expect(reason.response['data']).toEqual({ error: "Access token doesn't exist" })
        expect(reason.response.status).toEqual(422)
      },
    )
  })

  it('returns the authorization code path', () => {
    expect(revokeTokenUrl(ConfigFixture.valid())).toEqual(
      'http://localhost:4000/api/v1/tenants/misapret/42bdb919-b4a4-4816-82c4-9b21ff546876/oauth/token/revoke',
    )
  })
})
