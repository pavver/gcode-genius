import normalizeToken from '../src/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = path.join(__dirname, 'input.json');
const outputFile = path.join(__dirname, 'output.json');

const inputTokens = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));

const normalizedTokens = inputTokens.map(token => normalizeToken(token));

const jsonOutput = JSON.stringify(normalizedTokens, null, 2);

fs.writeFileSync(outputFile, jsonOutput, 'utf-8');

console.log(`Successfully wrote normalized tokens to ${outputFile}`);

// To run this example, execute from the normalizer directory:
// node example/normalize.js