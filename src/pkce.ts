import Crypto from './crypto'

import { v4 as uuid } from 'uuid'

import { ProofKeyChallengeExchange } from './interfaces'
import { SHA256 } from './constants'

const Pkce = {
  gen: (state = uuid()): ProofKeyChallengeExchange => {
    const codeVerifier = Crypto.randomB64UrlEncoded()

    return {
      code_verifier: codeVerifier,
      code_challenge: Crypto.sha256Base64UrlEncoded(codeVerifier),
      code_challenge_method: SHA256,
      state: state,
    }
  },
}

export default Pkce
