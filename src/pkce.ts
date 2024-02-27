import Crypto from './crypto'

import { v4 as uuid } from 'uuid'

import { ProofKeyChallengeExchange } from './interfaces'
import { SHA256 } from './constants'

const Pkce = {
  gen: (state = uuid()): ProofKeyChallengeExchange => {
    const codeVerifier = Pkce.genCodeVerifier()
    const codeChallenge = Pkce.genCodeChallenge(codeVerifier)

    return {
      code_verifier: codeVerifier,
      code_challenge: codeChallenge,
      code_challenge_method: SHA256,
      state: state,
    }
  },
  genCodeVerifier: (): string => {
    return Crypto.randomB64UrlEncoded()
  },
  genCodeChallenge: (codeVerifier: string): string => {
    return Crypto.sha256Base64UrlEncoded(codeVerifier)
  },
}

export default Pkce
