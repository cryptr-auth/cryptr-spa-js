// import axios from 'axios'
// import { rest } from 'msw'
// import { setupServer } from 'msw/node'

import Transaction, { parseErrors } from './transaction'
import { Sign } from './types'
import TransactionFixure from './__fixtures__/transaction.fixture'
// import { tokenUrl } from './request'
// import AuthorizationFixture from './__fixtures__/authorization.fixture'
// import RequestFixture from './__fixtures__/request.fixture'
import ConfigFixture from './__fixtures__/config.fixture'
import { Config } from './interfaces'
jest.mock('es-cookie')

// const VALID_CONFIG = ConfigFixture.valid()
// const VALID_AUTHORIZATION = AuthorizationFixture.valid()
// const VALID_TRANSACTION = TransactionFixure.valid()

describe('Transaction', () => {
  // const API_ENDPOINT = tokenUrl(VALID_CONFIG, VALID_AUTHORIZATION, VALID_TRANSACTION)

  // const handlers = [
  //   rest.post(API_ENDPOINT, (_req: any, res: any, ctx: any) => {
  //     return res(ctx.status(200), ctx.json(RequestFixture.authorizationCodeResponse.valid()))
  //   }),
  // ]

  // const server = setupServer(...handlers)

  // beforeAll(() => server.listen())
  // afterAll(() => server.close())

  it('key(state) returns key', () => {
    expect(Transaction.key(TransactionFixure.valid().pkce.state)).toMatchSnapshot()
  })

  it('new(state) returns a transaction', () => {
    expect(Transaction.new(Sign.In, 'openid email')).toMatchObject({
      ...TransactionFixure.valid(),
      pkce: {
        code_challenge: expect.any(String),
        code_verifier: expect.any(String),
        state: expect.any(String),
      },
      nonce: expect.any(String),
    })
  })

  it('creates proper transaction using create function', () => {
    expect(Transaction.create(Sign.In, 'openid email')).toMatchObject({
      ...TransactionFixure.valid(),
      pkce: {
        code_challenge: expect.any(String),
        code_verifier: expect.any(String),
        state: expect.any(String),
      },
      nonce: expect.any(String),
    })
  })

  it('throw error if wrong locale using create function', () => {
    expect(() => Transaction.create(Sign.In, 'openid email', 'de')).toThrowError(
      "'de' locale not valid, possible values en,fr",
    )
  })

  it('creates proper transaction with fr locale using create function', () => {
    expect(Transaction.create(Sign.In, 'openid email', 'fr')).toMatchObject({
      ...TransactionFixure.valid(),
      pkce: {
        code_challenge: expect.any(String),
        code_verifier: expect.any(String),
        state: expect.any(String),
      },
      nonce: expect.any(String),
      locale: 'fr',
    })
  })

  it('creates proper transaction with en locale using create function', () => {
    expect(Transaction.create(Sign.In, 'openid email', 'en')).toMatchObject({
      ...TransactionFixure.valid(),
      pkce: {
        code_challenge: expect.any(String),
        code_verifier: expect.any(String),
        state: expect.any(String),
      },
      nonce: expect.any(String),
      locale: 'en',
    })
  })

  it('creates proper SSO transaction', () => {
    expect(Transaction.create(Sign.Sso, 'openid email', 'en')).toMatchObject({
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

  it('creates proper transaction using createFromState function', () => {
    var state = '123-xeab'
    const transaction = Transaction.createFromState(state, Sign.In, 'openid email')
    expect(transaction).toMatchObject({
      ...TransactionFixure.valid(),
      pkce: {
        code_challenge: expect.any(String),
        code_verifier: expect.any(String),
        state: state,
      },
      nonce: expect.any(String),
    })
  })

  it('creates proper SSO transaction using createFromState function', () => {
    var state = '123-xeab'
    const transaction = Transaction.createFromState(state, Sign.Sso, 'openid email')
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

  xit('creates proper storage cookie using createFromState function', () => {
    var state = '123-xeab'
    Transaction.createFromState(state, Sign.In, 'openid email')
    expect(Transaction.get(state)).toMatchObject({})
  })

  it('creates proper transaction with locale using createFromState function', () => {
    var state = '123-xeab'
    const transaction = Transaction.createFromState(state, Sign.In, 'openid email', 'fr')
    expect(transaction).toMatchObject({
      ...TransactionFixure.valid(),
      pkce: {
        code_challenge: expect.any(String),
        code_verifier: expect.any(String),
        state: state,
      },
      nonce: expect.any(String),
      locale: 'fr',
    })
  })

  it('throw error if wrong locale using createFromState function', () => {
    var state = '123-xeab'
    expect(() => Transaction.createFromState(state, Sign.In, 'openid email', 'be')).toThrowError(
      "'be' locale not valid, possible values en,fr",
    )

    expect(Transaction.get(state)).toMatchObject({})
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
    // expect(newUrl.href).toMatch('https://cryptr-test.onrender.com/t/shark-academy/en/')
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
