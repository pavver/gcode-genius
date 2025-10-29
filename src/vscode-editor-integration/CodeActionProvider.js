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
    // TODO: Iterate through diagnostics in context.diagnostics
    // and for each fixable error, create a vscode.CodeAction.
    return actions;
  }
}
