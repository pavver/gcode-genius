(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.GcodeColorUtils = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    // ========================================
    // ВИПРАВЛЕНА ВЕРСІЯ 2.1
    // Виправлення:
    // 1. Скоригований поріг для світлих фонів (0.5 → 0.35)
    // 2. Покращена логіка для яскравих кольорів
    // ========================================

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
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
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

    function getSemanticAlternativeHue(category, originalHue, bgHue, bgSaturation) {
      const semanticAlternatives = {
        'axis_x': { alternatives: [30, 330, 15], fallback: 180 },
        'axis_y': { alternatives: [150, 90, 135], fallback: 300 },
        'axis_z': { alternatives: [210, 270, 225], fallback: 60 },
        'stop': { alternatives: [350, 10, 330], fallback: 180 }
      };

      if (semanticAlternatives[category]) {
        const alt = semanticAlternatives[category];

        for (const altHue of alt.alternatives) {
          if (getHueDifference(altHue, bgHue) > 60) {
            return altHue;
          }
        }

        if (getHueDifference(alt.fallback, bgHue) > 60) {
          return alt.fallback;
        }
      }

      return findAlternativeHue(originalHue, bgHue, bgSaturation);
    }

    function adjustColorForContrastAndHue(hue, saturation, bgColor, targetContrast = 4.5, category = null) {
      const bgRgb = hexToRgb(bgColor);
      if (!bgRgb) {
          return { color: '#ff00ff', contrast: 0, hue: 0 };
      }
      const bgHsl = rgbToHsl(bgRgb.r, bgRgb.g, bgRgb.b);
      const bgLuminance = getRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
      const isDark = isDarkBackground(bgColor);

      let finalHue = hue;
      if (areHuesTooSimilar(hue, bgHsl.h, saturation, bgHsl.s, 40)) {
        if (category) {
          finalHue = getSemanticAlternativeHue(category, hue, bgHsl.h, bgHsl.s);
        } else {
          finalHue = findAlternativeHue(hue, bgHsl.h, bgHsl.s);
        }
      }

      let minL = isDark ? 50 : 0;
      let maxL = isDark ? 100 : 50;
      let bestL = isDark ? 75 : 25;

      for (let i = 0; i < 20; i++) {
        const testL = (minL + maxL) / 2;
        const rgb = hslToRgb(finalHue, saturation, testL);
        const luminance = getRelativeLuminance(rgb.r, rgb.g, rgb.b);
        const contrast = getContrastRatio(bgLuminance, luminance);

        if (Math.abs(contrast - targetContrast) < 0.1) {
          bestL = testL;
          break;
        }

        if (contrast < targetContrast) {
          minL = isDark ? testL : minL;
          maxL = isDark ? maxL : testL;
        } else {
          maxL = isDark ? testL : maxL;
          minL = isDark ? minL : testL;
        }
      }

      const finalRgb = hslToRgb(finalHue, saturation, bestL);
      const finalColor = rgbToHex(finalRgb.r, finalRgb.g, finalRgb.b);
      const finalLuminance = getRelativeLuminance(finalRgb.r, finalRgb.g, finalRgb.b);
      const finalContrast = getContrastRatio(bgLuminance, finalLuminance);

      return { color: finalColor, contrast: finalContrast, hue: finalHue };
    }

    function getG0RapidColor(bgColor) { return adjustColorForContrastAndHue(210, 65, bgColor, 4.5, 'g0').color; }
    function getG1LinearColor(bgColor) { return adjustColorForContrastAndHue(220, 75, bgColor, 5.0, 'g1').color; }
    function getG2G3ArcColor(bgColor) { return adjustColorForContrastAndHue(270, 60, bgColor, 4.5, 'arc').color; }
    function getSpecialMotionColor(bgColor) { return adjustColorForContrastAndHue(180, 55, bgColor, 4.5, 'special').color; }
    function getCoordinateSystemColor(bgColor) { return adjustColorForContrastAndHue(45, 80, bgColor, 5.5, 'coord').color; }
    function getPlaneSelectionColor(bgColor) { return adjustColorForContrastAndHue(30, 85, bgColor, 5.0, 'plane').color; }
    function getPositioningModeColor(bgColor) { return adjustColorForContrastAndHue(25, 90, bgColor, 6.0, 'mode').color; }
    function getUnitsColor(bgColor) { return adjustColorForContrastAndHue(9, 85, bgColor, 5.5, 'units').color; }
    function getCannedCyclesColor(bgColor) { return adjustColorForContrastAndHue(285, 70, bgColor, 4.5, 'cycles').color; }
    function getSpindleColor(bgColor, isStop = false) { const s = isStop ? 50 : 75; const c = isStop ? 4.0 : 5.0; return adjustColorForContrastAndHue(120, s, bgColor, c, 'spindle').color; }
    function getCoolantColor(bgColor, isOff = false) { const s = isOff ? 45 : 80; const c = isOff ? 4.0 : 5.0; return adjustColorForContrastAndHue(180, s, bgColor, c, 'coolant').color; }
    function getToolChangeColor(bgColor) { return adjustColorForContrastAndHue(16, 95, bgColor, 6.0, 'tool').color; }
    function getProgramStopColor(bgColor) { return adjustColorForContrastAndHue(350, 90, bgColor, 6.5, 'stop').color; }
    function getTemperatureColor(bgColor) { return adjustColorForContrastAndHue(5, 85, bgColor, 5.5, 'temp').color; }
    function getExtruderModeColor(bgColor) { return adjustColorForContrastAndHue(330, 85, bgColor, 5.0, 'extruder').color; }
    function getAxisXColor(bgColor) { return adjustColorForContrastAndHue(0, 85, bgColor, 5.5, 'axis_x').color; }
    function getAxisYColor(bgColor) { return adjustColorForContrastAndHue(120, 80, bgColor, 5.5, 'axis_y').color; }
    function getAxisZColor(bgColor) { return adjustColorForContrastAndHue(240, 85, bgColor, 5.5, 'axis_z').color; }
    function getRotaryAxisColor(bgColor) { return adjustColorForContrastAndHue(280, 65, bgColor, 4.5, 'rotary').color; }
    function getExtruderAxisColor(bgColor) { return adjustColorForContrastAndHue(330, 90, bgColor, 5.0, 'axis_e').color; }
    function getFeedRateColor(bgColor) { return adjustColorForContrastAndHue(35, 80, bgColor, 5.0, 'feed').color; }
    function getSpindleSpeedColor(bgColor) { return adjustColorForContrastAndHue(155, 70, bgColor, 4.5, 'speed').color; }
    function getArcCenterColor(bgColor) { return adjustColorForContrastAndHue(270, 55, bgColor, 4.0, 'center').color; }
    function getRadiusColor(bgColor) { return adjustColorForContrastAndHue(280, 50, bgColor, 4.0, 'radius').color; }
    function getToolNumberColor(bgColor) { return adjustColorForContrastAndHue(20, 85, bgColor, 5.0, 'toolnum').color; }
    function getLineNumberColor(bgColor) { return adjustColorForContrastAndHue(0, 10, bgColor, 3.5, 'linenum').color; }
    function getNumericColor(bgColor) { return adjustColorForContrastAndHue(200, 60, bgColor, 4.0, 'numeric').color; }
    function getCommentColor(bgColor) { return adjustColorForContrastAndHue(0, 15, bgColor, 3.5, 'comment').color; }
    function getWarningCommentColor(bgColor) { return adjustColorForContrastAndHue(0, 100, bgColor, 7.0, 'warning').color; }

    return {
      hexToRgb, rgbToHex, getRelativeLuminance, getContrastRatio, isDarkBackground, rgbToHsl, hslToRgb,
      getHueDifference, areHuesTooSimilar, findAlternativeHue, getSemanticAlternativeHue, adjustColorForContrastAndHue,
      getG0RapidColor, getG1LinearColor, getG2G3ArcColor, getSpecialMotionColor, getCoordinateSystemColor,
      getPlaneSelectionColor, getPositioningModeColor, getUnitsColor, getCannedCyclesColor, getSpindleColor,
      getCoolantColor, getToolChangeColor, getProgramStopColor, getTemperatureColor, getExtruderModeColor,
      getAxisXColor, getAxisYColor, getAxisZColor, getRotaryAxisColor, getExtruderAxisColor, getFeedRateColor,
      getSpindleSpeedColor, getArcCenterColor, getRadiusColor, getToolNumberColor, getLineNumberColor,
      getNumericColor, getCommentColor, getWarningCommentColor
    };
}));
