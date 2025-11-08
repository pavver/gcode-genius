# G-code Adaptive Syntax Highlighting

## Overview

This JavaScript library automatically generates a complete and accessible color scheme for G-code syntax highlighting. Its core principle is to adapt the entire color palette based on a single input: the editor's background color. It ensures optimal readability and accessibility across any theme (light, dark, or colored) by algorithmically generating colors that meet WCAG 2.1 contrast standards.

## Key Features

-   ✅ **Fully Adaptive**: Works flawlessly with any editor theme, whether it's light, dark, or vividly colored.
-   ✅ **Accessible by Design**: Automatically calculates and adjusts colors to meet a minimum WCAG 2.1 contrast ratio (typically 4.5:1 or higher), ensuring readability for all users.
-   ✅ **Semantic & Logical**: Colors are assigned based on the function of G-code commands (e.g., motion, machine settings, axes), creating an intuitive and meaningful visual language.
-   ✅ **Industry Standard Colors**: Adheres to the classic CAD/CAM color convention for axes: **X=Red**, **Y=Green**, **Z=Blue**.
-   ✅ **Zero-Configuration**: Eliminates the need to manually define and maintain color sets for different themes.

## How It Works

The library uses a sophisticated, multi-step process to generate each color:

1.  **Background Analysis**: The script first analyzes the provided `bgColor` by calculating its **relative luminance**. This determines whether the background is "light" or "dark" and serves as the foundation for all contrast calculations.

2.  **Hue Collision Avoidance**: Before generating a color, the script checks if the proposed color's hue (e.g., red for the X-axis) is too similar to the background's hue. If they are too close (e.g., a red axis on a red-themed background), the script intelligently selects a visually distinct alternative from a set of harmonic colors (like triadic or complementary hues) to guarantee visibility.

3.  **Contrast-Driven Lightness Adjustment**: This is the core of the algorithm. Using a **binary search**, the script iteratively adjusts the lightness (brightness) of the chosen hue. In each step, it calculates the contrast ratio between the new color and the background. This process continues until it finds the optimal lightness value that precisely meets the desired `targetContrast`.

4.  **WCAG 2.1 Compliance**: All luminance and contrast calculations are performed according to the official formulas specified in the Web Content Accessibility Guidelines (WCAG) 2.1, ensuring the results are robust and reliable.

## Quick Start

### 1. Include the Script
Include the `index.js` file in your project. The library exposes a global object named `GcodeColorUtils`.

```html
<script src="path/to/index.js"></script>
```

### 2. Generate Colors
Use the functions on the `GcodeColorUtils` object to get colors for different G-code elements. All you need to provide is your editor's background color.

```javascript
// Define your editor's background color (e.g., from a CSS variable or API)
const editorBackgroundColor = '#1e1e1e'; // An example from VS Code's "Dark+" theme

// Generate a color for a specific G-code category
const g0RapidMotionColor = GcodeColorUtils.getG0RapidColor(editorBackgroundColor);
const xAxisColor = GcodeColorUtils.getAxisXColor(editorBackgroundColor);
const commentColor = GcodeColorUtils.getCommentColor(editorBackgroundColor);
const programStopColor = GcodeColorUtils.getProgramStopColor(editorBackgroundColor);

// You can now use these dynamically generated hex color strings in your application
console.log('G0 Motion Color:', g0RapidMotionColor); // e.g., #6eb5ff
console.log('X-Axis Color:', xAxisColor);           // e.g., #ff6b6b
console.log('Comment Color:', commentColor);         // e.g., #6a6a6a
console.log('Program Stop Color:', programStopColor); // e.g., #ff5577
```

## Live Demo

You can test the adaptive color generation live on our GitHub Pages demo. This page allows you to change the background color and see how the entire G-code color palette adapts in real-time.

**[➡️ View the Live Demo here](https://pavver.github.io/gcode-genius/)**

**Disclaimer:** Please note that this demo page uses a simplified regular-expression-based parser for demonstration purposes only. Its goal is to showcase the color generation logic, not the accuracy of the G-code parser. As a result, syntax highlighting on the demo page may occasionally differ from the final result in the full VS Code extension.

## API Reference

All color generation functions take one primary argument:
-   `bgColor` (string): The editor background color in hex format (e.g., `'#1e1e1e'`).

They all return a hex color string (e.g., `'#ff6b6b'`) that is guaranteed to meet the required contrast ratio.

### Color Categories & Functions

| Category | Function | Example G-code |
| :--- | :--- | :--- |
| **Motion** | | |
| G0 (Rapid Motion) | `getG0RapidColor(bgColor)` | `G0` |
| G1 (Linear Motion) | `getG1LinearColor(bgColor)` | `G1` |
| G2/G3 (Arcs) | `getG2G3ArcColor(bgColor)` | `G2`, `G3` |
| Special Motions | `getSpecialMotionColor(bgColor)` | `G4`, `G28` |
| **Machine Settings** | | |
| Coordinate Systems | `getCoordinateSystemColor(bgColor)` | `G54`, `G92` |
| Planes | `getPlaneSelectionColor(bgColor)` | `G17`, `G18`, `G19` |
| Positioning Modes | `getPositioningModeColor(bgColor)` | `G90`, `G91` |
| Units | `getUnitsColor(bgColor)` | `G20`, `G21` |
| Canned Cycles | `getCannedCyclesColor(bgColor)` | `G81`, `G83` |
| **M-Codes** | | |
| Spindle (Start/Stop) | `getSpindleColor(bgColor, isStop)` | `M3`, `M4`, `M5` |
| Coolant (On/Off) | `getCoolantColor(bgColor, isOff)` | `M7`, `M8`, `M9` |
| Tool Change | `getToolChangeColor(bgColor)` | `M6` |
| Program Stops | `getProgramStopColor(bgColor)` | `M0`, `M1`, `M2`, `M30` |
| Temperature | `getTemperatureColor(bgColor)` | `M104`, `M109` |
| Extruder Mode | `getExtruderModeColor(bgColor)` | `M82`, `M83` |
| **Axes** | | |
| X-Axis | `getAxisXColor(bgColor)` | `X12.3` |
| Y-Axis | `getAxisYColor(bgColor)` | `Y-4.5` |
| Z-Axis | `getAxisZColor(bgColor)` | `Z100` |
| Rotary Axes (A,B,C) | `getRotaryAxisColor(bgColor)` | `A90` |
| E-Axis (Extruder) | `getExtruderAxisColor(bgColor)` | `E1.25` |
| **Parameters** | | |
| Feed Rate (F) | `getFeedRateColor(bgColor)` | `F1500` |
| Spindle Speed (S) | `getSpindleSpeedColor(bgColor)` | `S1200` |
| Arc Center (I,J,K) | `getArcCenterColor(bgColor)` | `I10 J5` |
| Arc Radius (R) | `getRadiusColor(bgColor)` | `R20` |
| Tool Number (T) | `getToolNumberColor(bgColor)` | `T1` |
| **Miscellaneous** | | |
| Line Number (N) | `getLineNumberColor(bgColor)` | `N10` |
| Numeric Values | `getNumericColor(bgColor)` | `123`, `45.6` |
| Comments | `getCommentColor(bgColor)` | `(text)`, `; text` |
| Warnings | `getWarningCommentColor(bgColor)` | `(WARNING: ...)` |

#### Special Function Parameters

-   `getSpindleColor(bgColor, isStop = false)`
    -   `isStop` (boolean): Pass `true` to get a less saturated color for spindle-off commands (`M5`). Defaults to `false` for spindle-on (`M3`, `M4`).
-   `getCoolantColor(bgColor, isOff = false)`
    -   `isOff` (boolean): Pass `true` to get a less saturated color for coolant-off commands (`M9`). Defaults to `false` for coolant-on (`M7`, `M8`).

### Utility Functions (for advanced use)

The `GcodeColorUtils` object also exposes the core utility functions used in its calculations.

| Function | Description |
| :--- | :--- |
| `hexToRgb(hex)` | Converts a hex color string to an `{r, g, b}` object. |
| `rgbToHex(r, g, b)` | Converts an RGB color to a hex string. |
| `getRelativeLuminance(r, g, b)` | Calculates the WCAG relative luminance (0 to 1) of an RGB color. |
| `getContrastRatio(l1, l2)` | Calculates the contrast ratio (1 to 21) between two luminance values. |
| `isDarkBackground(bgColor)` | Returns `true` if the background color's luminance is less than 0.35. |
| `adjustColorForContrastAndHue(...)` | The core internal function that performs the full color generation logic. |
