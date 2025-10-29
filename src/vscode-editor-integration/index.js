import * as vscode from 'vscode';
import { Validator } from '../genius-parser/validator/src/index.js';
import { GCodeLanguageService } from './GCodeLanguageService.js';
import { DiagnosticService } from './DiagnosticService.js';
import { EditorManager } from './EditorManager.js';

/**
 * This is the main entry point for the editor integration module.
 * It initializes all the necessary services and managers.
 */
export function activate(context, documentStateManager, gcodeDatabase) {
  console.log('Activating G-Code editor integration...');

  // 1. Initialize services
  const validator = new Validator(gcodeDatabase);
  const languageService = new GCodeLanguageService(validator, null /*fixer*/);
  const diagnosticService = new DiagnosticService(languageService);
  
  // 2. Activate services that listen to events
  diagnosticService.activate(documentStateManager);
  context.subscriptions.push(diagnosticService);

  // 3. Initialize the editor manager that listens to VS Code events
  const editorManager = new EditorManager(documentStateManager);
  context.subscriptions.push(...editorManager.listen());

  // 4. Register providers (CodeActionProvider to be done later)
  // context.subscriptions.push(
  //   vscode.languages.registerCodeActionsProvider('gcode', codeActionProvider)
  // );

  console.log('G-Code editor integration activated.');
}
