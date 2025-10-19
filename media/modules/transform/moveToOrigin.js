import * as THREE from 'three';
import { state } from '../state.js';
import { getSelectedObjects, getSelectionBoundingBox, cacheAndShowPanel, revertTransformation, applyPreviewTransformation } from './transform-main.js';
import { highlightLines } from '../interactions.js';
import { sendApplyMove } from '../vscode-communication.js';

function getReferencePoint(box, referenceType) {
    if (referenceType === 'center') {
        const center = new THREE.Vector3();
        box.getCenter(center);
        return center;
    }
    return box.min.clone();
}

export function applyMoveToOriginPreview() {
    const selectedObjects = getSelectedObjects();
    if (selectedObjects.length === 0) return;

    const selectionBox = getSelectionBoundingBox(selectedObjects);
    if (!selectionBox) return;

    const referenceType = document.getElementById('mto-reference').value;
    const referencePoint = getReferencePoint(selectionBox, referenceType);

    const offset = new THREE.Vector3(
        document.getElementById('mto-axis-x').checked ? -referencePoint.x : 0,
        document.getElementById('mto-axis-y').checked ? -referencePoint.y : 0,
        document.getElementById('mto-axis-z').checked ? -referencePoint.z : 0
    );

    selectedObjects.forEach(obj => {
        const originalMatrix = state.cachedSelectionInfo.matrices.get(obj.uuid);
        if (originalMatrix) {
            const newMatrix = new THREE.Matrix4().makeTranslation(offset.x, offset.y, offset.z).multiply(originalMatrix);
            obj.matrix.copy(newMatrix);
            obj.matrix.decompose(obj.position, obj.quaternion, obj.scale);
            obj.updateMatrixWorld(true); // Force update for BBox helper
        }
    });
}

function openMoveToOriginPanel() {
    cacheAndShowPanel(state.moveToOriginPanel);
    // Set defaults
    document.getElementById('mto-reference').value = 'min';
    document.getElementById('mto-axis-x').checked = true;
    document.getElementById('mto-axis-y').checked = true;
    document.getElementById('mto-axis-z').checked = true;
    // Apply initial preview
    applyPreviewTransformation();
}

export function setupMoveToOriginUI() {
    document.getElementById('btn-move-to-origin').addEventListener('click', openMoveToOriginPanel);

    state.moveToOriginPanel.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('input', () => {
            applyPreviewTransformation();
        });
    });

    document.getElementById('btn-mto-cancel').addEventListener('click', () => {
        revertTransformation();
        state.moveToOriginPanel.style.display = 'none';
        highlightLines(state.mainSelections);
        if (state.isInteractive && state.clientSelectedLines.size > 0) {
            state.transformControlBlock.style.display = 'block';
        }
    });

    document.getElementById('btn-mto-ok').addEventListener('click', () => {
        // Recalculate final offset to be sure
        const selectionBox = getSelectionBoundingBox(getSelectedObjects());
        if (!selectionBox) return;
        
        revertTransformation();
        const originalBox = getSelectionBoundingBox(getSelectedObjects());
        const referenceType = document.getElementById('mto-reference').value;
        const referencePoint = getReferencePoint(originalBox, referenceType);

        const offset = {
            x: document.getElementById('mto-axis-x').checked ? -referencePoint.x : 0,
            y: document.getElementById('mto-axis-y').checked ? -referencePoint.y : 0,
            z: document.getElementById('mto-axis-z').checked ? -referencePoint.z : 0
        };

        const lineNumbers = Array.from(state.clientSelectedLines);
        sendApplyMove(lineNumbers, offset);

        state.moveToOriginPanel.style.display = 'none';
        if (state.isInteractive && state.clientSelectedLines.size > 0) {
            state.transformControlBlock.style.display = 'block';
        }
    });
}