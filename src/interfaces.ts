import { Locale, Region, Sign } from './enums'

export interface Authorization {
  id: string
  code: string
}

export interface Config {
  tenant_domain: string
  client_id: string
  audience: string
  default_redirect_uri: string
  default_locale?: Locale
  region?: Region
  development?: boolean
  telemetry?: boolean
}

export interface ProofKeyChallengeExchange {
  code_verifier: string
  code_challenge: string
  code_challenge_method: string
  state: string
}

export interface Transaction {
  pkce: ProofKeyChallengeExchange
  sign_type: Sign
  scope: string
  locale?: Locale
  redirect_uri?: string
  // Constant to validate redirections & mitigates replay/middleman attacks
  nonce?: string
}
