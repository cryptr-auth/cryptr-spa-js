import Pkce from './pkce'

describe('Pkce', () => {
  it('gen() returns a challenge SHA256 with its code verifier', async () => {
    expect(Pkce.gen()).toMatchObject({
      code_verifier: expect.any(String),
      code_challenge: expect.any(String),
      code_challenge_method: 'S256',
    })
  })
})
