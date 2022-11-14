const express = require('express')
const Cryptr = require('cryptr')
const nearSeedPhrase = require('near-seed-phrase')

const { getDb } = require('../db/conn')
const { checkAccount, createAccount } = require('../lib/near')
const { validate } = require('express-validation')
const { registerValidation, loginValidation } = require('../utils/validator')
const { levellingTier } = require('../utils')

const router = express.Router()
const crypt = new Cryptr(process.env.TOKEN_SECRET)

router.post('/register', validate(registerValidation), async (req, res) => {
  const { accountId, email } = req.body
  try {
    const accExist = await checkAccount(accountId)
    if (accExist) throw new Error('Username already exists')

    const credExist = await getDb()
      .collection('credential')
      .findOne({ email: email })
    if (credExist) throw new Error('Email already taken')

    const { seedPhrase, secretKey, publicKey } =
      nearSeedPhrase.generateSeedPhrase()
    const receipt = await createAccount({
      accountId: accountId,
      secretKey: secretKey,
    })
    const createdAccountId = receipt.transaction.receiver_id

    await getDb().collection('credential').insertOne({
      accountId: createdAccountId,
      publicKey: publicKey,
      email: email,
      createdAt: new Date().getTime(),
      updatedAt: new Date().getTime(),
    })

    await getDb().collection('profile').insertOne({
      accountId: createdAccountId,
      createdAt: new Date().getTime(),
      updatedAt: new Date().getTime(),
      totalNftCollected: 0,
    })

    const token = crypt.encrypt(`${createdAccountId}&${secretKey}`)

    res.json({
      accountId: createdAccountId,
      email: email,
      seedPhrase: seedPhrase,
      token: token,
    })
  } catch (error) {
    console.log('error', error)
    res.status(400).json({ message: error.message })
  }
})

router.post('/login', validate(loginValidation), async (req, res) => {
  const { accountId, seed } = req.body
  try {
    const { secretKey, publicKey } = nearSeedPhrase.parseSeedPhrase(seed)
    const accExist = await getDb().collection('credential').findOne({
      accountId: accountId,
      publicKey: publicKey,
    })
    if (!accExist) throw new Error('Invalid username/seed')

    const token = crypt.encrypt(`${accountId}&${secretKey}`)

    res.json({
      accountId: accountId,
      email: accExist.email,
      token: token,
    })
  } catch (error) {
    console.log('error', error)
    res.status(400).json({ message: error.message })
  }
})

router.get('/profile', async (req, res) => {
  const { accountId } = req.query
  try {
    const profile = await getDb()
      .collection('profile')
      .findOne({ accountId: accountId })
    if (!profile) throw new Error('Profile not found')

    const level = levellingTier(profile.totalNftCollected)

    res.json({ ...profile, ...level })
  } catch (error) {
    console.log('error', error)
    res.status(400).json({ message: error.message })
  }
})

module.exports = router
