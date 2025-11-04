import { validateSyntax } from '../src/syntax-validator.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Syntax Validator from files', () => {
  const testCasesDir = path.join(__dirname, 'test-cases', 'syntax');
  const testFiles = fs.readdirSync(testCasesDir).filter(file => file.endsWith('.json') && !file.endsWith('.diagnostics.json'));

  const testCases = testFiles.map(file => {
    const testName = path.basename(file, '.json');
    const tokens = JSON.parse(fs.readFileSync(path.join(testCasesDir, file), 'utf-8'));
    const expectedJson = fs.readFileSync(path.join(testCasesDir, `${testName}.diagnostics.json`), 'utf-8');
    const expectedDiagnostics = JSON.parse(expectedJson);
    return [testName, tokens, expectedDiagnostics];
  });

  test.each(testCases)('should validate %s correctly', (testName, tokens, expectedDiagnostics) => {
    const diagnostics = validateSyntax(tokens);
    expect(diagnostics).toEqual(expectedDiagnostics);
  });
});