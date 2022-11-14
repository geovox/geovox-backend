const Cryptr = require('cryptr')

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const cryptr = new Cryptr(process.env.TOKEN_SECRET)
    const decryptedStr = cryptr.decrypt(authHeader)
    const [accountId, publicKey] = decryptedStr.split('&')

    req.accountId = accountId
    req.publicKey = publicKey
    next()
  } catch (err) {
    return res.status(401).json({
      success: 0,
      message: 'unauthorized',
    })
  }
}
