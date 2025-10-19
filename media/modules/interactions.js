import * as THREE from 'three';
import { state, vscode } from './state.js';
import { updateAllLineColors, selectLinesInBox } from './gcode-visualizer.js';
import { updateBoundingBoxHelper, revertTransformation } from './transform/transform-main.js';
import { materials } from './materials.js';

// This module handles all user interaction with the 3D scene.

let isDragging = false;
let pointerDown = false;
let startX = 0;
let startY = 0;

export function initInteractionHandlers(renderer) {
    const canvas = renderer.domElement;
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('dblclick', onDoubleClick);

    // Use the controls' start and end events to determine if the user is panning/rotating.
    state.controls.addEventListener('start', () => {
        state.isPanningOrRotating = true;
        // If a box selection was in progress, cancel it
        if (state.isBoxSelecting) {
            state.isBoxSelecting = false;
            state.selectionBoxElement.style.display = 'none';
        }
    });
    state.controls.addEventListener('end', () => {
        state.isPanningOrRotating = false;
    });
}

function onPointerDown(event) {
    // Only trigger on left-click for selection
    if (event.button !== 0) return;

    // Ignore clicks if panning/rotating
    if (state.isPanningOrRotating) return;

    pointerDown = true;
    isDragging = false;
    startX = event.clientX;
    startY = event.clientY;
}

function onPointerMove(event) {
    // Standard hover effect regardless of dragging state
    updateHoverEffect(event);

    if (pointerDown && !isDragging) {
        const dx = Math.abs(event.clientX - startX);
        const dy = Math.abs(event.clientY - startY);

        // Start dragging if the mouse has moved more than a small threshold
        if (dx > 2 || dy > 2) {
            isDragging = true;
            startBoxSelection(event);
        }
    }

    if (isDragging && state.isBoxSelecting) {
        updateBoxSelection(event);
    }
}

function onPointerUp(event) {
    // Only trigger on left-click
    if (event.button !== 0) return;

    if (isDragging && state.isBoxSelecting) {
        // This was a box selection drag
        finishBoxSelection(event);
    } else if (!state.isPanningOrRotating) {
        // This was a simple click
        handleSingleClick(event);
    }

    // Reset all dragging flags
    pointerDown = false;
    isDragging = false;
    state.isBoxSelecting = false;
}



function startBoxSelection(event) {
    if (!state.isInteractive || isTransformPanelOpen()) return;

    state.isBoxSelecting = true;
    const rect = state.renderer.domElement.getBoundingClientRect();
    state.boxSelectionStartPoint.x = event.clientX - rect.left;
    state.boxSelectionStartPoint.y = event.clientY - rect.top;

    state.selectionBoxElement.style.left = `${state.boxSelectionStartPoint.x}px`;
    state.selectionBoxElement.style.top = `${state.boxSelectionStartPoint.y}px`;
    state.selectionBoxElement.style.width = '0px';
    state.selectionBoxElement.style.height = '0px';
    state.selectionBoxElement.style.display = 'block';
}

function updateBoxSelection(event) {
    if (!state.isBoxSelecting) return;

    const rect = state.renderer.domElement.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;

    const startX = state.boxSelectionStartPoint.x;
    const startY = state.boxSelectionStartPoint.y;

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(startX - currentX);
    const height = Math.abs(startY - currentY);

    state.selectionBoxElement.style.left = `${left}px`;
    state.selectionBoxElement.style.top = `${top}px`;
    state.selectionBoxElement.style.width = `${width}px`;
    state.selectionBoxElement.style.height = `${height}px`;
}

function finishBoxSelection(event) {
    if (!state.isBoxSelecting) return;

    state.selectionBoxElement.style.display = 'none';
    
    const rect = state.renderer.domElement.getBoundingClientRect();
    const endX = event.clientX - rect.left;
    const endY = event.clientY - rect.top;

    const startX = state.boxSelectionStartPoint.x;
    const startY = state.boxSelectionStartPoint.y;

    const selectionRect = {
        left: Math.min(startX, endX),
        top: Math.min(startY, endY),
        right: Math.max(startX, endX),
        bottom: Math.max(startY, endY)
    };

    // Determine selection mode based on drag direction
    const selectionMode = (endX > startX) ? 'contain' : 'intersect';

    // Get newly selected lines from the visualizer module
    const newlySelectedLines = selectLinesInBox(selectionRect, selectionMode);

    // Update the global selection state based on modifier keys
    if (event.ctrlKey) {
        // Add/remove from current selection
        newlySelectedLines.forEach(lineNum => {
            if (state.clientSelectedLines.has(lineNum)) {
                state.clientSelectedLines.delete(lineNum);
            } else {
                state.clientSelectedLines.add(lineNum);
            }
        });
    } else if (event.shiftKey) {
        // Add to current selection
        newlySelectedLines.forEach(lineNum => {
            state.clientSelectedLines.add(lineNum);
        });
    } else {
        // Replace current selection
        state.clientSelectedLines.clear();
        newlySelectedLines.forEach(lineNum => {
            state.clientSelectedLines.add(lineNum);
        });
    }
    
    // Notify VS Code and update visuals
    vscode.postMessage({ command: 'setSmartSelection', selectedLines: Array.from(state.clientSelectedLines) });
    updateAllLineColors();
    updateBoundingBoxHelper();

    state.isBoxSelecting = false;
}


function updateHoverEffect(event) {
  const canvas = state.renderer.domElement;
  const rect = canvas.getBoundingClientRect();
  state.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  state.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  const distance = state.camera.position.distanceTo(state.controls.target);
  state.raycaster.params.Line.threshold = distance / 150;
  state.raycaster.setFromCamera(state.mouse, state.camera);
  const intersects = state.raycaster.intersectObjects(state.gcodeGroup.children, false);

  let newHoveredLineNumber = null;
  if (intersects.length > 0) {
    newHoveredLineNumber = intersects[0].object.userData.lineNumber;
  }

  if (newHoveredLineNumber !== state.hoveredLineNumber) {
    state.hoveredLineNumber = newHoveredLineNumber;
    updateAllLineColors();
  }
}

function handleSingleClick(event) {
  if (!state.isInteractive || isTransformPanelOpen()) return;

  const canvas = state.renderer.domElement;
  const rect = canvas.getBoundingClientRect();
  state.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  state.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  const distance = state.camera.position.distanceTo(state.controls.target);
  state.raycaster.params.Line.threshold = distance / 150;
  state.raycaster.setFromCamera(state.mouse, state.camera);
  const intersects = state.raycaster.intersectObjects(state.gcodeGroup.children, false);

  if (intersects.length > 0) {
    const clickedLineNumber = intersects[0].object.userData.lineNumber;

    if (event.shiftKey && state.lastSelectedLine !== null) {
      const start = Math.min(state.lastSelectedLine, clickedLineNumber);
      const end = Math.max(state.lastSelectedLine, clickedLineNumber);
      // Temporarily add to a new set to avoid modifying the main set during iteration
      const shiftSelection = new Set();
      for (let i = start; i <= end; i++) {
          shiftSelection.add(i);
      }
      // Now combine with existing selection
      shiftSelection.forEach(lineNum => state.clientSelectedLines.add(lineNum));
      vscode.postMessage({ command: 'setSmartSelection', selectedLines: Array.from(state.clientSelectedLines) });

    } else if (event.ctrlKey) {
      if (state.clientSelectedLines.has(clickedLineNumber)) {
        state.clientSelectedLines.delete(clickedLineNumber);
      } else {
        state.clientSelectedLines.add(clickedLineNumber);
      }
      state.lastSelectedLine = clickedLineNumber;
      vscode.postMessage({ command: 'setSmartSelection', selectedLines: Array.from(state.clientSelectedLines) });

    } else {
      vscode.postMessage({ command: 'goToLine', lineNumber: clickedLineNumber - 1 });
    }
  }
}

function onDoubleClick(event) {
    if (!state.isInteractive || isTransformPanelOpen()) return;

    const canvas = state.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    state.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    state.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const distance = state.camera.position.distanceTo(state.controls.target);
    state.raycaster.params.Line.threshold = distance / 150;
    state.raycaster.setFromCamera(state.mouse, state.camera);
    const intersects = state.raycaster.intersectObjects(state.gcodeGroup.children, false);

    if (intersects.length > 0) {
        const clickedLineNumber = intersects[0].object.userData.lineNumber;
        vscode.postMessage({ command: 'selectObjectAtLine', lineNumber: clickedLineNumber });
    }
}

function isTransformPanelOpen() {
    return state.movePanel.style.display === 'block' || 
           state.rotatePanel.style.display === 'block' ||
           state.moveToOriginPanel.style.display === 'block';
}

export function highlightLines(selections) {
    if (isTransformPanelOpen()) {
        revertTransformation();
        state.movePanel.style.display = 'none';
        state.rotatePanel.style.display = 'none';
        state.moveToOriginPanel.style.display = 'none';
        if (state.transformHelperSphere) state.transformHelperSphere.visible = false;
    }

    state.mainSelections = selections;

    state.clientSelectedLines.clear();
    selections.forEach(sel => {
        for (let i = sel.startLine; i <= sel.endLine; i++) {
            state.clientSelectedLines.add(i);
        }
    });
    if (selections.length === 1 && selections[0].startLine === selections[0].endLine) {
        state.lastSelectedLine = selections[0].startLine;
    }

    updateAllLineColors();
    updateBoundingBoxHelper();

    while (state.highlightSpheresGroup.children.length > 0) {
        const sphere = state.highlightSpheresGroup.children[0];
        state.highlightSpheresGroup.remove(sphere);
    }

    const isSingleCursor = state.mainSelections.length === 1 && state.mainSelections[0].startLine === state.mainSelections[0].endLine && state.mainSelections[0].startChar === state.mainSelections[0].endChar;

    if (state.slider && state.transformControlBlock) {
        if (isSingleCursor) {
            state.slider.style.display = 'block';
            state.transformControlBlock.style.display = 'none';
            state.movePanel.style.display = 'none';
            state.rotatePanel.style.display = 'none';

            if (state.isBboxVisible) {
                state.isBboxVisible = false;
                updateBoundingBoxHelper();
            }
        } else {
            state.slider.style.display = 'none';
            if (state.isInteractive && state.clientSelectedLines.size > 0) {
                state.transformControlBlock.style.display = 'flex';
            } else {
                state.transformControlBlock.style.display = 'none';
            }
        }
    }

    if (isSingleCursor) {
        const currentLineNumber = state.mainSelections[0].startLine;

        if (!state.isSliderDragging) {
            let segmentIndex = state.segmentToLineMap.findIndex(ln => ln >= currentLineNumber);
            if (segmentIndex === -1 && state.segmentToLineMap.length > 0) segmentIndex = state.segmentToLineMap.length - 1;
            if (state.slider && segmentIndex !== -1) state.slider.value = segmentIndex;
        }
        
        const line = state.gcodeGroup.children.find(c => c.userData.lineNumber === currentLineNumber);
        if (line) {
            const positions = line.geometry.attributes.position.array;
            if (positions && positions.length >= 6) {
                const geometry = new THREE.SphereGeometry(0.5, 16, 16);
                const startSphere = new THREE.Mesh(geometry, materials.mesh.highlightSphere);
                const endSphere = new THREE.Mesh(geometry, materials.mesh.highlightSphere);
                startSphere.position.set(positions[0], positions[1], positions[2]);
                endSphere.position.set(positions[positions.length - 3], positions[positions.length - 2], positions[positions.length - 1]);
                state.highlightSpheresGroup.add(startSphere);
                state.highlightSpheresGroup.add(endSphere);
            }
        }

    } else { // Block selection
        const sortedLines = Array.from(state.clientSelectedLines).sort((a, b) => a - b);
        const ranges = [];
        if (sortedLines.length > 0) {
            let start = sortedLines[0];
            let end = sortedLines[0];
            for (let i = 1; i < sortedLines.length; i++) {
                if (sortedLines[i] === end + 1) {
                    end = sortedLines[i];
                } else {
                    ranges.push({ start, end });
                    start = sortedLines[i];
                    end = sortedLines[i];
                }
            }
            ranges.push({ start, end });
        }

        ranges.forEach(range => {
            const linesInRange = state.gcodeGroup.children.filter(c => 
                c.userData.lineNumber >= range.start && c.userData.lineNumber <= range.end
            );

            if (linesInRange.length > 0) {
                const firstLine = linesInRange[0];
                const lastLine = linesInRange[linesInRange.length - 1];
                const geometry = new THREE.SphereGeometry(0.5, 16, 16);
                
                const startPositions = firstLine.geometry.attributes.position.array;
                const startSphere = new THREE.Mesh(geometry, materials.mesh.highlightSphere);
                startSphere.position.set(startPositions[0], startPositions[1], startPositions[2]);
                state.highlightSpheresGroup.add(startSphere);

                const endPositions = lastLine.geometry.attributes.position.array;
                const endSphere = new THREE.Mesh(geometry, materials.mesh.highlightSphere);
                endSphere.position.set(endPositions[endPositions.length - 3], endPositions[endPositions.length - 2], endPositions[endPositions.length - 1]);
                state.highlightSpheresGroup.add(endSphere);
            }
        });
    }
}

export function initHotkeys() {
    window.addEventListener('keydown', (event) => {
        if (!state.isInteractive) return;

        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        let commandId = null;

        if (event.ctrlKey) {
            switch (event.code) {
                case 'KeyA': commandId = 'editor.action.selectAll'; break;
                case 'KeyC': commandId = 'editor.action.clipboardCopyAction'; break;
                case 'KeyX': commandId = 'editor.action.clipboardCutAction'; break;
                case 'KeyV': commandId = 'editor.action.clipboardPasteAction'; break;
                case 'KeyZ': commandId = 'undo'; break;
                case 'KeyY': commandId = 'redo'; break;
            }
        } else {
            switch (event.code) {
                case 'Delete':
                case 'Backspace':
                    if (state.clientSelectedLines.size > 0) {
                        event.preventDefault();
                        vscode.postMessage({ command: 'deleteSelectedLines' });
                    }
                    break;
                case 'Escape':
                    if (state.clientSelectedLines.size > 0) {
                        event.preventDefault();
                        vscode.postMessage({ command: 'clearSelection' });
                    }
                    return; 
            }
        }

        if (commandId) {
            event.preventDefault();
            vscode.postMessage({ command: 'executeEditorCommand', commandId: commandId });
        }
    });
}