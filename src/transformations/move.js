const vscode = require('vscode');

/**
 * Applies a move transformation to the selected G-code lines.
 * @param {vscode.TextEditor} editor The active text editor.
 * @param {vscode.TextDocument} document The document to edit.
 * @param {number[]} lines The 1-based line numbers to modify.
 * @param {{x: number, y: number, z: number}} offset The offset to apply.
 */
function applyMove(editor, document, lines, offset) {
    const edit = new vscode.WorkspaceEdit();

    for (const lineNumber of lines) {
        const lineIndex = lineNumber - 1;
        if (lineIndex < 0 || lineIndex >= document.lineCount) continue;

        const line = document.lineAt(lineIndex);
        let originalText = line.text;

        const modifiedText = originalText.replace(/([XYZ])(-?\d+(?:\.\d+)?)/gi, (match, axis, value) => {
            const originalValue = parseFloat(value);
            let newValue;
            switch (axis.toUpperCase()) {
                case 'X': newValue = originalValue + offset.x; break;
                case 'Y': newValue = originalValue + offset.y; break;
                case 'Z': newValue = originalValue + offset.z; break;
                default: return match;
            }
            return `${axis.toUpperCase()}${newValue.toFixed(4)}`;
        });

        if (originalText !== modifiedText) {
            edit.replace(document.uri, line.range, modifiedText);
        }
    }

    vscode.workspace.applyEdit(edit).then(success => {
        if (!success) {
            vscode.window.showErrorMessage('Failed to apply G-code move transformation.');
        }
    });
}

module.exports = {
    applyMove
};