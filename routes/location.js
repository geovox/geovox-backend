const express = require('express')
const dbo = require('./../db/conn')
const { Decimal128 } = require('bson')
const authenticate = require('../middleware/authenticate')
const { getSignerAccountName } = require('../lib/near')

const router = express.Router()

router.get('/locations', async (req, res) => {
  const dbConnect = dbo.getDb()
  const { latitude, longitude, radius } = req.query

  const aggregationMatch = []

  if (latitude && longitude && radius) {
    aggregationMatch.push({
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [
            Decimal128.fromString(longitude),
            Decimal128.fromString(latitude),
          ],
        },
        distanceField: 'distanceCalculated',
        maxDistance: parseInt(radius),
        spherical: true,
      },
    })
  }

  aggregationMatch.push({
    $addFields: {
      longitude: { $toString: '$longitude' },
      latitude: { $toString: '$latitude' },
      location: {
        type: 'Point',
        coordinates: [{ $toString: '$longitude' }, { $toString: '$latitude' }],
      },
    },
  })

  dbConnect
    .collection('nft-location')
    .aggregate(aggregationMatch)
    .limit(50)
    .toArray((err, results) => {
      if (err) {
        console.log('err', err)
        res.status(400).send('Error fetching locations!')
      } else {
        res.json({ results, latitude, longitude, radius })
      }
    })
})

router.post('/locations', authenticate, async (req, res) => {
  const dbConnect = dbo.getDb()

  try {
    if (req.accountId !== getSignerAccountName()) {
      throw new Error('You are not allowed to add locations')
    }

    await dbConnect.collection('nft-location').updateMany(
      {},
      [
        {
          $set: {
            location: {
              type: 'Point',
              coordinates: ['$longitude', '$latitude'],
            },
          },
        },
      ],
      (err) => {
        if (err) {
          res.status(400).send('Error update locations!')
        } else {
          res.json({ message: 'success' })
        }
      }
    )
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

module.exports = router
