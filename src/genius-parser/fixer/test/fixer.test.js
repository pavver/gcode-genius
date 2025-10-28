import { canFix, fixError, fixAllErrors } from '../src/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Fixer Module', () => {
  describe('canFix', () => {
    const testCasesDir = path.join(__dirname, 'test-cases', 'canFix');
    const testFiles = fs.readdirSync(testCasesDir).filter(file => file.endsWith('.json'));

    test.each(testFiles)('should return correct boolean for %s', (file) => {
      const diagnostic = JSON.parse(fs.readFileSync(path.join(testCasesDir, file), 'utf-8'));
      const expected = file === 'fixable.json';
      const result = canFix(diagnostic);
      expect(result).toBe(expected);
    });
  });

  describe('fixError', () => {
    const testCasesDir = path.join(__dirname, 'test-cases', 'fixError');
    const testFiles = fs.readdirSync(testCasesDir).filter(file => file.endsWith('.json'));

    test.each(testFiles)('should fix the error for %s', (file) => {
      const testCase = JSON.parse(fs.readFileSync(path.join(testCasesDir, file), 'utf-8'));
      const { gcodeLine, diagnostic, expected } = testCase;
      const result = fixError(gcodeLine, diagnostic);
      expect(result).toEqual(expected);
    });
  });

  describe('fixAllErrors', () => {
    const testCasesDir = path.join(__dirname, 'test-cases', 'fixAllErrors');
    const testFiles = fs.readdirSync(testCasesDir).filter(file => file.endsWith('.json'));

    test.each(testFiles)('should fix all errors for %s', (file) => {
      const testCase = JSON.parse(fs.readFileSync(path.join(testCasesDir, file), 'utf-8'));
      const { gcodeLine, diagnostics, expected } = testCase;
      const result = fixAllErrors(gcodeLine, diagnostics);
      expect(result).toEqual(expected);
    });
  });
});
