import { state } from './state.js';
import { debounce } from './utils.js';

let isRotating = false;
let isPanning = false;
let isZooming = false;
let zoomTimeout;

// Create a debounced function to hide the sphere when all interactions stop.
const debouncedHide = debounce(() => {
    if (state.pivotSphere) {
        state.pivotSphere.visible = false;
    }
}, 250);

// Central function to update visibility based on the current state flags.
function updateVisibility() {
    if (isRotating || isPanning || isZooming) {
        // If any interaction is active, cancel a pending hide and show the sphere.
        debouncedHide.cancel();
        if (state.pivotSphere) {
            state.pivotSphere.visible = true;
        }
    } else {
        // If no interactions are active, schedule the sphere to be hidden.
        debouncedHide();
    }
}

// --- Public API ---

export function setIsRotating(status) {
    if (isRotating !== status) {
        isRotating = status;
        updateVisibility();
    }
}

export function setIsPanning(status) {
    if (isPanning !== status) {
        isPanning = status;
        updateVisibility();
    }
}

// For discrete zoom events, we "pulse" the isZooming flag.
// It stays true for a short period to keep the sphere visible.
export function pulseZoomFlag() {
    clearTimeout(zoomTimeout);
    isZooming = true;
    updateVisibility(); // Show the sphere immediately

    zoomTimeout = setTimeout(() => {
        isZooming = false;
        updateVisibility(); // This will trigger the debounced hide
    }, 200); // Keep the zoom flag active for 200ms
}
