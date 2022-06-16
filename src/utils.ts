import * as Interface from './interfaces'

export const locationSearch = (): string => {
  if (window != undefined && window.location !== undefined) {
    return window.location.search
  } else {
    /* istanbul ignore next */
    return ''
  }
}

export const parseRedirectParams = (
  location = locationSearch(),
): {
  state: string
  authorization: Interface.Authorization
  organization_domain?: string
} => {
  const urlParams = new URLSearchParams(location)

  if (urlParams.get('state') && urlParams.get('authorization_id') && urlParams.get('code')) {
    let params = {
      state: urlParams.get('state') || '',
      authorization: {
        id: urlParams.get('authorization_id') || '',
        code: urlParams.get('code') || '',
      },
    }
    const org_domain = urlParams.get('organization_domain')
    if (org_domain != null && org_domain != '') {
      return { ...params, organization_domain: org_domain }
    } else {
      return params
    }
  } else {
    throw new Error('Can not parse authorization params')
  }
}

export const organizationDomain = (refreshToken?: string): string | undefined => {
  return refreshToken && refreshToken.includes('.') ? refreshToken.split('.')[0] : undefined
}
