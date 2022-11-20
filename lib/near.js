const axios = require('axios')
const { keyStores, connect, KeyPair, Contract, utils } = require('near-api-js')
const getConfig = require('./near-config')

let near
let contract
let signerAccount
let signerAccountName

const viewMethods = ['nft_tokens_for_owner']
const changeMethods = ['nft_mint', 'nft_create_series', 'nft_transfer']
const config = getConfig(process.env.NODE_ENV || 'testnet')

const init = async () => {
  console.log(`ENV: ${process.env.NODE_ENV}`)
  const SIGNER_ACCOUNT =
    process.env[`${process.env.NODE_ENV.toUpperCase()}_SIGNER_ACCOUNT`]
  const contractName =
    process.env[`${process.env.NODE_ENV.toUpperCase()}_CONTRACT_NAME`]

  if (!SIGNER_ACCOUNT) {
    throw '[env] SIGNER_ACCOUNT not found'
  }

  const signer = JSON.parse(SIGNER_ACCOUNT)
  signerAccountName = signer.account_id

  console.log(`SIGNER ACCOUNT: ${signerAccountName}`)
  console.log(`CONTRACT NAME: ${contractName}`)
  console.log('==================================================')

  try {
    const signerKeyStore = new keyStores.InMemoryKeyStore()
    const signerKeyPair = KeyPair.fromString(
      signer.secret_key || signer.private_key
    )

    await signerKeyStore.setKey(
      config.networkId,
      signer.account_id,
      signerKeyPair
    )
    near = await connect({
      deps: { keyStore: signerKeyStore },
      ...config,
    })

    signerAccount = await near.account(signer.account_id)
    contract = new Contract(signerAccount, contractName, {
      viewMethods: viewMethods,
      changeMethods: changeMethods,
      sender: signerAccount,
    })
  } catch (err) {
    console.log(err)
    process.exit(1)
  }
}

const checkAccount = async (userId) => {
  try {
    const resp = await axios.post(config.nodeUrl, {
      jsonrpc: '2.0',
      id: 'dontcare',
      method: 'query',
      params: {
        request_type: 'view_account',
        finality: 'final',
        account_id: `${userId}.${signerAccountName}`,
      },
    })
    if (resp.data.error) {
      throw new Error(`Account ${userId} not exist`)
    }
    return true
  } catch (error) {
    return false
  }
}

const createAccount = async ({ accountId, secretKey }) => {
  const accExist = await checkAccount(accountId)
  if (accExist) {
    throw new Error(`Account ${accountId} already exist`)
  }
  const keyPair = KeyPair.fromString(secretKey)
  const newAccount = await signerAccount.createAccount(
    `${accountId}.${signerAccountName}`,
    keyPair.publicKey.toString(),
    utils.format.parseNearAmount('0.1')
  )
  return newAccount
}

module.exports = {
  getSignerAccountName: () => signerAccountName,
  getContract: () => contract,
  getSignerAccount: () => signerAccount,
  checkAccount: (accountId) => checkAccount(accountId),
  createAccount: ({ accountId, secretKey }) =>
    createAccount({ accountId, secretKey }),
  init,
}
