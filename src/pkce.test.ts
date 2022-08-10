import Pkce from './pkce'
import Crypto from './crypto/index'

describe('Pkce', () => {
  it('gen() returns a challenge with its code verifier', async () => {
    expect(Pkce.gen()).toMatchObject({
      code_verifier: expect.any(String),
      code_challenge: expect.any(String),
      code_challenge_method: 'S256',
      state: expect.any(String),
    })
  })

  it('gen() returns Base64 URLcoded challenge and code verifier', async () => {
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

  it('gen(uuid) returns a Pkce with specified uuid state', async () => {
    const state = 'dc9fc366-3b36-4465-b547-e43b45d34076'
    expect(Pkce.gen(state)).toMatchObject({
      code_verifier: expect.any(String),
      code_challenge: expect.any(String),
      code_challenge_method: 'S256',
      state: 'dc9fc366-3b36-4465-b547-e43b45d34076',
    })
  })
})
