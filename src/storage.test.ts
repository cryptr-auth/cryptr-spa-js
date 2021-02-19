import Storage from './storage'
import { tomorrowDate } from './transaction'
jest.mock('es-cookie')

describe('Storage.createCookie(clientId, value)', () => {
  const CLIENT_ID = 'adefe2f4-fe71-4187-809f-c39f20d8f792'
  const EXPIRATION = tomorrowDate()
  const TOKENS = {
    id: '5c20cccd-55d0-4c11-8c4a-bf4c38fa8588',
    client_id: CLIENT_ID,
    audience: 'http://localhost/',
    scope: 'limited',
    authenticated: true,
    accessToken:
      'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.POstGetfAytaZS82wHcjoTyoqhMyxXiWdR7Nn7A29DNSl0EiXLdwJ6xC6AfgZWF1bOsS_TuYI3OG85AmiExREkrS6tDfTQ2B3WXlrr-wp5AokiRbz3_oB4OxG-W9KcEEbDRcZc0nH3L7LzYptiy1PtAylQGxHTWZXtGz4ht0bAecBgmpdgXMguEIcoqPJ1n3pIWk_dUZegpqx0Lka21H6XxUTxiy8OcaarA8zdnPUnV6AmNP3ecFawIFYdvJB_cm-GvpCSbr8G8y_Mllj8f4x9nBH8pQux89_6gUY618iYv7tuPWBFfEbLxtF2pZS6YC1aSfLQxeNe8djT9YjpvRZA',
    refreshToken: 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  }

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns the stored object when it creates new cookie', () => {
    expect(Storage.createCookie(CLIENT_ID, TOKENS, EXPIRATION)).toMatchSnapshot()
  })

  it('create a cookie based on the ket & value', () => {
    Storage.createCookie(CLIENT_ID, TOKENS, EXPIRATION)

    expect(require('es-cookie').set).toHaveBeenCalledWith(
      `$cryptr-spa-js$.store.${CLIENT_ID}`,
      JSON.stringify(TOKENS),
      {
        expires: EXPIRATION,
      },
    )
  })
  it('gets an empty object if the client id doesnt exist', () => {
    expect(Storage.getCookie('client-id-doesnt-exist')).toMatchObject({})
  })
})
