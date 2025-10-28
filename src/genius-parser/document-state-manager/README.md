# Document State Manager

## Overview

The `DocumentStateManager` is a crucial component in the G-Code Genius Parser ecosystem. It acts as a centralized, in-memory store for the tokenized state of all currently open G-code files. Instead of having disparate parts of the application manage file state independently, this manager provides a single source of truth.

It is responsible for the entire lifecycle of a document's state, from opening and initial tokenization to handling real-time changes and eventual closing. By exposing a clear API and emitting events for every modification, it allows other components (like validators, UI elements, or language services) to react to changes in a decoupled and efficient manner.

## Structure

The module is organized as follows:

```
document-state-manager/
├── src/
│   └── index.js      # Main DocumentStateManager class
├── example/
│   └── usage.js      # Example script (to be created)
└── test/
    └── manager.test.js # Tests for the manager (to be created)
```

## Core Responsibilities

-   **State Management**: Maintains a `Map` where each key is a file's unique path and the value is its tokenized line-by-line representation.
-   **Lifecycle Handling**: Provides `openFile` and `closeFile` methods to manage which documents are actively tracked.
-   **Controlled Mutations**: All changes to a document's state must go through the manager's methods (`updateLine`, `insertLine`, `deleteLine`), ensuring predictability.
-   **Event Emission**: The class extends `EventEmitter` and fires events for every significant action (`file:opened`, `file:closed`, `line:updated`, `line:added`, `line:deleted`). Each event includes the `filePath` to identify which document was affected.
-   **Dependency Injection**: Expects a `tokenizer` instance to be passed into its constructor, decoupling it from the tokenizer's implementation.

## Usage

```javascript
import { DocumentStateManager } from './src/index.js';
import { Tokenizer } from '../tokenizer/src/index.js'; // Assuming tokenizer is available

// 1. Initialize dependencies
const tokenizer = new Tokenizer(/* config */);

// 2. Create a manager instance
const manager = new DocumentStateManager(tokenizer);

// 3. Subscribe to events
manager.on('line:updated', ({ filePath, lineNumber, newTokens }) => {
  console.log(`Line ${lineNumber} in ${filePath} was updated.`);
  // Trigger validation or other services here
});

// 4. Manage documents
const filePath = 'C:/path/to/my.gcode';
const fileContent = 'G0 X10\nG1 Y20';

manager.openFile(filePath, fileContent);
manager.updateLine(filePath, 0, 'G0 X15 Z5');
manager.closeFile(filePath);
```
