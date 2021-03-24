// @ts-ignore
import { sha256 } from './sha256'
// @ts-ignore
import secureRandom from 'secure-random'
import * as Sentry from '@sentry/browser'

const RANDOM_LENGTH = 43

const Crypto = {
  random: (): string => {
    try {
      const random = secureRandom(RANDOM_LENGTH)
      return btoa(random).substring(0, 128)
    } catch (error) {
      Sentry.captureException(error)
      const randomBytes = window.crypto.getRandomValues(new Uint8Array(RANDOM_LENGTH));
      // Make compliant the random for code_verifier of PKCE
      // abnf_unreserved = ALPHA / DIGIT / "-" / "." / "_" / "~"
      const ABNF = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
      let cryptoRandom = '';
      randomBytes.forEach(v => (cryptoRandom += ABNF[v % ABNF.length]));
      return cryptoRandom
    }
  },
  sha256: (message: string): string => sha256(message, 'base64') || '',
}

export default Crypto
