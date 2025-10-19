import { state, vscode } from './state.js';
import { visualizeGcode } from './gcode-visualizer.js';
import { highlightLines } from './interactions.js';
import { debounce } from './utils.js';
import { revertTransformation } from './transform/transform-main.js';

// This module handles all communication with the VS Code extension host.

export function sendApplyMove(lineNumbers, offset) {
  vscode.postMessage({
    command: 'applyMove',
    lines: lineNumbers,
    offset: offset,
  });
}

export function sendApplyRotation(lineNumbers, angles, center) {
  vscode.postMessage({
    command: 'applyRotation',
    lines: lineNumbers,
    angles: angles,
    center: center,
  });
}

export const debouncedPostGoToLine = debounce((lineNumber) => {
  vscode.postMessage({ command: 'goToLine', lineNumber: lineNumber });
}, 150);

export function setupVscodeListener() {
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'displayGcode':
                // If code is updated while a transform is active, cancel the transform.
                if (state.movePanel.style.display === 'block' || 
                    state.rotatePanel.style.display === 'block' || 
                    state.moveToOriginPanel.style.display === 'block') {
                    revertTransformation();
                    state.movePanel.style.display = 'none';
                    state.rotatePanel.style.display = 'none';
                    state.moveToOriginPanel.style.display = 'none';
                    if (state.transformHelperSphere) state.transformHelperSphere.visible = false;
                }

                visualizeGcode(message.gcodeData);
                if (!state.isCameraStateRestored) {
                    const savedState = vscode.getState();
                    if (savedState && savedState.cameraState) {
                        state.camera.position.fromArray(savedState.cameraState.position);
                        state.controls.target.fromArray(savedState.cameraState.target);
                        state.controls.update();
                    }
                    state.isCameraStateRestored = true;
                }
                break;
            case 'highlightLines':
                highlightLines(message.selections);
                break;
            case 'setDocumentUri':
                vscode.setState({ documentUri: message.uri });
                break;
            case 'resetToLastLine':
                if (state.segmentToLineMap.length > 0) {
                    const lastLineNumber = state.segmentToLineMap[state.segmentToLineMap.length - 1];
                    highlightLines([{ startLine: lastLineNumber, endLine: lastLineNumber, startChar: 0, endChar: 0 }]);
                }
                break;
            case 'setInteractiveMode':
                state.isInteractive = message.enabled;
                if (!state.isInteractive) {
                    state.clientSelectedLines.clear();
                    state.lastSelectedLine = null;
                }
                break;
        }
    });
}
