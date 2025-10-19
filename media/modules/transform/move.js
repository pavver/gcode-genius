import * as THREE from 'three';
import { state } from '../state.js';
import { getSelectedObjects, cacheAndShowPanel, revertTransformation, applyPreviewTransformation } from './transform-main.js';
import { highlightLines } from '../interactions.js';
import { sendApplyMove } from '../vscode-communication.js';

// Applies the move transformation preview
export function applyMovePreview() {
    const selectedObjects = getSelectedObjects();
    const mode = document.getElementById('move-mode').value;
    const x = parseFloat(document.getElementById('move-x').value) || 0;
    const y = parseFloat(document.getElementById('move-y').value) || 0;
    const z = parseFloat(document.getElementById('move-z').value) || 0;

    if (mode === 'relative') {
        const offset = new THREE.Vector3(x, y, z);
        selectedObjects.forEach(obj => {
            const originalMatrix = state.cachedSelectionInfo.matrices.get(obj.uuid);
            if (originalMatrix) {
                const newMatrix = new THREE.Matrix4().makeTranslation(offset.x, offset.y, offset.z).multiply(originalMatrix);
                obj.matrix.copy(newMatrix);
                obj.matrix.decompose(obj.position, obj.quaternion, obj.scale);
            }
        });
    } else { // global
        const targetCenter = new THREE.Vector3(x, y, z);
        const originalCenter = state.cachedSelectionInfo.center;
        const offset = new THREE.Vector3().subVectors(targetCenter, originalCenter);
        selectedObjects.forEach(obj => {
            const originalMatrix = state.cachedSelectionInfo.matrices.get(obj.uuid);
            if (originalMatrix) {
                const newMatrix = new THREE.Matrix4().makeTranslation(offset.x, offset.y, offset.z).multiply(originalMatrix);
                obj.matrix.copy(newMatrix);
                obj.matrix.decompose(obj.position, obj.quaternion, obj.scale);
            }
        });
    }
}

// Handles the change of the move mode (relative/global)
function onMoveModeChange() {
    const mode = document.getElementById('move-mode').value;
    const xInput = document.getElementById('move-x');
    const yInput = document.getElementById('move-y');
    const zInput = document.getElementById('move-z');

    if (mode === 'relative') {
        xInput.value = 0;
        yInput.value = 0;
        zInput.value = 0;
    } else { // global
        const center = state.cachedSelectionInfo.center;
        xInput.value = center.x.toFixed(4);
        yInput.value = center.y.toFixed(4);
        zInput.value = center.z.toFixed(4);
    }
    applyPreviewTransformation();
}

// Caches the current selection and opens the move panel
function openMovePanel() {
    cacheAndShowPanel(state.movePanel);
    document.getElementById('move-mode').value = 'global';
    const center = state.cachedSelectionInfo.center;
    document.getElementById('move-x').value = center.x.toFixed(4);
    document.getElementById('move-y').value = center.y.toFixed(4);
    document.getElementById('move-z').value = center.z.toFixed(4);
}

// Sets up all event listeners for the move panel
export function setupMoveUI(debouncedPreview) {
    document.getElementById('btn-show-move').addEventListener('click', openMovePanel);
    document.getElementById('move-mode').addEventListener('change', onMoveModeChange);

    state.movePanel.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('input', debouncedPreview);
    });

    document.getElementById('btn-move-cancel').addEventListener('click', () => {
        revertTransformation();
        state.movePanel.style.display = 'none';
        highlightLines(state.mainSelections);
        if (state.isInteractive && state.clientSelectedLines.size > 0) {
            state.transformControlBlock.style.display = 'block';
        }
    });

    document.getElementById('btn-move-ok').addEventListener('click', () => {
        const selectedObjects = getSelectedObjects();
        if (selectedObjects.length === 0) {
            state.movePanel.style.display = 'none';
            return;
        }

        const mode = document.getElementById('move-mode').value;
        const x = parseFloat(document.getElementById('move-x').value) || 0;
        const y = parseFloat(document.getElementById('move-y').value) || 0;
        const z = parseFloat(document.getElementById('move-z').value) || 0;

        let offset;
        if (mode === 'relative') {
            offset = new THREE.Vector3(x, y, z);
        } else { // global
            const targetCenter = new THREE.Vector3(x, y, z);
            const originalCenter = state.cachedSelectionInfo.center;
            offset = new THREE.Vector3().subVectors(targetCenter, originalCenter);
        }

        const lineNumbers = Array.from(state.clientSelectedLines);
        sendApplyMove(lineNumbers, { x: offset.x, y: offset.y, z: offset.z });

        // Hide panel and show transform controls
        state.movePanel.style.display = 'none';
        if (state.isInteractive && state.clientSelectedLines.size > 0) {
            state.transformControlBlock.style.display = 'block';
        }
    });
}
