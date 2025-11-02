# Tokenizer Module

## Overview

The Tokenizer is a core module in the G-Code Genius Parser responsible for breaking down a raw G-code string (a single line) into a structured array of tokens. This process is the first step in the parsing pipeline, enabling subsequent modules to work with a well-defined data structure instead of raw text.

The tokenizer is designed to be robust, correctly identifying commands, parameters (with and without values), comments, and malformed code.

## Structure

```
tokenizer/
├── src/
│   └── index.js      # Main tokenizer logic
├── example/
│   └── tokenize.js   # Example script for using the tokenizer
└── test/
    ├── test-cases/
    └── tokenizer.test.js
```

## Implementation Details

The tokenizer is a default export function `tokenize(line)` from `src/index.js`. It iterates through the input string, using a series of regular expressions to identify and classify each part of the line.

### Token Types

The tokenizer can identify the following token types:

-   **`LINE_NUMBER`**: The line number, e.g., `N100`. The `value` will be `"100"`.
-   **`COMMAND`**: G, M, or T commands, e.g., `G0`, `M3`. The `value` holds the number part of the command, and the `letter` property will indicate the command type (e.g., `'G'`, `'M'`, `'T'`).
-   **`PARAMETER`**: A parameter word. This can be a parameter with a value (e.g., `X10.5`, `F500`) or a parameter acting as a flag (e.g., a standalone `X`).
    -   If it has a value, the `value` property will be a string (e.g., `"10.5"`).
    -   If it's a flag, the `value` property will be `null`.
-   **`COMMENT`**: A comment, either starting with `;` or enclosed in `()`. The `value` contains the full comment text.
-   **`ERROR`**: Any part of the string that doesn't match the above patterns. This is crucial for identifying syntax errors early.

### Number Formatting

The regular expression for numbers is designed to be flexible and supports several common G-code formats, including:
- Integers (`10`)
- Floats (`10.5`)
- Numbers with a trailing dot (`10.`)
- Numbers with a leading dot (`.5`)

### Output Token Structure

The `tokenize` function returns an array of `Token` objects. Each token has the following structure:

```json
{
  "type": "COMMAND",
  "value": "0",
  "startOffset": 0,
  "endOffset": 2,
  "letter": "G"
}
```
- **`type`**: The type of the token (e.g., `'COMMAND'`, `'PARAMETER'`).
- **`value`**: The value of the token. For a command `G0`, this would be `"0"`. For a parameter `X10.5`, this would be `"10.5"`. For a comment `(MSG)`, this would be `"(MSG)"`.
- **`startOffset`**: The starting index of the token in the original string.
- **`endOffset`**: The ending index of the token in the original string.
- **`letter`**: The letter part of the token, where applicable (e.g., `'G'` for a command, `'X'` for a parameter).

## Usage Example

The `example/tokenize.js` script demonstrates how to use the tokenizer.

```javascript
import tokenize from './src/index.js';

const line = 'N10 G0 X1. Y.5 ; move to position';
const tokens = tokenize(line);

console.log(JSON.stringify(tokens, null, 2));
```

This would produce the following output:
```json
[
  {
    "type": "LINE_NUMBER",
    "value": "10",
    "startOffset": 0,
    "endOffset": 3,
    "letter": "N"
  },
  {
    "type": "COMMAND",
    "value": "0",
    "startOffset": 4,
    "endOffset": 6,
    "letter": "G"
  },
  {
    "type": "PARAMETER",
    "value": "1.",
    "startOffset": 7,
    "endOffset": 10,
    "letter": "X"
  },
  {
    "type": "PARAMETER",
    "value": ".5",
    "startOffset": 11,
    "endOffset": 14,
    "letter": "Y"
  },
  {
    "type": "COMMENT",
    "value": "; move to position",
    "startOffset": 15,
    "endOffset": 33,
    "letter": null
  }
]
```
