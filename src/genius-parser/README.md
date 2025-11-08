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
2.  **Syntax Validation:** The array of tokens is passed to the `Syntax Validator` to check for lexical correctness.
3.  **Normalization:** Each token is passed to the `Normalizer` to correct and standardize its format, ensuring it's ready for the parser.
4.  **(Future) Parsing:** The normalized tokens are passed to a `Parser` which will be responsible for converting them into structured `Command` objects.
5.  **(Future) Semantic Validation:** The structured `Command` objects are passed to the `Semantic Validator` to be checked against a G-code database for logical correctness.

The `Fixer` is an optional tool that can be used after `Syntax Validation` to automatically correct errors in the source G-code line, but it is not a required step for parsing.

## Components

### 1. Tokenizer (`/tokenizer`)

-   **Purpose:** Converts a raw G-code string into an array of structured tokens. It is the first step in the parsing pipeline.
-   **Details:** For more information, see the [Tokenizer README](./tokenizer/README.md).

### 2. Normalizer (`/normalizer`)

-   **Purpose:** Corrects and standardizes tokens before they are passed to the validator and parser.
-   **Details:** For more information, see the [Normalizer README](./normalizer/README.md).

### 3. Validator (`/validator`)

The validation process is split into two independent modules:

#### Syntax Validator
-   **Purpose:** Analyzes an array of tokens for lexical and formatting errors (e.g., spacing, number formats). It operates *before* the code is parsed into commands.
-   **Details:** See the [Validator README](./validator/README.md) for a full list of rules.

#### Semantic Validator
-   **Purpose:** Analyzes a fully parsed `Command` object to ensure it is logically valid according to a specific G-code dialect (defined in a database).
-   **Details:** See the [Validator README](./validator/README.md).

### 4. Fixer (`/fixer`)

-   **Purpose:** Automatically corrects syntax errors based on the diagnostics from the `Syntax Validator`.
-   **Details:** For more information, see the [Fixer README](./fixer/README.md).

### 5. Adaptive Syntax Highlighting (`/code-highlighter`)

-   **Purpose:** A standalone utility module for generating a complete, accessible, and semantic G-code color scheme. It adapts the entire color palette based on a single input: the editor's background color.
-   **Features:**
    -   **Fully Adaptive**: Works with any light, dark, or colored theme.
    -   **Accessible by Design**: Automatically generates colors that meet WCAG 2.1 contrast standards.
    -   **Semantic Colors**: Assigns colors based on the function of G-code commands (motion, settings, axes).
-   **Details:** For a full API reference and usage guide, see the [Adaptive Syntax Highlighting README](./code-highlighter/README.md).

*(Other components like `state-manager`, `motion-calculator`, etc. will be described here as they are refactored.)*

## Basic Usage Example

This example demonstrates the intended workflow using the decoupled components.

```javascript
import tokenize from './tokenizer/src/index.js';
import { validateSyntax } from './validator/src/syntax-validator.js';
import normalizeToken from './normalizer/src/index.js';

const gcodeLine = 'N10 g01 X. Y.5 ; Move command';

// 1. Tokenize the line
const tokens = tokenize(gcodeLine);
// -> [ {type: 'COMMAND', letter: 'g', ...}, {type: 'PARAMETER', letter: 'X', value: '.', ...} ]

// 2. Run Syntax Validation
const syntaxDiagnostics = validateSyntax(tokens);
// -> [ {severity: 'warning', message: 'warning.lowercase_letter', ...}, {severity: 'warning', message: 'warning.missing_trailing_zero', ...} ]

// 3. Normalize tokens to prepare them for the parser
const normalizedTokens = tokens.map(token => normalizeToken(token));
// -> [ {type: 'COMMAND', letter: 'G', ...}, {type: 'PARAMETER', letter: 'X', value: '0', ...} ]

// (Future steps: Parse normalizedTokens, Semantic Validation, etc.)
```

Note: The `Fixer` can be used separately with the `syntaxDiagnostics` to correct the original `gcodeLine`.
```javascript
import { fixAllErrors } from './fixer/src/index.js';

const fixedGcodeLine = fixAllErrors(gcodeLine, syntaxDiagnostics);
// -> "N10 G1 X0.0 Y0.5 ; Move command"
```

## Testing

Each module contains its own test suite within its `/test` directory. Tests are file-based, comparing input files with expected JSON output, which makes adding new test cases straightforward.

-   **Tokenizer Tests:** Located in `/tokenizer/test`.
-   **Validator Tests:** The validator has a dedicated test suite for each validation type. Syntax tests are located in `/validator/test/test-cases/syntax`.

To run all tests, execute the following command from the `genius-parser` root directory:

```bash
npm test
```
