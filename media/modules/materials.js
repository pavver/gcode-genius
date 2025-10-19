
import * as THREE from 'three';
import { state } from './state.js';
import {
    getFeedColor,
    getRapidColor,
    getHighlightColor,
    getDimmedColor,
    getHoverColor,
    getHighlightSphereColor,
    getPivotSphereColor,
    getTransformHelperSphereColor
} from './color.js';

// This module centralizes the creation and management of Three.js materials.

export const materials = {
    // Line materials
    line: {
        feed: new THREE.LineBasicMaterial(),
        rapid: new THREE.LineBasicMaterial(),
        highlight: new THREE.LineBasicMaterial({ depthTest: true }),
        dimmed: new THREE.LineBasicMaterial(),
        hover: new THREE.LineBasicMaterial({ depthTest: false }), // Always on top
    },
    // Mesh materials for spheres
    mesh: {
        highlightSphere: new THREE.MeshBasicMaterial(),
        pivotSphere: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.7 }),
        transformHelperSphere: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8 }),
    }
};

/**
 * Updates the colors of all shared materials using the new color functions.
 */
export function updateAllMaterials() {
    // 1. First, update scene-level colors from the theme.
    if (state.themeColors) {
        const colors = state.themeColors;
        if (state.scene) {
            state.scene.background.set(colors.sceneBackground);
        }
        if(state.ambientLight) {
            state.ambientLight.color.set(colors.ambientLight);
        }
        if(state.directionalLight) {
            state.directionalLight.color.set(colors.directionalLight);
        }
    }

    // 2. Now, use the (potentially new) background color to calculate dependent colors.
    const backgroundColor = state.scene ? '#' + state.scene.background.getHexString() : null;

    // Line colors
    materials.line.feed.color.set(getFeedColor(backgroundColor));
    materials.line.rapid.color.set(getRapidColor(backgroundColor));
    materials.line.highlight.color.set(getHighlightColor(backgroundColor));
    materials.line.dimmed.color.set(getDimmedColor(backgroundColor));
    materials.line.hover.color.set(getHoverColor(backgroundColor));

    // Sphere colors
    materials.mesh.highlightSphere.color.set(getHighlightSphereColor(backgroundColor));
    materials.mesh.pivotSphere.color.set(getPivotSphereColor(backgroundColor));
    materials.mesh.transformHelperSphere.color.set(getTransformHelperSphereColor(backgroundColor));
}
