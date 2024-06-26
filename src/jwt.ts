import jwtDecode from 'jwt-decode'

import { cryptrBaseUrl, JWT, RS256 } from './constants'
import { Config } from './interfaces'

const COMMON_FIELDS: Array<string> = [
  'iss',
  'sub',
  'aud',
  'exp',
  'iat',
  'cid',
  'jti',
  'jtt',
  'scp',
  'tnt',
  'jtt',
]

/*
  +-----+--------------+--------+-------------------------------------+
  | Key |  Name        | Type   |  Example                            |
  +-----+--------------+--------+-------------------------------------+
  | iss | Issuer       | string | "misapret.cryptr.com"               |
  | sub | EndUser      | uuid   | uuid                                |
  | aud | Audience     | string | "misapret.com"                      |
  | exp | Expiration   | DtTime | "2039-01-01T00:00:00+00:00"         |
  | nbf | Not Before   | DtTime | "2038-04-01T00:00:00+00:00"         |
  | iat | Issued At    | DtTime | "2038-03-17T00:00:00+00:00"         |
  | cid | Client ID    | uuid   | Applicaiton id                      |
  | jti | Token UUID   | uuid   | Access id                           |
  | jtt | JWT Type     | string | "access"                            |
  | scp | Scope        | array  | "openid email"                      |
  | tnt | Tenant       | string | "misapret"                          |
  +-----+--------------+--------+-------------------------------------+
*/
const ACCESS_FIELDS = COMMON_FIELDS

/*
  +-----------+--------------+--------+-----------------------------------------+
  | Key       | Name         | Type   | Example                                 |
  +-----------+--------------+--------+-----------------------------------------+
  | iss       | Issuer       | string | "misapret.cryptr.com" tenant domain url |
  | sub       | Subject      | uuid   |       can be the end user id            |
  | aud       | Audience     | string |       "enchere.misapret.com"            |
  | exp       | Expiration   | DtTime | :"2039-01-01T00:00:00+00:00"            |
  | nbf       | Not Before   | DtTime |  "2038-04-01T00:00:00+00:00"            |
  | iat       | Issued At    | DtTime |  "2038-03-17T00:00:00+00:00"            |
  | cid       | Client ID    | string | "307656e3-7a87-4c95-bad7-230a944897a2"  |
  | jti       | Token UUID   | uuid   | "38c85140-4e24-4a61-821c-1955ae7df99d"  |
  | acr       | AuthContext  | string |  "acr: ""                               |
  | amr       | AuthMethod   | array  |   "swk" method defined by rfc8176       |
  | nonce     | Nonce        | string |  "nonce: "n-0S6_WzA2Mj"                 |
  | auth_time | Auth Time    | DtTime |  "2038-03-17T00:00:00+00:00"            |
  | tnt       | tenant       | string |               "misapret"                |
  +-----------+--------------+--------+-----------------------------------------+
*/
const ID_FIELDS = ['at_hash', 'c_hash', 'nonce'].concat(COMMON_FIELDS)
// V3 ID token has no more nonce
const V3_ID_FIELDS = ['at_hash', 'c_hash', 'identities'].concat(COMMON_FIELDS)
// V3 tokens has no more iss cid scp and tnt
const V3_ABSENT_FIELDS = ['iss', 'cid', 'scp', 'tnt']
const V3_ADDED_FIELDS = ['org']
const V3_ACCESS_FIELDS = COMMON_FIELDS.filter((f) => !V3_ABSENT_FIELDS.includes(f)).concat([
  'org',
  'scope',
])

export const validatesHeader = (token: any): void | true => {
  const header: { alg: string; typ: string } = jwtDecode(token, { header: true })
  if (header.typ !== JWT) {
    throw new Error('the token must be a JWT')
  }

  if (header.alg !== RS256) {
    throw new Error('the token must be signed in RSA 256')
  }

  if (!header.hasOwnProperty('kid')) {
    throw new Error('token needs a kid (key identifier) in header')
  }
  return true
}

const isV3Token = (jwtBody: any): boolean => {
  var ver = 1
  if ('ver' in jwtBody) {
    ver = jwtBody.ver as number
  }
  return ver >= 3
}

export const validatesFieldsExist = (jwtBody: any, fields: Array<string>): void | true => {
  const fieldsToCheck = isV3Token(jwtBody)
    ? fields.filter((f) => !V3_ABSENT_FIELDS.includes(f)).concat(V3_ADDED_FIELDS)
    : fields
  fieldsToCheck.map((key) => {
    if (!jwtBody.hasOwnProperty(key)) {
      throw new Error(key + ' is missing in ' + jwtBody.jtt)
    }
  })
  return true
}

export const validatesTimestamps = (jwtBody: any): void | true => {
  if (!Number.isInteger(jwtBody.exp)) {
    throw new Error('Expiration Time (exp) claim must be a number present')
  }
  if (!Number.isInteger(jwtBody.iat)) {
    throw new Error('Issued At (iat) claim must be a number present')
  }
  return true
}

export const validatesClient = (tokenBody: any, config: Config): void | true => {
  if (config.client_id !== tokenBody.cid) {
    throw new Error(
      `Client id (cid) ${tokenBody.cid} claim does not compliant with ${config.client_id} from config`,
    )
  }
  return true
}

export const validatesAudience = (tokenBody: any, config: Config): void | true => {
  // openid v3 jwt contains config's client_id instead of config's audience
  const expectedAudience =
    isV3Token(tokenBody) && tokenBody.jtt == 'openid' ? config.client_id : config.audience
  if (tokenBody.aud != expectedAudience) {
    throw new Error(
      `Audience (aud) ${tokenBody.aud} claim does not compliant with ${expectedAudience} from config`,
    )
  }
  return true
}

export const validatesIssuer = (
  tokenBody: any,
  config: Config,
  organization_domain?: string,
): void | true => {
  // no more iss in v3 jwt token body
  if (isV3Token(tokenBody)) return true
  const tmpCryptrUrl = cryptrBaseUrl(config)
  const cryptrUrl = tmpCryptrUrl.replace('/backoffice', '')
  const issuer = `${cryptrUrl}/t/${organization_domain || config.tenant_domain}`
  const tokenBodyIss = tokenBody.iss

  if (issuer !== tokenBodyIss) {
    throw new Error(
      `Issuer (iss) ${tokenBody.iss} of this token claim does not compliant ${issuer}`,
    )
  }
  return true
}

export const validatesExpiration = (tokenBody: any): void | true => {
  const now = new Date(Date.now())
  // exp is in Seconds
  const expiration = new Date(tokenBody.exp * 1000)

  if (now.getTime() > expiration.getTime()) {
    throw new Error(
      `Expiration (exp) is invalid, it (${expiration.getTime()}) must be in the future`,
    )
  }
  return true
}

// Validates common attributes
const validatesJwtBody = (
  jwtBody: any,
  config: Config,
  organization_domain?: string,
): void | true => {
  validatesTimestamps(jwtBody) &&
    validatesAudience(jwtBody, config) &&
    validatesIssuer(jwtBody, config, organization_domain) &&
    validatesExpiration(jwtBody)
}

const Jwt = {
  body: (token: string): object => {
    return jwtDecode(token)
  },
  validatesAccessToken: (
    accessToken: string,
    config: Config,
    organization_domain?: string,
  ): boolean => {
    const jwtBody = Jwt.body(accessToken)
    const FIELDS_TO_CHECK = isV3Token(jwtBody) ? V3_ACCESS_FIELDS : ACCESS_FIELDS

    validatesHeader(accessToken)
    validatesJwtBody(jwtBody, config, organization_domain)
    validatesFieldsExist(jwtBody, FIELDS_TO_CHECK)

    return true
  },
  validatesIdToken: (idToken: string, config: Config, organization_domain?: string): boolean => {
    const jwtBody = Jwt.body(idToken)
    const FIELDS_TO_CHECK = isV3Token(jwtBody) ? V3_ID_FIELDS : ID_FIELDS

    validatesHeader(idToken)
    validatesJwtBody(jwtBody, config, organization_domain)
    validatesFieldsExist(jwtBody, FIELDS_TO_CHECK)
    return true
  },
}

export default Jwt
