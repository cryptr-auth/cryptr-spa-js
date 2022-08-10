// @ts-ignore
import { sha256 } from './sha256'
import CryptoJS from 'crypto-js'
// @ts-ignore
import secureRandom from 'secure-random'
import * as Sentry from '@sentry/browser'

const RANDOM_LENGTH = 43

const base64UrlEncode = (str: string) => {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

const Crypto = {
  random: (): string => {
    try {
      const randomBytes = window.crypto.getRandomValues(new Uint8Array(RANDOM_LENGTH))
      // Make compliant the random for code_verifier of PKCE
      // abnf_unreserved = ALPHA / DIGIT / "-" / "." / "_" / "~"
      const ABNF = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
      let cryptoRandom = ''
      randomBytes.forEach((v) => (cryptoRandom += ABNF[v % ABNF.length]))
      return cryptoRandom
    } catch (error) {
      Sentry.captureException(error)
      const random = secureRandom(RANDOM_LENGTH)
      return random.toString('base64').substring(0, 128)
    }
  },
  randomB64UrlEncoded: () => base64UrlEncode(Crypto.random()),
  sha256: (message: string): string => sha256(message, 'base64') || '',
  sha256Base64UrlEncoded: (message: string): string =>
    base64UrlEncode(CryptoJS.SHA256(message).toString(CryptoJS.enc.Base64)),
}

export default Crypto
