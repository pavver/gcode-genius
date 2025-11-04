import * as vscode from 'vscode';

/**
 * Manages the display of G-code diagnostics (errors, warnings) in the editor.
 */
export class DiagnosticService {
  #languageService;
  #diagnosticCollection;
  #enabled = true;
  #documentStateManager = null;

  constructor(languageService) {
    this.#languageService = languageService;
    this.#diagnosticCollection = vscode.languages.createDiagnosticCollection('gcode');
  }

  isEnabled() {
    return this.#enabled;
  }

  setEnabled(enabled) {
    this.#enabled = enabled;
    if (!this.#enabled) {
      this.#diagnosticCollection.clear();
    }
  }

  revalidate() {
    if (!this.#enabled || !this.#documentStateManager) return;
    for (const document of vscode.workspace.textDocuments) {
      if (document.languageId === 'gcode') {
        const documentState = this.#documentStateManager.getDocumentState(document.uri.fsPath);
        if (documentState) {
          this.#validateDocument(document.uri.fsPath, documentState.lines);
        }
      }
    }
  }

  activate(documentStateManager) {
    this.#documentStateManager = documentStateManager;
    const validate = ({ filePath }) => {
      if (!this.#enabled) return;
      console.log(`[DiagnosticService] Received event for: ${filePath}`);
      const documentState = documentStateManager.getDocumentState(filePath);
      if (documentState) {
        this.#validateDocument(filePath, documentState.lines);
      }
    };

    documentStateManager.on('file:opened', validate);
    documentStateManager.on('file:updated', validate);

    documentStateManager.on('file:closed', ({ filePath }) => {
      this.#diagnosticCollection.delete(vscode.Uri.file(filePath));
    });
  }

  #validateDocument(filePath, tokenizedLines) {
    if (!this.#enabled) {
        this.#diagnosticCollection.delete(vscode.Uri.file(filePath));
        return;
    };
    const diagnostics = [];
    for (let i = 0; i < tokenizedLines.length; i++) {
      const lineTokens = tokenizedLines[i];
      const errors = this.#languageService.getSyntaxDiagnostics(lineTokens);
      
      for (const error of errors) {
        const range = new vscode.Range(i, error.start, i, error.end);
        const severity = error.severity === 'error' 
          ? vscode.DiagnosticSeverity.Error 
          : vscode.DiagnosticSeverity.Warning;
        const diagnostic = new vscode.Diagnostic(range, error.message, severity);
        diagnostic.errorData = error; // Attach original error for the CodeActionProvider
        diagnostics.push(diagnostic);
      }
    }
    console.log(`[DiagnosticService] Reporting ${diagnostics.length} diagnostics for: ${filePath}`);
    this.#diagnosticCollection.set(vscode.Uri.file(filePath), diagnostics);
  }

  dispose() {
    this.#diagnosticCollection.dispose();
  }
}
