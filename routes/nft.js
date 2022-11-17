const express = require('express')
const { validate } = require('express-validation')
const { ObjectId } = require('mongodb')
const {
  getContract,
  getSignerAccountName,
  getSignerAccount,
} = require('../lib/near')
const authenticate = require('../middleware/authenticate')
const { mintValidation, createnftValidation } = require('../utils/validator')
const dbo = require('./../db/conn')
const turfDistance = require('@turf/distance').default
const multer = require('multer')
const { NFTStorage, Blob } = require('nft.storage')
const { transactions } = require('near-api-js')

const storage = multer.memoryStorage()
const upload = multer({ dest: 'uploads/', storage: storage })
const router = express.Router()

router.post('/mint-nft-onboard', [authenticate], async (req, res) => {
  const { _id } = req.body
  const { accountId } = req
  const dbConnect = dbo.getDb()

  try {
    const profile = await dbConnect
      .collection('profile')
      .findOne({ accountId: req.accountId })

    if (profile?.totalNftCollected >= 3) {
      throw new Error(`${accountId} have already collected 3 NFTs`)
    }

    const nft = await dbConnect
      .collection('nft-onboarding')
      .findOne({ _id: ObjectId(_id) })

    if (!nft) {
      throw new Error('NFT not found')
    }

    const args = {
      token_series_id: nft.tokenSeriesId,
      receiver_id: accountId,
    }
    const mintNFT = await getSignerAccount().signAndSendTransaction({
      receiverId: nft.contractId,
      actions: [
        transactions.functionCall(
          'nft_mint',
          args,
          '100000000000000',
          '11280000000000000000000'
        ),
      ],
    })
    console.log('mintNFT', mintNFT)

    await dbConnect
      .collection('profile')
      .updateOne({ accountId }, { $inc: { totalNftCollected: 1 } })

    res.json({ message: 'Success' })
  } catch (error) {
    console.log('error', error)
    res.status(400).json({ message: error.message })
  }
})

router.post(
  '/mint-nft',
  [authenticate, validate(mintValidation)],
  async (req, res) => {
    const { _id, longitude, latitude } = req.body
    const { accountId } = req
    const dbConnect = dbo.getDb()

    try {
      const nft = await dbConnect
        .collection('nft-location')
        .findOne({ _id: ObjectId(_id) })

      if (!nft) {
        throw new Error('NFT not found')
      }

      const distance = turfDistance([longitude, latitude], nft.location, {
        units: 'meters',
      })

      if (distance > 10) {
        throw new Error('You are too far from the NFT location')
      }

      const args = {
        token_series_id: nft.tokenSeriesId,
        receiver_id: accountId,
      }
      const mintNFT = await getSignerAccount().signAndSendTransaction({
        receiverId: nft.contractId,
        actions: [
          transactions.functionCall(
            'nft_mint',
            args,
            '100000000000000',
            '11280000000000000000000'
          ),
        ],
      })
      console.log('mintNFT', mintNFT)

      await dbConnect
        .collection('profile')
        .updateOne({ accountId }, { $inc: { totalNftCollected: 1 } })

      res.json({ message: 'Success' })
    } catch (error) {
      console.log('error', error)
      res.status(400).json({ message: error.message })
    }
  }
)

router.post(
  '/create-nft',
  [authenticate, validate(createnftValidation)],
  async (req, res) => {
    const { title, media, reference, copies, extra } = req.body

    try {
      if (req.accountId !== getSignerAccountName()) {
        throw new Error('You are not allowed to add nft')
      }
      const createSeries = await getContract().nft_create_series({
        args: {
          creator_id: req.accountId,
          token_metadata: {
            title: title,
            media: media,
            copies: copies,
            reference: reference,
            extra: extra,
          },
        },
        gas: '100000000000000',
        amount: '10750000000000000000000',
      })
      console.log('createSeries', createSeries)
      res.json({ message: 'Success', data: createSeries })
    } catch (error) {
      console.log('error', error)
      res.status(400).json({ message: error.message })
    }
  }
)

router.post(
  '/upload',
  [authenticate, upload.array('file')],
  async (req, res) => {
    try {
      const client = new NFTStorage({ token: process.env.NFT_STORAGE_API_KEY })
      const data = await Promise.all(
        req.files.map(async (file) => client.storeBlob(new Blob([file.buffer])))
      )
      res.json({ data: data })
    } catch (error) {
      console.log('error', error)
      res.status(400).json({ message: error.message })
    }
  }
)

module.exports = router
