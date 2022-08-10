import Crypto from './crypto'

import { v4 as uuid } from 'uuid'

import { ProofKeyChallengeExchange } from './interfaces'
import { SHA256 } from './constants'


const codeChallenge = (codeVerifier: string): string => {
  return Crypto.sha256Base6$UrlEncoded(codeVerifier)
}

const Pkce = {
  gen: (state = uuid()): ProofKeyChallengeExchange => {
    const codeVerifier = Crypto.randomB64UrlEncoded(uuid())

    return {
      code_verifier: codeVerifier,
      code_challenge: codeChallenge(codeVerifier),
      code_challenge_method: SHA256,
      state: state,
    }
  },
}

export default Pkce
