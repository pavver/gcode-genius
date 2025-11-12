// ============ INITIALIZATION ============

document.getElementById('bgColorPicker').addEventListener('input', (e) => {
  document.getElementById('bgColorText').value = e.target.value;
  updateColors(e.target.value);
});

document.getElementById('bgColorText').addEventListener('input', (e) => {
  const value = e.target.value;
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
    document.getElementById('bgColorPicker').value = value;
    updateColors(value);
  }
});

// Initial initialization
document.getElementById('gcodeTextarea').value = gcodeExample;
updateColors('#1e1e1e');

const toggleModeBtn = document.getElementById('toggleModeBtn');
const gcodeEditor = document.getElementById('gcodeEditor');
const gcodeTextarea = document.getElementById('gcodeTextarea');
let isEditMode = false;

toggleModeBtn.addEventListener('click', () => {
  isEditMode = !isEditMode;
  if (isEditMode) {
    gcodeEditor.style.display = 'none';
    gcodeTextarea.style.display = 'block';
    gcodeTextarea.focus();
    toggleModeBtn.textContent = 'View';
  } else {
    gcodeTextarea.style.display = 'none';
    gcodeEditor.style.display = 'block';
    toggleModeBtn.textContent = 'Edit';
    const currentBgColor = document.getElementById('bgColorPicker').value;
    updateColors(currentBgColor);
  }
});