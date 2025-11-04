import * as vscode from 'vscode';

/**
 * Provides "Quick Fix" actions for G-code diagnostics.
 */
export class CodeActionProvider {
  #languageService;

  constructor(languageService) {
    this.#languageService = languageService;
  }

  provideCodeActions(document, range, context, token) {
    const actions = [];
    const diagnostics = context.diagnostics;

    // Action to fix a single error
    for (const diagnostic of diagnostics) {
      if (diagnostic.errorData && this.#languageService.canFix(diagnostic.errorData)) {
        const fixAction = new vscode.CodeAction(`Fix this ${diagnostic.message} issue`, vscode.CodeActionKind.QuickFix);
        fixAction.edit = new vscode.WorkspaceEdit();
        const line = document.lineAt(diagnostic.range.start.line);
        const fixedLine = this.#languageService.getFix(diagnostic.errorData, line.text);
        fixAction.edit.replace(document.uri, line.range, fixedLine);
        fixAction.diagnostics = [diagnostic];
        fixAction.isPreferred = true;
        actions.push(fixAction);
      }
    }

    // Action to fix all errors of the same type
    const fixableDiagnostics = diagnostics.filter(d => d.errorData && this.#languageService.canFix(d.errorData));
    const diagnosticsByType = new Map();

    for (const diagnostic of fixableDiagnostics) {
      if (!diagnosticsByType.has(diagnostic.message)) {
        diagnosticsByType.set(diagnostic.message, []);
      }
      diagnosticsByType.get(diagnostic.message).push(diagnostic);
    }

    for (const [message, diags] of diagnosticsByType.entries()) {
      if (diags.length > 1) {
        const fixAllTypeAction = new vscode.CodeAction(`Fix all '${message}' issues`, vscode.CodeActionKind.QuickFix);
        fixAllTypeAction.edit = new vscode.WorkspaceEdit();
        const editsByLine = new Map();

        for (const diag of diags) {
          const lineNum = diag.range.start.line;
          if (!editsByLine.has(lineNum)) {
            editsByLine.set(lineNum, []);
          }
          editsByLine.get(lineNum).push(diag.errorData);
        }

        for (const [lineNum, lineDiags] of editsByLine.entries()) {
          const line = document.lineAt(lineNum);
          const fixedLine = this.#languageService.getFixAll(lineDiags, line.text);
          fixAllTypeAction.edit.replace(document.uri, line.range, fixedLine);
        }

        fixAllTypeAction.diagnostics = diags;
        actions.push(fixAllTypeAction);
      }
    }

    // Action to fix all fixable errors in the file
    if (fixableDiagnostics.length > 0) {
      const fixAllInFileAction = new vscode.CodeAction('Fix all fixable issues in file', vscode.CodeActionKind.QuickFix);
      fixAllInFileAction.edit = new vscode.WorkspaceEdit();
      const editsByLine = new Map();

      const allFixableDiags = vscode.languages.getDiagnostics(document.uri)
        .filter(d => d.errorData && this.#languageService.canFix(d.errorData));

      for (const diag of allFixableDiags) {
        const lineNum = diag.range.start.line;
        if (!editsByLine.has(lineNum)) {
          editsByLine.set(lineNum, []);
        }
        editsByLine.get(lineNum).push(diag.errorData);
      }

      for (const [lineNum, lineDiags] of editsByLine.entries()) {
        const line = document.lineAt(lineNum);
        const fixedLine = this.#languageService.getFixAll(lineDiags, line.text);
        fixAllInFileAction.edit.replace(document.uri, line.range, fixedLine);
      }

      fixAllInFileAction.diagnostics = allFixableDiags;
      actions.push(fixAllInFileAction);
    }

    return actions;
  }
}
