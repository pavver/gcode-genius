# Fixer Module

## Overview

The Fixer module is responsible for automatically correcting errors in G-code lines based on diagnostics from the Validator module.

## Structure

The module is organized as follows:

```
fixer/
├── src/
│   └── index.js      # Main fixer logic
├── example/
│   └── fix.js   # Example script for using the fixer
└── test/
    └── fixer.test.js
```

## Implementation Details

The fixer's main logic is in `src/index.js`. It provides three main functions:

### `canFix(diagnostic)`

This function takes a diagnostic object and returns a boolean indicating whether the error can be automatically fixed.

### `fixError(gcodeLine, diagnostic)`

This function takes a raw G-code line and a single diagnostic object and returns the corrected G-code line. The currently supported fixable errors are:

-   `warning.invalid_spacing_between_tokens`: Corrects spacing issues between tokens.
-   `warning.lowercase_letter`: Converts lowercase command or parameter letters to uppercase.
-   `warning.leading_zeros_in_parameter`: Removes unnecessary leading zeros from parameters.
-   `warning.trailing_zeros_in_parameter`: Removes unnecessary trailing zeros from parameters.
-   `warning.extra_zero_in_command`: Removes extra leading zeros from command numbers (e.g., `G01` becomes `G1`).
-   `warning.missing_leading_zero`: Adds a leading zero to floating-point numbers that start with a decimal point (e.g., `.5` becomes `0.5`).
-   `warning.missing_trailing_zero`: Adds a trailing zero to numbers that end with a decimal point (e.g., `1.` becomes `1.0`).
-   `warning.invalid_spacing_before_comment`: Ensures there is at least one space before a comment.
-   `warning.invalid_spacing_between_flags`: Ensures there is exactly one space between consecutive flags.
-   `warning.comma_as_decimal_separator`: Replaces a comma used as a decimal separator with a period.

### `fixAllErrors(gcodeLine, diagnostics)`

This function takes a raw G-code line and an array of diagnostic objects and returns the corrected G-code line with all fixable errors addressed.

## Testing

The tests for this module are located in the `test` directory. The test cases are defined in JSON files in the `test/test-cases` directory, with separate subdirectories for each function.

Each test case is a single JSON file containing the input and expected output.
