import { init } from './modules/scene.js';
import { setupVscodeListener } from './modules/vscode-communication.js';
import { initInteractionHandlers, initHotkeys } from './modules/interactions.js';
import { state, vscode } from './modules/state.js';

function runWhenStylesAreReady(callback) {
    const check = () => {
        // We check for a specific VS Code variable on the body. If it has a value, we know styles are loaded.
        if (getComputedStyle(document.body).getPropertyValue('--vscode-editor-foreground').trim()) {
            callback();
        } else {
            // If not, we wait and check again.
            setTimeout(check, 100);
        }
    };
    check();
}

// This is the main entry point for the G-code visualizer webview.
runWhenStylesAreReady(() => {
    // 1. Initialize the Three.js scene and all related components.
    const { renderer } = init();

    // 2. Set up the listener for messages from the VS Code extension.
    setupVscodeListener();

    // 3. Get DOM elements and store them in the state
    state.selectionBoxElement = document.getElementById('selection-box');

    // 4. Initialize all interaction handlers (mouse, keyboard, etc.)
    initInteractionHandlers(renderer);
    initHotkeys();

    // 5. Signal to the extension that the webview is ready.
    vscode.postMessage({ command: 'webviewReady' });
});
