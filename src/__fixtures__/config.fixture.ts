import { Config } from '../interfaces'

const ConfigFixure = {
  valid: (): Config => ({
    tenant_domain: 'cryptr',
    client_id: '1c2417e6-757d-47fe-b564-57b7c6f39b1b',
    audience: 'http://localhost/',
    default_redirect_uri: 'http://localhost:8000/',
    cryptr_base_url: 'http://localhost:4000',
    default_locale: 'en',
  }),
}

export default ConfigFixure
