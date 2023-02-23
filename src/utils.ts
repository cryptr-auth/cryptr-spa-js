import * as Interface from './interfaces'

export const locationSearch = (): string => {
  if (window != undefined && window.location !== undefined) {
    return window.location.search
  } else {
    /* istanbul ignore next */
    return ''
  }
}

export const parseRedirectParams = (location = locationSearch()): Interface.RedirectionParams => {
  const urlParams = new URLSearchParams(location)

  if (urlParams.get('state') && urlParams.get('authorization_id') && urlParams.get('code')) {
    let params: Interface.RedirectionParams = {
      state: urlParams.get('state') || '',
      authorization: {
        id: urlParams.get('authorization_id') || '',
        code: urlParams.get('code') || '',
      },
    }
    const org_domain = urlParams.get('organization_domain')
    if (org_domain != null && org_domain != '') {
      params = { ...params, organization_domain: org_domain }
    }

    const request_id = urlParams.get('request_id')
    if (request_id != null && request_id != '') {
      params = { ...params, request_id: request_id }
    }

    return params
  } else {
    throw new Error('Can not parse authorization params')
  }
}

export const organizationDomain = (refreshToken?: string): string | undefined => {
  return refreshToken && refreshToken.includes('.') ? refreshToken.split('.')[0] : undefined
}
