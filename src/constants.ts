import { Config } from './interfaces'

export const CACHE_LOCATION_MEMORY: string = 'memory'

export const CACHE_LOCATION_LOCAL_STORAGE: string = 'localstorage'

export const CODE_GRANT: string = 'code'

export const DEFAULT_DATABASE = 'default'

export const DEFAULT_EXPIRY_ADJUSTMENT_SECONDS: number = 0

export const EXPIRATION_DAYS: number = 30

// -> 1 month
export const DEFAULT_REFRESH_ROTATION_DURATION: number = 1000 * 60 * 60 * 24 * EXPIRATION_DAYS

export const DEFAULT_LEEWAY_IN_SECONDS: number = 60

export const DEFAULT_REFRESH_RETRY: number = 5

export const DEFAULT_REFRESH_EXPIRATION: number = 2_592_000

export const DEFAULT_ISSUER: string = 'cryptr'

export const DEFAULT_SCOPE: string = 'openid email profile'

export const GRANT_TYPE: string = 'authorization_code'

export const JWT = 'JWT'

export const PROXY_URL: string = 'https://cors-anywhere.herokuapp.com/'

export const RS256 = 'RS256'

export const REFRESH_GRANT: string = 'code'

export const SHA256: string = 'S256'

// Same as COOKIE_KEY
export const STORAGE_KEY_PREFIX: string = '$cryptr-spa-js$'

export const ALLOWED_LOCALES = ['en', 'fr']

export const ALLOWED_REGIONS = ['eu', 'us']

const CRYPTR_EU_BASE_URL = 'https://auth.cryptr.eu'
const CRYPTR_US_BASE_URL = 'https://auth.cryptr.us'

export const cryptrBaseUrl = (config: Config) => {
  const errorMsg = `You must provide region in values ${ALLOWED_REGIONS} found '${config.region}', if not provide your cryptr_base_url`
  switch (config.region) {
    case 'eu':
      return CRYPTR_EU_BASE_URL
    case 'us':
      return CRYPTR_US_BASE_URL
    case undefined:
      if (config.cryptr_base_url) {
        return config.cryptr_base_url
      } else {
        throw new Error(errorMsg)
      }
    default:
      throw new Error(errorMsg)
  }
}
