import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { state, vscode } from './state.js';
import { setupTransformationUI, updateBoundingBoxHelper } from './transform/transform-main.js';
import { debouncedPostGoToLine } from './vscode-communication.js';
import { initializeThemeObserver } from './theme.js';
import { materials, updateAllMaterials } from './materials.js';
import { updateAllLineColors } from './gcode-visualizer.js';
// Import the new manager
import { setIsRotating, setIsPanning, pulseZoomFlag } from './pivot-sphere-manager.js';

// This module initializes and manages the core Three.js scene and rendering loop.

function animate() {
    requestAnimationFrame(animate);
    state.controls.update();

    // The pivot sphere's position is always updated to match the controls target
    if (state.pivotSphere && state.controls) {
        state.pivotSphere.position.copy(state.controls.target);
        const distance = state.camera.position.distanceTo(state.pivotSphere.position);
        const scale = distance / 50;
        state.pivotSphere.scale.set(scale, scale, scale);
    }

    // Highlight spheres are scaled independently
    if (state.highlightSpheresGroup) {
        state.highlightSpheresGroup.children.forEach(sphere => {
            const distance = state.camera.position.distanceTo(sphere.position);
            const scale = distance / 50;
            sphere.scale.set(scale, scale, scale);
        });
    }

    // Scale transform helper sphere
    if (state.transformHelperSphere && state.transformHelperSphere.visible) {
        const distance = state.camera.position.distanceTo(state.transformHelperSphere.position);
        const scale = distance / 50;
        state.transformHelperSphere.scale.set(scale, scale, scale);
    }

    state.renderer.render(state.scene, state.camera);
}

function onWindowResize() {
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(window.innerWidth, window.innerHeight);
}

export function init() {
    // --- Basic Scene Setup ---
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0x000000); // Placeholder, will be set by theme manager

    state.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    state.camera.position.set(20, 20, 50);
    state.camera.up.set(0, 0, 1);

    state.renderer = new THREE.WebGLRenderer({ antialias: true });
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas-container').appendChild(state.renderer.domElement);

    // --- Controls Setup ---
    state.controls = new OrbitControls(state.camera, state.renderer.domElement);
    state.controls.enableDamping = true;
    state.controls.dampingFactor = 0.1;
    state.controls.screenSpacePanning = false;
    state.controls.target.set(0, 0, 0);
    state.controls.mouseButtons = {
        MIDDLE: THREE.MOUSE.ROTATE,
        RIGHT: THREE.MOUSE.PAN
    };

    // --- Scene Objects ---
    state.gcodeGroup = new THREE.Group();
    state.scene.add(state.gcodeGroup);
    state.highlightSpheresGroup = new THREE.Group();
    state.scene.add(state.highlightSpheresGroup);
    const pivotGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    state.pivotSphere = new THREE.Mesh(pivotGeometry, materials.mesh.pivotSphere);
    state.pivotSphere.visible = false; // Initially hidden, managed by pivot-sphere-manager
    state.scene.add(state.pivotSphere);

    // Create the sphere for the rotation center
    const rotationCenterGeometry = new THREE.SphereGeometry(0.4, 16, 16); // Slightly smaller
    state.transformHelperSphere = new THREE.Mesh(rotationCenterGeometry, materials.mesh.transformHelperSphere);
    state.transformHelperSphere.visible = false; // Initially hidden
    state.scene.add(state.transformHelperSphere);

    state.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    state.scene.add(state.ambientLight);
    state.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    state.directionalLight.position.set(50, 50, 100);
    state.scene.add(state.directionalLight);
    state.axesHelper = new THREE.AxesHelper(20);
    state.scene.add(state.axesHelper);
    state.raycaster = new THREE.Raycaster();

    // --- Initialize Theme Listener ---
    initializeThemeObserver(() => {
        updateAllMaterials();
        updateAllLineColors();
        updateBoundingBoxHelper();
    });

    // --- UI Setup ---
    state.slider = document.createElement('input');
    state.slider.id = 'gcode-slider'; // Assign ID for CSS styling
    state.slider.type = 'range';
    state.slider.min = 0;
    state.slider.max = 100;
    state.slider.value = 100;
    document.body.appendChild(state.slider);
    setupTransformationUI();

    // --- Event Listeners ---

    // General listeners
    window.addEventListener('resize', onWindowResize);
    state.slider.addEventListener('input', (event) => {
        state.isSliderDragging = true;
        const segmentIndex = parseInt(event.target.value, 10);
        if (state.segmentToLineMap[segmentIndex] !== undefined) {
            const lineNumber = state.segmentToLineMap[segmentIndex];
            debouncedPostGoToLine(lineNumber - 1);
        }
    });
    state.slider.addEventListener('mouseup', () => { state.isSliderDragging = false; });
    state.slider.addEventListener('touchend', () => { state.isSliderDragging = false; });

    // Listener for saving camera state
    state.controls.addEventListener('end', () => {
        const currentState = vscode.getState() || {};
        currentState.cameraState = {
            position: state.camera.position.toArray(),
            target: state.controls.target.toArray()
        };
        vscode.setState(currentState);
    });

    // --- Pivot Snapping & Sphere Visibility Listeners (NEW CLEAN LOGIC) ---

    state.renderer.domElement.addEventListener('pointerdown', (event) => {
        if (event.button === 1) { // Middle mouse (rotate)
            setIsRotating(true);
            // --- Pivot Snapping Logic ---
            const distance = state.camera.position.distanceTo(state.controls.target);
            state.raycaster.params.Line.threshold = distance / 150;
            state.raycaster.setFromCamera(new THREE.Vector2(0, 0), state.camera);
            const intersects = state.raycaster.intersectObjects(state.gcodeGroup.children, false);
            if (intersects.length > 0) {
                state.controls.target.copy(intersects[0].point);
            }
        } else if (event.button === 2) { // Right mouse (pan)
            setIsPanning(true);
        }
    }, false);

    // Prevent the default context menu on right-click
    state.renderer.domElement.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    }, false);

    window.addEventListener('pointerup', (event) => {
        // Use two separate `if` statements to handle button releases independently
        if (event.button === 1) { // Middle mouse (rotate)
            setIsRotating(false);
        }
        if (event.button === 2) { // Right mouse (pan)
            setIsPanning(false);
        }
    }, false);

    state.renderer.domElement.addEventListener('wheel', () => {
        pulseZoomFlag();
    }, { passive: true });

    // --- Start Animation ---
    animate();

    return { renderer: state.renderer, scene: state.scene, camera: state.camera, controls: state.controls };
}