const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const gcodeHighlighter = require('./src/gcode-highlighter');
const { parseGcode, reparseFromLine } = require('./src/gcode-parser');
const THREE = require('three');
const { applyMove } = require('./src/transformations/move');
const { applyRotation } = require('./src/transformations/rotate');
const { formatGCode } = require('./src/gcode-formatter');
const vscodeEditorIntegration = require('./src/vscode-editor-integration');
const { DocumentStateManager } = require('./src/genius-parser/document-state-manager/src/index.js');
const tokenize = require('./src/genius-parser/tokenizer/src/index.js').default;

// Map to store parsed G-code data for each document URI
const parsedGcodeData = new Map();
// Map to store active visualization panels, keyed by document URI string
const activePanels = new Map();

/**
 * Parses the G-code content of a document and stores it.
 * Can perform full parse or incremental re-parse.
 * @param {vscode.TextDocument} document The document to parse.
 * @param {vscode.TextDocumentContentChangeEvent[]} [contentChanges] - Optional content changes for incremental parsing.
 */
function parseAndStoreGcode(document, contentChanges) {
    if (document.languageId === 'gcode') {
        const uriString = document.uri.toString();
        const currentParsedData = parsedGcodeData.get(uriString);
        const newRawLines = document.getText().split('\n');

        let updatedParsedData;

        if (contentChanges && contentChanges.length > 0 && currentParsedData) {
            // Incremental re-parse from the first changed line
            // Find the minimum line number that changed
            const firstChangedLine = contentChanges.reduce((minLine, change) => {
                return Math.min(minLine, change.range.start.line + 1); // +1 for 1-based
            }, document.lineCount + 1); // Initialize with a large number

            updatedParsedData = reparseFromLine(currentParsedData, newRawLines, firstChangedLine);
            console.log(`Incremental re-parsed G-code for ${document.fileName} from line ${firstChangedLine}. Total lines: ${updatedParsedData.length}`);

        } else {
            // Full parse (initial open or if no previous data/changes)
            updatedParsedData = parseGcode(document.getText());
            console.log(`Full parsed G-code for ${document.fileName}. Total lines: ${updatedParsedData.length}`);
        }

        parsedGcodeData.set(uriString, updatedParsedData);
    }
}

const formatNumber = (num) => {
    if (Number.isInteger(num)) {
        return num.toString();
    }
    // Convert to string, then remove trailing zeros and decimal point if all zeros
    let str = num.toFixed(3); // Start with 3 decimal places for consistency
    return str.replace(/\.?0+$/, '');
};

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Provides hover information for G-code lines.
 * @param {vscode.TextDocument} document The document.
 * @param {vscode.Position} position The position in the document.
 * @param {vscode.CancellationToken} token A cancellation token.
 * @returns {vscode.ProviderResult<vscode.Hover>}
 */
function provideHover(document, position, token) {
    if (document.languageId !== 'gcode') {
        return;
    }

    const uriString = document.uri.toString();
    const parsedData = parsedGcodeData.get(uriString);

    if (!parsedData) {
        return;
    }

    const lineIndex = position.line;
    const parsedLine = parsedData[lineIndex];

    if (!parsedLine) {
        return;
    }

    let markdownContent = new vscode.MarkdownString();

    // Original line
    markdownContent.appendMarkdown(`**Line ${parsedLine.lineNumber}:** \n`);

    if (parsedLine.isCommand) {
        markdownContent.appendMarkdown(`**Command:** ${parsedLine.moveCommandType || (parsedLine.isControlCommand ? 'Control' : 'Other')}\n`);
        if (Object.keys(parsedLine.params).length > 0) {
            markdownContent.appendMarkdown(`**Params:** ${Object.entries(parsedLine.params).map(([key, value]) => `${key.toUpperCase()}${value}`).join(' ')}\n`);
        }
    } else {
        markdownContent.appendMarkdown('*(Not a command)*\\n');
    }

    markdownContent.appendMarkdown(`\nState (after): X: ${formatNumber(parsedLine.state.x)}, Y: ${formatNumber(parsedLine.state.y)}, Z: ${formatNumber(parsedLine.state.z)}\n`);
    markdownContent.appendMarkdown(`\nMode: ${parsedLine.state.relative ? 'Relative' : 'Absolute'} (XYZ), ${parsedLine.state.arcCenterRelative ? 'Incremental' : 'Absolute'} (IJK)\n`);

    markdownContent.isTrusted = true;

    return new vscode.Hover(markdownContent);
}

function findObjectBoundary(clickedLineNum, parsedGcode) {
    const objectLines = new Set();
    const gcodeCommands = parsedGcode.filter(l => l.isCommand);
    const startIndex = gcodeCommands.findIndex(l => l.lineNumber === clickedLineNum);

    if (startIndex === -1) return objectLines;

    objectLines.add(clickedLineNum);

    // Expand backwards
    for (let i = startIndex - 1; i >= 0; i--) {
        const line = gcodeCommands[i];
        if (line.moveCommandType === 'G0') break;
        objectLines.add(line.lineNumber);
    }

    // Expand forwards
    for (let i = startIndex + 1; i < gcodeCommands.length; i++) {
        const line = gcodeCommands[i];
        if (line.moveCommandType === 'G0') break;
        objectLines.add(line.lineNumber);
    }

    return objectLines;
}

function getFullSelectionWithComments(targetGcodeLines, document, parsedGcode) {
    const finalLinesToSelect = new Set(); // 0-based editor line indices

    for (const gcodeLineNum of targetGcodeLines) {
        const gcodeLineInfo = parsedGcode.find(l => l.lineNumber === gcodeLineNum);
        if (!gcodeLineInfo) continue;

        const editorLineIndex = gcodeLineInfo.lineNumber - 1;
        finalLinesToSelect.add(editorLineIndex);

        // Spread upwards
        let currentLineIndex = editorLineIndex - 1;
        while (currentLineIndex >= 0) {
            const lineText = document.lineAt(currentLineIndex).text.trim();
            if (lineText === '' || lineText.startsWith(';') || lineText.startsWith('(')) {
                finalLinesToSelect.add(currentLineIndex);
                currentLineIndex--;
            } else {
                break;
            }
        }
    }
    return finalLinesToSelect;
}

function applyLineNumbersToEditor(lineNumbers, editor) {
    const sortedLines = Array.from(lineNumbers).sort((a, b) => a - b);
    const newSelections = [];
    if (sortedLines.length > 0) {
        let start = sortedLines[0];
        let end = sortedLines[0];
        for (let i = 1; i < sortedLines.length; i++) {
            if (sortedLines[i] === end + 1) {
                end = sortedLines[i];
            } else {
                newSelections.push(new vscode.Selection(new vscode.Position(start, 0), new vscode.Position(end, editor.document.lineAt(end).text.length)));
                start = sortedLines[i];
                end = sortedLines[i];
            }
        }
        newSelections.push(new vscode.Selection(new vscode.Position(start, 0), new vscode.Position(end, editor.document.lineAt(end).text.length)));
    }

    if (newSelections.length > 0) {
        editor.selections = newSelections;
        editor.revealRange(newSelections[0]);
    }
}




async function setupVisualizationPanel(panel, context, document) {
    const uriString = document.uri.toString();

    // Get path to HTML file and convert to a URI we can use in the webview.
    const htmlPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'visualization.html');
    const htmlContent = (await vscode.workspace.fs.readFile(htmlPath)).toString();

    // Get path to visualization.js and convert to a URI we can use in the webview.
    const scriptPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'visualization.js');
    const scriptUri = panel.webview.asWebviewUri(scriptPath);

    // Get URIs for our stylesheets
    const stylesProbeUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'theme-probe.css'));
    const stylesUiUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'ui.css'));

    // Replace placeholders in the HTML
    const styles = `<link href="${stylesProbeUri}" rel="stylesheet">\n    <link href="${stylesUiUri}" rel="stylesheet">`;
    let finalHtml = htmlContent
        .replace('<!--STYLES-->', styles)
        .replace('%SCRIPT_URI%', scriptUri.toString());

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
        message => {
            const uriString = document.uri.toString();
            const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === uriString);
            const parsedGcode = parsedGcodeData.get(uriString);

            // Most commands require an editor and parsed G-code
            if (!editor || !parsedGcode) {
                // Handle webviewReady separately as it's the first message
                if (message.command === 'webviewReady') {
                    console.log(`[G-GENIUS] Webview for ${path.basename(uriString)} is ready. Sending data.`);
                    const initialParsedGcode = parsedGcodeData.get(uriString); // Re-fetch just in case
                    if (initialParsedGcode) {
                        panel.webview.postMessage({ command: 'displayGcode', gcodeData: initialParsedGcode });
                        panel.webview.postMessage({ command: 'setDocumentUri', uri: uriString });
                    }
                    // If there's no editor, the panel will be non-interactive
                    panel.webview.postMessage({ command: 'setInteractiveMode', enabled: false });
                    panel.webview.postMessage({ command: 'resetToLastLine' });
                }
                return;
            }

            switch (message.command) {
                case 'webviewReady': {
                    console.log(`[G-GENIUS] Webview for ${path.basename(uriString)} is ready and editor is visible. Sending data.`);
                    panel.webview.postMessage({ command: 'displayGcode', gcodeData: parsedGcode });
                    panel.webview.postMessage({ command: 'setDocumentUri', uri: uriString });
                    panel.webview.postMessage({ command: 'setInteractiveMode', enabled: true });

                    const selections = editor.selections.map(s => ({
                        startLine: s.start.line + 1,
                        endLine: s.end.line + 1,
                        startChar: s.start.character,
                        endChar: s.end.character
                    }));
                    panel.webview.postMessage({ command: 'highlightLines', selections: selections });
                    break;
                }
                case 'goToLine': { // This is still used by the slider
                    const line = message.lineNumber;
                    if (line >= 0 && line < editor.document.lineCount) {
                        const range = new vscode.Range(line, 0, line, 0);
                        editor.selection = new vscode.Selection(range.start, range.end);
                        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                    }
                    break;
                }
                case 'setSmartSelection': {
                    if (message.selectedLines) {
                        const targetGcodeLines = new Set(message.selectedLines);
                        const finalLinesToSelect = getFullSelectionWithComments(targetGcodeLines, editor.document, parsedGcode);
                        applyLineNumbersToEditor(finalLinesToSelect, editor);
                    }
                    break;
                }
                case 'selectObjectAtLine': {
                    if (message.lineNumber) {
                        const objectLines = findObjectBoundary(message.lineNumber, parsedGcode);
                        const finalLinesToSelect = getFullSelectionWithComments(objectLines, editor.document, parsedGcode);
                        applyLineNumbersToEditor(finalLinesToSelect, editor);
                    }
                    break;
                }
                case 'applyMove': {
                    if (message.lines && message.offset) {
                        applyMove(editor, document, message.lines, message.offset);
                    }
                    break;
                }
                case 'applyRotation': {
                    if (message.lines && message.angles && message.center) {
                        applyRotation(editor, document, message.lines, message.angles, message.center, parsedGcode);
                    }
                    break;
                }
                case 'executeEditorCommand': {
                    if (message.commandId && editor) {
                        // First, focus the editor window
                        vscode.window.showTextDocument(editor.document, editor.viewColumn, false).then(() => {
                            // Add a small delay to ensure the editor has focus before executing the command
                            setTimeout(() => {
                                vscode.commands.executeCommand(message.commandId).then(() => {
                                    // Finally, focus the webview panel back
                                    panel.reveal(panel.viewColumn);
                                });
                            }, 100); // 100ms delay
                        });
                    }
                    break;
                }
                case 'clearSelection': {
                    const activePosition = editor.selection.active;
                    editor.selection = new vscode.Selection(activePosition, activePosition);
                    break;
                }
                case 'deleteSelectedLines': {
                    if (editor) {
                        // The 'editor.action.deleteLines' command is robust. The key is to ensure
                        // it has a proper selection to act upon, even if the editor just has a cursor.
                        if (editor.selection.isEmpty) {
                            // If there's no block selection (just a cursor), create a selection
                            // for the entire line where the cursor is.
                            const position = editor.selection.active;
                            const line = editor.document.lineAt(position.line);
                            editor.selection = new vscode.Selection(line.range.start, line.range.end);
                        }

                        // Now that we're guaranteed to have a selection (either pre-existing or one we just made),
                        // we can run the reliable delete command.
                        vscode.window.showTextDocument(editor.document, editor.viewColumn, false).then(() => {
                            setTimeout(() => {
                                vscode.commands.executeCommand('editor.action.deleteLines').then(() => {
                                    panel.reveal(panel.viewColumn);
                                });
                            }, 50);
                        });
                    }
                    break;
                }
            }
        },
        undefined,
        context.subscriptions
    );

    // Set the HTML content now. The webview will load and send 'webviewReady' when it's done.
    panel.webview.html = finalHtml;

    // --- Live Highlight Update ---
    const debouncedSendSelection = debounce((editor) => {
        if (editor.document.uri.toString() === document.uri.toString()) {
            const selections = editor.selections.map(s => ({
                startLine: s.start.line + 1,
                endLine: s.end.line + 1,
                startChar: s.start.character,
                endChar: s.end.character
            }));
            panel.webview.postMessage({ command: 'highlightLines', selections: selections });
        }
    }, 200);

    const selectionChangeSubscription = vscode.window.onDidChangeTextEditorSelection(event => {
        if (event.textEditor.document.uri.toString() === document.uri.toString()) {
            debouncedSendSelection(event.textEditor);
        }
    });

    // --- Document Change Update ---
    const updateWebview = (changedDocument) => {
        if (changedDocument.uri.toString() === document.uri.toString()) {
            const updatedParsedGcode = parsedGcodeData.get(uriString);
            if (updatedParsedGcode) {
                panel.webview.postMessage({ command: 'displayGcode', gcodeData: updatedParsedGcode });
            }
        }
    };

    const docChangeSubscription = vscode.workspace.onDidChangeTextDocument(event => updateWebview(event.document));
    const docSaveSubscription = vscode.workspace.onDidSaveTextDocument(updateWebview);

    // Dispose all listeners when the panel is closed
    panel.onDidDispose(
        () => {
            // Clean up our resources
            activePanels.delete(uriString);
            selectionChangeSubscription.dispose();
            docChangeSubscription.dispose();
            docSaveSubscription.dispose();

            // If the panel is closed and the source document is also not open,
            // we can clean up the parsed data to save memory.
            const isDocumentOpen = vscode.workspace.textDocuments.some(doc => doc.uri.toString() === uriString);
            if (!isDocumentOpen) {
                parsedGcodeData.delete(uriString);
                console.log(`Cleaned up parsed data for ${path.basename(uriString)}`);
            }
        },
        null,
        context.subscriptions
    );
}


function activate(context) {
    console.log('Congratulations, your extension "gcode-genius" is now active!');

    // Activate vscode-editor-integration
    const documentStateManager = new DocumentStateManager(tokenize);

    const gcodeDatabasePath = path.join(context.extensionPath, 'src', 'genius-parser', 'gcode-database.json');
    const gcodeDatabaseJson = fs.readFileSync(gcodeDatabasePath, 'utf8');
    const gcodeDatabase = JSON.parse(gcodeDatabaseJson);
    vscodeEditorIntegration.activate(context, documentStateManager, gcodeDatabase);

    // Activate the dynamic highlighter
    gcodeHighlighter.activate();

    // Initial parsing for all currently open G-code documents
    vscode.workspace.textDocuments.forEach(document => parseAndStoreGcode(document));

    // Listen for document open events
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(document => {
            // Parse the document first
            parseAndStoreGcode(document);

            // If a panel for this document already exists (e.g. was restored),
            // re-sync its visualization with the cursor.
            const uriString = document.uri.toString();
            const existingPanel = activePanels.get(uriString);
            if (existingPanel) {
                console.log(`[G-GENIUS] Re-syncing visualization for opened document: ${document.fileName}`);
                existingPanel.webview.postMessage({ command: 'setInteractiveMode', enabled: true });

                const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === uriString);
                if (editor) {
                    const selections = editor.selections.map(s => ({
                        startLine: s.start.line + 1,
                        endLine: s.end.line + 1,
                        startChar: s.start.character,
                        endChar: s.end.character
                    }));
                    existingPanel.webview.postMessage({ command: 'highlightLines', selections: selections });
                }
            }
        })
    );

    // Listen for document change events (e.g., user types)
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            // Only re-parse if the document is a G-code file and has changes
            if (event.document.languageId === 'gcode' && event.contentChanges.length > 0) {
                parseAndStoreGcode(event.document, event.contentChanges);
            }
        })
    );

    // Listen for document close events
    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument(document => {
            const uriString = document.uri.toString();
            const panel = activePanels.get(uriString);

            if (panel) {
                // If a panel is open for the closed document, tell it to reset to a default state
                panel.webview.postMessage({ command: 'setInteractiveMode', enabled: false });
                panel.webview.postMessage({ command: 'resetToLastLine' });
            } else {
                // Otherwise, no panel and no document, so we can clean up parsed data
                parsedGcodeData.delete(uriString);
                console.log(`Cleaned up parsed data for ${document.fileName}`);
            }
        })
    );

    // Register the hover provider
    context.subscriptions.push(
        vscode.languages.registerHoverProvider('gcode', { provideHover })
    );

    // Command to show G-code visualization
    let disposableShowVisualization = vscode.commands.registerCommand('gcode-genius.showVisualization', function () {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'gcode') {
            vscode.window.showInformationMessage('Open a G-code file to visualize.');
            return;
        }

        const document = editor.document;
        const uriString = document.uri.toString();
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        // If we already have a panel for this document, show it.
        const existingPanel = activePanels.get(uriString);
        if (existingPanel) {
            existingPanel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            'gcodeVisualization', // Identifies the type of the webview. Used internally
            `Preview: ${path.basename(document.fileName)}`, // Title of the panel displayed to the user
            vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
            {
                enableScripts: true, // Enable scripts in the webview
                retainContextWhenHidden: true, // Keep webview alive in background
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
            }
        );

        activePanels.set(uriString, panel);
        setupVisualizationPanel(panel, context, document);
    });

    // Register the serializer for the webview panel
    vscode.window.registerWebviewPanelSerializer('gcodeVisualization', new VisualizationPanelSerializer(context));

    // Register the G-code formatting provider
    const formattingProvider = {
        provideDocumentFormattingEdits(document) {
            const formattedText = formatGCode(document.getText());
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
            );
            return [vscode.TextEdit.replace(fullRange, formattedText)];
        }
    };

    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider('gcode', formattingProvider)
    );
}

class VisualizationPanelSerializer {
    constructor(context) {
        this._context = context;
    }

    async deserializeWebviewPanel(webviewPanel, state) {
        // The state contains the URI of the document being visualized
        if (!state || !state.documentUri) {
            webviewPanel.dispose();
            return;
        }

        const documentUri = vscode.Uri.parse(state.documentUri);
        let document;
        try {
            // Try to open the document. If it doesn't exist, we can't restore.
            document = await vscode.workspace.openTextDocument(documentUri);
        } catch (e) {
            console.warn(`Could not restore visualization panel for ${state.documentUri}: Document not found.`);
            webviewPanel.dispose();
            return;
        }

        // Restore the content of the webview by calling the same setup function
        // The setup function now handles waiting for the webview to be ready.
        await setupVisualizationPanel(webviewPanel, this._context, document);
        
        // And re-add it to our map of active panels
        activePanels.set(document.uri.toString(), webviewPanel);
    }
}

function deactivate() {
    gcodeHighlighter.deactivate();
    parsedGcodeData.clear(); // Clear data on deactivate
}

module.exports = {
    activate,
    deactivate
};