
import { state } from './state.js';

const fallbackColors = {
    sceneBackground: '#1e1e1e',
    ambientLight: '#404040',
    directionalLight: '#ffffff',
    // The following are no longer used here but kept for reference
    feed: '#00ff00',
    rapid: '#ff0000',
    highlight: '#0000ff',
    dimmed: '#808080',
    hover: '#000000',
    highlightSphere: '#0000ff',
    pivotSphere: '#ff00ff',
    transformHelperSphere: '#ffff00',
    boundingBox: '#ffff00',
};

/**
 * Reads theme colors for non-line elements.
 * @returns {object} An object of resolved color strings.
 */
export function getThemeColors() {
    const probe = document.getElementById('theme-probe');
    if (!probe) {
        //console.warn('Theme probe element not found! Using fallback colors.');
        return fallbackColors;
    }

    const probeStyle = getComputedStyle(probe);
    const afterStyle = getComputedStyle(probe, '::after');

    const themeColors = {
        sceneBackground: probeStyle.backgroundColor || fallbackColors.sceneBackground,
        ambientLight: afterStyle.backgroundColor || fallbackColors.ambientLight,
        directionalLight: afterStyle.color || fallbackColors.directionalLight,
    };

    //console.log('[Theme] Computed Scene Colors:', themeColors);
    return themeColors;
}

/**
 * Sets up a MutationObserver to watch for theme changes on the document's body element.
 * When a change is detected, it re-applies the theme colors for the scene.
 * @param {function} onThemeChange - A callback function to execute when a theme change is detected.
 */
export function initializeThemeObserver(onThemeChange) {
    const updateFn = () => {
        const newColors = getThemeColors();
        state.themeColors = newColors;
        //console.log('Applying scene theme update with colors:', newColors);
        if (onThemeChange) {
            onThemeChange();
        }
    };

    // Apply the initial theme.
    updateFn();

    // Observe for changes on the body element
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
                //console.log('Theme change detected on <body> element.');
                updateFn();
                break; 
            }
        }
    });

    observer.observe(document.body, { attributes: true });
}
