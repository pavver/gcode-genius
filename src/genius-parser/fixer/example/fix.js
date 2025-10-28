const { fixAllErrors } = require('../src');

// Example G-code line with a missing space between G1 and X10
const gcodeLine = 'G1X10 Y20';

// Example diagnostics for the line
const diagnostics = [
  {
    severity: 'warning',
    message: 'warning.invalid_spacing_between_tokens',
    start: 2,
    end: 3
  }
];

console.log('Original line:', gcodeLine);

const correctedLine = fixAllErrors(gcodeLine, diagnostics);

console.log('Corrected line:', correctedLine);
