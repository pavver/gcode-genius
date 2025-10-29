# Tokenizer Module

## Overview

The Tokenizer is a core module in the G-Code Genius Parser responsible for breaking down raw G-code strings into a structured array of tokens. This process is the first step in the parsing pipeline, enabling subsequent modules to work with a well-defined data structure instead of raw text.

## Structure

The module is organized as follows:

```
tokenizer/
├── src/
│   └── index.js      # Main tokenizer logic
├── example/
│   └── tokenize.js   # Example script for using the tokenizer
└── test/
    ├── data/
    ├── test-cases/
    └── tokenizer.test.js
```

## Implementation Details

The tokenizer is a default export function `tokenize(line)` from `src/index.js`. It uses a set of regular expressions to identify and extract different components of a G-code line.

### Token Types

The tokenizer can identify the following token types:

-   **Line Number**: e.g., `N100`
-   **Command**: e.g., `G0`, `M3`
-   **Parameter**: e.g., `X10.5`, `F500`
-   **Comment**: e.g., `(This is a comment)`
-   **Error**: Any part of the string that doesn't match the above patterns.

### Output

The `tokenize` function returns an array of token objects. Each token object has the following structure:

```json
{
  "type": "COMMAND_G",
  "value": "G0",
  "text": "G0",
  "startOffset": 0,
  "endOffset": 2,
  "isLowercase": false
}
```

## Usage Example

The `example/tokenize.js` script demonstrates how to use the tokenizer.

```javascript
import tokenize from './src/index.js';

const line = 'G0 X10 Y20 (move to position)';
const tokens = tokenize(line);

console.log(tokens);
```
