const express = require('express')
const { validate } = require('express-validation')
const { ObjectId } = require('mongodb')
const { getContract } = require('../lib/near')
const authenticate = require('../middleware/authenticate')
const { mintValidation } = require('../utils/validator')
const dbo = require('./../db/conn')
const turfDistance = require('@turf/distance').default

const router = express.Router()

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

      const mintNFT = await getContract().nft_mint({
        args: {
          token_series_id: nft.tokenSeriesId,
          receiver_id: accountId,
        },
        gas: '100000000000000',
        amount: '11280000000000000000000',
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

module.exports = router
