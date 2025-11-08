# Normalizer Module

## Overview

The Normalizer module is responsible for correcting and standardizing tokens before they are passed to the parser. It takes a single token as input and returns a new, corrected token if any changes were made.

## Structure

The module is organized as follows:

```
normalizer/
├── src/
│   └── index.js      # Main normalizer logic
├── example/
│   ├── input.json
│   ├── normalize.js
│   └── output.json
└── test/
    ├── normalizer.test.js
    └── test-cases/
        ├── normalization.expected.json
        └── normalization.json
```

## Implementation Details

The normalizer's main logic is in `src/index.js`. It provides a single function:

### `normalizeToken(token)`

This function takes a token object and applies the following rules:

-   **Uppercase `letter`**: If the `letter` property of a token is lowercase, it is converted to uppercase.
-   **Normalize numeric `value`**: If the token type is `COMMAND` or `PARAMETER`, the `value` is normalized to ensure it is a valid number:
    -   If the value is `.` or `,`, it is changed to `"0"`.
    -   If the value starts with `.` or `,` (e.g., `.3`), a leading zero is added (e.g., `0.3`).
    -   If the value ends with `.` or `,` (e.g., `3.`), a trailing zero is added (e.g., `3.0`).
    -   Commas are replaced with dots.

If no changes are made to the token, the original token is returned.

## Usage Example

The `example/normalize.js` script demonstrates how to use the normalizer. It reads an array of tokens from `input.json`, normalizes them, and writes the result to `output.json`.

To run the example, execute the following command from the `normalizer` directory:
```bash
node example/normalize.js
```
