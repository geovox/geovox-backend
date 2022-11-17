require('dotenv').config()

const express = require('express')
const { ValidationError } = require('express-validation')
const dbo = require('./db/conn')
const { init } = require('./lib/near')

const app = express()
const port = process.env.PORT || 7777

app.use(express.json())
app.use(require('./routes/location'))
app.use(require('./routes/nft'))
app.use(require('./routes/auth'))

app.use((err, req, next, res) => {
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json(err)
  }

  return req.status(500).json(err)
})

dbo.connectToServer(async (err) => {
  if (err) {
    console.error(err)
    process.exit()
  }

  await init()

  app.listen(port, () => {
    console.log(`Server is running on port: ${port}`)
  })
})
