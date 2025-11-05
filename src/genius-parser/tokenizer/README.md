# Tokenizer Module

## Overview

The Tokenizer is a core module in the G-Code Genius Parser responsible for breaking down a raw G-code string (a single line) into a structured array of tokens. This process is the first step in the parsing pipeline, enabling subsequent modules to work with a well-defined data structure instead of raw text.

The tokenizer is designed to be robust, correctly identifying commands, parameters, comments, and malformed code.

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

### Advanced Flag and Word Handling

A key feature of the tokenizer is its ability to differentiate between valid sequences of G-code flags and other words or "gibberish".

1.  **Valid Flags:** The tokenizer recognizes a specific set of characters as valid flags: **`X`**, **`Y`**, **`Z`**, and **`O`** (case-insensitive).
2.  **Word Analysis:** When the tokenizer encounters a sequence of 2 or more letters (a "word"), it analyzes its content:
    *   If the word consists **entirely** of valid flag characters (e.g., `"XYZ"`), it is broken down into a sequence of individual `PARAMETER` flag tokens.
    *   If the word contains **any** character not in the valid flag set (e.g., `"XQZ"`, `"edddad"`), the entire word is treated as a single `ERROR` token.
3.  **Single Characters:** A single letter is only tokenized as a `PARAMETER` flag if it belongs to the valid set. A single invalid letter (e.g., `E`) will be tokenized as an `ERROR`.

This logic prevents a cascade of "missing space" errors from the validator and provides a much cleaner initial parse of the G-code line.

### Token Types

-   **`LINE_NUMBER`**: The line number, e.g., `N100`.
-   **`COMMAND`**: G, M, or T commands, e.g., `G0`, `M3`.
-   **`PARAMETER`**: A parameter word.
    -   Can have a value (e.g., `X10.5`).
    -   Can be a "flag" with a `null` value. A flag must be one of the valid characters (`X, Y, Z, O`).
-   **`COMMENT`**: A comment, either starting with `;` or enclosed in `()`.
-   **`ERROR`**: Any part of the string that doesn't match the above patterns, including invalid words.

### Number Formatting

The regular expression for numbers is designed to be flexible and supports several common G-code formats, including:
- Integers (`10`)
- Floats (`10.5`)
- Numbers with a trailing dot (`10.`)
- Numbers with a leading dot (`.5`)
- Commas as decimal separators (`10,5`)

### Output Token Structure

The `tokenize` function returns an array of `Token` objects. The `Token` constructor is `new Token(type, letter, value, startOffset)`.

Each token has the following structure:

```json
{
  "type": "COMMAND",
  "letter": "G",
  "value": "0",
  "startOffset": 4
}
```
- **`type`**: The type of the token (e.g., `'COMMAND'`, `'PARAMETER'`).
- **`letter`**: The letter part of the token, where applicable (e.g., `'G'` for a command, `'X'` for a parameter). Is `null` for comments and errors.
- **`value`**: The value of the token.
    - For a command `G0`, this would be `"0"`.
    - For a parameter `X10.5`, this would be `"10.5"`.
    - For a parameter flag `X`, this would be `null`.
    - For a comment `(MSG)`, this would be `"(MSG)"`.
- **`startOffset`**: The starting index of the token in the original string.

## Usage Example

The `example/tokenize.js` script demonstrates how to use the tokenizer.

```javascript
import tokenize from './src/index.js';

const line = 'N10 G0 X1. Y.5 Z10,5 ; move to position';
const tokens = tokenize(line);

console.log(JSON.stringify(tokens, null, 2));
```

This would produce the following output:
```json
[
  {
    "type": "LINE_NUMBER",
    "letter": "N",
    "value": "10",
    "startOffset": 0
  },
  {
    "type": "COMMAND",
    "letter": "G",
    "value": "0",
    "startOffset": 4
  },
  {
    "type": "PARAMETER",
    "letter": "X",
    "value": "1.",
    "startOffset": 7
  },
  {
    "type": "PARAMETER",
    "letter": "Y",
    "value": ".5",
    "startOffset": 11
  },
  {
    "type": "PARAMETER",
    "letter": "Z",
    "value": "10,5",
    "startOffset": 15
  },
  {
    "type": "COMMENT",
    "letter": null,
    "value": "; move to position",
    "startOffset": 21
  }
]
```
