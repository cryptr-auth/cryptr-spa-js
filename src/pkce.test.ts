import Pkce from './pkce'
import Crypto from './crypto/index'

describe('Pkce', () => {
  // new_pkce is now by default true
  xit('gen(false) returns a challenge with its code verifier', async () => {
    expect(Pkce.gen()).toMatchObject({
      code_verifier: expect.any(String),
      code_challenge: expect.any(String),
      code_challenge_method: 'S256',
      state: expect.any(String),
    })
  })

  it('gen(true) returns Base64 URL encoded challenge and code verifier', async () => {
    let pkce = Pkce.gen()
    expect(pkce).toMatchObject({
      code_verifier: expect.any(String),
      code_challenge: expect.any(String),
      code_challenge_method: 'S256',
      state: expect.any(String),
    })
    expect(pkce.code_verifier.length).toEqual(128)
    expect(pkce.code_challenge).toEqual(Crypto.sha256Base64UrlEncoded(pkce.code_verifier))
  })

  // new_pkce is now by default true
  xit('gen(false) returns Base64 challenge and code verifier', async () => {
    let pkce = Pkce.gen()
    expect(pkce).toMatchObject({
      code_verifier: expect.any(String),
      code_challenge: expect.any(String),
      code_challenge_method: 'S256',
      state: expect.any(String),
    })
    expect(pkce.code_verifier.length).toEqual(128)
    expect(pkce.code_challenge).toEqual(Crypto.sha256(pkce.code_verifier))
  })

  // new_pkce is now by default true
  xit('gen(false, uuid) returns a Pkce with specified uuid state', async () => {
    const state = 'dc9fc366-3b36-4465-b547-e43b45d34076'
    let pkceState = Pkce.gen(state)
    expect(pkceState).toMatchObject({
      code_verifier: expect.any(String),
      code_challenge: expect.any(String),
      code_challenge_method: 'S256',
      state: 'dc9fc366-3b36-4465-b547-e43b45d34076',
    })
    expect(pkceState.code_verifier.length).toEqual(128)
    expect(pkceState.code_challenge).toEqual(Crypto.sha256(pkceState.code_verifier))
  })

  it('gen(true uuid) returns a Pkce with specified uuid state and B64 Url encoded values', async () => {
    const state = 'dc9fc366-3b36-4465-b547-e43b45d34076'
    let pkceState = Pkce.gen(state)
    expect(pkceState).toMatchObject({
      code_verifier: expect.any(String),
      code_challenge: expect.any(String),
      code_challenge_method: 'S256',
      state: 'dc9fc366-3b36-4465-b547-e43b45d34076',
    })
    expect(pkceState.code_verifier.length).toEqual(128)
    expect(pkceState.code_challenge).toEqual(Crypto.sha256Base64UrlEncoded(pkceState.code_verifier))
  })
})
