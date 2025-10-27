import tokenize from '../src/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Tokenizer from files', () => {
  const testCasesDir = path.join(__dirname, 'test-cases');
  const testFiles = fs.readdirSync(testCasesDir).filter(file => file.endsWith('.txt'));

  const testCases = testFiles.map(file => {
    const testName = path.basename(file, '.txt');
    const gcode = fs.readFileSync(path.join(testCasesDir, file), 'utf-8');
    const expectedJson = fs.readFileSync(path.join(testCasesDir, `${testName}.json`), 'utf-8');
    const expectedTokens = JSON.parse(expectedJson);
    return [testName, gcode, expectedTokens];
  });

  test.each(testCases)('should tokenize %s correctly', (testName, gcode, expectedTokens) => {
    const tokens = tokenize(gcode, 0);
    expect(tokens).toEqual(expectedTokens);
  });
});
