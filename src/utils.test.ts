import { organizationDomain, parseRedirectParams } from './utils'

describe('parseRedirectParams', () => {
  it('should throw error if no location', () => {
    expect(() => {
      parseRedirectParams()
    }).toThrowError('Can not parse authorization params')
  })

  it('should throw error if only state', () => {
    expect(() => {
      parseRedirectParams('?state=12')
    }).toThrowError('Can not parse authorization params')
  })

  it('should throw error if only authorization_id', () => {
    expect(() => {
      parseRedirectParams('?authorization_id=12')
    }).toThrowError('Can not parse authorization params')
  })

  it('should throw error if only code', () => {
    expect(() => {
      parseRedirectParams('?code=12')
    }).toThrowError('Can not parse authorization params')
  })

  it('should return standard redirect params if code id and state params present', () => {
    expect(parseRedirectParams('?state=42&authorization_id=azerty&code=12')).toEqual({
      state: '42',
      authorization: {
        code: '12',
        id: 'azerty',
      },
    })
  })

  it('should return redirect params with organization_domain if present', () => {
    expect(
      parseRedirectParams('?state=42&authorization_id=azerty&code=12&organization_domain=misapret'),
    ).toEqual({
      organization_domain: 'misapret',
      state: '42',
      authorization: {
        code: '12',
        id: 'azerty',
      },
    })
  })

  it('should return standard redirect params if organization_domain is blank', () => {
    expect(
      parseRedirectParams('?state=42&authorization_id=azerty&code=12&organization_domain='),
    ).toEqual({
      state: '42',
      authorization: {
        code: '12',
        id: 'azerty',
      },
    })
  })

  it('should return fetch request_id if present in query params', () => {
    expect(
      parseRedirectParams(
        '?state=42&request_id=alphago&authorization_id=azerty&code=12&organization_domain=',
      ),
    ).toEqual({
      state: '42',
      request_id: 'alphago',
      authorization: {
        code: '12',
        id: 'azerty',
      },
    })
  })
})

describe('organizationDomain', () => {
  it('should returns undefined if no refreshToken provided', () => {
    expect(organizationDomain()).toBeUndefined()
  })

  it('should returns undefined if no dot in refreshToken', () => {
    expect(organizationDomain('some_refresh_token')).toBeUndefined()
  })

  it('should returns organization if  dot in refreshToken', () => {
    expect(organizationDomain('organization_domain.refresh_token')).toEqual('organization_domain')
  })
})
