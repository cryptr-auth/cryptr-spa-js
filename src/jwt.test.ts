import jwtDecode from 'jwt-decode'

import Jwt, {
  validatesHeader,
  validatesFieldsExist,
  validatesExpiration,
  validatesAudience,
  validatesIssuer,
  validatesTimestamps,
  validatesClient,
} from './jwt'
import ConfigFixture from './__fixtures__/config.fixture'
import TokenFixture from './__fixtures__/token.fixture'

describe('validatesHeader(token)', () => {
  it('returns true if valid', () => {
    expect(validatesHeader(TokenFixture.accessToken.valid())).toBeTruthy()
  })
  it('throws errors if invalid signing algo', () => {
    expect(() => {
      validatesHeader(TokenFixture.accessToken.invalid())
    }).toThrow('the token must be signed in RSA 256')
  })

  it('throws errors if the key identifier (kid) is missing', () => {
    expect(() => {
      validatesHeader(
        'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.POstGetfAytaZS82wHcjoTyoqhMyxXiWdR7Nn7A29DNSl0EiXLdwJ6xC6AfgZWF1bOsS_TuYI3OG85AmiExREkrS6tDfTQ2B3WXlrr-wp5AokiRbz3_oB4OxG-W9KcEEbDRcZc0nH3L7LzYptiy1PtAylQGxHTWZXtGz4ht0bAecBgmpdgXMguEIcoqPJ1n3pIWk_dUZegpqx0Lka21H6XxUTxiy8OcaarA8zdnPUnV6AmNP3ecFawIFYdvJB_cm-GvpCSbr8G8y_Mllj8f4x9nBH8pQux89_6gUY618iYv7tuPWBFfEbLxtF2pZS6YC1aSfLQxeNe8djT9YjpvRZA',
      )
    }).toThrow('token needs a kid (key identifier)')
  })
})

describe('validatesTimestamps(jwtBody)', () => {
  it('should throw an error if exp not number', () => {
    expect(() => validatesTimestamps({ exp: '12' })).toThrowError(
      'Expiration Time (exp) claim must be a number present',
    )
  })

  it('should throw an error if iat not number', () => {
    expect(() => validatesTimestamps({ exp: 12, iat: '12' })).toThrowError(
      'Issued At (iat) claim must be a number present',
    )
  })
  it('should returns true if numbers', () => {
    expect(validatesTimestamps({ exp: 12, iat: 42 })).toBeTruthy()
  })
})

describe('validatesClient', () => {
  it('should fail if wring client id', () => {
    const config = ConfigFixture.valid()
    expect(() => validatesClient({ cid: 'config.client_id' }, config)).toThrowError(
      `Client id (cid) config.client_id claim does not compliant with ${config.client_id} from config`,
    )
  })

  it('should succeed if same client id', () => {
    const config = ConfigFixture.valid()
    expect(validatesClient({ cid: config.client_id }, config)).toBeTruthy()
  })
})

describe('validatesFieldsExist(jwtBody, fields)', () => {
  const validJwtBody = jwtDecode(TokenFixture.accessToken.valid())
  const invalidJwtBody = jwtDecode(TokenFixture.accessToken.invalid())

  it('returns true if valid', () => {
    expect(validatesFieldsExist(validJwtBody, ['sub'])).toBeTruthy()
  })
  it('throws errors if invalid signing algo', () => {
    expect(() => {
      validatesFieldsExist(invalidJwtBody, ['iss'])
    }).toThrow('iss is missing')
  })
})

describe('Jwt.validatesAccessToken(accessToken)', () => {
  it('returns false if invalid', () => {
    expect(() =>
      Jwt.validatesAccessToken(TokenFixture.accessToken.invalid(), ConfigFixture.valid()),
    ).toThrowError('the token must be signed in RSA 256')
  })

  it('returns false if empty access token', () => {
    expect(() => Jwt.validatesAccessToken('', ConfigFixture.valid())).toThrowError(
      "Invalid token specified: Cannot read property 'replace' of undefined",
    )
  })

  it('returns true if valid', () => {
    expect(
      Jwt.validatesAccessToken(TokenFixture.accessToken.valid(), ConfigFixture.valid()),
    ).toBeTruthy()
  })

  it('returns true if matching organization_domain', () => {
    expect(
      Jwt.validatesAccessToken(
        TokenFixture.accessToken.valid(),
        ConfigFixture.valid(),
        ConfigFixture.valid().tenant_domain,
      ),
    ).toBeTruthy()
  })

  it('throws error if unmatching organization_domain', () => {
    expect(() =>
      Jwt.validatesAccessToken(TokenFixture.accessToken.valid(), ConfigFixture.valid(), 'azerty'),
    ).toThrow(
      'Issuer (iss) http://localhost:4000/t/cryptr of this token claim does not compliant http://localhost:4000/t/azerty',
    )
  })
})

describe('Jwt.validatesIdToken(accessToken)', () => {
  it('returns true if valid', () => {
    expect(Jwt.validatesIdToken(TokenFixture.idToken.valid(), ConfigFixture.valid())).toBeTruthy()
  })

  it('returns true if matching organization_domain', () => {
    expect(
      Jwt.validatesIdToken(
        TokenFixture.idToken.valid(),
        ConfigFixture.valid(),
        ConfigFixture.valid().tenant_domain,
      ),
    ).toBeTruthy()
  })

  it('throws error if unmatching organization_domain', () => {
    expect(() =>
      Jwt.validatesIdToken(TokenFixture.idToken.valid(), ConfigFixture.valid(), 'azerty'),
    ).toThrow(
      'Issuer (iss) http://localhost:4000/t/cryptr of this token claim does not compliant http://localhost:4000/t/azerty',
    )
  })
})

describe('validatesAudience(tokenBody, config)', () => {
  const VALID_AUD_BODY = { aud: 'http://localhost/' }
  const INVALID_AUD_BODY = { aud: 'https:/www.google.com' }

  it('returns true if valid', () => {
    expect(validatesAudience(VALID_AUD_BODY, ConfigFixture.valid())).toBeTruthy()
  })
  it('throws errors if ', () => {
    expect(() => {
      validatesAudience(INVALID_AUD_BODY, ConfigFixture.valid())
    }).toThrow(
      'Audience (aud) https:/www.google.com claim does not compliant with http://localhost/ from config',
    )

    // }).toThrow('Expiration (exp) is invalid, it (1595849567172) must be in the future')
  })
})

describe('validatesIssuer(tokenBody, config)', () => {
  const VALID_ISS_BODY = { iss: 'http://localhost:4000/t/cryptr' }
  const UNMATCHING_ISS_CONFIG = { iss: 'http://localhost:4000/t/trade-in' }

  it('returns true if valid', () => {
    expect(validatesIssuer(VALID_ISS_BODY, ConfigFixture.valid())).toBeTruthy()
  })
  it('throws errors if ', () => {
    expect(() => {
      validatesIssuer(UNMATCHING_ISS_CONFIG, ConfigFixture.valid())
    }).toThrow(
      'Issuer (iss) http://localhost:4000/t/trade-in of this token claim does not compliant http://localhost:4000/t/cryptr',
    )
  })

  it('returns true if organization undefined provided matching iss', () => {
    expect(validatesIssuer(VALID_ISS_BODY, ConfigFixture.valid(), undefined)).toBeTruthy()
  })

  it('returns true if organization provided matching iss', () => {
    expect(validatesIssuer(UNMATCHING_ISS_CONFIG, ConfigFixture.valid(), 'trade-in')).toBeTruthy()
  })

  it('throwns error if organization provided not matching iss', () => {
    expect(() =>
      validatesIssuer(UNMATCHING_ISS_CONFIG, ConfigFixture.valid(), 'shark-academy'),
    ).toThrow(
      'Issuer (iss) http://localhost:4000/t/trade-in of this token claim does not compliant http://localhost:4000/t/shark-academy',
    )
  })
})

describe('validatesExpiration(tokenBody)', () => {
  const VALID_EXP_BODY = { exp: 2226569567 }
  const INVALID_EXP_BODY = { exp: 1595849567 }

  it('returns true if valid', () => {
    expect(validatesExpiration(VALID_EXP_BODY)).toBeTruthy()
  })

  it('throws errors if ', () => {
    expect(() => {
      validatesExpiration(INVALID_EXP_BODY)
    }).toThrow('Expiration (exp) is invalid, it (1595849567000) must be in the future')
  })
})
