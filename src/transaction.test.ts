import Transaction, { parseErrors } from './transaction'
import { Sign } from './types'
import TransactionFixure from './__fixtures__/transaction.fixture'
import ConfigFixture from './__fixtures__/config.fixture'
import { Config } from './interfaces'
import Request from './request'
import AuthorizationFixture from './__fixtures__/authorization.fixture'
import * as CryptrConfigValidation from '@cryptr/cryptr-config-validation'

jest.mock('es-cookie')
describe('Transaction', () => {
  it('key(state) returns key', () => {
    expect(Transaction.key(TransactionFixure.valid().pkce.state)).toMatchSnapshot()
  })

  it('creates proper SSO transaction', () => {
    expect(Transaction.create(false, Sign.Sso, 'openid email', 'en')).toMatchObject({
      ...TransactionFixure.valid(),
      pkce: {
        code_challenge: expect.any(String),
        code_verifier: expect.any(String),
        state: expect.any(String),
      },
      sign_type: Sign.Sso,
      nonce: expect.any(String),
      locale: 'en',
    })
  })

  it('creates proper SSO transaction using createFromState function', () => {
    var state = '123-xeab'
    const transaction = Transaction.createFromState(false, state, Sign.Sso, 'openid email')
    expect(transaction).toMatchObject({
      ...TransactionFixure.valid(),
      pkce: {
        code_challenge: expect.any(String),
        code_verifier: expect.any(String),
        state: state,
      },
      sign_type: Sign.Sso,
      nonce: expect.any(String),
    })
  })

  // TO FIX
  // it('returns access & id tokens', async () => {
  //   const transaction = await Transaction.getTokens(
  //     ConfigFixture.valid(),
  //     AuthorizationFixture.valid(),
  //     TransactionFixure.valid(),
  //   )

  //   expect(transaction).toMatchObject({
  //     valid: true,
  //     accessToken: RequestFixture.authorizationCodeResponse.valid().access_token,
  //     idToken: RequestFixture.authorizationCodeResponse.valid().id_token,
  //     errors: [],
  //   })
  // })

  it('signUrl returns a formatted url for signin/up redirection', () => {
    const url = Transaction.signUrl(ConfigFixture.valid(), TransactionFixure.valid())
    expect(url.href).toMatch(
      'http://localhost:4000/t/cryptr/en/da2379bc-46b2-4e9e-a7c4-62a891827944/signin/new?scope=openid+email&client_id=1c2417e6-757d-47fe-b564-57b7c6f39b1b&redirect_uri=http%3A%2F%2Flocalhost%3A8000%2F&code_challenge_method=S256&code_challenge=',
    )

    const config: Config = {
      tenant_domain: 'shark-academy',
      client_id: '876fe074-3be7-4616-98e5-b4195c97e0b5',
      audience: 'http://127.0.0.1:5000/dev/',
      default_redirect_uri: 'http://127.0.0.1:5000/dev/',
      cryptr_base_url: 'http://localhost:4000',
      // locale: 'en',
    }

    const transaction = {
      config: config,
      pkce: {
        code_verifier:
          'NTIsNTcsMTY2LDYzLDIyMSwxMTMsMTM3LDE5NywxMzUsMTg5LD…4LDIxMCwxOTYsMTk3LDE3LDYsMjU0LDE0NywzLDUyLDEzMCwx',
        code_challenge: 'HMMe6EtguOPNGsaiZxPdNckSSwdYulbjiJHufYqrA7U=',
        code_challenge_method: 'S256',
        state: '0d64259f-377a-46ea-8b53-83a15e91c9be',
      },
      scope: 'openid email',
      sign_type: 'signin',
    }

    const newUrl = Transaction.signUrl(config, transaction)
    expect(newUrl.href).toMatch('http://localhost:4000/t/shark-academy/en/')
  })

  it('should returns a proper SSO signUrl when SSO transaction and idpId provided', () => {
    const idpId = 'misapret_QtqpTS7itBLt4HdoCj5Qck'
    const url = Transaction.signUrl(
      ConfigFixture.valid(),
      TransactionFixure.validWithType(Sign.Sso),
      idpId,
    )
    expect(url.href).toMatch(
      'http://localhost:4000/enterprise/misapret_QtqpTS7itBLt4HdoCj5Qck/login?locale=en&state=da2379bc-46b2-4e9e-a7c4-62a891827944&scope=openid+email&client_id=1c2417e6-757d-47fe-b564-57b7c6f39b1b&redirect_uri=http%3A%2F%2Flocalhost%3A8000%2F&code_challenge_method=S256&code_challenge=',
    )
  })

  it('should throw an error SSO signUrl when SSO transaction without idpId provided', () => {
    expect(() =>
      Transaction.signUrl(ConfigFixture.valid(), TransactionFixure.validWithType(Sign.Sso)),
    ).toThrowError('Should provide idpId when SSO transaction')
  })

  it('should return default token error if no response provided', () => {
    expect(parseErrors(null)).toEqual({
      error: 'error',
      error_description: 'response is undefined',
      http_response: null,
    })
  })
})

const validConfig: Config = {
  tenant_domain: 'shark-academy',
  client_id: '123-xeab',
  audience: 'http://localhost:4200',
  default_redirect_uri: 'http://localhost:1234',
  cryptr_base_url: 'http://localhost:4000',
}

describe('Transaction.universalGatewayUrl/3', () => {
  it('should fail if no config', () => {
    const transaction = TransactionFixure.validWithType(Sign.Sso)
    expect(() => {
      Transaction.universalGatewayUrl({ config: undefined, transaction: transaction })
    }).toThrow("'config' and 'transaction are mandatory")
  })

  it('should fail if no transaction', () => {
    const t = () => {
      Transaction.universalGatewayUrl({ config: validConfig, trnasaction: undefined })
    }
    expect(t).toThrow("'config' and 'transaction are mandatory")
  })

  it('should return en universal gateway url with pkce attrs and english default locale', () => {
    const transaction = TransactionFixure.validWithType(Sign.Sso)
    const url = Transaction.universalGatewayUrl({
      config: { ...validConfig },
      transaction: transaction,
    })
    expect(url.href).toMatch('http://localhost:4000/t/shark-academy')
    expect(url.searchParams.get('locale')).toEqual('en')
    expect(url.searchParams.get('client_state')).toEqual(transaction.pkce.state)
    expect(url.searchParams.get('client_id')).toEqual('123-xeab')
    expect(url.searchParams.get('redirect_uri')).toEqual('http://localhost:1234')
    expect(url.searchParams.get('code_challenge_method')).toEqual('S256')
    expect(url.searchParams.get('code_challenge')).toEqual(transaction.pkce.code_challenge)
    expect(url.searchParams.get('scope')).toEqual('openid email')
    expect(url.searchParams.get('idp_id')).toBeNull()
    expect(url.searchParams.getAll('idp_ids[]')).toEqual([])

    expect(url.searchParams.get('email')).toBeNull()
    expect(url.searchParams.get('organization')).toBeNull()
  })

  it('should return raw universal gateway url with pkce attrs', () => {
    const transaction = TransactionFixure.validWithType(Sign.Sso)
    const url = Transaction.universalGatewayUrl({ config: validConfig, transaction: transaction })
    expect(url.href).toMatch('http://localhost:4000/t/shark-academy')
    expect(url.searchParams.get('locale')).toEqual('fr')
    expect(url.searchParams.get('client_state')).toEqual(transaction.pkce.state)
    expect(url.searchParams.get('client_id')).toEqual('123-xeab')
    expect(url.searchParams.get('redirect_uri')).toEqual('http://localhost:1234')
    expect(url.searchParams.get('code_challenge_method')).toEqual('S256')
    expect(url.searchParams.get('code_challenge')).toEqual(transaction.pkce.code_challenge)
    expect(url.searchParams.get('scope')).toEqual('openid email')
    expect(url.searchParams.get('idp_id')).toBeNull()
    expect(url.searchParams.getAll('idp_ids[]')).toEqual([])

    expect(url.searchParams.get('email')).toBeNull()
    expect(url.searchParams.get('organization')).toBeNull()
  })

  it('should return universal gateway url with pkce and email attrs if email provided', () => {
    const transaction = TransactionFixure.validWithType(Sign.Sso)
    const url = Transaction.universalGatewayUrl({
      config: validConfig,
      transaction: transaction,
      email: 'shark',
    })
    expect(url.href).toMatch('http://localhost:4000/t/shark-academy')
    expect(url.searchParams.get('locale')).toEqual('fr')
    expect(url.searchParams.get('client_state')).toEqual(transaction.pkce.state)
    expect(url.searchParams.get('client_id')).toEqual('123-xeab')
    expect(url.searchParams.get('redirect_uri')).toEqual('http://localhost:1234')
    expect(url.searchParams.get('code_challenge_method')).toEqual('S256')
    expect(url.searchParams.get('code_challenge')).toEqual(transaction.pkce.code_challenge)
    expect(url.searchParams.get('scope')).toEqual('openid email')
    expect(url.searchParams.get('email')).toEqual('shark')
    expect(url.searchParams.get('idp_id')).toBeNull()
    expect(url.searchParams.getAll('idp_ids[]')).toEqual([])
  })

  it('should return universal gateway url with pkce and organization attrs if domain provided', () => {
    const transaction = TransactionFixure.validWithType(Sign.Sso)
    const url = Transaction.universalGatewayUrl({
      config: validConfig,
      transaction: transaction,
      organizationDomain: 'shark',
    })
    expect(url.href).toMatch('http://localhost:4000/t/shark-academy')
    expect(url.searchParams.get('locale')).toEqual('fr')
    expect(url.searchParams.get('client_state')).toEqual(transaction.pkce.state)
    expect(url.searchParams.get('client_id')).toEqual('123-xeab')
    expect(url.searchParams.get('redirect_uri')).toEqual('http://localhost:1234')
    expect(url.searchParams.get('code_challenge_method')).toEqual('S256')
    expect(url.searchParams.get('code_challenge')).toEqual(transaction.pkce.code_challenge)
    expect(url.searchParams.get('scope')).toEqual('openid email')
    expect(url.searchParams.get('organization')).toEqual('shark')
    expect(url.searchParams.get('idp_id')).toBeNull()
    expect(url.searchParams.getAll('idp_ids[]')).toEqual([])
  })
})

describe('Transaction.gatewaySignUrl/3', () => {
  it('should generate root gateway url if config is dedicated_server', () => {
    const transaction = TransactionFixure.validWithType(Sign.Sso)
    const url = Transaction.gatewaySignUrl({ ...validConfig, dedicated_server: true }, transaction)
    expect(url.href).toMatch('http://localhost:4000/?locale=fr')
    expect(url.searchParams.get('idp_id')).toBeNull()
    expect(url.searchParams.getAll('idp_ids[]')).toEqual([])
    expect(url.searchParams.get('locale')).toEqual('fr')
    expect(url.searchParams.get('client_state')).toEqual(transaction.pkce.state)
    expect(url.searchParams.get('client_id')).toEqual('123-xeab')
    expect(url.searchParams.get('redirect_uri')).toEqual('http://localhost:1234')
    expect(url.searchParams.get('code_challenge_method')).toEqual('S256')
    expect(url.searchParams.get('code_challenge')).toEqual(transaction.pkce.code_challenge)
    expect(url.searchParams.get('scope')).toEqual('openid email')
  })

  it('should generate domainized gateway url if config is not dedicated_server', () => {
    const transaction = TransactionFixure.validWithType(Sign.Sso)
    const url = Transaction.gatewaySignUrl({ ...validConfig, dedicated_server: false }, transaction)
    expect(url.href).toMatch('http://localhost:4000/t/shark-academy/?locale=fr')
    expect(url.searchParams.get('idp_id')).toBeNull()
    expect(url.searchParams.getAll('idp_ids[]')).toEqual([])
    expect(url.searchParams.get('locale')).toEqual('fr')
    expect(url.searchParams.get('client_state')).toEqual(transaction.pkce.state)
    expect(url.searchParams.get('client_id')).toEqual('123-xeab')
    expect(url.searchParams.get('redirect_uri')).toEqual('http://localhost:1234')
    expect(url.searchParams.get('code_challenge_method')).toEqual('S256')
    expect(url.searchParams.get('code_challenge')).toEqual(transaction.pkce.code_challenge)
    expect(url.searchParams.get('scope')).toEqual('openid email')
  })

  it('should generate simple gateway url from config and transaction', () => {
    const transaction = TransactionFixure.validWithType(Sign.Sso)
    const url = Transaction.gatewaySignUrl(validConfig, transaction)
    expect(url.href).toMatch('http://localhost:4000/t/shark-academy/?locale=fr')
    expect(url.searchParams.get('idp_id')).toBeNull()
    expect(url.searchParams.getAll('idp_ids[]')).toEqual([])
    expect(url.searchParams.get('locale')).toEqual('fr')
    expect(url.searchParams.get('client_state')).toEqual(transaction.pkce.state)
    expect(url.searchParams.get('client_id')).toEqual('123-xeab')
    expect(url.searchParams.get('redirect_uri')).toEqual('http://localhost:1234')
    expect(url.searchParams.get('code_challenge_method')).toEqual('S256')
    expect(url.searchParams.get('code_challenge')).toEqual(transaction.pkce.code_challenge)
    expect(url.searchParams.get('scope')).toEqual('openid email')
  })

  it('should generate idp gateway url if provided', () => {
    const transaction = TransactionFixure.validWithType(Sign.Sso)
    const url = Transaction.gatewaySignUrl(validConfig, transaction, 'mac_ally_1245')
    expect(url.href).toMatch(
      'http://localhost:4000/t/shark-academy/?idp_id=mac_ally_1245&locale=fr',
    )
    expect(url.searchParams.get('idp_id')).toEqual('mac_ally_1245')
    expect(url.searchParams.getAll('idp_ids[]')).toEqual([])
    expect(url.searchParams.get('locale')).toEqual('fr')
    expect(url.searchParams.get('client_state')).toEqual(transaction.pkce.state)
    expect(url.searchParams.get('client_id')).toEqual('123-xeab')
    expect(url.searchParams.get('redirect_uri')).toEqual('http://localhost:1234')
    expect(url.searchParams.get('code_challenge_method')).toEqual('S256')
    expect(url.searchParams.get('code_challenge')).toEqual(transaction.pkce.code_challenge)
    expect(url.searchParams.get('scope')).toEqual('openid email')
  })

  it('should generate idps gateway url if multiple provided', () => {
    const transaction = TransactionFixure.validWithType(Sign.Sso)
    const url = Transaction.gatewaySignUrl(validConfig, transaction, [
      'mac_ally_1245',
      'oshida_aqsm07',
    ])
    expect(url.href).toMatch(
      'http://localhost:4000/t/shark-academy/?idp_ids%5B%5D=mac_ally_1245&idp_ids%5B%5D=oshida_aqsm07&locale=fr',
    )
    expect(url.searchParams.get('idp_id')).toBeNull()
    expect(url.searchParams.getAll('idp_ids[]')).toEqual(['mac_ally_1245', 'oshida_aqsm07'])
    expect(url.searchParams.get('locale')).toEqual('fr')
    expect(url.searchParams.get('client_state')).toEqual(transaction.pkce.state)
    expect(url.searchParams.get('client_id')).toEqual('123-xeab')
    expect(url.searchParams.get('redirect_uri')).toEqual('http://localhost:1234')
    expect(url.searchParams.get('code_challenge_method')).toEqual('S256')
    expect(url.searchParams.get('code_challenge')).toEqual(transaction.pkce.code_challenge)
    expect(url.searchParams.get('scope')).toEqual('openid email')
  })

  it('should generate proper gateway url if english transaction', () => {
    const transaction = { ...TransactionFixure.validWithType(Sign.Sso), locale: 'en' }
    const url = Transaction.gatewaySignUrl(validConfig, transaction, [
      'mac_ally_1245',
      'oshida_aqsm07',
    ])
    expect(url.href).toMatch(
      'http://localhost:4000/t/shark-academy/?idp_ids%5B%5D=mac_ally_1245&idp_ids%5B%5D=oshida_aqsm07&locale=en',
    )
    expect(url.searchParams.get('idp_id')).toBeNull()
    expect(url.searchParams.getAll('idp_ids[]')).toEqual(['mac_ally_1245', 'oshida_aqsm07'])
    expect(url.searchParams.get('locale')).toEqual('en')
    expect(url.searchParams.get('client_state')).toEqual(transaction.pkce.state)
    expect(url.searchParams.get('client_id')).toEqual('123-xeab')
    expect(url.searchParams.get('redirect_uri')).toEqual('http://localhost:1234')
    expect(url.searchParams.get('code_challenge_method')).toEqual('S256')
    expect(url.searchParams.get('code_challenge')).toEqual(transaction.pkce.code_challenge)
    expect(url.searchParams.get('scope')).toEqual('openid email')
  })

  it('should generate proper gateway url if specific scope transaction', () => {
    const transaction = {
      ...TransactionFixure.validWithType(Sign.Sso),
      scope: 'openid email profile read:billings',
    }
    const url = Transaction.gatewaySignUrl(validConfig, transaction, [
      'mac_ally_1245',
      'oshida_aqsm07',
    ])
    expect(url.href).toMatch(
      'http://localhost:4000/t/shark-academy/?idp_ids%5B%5D=mac_ally_1245&idp_ids%5B%5D=oshida_aqsm07&locale=fr',
    )
    expect(url.searchParams.get('idp_id')).toBeNull()
    expect(url.searchParams.getAll('idp_ids[]')).toEqual(['mac_ally_1245', 'oshida_aqsm07'])
    expect(url.searchParams.get('locale')).toEqual('fr')
    expect(url.searchParams.get('client_state')).toEqual(transaction.pkce.state)
    expect(url.searchParams.get('client_id')).toEqual('123-xeab')
    expect(url.searchParams.get('redirect_uri')).toEqual('http://localhost:1234')
    expect(url.searchParams.get('code_challenge_method')).toEqual('S256')
    expect(url.searchParams.get('code_challenge')).toEqual(transaction.pkce.code_challenge)
    expect(url.searchParams.get('scope')).toEqual('openid email profile read:billings')
  })
})

describe('Transaction.getUniversalTokens/4', () => {
  it('should call Request.postUniversalAuthorizationCode without org domain', async () => {
    const requestPostUniversalAuthCodeFn = jest.spyOn(Request, 'postUniversalAuthorizationCode')
    let config = ConfigFixture.valid()
    let authorization = AuthorizationFixture.valid()
    let transaction = TransactionFixure.valid()
    await Transaction.getUniversalTokens(config, authorization, transaction, 'some-request-id')
    expect(requestPostUniversalAuthCodeFn).toHaveBeenCalledWith(
      config,
      authorization,
      transaction,
      'some-request-id',
      undefined,
    )
    requestPostUniversalAuthCodeFn.mockRestore()
  })
})

describe('Transaction.getUniversalTokens/5', () => {
  it('should call Request.postUniversalAuthorizationCode with org domain if provided', async () => {
    const requestPostUniversalAuthCodeFn = jest.spyOn(Request, 'postUniversalAuthorizationCode')
    let config = ConfigFixture.valid()
    let authorization = AuthorizationFixture.valid()
    let transaction = TransactionFixure.valid()
    await Transaction.getUniversalTokens(
      config,
      authorization,
      transaction,
      'some-request-id',
      'some-domain',
    )
    expect(requestPostUniversalAuthCodeFn).toHaveBeenCalledWith(
      config,
      authorization,
      transaction,
      'some-request-id',
      'some-domain',
    )
    requestPostUniversalAuthCodeFn.mockRestore()
  })
})

describe('Transaction.getTokens/3', () => {
  it('should call Request.postAuthorizationCode without organization_domain', async () => {
    const requestPostAuthorizationCodeFn = jest.spyOn(Request, 'postAuthorizationCode')
    const authorization = AuthorizationFixture.valid()
    const transaction = TransactionFixure.valid()
    await Transaction.getTokens(validConfig, authorization, transaction)
    expect(requestPostAuthorizationCodeFn).toHaveBeenCalledWith(
      validConfig,
      authorization,
      transaction,
      undefined,
    )
    requestPostAuthorizationCodeFn.mockRestore()
  })
})

describe('Transaction.getTokens/4', () => {
  it('should call Request.postAuthorizationCode with organization_domain', async () => {
    const requestPostAuthorizationCodeFn = jest.spyOn(Request, 'postAuthorizationCode')
    const authorization = AuthorizationFixture.valid()
    const transaction = TransactionFixure.valid()
    await Transaction.getTokens(validConfig, authorization, transaction, 'mark_ki_verfge54')
    expect(requestPostAuthorizationCodeFn).toHaveBeenCalledWith(
      validConfig,
      authorization,
      transaction,
      'mark_ki_verfge54',
    )
    requestPostAuthorizationCodeFn.mockRestore()
  })
})

describe('Transaction.getTokensByRefresh/4', () => {
  it('should call Request.refreshTokens without organization_domain if standard refresh', async () => {
    const requestrefreshTokensFn = jest.spyOn(Request, 'refreshTokens')
    await Transaction.getTokensByRefresh(validConfig, 'Ccnl_cwugQMtGWj3aB5lfSIuD0Io4tVTJCTO3XTMrfQ')
    expect(requestrefreshTokensFn).toHaveBeenCalledWith(
      validConfig,
      expect.anything(),
      'Ccnl_cwugQMtGWj3aB5lfSIuD0Io4tVTJCTO3XTMrfQ',
      undefined,
    )
    requestrefreshTokensFn.mockRestore()
  })

  it('should call Request.refreshTokens with organization_domain if domain refresh', async () => {
    const requestrefreshTokensFn = jest.spyOn(Request, 'refreshTokens')
    await Transaction.getTokensByRefresh(
      validConfig,
      'my-domain.Ccnl_cwugQMtGWj3aB5lfSIuD0Io4tVTJCTO3XTMrfQ',
    )
    expect(requestrefreshTokensFn).toHaveBeenCalledWith(
      validConfig,
      expect.anything(),
      'my-domain.Ccnl_cwugQMtGWj3aB5lfSIuD0Io4tVTJCTO3XTMrfQ',
      'my-domain',
    )
    requestrefreshTokensFn.mockRestore()
  })

  it('should returns unvalid response if no refresh', async () => {
    let resp = await Transaction.getTokensByRefresh(validConfig, '')
    expect(resp).toEqual({
      valid: false,
      accessToken: '',
      idToken: '',
      refreshToken: '',
      errors: [],
    })
  })
})

describe('Transaction.createFromState', () => {
  it('should test redirect uri if defined', () => {
    const validRedirectUriFn = jest.spyOn(CryptrConfigValidation, 'validRedirectUri')
    Transaction.createFromState(
      false,
      'some_state',
      Sign.Sso,
      'openid email',
      'fr',
      'http://localhost:3200',
    )
    expect(validRedirectUriFn).toHaveBeenCalledTimes(2)
    validRedirectUriFn.mockRestore()
  })
})

describe('Transaction.parseErrors', () => {
  it('should not returnserror if response', () => {
    expect(parseErrors({ data: { items: [12] } })).toEqual({
      http_response: { data: { items: [12] } },
      items: [12],
    })
  })
})
