// ============ UPDATE FUNCTIONS (v3.1) ============ 

let currentColors = {}; 

// Note: GcodeColorHighlighter is instantiated from ../src/index.js 
// and is available as a global variable. 

function updateColors(bgColor) { 
  // Set the background color in the library instance 
  GcodeColorHighlighter.setBackgroundColor(bgColor); 

  // Recalculate all colors based on the new background 
  currentColors = {}; 
  colorCategories.forEach(cat => { 
    currentColors[cat.key] = GcodeColorHighlighter.getColor(cat.key); 
  }); 

  const code = document.getElementById('gcodeTextarea').value; 
  renderGcode(bgColor, code); 
  renderLegend(bgColor); 
} 

function escapeHtml(text) { 
  const div = document.createElement('div'); 
  div.textContent = text; 
  return div.innerHTML; 
} 

function renderGcode(bgColor, code) { 
  const editor = document.getElementById('gcodeEditor'); 
  editor.style.backgroundColor = bgColor; 

  const lines = code.split('\n'); 
  const html = lines.map(line => { 
    if (line.trim() === '') { 
      return '<div class="gcode-line">&nbsp;</div>'; 
    } 

    // Handle full-line warnings first 
    if (line.includes('WARNING') || line.includes('DANGER')) { 
      return `<div class="gcode-line"><span style="color: ${currentColors['warning']}; font-weight: bold;">${escapeHtml(line)}</span></div>`; 
    } 

    // --- New, more robust comment handling --- 
    const commentRegex = /(\(.*?\)|;.*)/; 
    const match = line.match(commentRegex); 

    let codePart = line; 
    let commentPart = ''; 

    if (match) { 
      codePart = line.substring(0, match.index); 
      commentPart = line.substring(match.index); 
    } 
    // --- End of new comment handling --- 

    // Apply syntax highlighting ONLY to the code part 
    let styledLine = escapeHtml(codePart); 
    styledLine = styledLine.replace(/\b(G0)\b/g, `<span style="color: ${currentColors['g0']};">$1</span>`); 
    styledLine = styledLine.replace(/\b(G1)\b/g, `<span style="color: ${currentColors['g1']};">$1</span>`); 
    styledLine = styledLine.replace(/\b(G[23])\b/g, `<span style="color: ${currentColors['arc']};">$1</span>`); 
    styledLine = styledLine.replace(/\b(G(?:4|28|29|30|53))\b/g, `<span style="color: ${currentColors['special']};">$1</span>`); 
    styledLine = styledLine.replace(/\b(G(?:5[4-9]|92))\b/g, `<span style="color: ${currentColors['coord']};">$1</span>`); 
    styledLine = styledLine.replace(/\b(G1[7-9])\b/g, `<span style="color: ${currentColors['plane']};">$1</span>`); 
    styledLine = styledLine.replace(/\b(G9[01])\b/g, `<span style="color: ${currentColors['mode']}; font-weight: bold;">$1</span>`); 
    styledLine = styledLine.replace(/\b(G2[01])\b/g, `<span style="color: ${currentColors['units']}; font-weight: bold;">$1</span>`); 
    styledLine = styledLine.replace(/\b(G8[0-9])\b/g, `<span style="color: ${currentColors['cycles']};">$1</span>`); 

    styledLine = styledLine.replace(/\b(M[34])\b/g, `<span style="color: ${currentColors['spindle']};">$1</span>`); 
    styledLine = styledLine.replace(/\b(M5)\b/g, `<span style="color: ${currentColors['spindle_stop']};">$1</span>`); 
    styledLine = styledLine.replace(/\b(M[78])\b/g, `<span style="color: ${currentColors['coolant']};">$1</span>`); 
    styledLine = styledLine.replace(/\b(M9)\b/g, `<span style="color: ${currentColors['coolant_off']};">$1</span>`); 
    styledLine = styledLine.replace(/\b(M6)\b/g, `<span style="color: ${currentColors['tool']}; font-weight: bold;">$1</span>`); 
    styledLine = styledLine.replace(/\b(M[012]|M30)\b/g, `<span style="color: ${currentColors['stop']}; font-weight: bold;">$1</span>`); 
    styledLine = styledLine.replace(/\b(M(?:104|109|140|190))\b/g, `<span style="color: ${currentColors['temp']};">$1</span>`); 
    styledLine = styledLine.replace(/\b(M8[23])\b/g, `<span style="color: ${currentColors['extruder']};">$1</span>`); 

    styledLine = styledLine.replace(/\b(T)([-+]?\d+\.?\d*)/g, `<span style="color: ${currentColors['toolnum']};">$1$2</span>`); 
    styledLine = styledLine.replace(/\b(F)([-+]?\d+\.?\d*)/g, `<span style="color: ${currentColors['feed']};">$1$2</span>`); 
    styledLine = styledLine.replace(/\b(S)([-+]?\d+\.?\d*)/g, `<span style="color: ${currentColors['speed']};">$1$2</span>`); 

    styledLine = styledLine.replace(/\b(X)([-+]?\d+\.?\d*)?/g, `<span style="color: ${currentColors['axis_x']};">$1$2</span>`); 
    styledLine = styledLine.replace(/\b(Y)([-+]?\d+\.?\d*)?/g, `<span style="color: ${currentColors['axis_y']};">$1$2</span>`); 
    styledLine = styledLine.replace(/\b(Z)([-+]?\d+\.?\d*)?/g, `<span style="color: ${currentColors['axis_z']};">$1$2</span>`); 
    styledLine = styledLine.replace(/\b([ABC])([-+]?\d+\.?\d*)?/g, `<span style="color: ${currentColors['rotary']};">$1$2</span>`); 
    styledLine = styledLine.replace(/\b(E)([-+]?\d+\.?\d*)?/g, `<span style="color: ${currentColors['axis_e']};">$1$2</span>`); 

    styledLine = styledLine.replace(/\b([IJK])([-+]?\d+\.?\d*)/g, `<span style="color: ${currentColors['center']};">$1$2</span>`); 
    styledLine = styledLine.replace(/\b(R)([-+]?\d+\.?\d*)/g, `<span style="color: ${currentColors['radius']};">$1$2</span>`); 
    styledLine = styledLine.replace(/\b(P)([-+]?\d+\.?\d*)/g, `<span style="color: ${currentColors['special']};">$1$2</span>`); 

    styledLine = styledLine.replace(/^(N)(\d+)/g, `<span style="color: ${currentColors['linenum']};">$1$2</span>`); 

    // Style and append the comment part 
    if (commentPart) { 
      styledLine += `<span style="color: ${currentColors['comment']}; font-style: italic;">${escapeHtml(commentPart)}</span>`; 
    } 

    return `<div class="gcode-line">${styledLine}</div>`; 
  }).join(''); 

  editor.innerHTML = html; 

  // Use the helper functions exposed on the instance 
  const bgRgb = GcodeColorHighlighter.hexToRgb(bgColor); 
  if (!bgRgb) { 
    document.getElementById('statsText').textContent = 'Invalid background color'; 
    return; 
  } 
  const bgLum = GcodeColorHighlighter.getRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b); 
  const isDark = GcodeColorHighlighter.isDarkBackground(bgColor); 
  document.getElementById('statsText').textContent = 
    `Background Luminance: ${bgLum.toFixed(3)} (${isDark ? 'dark' : 'light'})`; 
} 

function renderLegend(bgColor) { 
  const container = document.getElementById('legendContainer'); 
  const html = colorCategories.map(cat => { 
    const color = currentColors[cat.key]; 
    if (!color) return ''; 
    return ` 
      <div class="legend-item"> 
          <div class="legend-color" style="background-color: ${color};"></div> 
          <div class="legend-info"> 
              <div class="legend-name">${cat.name}</div> 
              <div class="legend-desc">${cat.example} | ${color}</div> 
          </div> 
      </div> 
    `; 
  }).join(''); 
  container.innerHTML = html; 
} 

function applyBackground(color) { 
  document.getElementById('bgColorPicker').value = color; 
  document.getElementById('bgColorText').value = color; 
  updateColors(color); 
}