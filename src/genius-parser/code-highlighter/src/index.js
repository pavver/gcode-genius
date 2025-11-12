(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    // Correctly handle the factory pattern for CommonJS
    module.exports = factory();
  } else {
    root.GcodeColorHighlighter = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // Private helper functions
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  function rgbToHex(r, g, b) {
    return "#" + [r, g, b]
      .map(x => Math.round(x).toString(16).padStart(2, '0'))
      .join('');
  }

  function getRelativeLuminance(r, g, b) {
    const rsRGB = r / 255;
    const gsRGB = g / 255;
    const bsRGB = b / 255;

    const R = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const G = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const B = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  }

  function getContrastRatio(l1, l2) {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function isDarkBackground(bgColor) {
    const rgb = hexToRgb(bgColor);
    if (!rgb) return false;
    const luminance = getRelativeLuminance(rgb.r, rgb.g, rgb.b);
    return luminance < 0.35;
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  function hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  function getHueDifference(hue1, hue2) {
    let diff = Math.abs(hue1 - hue2);
    if (diff > 180) {
      diff = 360 - diff;
    }
    return diff;
  }

  function areHuesTooSimilar(hue1, hue2, sat1, sat2, threshold = 40) {
    if (sat1 < 20 || sat2 < 20) {
      return false;
    }
    return getHueDifference(hue1, hue2) < threshold;
  }

  function findAlternativeHue(originalHue, bgHue, bgSaturation) {
    if (bgSaturation < 20) {
      return originalHue;
    }

    const triadic1 = (originalHue + 120) % 360;
    const triadic2 = (originalHue - 120 + 360) % 360;
    const complementary = (originalHue + 180) % 360;
    const analog1 = (originalHue + 60) % 360;
    const analog2 = (originalHue - 60 + 360) % 360;

    const candidates = [triadic1, triadic2, complementary, analog1, analog2];
    let bestHue = originalHue;
    let maxDiff = 0;

    for (const candidate of candidates) {
      const diff = getHueDifference(candidate, bgHue);
      if (diff > maxDiff) {
        maxDiff = diff;
        bestHue = candidate;
      }
    }

    if (maxDiff < 60) {
      bestHue = (bgHue + 180) % 360;
    }

    return bestHue;
  }

  function getSemanticAlternativeHue(categoryConfig, originalHue, bgHue, bgSaturation) {
    if (categoryConfig && categoryConfig.alternatives) {
      for (const altHue of categoryConfig.alternatives) {
        if (getHueDifference(altHue, bgHue) > 60) {
          return altHue;
        }
      }

      if (categoryConfig.fallback && getHueDifference(categoryConfig.fallback, bgHue) > 60) {
        return categoryConfig.fallback;
      }
    }

    return findAlternativeHue(originalHue, bgHue, bgSaturation);
  }

  // Main Class
  class GcodeColorHighlighter {
    constructor(config) {
      this.config = config || this.getDefaultConfig();
      this.backgroundColor = this.config.backgroundColor || '#FFFFFF';

      // Expose helper functions on the instance
      this.hexToRgb = hexToRgb;
      this.getRelativeLuminance = getRelativeLuminance;
      this.isDarkBackground = isDarkBackground;
    }

    getDefaultConfig() {
      return {
        backgroundColor: '#FFFFFF',
        categories: {
          'g0': { hue: 210, saturation: 65, targetContrast: 4.5 },
          'g1': { hue: 220, saturation: 75, targetContrast: 5.0 },
          'arc': { hue: 270, saturation: 60, targetContrast: 4.5 },
          'special': { hue: 180, saturation: 55, targetContrast: 4.5 },
          'coord': { hue: 45, saturation: 80, targetContrast: 5.5 },
          'plane': { hue: 30, saturation: 85, targetContrast: 5.0 },
          'mode': { hue: 25, saturation: 90, targetContrast: 6.0 },
          'units': { hue: 9, saturation: 85, targetContrast: 5.5 },
          'cycles': { hue: 285, saturation: 70, targetContrast: 4.5 },
          'spindle': { hue: 120, saturation: 75, targetContrast: 5.0 },
          'spindle_stop': { hue: 120, saturation: 50, targetContrast: 4.0 },
          'coolant': { hue: 180, saturation: 80, targetContrast: 5.0 },
          'coolant_off': { hue: 180, saturation: 45, targetContrast: 4.0 },
          'tool': { hue: 16, saturation: 95, targetContrast: 6.0 },
          'stop': { hue: 350, saturation: 90, targetContrast: 6.5, alternatives: [350, 10, 330], fallback: 180 },
          'temp': { hue: 5, saturation: 85, targetContrast: 5.5 },
          'extruder': { hue: 330, saturation: 85, targetContrast: 5.0 },
          'axis_x': { hue: 0, saturation: 85, targetContrast: 5.5, alternatives: [30, 330, 15], fallback: 180 },
          'axis_y': { hue: 120, saturation: 80, targetContrast: 5.5, alternatives: [150, 90, 135], fallback: 300 },
          'axis_z': { hue: 240, saturation: 85, targetContrast: 5.5, alternatives: [210, 270, 225], fallback: 60 },
          'rotary': { hue: 280, saturation: 65, targetContrast: 4.5 },
          'axis_e': { hue: 330, saturation: 90, targetContrast: 5.0 },
          'feed': { hue: 35, saturation: 80, targetContrast: 5.0 },
          'speed': { hue: 155, saturation: 70, targetContrast: 4.5 },
          'center': { hue: 270, saturation: 55, targetContrast: 4.0 },
          'radius': { hue: 280, saturation: 50, targetContrast: 4.0 },
          'toolnum': { hue: 20, saturation: 85, targetContrast: 5.0 },
          'linenum': { hue: 0, saturation: 10, targetContrast: 3.5 },
          'numeric': { hue: 200, saturation: 60, targetContrast: 4.0 },
          'comment': { hue: 0, saturation: 15, targetContrast: 3.5 },
          'warning': { hue: 0, saturation: 100, targetContrast: 7.0 }
        }
      };
    }

    setBackgroundColor(color) {
      this.backgroundColor = color;
    }

    updateCategory(categoryName, newConfig) {
      if (this.config.categories[categoryName]) {
        this.config.categories[categoryName] = { ...this.config.categories[categoryName], ...newConfig };
      }
    }

    getColor(categoryName) {
      const category = this.config.categories[categoryName];
      if (!category) {
        return '#ff00ff'; // Return a noticeable color for missing categories
      }

      return this._adjustColorForContrastAndHue(
        category,
        this.backgroundColor
      ).color;
    }

    _adjustColorForContrastAndHue(category, bgColor) {
      const { hue, saturation, targetContrast } = category;
      const bgRgb = this.hexToRgb(bgColor);
      if (!bgRgb) {
        return { color: '#ff00ff', contrast: 0, hue: 0 };
      }
      const bgHsl = rgbToHsl(bgRgb.r, bgRgb.g, bgRgb.b);
      const bgLuminance = this.getRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
      const isDark = this.isDarkBackground(bgColor);

      let finalHue = hue;
      if (areHuesTooSimilar(hue, bgHsl.h, saturation, bgHsl.s, 40)) {
        finalHue = getSemanticAlternativeHue(category, hue, bgHsl.h, bgHsl.s);
      }

      let minL = isDark ? 50 : 0;
      let maxL = isDark ? 100 : 50;
      let bestL = isDark ? 75 : 25;

      for (let i = 0; i < 20; i++) {
        const testL = (minL + maxL) / 2;
        const rgb = hslToRgb(finalHue, saturation, testL);
        const luminance = this.getRelativeLuminance(rgb.r, rgb.g, rgb.b);
        const contrast = getContrastRatio(bgLuminance, luminance);

        if (Math.abs(contrast - (targetContrast || 4.5)) < 0.1) {
          bestL = testL;
          break;
        }

        if (contrast < (targetContrast || 4.5)) {
          minL = isDark ? testL : minL;
          maxL = isDark ? maxL : testL;
        } else {
          maxL = isDark ? testL : maxL;
          minL = isDark ? minL : testL;
        }
      }

      const finalRgb = hslToRgb(finalHue, saturation, bestL);
      const finalColor = rgbToHex(finalRgb.r, finalRgb.g, finalRgb.b);
      const finalLuminance = this.getRelativeLuminance(finalRgb.r, finalRgb.g, finalRgb.b);
      const finalContrast = getContrastRatio(bgLuminance, finalLuminance);

      return { color: finalColor, contrast: finalContrast, hue: finalHue };
    }
  }

  // The factory returns a new instance of the class.
  return new GcodeColorHighlighter();
}));