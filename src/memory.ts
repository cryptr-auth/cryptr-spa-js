class InMemory {
  cache: { [key: string]: { value: any; setAt: Date } } = {}
  accessTokenKey = 'accessToken'
  idTokenKey = 'idToken'

  set(key: string, value: any) {
    if (this.cache.hasOwnProperty(key)) {
      this.cache[key].value = value
      this.cache[key].setAt = new Date()
    } else {
      this.cache[key] = {
        value: value,
        setAt: new Date(),
      }
    }
  }

  get(key: string): string | undefined {
    if (this.cache[key] !== undefined) {
      return this.cache[key].value
    } else {
      return undefined
    }
  }

  setAccessToken(accessToken: string) {
    this.set(this.accessTokenKey, accessToken)
  }

  getAccessToken(): string | undefined {
    return this.get(this.accessTokenKey)
  }

  setIdToken(idToken: string) {
    this.set(this.idTokenKey, idToken)
  }

  getIdToken(): string | undefined {
    return this.get(this.idTokenKey)
  }

  clearTokens() {
    this.setAccessToken('')
    this.setIdToken('')
  }
}

export default InMemory
