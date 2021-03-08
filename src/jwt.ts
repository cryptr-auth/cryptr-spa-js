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

export const validatesFieldsExist = (jwtBody: any, fields: Array<string>): void | true => {
  fields.map((key) => {
    if (!jwtBody.hasOwnProperty(key)) {
      throw new Error(key + ' is missing')
    }
  })
  return true
}

const validatesTimestamps = (jwtBody: any): void | true => {
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
  if (config.audience !== tokenBody.aud) {
    throw new Error(
      `Audience (aud) ${tokenBody.aud} claim does not compliant with ${config.audience} from config`,
    )
  }
  return true
}

export const validatesIssuer = (tokenBody: any, config: Config): void | true => {
  const issuer = `${cryptrBaseUrl(config)}/t/${config.tenant_domain}`
  if (issuer !== tokenBody.iss) {
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
const validatesJwtBody = (jwtBody: any, config: Config): void | true => {
  validatesTimestamps(jwtBody) &&
    validatesAudience(jwtBody, config) &&
    validatesIssuer(jwtBody, config) &&
    validatesExpiration(jwtBody)
}

const Jwt = {
  body: (token: string): object => {
    return jwtDecode(token)
  },
  validatesAccessToken: (accessToken: string, config: Config): boolean => {
    const jwtBody = Jwt.body(accessToken)

    validatesHeader(accessToken)
    validatesJwtBody(jwtBody, config)
    validatesFieldsExist(jwtBody, ACCESS_FIELDS)

    return true
  },
  validatesIdToken: (idToken: string, config: Config): boolean => {
    const jwtBody = Jwt.body(idToken)

    validatesHeader(idToken)
    validatesJwtBody(jwtBody, config)
    validatesFieldsExist(jwtBody, ID_FIELDS)

    return true
  },
}

export default Jwt
