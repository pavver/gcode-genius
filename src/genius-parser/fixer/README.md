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

This function takes a raw G-code line and a single diagnostic object and returns the corrected G-code line.

### `fixAllErrors(gcodeLine, diagnostics)`

This function takes a raw G-code line and an array of diagnostic objects and returns the corrected G-code line with all fixable errors addressed.

## Testing

The tests for this module are located in the `test` directory. The test cases are defined in JSON files in the `test/test-cases` directory, with separate subdirectories for each function.

Each test case is a single JSON file containing the input and expected output.
