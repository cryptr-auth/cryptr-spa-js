import InMemory from './memory'
import TokenFixture from './__fixtures__/token.fixture'

describe('InMemory', () => {
  const memory = new InMemory()

  it('should be empty at first', () => {
    expect(memory.cache).toEqual({})
    expect(memory.get('azerty')).toBeUndefined()
    expect(memory.getAccessToken()).toBeUndefined()
    expect(memory.getIdToken()).toBeUndefined()
  })

  it('should be able to retrieve stored value', () => {
    expect(memory.cache).toEqual({})
    expect(memory.get('azerty')).toBeUndefined()
    expect(memory.set('azerty', 'value')).toBeUndefined()
    expect(memory.get('azerty')).toEqual('value')
  })
})

describe('InMemory.clearTokens', () => {
  const memory = new InMemory()

  it('should empty cache', () => {
    expect(memory.cache).toEqual({})
    expect(memory.getAccessToken()).toBeUndefined()
    expect(memory.getIdToken()).toBeUndefined()
    const accessToken = TokenFixture.accessToken.valid()
    const idToken = TokenFixture.idToken.valid()
    expect(memory.setAccessToken(accessToken)).toBeUndefined()
    expect(memory.setIdToken(idToken)).toBeUndefined()
    expect(memory.getAccessToken()).toEqual(accessToken)
    expect(memory.getIdToken()).toEqual(idToken)
    memory.clearTokens()
    expect(memory.getAccessToken()).toEqual('')
    expect(memory.getIdToken()).toEqual('')
  })
})
