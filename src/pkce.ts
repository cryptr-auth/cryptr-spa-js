import Crypto from './crypto'
import CryptoJS  from 'crypto-js'

import { v4 as uuid } from 'uuid'

import { ProofKeyChallengeExchange } from './interfaces'
import { SHA256 } from './constants'

const base64UrlEncode = (str: string) => {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/[=]/g, '');
}

const codeChallenge = (codeVerifier: string): string => {
  // return Crypto.sha256(codeVerifier)
  return base64UrlEncode(CryptoJS.SHA256(codeVerifier).toString(CryptoJS.enc.Base64))
}

const Pkce = {
  gen: (state = uuid()): ProofKeyChallengeExchange => {
    // const codeVerifier = Crypto.random()
    const codeVerifier = base64UrlEncode(uuid())
    return {
      code_verifier: codeVerifier,
      code_challenge: codeChallenge(codeVerifier),
      code_challenge_method: SHA256,
      state: state,
    }
  },
}

export default Pkce
