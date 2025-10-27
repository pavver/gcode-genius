import tokenize from './tokenizer/src/index.js';
import fs from 'fs';
import path from 'path';

const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile) {
  console.error('Usage: node tokenize.js <input-file-path> [output-file-path]');
  process.exit(1);
}

const gcode = fs.readFileSync(inputFile, 'utf-8');

const tokens = tokenize(gcode);

const jsonOutput = JSON.stringify(tokens, null, 2);

if (outputFile) {
  fs.writeFileSync(outputFile, jsonOutput, 'utf-8');
  console.log(`Successfully wrote tokens to ${outputFile}`);
} else {
  console.log(jsonOutput);
}

// node tokenize.js tokenizer\test\test-cases\simple.txt simple.json