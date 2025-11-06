import * as vscode from 'vscode';

/**
 * Provides "Quick Fix" actions for G-code diagnostics.
 */
export class CodeActionProvider {
  #languageService;
  #diagnosticService;

  constructor(languageService, diagnosticService) {
    this.#languageService = languageService;
    this.#diagnosticService = diagnosticService;
  }

  provideCodeActions(document, range, context, token) {
    const actions = [];
    const diagnostics = context.diagnostics;

    // Action to fix a single error
    for (const diagnostic of diagnostics) {
      if (diagnostic.errorData && this.#languageService.canFix(diagnostic.errorData)) {
        const fixAction = new vscode.CodeAction(`Fix this ${diagnostic.message} issue`, vscode.CodeActionKind.QuickFix);
        fixAction.diagnostics = [diagnostic];
        fixAction.isPreferred = true;
        // Stash the diagnostic for the resolver
        fixAction.data = {
          type: 'single',
          diagnostic,
          uri: document.uri.toString(),
        };
        actions.push(fixAction);
      }
    }

    // Action to fix all errors of the same type
    const allFixableDiagsInFile = vscode.languages.getDiagnostics(document.uri)
        .filter(d => d.errorData && this.#languageService.canFix(d.errorData));

    const diagnosticsByType = new Map();
    for (const diagnostic of allFixableDiagsInFile) {
      if (!diagnosticsByType.has(diagnostic.message)) {
        diagnosticsByType.set(diagnostic.message, []);
      }
      diagnosticsByType.get(diagnostic.message).push(diagnostic);
    }

    const currentDiagnosticMessages = new Set(context.diagnostics.map(d => d.message));

    for (const [message, diags] of diagnosticsByType.entries()) {
      if (diags.length > 1 && currentDiagnosticMessages.has(message)) {
        const fixAllTypeAction = new vscode.CodeAction(`Fix all '${message}' issues`, vscode.CodeActionKind.QuickFix);
        fixAllTypeAction.diagnostics = diags;
        // Stash the diagnostics for the resolver
        fixAllTypeAction.data = {
          type: 'type',
          diagnostics: diags,
          uri: document.uri.toString(),
        };
        actions.push(fixAllTypeAction);
      }
    }

    // Action to fix all fixable errors in the file
    const allFixableDiags = vscode.languages.getDiagnostics(document.uri)
        .filter(d => d.errorData && this.#languageService.canFix(d.errorData));

    if (this.#diagnosticService.isEnabled() && allFixableDiags.length > 0) {
      const fixAllInFileAction = new vscode.CodeAction('Fix all fixable issues in file', vscode.CodeActionKind.QuickFix);
      fixAllInFileAction.diagnostics = allFixableDiags;
      // Stash the diagnostics for the resolver
      fixAllInFileAction.data = {
        type: 'all',
        diagnostics: allFixableDiags,
        uri: document.uri.toString(),
      };
      actions.push(fixAllInFileAction);
    }

    // Action to ignore or enable all errors
    const allDiagnostics = vscode.languages.getDiagnostics(document.uri);
    if (this.#diagnosticService.isEnabled()) {
      if (allDiagnostics.length > 0) {
        const ignoreAllAction = new vscode.CodeAction('Ignore all errors', vscode.CodeActionKind.Empty);
        ignoreAllAction.command = { command: 'gcode-genius.ignoreAllDiagnostics', title: 'Ignore all errors' };
        actions.push(ignoreAllAction);
      }
    } else { // diagnostic service is disabled
      const enableAllAction = new vscode.CodeAction('Enable all errors', vscode.CodeActionKind.Empty);
      enableAllAction.command = { command: 'gcode-genius.enableAllDiagnostics', title: 'Enable all errors' };
      actions.push(enableAllAction);
    }

    return actions;
  }

  async resolveCodeAction(codeAction, token) {
    if (!codeAction.data) {
      return codeAction;
    }
    const { type, diagnostics, diagnostic, uri } = codeAction.data;
    const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(uri));
    codeAction.edit = new vscode.WorkspaceEdit();

    if (type === 'single') {
      const line = document.lineAt(diagnostic.range.start.line);
      const fixedLine = this.#languageService.getFix(diagnostic.errorData, line.text);
      if (fixedLine.includes('\n')) {
        const lines = fixedLine.split('\n');
        codeAction.edit.delete(document.uri, line.range);
        codeAction.edit.insert(document.uri, line.range.start, lines.join('\n'));
      } else {
        codeAction.edit.replace(document.uri, line.range, fixedLine);
      }
    } else if (type === 'type' || type === 'all') {
      const editsByLine = new Map();
      for (const diag of diagnostics) {
        const lineNum = diag.range.start.line;
        if (!editsByLine.has(lineNum)) {
          editsByLine.set(lineNum, []);
        }
        editsByLine.get(lineNum).push(diag.errorData);
      }

      for (const [lineNum, lineDiags] of editsByLine.entries()) {
        const line = document.lineAt(lineNum);
        const fixedLine = this.#languageService.getFixAll(lineDiags, line.text);
        if (fixedLine.includes('\n')) {
          const lines = fixedLine.split('\n');
          codeAction.edit.delete(document.uri, line.range);
          codeAction.edit.insert(document.uri, line.range.start, lines.join('\n'));
        } else {
          codeAction.edit.replace(document.uri, line.range, fixedLine);
        }
      }
    }

    return codeAction;
  }
}
