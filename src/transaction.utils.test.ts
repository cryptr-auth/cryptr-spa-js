import Crypto from "./crypto"
import Jwt from "./jwt"
import { getRefreshParameters, handlePostAuthorizationCode, handlePostUniversalAuthorizationCode, newTransaction, parseTokensAndStoreRefresh, transactionKey, validateAndFormatAuthResp, validatesNonce } from "./transaction.utils"
import { Sign } from "./types"
import ConfigFixure from "./__fixtures__/config.fixture"
import TokenFixture from "./__fixtures__/token.fixture"
import TransactionFixure from "./__fixtures__/transaction.fixture"
import Storage from './storage'
import * as I from './interfaces'

describe('newTrasaction', () => {
  it('returns a transaction with Pkce', () => {
    const cryptoRndB64Fn = jest.spyOn(Crypto, 'randomB64UrlEncoded')
    const cryptoShaRndB64Fn = jest.spyOn(Crypto, 'sha256Base64UrlEncoded')
    const newTransac = newTransaction(Sign.Sso, "openid email profile", "http://localhost:8000", "fr")
    expect(newTransac.sign_type).toEqual(Sign.Sso)
    expect(newTransac.scope).toEqual('openid email profile')
    expect(newTransac.locale).toEqual('fr')
    expect(newTransac.redirect_uri).toEqual('http://localhost:8000')
    expect(newTransac.pkce).not.toBeNull()
    expect(newTransac.nonce).not.toBeNull()
    expect(cryptoRndB64Fn).toHaveBeenCalled()
    expect(cryptoShaRndB64Fn).toHaveBeenCalled()
    cryptoRndB64Fn.mockRestore()
    cryptoShaRndB64Fn.mockRestore()
  })

  // fixed_pkce is now default to true
  xit('returns a transaction with old pkce if fixed pkce false', () => {
    const cryptoRndFn = jest.spyOn(Crypto, 'random')
    const cryptoSha256Fn = jest.spyOn(Crypto, 'sha256')
    const cryptoRndB64Fn = jest.spyOn(Crypto, 'randomB64UrlEncoded')
    const cryptoShaRndB64Fn = jest.spyOn(Crypto, 'sha256Base64UrlEncoded')
    const newTransac = newTransaction(Sign.Sso, "openid email profile", "http://localhost:8000", "fr")
    expect(newTransac.sign_type).toEqual(Sign.Sso)
    expect(newTransac.scope).toEqual('openid email profile')
    expect(newTransac.locale).toEqual('fr')
    expect(newTransac.redirect_uri).toEqual('http://localhost:8000')
    expect(newTransac.pkce).not.toBeNull()
    expect(newTransac.nonce).not.toBeNull()
    expect(cryptoRndB64Fn).not.toHaveBeenCalled()
    expect(cryptoShaRndB64Fn).not.toHaveBeenCalled()
    expect(cryptoRndFn).toHaveBeenCalled()
    expect(cryptoSha256Fn).toHaveBeenCalled()
    cryptoRndFn.mockRestore()
    cryptoSha256Fn.mockRestore()
    cryptoShaRndB64Fn.mockRestore()
    cryptoShaRndB64Fn.mockRestore()
  })
})

describe('validateAndFormatAuthResp', () => {
  it('should returns valid without errors resp', () => {
    const config = ConfigFixure.valid()
    const accessToken = TokenFixture.accessToken.valid()
    const idToken = TokenFixture.idToken.valid()
    const refreshToken = TokenFixture.refreshToken.valid()
    const resp = validateAndFormatAuthResp(config, accessToken, idToken, refreshToken)
    expect(resp.valid).toEqual(true)
    expect(resp.errors).toEqual([])
    expect(resp.accessToken).toEqual(accessToken)
    expect(resp.idToken).toEqual(idToken)
    expect(resp.refreshToken).toEqual(refreshToken)
  })

  it('should returns unvalid with errors resp if no idToken', () => {
    const config = ConfigFixure.valid()
    const accessToken = TokenFixture.accessToken.valid()
    const refreshToken = TokenFixture.refreshToken.valid()
    const resp = validateAndFormatAuthResp(config, accessToken, undefined, refreshToken)

    expect(resp.valid).toEqual(false)
    expect(resp.errors).toEqual([
      { error: 'idToken', error_description: 'Can’t process request', http_response: null },
      { error: 'idToken', error_description: 'Not retrieve', http_response: null },
    ])
    expect(resp.accessToken).toEqual(accessToken)
    expect(resp.idToken).toEqual('')
    expect(resp.refreshToken).toEqual(refreshToken)
  })

  it('should returns unvalid with errors resp if no accessToken', () => {
    const config = ConfigFixure.valid()
    const idToken = TokenFixture.idToken.valid()
    const refreshToken = TokenFixture.refreshToken.valid()
    const resp = validateAndFormatAuthResp(config, undefined, idToken, refreshToken)

    expect(resp.valid).toEqual(false)
    expect(resp.errors).toEqual([
      { error: 'accessToken', error_description: 'Not retrieve', http_response: null }
    ])
    expect(resp.accessToken).toEqual("")
    expect(resp.idToken).toEqual(idToken)
    expect(resp.refreshToken).toEqual(refreshToken)
  })

  it('should returns empty refresh resp if no refreshToken', () => {
    const config = ConfigFixure.valid()
    const accessToken = TokenFixture.accessToken.valid()
    const idToken = TokenFixture.idToken.valid()
    const resp = validateAndFormatAuthResp(config, accessToken, idToken, undefined)

    expect(resp.valid).toEqual(true)
    expect(resp.errors).toEqual([])
    expect(resp.accessToken).toEqual(accessToken)
    expect(resp.idToken).toEqual(idToken)
    expect(resp.refreshToken).toEqual('')
  })

  it('should returns multiple errors resp if no access/id tokens', () => {
    const config = ConfigFixure.valid()
    const refreshToken = TokenFixture.refreshToken.valid()
    const resp = validateAndFormatAuthResp(config, undefined, undefined, refreshToken)

    expect(resp.valid).toEqual(false)
    expect(resp.errors).toEqual([
      { error: 'accessToken', error_description: 'Not retrieve', http_response: null },
      { error: 'idToken', error_description: 'Can’t process request', http_response: null },
      { error: 'idToken', error_description: 'Not retrieve', http_response: null },

    ])
    expect(resp.accessToken).toEqual("")
    expect(resp.idToken).toEqual("")
    expect(resp.refreshToken).toEqual(refreshToken)
  })

  it('should returns invalid id token errors resp if no wrong id token', () => {
    const config = ConfigFixure.valid()
    const accessToken = TokenFixture.accessToken.valid()
    const idToken = TokenFixture.accessToken.invalid()
    const refreshToken = TokenFixture.refreshToken.valid()
    const resp = validateAndFormatAuthResp(config, accessToken, idToken, refreshToken)

    expect(resp.valid).toEqual(false)
    expect(resp.errors).toEqual([
      { error: 'idToken', error_description: 'Can’t process request', http_response: null },

    ])
    expect(resp.accessToken).toEqual(accessToken)
    expect(resp.idToken).toEqual(idToken)
    expect(resp.refreshToken).toEqual(refreshToken)
  })
})

describe('getRefreshParameters', () => {
  it('should return empty object if wrong resp input', () => {
    expect(getRefreshParameters({})).toEqual({})
  })

  it('should return object if right resp input', () => {
    const tokenBody = Jwt.body(TokenFixture.accessToken.valid()) as any
    const refreshToken = TokenFixture.refreshToken.valid()
    const resp = {
      access_token_expiration_date: tokenBody.exp,
      refresh_expiration_date: tokenBody.exp,
      refresh_token: refreshToken,
      refresh_leeway: 60,
      refresh_retry: 60,
    }
    const refreshParameters = getRefreshParameters(resp)
    expect(refreshParameters).toEqual({
      access_token_expiration_date: tokenBody.exp,
      refresh_expiration_date: tokenBody.exp,
      refresh_leeway: 60,
      refresh_retry: 60,
      refresh_token: refreshToken
    })
  })

  it('should return object if string resp input', () => {
    const refreshToken = TokenFixture.refreshToken.valid()
    const resp = {
      access_token_expiration_date: '01 Jan 2035 00:00:00 GMT',
      refresh_expiration_date: '01 Jan 2035 00:00:00 GMT',
      refresh_token: refreshToken,
      refresh_leeway: 60,
      refresh_retry: 60,
    }
    const refreshParameters = getRefreshParameters(resp)
    expect(refreshParameters).toEqual({
      access_token_expiration_date: 2051222400000,
      refresh_expiration_date: 2051222400000,
      refresh_leeway: 60,
      refresh_retry: 60,
      refresh_token: refreshToken
    })
  })
})


describe('parseTokensAndStoreRefresh', () => {
  it('should succeed if all params but empty opts', () => {
    const config = ConfigFixure.valid()
    const accessToken = TokenFixture.accessToken.valid()
    const idToken = TokenFixture.idToken.valid()
    const refreshToken = TokenFixture.refreshToken.valid()
    const transaction = TransactionFixure.valid()
    const response = { 'data': { 'access_token': accessToken, 'id_token': idToken, 'refresh_token': refreshToken } }

    const parsedTokens = parseTokensAndStoreRefresh(config, response, transaction, {})
    expect(parsedTokens).toEqual({
      accessToken: accessToken,
      errors: [],
      idToken: idToken,
      refreshToken: refreshToken,
      valid: true
    })
  })


  it('should succeed and call delete cookie if withPKCE opt', () => {
    const storageDeleteCookieFn = jest.spyOn(Storage, 'deleteCookie')
    const config = ConfigFixure.valid()
    const accessToken = TokenFixture.accessToken.valid()
    const idToken = TokenFixture.idToken.valid()
    const refreshToken = TokenFixture.refreshToken.valid()
    const transaction = TransactionFixure.valid()
    const response = { 'data': { 'access_token': accessToken, 'id_token': idToken, 'refresh_token': refreshToken } }
    const opts = { withPKCE: true }
    const parsedTokens = parseTokensAndStoreRefresh(config, response, transaction, opts)
    expect(parsedTokens).toEqual({
      accessToken: accessToken,
      errors: [],
      idToken: idToken,
      refreshToken: refreshToken,
      valid: true
    })
    expect(storageDeleteCookieFn).toHaveBeenCalledWith(transactionKey(transaction.pkce.state))
    storageDeleteCookieFn.mockRestore()
  })

  it('should fail if wrong access token', () => {
    const config = ConfigFixure.valid()
    const response = { 'data': { 'access_token': '' } }
    const parsedTokens = parseTokensAndStoreRefresh(config, response, null, {})
    expect(parsedTokens).toEqual({
      accessToken: '',
      errors: [
        { error: 'accessToken', error_description: 'Not retrieve', http_response: null },
        { error: 'idToken', error_description: 'Can’t process request', http_response: null },
        { error: 'idToken', error_description: 'Not retrieve', http_response: null },
      ],
      idToken: '',
      refreshToken: '',
      valid: false
    })
  })
})

describe('validatesNonce/2', () => {
  it('should returns true if same nonce', () => {
    const transaction = TransactionFixure.valid()
    expect(validatesNonce(transaction, transaction.nonce!)).toBeTruthy()
  })

  it('should throw error if wrong nonce', () => {
    const transaction = TransactionFixure.valid()
    expect(() => validatesNonce(transaction, 'nonce')).toThrow('Nonce values have to be the sames')
  })
})

describe('handlePostUniversalAuthorizationCode', () => {
  it('should return falsy access result if no response', () => {
    const errors: I.TokenError[] = []
    const accessResult: I.TokenResult = {
      valid: false,
      accessToken: '',
      idToken: '',
      refreshToken: '',
      errors: errors,
    }
    const handledUniPostCode = handlePostUniversalAuthorizationCode(
      {},
      errors,
      accessResult,
      TransactionFixure.valid(),
      ConfigFixure.valid()
    )
    expect(handledUniPostCode).toEqual({
      accessToken: "",
      idToken: "",
      refreshToken: "",
      errors: [],
      valid: false
    })
  })

  it('should return right access result if right response', () => {
    const errors: I.TokenError[] = []
    const accessResult: I.TokenResult = {
      valid: false,
      accessToken: '',
      idToken: '',
      refreshToken: '',
      errors: errors,
    }
    const transaction = TransactionFixure.valid()
    const accessToken = TokenFixture.accessToken.valid()
    const refreshToken = TokenFixture.refreshToken.valid()
    const idToken = TokenFixture.idToken.valid()
    const response = {
      'data': {
        'nonce': transaction.nonce,
        'access_token': accessToken,
        'id_token': idToken,
        'refresh_token': refreshToken
      }
    }
    const handledUniPostCode = handlePostUniversalAuthorizationCode(
      response,
      errors,
      accessResult,
      TransactionFixure.valid(),
      ConfigFixure.valid()
    )
    expect(handledUniPostCode).toEqual({
      accessToken: accessToken,
      idToken: idToken,
      refreshToken: refreshToken,
      errors: [],
      valid: true
    })
  })
})

describe('handlePostAuthorizationCode', () => {
  it('should return falsy access result if no response', () => {
    const errors: I.TokenError[] = []
    const accessResult: I.TokenResult = {
      valid: false,
      accessToken: '',
      idToken: '',
      refreshToken: '',
      errors: errors,
    }
    const handledPostCode = handlePostAuthorizationCode(
      {},
      errors,
      accessResult,
      TransactionFixure.valid(),
      ConfigFixure.valid()
    )
    expect(handledPostCode).toEqual({
      accessToken: "",
      idToken: "",
      refreshToken: "",
      errors: [],
      valid: false
    })
  })

  it('should return right access result if right response', () => {
    const errors: I.TokenError[] = []
    const accessResult: I.TokenResult = {
      valid: false,
      accessToken: '',
      idToken: '',
      refreshToken: '',
      errors: errors,
    }
    const transaction = TransactionFixure.valid()
    const accessToken = TokenFixture.accessToken.valid()
    const refreshToken = TokenFixture.refreshToken.valid()
    const idToken = TokenFixture.idToken.valid()
    const response = {
      'data': {
        'nonce': transaction.nonce,
        'access_token': accessToken,
        'id_token': idToken,
        'refresh_token': refreshToken
      }
    }
    const handledPostCode = handlePostAuthorizationCode(
      response,
      errors,
      accessResult,
      TransactionFixure.valid(),
      ConfigFixure.valid()
    )
    expect(handledPostCode).toEqual({
      accessToken: accessToken,
      idToken: idToken,
      refreshToken: refreshToken,
      errors: [],
      valid: true
    })
  })
})
