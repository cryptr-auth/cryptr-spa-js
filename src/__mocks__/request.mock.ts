import { rest } from 'msw'
import RequestFixture from '../__fixtures__/request.fixture'
import AuthorizationFixture from '../__fixtures__/authorization.fixture'
import ConfigFixture from '../__fixtures__/config.fixture'

const RequestMock = {
  postAuthorizationCodeResponse: () =>
    rest.post(RequestFixture.api_endpoint(), (req: any, res: any, ctx: any) => {
      const validResponse = RequestFixture.authorizationCodeResponse.valid()
      const { code, client_id, grant_type, nonce } = req.body

      if (grant_type === undefined) {
        return res(
          ctx.status(400),
          ctx.json({ error_code: 'invalid_request', error: 'Required param : grant type' }),
        )
      }
      if (grant_type !== 'authorization_code') {
        return res(
          ctx.status(401),
          ctx.json({ error_code: 'invalid_request', error: 'Unsupported grant type' }),
        )
      }
      if (code === undefined) {
        return res(
          ctx.status(400),
          ctx.json({ error_code: 'invalid_request', error: 'Required param : code' }),
        )
      }
      if (code !== AuthorizationFixture.valid().code) {
        return res(
          ctx.status(401),
          ctx.json({ error_code: 'invalid_request', error: `Invalid param  : ${code}` }),
        )
      }
      if (nonce === undefined) {
        return res(
          ctx.status(400),
          ctx.json({ error_code: 'invalid_request', error: 'Required param : nonce' }),
        )
      }
      if (nonce !== validResponse.nonce) {
        return res(
          ctx.status(401),
          ctx.json({ error_code: 'invalid_request', error: `Invalid param : ${nonce}` }),
        )
      }
      if (client_id === undefined) {
        return res(
          ctx.status(400),
          ctx.json({ error_code: 'invalid_request', error: 'Required param : client_id' }),
        )
      }
      if (client_id !== ConfigFixture.valid().client_id) {
        return res(
          ctx.status(401),
          ctx.json({ error_code: 'invalid_request', error: `Invalid client id : ${client_id}` }),
        )
      }
      return res(ctx.status(200), ctx.json(validResponse))
    }),
}

export default RequestMock
