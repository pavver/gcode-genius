import * as THREE from 'three';
import { state } from './state.js';
import { materials } from './materials.js';

// This module handles the core G-code parsing and visualization logic.

/**
 * Calculates points along an arc for G2/G3 commands.
 */
function getArcPoints(start, end, paramI, paramJ, clockwise, arcCenterRelative, numSegments = 32) {
  const points = [];
  const startX = start.x;
  const startY = start.y;
  const endX = end.x;
  const endY = end.y;
  const startZ = start.z;
  const endZ = end.z;

  let centerX, centerY;

  if (arcCenterRelative) { // G91.1
    centerX = startX + paramI;
    centerY = startY + paramJ;
  } else { // G90.1
    centerX = paramI;
    centerY = paramJ;
  }

  const radius = Math.sqrt(Math.pow(startX - centerX, 2) + Math.pow(startY - centerY, 2));
  let startAngle = Math.atan2(startY - centerY, startX - centerX);
  let endAngle = Math.atan2(endY - centerY, endX - centerX);

  if (clockwise) { // G2
    if (endAngle > startAngle) {
      endAngle -= 2 * Math.PI;
    }
  } else { // G3
    if (endAngle < startAngle) {
      endAngle += 2 * Math.PI;
    }
  }

  const angleDelta = endAngle - startAngle;
  const zDelta = endZ - startZ;

  for (let i = 0; i <= numSegments; i++) {
    const angle = startAngle + (angleDelta / numSegments) * i;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    const z = startZ + (zDelta / numSegments) * i;
    points.push(new THREE.Vector3(x, y, z));
  }

  return points;
}

/**
 * This function is the single source of truth for all line coloring.
 */
export function updateAllLineColors() {
  if (!state.gcodeGroup) return;

  const isSingleCursor = state.mainSelections.length === 1 && state.mainSelections[0].startLine === state.mainSelections[0].endLine && state.mainSelections[0].startChar === state.mainSelections[0].endChar;
  const currentLineNumber = isSingleCursor ? state.mainSelections[0].startLine : -1;
  
  state.gcodeGroup.children.forEach(line => {
    const userData = line.userData;
    if (!userData || !line.material) return;
    const lineNum = userData.lineNumber;

    // Highest priority: Hover
    if (lineNum === state.hoveredLineNumber) {
      line.material = materials.line.hover;
      line.renderOrder = 2;
    } 
    // Second priority: Selection
    else if (state.clientSelectedLines.has(lineNum)) {
      line.material = materials.line.highlight;
      line.renderOrder = 1;
    }
    // Third priority: Single cursor mode (past/future)
    else if (isSingleCursor) {
      line.renderOrder = 0;
      if (lineNum < currentLineNumber) {
        // Past (already executed) path: fully opaque
        line.material = userData.moveCommandType === 'G0' ? materials.line.rapid : materials.line.feed;
      } else {
        // Future (not yet executed) path: same color, 50% transparent
        line.material = userData.moveCommandType === 'G0' ? materials.line.rapidTransparent : materials.line.feedTransparent;
      }
    }
    // Default case
    else {
      line.renderOrder = 0;
      const isBlockSelectionActive = !isSingleCursor && state.clientSelectedLines.size > 0;

      if (isBlockSelectionActive) {
        // When a block is selected, all non-highlighted lines should be dimmed.
        line.material = materials.line.dimmed;
      } else {
        // This is the default view with no selection: all paths are "feed" or "rapid".
        line.material = userData.moveCommandType === 'G0' ? materials.line.rapid : materials.line.feed;
      }
    }
  });
}

/**
 * Selects lines that are inside a given 2D screen rectangle.
 * @param {Object} selectionRect - The screen rectangle (left, top, right, bottom).
 * @param {string} mode - 'contain' or 'intersect'.
 * @returns {number[]} - An array of selected line numbers.
 */
export function selectLinesInBox(selectionRect, mode) {
    const selectedLineNumbers = new Set();
    if (!state.gcodeGroup || !state.camera) return [];

    const canvas = state.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;

    state.gcodeGroup.children.forEach(line => {
        if (line.type !== 'Line') return;

        const positions = line.geometry.attributes.position.array;
        const lineNum = line.userData.lineNumber;

        if (mode === 'contain') {
            let allPointsInBox = true;
            // For 'contain' mode, every single vertex of the geometry must be in the box.
            for (let i = 0; i < positions.length; i += 3) {
                const p = new THREE.Vector3(positions[i], positions[i+1], positions[i+2]);
                const screenP = projectToScreen(p, state.camera, canvasWidth, canvasHeight);
                if (!isPointInBox(screenP, selectionRect)) {
                    allPointsInBox = false;
                    break; // A point is outside, so this line is not fully contained.
                }
            }
            if (allPointsInBox) {
                selectedLineNumbers.add(lineNum);
            }
        } else { // 'intersect' mode
            // For 'intersect' mode, we check if any segment of the line intersects the box.
            for (let i = 0; i < positions.length - 3; i += 3) {
                const p1 = new THREE.Vector3(positions[i], positions[i+1], positions[i+2]);
                const p2 = new THREE.Vector3(positions[i+3], positions[i+4], positions[i+5]);

                const screenP1 = projectToScreen(p1, state.camera, canvasWidth, canvasHeight);
                const screenP2 = projectToScreen(p2, state.camera, canvasWidth, canvasHeight);

                if (isLineIntersectingBox(screenP1, screenP2, selectionRect)) {
                    selectedLineNumbers.add(lineNum);
                    break; // Found an intersection, select the line and move to the next.
                }
            }
        }
    });

    return Array.from(selectedLineNumbers);
}

function projectToScreen(vector3, camera, canvasWidth, canvasHeight) {
    const projected = vector3.clone().project(camera);
    return {
        x: (projected.x + 1) * canvasWidth / 2,
        y: (-projected.y + 1) * canvasHeight / 2,
    };
}

function isPointInBox(point, box) {
    return point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom;
}

function isLineIntersectingBox(p1, p2, box) {
    // Check if either point is inside the box
    if (isPointInBox(p1, box) || isPointInBox(p2, box)) {
        return true;
    }

    // Check for line segment intersection with box edges
    const topLeft = { x: box.left, y: box.top };
    const topRight = { x: box.right, y: box.top };
    const bottomLeft = { x: box.left, y: box.bottom };
    const bottomRight = { x: box.right, y: box.bottom };

    if (doSegmentsIntersect(p1, p2, topLeft, topRight)) return true;
    if (doSegmentsIntersect(p1, p2, topRight, bottomRight)) return true;
    if (doSegmentsIntersect(p1, p2, bottomRight, bottomLeft)) return true;
    if (doSegmentsIntersect(p1, p2, bottomLeft, topLeft)) return true;

    return false;
}

// Helper function to check if two line segments intersect
function doSegmentsIntersect(p1, q1, p2, q2) {
    function onSegment(p, q, r) {
        return (
            q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
            q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y)
        );
    }

    function orientation(p, q, r) {
        const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
        if (val === 0) return 0; // Collinear
        return (val > 0) ? 1 : 2; // Clockwise or Counterclockwise
    }

    const o1 = orientation(p1, q1, p2);
    const o2 = orientation(p1, q1, q2);
    const o3 = orientation(p2, q2, p1);
    const o4 = orientation(p2, q2, q1);

    if (o1 !== o2 && o3 !== o4) {
        return true;
    }

    // Special Cases for collinear points
    if (o1 === 0 && onSegment(p1, p2, q1)) return true;
    if (o2 === 0 && onSegment(p1, q2, q1)) return true;
    if (o3 === 0 && onSegment(p2, p1, q2)) return true;
    if (o4 === 0 && onSegment(p2, q1, q2)) return true;

    return false;
}



export function visualizeGcode(parsedGcode) {
  state.segmentToLineMap = [];
  while (state.gcodeGroup.children.length > 0) {
    const child = state.gcodeGroup.children[0];
    state.gcodeGroup.remove(child);
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
  }

  let currentPosition = new THREE.Vector3(0, 0, 0);

  parsedGcode.forEach(lineData => {
    let geometry;
    if (lineData.isMoveCommand) {
      if (lineData.moveCommandType === 'G0' || lineData.moveCommandType === 'G1') {
        geometry = new THREE.BufferGeometry().setFromPoints([
          currentPosition,
          new THREE.Vector3(lineData.endPosition.x, lineData.endPosition.y, lineData.endPosition.z)
        ]);
      } else if (lineData.moveCommandType === 'G2' || lineData.moveCommandType === 'G3') {
        const { i: paramI = 0, j: paramJ = 0 } = lineData.params;
        const clockwise = (lineData.moveCommandType === 'G2');
        const { arcCenterRelative } = lineData.state;

        const arcPoints = getArcPoints(
          currentPosition,
          new THREE.Vector3(lineData.endPosition.x, lineData.endPosition.y, lineData.endPosition.z),
          paramI,
          paramJ,
          clockwise,
          arcCenterRelative
        );
        geometry = new THREE.BufferGeometry().setFromPoints(arcPoints);
      }
    }

    if (geometry) {
      const isRapid = lineData.moveCommandType === 'G0';
      const material = isRapid ? materials.line.rapid : materials.line.feed;

      const line = new THREE.Line(geometry, material);
      line.userData = {
        lineNumber: lineData.lineNumber,
        moveCommandType: lineData.moveCommandType
      };
      state.gcodeGroup.add(line);
      state.segmentToLineMap.push(lineData.lineNumber);
    }

    if (lineData.isMoveCommand) {
      currentPosition.copy(new THREE.Vector3(lineData.endPosition.x, lineData.endPosition.y, lineData.endPosition.z));
    }
  });

  if (state.slider) {
    state.slider.max = state.segmentToLineMap.length > 0 ? state.segmentToLineMap.length - 1 : 0;
    state.slider.value = state.slider.max;
  }
}
