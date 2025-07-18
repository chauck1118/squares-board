import Joi from 'joi'

/**
 * Schema for updating square payment status
 */
export const updateSquarePaymentSchema = Joi.object({
  paymentStatus: Joi.string()
    .valid('PENDING', 'PAID')
    .required()
    .messages({
      'any.only': 'Payment status must be either PENDING or PAID',
      'any.required': 'Payment status is required',
    }),
})

/**
 * Schema for updating game scores
 */
export const updateGameScoreSchema = Joi.object({
  team1Score: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.base': 'Team 1 score must be a number',
      'number.integer': 'Team 1 score must be an integer',
      'number.min': 'Team 1 score must be 0 or greater',
      'any.required': 'Team 1 score is required',
    }),
  team2Score: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.base': 'Team 2 score must be a number',
      'number.integer': 'Team 2 score must be an integer',
      'number.min': 'Team 2 score must be 0 or greater',
      'any.required': 'Team 2 score is required',
    }),
  status: Joi.string()
    .valid('SCHEDULED', 'IN_PROGRESS', 'COMPLETED')
    .default('COMPLETED')
    .messages({
      'any.only': 'Status must be SCHEDULED, IN_PROGRESS, or COMPLETED',
    }),
})

/**
 * Schema for creating a new game
 */
export const createGameSchema = Joi.object({
  gameNumber: Joi.number()
    .integer()
    .min(1)
    .max(63)
    .required()
    .messages({
      'number.base': 'Game number must be a number',
      'number.integer': 'Game number must be an integer',
      'number.min': 'Game number must be at least 1',
      'number.max': 'Game number must be at most 63',
      'any.required': 'Game number is required',
    }),
  round: Joi.string()
    .valid('Round 1', 'Round 2', 'Sweet 16', 'Elite 8', 'Final 4', 'Championship')
    .required()
    .messages({
      'any.only': 'Round must be one of: Round 1, Round 2, Sweet 16, Elite 8, Final 4, Championship',
      'any.required': 'Round is required',
    }),
  team1: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Team 1 name cannot be empty',
      'string.min': 'Team 1 name must be at least 1 character',
      'string.max': 'Team 1 name must be at most 100 characters',
      'any.required': 'Team 1 name is required',
    }),
  team2: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Team 2 name cannot be empty',
      'string.min': 'Team 2 name must be at least 1 character',
      'string.max': 'Team 2 name must be at most 100 characters',
      'any.required': 'Team 2 name is required',
    }),
  scheduledTime: Joi.date()
    .required()
    .messages({
      'date.base': 'Scheduled time must be a valid date',
      'any.required': 'Scheduled time is required',
    }),
})