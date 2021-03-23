// @ts-ignore
import { sha256 } from './sha256'
// @ts-ignore
import secureRandom from 'secure-random'

const Crypto = {
  random: (): string => {
    try {
      const random = secureRandom(32)
      console.debug(random)
      alert(random)
      return btoa(random).substring(0, 128)
    } catch (error) {
      Sentry.captureException(error)
      return ''
    }
  },
  sha256: (message: string): string => sha256(message, 'base64') || '',
}

export default Crypto
