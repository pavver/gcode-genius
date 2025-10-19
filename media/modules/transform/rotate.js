import * as THREE from 'three';
import { state } from '../state.js';
import { getSelectedObjects, cacheAndShowPanel, revertTransformation } from './transform-main.js';
import { highlightLines } from '../interactions.js';
import { sendApplyRotation } from '../vscode-communication.js';

// --- Visualizer for Rotation Center ---
function updateRotationCenterVisualizer() {
    if (!state.transformHelperSphere) return;

    if (state.rotatePanel.style.display !== 'block') {
        state.transformHelperSphere.visible = false;
        return;
    }

    const centerMode = document.getElementById('rotate-center').value;
    const rotationCenter = (centerMode === 'origin') ? new THREE.Vector3(0, 0, 0) : state.cachedSelectionInfo.center;
    
    state.transformHelperSphere.position.copy(rotationCenter);
    state.transformHelperSphere.visible = true;
}


// --- Transformation Logic ---

// Applies the rotate transformation preview
export function applyRotatePreview() {
    updateRotationCenterVisualizer(); // Also update the visualizer on preview
    const selectedObjects = getSelectedObjects();
    const centerMode = document.getElementById('rotate-center').value;
    const angleX = THREE.MathUtils.degToRad(parseFloat(document.getElementById('rotate-x').value) || 0);
    const angleY = THREE.MathUtils.degToRad(parseFloat(document.getElementById('rotate-y').value) || 0);
    const angleZ = THREE.MathUtils.degToRad(parseFloat(document.getElementById('rotate-z').value) || 0);

    const rotationCenter = (centerMode === 'origin') ? new THREE.Vector3(0, 0, 0) : state.cachedSelectionInfo.center;
    const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(angleX, angleY, angleZ, 'ZYX'));

    selectedObjects.forEach(obj => {
        const originalMatrix = state.cachedSelectionInfo.matrices.get(obj.uuid);
        if (originalMatrix) {
            const toCenter = new THREE.Matrix4().makeTranslation(-rotationCenter.x, -rotationCenter.y, -rotationCenter.z);
            const fromCenter = new THREE.Matrix4().makeTranslation(rotationCenter.x, rotationCenter.y, rotationCenter.z);
            const transformMatrix = new THREE.Matrix4().multiply(fromCenter).multiply(rotationMatrix).multiply(toCenter);
            const newMatrix = new THREE.Matrix4().multiplyMatrices(transformMatrix, originalMatrix);
            obj.matrix.copy(newMatrix);
            obj.matrix.decompose(obj.position, obj.quaternion, obj.scale);
        }
    });
}

// --- UI Setup ---

// Caches the current selection and opens the rotate panel
function openRotatePanel() {
    document.getElementById('rotate-center').value = 'selection';
    document.getElementById('rotate-x').value = 0;
    document.getElementById('rotate-y').value = 0;
    document.getElementById('rotate-z').value = 0;
    cacheAndShowPanel(state.rotatePanel);
    updateRotationCenterVisualizer(); // Show visualizer on open
}

// Sets up all event listeners for the rotate panel
export function setupRotateUI(debouncedPreview) {
    document.getElementById('btn-show-rotate').addEventListener('click', openRotatePanel);

    // Update visualizer when center mode changes
    document.getElementById('rotate-center').addEventListener('input', updateRotationCenterVisualizer);

    state.rotatePanel.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('input', debouncedPreview);
    });

    document.getElementById('btn-rotate-cancel').addEventListener('click', () => {
        revertTransformation();
        state.rotatePanel.style.display = 'none';
        if (state.transformHelperSphere) state.transformHelperSphere.visible = false;
        highlightLines(state.mainSelections);
        if (state.isInteractive && state.clientSelectedLines.size > 0) {
            state.transformControlBlock.style.display = 'block';
        }
    });

    document.getElementById('btn-rotate-ok').addEventListener('click', () => {
        if (state.transformHelperSphere) state.transformHelperSphere.visible = false;
        const lineNumbers = Array.from(state.clientSelectedLines);
        if (lineNumbers.length === 0) {
            state.rotatePanel.style.display = 'none';
            return;
        }

        const angles = {
            x: parseFloat(document.getElementById('rotate-x').value) || 0,
            y: parseFloat(document.getElementById('rotate-y').value) || 0,
            z: parseFloat(document.getElementById('rotate-z').value) || 0,
        };

        const centerMode = document.getElementById('rotate-center').value;
        const center = (centerMode === 'origin') 
            ? { x: 0, y: 0, z: 0 } 
            : { x: state.cachedSelectionInfo.center.x, y: state.cachedSelectionInfo.center.y, z: state.cachedSelectionInfo.center.z };

        sendApplyRotation(lineNumbers, angles, center);

        state.rotatePanel.style.display = 'none';
        if (state.isInteractive && state.clientSelectedLines.size > 0) {
            state.transformControlBlock.style.display = 'block';
        }
    });
}