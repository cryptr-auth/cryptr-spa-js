import { Config } from '../interfaces'

const ConfigFixure = {
  valid: (): Config => ({
    tenant_domain: 'misapret',
    client_id: '42bdb919-b4a4-4816-82c4-9b21ff546876',
    audience: 'https://encheres.misapret.com',
    default_redirect_uri: 'https://encheres.misapret.com',
    cryptr_base_url: 'http://localhost:4000',
    // default_locale: 'fr',
  }),
}

export default ConfigFixure
