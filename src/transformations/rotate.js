const vscode = require('vscode');
const THREE = require('three');

/**
 * Applies a rotation transformation to the selected G-code lines.
 * @param {vscode.TextEditor} editor The active text editor.
 * @param {vscode.TextDocument} document The document to edit.
 * @param {number[]} lines The 1-based line numbers to modify.
 * @param {{x: number, y: number, z: number}} angles The rotation angles in degrees.
 * @param {{x: number, y: number, z: number}} center The center of rotation.
 * @param {Array<Object>} parsedGcode The full parsed G-code data for the document.
 */
function applyRotation(editor, document, lines, angles, center, parsedGcode) {
    const edit = new vscode.WorkspaceEdit();

    const euler = new THREE.Euler(
        THREE.MathUtils.degToRad(angles.x),
        THREE.MathUtils.degToRad(angles.y),
        THREE.MathUtils.degToRad(angles.z),
        'ZYX'
    );
    const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(euler);
    const rotationCenter = new THREE.Vector3(center.x, center.y, center.z);

    for (const lineNumber of lines) {
        const lineIndex = lineNumber - 1;
        if (lineIndex < 0 || lineIndex >= document.lineCount) continue;

        const parsedLine = parsedGcode[lineIndex];
        const prevState = lineIndex > 0 ? parsedGcode[lineIndex - 1].state : { x: 0, y: 0, z: 0 };

        if (!parsedLine || !parsedLine.isCommand) continue;

        let originalText = document.lineAt(lineIndex).text;
        let modifiedText = originalText;

        const targetPoint = new THREE.Vector3(
            parsedLine.params.x !== undefined ? parsedLine.params.x : prevState.x,
            parsedLine.params.y !== undefined ? parsedLine.params.y : prevState.y,
            parsedLine.params.z !== undefined ? parsedLine.params.z : prevState.z
        );

        targetPoint.sub(rotationCenter);
        targetPoint.applyMatrix4(rotationMatrix);
        targetPoint.add(rotationCenter);

        const hasIJK = parsedLine.params.i !== undefined || parsedLine.params.j !== undefined || parsedLine.params.k !== undefined;
        let ijkVector;
        if (hasIJK) {
            ijkVector = new THREE.Vector3(
                parsedLine.params.i || 0,
                parsedLine.params.j || 0,
                parsedLine.params.k || 0
            );
            ijkVector.applyMatrix4(rotationMatrix);
        }

        modifiedText = modifiedText.replace(/([XYZIJK])(-?\d+(?:\.\d+)?)/gi, (match, axis, value) => {
            const upperAxis = axis.toUpperCase();
            switch (upperAxis) {
                case 'X': return `X${targetPoint.x.toFixed(4)}`;
                case 'Y': return `Y${targetPoint.y.toFixed(4)}`;
                case 'Z': return `Z${targetPoint.z.toFixed(4)}`;
                case 'I': return hasIJK ? `I${ijkVector.x.toFixed(4)}` : match;
                case 'J': return hasIJK ? `J${ijkVector.y.toFixed(4)}` : match;
                case 'K': return hasIJK ? `K${ijkVector.z.toFixed(4)}` : match;
                default: return match;
            }
        });

        if (originalText !== modifiedText) {
            edit.replace(document.uri, document.lineAt(lineIndex).range, modifiedText);
        }
    }

    vscode.workspace.applyEdit(edit).then(success => {
        if (!success) {
            vscode.window.showErrorMessage('Failed to apply G-code rotation.');
        }
    });
}

module.exports = {
    applyRotation
};