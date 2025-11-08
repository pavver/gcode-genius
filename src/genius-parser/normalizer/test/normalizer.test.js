import normalizeToken from '../src/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Normalizer from files', () => {
  const testCasesDir = path.join(__dirname, 'test-cases');
  const inputFile = path.join(testCasesDir, 'normalization.json');
  const expectedFile = path.join(testCasesDir, 'normalization.expected.json');

  const inputTokens = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  const expectedTokens = JSON.parse(fs.readFileSync(expectedFile, 'utf-8'));

  test('should normalize tokens correctly', () => {
    const normalizedTokens = inputTokens.map(token => normalizeToken(token));
    expect(normalizedTokens).toEqual(expectedTokens);
  });
});
