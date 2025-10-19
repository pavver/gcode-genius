import * as THREE from 'three';
import { state } from '../state.js';
import { debounce } from '../utils.js';
import { setupMoveUI, applyMovePreview } from './move.js';
import { setupRotateUI, applyRotatePreview } from './rotate.js';
import { setupMoveToOriginUI, applyMoveToOriginPreview } from './moveToOrigin.js';
import { getThemeColors } from '../theme.js';
import { updateAllMaterials } from '../materials.js';
import { getBoundingBoxColor } from '../color.js';
import { updateAllLineColors } from '../gcode-visualizer.js';



// --- Shared Helper Functions ---

export function getSelectedObjects() {
    if (!state.gcodeGroup) return [];
    return state.gcodeGroup.children.filter(c => state.clientSelectedLines.has(c.userData.lineNumber));
}

export function getSelectionBoundingBox(objects) {
    if (!objects || objects.length === 0) return null;
    const box = new THREE.Box3();
    objects.forEach(obj => {
        const worldMatrix = obj.matrixWorld;
        const geometry = obj.geometry;
        if (geometry.isBufferGeometry) {
            const positionAttribute = geometry.getAttribute('position');
            for (let i = 0; i < positionAttribute.count; i++) {
                const vertex = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
                vertex.applyMatrix4(worldMatrix);
                box.expandByPoint(vertex);
            }
        }
    });
    return box;
}

export function updateBoundingBoxHelper() {
    if (state.boundingBoxHelper) {
        state.scene.remove(state.boundingBoxHelper);
        state.boundingBoxHelper.geometry.dispose();
        state.boundingBoxHelper.material.dispose();
        state.boundingBoxHelper = null;
    }
    if (state.btnToggleBbox) {
        state.btnToggleBbox.classList.toggle('active', state.isBboxVisible);
    }
    if (!state.isBboxVisible) return;

    const selectedObjects = getSelectedObjects();
    if (selectedObjects.length > 0) {
        const box = getSelectionBoundingBox(selectedObjects);
        if (box) {
            const backgroundColor = state.scene ? '#' + state.scene.background.getHexString() : null;
            const boxColor = new THREE.Color(getBoundingBoxColor(backgroundColor));
            state.boundingBoxHelper = new THREE.Box3Helper(box, boxColor);
            state.scene.add(state.boundingBoxHelper);
        }
    }
}

export function revertTransformation() {
    state.cachedSelectionInfo.matrices.forEach((matrix, uuid) => {
        const obj = state.scene.getObjectByProperty('uuid', uuid);
        if (obj) {
            obj.matrix.copy(matrix);
            obj.matrix.decompose(obj.position, obj.quaternion, obj.scale);
            obj.updateMatrixWorld(true); // Force update for subsequent calculations
        }
    });
    updateBoundingBoxHelper();
}

export function cacheAndShowPanel(panel) {
    state.cachedSelectionInfo.matrices.clear();
    const selectedObjects = getSelectedObjects();
    if (selectedObjects.length === 0) return;

    selectedObjects.forEach(obj => {
        obj.updateMatrixWorld(true);
        state.cachedSelectionInfo.matrices.set(obj.uuid, obj.matrix.clone());
    });

    const selectionBox = getSelectionBoundingBox(selectedObjects);
    if (selectionBox) {
        selectionBox.getCenter(state.cachedSelectionInfo.center);
    }

    state.transformControlBlock.style.display = 'none';
    panel.style.display = 'block';
}

// --- Main Preview & UI Setup ---

export function applyPreviewTransformation() {
    revertTransformation();
    if (state.movePanel.style.display === 'block') {
        applyMovePreview();
    } else if (state.rotatePanel.style.display === 'block') {
        applyRotatePreview();
    } else if (state.moveToOriginPanel.style.display === 'block') {
        applyMoveToOriginPreview();
    }
    updateBoundingBoxHelper();
}

export function setupTransformationUI() {

    const uiHTML = `
        <div id="transform-controls" class="transform-panel">
            <button id="btn-show-move">Move</button>
            <button id="btn-show-rotate">Rotate</button>
            <button id="btn-move-to-origin">Move to Origin</button>
            <button id="btn-toggle-bbox">Bounding Box</button>
        </div>
        <div id="move-panel" class="transform-panel">
            <h4>Move Selection</h4>
            <div class="input-group">
                <label>Mode:</label>
                <select id="move-mode">
                    <option value="relative">Relative</option>
                    <option value="global">Global</option>
                </select>
            </div>
            <div class="input-group"><label>X:</label><input type="number" id="move-x" value="0"></div>
            <div class="input-group"><label>Y:</label><input type="number" id="move-y" value="0"></div>
            <div class="input-group"><label>Z:</label><input type="number" id="move-z" value="0"></div>
            <div class="button-group">
                <button id="btn-move-ok">OK</button>
                <button id="btn-move-cancel">Cancel</button>
            </div>
        </div>
        <div id="rotate-panel" class="transform-panel">
            <h4>Rotate Selection</h4>
            <div class="input-group">
                <label>Center:</label>
                <select id="rotate-center">
                    <option value="selection">Selection Center</option>
                    <option value="origin">World Origin</option>
                </select>
            </div>
            <div class="input-group"><label>X Angle:</label><input type="number" id="rotate-x" value="0"></div>
            <div class="input-group"><label>Y Angle:</label><input type="number" id="rotate-y" value="0"></div>
            <div class="input-group"><label>Z Angle:</label><input type="number" id="rotate-z" value="0"></div>
            <div class="button-group">
                <button id="btn-rotate-ok">OK</button>
                <button id="btn-rotate-cancel">Cancel</button>
            </div>
        </div>
        <div id="move-to-origin-panel" class="transform-panel">
            <h4>Move to Origin</h4>
            <div class="input-group">
                <label>Reference:</label>
                <select id="mto-reference">
                    <option value="min">Min Point</option>
                    <option value="center">Center</option>
                </select>
            </div>
            <div class="input-group">
                <label>Axes:</label>
                <div id="mto-axes-group">
                    <label><input type="checkbox" id="mto-axis-x" checked> X</label>
                    <label><input type="checkbox" id="mto-axis-y" checked> Y</label>
                    <label><input type="checkbox" id="mto-axis-z" checked> Z</label>
                </div>
            </div>
            <div class="button-group">
                <button id="btn-mto-ok">OK</button>
                <button id="btn-mto-cancel">Cancel</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', uiHTML);

    // Get references to main UI elements and store in state
    state.transformControlBlock = document.getElementById('transform-controls');
    state.movePanel = document.getElementById('move-panel');
    state.rotatePanel = document.getElementById('rotate-panel');
    state.moveToOriginPanel = document.getElementById('move-to-origin-panel');
    state.btnToggleBbox = document.getElementById('btn-toggle-bbox');

    // Setup main panel listeners
    document.getElementById('btn-toggle-bbox').addEventListener('click', () => {
        state.isBboxVisible = !state.isBboxVisible;
        updateBoundingBoxHelper();
    });

    // Create a single debounced preview function
    const debouncedPreview = debounce(applyPreviewTransformation, 150);

    // Setup listeners for each specific transformation UI
    setupMoveUI(debouncedPreview);
    setupRotateUI(debouncedPreview);
    setupMoveToOriginUI();

}
