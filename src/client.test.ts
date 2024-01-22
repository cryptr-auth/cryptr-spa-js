import Client from './client'
import Request from './request'
import Storage from './storage'
import Transaction from './transaction'
import { Config } from './interfaces'
import { cryptrBaseUrl, DEFAULT_SCOPE } from './constants'
import TokenFixture from './__fixtures__/token.fixture'
import InMemory from './memory'
import * as Utils from './utils'
import axios from 'axios'
import { refreshKey, tomorrowDate } from './transaction.utils'

jest.mock('axios')

const validConfig: Config = {
  tenant_domain: 'shark-academy',
  client_id: '123-xeab',
  audience: 'http://localhost:4200',
  default_redirect_uri: 'http://localhost:1234',
  cryptr_base_url: 'http://localhost:4000',
  default_slo_after_revoke: false
}

const euValidConfig: Config = {
  tenant_domain: 'shark-academy',
  client_id: '123-xeab',
  audience: 'http://localhost:4200',
  default_redirect_uri: 'http://localhost:1234',
  region: 'eu',
  default_slo_after_revoke: false
}

const usValidConfig: Config = {
  tenant_domain: 'shark-academy',
  client_id: '123-xeab',
  audience: 'http://localhost:4200',
  default_redirect_uri: 'http://localhost:1234',
  region: 'us',
  default_slo_after_revoke: false
}

const wrongBaseUrlConfig: Config = {
  tenant_domain: 'shark-academy',
  client_id: '123-xeab',
  audience: 'http://localhost:4200',
  default_redirect_uri: 'http://localhost:1234',
  default_slo_after_revoke: false
}

const wrongLocaleConfig: Config = {
  tenant_domain: 'shark-academy',
  client_id: '123-xeab',
  audience: 'http://localhost:4200',
  default_redirect_uri: 'http://localhost:1234',
  region: 'eu',
  default_slo_after_revoke: false
}

const wrongRegionConfig: Config = {
  tenant_domain: 'shark-academy',
  client_id: '123-xeab',
  audience: 'http://localhost:4200',
  default_redirect_uri: 'http://localhost:1234',
  region: 'asia',
  default_slo_after_revoke: false,
}

const wrongSloConfig: Config = {
  tenant_domain: 'shark-academy',
  client_id: '123-xeab',
  audience: 'http://localhost:4200',
  default_redirect_uri: 'http://localhost:1234',
  cryptr_base_url: 'http://localhost:4000'
}

describe('Cryptr Base url', () => {
  it('should have eu base value if region EU', () => {
    expect(cryptrBaseUrl(euValidConfig)).toEqual('https://auth.cryptr.eu')
  })

  it('should have us base value if region US', () => {
    expect(cryptrBaseUrl(usValidConfig)).toEqual('https://auth.cryptr.us')
  })
  it('should have localhost:400 base value if set so', () => {
    expect(cryptrBaseUrl(validConfig)).toEqual('http://localhost:4000')
  })

  it('should throw error if neither region nor cryptr_base_url', () => {
    expect(() => cryptrBaseUrl(wrongBaseUrlConfig)).toThrowError(
      "You must provide region in values eu,us found 'undefined', if not provide your cryptr_base_url",
    )
  })
})
describe('client creation', () => {
  let client = new Client(validConfig)
  it('should succeed', () => {
    expect(client).not.toBe(null)
  })

  it('should not permit authentication', async () => {
    expect(client.canHandleAuthentication('')).toBe(false)
  })
  it('should not permit authentication', async () => {
    expect(await client.canHandleInvitation('')).toBe(false)
  })

  it('should be unauthenticated', async () => {
    expect(await client.isAuthenticated()).toBe(false)
  })
  it('isAuthenticated should call currentAccessToken', async () => {
    const accessTokenFn = jest.spyOn(client, 'getCurrentAccessToken')
    await client.isAuthenticated()
    expect(accessTokenFn).toHaveBeenCalled()
    accessTokenFn.mockRestore()
  })

  it('should throw error if  wrong locale defined', () => {
    expect(() => new Client(wrongLocaleConfig)).toThrowError(
      "'de' locale not valid, possible values en,fr",
    )
  })

  it('should throw error if  wrong region defined', () => {
    expect(() => new Client(wrongRegionConfig)).toThrowError(
      "You must provide region in values eu,us found 'asia', if not provide your cryptr_base_url",
    )
  })

  it('should throw error if no default_slo_after_revoke defined', () => {
    expect(() => new Client(wrongSloConfig)).toThrow(
      "Since v(1.3.0), you have to define boolean value for key 'default_slo_after_revoke'"
    )
  })
})

describe('client memory management', () => {
  let client = new Client(validConfig)

  it('should return nil access token', () => {
    expect(client.getCurrentAccessToken()).toBe(undefined)
  })

  it('should return nil id token', () => {
    expect(client.getCurrentIdToken()).toBe(undefined)
  })

  it('should return undefined user', () => {
    expect(client.getUser()).toBe(undefined)
  })
})

describe('valid client', () => {
  let client = new Client(validConfig)

  it('can retrieve claims from valid access token', () => {
    let claims = client.getClaimsFromAccess(TokenFixture.accessToken.valid())
    expect(claims).not.toBe(null)
  })

  it('retrieves null claims if accessToken', () => {
    let claims = client.getClaimsFromAccess('')

    expect(claims).toBe(null)
  })
})

// describe('valid client refreshtoken', () => {
//   let client = new Client(validConfig)
//   let response = {
//     data: '1',
//     data_refresh: '1',
//     access_token: '1',
//   }

//   it('can retrieve claims from valid access token', () => {
//     expect(client.handleRefreshTokens()).not.toEqual(2)
//   })
// })

describe('Client.refreshTokens() with refreshStore', () => {
  let client = new Client(validConfig)
  let cookieRefreshBody = {
    refresh_token: 'azerty-951-mlkj',
  }
  beforeEach(() => {
    Storage.createCookie(refreshKey(), cookieRefreshBody, tomorrowDate())
  })

  it('should create Transaction', async () => {
    const transactionCreateFn = jest.spyOn(Transaction, 'create')
    await client.handleRefreshTokens()
    expect(transactionCreateFn).toHaveBeenCalled()
    transactionCreateFn.mockRestore()
  })

  it('should call request refresh tokens', async () => {
    const RequestRefreshTokensFn = jest.spyOn(Request, 'refreshTokens')
    await client.handleRefreshTokens()
    expect(RequestRefreshTokensFn).toHaveBeenCalled()
    RequestRefreshTokensFn.mockRestore()
  })
})

describe('Client.refreshTokens() without refreshStore', () => {
  let client = new Client(validConfig)

  beforeEach(() => {
    Storage.clearCookies(validConfig.client_id)
  })
  it('should throws errors', async () => {
    const consoleErrorFn = jest.spyOn(console, 'log')
    expect(client.canRefresh(client.getRefreshStore())).toBeFalsy()
    expect(client.getRefreshStore()).toEqual({})
    expect(Object.keys(client.getRefreshStore()).length).toEqual(0)
    await client.handleRefreshTokens()
    expect(consoleErrorFn).toHaveBeenCalledWith('should log out')
    consoleErrorFn.mockRestore()
  })
})

describe('handlerefresh token', () => {
  let client = new Client(validConfig)
  // let response = {
  //   data: {
  //     refresh_token: 'eab12-ered-123',
  //     refresh_token_expires_at: '01 Jan 2022 00:00:00 GMT',
  //     access_token: '1',
  //   },
  //   data_refresh: '1',
  // }

  //   it('should create cookie', () => {
  //     const createCookieFn = jest.spyOn(Storage, 'createCookie')
  //     client.handleRefreshTokens(response)
  //     let refreshObj = {
  //       refresh_token: 'eab12-ered-123',
  //       rotation_duration: DEFAULT_REFRESH_ROTATION_DURATION,
  //       expiration_date: Date.parse('01 Jan 2022 00:00:00 GMT'),
  //       access_token: '1',
  //     }
  //     expect(createCookieFn).toHaveBeenCalledWith(refreshKey(), refreshObj)
  //     createCookieFn.mockRestore()
  //   })

  xit('should set accesstoken', () => {
    const setAccessTokenFn = jest.spyOn(InMemory.prototype, 'setAccessToken')
    client.handleRefreshTokens()
    expect(setAccessTokenFn).toHaveBeenCalledWith('1')
    setAccessTokenFn.mockRestore()
  })
})

describe('valid client manage location', () => {
  let url = 'http://localhost:4200?state=xeab&code=toto'
  let parsedUrl = new URL(url)
  let client = new Client(validConfig)

  it('should extract right parameters', async () => {
    expect(await client.canHandleAuthentication(url)).toBe(true)
  })

  it('should extract right state', () => {
    expect(parsedUrl.searchParams.get('state')).toEqual('xeab')
  })

  it('should extract right code', () => {
    expect(parsedUrl.searchParams.get('code')).toEqual('toto')
  })
})

describe('valid client handling redirect callback', () => {
  // let url = "http://localhost:4200?state=xeab&code=toto"
  // let parsedUrl = new URL(url)
  let client = new Client(validConfig)

  it('should throw error if no location provided', async () => {
    try {
      await client.handleRedirectCallback()
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toEqual('Can not parse authorization params')
      }
    }
  })
})

describe('signin process', () => {
  let client = new Client(validConfig)

  it('signInWithRedirect creates a Transaction', async () => {
    const transactionCreateFn = jest.spyOn(Transaction, 'create')
    await client.signInWithRedirect()
    expect(transactionCreateFn).toHaveBeenCalledWith(
      false,
      'signin',
      'openid email profile',
      undefined,
      validConfig.default_redirect_uri,
    )
    transactionCreateFn.mockRestore()
  })

  it('signUpWithRedirect creates a Transaction', async () => {
    const transactionCreateFn = jest.spyOn(Transaction, 'create')
    await client.signUpWithRedirect()
    expect(transactionCreateFn).toHaveBeenCalledWith(
      false,
      'signup',
      'openid email profile',
      undefined,
      validConfig.default_redirect_uri,
    )
    transactionCreateFn.mockRestore()
  })

  it('inviteWithRedirect creates a Transaction', async () => {
    const transactionCreateFn = jest.spyOn(Transaction, 'create')
    await client.inviteWithRedirect()
    expect(transactionCreateFn).toHaveBeenCalledWith(
      false,
      'invite',
      'openid email profile',
      undefined,
      validConfig.default_redirect_uri,
    )
    transactionCreateFn.mockRestore()
  })

  it('signInWithDomain without domain, call Transaction universalGatewayUrl fn without attribute', async () => {
    const transactionUniversalSignUrlFn = jest.spyOn(Transaction, 'universalGatewayUrl')
    await client.signInWithDomain()
    expect(transactionUniversalSignUrlFn).toBeCalledWith(
      expect.objectContaining({
        config: client.config,
      }),
    )
    transactionUniversalSignUrlFn.mockRestore()
  })

  it('signInWithDomain call Transaction universalGatewayUrl fn', async () => {
    const transactionUniversalSignUrlFn = jest.spyOn(Transaction, 'universalGatewayUrl')
    await client.signInWithDomain('some-domain')
    expect(transactionUniversalSignUrlFn).toBeCalledWith(
      expect.objectContaining({
        config: client.config,
        domain: 'some-domain',
      }),
    )
    transactionUniversalSignUrlFn.mockRestore()
  })

  it('signInWithEmail call Transaction universalGatewayUrl fn', async () => {
    const transactionUniversalSignUrlFn = jest.spyOn(Transaction, 'universalGatewayUrl')
    await client.signInWithEmail('john.doe@cryptr.co')
    expect(transactionUniversalSignUrlFn).toBeCalledWith(
      expect.objectContaining({
        config: client.config,
        email: 'john.doe@cryptr.co',
      }),
    )
    transactionUniversalSignUrlFn.mockRestore()
  })

  it('signInWithEmail with options call Transaction universalGatewayUrl fn properly', async () => {
    const transactionUniversalSignUrlFn = jest.spyOn(Transaction, 'universalGatewayUrl')
    const transactionCreateFn = jest.spyOn(Transaction, 'create')
    await client.signInWithEmail('john.doe@cryptr.co', { locale: 'fr' })
    expect(transactionCreateFn).toBeCalledWith(
      'sso',
      'openid email profile',
      'fr',
      client.config.default_redirect_uri,
    )
    expect(transactionUniversalSignUrlFn).toBeCalledWith(
      expect.objectContaining({
        config: client.config,
        email: 'john.doe@cryptr.co',
        transaction: expect.objectContaining({
          pkce: expect.objectContaining({
            code_challenge_method: 'S256',
          }),
          sign_type: 'sso',
          scope: 'openid email profile',
          locale: 'fr',
          redirect_uri: client.config.default_redirect_uri,
        }),
      }),
    )
    transactionCreateFn.mockRestore()
    transactionUniversalSignUrlFn.mockRestore()
  })

  it('signInWithDomain with options call Transaction universalGatewayUrl fn properly', async () => {
    const transactionUniversalSignUrlFn = jest.spyOn(Transaction, 'universalGatewayUrl')
    const transactionCreateFn = jest.spyOn(Transaction, 'create')
    await client.signInWithDomain('some-domain', { locale: 'fr' })
    expect(transactionCreateFn).toBeCalledWith(
      'sso',
      'openid email profile',
      'fr',
      client.config.default_redirect_uri,
    )
    expect(transactionUniversalSignUrlFn).toBeCalledWith(
      expect.objectContaining({
        config: client.config,
        domain: 'some-domain',
        transaction: expect.objectContaining({
          pkce: expect.objectContaining({
            code_challenge_method: 'S256',
          }),
          sign_type: 'sso',
          scope: 'openid email profile',
          locale: 'fr',
          redirect_uri: client.config.default_redirect_uri,
        }),
      }),
    )
    transactionCreateFn.mockRestore()
    transactionUniversalSignUrlFn.mockRestore()
  })
})

describe('Client.userAccountAccess/0', () => {
  let client = new Client(validConfig)

  it('should call getCurrentAccessToken', async () => {
    const accessTokenFn = jest.spyOn(client, 'getCurrentAccessToken')
    await client.userAccountAccess()
    expect(accessTokenFn).toHaveBeenCalled()
    accessTokenFn.mockRestore()
  })

  it('should call proper endpoint depending on tnt', async () => {
    const token = TokenFixture.accessToken.valid()
    await client.userAccountAccess(token)
    const axiosGetFn = jest.spyOn(axios, 'post')
    expect(axiosGetFn).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/client-management/tenants/cryptr/account-access',
      {
        client_id: client.config.client_id,
        access_token: token,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )
    axiosGetFn.mockRestore()
  })

  it('should call proper endpoint depending on differnet tnt', async () => {
    const token = TokenFixture.accessToken.misapretSample()
    await client.userAccountAccess(token)
    const axiosGetFn = jest.spyOn(axios, 'post')
    expect(axiosGetFn).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/client-management/tenants/misapret/account-access',
      {
        client_id: client.config.client_id,
        access_token: token,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )
    axiosGetFn.mockRestore()
  })
})

describe('Client.handleInvitationState', () => {
  let client = new Client(validConfig)

  it('calls locationSearch', () => {
    const locationSarchFn = jest.spyOn(Utils, 'locationSearch')
    client.handleInvitationState()
    expect(locationSarchFn).toHaveBeenCalled()
    locationSarchFn.mockRestore()
  })
})

describe('Client.handleTokensErrors/1', () => {
  let client = new Client(validConfig)

  it('throws invalidGrantError if present', () => {
    const consoleErrorFn = jest.spyOn(console, 'error')
    client.handleTokensErrors([
      { error: 'invalid_grant', http_response: 401, error_description: 'invalid_grant' },
    ])
    expect(consoleErrorFn).toHaveBeenCalledWith('invalid grant detected')
    consoleErrorFn.mockRestore()
  })
})

describe('Client.handleNewTokens/2', () => {
  let client = new Client(validConfig)
  let refreshStore = {
    refresh_token: 'refresh_token',
    access_token_expiration_date: 12,
    refresh_expiration_date: 42,
    refresh_leeway: 60,
    refresh_retry: 5,
  }
  it('calls setAccessToken if valid accessToken present', () => {
    const setAccessTokenFn = jest.spyOn(InMemory.prototype, 'setAccessToken')
    client.handleNewTokens(refreshStore, { valid: true, accessToken: 'eji.aze' })
    expect(setAccessTokenFn).toHaveBeenCalledWith('eji.aze')
    setAccessTokenFn.mockRestore()
  })

  it('calls setIdToken is valid accessToken present', () => {
    const setIdTokenFn = jest.spyOn(InMemory.prototype, 'setIdToken')
    client.handleNewTokens(refreshStore, {
      valid: true,
      accessToken: 'eji.aze',
      idToken: '123-beaw',
    })
    expect(setIdTokenFn).toHaveBeenCalledWith('123-beaw')
    setIdTokenFn.mockRestore()
  })

  it('calls Transaction.getRefreshParameters is valid tokens', () => {
    const getRefreshParametersFn = jest.spyOn(Transaction, 'getRefreshParameters')
    client.handleNewTokens(refreshStore, {
      valid: true,
      accessToken: 'eji.aze',
      idToken: '123-beaw',
    })
    expect(getRefreshParametersFn).toHaveBeenCalledWith({
      valid: true,
      accessToken: 'eji.aze',
      idToken: '123-beaw',
    })
    getRefreshParametersFn.mockRestore()
  })

  it('not calls recurringRefreshToken if error present', () => {
    const recurringRefreshTokenFn = jest.spyOn(Client.prototype, 'recurringRefreshToken')
    client.handleNewTokens(refreshStore, {
      errors: [{ error: 'invalid_grant', http_response: 401, error_description: 'invalid_grant' }],
    })
    expect(recurringRefreshTokenFn).not.toHaveBeenCalled()
    recurringRefreshTokenFn.mockRestore()
  })
})

describe('Client.recurringRefreshToken/1', () => {
  let client = new Client(validConfig)
  beforeEach(() => {
    Storage.clearCookies(validConfig.client_id)
  })

  xit('throws error outside browser config', () => {
    const consoleErrorFn = jest.spyOn(console, 'error')
    client.recurringRefreshToken(client.getRefreshStore())
    expect(consoleErrorFn).toHaveBeenCalledWith('error while reccuring refresh token')
    consoleErrorFn.mockRestore()
  })
})

describe('Client.handleRedirectCallback/?', () => {
  let client = new Client(validConfig)
  it('looks for transaction from redirectParams state', () => {
    let transactionGetFn = jest.spyOn(Transaction, 'get')
    client.handleRedirectCallback({ state: '12', authorization: { id: '42', code: 'azerty' } })
    expect(transactionGetFn).toHaveBeenCalledWith('12')
    transactionGetFn.mockRestore()
  })

  it('calls Transaction.getTokens without organization attribute', async () => {
    let transactionGetTokensFn = jest.spyOn(Transaction, 'getTokens')
    await client.handleRedirectCallback({
      state: '12',
      authorization: { id: '42', code: 'azerty' },
    })
    expect(transactionGetTokensFn).toHaveBeenCalledWith(
      { ...validConfig },
      { id: '42', code: 'azerty' },
      expect.anything(),
      undefined,
    )
    transactionGetTokensFn.mockRestore()
  })

  it('calls Transaction.getTokens with organization attribute if present', async () => {
    let transactionGetTokensFn = jest.spyOn(Transaction, 'getTokens')
    await client.handleRedirectCallback({
      state: '12',
      authorization: { id: '42', code: 'azerty' },
      organization_domain: 'misapret',
    })
    expect(transactionGetTokensFn).toHaveBeenCalledWith(
      { ...validConfig },
      { id: '42', code: 'azerty' },
      expect.anything(),
      'misapret',
    )
    transactionGetTokensFn.mockRestore()
  })

  it('calls Transaction.getUniversalTokens with request_id attribute if present', async () => {
    let transactionGetUniversalTokensFn = jest.spyOn(Transaction, 'getUniversalTokens')
    await client.handleRedirectCallback({
      state: '12',
      authorization: { id: '42', code: 'azerty' },
      request_id: 'some-request-id',
    })
    expect(transactionGetUniversalTokensFn).toHaveBeenCalledWith(
      { ...validConfig },
      { id: '42', code: 'azerty' },
      expect.anything(),
      'some-request-id',
      undefined,
    )
    transactionGetUniversalTokensFn.mockRestore()
  })

  it('calls Transaction.getUniversalTokens with both request_id and organization_domain attribute if present', async () => {
    let transactionGetUniversalTokensFn = jest.spyOn(Transaction, 'getUniversalTokens')
    await client.handleRedirectCallback({
      state: '12',
      authorization: { id: '42', code: 'azerty' },
      request_id: 'some-request-id',
      organization_domain: 'misapret',
    })
    expect(transactionGetUniversalTokensFn).toHaveBeenCalledWith(
      { ...validConfig },
      { id: '42', code: 'azerty' },
      expect.anything(),
      'some-request-id',
      'misapret',
    )
    transactionGetUniversalTokensFn.mockRestore()
  })
})

describe('Client.finalScope', () => {
  let client = new Client(validConfig)
  let newScope = 'read:invoices delete:tutu'
  let duplicatedScope = 'email email openid read:invoices delete:tutu'
  let scopeWithPartDefault = 'email read:invoices delete:tutu'

  it('returns DEFAULT_SCOPE if none provided', async () => {
    expect(client.finalScope(undefined)).toEqual(DEFAULT_SCOPE)
  })

  it('returns DEFAULT_SCOPE if DEFAULT_SCOPE provided', async () => {
    expect(client.finalScope(DEFAULT_SCOPE)).toEqual(DEFAULT_SCOPE)
  })
  it('returns DEFAULT_SCOPE appendend to scope if one provided', async () => {
    expect(client.finalScope(newScope)).toEqual('openid email profile read:invoices delete:tutu')
  })

  it('returns DEFAULT_SCOPE appendend to scope if duplicated provided', async () => {
    expect(client.finalScope(duplicatedScope)).toEqual(
      'openid email profile read:invoices delete:tutu',
    )
  })

  it('returns DEFAULT_SCOPE appendend to scope if one provided with partial DEFAULT', async () => {
    expect(client.finalScope(scopeWithPartDefault)).toEqual(
      'openid email profile read:invoices delete:tutu',
    )
  })
})

describe('logOut process', () => {
  let client = new Client(validConfig)
  let cookieRefreshBody = {
    refresh_token: 'azerty-951-mlkj',
  }
  beforeEach(() => {
    Storage.createCookie(refreshKey(), cookieRefreshBody, tomorrowDate())
  })

  it('should call getCurrentAccessToken', async () => {
    const refreshStoreFn = jest.spyOn(client, 'getRefreshStore')
    await client.logOut(null)
    expect(refreshStoreFn).toHaveBeenCalled()
    refreshStoreFn.mockRestore()
  })
})

describe('decorate request process', () => {
  let client = new Client(validConfig)

  it('should call Request decoratedRequest', async () => {
    const decoratedRequestFn = jest.spyOn(Request, 'decoratedRequest')
    await client.decoratedRequest(null)
    expect(decoratedRequestFn).toHaveBeenLastCalledWith(client.getCurrentAccessToken(), null)
    decoratedRequestFn.mockRestore()
  })
})
