# G-Code Genius Parser

## Overview

This project is a modular and extensible G-code parser written in JavaScript. It is designed to deconstruct G-code files, validate their syntax and semantics, and provide a structured representation of the code for further analysis, visualization, or transformation.

The architecture is built on the principle of separation of concerns, with a decoupled pipeline that makes each part of the system easy to develop, test, and extend.

## Core Principles

-   **Modular:** Each major piece of functionality (tokenizer, validators) is a separate, self-contained module.
-   **Decoupled Pipeline:** The parsing process is not a single, monolithic operation. It's a series of distinct stages, allowing consumers to use only the parts they need.
-   **Testability:** Each module has its own comprehensive test suite, enabling isolated testing and ensuring reliability.

## The Parsing Pipeline

The library is designed to be used as a sequence of processing stages:

1.  **Tokenization:** A raw line of G-code text is converted into an array of `Token` objects.
2.  **Syntax Validation:** The array of tokens is passed to the `Syntax Validator` to check for lexical correctness (spacing, formatting, valid characters, etc.).
3.  **Fixing:** The raw G-code line and the generated diagnostics are passed to the `Fixer` to automatically correct any fixable errors.
4.  **(Future) Parsing:** The validated tokens are passed to a `Parser` which will be responsible for converting the flat array of tokens into structured `Command` objects.
5.  **(Future) Semantic Validation:** The structured `Command` objects are passed to the `Semantic Validator` to be checked against a G-code database for logical correctness (e.g., correct parameter usage for a given command).

## Components

### 1. Tokenizer (`/tokenizer`)

-   **Purpose:** Converts a raw G-code string into an array of structured tokens. It is the first step in the parsing pipeline.
-   **Details:** For more information, see the [Tokenizer README](./tokenizer/README.md).

### 2. Validator (`/validator`)

The validation process is split into two independent modules:

#### Syntax Validator
-   **Purpose:** Analyzes an array of tokens for lexical and formatting errors (e.g., spacing, number formats). It operates *before* the code is parsed into commands.
-   **Details:** See the [Validator README](./validator/README.md) for a full list of rules.

#### Semantic Validator
-   **Purpose:** Analyzes a fully parsed `Command` object to ensure it is logically valid according to a specific G-code dialect (defined in a database).
-   **Details:** See the [Validator README](./validator/README.md).

### 3. Fixer (`/fixer`)

-   **Purpose:** Automatically corrects syntax errors based on the diagnostics from the `Syntax Validator`.
-   **Details:** For more information, see the [Fixer README](./fixer/README.md).

*(Other components like `state-manager`, `motion-calculator`, etc. will be described here as they are refactored.)*

## Basic Usage Example

This example demonstrates the intended workflow using the decoupled components.

```javascript
import tokenize from './tokenizer/src/index.js';
import { validateSyntax } from './validator/src/syntax-validator.js';
import { fixAllErrors } from './fixer/src/index.js';

const gcodeLine = 'N10 g01 X1.00 Y.5 ; Move command';

// 1. Tokenize the line
const tokens = tokenize(gcodeLine);
// -> [ {type: 'LINE_NUMBER', ...}, {type: 'COMMAND', ...}, ... ]

// 2. Run Syntax Validation
const syntaxDiagnostics = validateSyntax(tokens);
// -> [ {severity: 'warning', message: 'warning.lowercase_letter', ...}, ... ]

// 3. Fix all fixable errors
const fixedGcodeLine = fixAllErrors(gcodeLine, syntaxDiagnostics);
// -> "N10 G1 X1.0 Y0.5 ; Move command"

// (Future steps: Parse, Semantic Validation, etc.)
```

## Testing

Each module contains its own test suite within its `/test` directory. Tests are file-based, comparing input files with expected JSON output, which makes adding new test cases straightforward.

-   **Tokenizer Tests:** Located in `/tokenizer/test`.
-   **Validator Tests:** The validator has a dedicated test suite for each validation type. Syntax tests are located in `/validator/test/test-cases/syntax`.

To run all tests, execute the following command from the `genius-parser` root directory:

```bash
npm test
```
