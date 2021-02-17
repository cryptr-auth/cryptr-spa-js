import { Sign } from './types'

export interface Authorization {
  id: string
  code: string
}

export interface Config {
  tenant_domain: string
  client_id: string
  audience: string
  default_redirect_uri: string
  default_locale?: string
  region?: string
  cryptr_base_url?: string
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
  locale?: string
  redirect_uri?: string
  // Constant to validate redirections & mitigates replay/middleman attacks
  nonce?: string
}

export interface AuthResponseError {
  field: string
  message: string
}

export interface RefreshStore {
  refresh_token: string
  access_token_expiration_date: number
  refresh_expiration_date: number
  refresh_leeway: number
  refresh_retry: number
}
