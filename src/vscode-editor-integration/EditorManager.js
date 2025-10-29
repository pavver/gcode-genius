import * as vscode from 'vscode';

/**
 * Listens to VS Code editor events (open, change, close documents)
 * and calls the appropriate methods on the DocumentStateManager.
 * It acts as the bridge between the VS Code API and our application's state.
 */
export class EditorManager {
  #documentStateManager;
  #debounceMap = new Map();

  constructor(documentStateManager) {
    this.#documentStateManager = documentStateManager;
  }

  listen() {
    const openSubscription = vscode.workspace.onDidOpenTextDocument(document => {
      if (document.languageId === 'gcode') {
        console.log(`[EditorManager] Detected opening of gcode file: ${document.uri.fsPath}`);
        this.#documentStateManager.openFile(document.uri.fsPath, document.getText());
      }
    });

    const closeSubscription = vscode.workspace.onDidCloseTextDocument(document => {
      this.#documentStateManager.closeFile(document.uri.fsPath);
    });

    const changeSubscription = vscode.workspace.onDidChangeTextDocument(event => {
      if (event.document.languageId !== 'gcode') return;

      const uriString = event.document.uri.toString();
      
      // Debounce the update
      if (this.#debounceMap.has(uriString)) {
        clearTimeout(this.#debounceMap.get(uriString));
      }

      const timeout = setTimeout(() => {
        this.#documentStateManager.updateFullDocument(event.document.uri.fsPath, event.document.getText());
        this.#debounceMap.delete(uriString);
      }, 250);

      this.#debounceMap.set(uriString, timeout);
    });

    // Process already open documents
    for (const document of vscode.workspace.textDocuments) {
      if (document.languageId === 'gcode') {
        this.#documentStateManager.openFile(document.uri.fsPath, document.getText());
      }
    }
    
    return [openSubscription, closeSubscription, changeSubscription];
  }
}
