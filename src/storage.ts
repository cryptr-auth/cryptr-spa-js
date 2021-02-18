import * as Cookies from 'es-cookie'
import { STORAGE_KEY_PREFIX } from './constants'

export interface Entry {
  key: string
  body: string
}

const storageKey = (client_id: string): string => `${STORAGE_KEY_PREFIX}.store.${client_id}`

const Storage = {
  createCookie: (clientId: string, value: any, expires: Date): Entry => {
    console.log(`creates cookie with date ${expires}`)
    if (expires < new Date()) {
      console.error(`cookie expires value: ${expires}`)
      throw new Error('cannot create cookie in past')
    }
    const entry: Entry = {
      key: storageKey(clientId),
      body: JSON.stringify(value),
    }

    let cookieAttributes: Cookies.CookieAttributes = {
      expires: expires,
    }
    // Handle dev/test VS production
    if (
      window !== undefined &&
      window.location !== undefined &&
      'https:' === window.location.protocol
    ) {
      cookieAttributes = {
        secure: true,
        sameSite: 'none',
      }
    }

    if (typeof document !== 'undefined') {
      Cookies.set(entry.key, entry.body, cookieAttributes)
    }

    return entry
  },
  getCookie: (key: string): Object => {
    let value
    if (typeof document !== 'undefined') {
      value = Cookies.get(storageKey(key))
    }
    return typeof value === 'undefined' ? {} : JSON.parse(value)
  },
  deleteCookie: (key: string): boolean => {
    if (typeof document !== 'undefined') {
      Cookies.remove(storageKey(key))
    }
    return true
  },
  clearCookies: (key: string): boolean => {
    let strKey = storageKey(key)
    if (typeof document !== 'undefined') {
      let cookies = Cookies.getAll()
      Object.keys(cookies).forEach((cookieKey) => {
        if (cookieKey.startsWith(storageKey(`${STORAGE_KEY_PREFIX}.transaction`))) {
          Cookies.remove(cookieKey)
        }
        if (cookieKey.startsWith(storageKey(`${STORAGE_KEY_PREFIX}.refresh`))) {
          Cookies.remove(cookieKey)
        }
      })
      Cookies.remove(strKey)
    }
    return true
  },
}

export default Storage
