# VS Code Editor Integration Module

## Overview

This module serves as the primary bridge between the core `genius-parser` logic and the VS Code API. Its responsibility is to listen to editor events, manage diagnostics (errors and warnings), provide language features like Quick Fixes, and orchestrate the flow of data between the UI and the underlying parsing engine.

It is designed to be modular, with each component handling a distinct piece of functionality.

## Component Structure

```
vscode-editor-integration/
├── index.js                  # Entry point, wires all components together.
├── EditorManager.js          # Listens to VS Code workspace events (open, change, close).
├── GCodeLanguageService.js   # Stateless service for validation and other language operations.
├── DiagnosticService.js      # Manages the display of errors and warnings in the editor.
└── CodeActionProvider.js     # Provides "Quick Fix" suggestions for diagnostics.
```

### `index.js`
This is the entry point for the module. Its `activate` function is called by the main `extension.js`. It is responsible for:
- Instantiating all the services and managers within this module.
- Injecting dependencies (e.g., passing the `validator` to the `GCodeLanguageService`).
- Registering providers (like the `CodeActionProvider`) with VS Code.
- Activating the event listeners.

### `EditorManager.js`
This class is the direct listener for VS Code API events. It translates user actions into commands for our system.
- It listens for `onDidOpenTextDocument` and tells the `DocumentStateManager` to open and tokenize a new file.
- It listens for `onDidCloseTextDocument` to clean up resources.
- It listens for `onDidChangeTextDocument` and, after a debounce delay, tells the `DocumentStateManager` to perform a full update of the document's content.

### `GCodeLanguageService.js`
This is a **stateless** service that wraps the core logic of the `genius-parser`. 
- It does not hold any document state.
- It provides methods like `validate(tokens)` which uses the `validator` component to check a line of tokens for errors.
- In the future, it will provide methods like `getFix(error)` which will use the `fixer` component.

### `DiagnosticService.js`
This service manages the visual representation of errors and warnings (squiggles) in the editor.
- It subscribes to events from the `DocumentStateManager` (e.g., `file:opened`, `file:updated`).
- When an event occurs, it retrieves the relevant tokenized lines.
- It uses the `GCodeLanguageService` to validate the tokens.
- It converts the validation results into `vscode.Diagnostic` objects and publishes them to a `DiagnosticCollection`.

### `CodeActionProvider.js`
This class implements the `vscode.CodeActionProvider` interface. It is responsible for providing the "Quick Fix" lightbulb icon next to errors.
- It analyzes the diagnostics present on a given line.
- For diagnostics that are marked as "fixable," it creates `vscode.CodeAction` objects that, when triggered, will apply a text edit to fix the error.

## Data Flow / Workflow Example

Here is the sequence of events when a user types in the editor:

1.  The user types a character in a G-code file.
2.  VS Code fires the `onDidChangeTextDocument` event.
3.  `EditorManager` receives this event.
4.  After a 250ms debounce period (to wait for the user to stop typing), `EditorManager` calls `documentStateManager.updateFullDocument()` with the file's new content.
5.  `DocumentStateManager` re-tokenizes the entire file and emits a `file:updated` event, containing the `filePath`.
6.  `DiagnosticService`, which is listening to the `DocumentStateManager`, receives the `file:updated` event.
7.  `DiagnosticService` calls its internal `#validateDocument` method. It retrieves all the new tokenized lines from the `DocumentStateManager`.
8.  For each line, it calls `languageService.validate(lineTokens)`.
9.  The results are converted into an array of `vscode.Diagnostic` objects.
10. `DiagnosticService` updates its `DiagnosticCollection` with the new array of diagnostics.
11. VS Code automatically renders the new errors and warnings in the editor UI.
