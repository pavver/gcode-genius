# Change Log

All notable changes to the "gcode-genius" extension will be documented in this file.

## [0.1.0] - Initial Release

This is the first public release of G-code Genius. It combines all features developed and refined over previous internal versions into a single, comprehensive toolkit for G-code editing and visualization.

### Added

- **G-code Formatter**: A powerful formatter (accessible via "Format Document") that standardizes spacing and case, intelligently formats numbers (stripping trailing zeros), preserves comments and structure, and automatically splits multiple commands from a single line.
- **Dynamic Syntax Highlighting**:
    - Highlights G-code commands (`G0`, `G1`), coordinates (`X`, `Y`, `Z`), arc offsets (`I`, `J`, `K`), and feed/speed parameters (`F`, `S`).
    - Guarantees a minimum 4.5:1 text-to-background contrast ratio, ensuring readability on **any** VS Code theme.
    - Uses a custom, high-visibility color for comments, fixing issues where they were unreadable on some themes.
- **Interactive 3D Visualization**:
    - Opens via a dedicated icon in the editor's title bar.
    - Visualizes toolpaths with distinct colors for rapid (`G0`) and feed (`G1`, `G2`, `G3`) movements.
    - Renders G2/G3 arc commands, correctly handling both absolute (G90.1) and incremental (G91.1) center modes.
    - Features a dynamic pivot sphere to indicate the camera's rotation center.
- **Advanced Selection & Interaction**:
    - **Two-Way Sync**: Click a line in the editor to highlight in 3D; click a path in 3D to jump to the code.
    - **Box Selection**: Draw a rectangle to select toolpaths, with CAD-style logic (left-to-right for contained, right-to-left for intersected).
    - **Modifier Keys**: Use `Shift+Click` for range selection and `Ctrl+Click` to add/remove from the current selection.
    - **Double-Click**: Instantly select a continuous cutting operation.
    - **Hover-to-Highlight**: Easily identify toolpaths by hovering over them in the 3D view.
- **Transformation Tools with Live Preview**:
    - UI panels for **Move**, **Rotate**, and **Move to Origin** with instant visual feedback.
    - Transformation previews are cancelled safely if the G-code is modified externally.
    - Selection is locked while a transformation panel is active to prevent errors.
- **Editor & UI Integration**:
    - **Keyboard Shortcuts**: Use `Ctrl+C`, `Ctrl+X`, `Ctrl+V`, `Delete`, `Ctrl+A`, and `Undo/Redo` directly within the 3D view to manipulate G-code.
    - **Navigation Slider**: Appears in single-cursor mode for smooth scrubbing along the toolpath.
    - **State Persistence**: Camera position, zoom, and panel state are saved and restored when VS Code is restarted.
    - **Hover Provider**: Displays concise G-code command and machine state information on hover in the editor.

### Changed

- **Major Color System Refactoring**: Replaced a hardcoded/theme-variable system with a fully adaptive, function-based system. All visualizer colors now generate dynamically based on the editor's background color for seamless integration.
- **Mouse Controls**: Re-mapped for intuitive use: Left-mouse for selection, Middle-mouse for rotation, Right-mouse for panning.
- **"Move to Origin" Tool**: Upgraded from a direct action to a full UI panel with live preview and options for origin point (Center/Min Point).
- **Codebase Structure**: Refactored the entire JavaScript codebase from monolithic files into smaller, more maintainable ES modules (e.g., `scene.js`, `interactions.js`, `color.js`, `transformations/move.js`).

### Fixed

- **Performance**: Fixed a major performance issue that caused the editor to flicker when scrolling through G-code files.
- **Parser**: The parser now correctly handles commands with leading zeros (e.g., `G01` is treated as `G1`).
- **Color & Theme**:
    - Fixed numerous bugs related to the color system, ensuring colors update correctly when the theme changes and that highlight colors are applied with the correct priority.
    - Fixed a critical bug where comments were invisible on many themes by using a custom-generated, guaranteed-contrast color.
- **Transformations & UI**:
    - Fixed a "Maximum call stack size exceeded" crash when cancelling a transformation.
    - Resolved issues where transformation previews would not update or cancel correctly.
    - Corrected CSS layout issues with the transformation panel.
- **Selection & Interaction**:
    - Fixed bugs in mouse coordinate systems that caused the selection box to be offset from the cursor.
    - Corrected inaccurate raycasting (click/hover detection) at certain camera angles.
    - Resolved multiple bugs in selection logic to ensure correct color priority and state restoration.