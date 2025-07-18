import Joi from 'joi';

export const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'Please enter a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required',
    }),
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.empty': 'Password is required',
      'any.required': 'Password is required',
    }),
});

export const registerSchema = Joi.object({
  displayName: Joi.string()
    .min(2)
    .max(50)
    .trim()
    .required()
    .messages({
      'string.min': 'Display name must be at least 2 characters long',
      'string.max': 'Display name cannot exceed 50 characters',
      'string.empty': 'Display name is required',
      'any.required': 'Display name is required',
    }),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Please enter a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required',
    }),
  password: Joi.string()
    .min(6)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'string.empty': 'Password is required',
      'any.required': 'Password is required',
    }),
});

export const boardCreationSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.min': 'Board name must be at least 3 characters long',
      'string.max': 'Board name cannot exceed 100 characters',
      'string.empty': 'Board name is required',
      'any.required': 'Board name is required',
    }),
  pricePerSquare: Joi.number()
    .positive()
    .precision(2)
    .min(0.01)
    .max(1000)
    .required()
    .messages({
      'number.positive': 'Price per square must be greater than 0',
      'number.min': 'Price per square must be at least $0.01',
      'number.max': 'Price per square cannot exceed $1,000',
      'any.required': 'Price per square is required',
    }),
  payoutStructure: Joi.object({
    round1: Joi.number().min(0).precision(2).required(),
    round2: Joi.number().min(0).precision(2).required(),
    sweet16: Joi.number().min(0).precision(2).required(),
    elite8: Joi.number().min(0).precision(2).required(),
    final4: Joi.number().min(0).precision(2).required(),
    championship: Joi.number().min(0).precision(2).required(),
  }).required().messages({
    'any.required': 'Payout structure is required',
  }),
});

export const squareClaimSchema = Joi.object({
  numberOfSquares: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .required()
    .messages({
      'number.integer': 'Number of squares must be a whole number',
      'number.min': 'You must claim at least 1 square',
      'number.max': 'You cannot claim more than 10 squares per board',
      'any.required': 'Number of squares is required',
    }),
});

export const gameScoreSchema = Joi.object({
  team1Score: Joi.number()
    .integer()
    .min(0)
    .max(200)
    .allow(null)
    .messages({
      'number.integer': 'Score must be a whole number',
      'number.min': 'Score cannot be negative',
      'number.max': 'Score cannot exceed 200',
    }),
  team2Score: Joi.number()
    .integer()
    .min(0)
    .max(200)
    .allow(null)
    .messages({
      'number.integer': 'Score must be a whole number',
      'number.min': 'Score cannot be negative',
      'number.max': 'Score cannot exceed 200',
    }),
});

export const gameCreationSchema = Joi.object({
  gameNumber: Joi.number()
    .integer()
    .min(1)
    .max(63)
    .required()
    .messages({
      'number.integer': 'Game number must be a whole number',
      'number.min': 'Game number must be at least 1',
      'number.max': 'Game number cannot exceed 63',
      'any.required': 'Game number is required',
    }),
  round: Joi.string()
    .valid('ROUND1', 'ROUND2', 'SWEET16', 'ELITE8', 'FINAL4', 'CHAMPIONSHIP')
    .required()
    .messages({
      'any.only': 'Round must be one of: ROUND1, ROUND2, SWEET16, ELITE8, FINAL4, CHAMPIONSHIP',
      'any.required': 'Round is required',
    }),
  team1: Joi.string()
    .min(2)
    .max(50)
    .trim()
    .required()
    .messages({
      'string.min': 'Team name must be at least 2 characters long',
      'string.max': 'Team name cannot exceed 50 characters',
      'string.empty': 'Team 1 name is required',
      'any.required': 'Team 1 name is required',
    }),
  team2: Joi.string()
    .min(2)
    .max(50)
    .trim()
    .required()
    .messages({
      'string.min': 'Team name must be at least 2 characters long',
      'string.max': 'Team name cannot exceed 50 characters',
      'string.empty': 'Team 2 name is required',
      'any.required': 'Team 2 name is required',
    }),
  scheduledTime: Joi.date()
    .iso()
    .min('now')
    .required()
    .messages({
      'date.min': 'Scheduled time must be in the future',
      'any.required': 'Scheduled time is required',
    }),
});

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  firstError?: string;
}

export const validateForm = <T>(schema: Joi.ObjectSchema<T>, data: T): ValidationResult => {
  const { error } = schema.validate(data, { abortEarly: false });
  
  if (!error) {
    return { isValid: true, errors: {} };
  }

  const errors: Record<string, string> = {};
  error.details.forEach((detail) => {
    const key = detail.path.join('.');
    if (!errors[key]) { // Only set first error for each field
      errors[key] = detail.message;
    }
  });

  const firstError = Object.values(errors)[0];

  return { 
    isValid: false, 
    errors, 
    firstError 
  };
};

export const validateField = <T>(schema: Joi.ObjectSchema<T>, data: T, fieldName: string): string | null => {
  const { error } = schema.validate(data, { abortEarly: false });
  
  if (!error) {
    return null;
  }

  const fieldError = error.details.find(detail => detail.path.join('.') === fieldName);
  return fieldError ? fieldError.message : null;
};

// Real-time validation for individual fields
export const createFieldValidator = <T>(schema: Joi.ObjectSchema<T>) => {
  return (data: T, fieldName: string): string | null => {
    return validateField(schema, data, fieldName);
  };
};