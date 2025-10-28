import { Validator } from '../src/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Validator with dynamic database tests', () => {
  const testCasesRoot = path.join(__dirname, 'test-cases');

  // Find all subdirectories in the test-cases directory
  const scenarios = fs.readdirSync(testCasesRoot, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  // Dynamically create a test suite for each scenario (subdirectory)
  scenarios.forEach(scenario => {
    describe(`Scenario: ${scenario}`, () => {
      const scenarioDir = path.join(testCasesRoot, scenario);
      const dbPath = path.join(scenarioDir, 'gcode-database.json');

      // Check if the database file exists for the scenario
      if (!fs.existsSync(dbPath)) {
        // Skip this describe block if no database is found
        console.warn(`Skipping scenario "${scenario}" - gcode-database.json not found.`);
        return;
      }

      const gcodeDatabase = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      const validator = new Validator(gcodeDatabase);

      // Find all test input files in the scenario directory
      const testFiles = fs.readdirSync(scenarioDir)
        .filter(file => file.endsWith('.json') && !file.endsWith('.diagnostics.json') && file !== 'gcode-database.json');

      // Run a test for each input file
      test.each(testFiles)('should validate %s correctly', (file) => {
        const testName = path.basename(file, '.json');
        const inputFile = path.join(scenarioDir, file);
        const expectedFile = path.join(scenarioDir, `${testName}.diagnostics.json`);

        const commands = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
        const expectedDiagnostics = JSON.parse(fs.readFileSync(expectedFile, 'utf-8'));

        const diagnostics = validator.getDiagnostics(commands);
        expect(diagnostics).toEqual(expectedDiagnostics);
      });
    });
  });
});
