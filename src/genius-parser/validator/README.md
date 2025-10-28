# Validator Module

## Overview

The Validator module is responsible for analyzing an array of tokens (produced by the Tokenizer) and checking them for correctness against a set of rules defined in a G-code database. It identifies syntax errors, invalid commands, and incorrect parameter usage.

## Structure

The module is organized as follows:

```
validator/
├── src/
│   └── index.js      # Main validator logic
├── example/
│   └── validate.js   # Example script for using the validator
└── test/
    ├── data/
    ├── test-cases/
    └── validator.test.js
```

## Implementation Details

The validator's main logic is in `src/index.js`. It provides two main functions: `getDiagnostics` and `isTokenValid`.

### `getDiagnostics(tokens)`

This function takes an array of tokens and returns an array of diagnostic objects. It performs two levels of validation:

1.  **Syntax Check**: Checks for basic syntax issues like invalid spacing, use of lowercase letters, and extra zeros.
2.  **Command Validation**: Parses tokens into commands and validates them against the `gcode-database.json`. This includes:
    -   Checking for unknown commands.
    -   Validating parameter types (integer, float).
    -   Enforcing value ranges (`min_value`, `max_value`).
    -   Checking for required parameters and other constraints.

A diagnostic object has the following structure:
```json
{
  "severity": "error",
  "message": "error.unknown_command",
  "start": 0,
  "end": 2
}
```

### `isTokenValid(token, diagnostics)`

This function takes a single token and an array of diagnostics (produced by `getDiagnostics`) and returns a boolean value. It returns `false` if the token is a comment or if it falls within the range of an error-level diagnostic. Otherwise, it returns `true`.

## Usage Example

The `example/validate.js` script demonstrates how to use the validator. It reads an array of tokens from a JSON file, runs the validation, and saves the resulting diagnostics to another JSON file.

To run the example:
1.  Navigate to the `validator/example` directory.
2.  Run the script: `node validate.js`
