/**
 * Validation Service Tests
 */

import {
  validatePhaseNumber,
  validateLocale,
  validateOption,
  validateLevel,
  validateTimeUsed,
  validateSessionId,
  validateQuestionId,
  validateFirebaseUid,
  validateQuestionData,
  combineValidations,
  formatValidationErrors,
} from '../validation';

describe('Validation Service', () => {
  describe('validatePhaseNumber', () => {
    it('should accept valid phase numbers (1-50)', () => {
      expect(validatePhaseNumber(1).valid).toBe(true);
      expect(validatePhaseNumber(25).valid).toBe(true);
      expect(validatePhaseNumber(50).valid).toBe(true);
    });

    it('should reject phase numbers below 1', () => {
      const result = validatePhaseNumber(0);
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('phaseNumber');
    });

    it('should reject phase numbers above 50', () => {
      const result = validatePhaseNumber(51);
      expect(result.valid).toBe(false);
    });

    it('should reject non-integer values', () => {
      expect(validatePhaseNumber(1.5).valid).toBe(false);
      expect(validatePhaseNumber('abc').valid).toBe(false);
    });

    it('should reject null/undefined', () => {
      expect(validatePhaseNumber(null).valid).toBe(false);
      expect(validatePhaseNumber(undefined).valid).toBe(false);
    });
  });

  describe('validateLocale', () => {
    it('should accept supported locales', () => {
      expect(validateLocale('en').valid).toBe(true);
      expect(validateLocale('pt').valid).toBe(true);
      expect(validateLocale('es').valid).toBe(true);
      expect(validateLocale('fr').valid).toBe(true);
    });

    it('should reject unsupported locales', () => {
      const result = validateLocale('jp');
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Invalid locale');
    });

    it('should reject empty/null locale', () => {
      expect(validateLocale('').valid).toBe(false);
      expect(validateLocale(null).valid).toBe(false);
    });
  });

  describe('validateOption', () => {
    it('should accept valid options A-D', () => {
      expect(validateOption('A').valid).toBe(true);
      expect(validateOption('B').valid).toBe(true);
      expect(validateOption('C').valid).toBe(true);
      expect(validateOption('D').valid).toBe(true);
    });

    it('should accept lowercase options', () => {
      expect(validateOption('a').valid).toBe(true);
      expect(validateOption('b').valid).toBe(true);
    });

    it('should reject invalid options', () => {
      expect(validateOption('E').valid).toBe(false);
      expect(validateOption('X').valid).toBe(false);
      expect(validateOption('1').valid).toBe(false);
    });
  });

  describe('validateLevel', () => {
    it('should accept valid levels 1-5', () => {
      expect(validateLevel(1).valid).toBe(true);
      expect(validateLevel(3).valid).toBe(true);
      expect(validateLevel(5).valid).toBe(true);
    });

    it('should reject invalid levels', () => {
      expect(validateLevel(0).valid).toBe(false);
      expect(validateLevel(6).valid).toBe(false);
      expect(validateLevel(-1).valid).toBe(false);
    });
  });

  describe('validateTimeUsed', () => {
    it('should accept valid time values', () => {
      expect(validateTimeUsed(0).valid).toBe(true);
      expect(validateTimeUsed(15000).valid).toBe(true);
      expect(validateTimeUsed(30000).valid).toBe(true);
    });

    it('should reject negative values', () => {
      expect(validateTimeUsed(-100).valid).toBe(false);
    });

    it('should reject values over 30000ms', () => {
      expect(validateTimeUsed(35000).valid).toBe(false);
    });

    it('should allow undefined (optional field)', () => {
      expect(validateTimeUsed(undefined).valid).toBe(true);
    });
  });

  describe('validateSessionId', () => {
    it('should accept valid session IDs', () => {
      expect(validateSessionId('quiz_123456_abc').valid).toBe(true);
      expect(validateSessionId('quiz_1234567890_xyz123').valid).toBe(true);
    });

    it('should reject invalid format', () => {
      expect(validateSessionId('invalid').valid).toBe(false);
      expect(validateSessionId('session_123').valid).toBe(false);
      expect(validateSessionId('').valid).toBe(false);
    });
  });

  describe('validateQuestionId', () => {
    it('should accept valid question IDs', () => {
      expect(validateQuestionId(1).valid).toBe(true);
      expect(validateQuestionId(12345).valid).toBe(true);
    });

    it('should reject invalid IDs', () => {
      expect(validateQuestionId(0).valid).toBe(false);
      expect(validateQuestionId(-1).valid).toBe(false);
      expect(validateQuestionId(1.5).valid).toBe(false);
    });

    it('should allow undefined (optional field)', () => {
      expect(validateQuestionId(undefined).valid).toBe(true);
    });
  });

  describe('validateFirebaseUid', () => {
    it('should accept valid Firebase UIDs', () => {
      expect(validateFirebaseUid('abc123def456ghi789').valid).toBe(true);
      expect(validateFirebaseUid('A'.repeat(28)).valid).toBe(true);
    });

    it('should reject too short UIDs', () => {
      expect(validateFirebaseUid('short').valid).toBe(false);
    });

    it('should reject empty/null', () => {
      expect(validateFirebaseUid('').valid).toBe(false);
      expect(validateFirebaseUid(null).valid).toBe(false);
    });
  });

  describe('validateQuestionData', () => {
    const validQuestion = {
      question: 'What is the largest planet in our solar system?',
      optionA: 'Mars',
      optionB: 'Jupiter',
      optionC: 'Saturn',
      optionD: 'Neptune',
      correctOption: 'B',
      level: 1,
      locale: 'en',
    };

    it('should accept valid question data', () => {
      expect(validateQuestionData(validQuestion).valid).toBe(true);
    });

    it('should reject question text too short', () => {
      const result = validateQuestionData({ ...validQuestion, question: 'Short?' });
      expect(result.valid).toBe(false);
    });

    it('should reject missing options', () => {
      const { optionA, ...noOptionA } = validQuestion;
      const result = validateQuestionData(noOptionA);
      expect(result.valid).toBe(false);
    });

    it('should reject invalid correct option', () => {
      const result = validateQuestionData({ ...validQuestion, correctOption: 'X' });
      expect(result.valid).toBe(false);
    });
  });

  describe('combineValidations', () => {
    it('should combine multiple valid results', () => {
      const result = combineValidations(
        validatePhaseNumber(1),
        validateLocale('pt')
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should combine multiple errors', () => {
      const result = combineValidations(
        validatePhaseNumber(100),
        validateLocale('invalid')
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('formatValidationErrors', () => {
    it('should format errors as string', () => {
      const errors = [
        { field: 'phaseNumber', message: 'Must be 1-50' },
        { field: 'locale', message: 'Invalid locale' },
      ];
      const formatted = formatValidationErrors(errors);
      expect(formatted).toContain('phaseNumber');
      expect(formatted).toContain('locale');
    });
  });
});
