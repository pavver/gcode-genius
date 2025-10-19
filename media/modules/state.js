import * as THREE from 'three';

// Centralized state for the visualizer.
// All modules will import this to share data and objects.

export const vscode = acquireVsCodeApi();

export const state = {
    themeColors: {},
    // Core Three.js
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    raycaster: null,
    mouse: new THREE.Vector2(),

    // G-code objects
    gcodeGroup: null,
    highlightSpheresGroup: null,

    // Selection & Interaction
    mainSelections: [], // From editor
    hoveredLineNumber: null,
    clientSelectedLines: new Set(),
    lastSelectedLine: null,
    isInteractive: false,
    isSliderDragging: false,
    isPanningOrRotating: false,
    isBoxSelecting: false,
    boxSelectionStartPoint: { x: 0, y: 0 },

    // UI Elements
    slider: null,
    transformControlBlock: null,
    movePanel: null,
    rotatePanel: null,
    moveToOriginPanel: null,
    btnToggleBbox: null,
    selectionBoxElement: null,

    // Transformation state
    isBboxVisible: false,
    transformHelperSphere: null,
    cachedSelectionInfo: {
        matrices: new Map(),
        center: new THREE.Vector3(),
    },

    // Other
    segmentToLineMap: [],
    isCameraStateRestored: false,
};