# Validator Module

## Overview

The Validator module is responsible for analyzing G-code for correctness. The validation process is split into two distinct, independent stages:

1.  **Syntax Validation**: Checks an array of tokens for basic lexical and structural correctness. This happens *before* the tokens are parsed into commands.
2.  **Semantic Validation**: Checks a parsed command object against a G-code database to ensure it is a valid and meaningful command.

This separation allows for early detection of simple syntax errors and more detailed, context-aware validation of complete commands.

## Structure

The module is now organized by feature:

```
validator/
├── src/
│   ├── syntax-validator.js   # Logic for validating token syntax
│   ├── semantic-validator.js # Logic for validating command semantics
│   └── diagnostic.js         # Shared Diagnostic class and Severity enum
├── example/
│   └── ...
└── test/
    ├── test-cases/
    │   ├── syntax/           # Test cases for the syntax validator
    │   └── semantic/         # Test cases for the semantic validator
    ├── syntax.test.js
    └── semantic.test.js.disabled
```

---

## 1. Syntax Validator

The syntax validator inspects an array of tokens from the `Tokenizer`. It does not understand G-code commands; it only looks for patterns and token types.

-   **File:** `src/syntax-validator.js`
-   **Function:** `validateSyntax(tokens)`

### Checks Performed:
-   **Spacing Between Tokens**:
    -   Ensures there is exactly one space between most tokens.
    -   For consecutive parameter flags (e.g., `X`, `Y`, `Z`), allows a space of `0` or `1`. An error is flagged only if the space is greater than `1`. This allows for both `G0 XYZ` and `G0 X Y Z`.
    -   Allows any amount of whitespace (at least one space) before a comment token at the end of a line.
-   **Uppercase Letters**: Flags any command or parameter letters that are lowercase (e.g., `g0` instead of `G0`).
-   **Leading Zeros in Integers**:
    -   For `COMMAND` tokens (e.g., `G01`), flags extra leading zeros (e.g., `0` in `G01`).
    -   For `PARAMETER` tokens representing integers (e.g., `X01`), flags extra leading zeros (e.g., `0` in `X01`).
-   **Floating-Point Number Formatting**: For `PARAMETER` tokens with decimal values (e.g., `X1.23`):
    -   **Missing Leading Zero**: Flags if a number starts with a decimal point but lacks a leading zero (e.g., `.5` should be `0.5`).
    -   **Missing Trailing Zero**: Flags if a number ends with a decimal point but lacks a trailing zero (e.g., `1.` should be `1.0`).
    -   **Extra Leading Zeros**: Flags extra leading zeros in the integer part (e.g., `00.5` should be `0.5`).
    -   **Extra Trailing Zeros**: Flags extra trailing zeros in the fractional part (e.g., `1.20` should be `1.2`, `1.00` should be `1.0`).
-   **Comma as Decimal Separator**: Flags if a comma is used as a decimal separator (e.g., `X1,5` should be `X1.5`).
-   **Multiple Commands**: Flags an error if more than one command token is found on a single line.
-   **Error Tokens**: Identifies any tokens that the tokenizer marked as `ERROR`.

### Usage Example:
```javascript
import { validateSyntax } from './src/syntax-validator.js';

const tokens = [
  { type: 'COMMAND', letter: 'G', value: '01', startOffset: 0 }, // G01 - extra zero
  { type: 'PARAMETER', letter: 'X', value: '.5', startOffset: 4 }, // X.5 - missing leading zero
  { type: 'PARAMETER', letter: 'Y', value: '1.00', startOffset: 8 }, // Y1.00 - extra trailing zero
  { type: 'COMMENT', letter: null, value: '; comment', startOffset: 14 } // ; comment
];

const diagnostics = validateSyntax(tokens);
/*
diagnostics will contain warnings for:
- 'G01': extra zero in command
- 'X.5': missing leading zero in parameter
- 'Y1.00': extra trailing zero in parameter
*/

---

## 2. Semantic Validator

The semantic validator inspects a fully parsed command object. It uses a G-code database to verify that the command and its parameters are used correctly.

-   **File:** `src/semantic-validator.js`
-   **Class:** `SemanticValidator`

### Checks Performed:
-   **Unknown Commands**: Checks if the command (e.g., `G0`, `M3`) exists in the database.
-   **Parameter Validation**:
    -   Checks for unknown parameters.
    -   Validates parameter value types (`integer`, `float`, `flag`).
    -   Enforces value ranges (`min_value`, `max_value`).
    -   Checks against lists of allowed values.
-   **Command Constraints**:
    -   Enforces complex rules, such as `mutually_exclusive` parameters or requiring at least one axis parameter.
    -   Checks for missing required parameters.

### Usage Example:
```javascript
import { SemanticValidator } from './src/semantic-validator.js';
import gcodeDatabase from './gcode-database.json'; // Load your DB

// 1. Create an instance with the database
const semanticValidator = new SemanticValidator(gcodeDatabase);

// 2. Create a command object (from the parser)
const command = {
  command: 'G1',
  parameters: { X: 10, Y: 20.5 }
  // ... with offset info
};

// 3. Validate the command
const diagnostics = semanticValidator.validateCommand(command);
```

---

## Diagnostics

Both validators produce an array of `Diagnostic` objects.

-   **File:** `src/diagnostic.js`
-   **Class:** `Diagnostic`
-   **Enum:** `Severity` (`Error`, `Warning`, `Information`, `Hint`)

A diagnostic object has the following structure:
```json
{
  "severity": "error",
  "message": "error.unknown_command",
  "start": 0,
  "end": 2
}
```
