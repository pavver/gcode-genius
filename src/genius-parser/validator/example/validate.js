import { Validator } from '../src/index.js';
import fs from 'fs';
import path from 'path';

const inputFile = "simple.json";
const outputFile = "simple.diagnostics.json";
const gcodeDatabaseFile = "gcode-database.json";

const gcodeDatabase = JSON.parse(fs.readFileSync(gcodeDatabaseFile, 'utf-8'));

const validator = new Validator(gcodeDatabase);

const tokens = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));

const result = validator.getDiagnostics(tokens, "grbl");

const jsonOutput = JSON.stringify(result, null, 2);

if (outputFile) {
  fs.writeFileSync(outputFile, jsonOutput, 'utf-8');
  console.log(`Successfully wrote result to ${outputFile}`);
} else {
  console.log(jsonOutput);
}

// node validate.js
