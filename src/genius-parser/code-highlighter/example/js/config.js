// ============ COLOR CATEGORIES ============

const colorCategories = [
  { name: 'G0 (Rapid Motion)', key: 'g0', example: 'G0' },
  { name: 'G1 (Linear Motion)', key: 'g1', example: 'G1' },
  { name: 'G2/G3 (Arcs)', key: 'arc', example: 'G2, G3' },
  { name: 'Special Motions', key: 'special', example: 'G4, G28' },
  { name: 'Coordinate Systems', key: 'coord', example: 'G54, G92' },
  { name: 'Planes', key: 'plane', example: 'G17, G18, G19' },
  { name: 'Positioning Modes', key: 'mode', example: 'G90, G91' },
  { name: 'Units', key: 'units', example: 'G20, G21' },
  { name: 'Canned Cycles', key: 'cycles', example: 'G81, G83' },
  { name: 'Spindle (Start)', key: 'spindle', example: 'M3, M4' },
  { name: 'Spindle (Stop)', key: 'spindle_stop', example: 'M5' },
  { name: 'Coolant (On)', key: 'coolant', example: 'M7, M8' },
  { name: 'Coolant (Off)', key: 'coolant_off', example: 'M9' },
  { name: 'Tool Change', key: 'tool', example: 'M6' },
  { name: 'Program Stops', key: 'stop', example: 'M0, M1, M2, M30' },
  { name: 'Temperature', key: 'temp', example: 'M104, M109' },
  { name: 'Extruder Mode', key: 'extruder', example: 'M82, M83' },
  { name: 'X-Axis', key: 'axis_x', example: 'X12.3' },
  { name: 'Y-Axis', key: 'axis_y', example: 'Y-4.5' },
  { name: 'Z-Axis', key: 'axis_z', example: 'Z100' },
  { name: 'Rotary Axes (A,B,C)', key: 'rotary', example: 'A90' },
  { name: 'E-Axis (Extruder)', key: 'axis_e', example: 'E1.25' },
  { name: 'Feed Rate (F)', key: 'feed', example: 'F1500' },
  { name: 'Spindle Speed (S)', key: 'speed', example: 'S1200' },
  { name: 'Arc Center (I,J,K)', key: 'center', example: 'I10 J5' },
  { name: 'Arc Radius (R)', key: 'radius', example: 'R20' },
  { name: 'Tool Number (T)', key: 'toolnum', example: 'T1' },
  { name: 'Line Number (N)', key: 'linenum', example: 'N10' },
  { name: 'Numeric Values', key: 'numeric', example: '123, 45.6' },
  { name: 'Comments', key: 'comment', example: '(text), ; text' },
  { name: 'Warnings', key: 'warning', example: '(WARNING: ...)' }
];


// ============ G-CODE EXAMPLE ============

const gcodeExample = `(====================================)
(  G-code Demo - All Categories     )
(  Version 2.2 - Refactored         )
(====================================)

(WARNING: This is a demonstration file!)

N10 G21 G90 G17 (Units, Abs, Plane)
N20 G54 (Work coordinate system 1)
N30 T1 M6 (Tool change)
N40 M3 S1200 (Spindle on)

(Rapid positioning)
G0 X0 Y0 Z10

(Coolant on)
M8

(Linear & Arc moves)
G1 Z-2 F200
G1 X50 A90 F1500
G1 Y50
G2 X70 Y70 I10 J0 F800
G3 X50 Y50 R20

(Special commands & Cycles)
G4 P500 (Dwell 500ms)
G81 X10 Y10 Z-5 R2 F100
M9 (Coolant off)

(3D Printing specific)
M104 S200 (Set hotend temperature)
M82 (Absolute E mode)
G1 X100 Y100 E15.5 F3000

(Return home & End)
G28 X Y
M5
M30`;
