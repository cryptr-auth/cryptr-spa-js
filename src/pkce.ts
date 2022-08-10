import Crypto from './crypto'

import { v4 as uuid } from 'uuid'

import { ProofKeyChallengeExchange } from './interfaces'
import { SHA256 } from './constants'

const Pkce = {
  gen: (fixedPkce: boolean, state = uuid()): ProofKeyChallengeExchange => {
    const codeVerifier = Pkce.genCodeVerifier(fixedPkce)
    const codeChallenge = Pkce.genCodeChallenge(fixedPkce, codeVerifier)

    return {
      code_verifier: codeVerifier,
      code_challenge: codeChallenge,
      code_challenge_method: SHA256,
      state: state,
    }
  },
  genCodeVerifier: (fixedPkce: boolean): string => {
    return fixedPkce ? Crypto.randomB64UrlEncoded() : Crypto.random()
  },
  genCodeChallenge: (fixedPkce: boolean, codeVerifier: string): string => {
    return fixedPkce ? Crypto.sha256Base64UrlEncoded(codeVerifier) : Crypto.sha256(codeVerifier)
  },
}

export default Pkce
