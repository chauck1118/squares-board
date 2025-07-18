import Joi from 'joi'

/**
 * Schema for creating a new board
 */
export const createBoardSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Board name is required',
      'string.min': 'Board name must be at least 1 character long',
      'string.max': 'Board name must be less than 100 characters',
    }),
  
  pricePerSquare: Joi.number()
    .positive()
    .precision(2)
    .required()
    .messages({
      'number.positive': 'Price per square must be a positive number',
      'any.required': 'Price per square is required',
    }),
  
  payoutStructure: Joi.object({
    round1: Joi.number().positive().precision(2).required(),
    round2: Joi.number().positive().precision(2).required(),
    sweet16: Joi.number().positive().precision(2).required(),
    elite8: Joi.number().positive().precision(2).required(),
    final4: Joi.number().positive().precision(2).required(),
    championship: Joi.number().positive().precision(2).required(),
  }).required().messages({
    'any.required': 'Payout structure is required',
  }),
})

/**
 * Schema for claiming squares on a board
 */
export const claimSquaresSchema = Joi.object({
  numberOfSquares: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .required()
    .messages({
      'number.base': 'Number of squares must be a number',
      'number.integer': 'Number of squares must be a whole number',
      'number.min': 'Must claim at least 1 square',
      'number.max': 'Cannot claim more than 10 squares',
      'any.required': 'Number of squares is required',
    }),
})

/**
 * Schema for updating board status (admin only)
 */
export const updateBoardStatusSchema = Joi.object({
  status: Joi.string()
    .valid('OPEN', 'FILLED', 'ASSIGNED', 'ACTIVE', 'COMPLETED')
    .required()
    .messages({
      'any.only': 'Status must be one of: OPEN, FILLED, ASSIGNED, ACTIVE, COMPLETED',
      'any.required': 'Status is required',
    }),
})