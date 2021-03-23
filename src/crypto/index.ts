// @ts-ignore
import { sha256 } from './sha256'
// @ts-ignore
import secureRandom from 'secure-random'
import * as Sentry from '@sentry/browser'

let getRandomBytes = (
  (typeof window !== 'undefined' && window.crypto)
    ? function () { // Browsers
      var crypto = (window.crypto), QUOTA = 65536;
      return function (n: number) {
        var a = new Uint8Array(n);
        for (var i = 0; i < n; i += QUOTA) {
          crypto.getRandomValues(a.subarray(i, i + Math.min(n - i, QUOTA)));
        }
        return a;
      };
    }
    : function () { // Node
      return require("crypto").randomBytes;
    }
)();

const Crypto = {
  random: (): string => {
    try {
      const random = secureRandom(32)
      return btoa(random).substring(0, 128)
    } catch (error) {
      Sentry.captureException(error)
      const random = getRandomBytes(32);
      return btoa(random).substring(0, 128)
    }
  },
  sha256: (message: string): string => sha256(message, 'base64') || '',
}

export default Crypto
