import Crypto from './index'

describe('Crypto', () => {
  it('random() returns a safety random of 128 length chars', () => {
    expect(Crypto.random().length).toEqual(128)
  })
  it('sha256(message) returns a challenge SHA256 base64', () => {
    expect(Crypto.sha256('test')).toEqual('n4bQgYhMfWWaL+qgxVrQFaO/TxsrC4Is0V1sFbDwCgg=')
  })
})
