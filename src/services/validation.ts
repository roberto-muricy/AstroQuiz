/**
 * Input Validation Service
 * Validates and sanitizes API inputs
 */

import { SUPPORTED_LOCALES } from './quiz-logic';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Valid answer options
 */
export const VALID_OPTIONS = ['A', 'B', 'C', 'D'];

/**
 * Valid question levels
 */
export const VALID_LEVELS = [1, 2, 3, 4, 5];

/**
 * Phase range
 */
export const MIN_PHASE = 1;
export const MAX_PHASE = 50;

/**
 * Time constraints (ms)
 */
export const MAX_TIME_PER_QUESTION = 30000;

/**
 * Validate phase number
 */
export function validatePhaseNumber(phase: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (phase === undefined || phase === null) {
    errors.push({ field: 'phaseNumber', message: 'Phase number is required' });
  } else {
    const num = Number(phase);
    if (isNaN(num) || !Number.isInteger(num)) {
      errors.push({ field: 'phaseNumber', message: 'Phase number must be an integer' });
    } else if (num < MIN_PHASE || num > MAX_PHASE) {
      errors.push({
        field: 'phaseNumber',
        message: `Phase number must be between ${MIN_PHASE} and ${MAX_PHASE}`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate locale
 */
export function validateLocale(locale: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!locale) {
    errors.push({ field: 'locale', message: 'Locale is required' });
  } else if (!SUPPORTED_LOCALES.includes(locale)) {
    errors.push({
      field: 'locale',
      message: `Invalid locale. Supported: ${SUPPORTED_LOCALES.join(', ')}`,
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate answer option
 */
export function validateOption(option: any, fieldName = 'selectedOption'): ValidationResult {
  const errors: ValidationError[] = [];

  if (!option) {
    errors.push({ field: fieldName, message: `${fieldName} is required` });
  } else if (!VALID_OPTIONS.includes(option.toUpperCase())) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must be one of: ${VALID_OPTIONS.join(', ')}`,
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate question level
 */
export function validateLevel(level: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (level === undefined || level === null) {
    errors.push({ field: 'level', message: 'Level is required' });
  } else {
    const num = Number(level);
    if (isNaN(num) || !VALID_LEVELS.includes(num)) {
      errors.push({
        field: 'level',
        message: `Level must be one of: ${VALID_LEVELS.join(', ')}`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate time used
 */
export function validateTimeUsed(timeUsed: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (timeUsed !== undefined && timeUsed !== null) {
    const num = Number(timeUsed);
    if (isNaN(num) || num < 0) {
      errors.push({ field: 'timeUsed', message: 'Time used must be a positive number' });
    } else if (num > MAX_TIME_PER_QUESTION) {
      errors.push({
        field: 'timeUsed',
        message: `Time used cannot exceed ${MAX_TIME_PER_QUESTION}ms`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate session ID format
 */
export function validateSessionId(sessionId: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!sessionId) {
    errors.push({ field: 'sessionId', message: 'Session ID is required' });
  } else if (typeof sessionId !== 'string') {
    errors.push({ field: 'sessionId', message: 'Session ID must be a string' });
  } else if (!sessionId.startsWith('quiz_')) {
    errors.push({ field: 'sessionId', message: 'Invalid session ID format' });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate question ID
 */
export function validateQuestionId(questionId: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (questionId !== undefined && questionId !== null) {
    const num = Number(questionId);
    if (isNaN(num) || num <= 0 || !Number.isInteger(num)) {
      errors.push({ field: 'questionId', message: 'Question ID must be a positive integer' });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate Firebase UID
 */
export function validateFirebaseUid(uid: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!uid) {
    errors.push({ field: 'firebaseUid', message: 'Firebase UID is required' });
  } else if (typeof uid !== 'string') {
    errors.push({ field: 'firebaseUid', message: 'Firebase UID must be a string' });
  } else if (uid.length < 10 || uid.length > 128) {
    errors.push({ field: 'firebaseUid', message: 'Invalid Firebase UID format' });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate question text fields
 */
export function validateQuestionData(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields for new questions
  if (!data.question || typeof data.question !== 'string' || data.question.trim().length < 10) {
    errors.push({ field: 'question', message: 'Question text must be at least 10 characters' });
  }

  // Validate options
  for (const opt of ['optionA', 'optionB', 'optionC', 'optionD']) {
    if (!data[opt] || typeof data[opt] !== 'string' || data[opt].trim().length === 0) {
      errors.push({ field: opt, message: `${opt} is required` });
    }
  }

  // Validate correct option
  if (data.correctOption) {
    const optResult = validateOption(data.correctOption, 'correctOption');
    errors.push(...optResult.errors);
  }

  // Validate level if provided
  if (data.level !== undefined) {
    const levelResult = validateLevel(data.level);
    errors.push(...levelResult.errors);
  }

  // Validate locale if provided
  if (data.locale) {
    const localeResult = validateLocale(data.locale);
    errors.push(...localeResult.errors);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Combine multiple validation results
 */
export function combineValidations(...results: ValidationResult[]): ValidationResult {
  const allErrors: ValidationError[] = [];
  for (const result of results) {
    allErrors.push(...result.errors);
  }
  return { valid: allErrors.length === 0, errors: allErrors };
}

/**
 * Format validation errors for API response
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map((e) => `${e.field}: ${e.message}`).join('; ');
}
