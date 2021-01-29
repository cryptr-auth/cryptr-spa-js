import Faker from 'faker'

// import Storage from '../../src/storage'
import Transaction from '../../src/transaction'

import { setTransactionKey } from '../../src/transaction'

const config = {
  tenant_domain: 'shark-academy',
  client_id: '876fe074-3be7-4616-98e5-b4195c97e0b5',
  audience: 'http://127.0.0.1:5000/dev/',
  redirect_uri: 'http://127.0.0.1:5000/dev/',
  cryptr_base_url: 'https://cryptr-test.onrender.com/',
  locale: 'en',
}

const transaction = Transaction.create(config, 'signup', 'openid email')
const signUrl = Transaction.signUrl(config, transaction)

describe('Sdk integration in vue.js', () => {
  it('has a config setup', () => {
    cy.visit(config.audience)
    cy.contains('tenantd domain : shark-academy')
    cy.contains(`audience : ${config.audience}`)
    cy.contains(`redirect uri : ${config.audience}`)
    cy.contains(`cryptr base url : ${config.cryptr_base_url}`)
  })
})

describe('As a user, when  I want to signup', () => {
  it('I am redirect to signup page when click on signup button', () => {
    cy.log(signUrl.href)
    cy.visit(config.audience)
    cy.get('[data-cy=btn__sign-up]').click()

    cy.location('pathname').should('include', 'signup')
  })

  it('I can request a magic link', () => {
    cy.log(signUrl.href)
    cy.visit(signUrl.href)

    cy.get('#authorization_resource_owner_email')
      .type(Faker.internet.email())
      .parent()
      .parent()
      .submit()
  })
})
