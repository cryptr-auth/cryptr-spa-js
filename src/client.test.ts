import Client from './client'
import InMemory from './memory'
import Request from './request'
import Storage from './storage'
import Transaction, { refreshKey } from './transaction'
import * as Sentry from '@sentry/browser'
import { Config } from './interfaces'
import { cryptrBaseUrl, DEFAULT_SCOPE } from './constants'

const validConfig: Config = {
  tenant_domain: 'shark-academy',
  client_id: '123-xeab',
  audience: 'http://localhost:4200',
  default_redirect_uri: 'http://localhost:1234',
  cryptr_base_url: 'http://localhost:4000',
  default_locale: 'fr',
}

const euValidConfig: Config = {
  tenant_domain: 'shark-academy',
  client_id: '123-xeab',
  audience: 'http://localhost:4200',
  default_redirect_uri: 'http://localhost:1234',
  region: 'eu',
}

const usValidConfig: Config = {
  tenant_domain: 'shark-academy',
  client_id: '123-xeab',
  audience: 'http://localhost:4200',
  default_redirect_uri: 'http://localhost:1234',
  region: 'us',
}

const wrongBaseUrlConfig: Config = {
  tenant_domain: 'shark-academy',
  client_id: '123-xeab',
  audience: 'http://localhost:4200',
  default_redirect_uri: 'http://localhost:1234',
}

const wrongLocaleConfig: Config = {
  tenant_domain: 'shark-academy',
  client_id: '123-xeab',
  audience: 'http://localhost:4200',
  default_redirect_uri: 'http://localhost:1234',
  region: 'eu',
  default_locale: 'de',
}

const wrongRegionConfig: Config = {
  tenant_domain: 'shark-academy',
  client_id: '123-xeab',
  audience: 'http://localhost:4200',
  default_redirect_uri: 'http://localhost:1234',
  region: 'asia',
}

const validAccessToken =
  'eyJhbGciOiJSUzI1NiIsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6NDAwMC90L3NoYXJrLWFjYWRlbXkiLCJraWQiOiJlYTE2NzI1ZS1jYTAwLTQxN2QtOTRmZS1hNzBiMTFhMGU0OTMiLCJ0eXAiOiJKV1QifQ.eyJhdWQiOiJodHRwOi8vbG9jYWxob3N0OjQyMDAiLCJjaWQiOiI5ZTljMjEwMS0xMDM1LTQwNDItOWMwZS01ZGI5NjM1ZDQwNDgiLCJleHAiOjE2MDMyNzQxODg3MTQsImlhdCI6MTYwMzI3MzI4ODcxNCwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdDo0MDAwL3Qvc2hhcmstYWNhZGVteSIsImp0aSI6IjJjOGM2ZGNjLTMwYzktNDRjOC1hNzIyLWQ0M2VmZmNkZWQ4NiIsImp0dCI6ImFjY2VzcyIsInJlc291cmNlX293bmVyX21ldGFkYXRhIjp7fSwic2NwIjpbImxpbWl0ZWQiXSwic3ViIjoiYjlhZmRmN2ItNTljMS00NjNkLTg1N2MtNTdmYWQzMzU5ZmY0IiwidG50Ijoic2hhcmstYWNhZGVteSIsInZlciI6MX0.A-TBRr6pue9sPwYroMQ2QVEnGgk5n8T-_8pmIrDfgYniqlcDMPOwU4wMpyvace48TOvhd0wsHPG5ep-7ZkIjuDRam6bVdRlmvGJBhvz0zyeAW12YuNqDwTkmKc-P2lTEGC_b5pq0Gn-97P3hGX2e35Wgkvseh2AP7T8crF58hdOxS-vwKGR0SoqdunzqFdTEWmpoUK0aFgkSIuCfBwBapYrHXcD0-yD6w-QzEi-c06HibTt32vXmWOtuOuy1z_os1SXqUR-rlUX1or8HusxMMhmv8lWi7LJnDjPBciL4_hW52hq0WdgdLvtsCeC03uVMyCPrBDK9m3AOb0b3t6looN7Bj7U8AtGmJh7P16hhHhlDoSdhOMdj-9SyU82S9kBQnlk_ReQCu26P1U-_SkT56LDA1RzlzLgTDB1fqadpTie7KAWwJS4HRgqIDHer5reK6-zHjmjUtfJR9Fs6WjSEbbZ0A9EqUxb5SS1e8G4QuhCRMKyXvkLslLD_zwapRHWp5AsIKXDhHunmzeP4KHMuJg05V7sMeag7MCr_BmR4Db0qd2cOyF0vEmW-sMRcICks50xZq-n6cM3rlGMEzPg3A9mqol8gnOCeGCQESfYv2D8h_mrOxXbBBGQlZZdxd1IP7LHAvIspzM6N1AYeyyqOLA1qf2NLVloAvdDaHd4qqX4'

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

  it('should not init sentry if telemetry false', () => {
    const sentryInitFn = jest.spyOn(Sentry, 'init')
    new Client({ ...validConfig, telemetry: false })
    expect(sentryInitFn).not.toBeCalled()
    expect(sentryInitFn).not.toHaveBeenCalled()
    sentryInitFn.mockRestore()
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
    let claims = client.getClaimsFromAccess(validAccessToken)
    expect(claims).not.toBe(null)
  })

  it('retrieves null claims if accessToken', () => {
    let claims = client.getClaimsFromAccess('')

    expect(claims).toBe(null)
  })
})

describe('valid client refreshtoken', () => {
  let client = new Client(validConfig)
  let response = {
    data: '1',
    data_refresh: '1',
    access_token: '1',
  }

  it('can retrieve claims from valid access token', () => {
    expect(client.handleRefreshTokens(response)).not.toEqual(2)
  })
})

describe('refreshTokens()', () => {
  let client = new Client(validConfig)
  let cookieRefreshBody = {
    refresh_token: 'azerty-951-mlkj',
  }
  beforeEach(() => {
    Storage.createCookie(refreshKey(), cookieRefreshBody)
  })

  it('should create Transaction', async () => {
    const transactionCreateFn = jest.spyOn(Transaction, 'create')
    await client.refreshTokens()
    expect(transactionCreateFn).toHaveBeenCalled()
    transactionCreateFn.mockRestore()
  })

  it('should call request refresh tokens', async () => {
    const RequestRefreshTokensFn = jest.spyOn(Request, 'refreshTokens')
    await client.refreshTokens()
    expect(RequestRefreshTokensFn).toHaveBeenCalled()
    RequestRefreshTokensFn.mockRestore()
  })
})

describe('handlerefresh token', () => {
  let client = new Client(validConfig)
  let response = {
    data: {
      refresh_token: 'eab12-ered-123',
      refresh_token_expires_at: '01 Jan 2022 00:00:00 GMT',
      access_token: '1',
    },
    data_refresh: '1',
  }

  it('should create cookie', () => {
    const createCookieFn = jest.spyOn(Storage, 'createCookie')
    client.handleRefreshTokens(response)
    let refreshObj = {
      refresh_token: 'eab12-ered-123',
      rotation_duration: 10000,
      expiration_date: Date.parse('01 Jan 2022 00:00:00 GMT'),
      access_token: '1',
    }
    expect(createCookieFn).toHaveBeenCalledWith(refreshKey(), refreshObj)
    createCookieFn.mockRestore()
  })

  it('should set accesstoken', () => {
    const setAccessTokenFn = jest.spyOn(InMemory.prototype, 'setAccessToken')
    client.handleRefreshTokens(response)
    expect(setAccessTokenFn).toHaveBeenCalledWith('1')
    setAccessTokenFn.mockRestore()
  })
})

describe('valid client manage location', () => {
  let url = 'http://localhost:4200?state=xeab&code=toto'
  let parsedUrl = new URL(url)
  // let client = new Client(validConfig)

  xit('should extract right parameters', async () => {
    // expect(await client.canHandleAuthentication(url)).toBe(true)
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
      expect(error.message).toEqual('Can not parse authorization params')
    }
  })
})

describe('signin process', () => {
  let client = new Client(validConfig)

  it('signInWithoutRedirect creates a Transaction', async () => {
    const transactionCreateFn = jest.spyOn(Transaction, 'create')
    await client.signInWithoutRedirect()
    expect(transactionCreateFn).toHaveBeenCalledWith(
      'signin',
      'openid email',
      undefined,
      validConfig.default_redirect_uri,
    )
    transactionCreateFn.mockRestore()
  })

  it('signUpWithoutRedirect creates a Transaction', async () => {
    const transactionCreateFn = jest.spyOn(Transaction, 'create')
    await client.signUpWithoutRedirect()
    expect(transactionCreateFn).toHaveBeenCalledWith(
      'signup',
      'openid email',
      undefined,
      validConfig.default_redirect_uri,
    )
    transactionCreateFn.mockRestore()
  })

  it('inviteWithoutRedirect creates a Transaction', async () => {
    const transactionCreateFn = jest.spyOn(Transaction, 'create')
    await client.inviteWithoutRedirect()
    expect(transactionCreateFn).toHaveBeenCalledWith(
      'invite',
      'openid email',
      undefined,
      validConfig.default_redirect_uri,
    )
    transactionCreateFn.mockRestore()
  })

  it('signInWithRedirect creates a Transaction', async () => {
    const transactionCreateFn = jest.spyOn(Transaction, 'create')
    await client.signInWithRedirect()
    expect(transactionCreateFn).toHaveBeenCalledWith(
      'signin',
      'openid email',
      undefined,
      validConfig.default_redirect_uri,
    )
    transactionCreateFn.mockRestore()
  })

  it('signUpWithRedirect creates a Transaction', async () => {
    const transactionCreateFn = jest.spyOn(Transaction, 'create')
    await client.signUpWithRedirect()
    expect(transactionCreateFn).toHaveBeenCalledWith(
      'signup',
      'openid email',
      undefined,
      validConfig.default_redirect_uri,
    )
    transactionCreateFn.mockRestore()
  })

  it('inviteWithRedirect creates a Transaction', async () => {
    const transactionCreateFn = jest.spyOn(Transaction, 'create')
    await client.inviteWithRedirect()
    expect(transactionCreateFn).toHaveBeenCalledWith(
      'invite',
      'openid email',
      undefined,
      validConfig.default_redirect_uri,
    )
    transactionCreateFn.mockRestore()
  })
})

describe('userAccountAccess', () => {
  let client = new Client(validConfig)

  it('should call getCurrentAccessToken', async () => {
    const accessTokenFn = jest.spyOn(client, 'getCurrentAccessToken')
    await client.userAccountAccess()
    expect(accessTokenFn).toHaveBeenCalled()
    accessTokenFn.mockRestore()
  })
})

describe('finalScope', () => {
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
    expect(client.finalScope(newScope)).toEqual('openid email read:invoices delete:tutu')
  })

  it('returns DEFAULT_SCOPE appendend to scope if duplicated provided', async () => {
    expect(client.finalScope(duplicatedScope)).toEqual('openid email read:invoices delete:tutu')
  })

  it('returns DEFAULT_SCOPE appendend to scope if one provided with partial DEFAULT', async () => {
    expect(client.finalScope(scopeWithPartDefault)).toEqual(
      'openid email read:invoices delete:tutu',
    )
  })
})

describe('logOut process', () => {
  let client = new Client(validConfig)

  it('should call getCurrentAccessToken', async () => {
    const accessTokenFn = jest.spyOn(client, 'getCurrentAccessToken')
    await client.logOut(null)
    expect(accessTokenFn).toHaveBeenCalled()
    accessTokenFn.mockRestore()
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
