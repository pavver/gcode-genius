import * as vscode from 'vscode';

/**
 * Manages the display of G-code diagnostics (errors, warnings) in the editor.
 */
export class DiagnosticService {
  #languageService;
  #diagnosticCollection;

  constructor(languageService) {
    this.#languageService = languageService;
    this.#diagnosticCollection = vscode.languages.createDiagnosticCollection('gcode');
  }

  activate(documentStateManager) {
    const validate = ({ filePath }) => {
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
    const diagnostics = [];
    for (let i = 0; i < tokenizedLines.length; i++) {
      const lineTokens = tokenizedLines[i];
      const errors = this.#languageService.validate(lineTokens);
      
      for (const error of errors) {
        const range = new vscode.Range(i, error.start, i, error.end);
        const severity = error.severity === 'error' 
          ? vscode.DiagnosticSeverity.Error 
          : vscode.DiagnosticSeverity.Warning;
        const diagnostic = new vscode.Diagnostic(range, error.message, severity);
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
