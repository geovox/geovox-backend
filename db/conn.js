const { MongoClient } = require('mongodb')
const connectionString = process.env.ATLAS_URI
const client = new MongoClient(connectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
const dbName = process.env.DATABASE_NAME

let dbConnection

module.exports = {
  connectToServer: (callback) => {
    client.connect((err, db) => {
      if (err || !db) {
        return callback(err)
      }

      dbConnection = db.db(dbName)
      console.log('Successfully connected to MongoDB.')

      return callback()
    })
  },

  connectToServerScript: async () => {
    await client.connect()
    return client.db(dbName)
  },

  getDb: () => dbConnection,
}
