const vscode = require('vscode');

// --- Color Logic (copied and adapted from media/modules/color.js) ---

const { getFeedColor, getRapidColor, getDimmedColor, getBoundingBoxColor, hexToRgb, rgbToHsl, hslToHex, rgbToHex} = require('../media/modules/color');

// --- Contrast Ensurance Logic ---

function getLuminance(hexColor) {
    const rgb = hexToRgb(hexColor);
    const a = [rgb.r, rgb.g, rgb.b].map(function (v) {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(hex1, hex2) {
    const lum1 = getLuminance(hex1);
    const lum2 = getLuminance(hex2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
}

function ensureContrast(fgHex, bgHex, minRatio = 4.5) {
    if (!fgHex || !bgHex) return fgHex;

    const currentContrast = getContrastRatio(fgHex, bgHex);
    if (currentContrast >= minRatio) {
        return fgHex;
    }

    const bgHsl = rgbToHsl(hexToRgb(bgHex));
    const fgHsl = rgbToHsl(hexToRgb(fgHex));

    const isBgLight = bgHsl.l > 0.5;
    let newFgHsl = { ...fgHsl };

    // Iteratively adjust lightness
    for (let i = 0; i < 20; i++) {
        if (isBgLight) {
            newFgHsl.l -= 0.05; // make it darker
        } else {
            newFgHsl.l += 0.05; // make it lighter
        }
        newFgHsl.l = Math.max(0, Math.min(1, newFgHsl.l)); // clamp

        const newFgHex = hslToHex(newFgHsl);
        if (getContrastRatio(newFgHex, bgHex) >= minRatio) {
            return newFgHex;
        }
    }
    
    // As a last resort, return white or black
    return isBgLight ? '#000000' : '#FFFFFF';
}


function getCommentColor(backgroundColor) {
    const bgHsl = rgbToHsl(hexToRgb(backgroundColor));
    const isBgLight = bgHsl.l > 0.5;

    // A common, pleasant color for comments is a desaturated green/cyan.
    const commentHsl = {
        h: 150, // Green-cyan hue
        s: 0.25, // Desaturated
        l: isBgLight ? 0.35 : 0.65 // Adjusted for light/dark backgrounds
    };
    
    return hslToHex(commentHsl);
}

function getAxisColor(axis, backgroundColor) {
    const { l: bgLightness } = rgbToHsl(hexToRgb(backgroundColor));
    const isLight = bgLightness > 0.5;
    const axisHues = { X: 0, Y: 120, Z: 240 };
    
    let axisLightness;
    if (isLight) {
        // On light backgrounds, darker text is better for contrast
        axisLightness = 0.4; 
    } else {
        // On dark backgrounds, we need brighter text
        if (axis === 'Z') {
            axisLightness = 0.75; // Make Z-axis significantly brighter
        } else {
            axisLightness = 0.65; // Slightly bump X and Y as well
        }
    }
    
    const pureAxisColorHex = hslToHex({ h: axisHues[axis], s: 1.0, l: axisLightness });
    const axisRgb = hexToRgb(pureAxisColorHex);
    const bgRgb = hexToRgb(backgroundColor);

    const blendedRgb = {
        r: Math.round(axisRgb.r * 0.7 + bgRgb.r * 0.3),
        g: Math.round(axisRgb.g * 0.7 + bgRgb.g * 0.3),
        b: Math.round(axisRgb.b * 0.7 + bgRgb.b * 0.3)
    };

    return rgbToHex(blendedRgb);
}

function getArcOffsetColor(backgroundColor) {
    const dimmedColor = getDimmedColor(backgroundColor);
    const dimmedRgb = hexToRgb(dimmedColor);
    const bgRgb = hexToRgb(backgroundColor);

    const blendedRgb = {
        r: Math.round(dimmedRgb.r * 0.5 + bgRgb.r * 0.5),
        g: Math.round(dimmedRgb.g * 0.5 + bgRgb.g * 0.5),
        b: Math.round(dimmedRgb.b * 0.5 + bgRgb.b * 0.5)
    };

    return rgbToHex(blendedRgb);
}

// --- Highlighter Logic ---

let decorationTypes = {};
let updateTimeout;
  
// This function creates or updates the decoration types.
// It's called when the extension is activated or when the theme changes.
function createOrUpdateDecorationTypes(editor) {
    // Dispose of old decoration types before creating new ones
    if (Object.keys(decorationTypes).length > 0) {
        Object.values(decorationTypes).forEach(d => d.dispose());
    }

    const workbench = vscode.workspace.getConfiguration('workbench');
    const colorCustomizations = workbench.get('colorCustomizations');
    const editorBackground = colorCustomizations['editor.background'] || vscode.workspace.getConfiguration('editor').get('background') || '#1e1e1e';

    const ensure = (color) => ensureContrast(color, editorBackground);
    const isBgLight = vscode.window.activeColorTheme.kind !== vscode.ColorThemeKind.Dark;

    let fsParamColor = getBoundingBoxColor(editorBackground);
    const fsHsl = rgbToHsl(hexToRgb(fsParamColor));

    // If the background is light and the color is in the yellow range, darken it.
    if (isBgLight && fsHsl.h >= 40 && fsHsl.h <= 80) {
        fsHsl.l = 0.35; // A dark, readable lightness for yellow
        fsParamColor = hslToHex(fsHsl);
    }
    console.log("isBgLight", isBgLight, fsParamColor);

    decorationTypes = {
        feed: vscode.window.createTextEditorDecorationType({ color: ensure(getFeedColor(editorBackground)) }),
        rapid: vscode.window.createTextEditorDecorationType({ color: ensure(getRapidColor(editorBackground)) }),
        x: vscode.window.createTextEditorDecorationType({ color: ensure(getAxisColor('X', editorBackground)) }),
        y: vscode.window.createTextEditorDecorationType({ color: ensure(getAxisColor('Y', editorBackground)) }),
        z: vscode.window.createTextEditorDecorationType({ color: ensure(getAxisColor('Z', editorBackground)) }),
        fsParam: vscode.window.createTextEditorDecorationType({ color: ensure(fsParamColor) }),
        arcOffset: vscode.window.createTextEditorDecorationType({ color: ensure(getArcOffsetColor(editorBackground)) }),
        comment: vscode.window.createTextEditorDecorationType({ color: ensure(getCommentColor(editorBackground)) }),
        default: vscode.window.createTextEditorDecorationType({ color: ensure(getDimmedColor(editorBackground)) })
    };
}

function clearDecorations() {
    if (Object.keys(decorationTypes).length > 0) {
        Object.values(decorationTypes).forEach(d => d.dispose());
    }
    decorationTypes = {};
}

function scheduleUpdate(editor) {
    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }
    updateTimeout = setTimeout(() => updateDecorations(editor), 100);
}

async function updateDecorations(editor) {
    if (!editor || !editor.document) return;
    
    // For performance, only apply to g-code files
    if (!isGcodeFile(editor.document)) return;

    // If decoration types haven't been created yet, create them.
    if (Object.keys(decorationTypes).length === 0) {
        createOrUpdateDecorationTypes(editor);
    }


    const ranges = { feed: [], rapid: [], x: [], y: [], z: [], fsParam: [], arcOffset: [], comment: [], default: [] };
    const gcodeRegex = /\b([GM])([0-9]+)\b/g;
    const axisRegex = /([XYZ])([-]?[0-9]*\.?[0-9]+)/gi;
    const arcOffsetRegex = /([IJK])([-]?[0-9]*\.?[0-9]+)/gi;
    const fsRegex = /([FS])([-]?[0-9]*\.?[0-9]+)/gi;
    const commentSemicolonRegex = /;.*$/g;
    const commentParenthesesRegex = /\((.*?)\)/g;
    const processedLines = new Set();

    for (const visibleRange of editor.visibleRanges) {
        const startLine = Math.max(0, visibleRange.start.line - 100);
        const endLine = Math.min(editor.document.lineCount - 1, visibleRange.end.line + 100);

        for (let i = startLine; i <= endLine; i++) {
            if (processedLines.has(i)) continue; // Skip already processed lines
            processedLines.add(i);

            const line = editor.document.lineAt(i);
            let match;

            // Reset regex lastIndex for each line
            gcodeRegex.lastIndex = 0;
            axisRegex.lastIndex = 0;
            arcOffsetRegex.lastIndex = 0;
            fsRegex.lastIndex = 0;
            commentSemicolonRegex.lastIndex = 0;
            commentParenthesesRegex.lastIndex = 0;

            while ((match = gcodeRegex.exec(line.text)) !== null) {
                const range = new vscode.Range(i, match.index, i, match.index + match[0].length);
                const code = match[1].toUpperCase() + match[2];
                if (code === 'G0' || code === 'G00') ranges.rapid.push(range);
                else if (['G1', 'G01', 'G2', 'G02', 'G3', 'G03'].includes(code)) ranges.feed.push(range);
                else ranges.default.push(range);
            }

            while ((match = axisRegex.exec(line.text)) !== null) {
                const range = new vscode.Range(i, match.index, i, match.index + match[0].length);
                const axis = match[1].toUpperCase();
                if (axis === 'X') ranges.x.push(range);
                else if (axis === 'Y') ranges.y.push(range);
                else if (axis === 'Z') ranges.z.push(range);
            }

            while ((match = arcOffsetRegex.exec(line.text)) !== null) {
                const range = new vscode.Range(i, match.index, i, match.index + match[0].length);
                ranges.arcOffset.push(range);
            }

            while ((match = fsRegex.exec(line.text)) !== null) {
                const range = new vscode.Range(i, match.index, i, match.index + match[0].length);
                ranges.fsParam.push(range);
            }

            // Comments with semicolon
            while ((match = commentSemicolonRegex.exec(line.text)) !== null) {
                const range = new vscode.Range(i, match.index, i, match.index + match[0].length);
                ranges.comment.push(range);
            }

            // Comments with parentheses
            while ((match = commentParenthesesRegex.exec(line.text)) !== null) {
                const range = new vscode.Range(i, match.index, i, match.index + match[0].length);
                ranges.comment.push(range);
            }
        }
    }

    Object.keys(ranges).forEach(key => {
        if (decorationTypes[key]) {
            editor.setDecorations(decorationTypes[key], ranges[key]);
        }
    });
}

function isGcodeFile(document) {
    const gcodeLangIds = ['gcode', 'nc'];
    const gcodeExtensions = ['.gcode', '.nc', '.g', '.gc', '.cnc', '.tap'];
    const langId = document.languageId;
    const fileName = document.fileName;

    if (gcodeLangIds.includes(langId)) {
        return true;
    }

    for (const ext of gcodeExtensions) {
        if (fileName.endsWith(ext)) {
            return true;
        }
    }

    return false;
}

function setupEventListeners() {
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) scheduleUpdate(editor);
    }, null);

    vscode.workspace.onDidChangeTextDocument(event => {
        if (vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {
            scheduleUpdate(vscode.window.activeTextEditor);
        }
    }, null);

    vscode.window.onDidChangeTextEditorVisibleRanges(event => {
        if (event.textEditor) {
            scheduleUpdate(event.textEditor);
        }
    });

    vscode.window.onDidChangeActiveColorTheme(e => {
        if (vscode.window.activeTextEditor) {
            // Recreate the decoration types with the new theme colors
            createOrUpdateDecorationTypes(vscode.window.activeTextEditor);
            // Schedule an update to apply the new decorations
            scheduleUpdate(vscode.window.activeTextEditor);
        }
    });

    // Initial update for the active editor
    if (vscode.window.activeTextEditor) {
        scheduleUpdate(vscode.window.activeTextEditor);
    }
}

module.exports = {
    activate: setupEventListeners,
    deactivate: clearDecorations
};
