// For now, these functions return hardcoded default colors.
// The backgroundColor argument is ignored but kept for future use.

// --- Internal Helper for Path Colors ---
function getPathColorConfig(backgroundColor) {
    const defaultConfig = { baseHue: 210, isLight: false }; // Default to blue on dark
    if (!backgroundColor) return defaultConfig;

    const { l } = rgbToHsl(hexToRgb(backgroundColor));

    // Always use a fixed blue hue for predictability and to avoid color clashes.
    const baseHue = 210; // Blue

    return { baseHue, isLight: l > 0.5 };
}

export function getFeedColor(backgroundColor) {
  const { baseHue, isLight } = getPathColorConfig(backgroundColor);
  const saturation = 0.8;
  const lightness = isLight ? 0.25 : 0.60;
  return hslToHex({ h: baseHue, s: saturation, l: lightness });
}

export function getRapidColor(backgroundColor) {
  if (!backgroundColor) return '#ff0000';

  const { h, s, l } = rgbToHsl(hexToRgb(backgroundColor));

  // Check if the background is reddish (and not grayscale)
  const isReddish = (h >= 340 || h <= 20) && s > 0.3;

  let rapidHue;
  if (isReddish) {
    rapidHue = 120; // Green
  } else {
    rapidHue = 0; // Red
  }

  const rapidSaturation = 1.0;
  const rapidLightness = l > 0.5 ? 0.35 : 0.65;

  return hslToHex({ h: rapidHue, s: rapidSaturation, l: rapidLightness });
}

export function getHighlightColor(backgroundColor) {
  if (!backgroundColor) return '#0088ff'; // A bright, safe blue

  const { r, g, b } = hexToRgb(backgroundColor);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // A simple check if the color is more blue than red or green
  const isBlueish = b > r && b > g;

  if (isBlueish) {
    return '#ffff00'; // Return yellow for any blueish background for max contrast
  }

  if (luminance > 0.5) {
    return '#0000ff'; // Dark, pure blue on light backgrounds
  } else {
    return '#0088ff'; // Bright, vibrant blue on dark backgrounds
  }
}

export function getDimmedColor(backgroundColor) {
  if (!backgroundColor) return '#808080';

  const feedColor = getFeedColor(backgroundColor);

  const feedRgb = hexToRgb(feedColor);
  const bgRgb = hexToRgb(backgroundColor);

  const dimmedRgb = {
    r: feedRgb.r * 0.4 + bgRgb.r * 0.6,
    g: feedRgb.g * 0.4 + bgRgb.g * 0.6,
    b: feedRgb.b * 0.4 + bgRgb.b * 0.6,
  };

  return rgbToHex(dimmedRgb);
}

export function getHoverColor(backgroundColor) {
  const defaultColor = '#ff00ff'; // Magenta as a fallback
  if (!backgroundColor) return defaultColor;

  const { h, s, l } = rgbToHsl(hexToRgb(backgroundColor));

  // Calculate a complementary hue for maximum contrast.
  const hoverHue = (h + 180) % 360;

  // Use high saturation for pop.
  const hoverSaturation = 1.0;

  // Invert the lightness for contrast against the background.
  const hoverLightness = l > 0.5 ? 0.25 : 0.65;

  return hslToHex({ h: hoverHue, s: hoverSaturation, l: hoverLightness });
}

export function getHighlightSphereColor(backgroundColor) {
  // Highlight spheres should match the highlight lines.
  return getHighlightColor(backgroundColor);
}

export function getPivotSphereColor(backgroundColor) {
  if (!backgroundColor) return '#808080'; // Fallback gray

  const { l } = rgbToHsl(hexToRgb(backgroundColor));
  const closeColors = getCloseColors(backgroundColor, 0.3); // Use a 15% offset

  return l > 0.5 ? closeColors.darker : closeColors.lighter;
}

export function getTransformHelperSphereColor(backgroundColor) {
  return getPivotSphereColor(backgroundColor);
}

export function getBoundingBoxColor(backgroundColor) {
  const defaultColor = '#ffff00'; // Yellow as a fallback
  if (!backgroundColor) return defaultColor;

  const { h, l } = rgbToHsl(hexToRgb(backgroundColor));

  const isLight = l > 0.5;
  const isBlueish = h >= 220 && h <= 260;
  const isYellowish = h >= 45 && h <= 75;

  if (isLight) {
    // For light backgrounds, prefer blue.
    // If the background is already blue, use magenta as a contrast.
    return isBlueish ? '#ff00ff' : '#0000ff'; 
  } else {
    // For dark backgrounds, prefer yellow.
    // If the background is already dark yellow, use cyan as a contrast.
    return isYellowish ? '#00ffff' : '#ffff00';
  }
}

// --- Color Utility Functions ---

/**
 * Calculates a contrasting color (black or white) for a given hex color.
 * @param {string} hexColor - The input color in hex format (e.g., '#RRGGBB').
 * @returns {string} '#000000' or '#FFFFFF'.
 */
export function getContrastingColor(hexColor) {
  if (!hexColor) return '#000000';

  const { r, g, b } = hexToRgb(hexColor);
  
  // Formula for luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Generates lighter and darker shades of a given hex color.
 * @param {string} hexColor - The input color in hex format.
 * @param {number} amount - The percentage to lighten or darken by (0 to 1). Defaults to 0.2 (20%).
 * @returns {{lighter: string, darker: string}}
 */
export function getCloseColors(hexColor, amount = 0.2) {
    if (!hexColor) return { lighter: '#ffffff', darker: '#000000' };

    const { h, s, l } = rgbToHsl(hexToRgb(hexColor));

    const lighterL = Math.min(1, l + amount);
    const darkerL = Math.max(0, l - amount);

    const lighterColor = hslToHex({ h, s, l: lighterL });
    const darkerColor = hslToHex({ h, s, l: darkerL });

    return { lighter: lighterColor, darker: darkerColor };
}


// --- Color Conversion Helpers ---

export function rgbToHex({ r, g, b }) {
    const toHex = x => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgb(hex) {
  let r = 0, g = 0, b = 0;
  // 3 digits
  if (hex.length == 4) {
    r = "0x" + hex[1] + hex[1];
    g = "0x" + hex[2] + hex[2];
    b = "0x" + hex[3] + hex[3];
  // 6 digits
  } else if (hex.length == 7) {
    r = "0x" + hex[1] + hex[2];
    g = "0x" + hex[3] + hex[4];
    b = "0x" + hex[5] + hex[6];
  }
  return { r: +r, g: +g, b: +b };
}

export function rgbToHsl({ r, g, b }) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s, l };
}

export function hslToHex({ h, s, l }) {
    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        const hNormalized = h / 360;
        r = hue2rgb(p, q, hNormalized + 1/3);
        g = hue2rgb(p, q, hNormalized);
        b = hue2rgb(p, q, hNormalized - 1/3);
    }

    const toHex = x => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
