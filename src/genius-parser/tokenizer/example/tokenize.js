import tokenize from '../src/index.js';
import fs from 'fs';

const inputFile = "simple.txt";
const outputFile = "simple.json";

const gcode = fs.readFileSync(inputFile, 'utf-8');

const tokens = tokenize(gcode);

const jsonOutput = JSON.stringify(tokens, null, 2);

fs.writeFileSync(outputFile, jsonOutput, 'utf-8');
console.log(`Successfully wrote tokens to ${outputFile}`);

// node tokenize.js
