require('dotenv').config()

const axios = require('axios')
const Cryptr = require('cryptr')
const FormData = require('form-data')
const dbo = require('../db/conn')
const data = require('../data/nftOnboard.json')

const crypt = new Cryptr(process.env.TOKEN_SECRET)
const BASE_URL = 'http://localhost:7777'

const generateAuthToken = () => {
  const SIGNER_ACCOUNT =
    process.env[`${process.env.NODE_ENV.toUpperCase()}_SIGNER_ACCOUNT`]
  const signer = JSON.parse(SIGNER_ACCOUNT)
  const token = crypt.encrypt(`${signer.account_id}&${signer.private_key}`)
  return { token, accountId: signer.account_id }
}

const createNFT = async ({
  item,
  accountId,
  token,
  contractName,
  dbConnect,
}) => {
  const reference = {
    description: item.description,
    creator_id: accountId,
  }

  const formData = new FormData()
  formData.append('file', JSON.stringify(reference), 'reference.json')

  try {
    axios.defaults.headers.common['Authorization'] = token
    const res = await axios.post(`${BASE_URL}/upload`, formData)
    const [referenceHash] = res.data.data

    const createRes = await axios.post(`${BASE_URL}/create-nft`, {
      title: item.name,
      media: item.mediaHash,
      reference: referenceHash,
      extra: JSON.stringify(reference),
      copies: 10000,
    })

    await dbConnect.collection('nft-onboarding').insertOne({
      name: item.name,
      city: item.city,
      address: item.address,
      lastModified: new Date(),
      images: item.mediaHash,
      tokenSeriesId: createRes.data.data.token_series_id,
      contractId: contractName,
      type: 'onboard',
    })

    console.log('Success Created NFT', createRes.data.data.metadata.title)
  } catch (error) {
    console.log('error', error)
    console.log(error.response.data)
  }
}

const main = async () => {
  const contractName =
    process.env[`${process.env.NODE_ENV.toUpperCase()}_CONTRACT_NAME`]
  const { token, accountId } = generateAuthToken()
  const dbConnect = await dbo.connectToServerScript()

  console.log('NFT CREATE SCRIPT STARTED')

  try {
    await Promise.all(
      data.map(async (item, idx) => {
        return await new Promise((resolve) =>
          setTimeout(
            () =>
              resolve(
                createNFT({ item, accountId, token, contractName, dbConnect })
              ),
            idx * 1000
          )
        )
      })
    )
  } catch (error) {
    console.log('error main', error)
  }

  console.log('NFT CREATE SCRIPT FINISHED')

  process.exit(0)
}

main()
