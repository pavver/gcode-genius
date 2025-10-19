# G-code Genius: Your Intelligent G-code Assistant

**Transform VS Code into a powerful, intuitive, and comprehensive IDE for G-code. `G-code Genius` is more than just a visualizer; it's a complete toolkit designed to boost your productivity, precision, and confidence when working with CNC.**

Stop switching between different programs. Visualize, format, edit, and analyze toolpaths directly within your favorite code editor.

<!-- Main Image/GIF: Showcase of key features in action -->
![G-code Genius in Action](https://raw.githubusercontent.com/pavver/gcode-genius/refs/heads/master/media/readme/1.png)

---

## Key Features

### 🚀 Intelligent Code Formatting

Bring perfect order to your G-code with a single command. Our formatter does more than just align text; it intelligently optimizes your code for maximum readability and compatibility.

- **Automatic Command Splitting**: Breaks multiple commands on a single line (e.g., `G1X10Y20G0Z5`) into separate, properly formatted lines.
- **Standardization & Cleanup**: Automatically converts commands to uppercase, standardizes spacing, and strips trailing zeros (`G01.000` becomes `G1`), making your code clean and professional.
- **Structure Preservation**: Retains your comments and important empty lines, maintaining the logical structure of the file.

*How to use: Simply open the Command Palette (`Ctrl+Shift+P`) and select "Format Document".*

<!-- Image: "Before" and "After" code formatting comparison -->
![G-code Formatter](https://raw.githubusercontent.com/pavver/gcode-genius/refs/heads/master/media/readme/formatter.png)

### 🎨 Dynamic Syntax Highlighting with Guaranteed Readability

No more invisible comments on a dark background! Our highlighting system doesn't just colorize your code—it guarantees that every character is readable on **any** VS Code theme.

- **Guaranteed Contrast**: Automatically adjusts color lightness to ensure a minimum 4.5:1 contrast ratio. Your text will always be clear.
- **Intuitive Colors**: Motion commands (`G0`, `G1`, `G2/G3`) are colored to match their visualization (red for rapid moves, a primary color for feed moves).
- **Key Parameter Highlighting**: `X`, `Y`, `Z` coordinates, `I`, `J`, `K` arc parameters, and `F`/`S` feed/speed commands have unique colors for quick visual analysis.

<!-- Image: Highlighting demo on light and dark themes -->
![Syntax Highlighting](https://github.com/pavver/gcode-genius/raw/master/media/readme/higlight.png)

### 🌐 Interactive 3D Visualization

Instantly see your toolpath in a full 3D view. The visualizer opens with a single click on the icon in the editor's title bar and syncs with your code in real-time.

- **Two-Way Sync**: Click a line of code, and it's highlighted in 3D. Click a toolpath in 3D, and the cursor jumps to the corresponding line in the editor.
- **Powerful Selection Tools**:
    - **Box Selection**: Select groups of lines by drawing a rectangle. It works just like in modern CAD software:
        - *Left-to-right* selection grabs only the toolpaths **fully contained** within the box.
        - *Right-to-left* selection grabs any toolpath that the box **intersects**.
    - **`Shift` + Click**: Select a range.
    - **`Ctrl` + Click**: Add/remove from the current selection.
    - **`Double-Click`**: Instantly select an entire cutting operation. This intelligently selects a continuous block of feed moves (`G1`, `G2`, `G3`) until a rapid move (`G0`) or other command breaks the path. It's the fastest way to select a specific feature on your model.
    - **Hover to Highlight**: As you move your mouse over the toolpath in the 3D view, the corresponding line is instantly highlighted, making it easy to identify and select the exact path you need.
- **Adaptive Color System**: All visualizer colors (lines, background, highlights) automatically adapt to your current VS Code theme for a seamless and comfortable experience.
- **Seamless Keyboard Integration**: Work faster without leaving the 3D view. Standard keyboard shortcuts work out-of-the-box, directly manipulating the G-code in the text editor.
    - **`Ctrl+C` / `Ctrl+X` / `Ctrl+V`**: Copy, cut, or paste the G-code lines for your 3D selection.
    - **`Ctrl+Z` / `Ctrl+Y`**: Undo or redo your last action.
    - **`Delete`**: Delete the selected lines.
    - **`Ctrl+A`**: Select the entire toolpath.
    - **`Esc`**: Clear the current selection.
    - This creates a fluid workflow where you can visually manage G-code without clicking back into the text editor.

<!-- Image/GIF: Demo of the 3D visualizer, sync, and selection -->
![3D Visualization](https://github.com/pavver/gcode-genius/raw/master/media/readme/visualizer.gif)

### 🎞️ Toolpath Navigation Slider

Want to see exactly how the tool will move? When you have a single line selected, a navigation slider appears in the 3D view.
- **Scrub Through Time**: Drag the slider to smoothly scrub forwards and backwards along the toolpath from your selected point.
- **Visualize Tool Motion**: This provides an intuitive, frame-by-frame preview of the tool's movement, perfect for understanding complex paths or checking for potential issues without reading a single line of code.

### 🛠️ Code Transformation with Live Preview

Edit your part's geometry directly from the 3D view. The transformation tools allow you to move and rotate toolpaths with instant visual feedback before applying any changes to the file.

- **Move and Rotate**: Intuitive panels for precise transformation adjustments.
- **Move to Origin**: Easily zero out your part. This tool lets you move the entire selection to the origin, with options to set the zero point at the object's center (for centered setups) or its minimum corner (to place the entire object in the positive coordinate space).
- **Safe Editing**: All changes are shown in a preview mode. You only commit them to your code when you are completely satisfied with the result.

---

## Getting Started

1.  Install the `G-code Genius` extension from the VS Code Marketplace.
2.  Open any file with a `.gcode`, `.nc`, `.cnc`, or other common G-code extension.
3.  Click the **G-code Genius** icon in the top-right of the editor to open the 3D visualization panel.
4.  To format your code, open the Command Palette (`Ctrl+Shift+P`) and run the **Format Document** command.

## Release Notes

A detailed history of all changes is available in our [CHANGELOG.md](CHANGELOG.md).

---

**G-code Genius is built to be your indispensable assistant in the world of CNC. Try it today!**

---
## Acknowledgements
This project was inspired by the great work on [nc_view_vscode](https://github.com/noahlias/nc_view_vscode).

This project was created with the help of Gemini CLI.