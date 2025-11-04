import * as vscode from 'vscode';
import { GCodeLanguageService } from './GCodeLanguageService.js';
import { DiagnosticService } from './DiagnosticService.js';
import { EditorManager } from './EditorManager.js';
import { CodeActionProvider } from './CodeActionProvider.js';

/**
 * This is the main entry point for the editor integration module.
 * It initializes all the necessary services and managers.
 */
export function activate(context, documentStateManager, gcodeDatabase) {
  console.log('Activating G-Code editor integration...');

  // 1. Initialize services
  const languageService = new GCodeLanguageService();
  const diagnosticService = new DiagnosticService(languageService);
  
  // 2. Activate services that listen to events
  diagnosticService.activate(documentStateManager);
  context.subscriptions.push(diagnosticService);

  // 3. Initialize the editor manager that listens to VS Code events
  const editorManager = new EditorManager(documentStateManager);
  context.subscriptions.push(...editorManager.listen());

  // 4. Register providers
  const codeActionProvider = new CodeActionProvider(languageService);
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider('gcode', codeActionProvider)
  );

  console.log('G-Code editor integration activated.');
}

