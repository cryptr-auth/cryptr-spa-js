import { Region } from './enums'
import { Config } from './interfaces'

export const CACHE_LOCATION_MEMORY: string = 'memory'

export const CACHE_LOCATION_LOCAL_STORAGE: string = 'localstorage'

export const CODE_GRANT: string = 'code'

export const DEFAULT_EXPIRY_ADJUSTMENT_SECONDS: number = 0

export const DEFAULT_ISSUER: string = 'cryptr'

export const DEFAULT_SCOPE: string = 'openid email'

export const GRANT_TYPE: string = 'authorization_code'

export const JWT = 'JWT'

export const PROXY_URL: string = 'https://cors-anywhere.herokuapp.com/'

export const RS256 = 'RS256'

export const REFRESH_GRANT: string = 'code'

export const SHA256: string = 'S256'

// Same as COOKIE_KEY
export const STORAGE_KEY_PREFIX: string = '$cryptr-spa-js$'

// In ms -> 90s
export const DEFAULT_REFRESH_ROTATION_DURATION: number = 900

export const DEFAULT_REFRESH_EXPIRATION: number = 2_592_000

const CRYPTR_DEV_BASE_URL = 'http://localhost:4000'
const CRYPTR_EU_BASE_URL = 'https://auth.cryptr.eu'
const CRYPTR_US_BASE_URL = 'https://auth.cryptr.us'

export const cryptrBaseUrl = (config: Config) => {
  const errorMsg = `You must provide region in values ${Object.values(Region)}, found '${
    config.region
  }`
  switch (config.region) {
    case Region.eu:
      return CRYPTR_EU_BASE_URL
    case Region.us:
      return CRYPTR_US_BASE_URL
    case undefined:
      if (config.development) {
        return CRYPTR_DEV_BASE_URL
      } else {
        throw new Error(errorMsg)
      }
    default:
      throw new Error(errorMsg)
  }
}
