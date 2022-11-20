const express = require('express')
const dbo = require('./../db/conn')
const { Decimal128 } = require('bson')
const authenticate = require('../middleware/authenticate')
const { getSignerAccountName } = require('../lib/near')

const router = express.Router()

const generateNearestLocation = ({ latitude, longitude }) => {
  return new Array(3).fill(0).map((item, idx) => {
    return {
      latitude:
        parseFloat(latitude) + (Math.random() - 0.5) * (idx * 10 + 1) * 0.0001,
      longitude:
        parseFloat(longitude) + (Math.random() - 0.5) * (idx * 10 + 1) * 0.0001,
    }
  })
}

router.get('/locations', async (req, res) => {
  // default radius is 1000km
  const { latitude, longitude, radius = 1000000 } = req.query
  const dbConnect = dbo.getDb()

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
    .limit(30)
    .toArray((err, results) => {
      if (err) {
        console.log('err', err)
        res.status(400).send('Error fetching locations!')
      } else {
        res.json({ results, latitude, longitude, radius })
      }
    })
})

router.get('/locations-onboard', authenticate, async (req, res) => {
  const { latitude, longitude } = req.query

  const dbConnect = dbo.getDb()

  try {
    const profile = await dbConnect
      .collection('profile')
      .findOne({ accountId: req.accountId })

    if (profile?.totalNftCollected >= 3) {
      res.json({ results: [] })
    }

    const detail = await dbConnect.collection('nft-onboarding').find().toArray()

    const nearestLocation = generateNearestLocation({ longitude, latitude })
    const locations = detail.map((item, idx) => {
      return {
        ...item,
        longitude: nearestLocation[idx].longitude,
        latitude: nearestLocation[idx].latitude,
        location: {
          type: 'Point',
          coordinates: [
            nearestLocation[idx].longitude,
            nearestLocation[idx].latitude,
          ],
        },
      }
    })

    res.json({ results: locations })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
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
