const { Joi } = require('express-validation')
Joi.objectId = require('joi-objectid')(Joi)

const mintValidation = {
  body: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
    _id: Joi.objectId().required(),
  }),
}

const registerValidation = {
  body: Joi.object({
    accountId: Joi.string().required(),
    email: Joi.string().email().required(),
  }),
}

const loginValidation = {
  body: Joi.object({
    accountId: Joi.string().required(),
    seed: Joi.string().required(),
  }),
}

const createnftValidation = {
  body: Joi.object({
    title: Joi.string().required(),
    media: Joi.string().required(),
    reference: Joi.string().required(),
    copies: Joi.number().required(),
    extra: Joi.string().required(),
  }),
}

module.exports = {
  mintValidation,
  registerValidation,
  loginValidation,
  createnftValidation,
}
