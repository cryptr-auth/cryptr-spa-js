import Crypto from './index'

describe('Crypto', () => {
  it('random() returns a safety random of 128 length chars', () => {
    expect(Crypto.random().length).toEqual(128)
  })
  it('sha256(message) returns a challenge SHA256 base64', () => {
    expect(Crypto.sha256('test')).toEqual('n4bQgYhMfWWaL+qgxVrQFaO/TxsrC4Is0V1sFbDwCgg=')
  })

  it('randomB64UrlEncoded() returns a safety random of 128 length chars', () => {
    expect(Crypto.randomB64UrlEncoded().length).toEqual(128)
  })

  it('sha256Base64UrlEncode(message) returns a SHA256 Base6$ URL encoded', () => {
    expect(Crypto.sha256Base64UrlEncoded('test')).toEqual('n4bQgYhMfWWaL-qgxVrQFaO_TxsrC4Is0V1sFbDwCgg')
  })
})
