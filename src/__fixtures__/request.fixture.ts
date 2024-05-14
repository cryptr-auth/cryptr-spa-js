import TokenFixure from './token.fixture'
import TransactionFixure from './transaction.fixture'
import ConfigFixture from './config.fixture'

const VALID_TRANSACTION = TransactionFixure.valid()
const VALID_CONFIG = ConfigFixture.valid()

const RequestFixture = {
  authorizationCodeRequest: {
    valid: () => ({
      client_id: VALID_CONFIG.client_id,
      grant_type: 'authorization_code',
      id: '5c20cccd-55d0-4c11-8c4a-bf4c38fa8588',
      nonce: TransactionFixure.valid().nonce,
      scope: VALID_TRANSACTION.scope,
    }),
  },
  authorizationCodeResponse: {
    valid: () => ({
      access_token: TokenFixure.accessToken.valid(),
      id_token: TokenFixure.idToken.valid(),
      nonce: TransactionFixure.valid().nonce,
      refresh_token: TokenFixure.refreshToken.valid(),
      refresh_token_expires_at: 't.expires_at',
      scope: VALID_TRANSACTION.scope,
      token_type: 'Bearer',
    }),
  },
}

export default RequestFixture
