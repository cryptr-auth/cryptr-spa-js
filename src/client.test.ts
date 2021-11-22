import Client from './client'
// import InMemory from './memory'
import Request from './request'
import Storage from './storage'
import Transaction, { tomorrowDate } from './transaction'
import * as Sentry from '@sentry/browser'
import { Config } from './interfaces'
import {
  cryptrBaseUrl,
  DEFAULT_SCOPE,
  //   DEFAULT_REFRESH_ROTATION_DURATION,
  // DEFAULT_REFRESH_ROTATION_DURATION, DEFAULT_SCOPE
} from './constants'
import TokenFixture from './__fixtures__/token.fixture'
import InMemory from './memory'
import { refreshKey } from './transaction'

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

describe('refreshTokens()', () => {
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
      'openid email profile',
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
      'openid email profile',
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
      'openid email profile',
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
      'invite',
      'openid email profile',
      undefined,
      validConfig.default_redirect_uri,
    )
    transactionCreateFn.mockRestore()
  })

  it('signWithSso creates a Transaction', async () => {
    const transactionCreateFn = jest.spyOn(Transaction, 'create')
    const idpId = 'misapret_QtqpTS7itBLt4HdoCj5Qck'
    await client.signInWithSSO(idpId)
    expect(transactionCreateFn).toHaveBeenCalledWith(
      'sso',
      'openid email profile',
      undefined,
      validConfig.default_redirect_uri,
    )
    transactionCreateFn.mockRestore()
  })

  it('signWithSso with minimal scope creates a proper scoped Transaction', async () => {
    const transactionCreateFn = jest.spyOn(Transaction, 'create')
    const idpId = 'misapret_QtqpTS7itBLt4HdoCj5Qck'
    await client.signInWithSSO(idpId, { scope: 'openid email' })
    expect(transactionCreateFn).toHaveBeenCalledWith(
      'sso',
      'openid email profile',
      undefined,
      validConfig.default_redirect_uri,
    )
    transactionCreateFn.mockRestore()
  })

  it('signWithSso with higher scope creates a proper scoped Transaction', async () => {
    const transactionCreateFn = jest.spyOn(Transaction, 'create')
    const idpId = 'misapret_QtqpTS7itBLt4HdoCj5Qck'
    await client.signInWithSSO(idpId, { scope: 'openid email profile admin' })
    expect(transactionCreateFn).toHaveBeenCalledWith(
      'sso',
      'openid email profile admin',
      undefined,
      validConfig.default_redirect_uri,
    )
    transactionCreateFn.mockRestore()
  })

  it('signWithSso creates a chosen redirection Transaction', async () => {
    const transactionCreateFn = jest.spyOn(Transaction, 'create')
    const idpId = 'misapret_QtqpTS7itBLt4HdoCj5Qck'
    await client.signInWithSSO(idpId, {
      scope: 'openid email profile',
      redirectUri: 'http://localhost:3000',
    })
    expect(transactionCreateFn).toHaveBeenCalledWith(
      'sso',
      'openid email profile',
      undefined,
      'http://localhost:3000',
    )
    transactionCreateFn.mockRestore()
  })

  it('signWithSso creates a chosen locale Transaction', async () => {
    const transactionCreateFn = jest.spyOn(Transaction, 'create')
    const idpId = 'misapret_QtqpTS7itBLt4HdoCj5Qck'
    await client.signInWithSSO(idpId, {
      scope: 'openid email profile',
      redirectUri: 'http://localhost:3000',
      locale: 'fr',
    })
    expect(transactionCreateFn).toHaveBeenCalledWith(
      'sso',
      'openid email profile',
      'fr',
      'http://localhost:3000',
    )
    transactionCreateFn.mockRestore()
  })

  it('signWithSso with specific clientId creates standard Transaction', async () => {
    const transactionCreateFn = jest.spyOn(Transaction, 'create')
    const idpId = 'misapret_QtqpTS7itBLt4HdoCj5Qck'
    await client.signInWithSSO(idpId, {
      clientId: 'some-client-id',
    })
    expect(transactionCreateFn).toHaveBeenCalledWith(
      'sso',
      'openid email profile',
      undefined,
      'http://localhost:1234',
    )
    transactionCreateFn.mockRestore()
  })

  it('signWithSso with specific clientId calls Transaction signUrl fn', async () => {
    const transactionSignUrlFn = jest.spyOn(Transaction, 'signUrl')
    const idpId = 'misapret_QtqpTS7itBLt4HdoCj5Qck'
    await client.signInWithSSO(idpId, {
      clientId: 'some-client-id',
    })
    expect(transactionSignUrlFn).toHaveBeenCalledWith(
      { ...client.config, client_id: 'some-client-id' },
      expect.anything(),
      'misapret_QtqpTS7itBLt4HdoCj5Qck',
    )
    transactionSignUrlFn.mockRestore()
  })

  it('signWithSso with specific tenantDomain creates standard Transaction', async () => {
    const transactionCreateFn = jest.spyOn(Transaction, 'create')
    const idpId = 'misapret_QtqpTS7itBLt4HdoCj5Qck'
    await client.signInWithSSO(idpId, {
      tenantDomain: 'some-tenant-domain',
    })
    expect(transactionCreateFn).toHaveBeenCalledWith(
      'sso',
      'openid email profile',
      undefined,
      'http://localhost:1234',
    )
    transactionCreateFn.mockRestore()
  })

  it('signWithSso with specific tenantDomain calls Transaction signUrl fn', async () => {
    const transactionSignUrlFn = jest.spyOn(Transaction, 'signUrl')
    const idpId = 'misapret_QtqpTS7itBLt4HdoCj5Qck'
    await client.signInWithSSO(idpId, {
      tenantDomain: 'some-tenant-domain',
    })
    expect(transactionSignUrlFn).toHaveBeenCalledWith(
      { ...client.config, tenant_domain: 'some-tenant-domain' },
      expect.anything(),
      'misapret_QtqpTS7itBLt4HdoCj5Qck',
    )
    transactionSignUrlFn.mockRestore()
  })

  it('signWithSso call Transaction signUrl fn', async () => {
    const transactionSignUrlFn = jest.spyOn(Transaction, 'signUrl')
    const idpId = 'misapret_QtqpTS7itBLt4HdoCj5Qck'
    await client.signInWithSSO(idpId)
    expect(transactionSignUrlFn).toHaveBeenCalledWith(
      client.config,
      expect.anything(),
      'misapret_QtqpTS7itBLt4HdoCj5Qck',
    )
    transactionSignUrlFn.mockRestore()
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
