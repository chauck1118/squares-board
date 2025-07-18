import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  boardCreationSchema,
  squareClaimSchema,
  gameScoreSchema,
  gameCreationSchema,
  validateForm,
  validateField,
  createFieldValidator,
} from '../utils/validation';

describe('Validation Schemas', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const { error } = loginSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      };

      const { error } = loginSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['email']);
    });

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '123',
      };

      const { error } = loginSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['password']);
    });

    it('should reject empty fields', () => {
      const invalidData = {
        email: '',
        password: '',
      };

      const { error } = loginSchema.validate(invalidData, { abortEarly: false });
      expect(error).toBeDefined();
      expect(error?.details).toHaveLength(2);
    });
  });

  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        displayName: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
      };

      const { error } = registerSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject short display name', () => {
      const invalidData = {
        displayName: 'J',
        email: 'john@example.com',
        password: 'Password123',
      };

      const { error } = registerSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['displayName']);
    });

    it('should reject long display name', () => {
      const invalidData = {
        displayName: 'A'.repeat(51),
        email: 'john@example.com',
        password: 'Password123',
      };

      const { error } = registerSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['displayName']);
    });

    it('should reject weak password', () => {
      const invalidData = {
        displayName: 'John Doe',
        email: 'john@example.com',
        password: 'password', // No uppercase or number
      };

      const { error } = registerSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['password']);
    });

    it('should trim and lowercase email', () => {
      const data = {
        displayName: 'John Doe',
        email: '  JOHN@EXAMPLE.COM  ',
        password: 'Password123',
      };

      const { value } = registerSchema.validate(data);
      expect(value.email).toBe('john@example.com');
    });

    it('should trim display name', () => {
      const data = {
        displayName: '  John Doe  ',
        email: 'john@example.com',
        password: 'Password123',
      };

      const { value } = registerSchema.validate(data);
      expect(value.displayName).toBe('John Doe');
    });
  });

  describe('boardCreationSchema', () => {
    it('should validate correct board data', () => {
      const validData = {
        name: 'March Madness 2024',
        pricePerSquare: 10.50,
        payoutStructure: {
          round1: 25,
          round2: 50,
          sweet16: 100,
          elite8: 200,
          final4: 400,
          championship: 800,
        },
      };

      const { error } = boardCreationSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject short board name', () => {
      const invalidData = {
        name: 'MM',
        pricePerSquare: 10,
        payoutStructure: {
          round1: 25,
          round2: 50,
          sweet16: 100,
          elite8: 200,
          final4: 400,
          championship: 800,
        },
      };

      const { error } = boardCreationSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['name']);
    });

    it('should reject negative price', () => {
      const invalidData = {
        name: 'March Madness 2024',
        pricePerSquare: -5,
        payoutStructure: {
          round1: 25,
          round2: 50,
          sweet16: 100,
          elite8: 200,
          final4: 400,
          championship: 800,
        },
      };

      const { error } = boardCreationSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['pricePerSquare']);
    });

    it('should reject missing payout structure fields', () => {
      const invalidData = {
        name: 'March Madness 2024',
        pricePerSquare: 10,
        payoutStructure: {
          round1: 25,
          // Missing other fields
        },
      };

      const { error } = boardCreationSchema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('squareClaimSchema', () => {
    it('should validate correct square claim', () => {
      const validData = {
        numberOfSquares: 5,
      };

      const { error } = squareClaimSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject zero squares', () => {
      const invalidData = {
        numberOfSquares: 0,
      };

      const { error } = squareClaimSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject more than 10 squares', () => {
      const invalidData = {
        numberOfSquares: 11,
      };

      const { error } = squareClaimSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject non-integer values', () => {
      const invalidData = {
        numberOfSquares: 5.5,
      };

      const { error } = squareClaimSchema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('gameScoreSchema', () => {
    it('should validate correct scores', () => {
      const validData = {
        team1Score: 75,
        team2Score: 68,
      };

      const { error } = gameScoreSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should allow null scores', () => {
      const validData = {
        team1Score: null,
        team2Score: null,
      };

      const { error } = gameScoreSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject negative scores', () => {
      const invalidData = {
        team1Score: -5,
        team2Score: 68,
      };

      const { error } = gameScoreSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject unrealistic high scores', () => {
      const invalidData = {
        team1Score: 250,
        team2Score: 68,
      };

      const { error } = gameScoreSchema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('gameCreationSchema', () => {
    it('should validate correct game data', () => {
      const validData = {
        gameNumber: 1,
        round: 'ROUND1',
        team1: 'Duke',
        team2: 'UNC',
        scheduledTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      };

      const { error } = gameCreationSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject invalid round', () => {
      const invalidData = {
        gameNumber: 1,
        round: 'INVALID_ROUND',
        team1: 'Duke',
        team2: 'UNC',
        scheduledTime: new Date(Date.now() + 86400000).toISOString(),
      };

      const { error } = gameCreationSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['round']);
    });

    it('should reject past scheduled time', () => {
      const invalidData = {
        gameNumber: 1,
        round: 'ROUND1',
        team1: 'Duke',
        team2: 'UNC',
        scheduledTime: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      };

      const { error } = gameCreationSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['scheduledTime']);
    });

    it('should reject short team names', () => {
      const invalidData = {
        gameNumber: 1,
        round: 'ROUND1',
        team1: 'D',
        team2: 'UNC',
        scheduledTime: new Date(Date.now() + 86400000).toISOString(),
      };

      const { error } = gameCreationSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['team1']);
    });
  });
});

describe('Validation Utilities', () => {
  describe('validateForm', () => {
    it('should return valid result for correct data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = validateForm(loginSchema, validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
      expect(result.firstError).toBeUndefined();
    });

    it('should return errors for invalid data', () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123',
      };

      const result = validateForm(loginSchema, invalidData);

      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors)).toHaveLength(2);
      expect(result.firstError).toBeDefined();
    });

    it('should return first error only for each field', () => {
      const invalidData = {
        email: '',
        password: '',
      };

      const result = validateForm(loginSchema, invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBeDefined();
      expect(result.errors.password).toBeDefined();
    });
  });

  describe('validateField', () => {
    it('should return null for valid field', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = validateField(loginSchema, validData, 'email');
      expect(result).toBeNull();
    });

    it('should return error message for invalid field', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      };

      const result = validateField(loginSchema, invalidData, 'email');
      expect(result).toBe('Please enter a valid email address');
    });

    it('should return null for field not in error', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      };

      const result = validateField(loginSchema, invalidData, 'password');
      expect(result).toBeNull();
    });
  });

  describe('createFieldValidator', () => {
    it('should create a field validator function', () => {
      const validator = createFieldValidator(loginSchema);
      
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = validator(validData, 'email');
      expect(result).toBeNull();
    });

    it('should validate specific field with created validator', () => {
      const validator = createFieldValidator(loginSchema);
      
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      };

      const result = validator(invalidData, 'email');
      expect(result).toBe('Please enter a valid email address');
    });
  });
});