| Statements                                                                                 | Branches                                                                          | Functions                                                                                |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| ![Statements](https://img.shields.io/badge/statements-93.88%25-brightgreen.svg?style=flat) | ![Branches](https://img.shields.io/badge/branches-82.85%25-yellow.svg?style=flat) | ![Functions](https://img.shields.io/badge/functions-94.08%25-brightgreen.svg?style=flat) |

[![codecov](https://codecov.io/gh/cryptr-auth/cryptr-spa-js/branch/master/graph/badge.svg?token=F21AODGJM4)](https://codecov.io/gh/cryptr-auth/cryptr-spa-js)

# 📚 cryptr-spa.js

> Cryptr SDK for Single Page Applications using passwordless authentication

## Installation

current version `1.2.0`

```bash
//yarn
yarn add @cryptr/cryptr-spa-js

//npm
npm install @cryptr/cryptr-spa-js
```

## Configuration

### CryptrConfig

Here is an example of CryptrConfig

```typescript
var config = {
  tenant_domain: 'your-domain',
  client_id: 'your-front-app-uuid',
  audience: 'http://localhost:8000',
  default_redirect_uri: 'http://localhost:8000/',
  cryptr_base_url: 'https://your_cryptr_server_url',
  default_locale: 'en',
  telemetry: false,
  dedicated_server: true,
  fixed_pkce: true,
}
```

Explanation of config

| key                    | Required/Optional | type          | Default | Description                                          |
| ---------------------- | ----------------- | ------------- | ------- | ---------------------------------------------------- |
| `tenant_domain`        | required          | string slug   | -       | Reference to your company entity                     |
| `client_id`            | required          | uuid          | -       | Reference to your front app id                       |
| `audience`             | required          | string URL    | -       | Root URL of your front app                           |
| `default_redirect_uri` | required          | string URL    | -       | Desired redirection URL after authentication process |
| `cryptr_base_url`      | required          | string URL    | -       | URL of your Cryptr service                           |
| `default_locale`       | Optional          | string locale | `en`    | -                                                    |
| `dedicated_server`     | Optional          | boolean       | false   | Contact Cryptr Team to set properly                  |
| `fixed_pkce`           | Optional          | boolean       | false   | Contact Cryptr Team to set properly                  |
| `telemetry`            | Optional          | boolean       | false   | Set to `true` if debug required with Cryptr Team     |
| ---                    | ---               | ---           | ---     | ---                                                  |

⚠️ `fixed_pkce` will be removed in the future `1.4.0` release version

### Cryptr Client Instance

After building your config, create your Cryptr client as below:

```js
this.cryptrClient = await CryptrSpa.createClient(config)
```

After this creation, a quick script is required, contact our team to get it.

## Open Session

### Magic link

If you are interested in our Magic link solution, follow the below steps:

To start the process call `signInWithRedirect( scope = 'openid email profile', redirectUri, locale)`

example:

```js
this.cryptrClient.signInWithRedirect()
```

| Attribute     | Required/Optional | type       | Default                          | Description                                            |
| ------------- | ----------------- | ---------- | -------------------------------- | ------------------------------------------------------ |
| `scope`       | optional          | string     | `openid email profile`           | Desired OAuth scopes for user session                  |
| `redirectUri` | optional          | URL string | this.config.default_redirect_uri | Desired redirect url if different as default in config |
| `locale`      | optional          | string     | this.config.default_locale       | Desired locale if different as default in config       |

### SSO

If you want to integrate SSO in your app for your client(s), follow the below steps:

To start the process call `signInWithSSOGateway(idpId, options)`

examples:

```js
// Bare SSO Gateway
signInWithSSOGateway()

// Single SSO login page
signInWithSSOGateway('some_id_id', { locale: 'fr' })

// SSO Gateway with idp ids provided
signInWithSSOGateway(['some_id_id', 'other_idp_id'])
```

| Attribute | Required/Optional | type    | Default   | Description                                                                                                |
| --------- | ----------------- | ------- | --------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `idpId`   | optional          | `string | string[]` | -                                                                                                          | If none set -> user will be redirected to Cryptr Gateway and will have to find its SSO by email or organization domain |
|           |                   |         |           | If one string set -> user will be redirected to Cryptr SSO login page related to IPD provided              |
|           |                   |         |           | If string array set -> user will be redirected to Cryptr SSO gateway page with choices of IDP ids provided |
| `options` | optional          | Keyword | -         | Can let you customize options such as locale, redirection etc                                              |

## Close session

When you want to let the user close its session (either Magic Link or SSO) proceed as follow:

To start the process call `logOut(callback, location, targetUrl)`

Example:

```js
this.cryptrClient.logOut(() => {
  alert('you are logged out')
})
```

| Attribute   | Required/Optional | type       | Default                | Description                                                                                                        |
| ----------- | ----------------- | ---------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `callback`  | optional          | Function   | -                      | Process to be called after log out process, ⚠️ Only available in Magic link process due to Redirect process in SSO |
| `location`  | optional          | string URL | `window.location`      | Current location                                                                                                   |
| `targetUrl` | optional          | string URL | `window.location.href` | URL after Log out process                                                                                          |

## Fetch User data

You can retrieve current user data properties using `getUser()`

Example:

```js
this.cryptrClient.getUser()
```

This method will return you a struct with different properties such as email, user id or organization domain.

For more information please contact us.

## Universal Gateway

> ⚠️ Contact us for more info about this section

This is the latest feature of our SDK and our solutions.

The following methods will allow you to open a session either from the email or the domain of the end-user

### Sign with email

If you have the email of the end-user you can call the below method, and depending if the email matches to an organization or to an existing account, user will be guided into to proper login process (sso, magic link, password ..)

```js
// signature
signInWithEmail(email: string, options?: SsoSignOptsAttrs)

// simple call
signInWithEmail('john@doe.com')

// email and options
signInWithEmail('john@doe.com', { locale: 'fr' })
```

### Sign with domain

If you have the domain of the end user you can call the below method

```js
// signature
signInWithDomain(organizationDomain?: string, options?: SsoSignOptsAttrs)

// simple call
signInWithDomain('some-organization')

// domain + options
signInWithDomain('some-organization', {locale: 'fr'})

// access our gateway to let user fill our form
signInWithDomain()
```
