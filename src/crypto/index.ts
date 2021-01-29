// @ts-ignore
import { sha256 } from './sha256'
// @ts-ignore
import secureRandom from 'secure-random'

const Crypto = {
  random: (): string => btoa(secureRandom(32)).substring(0, 128),
  sha256: (message: string): string => sha256(message, 'base64') || '',
}

export default Crypto
