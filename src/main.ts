import Client from './client'
import Crypto from './crypto'
import Storage from './storage'
import EventTypes from './event_types'
import Transaction from './transaction'

import { Config } from './interfaces'

const CryptrSpa = {
  createClient: async function createCryptrClient(config: Config): Promise<Client> {
    return new Client(config)
  },
  client: Client,
  events: EventTypes,
  crypto: Crypto,
  storage: Storage,
  transaction: Transaction,
  version: '0.2.0',
}

export default CryptrSpa
