import jwtDecode from 'jwt-decode'

import Jwt, {
  validatesHeader,
  validatesFieldsExist,
  validatesExpiration,
  validatesAudience,
  validatesIssuer,
  validatesSsoUserMetadata,
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
  it('returns true if valid', () => {
    expect(
      Jwt.validatesAccessToken(TokenFixture.accessToken.valid(), ConfigFixture.valid()),
    ).toBeTruthy()
  })
})

describe('Jwt.validatesIdToken(accessToken)', () => {
  it('returns true if valid', () => {
    expect(Jwt.validatesIdToken(TokenFixture.idToken.valid(), ConfigFixture.valid())).toBeTruthy()
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
  const INVALID_ISS_BODY = { iss: 'http://localhost:4000/t/trade-in' }
  const VALID_SSO_ISS_BODY = {
    iss: 'http://localhost:4000/enterprise/misapret_QtqpTS7itBLt4HdoCj5Qck/login',
  }
  const INVALID_SSO_ISS_BODY_START = {
    iss: 'http://localhost:3000/enterprise/misapret_QtqpTS7itBLt4HdoCj5Qck/login',
  }
  const INVALID_SSO_ISS_BODY_END = {
    iss: 'http://localhost:4000/enterprise/misapret_QtqpTS7itBLt4HdoCj5Qck/sso',
  }

  it('returns true if valid SSO', () => {
    expect(validatesIssuer(VALID_SSO_ISS_BODY, ConfigFixture.valid())).toBeTruthy()
  })

  it('throws error if invalid ISS SSO start', () => {
    expect(() => {
      validatesIssuer(INVALID_SSO_ISS_BODY_START, ConfigFixture.valid())
    }).toThrowError(
      'Issuer (iss) http://localhost:3000/enterprise/misapret_QtqpTS7itBLt4HdoCj5Qck/login of this token claim does not compliant http://localhost:4000/enterprise/:idp_id/login',
    )
  })

  it('throws error if invalid ISS SSO end', () => {
    expect(() => {
      validatesIssuer(INVALID_SSO_ISS_BODY_END, ConfigFixture.valid())
    }).toThrowError(
      'Issuer (iss) http://localhost:4000/enterprise/misapret_QtqpTS7itBLt4HdoCj5Qck/sso of this token claim does not compliant http://localhost:4000/enterprise/:idp_id/login',
    )
  })

  it('returns true if valid', () => {
    expect(validatesIssuer(VALID_ISS_BODY, ConfigFixture.valid())).toBeTruthy()
  })
  it('throws errors if ', () => {
    expect(() => {
      validatesIssuer(INVALID_ISS_BODY, ConfigFixture.valid())
    }).toThrow(
      'Issuer (iss) http://localhost:4000/t/trade-in of this token claim does not compliant http://localhost:4000/t/cryptr',
    )
  })
})

describe('validatesSsoUserMetadata(tokenBody)', () => {
  const MAGIC_LINK_TOKEN = { iss: 'http://localhost:4000/t/cryptr' }
  const SSO_TOKEN_METADATALESS = {
    iss: 'http://localhost:4000/enterprise/misapret_QtqpTS7itBLt4HdoCj5Qck/login',
  }

  const SSO_TOKEN_EMPTY_METADATA = {
    iss: 'http://localhost:4000/enterprise/misapret_QtqpTS7itBLt4HdoCj5Qck/login',
    resource_owner_metadata: {},
  }

  const INVALID_SSO_TOKEN_METADATA = {
    iss: 'http://localhost:4000/enterprise/misapret_QtqpTS7itBLt4HdoCj5Qck/login',
    resource_owner_metadata: {
      slug: 'my-slug',
      email: 'john@doe',
      saml_subject: '1234',
    },
  }

  const VALID_SSO_TOKEN_METADATA = {
    iss: 'http://localhost:4000/enterprise/misapret_QtqpTS7itBLt4HdoCj5Qck/login',
    resource_owner_metadata: {
      uid: '1234',
      email: 'john@doe',
      saml_subject: '1234',
    },
  }

  it('returns true if not enterprise issuer', () => {
    expect(() => {
      validatesSsoUserMetadata(MAGIC_LINK_TOKEN)
    }).toBeTruthy()
  })

  it('throws error if enterprise without user metadata', () => {
    expect(() => {
      validatesSsoUserMetadata(SSO_TOKEN_METADATALESS)
    }).toThrowError('resource_owner_metadata must be present keys when SSO enterprise token')
  })

  it('throws error if not enterprise without empty user metadata', () => {
    expect(() => {
      validatesSsoUserMetadata(SSO_TOKEN_EMPTY_METADATA)
    }).toThrowError(' must include email,uid,saml_subject keys when SSO enterprise token')
  })

  it('throws error if not enterprise without proper user metadata', () => {
    expect(() => {
      validatesSsoUserMetadata(SSO_TOKEN_EMPTY_METADATA)
    }).toThrowError(
      "resource_owner_metadata must include email,uid,saml_subject keys when SSO enterprise token, got ''",
    )
  })

  it('throws error if not enterprise without not compliant user metadata', () => {
    expect(() => {
      validatesSsoUserMetadata(INVALID_SSO_TOKEN_METADATA)
    }).toThrowError(
      "resource_owner_metadata must include email,uid,saml_subject keys when SSO enterprise token, got 'slug,email,saml_subject'",
    )
  })

  it('returns true if proper user metadata', () => {
    expect(() => {
      validatesSsoUserMetadata(VALID_SSO_TOKEN_METADATA)
    }).toBeTruthy()
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
