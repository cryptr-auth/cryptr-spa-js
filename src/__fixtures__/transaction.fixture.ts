import { Transaction } from '../interfaces'
import { Sign } from '../types'
import Pkce from '../pkce'

const TransactionFixure = {
  valid: (): Transaction => ({
    pkce: {
      ...Pkce.gen(),
      state: 'da2379bc-46b2-4e9e-a7c4-62a891827944',
    },

    sign_type: Sign.Sso,
    scope: 'openid email',
    nonce: '031c49b8-0d74-4c62-8d25-de3e14929e84',
  }),
  validWithType: (signType: Sign): Transaction => ({
    pkce: {
      ...Pkce.gen(),
      state: 'da2379bc-46b2-4e9e-a7c4-62a891827944',
    },

    sign_type: signType,
    scope: 'openid email',
    nonce: '031c49b8-0d74-4c62-8d25-de3e14929e84',
  }),
}

export default TransactionFixure
