// gcode-parser.js

/**
 * Compares two machine state objects for equality.
 * @param {object} state1
 * @param {object} state2
 * @returns {boolean} True if states are equal, false otherwise.
 */
function areStatesEqual(state1, state2) {
    if (!state1 || !state2) return false; // Handle undefined states
    return state1.x === state2.x &&
           state1.y === state2.y &&
           state1.z === state2.z &&
           state1.relative === state2.relative &&
           state1.arcCenterRelative === state2.arcCenterRelative;
}

/**
 * Compares two position objects for equality.
 * @param {object} pos1
 * @param {object} pos2
 * @returns {boolean} True if positions are equal, false otherwise.
 */
function arePositionsEqual(pos1, pos2) {
    if (!pos1 || !pos2) return false; // Handle undefined positions
    return pos1.x === pos2.x &&
           pos1.y === pos2.y &&
           pos1.z === pos2.z;
}

/**
 * Parses a single line of G-code.
 * @param {string} line - The line of G-code to parse.
 * @param {number} lineNumber - The line number.
 * @param {object} previousState - The machine state before this line.
 * @returns {object} - The parsed line object, including the machine state after this line.
 */
function parseLine(line, lineNumber, previousState) {
    const originalLine = line;
    line = line.trim().toUpperCase();

    const result = {
        isCommand: false,
        isMoveCommand: false,
        isControlCommand: false,
        moveCommandType: null,
        isActive: false, // Interpreted as "not a comment or empty"
        lineNumber: lineNumber,
        startPosition: { ...previousState }, // Position before this line
        endPosition: { ...previousState },   // Position after this line (will be updated)
        params: {},
        originalLine: originalLine,
        state: { ...previousState } // State after this line (will be updated)
    };

    // If line is empty or a comment, it's not an active command and doesn't change state/position
    if (line.length === 0 || line.startsWith('(') || line.startsWith('%')) {
        result.state = previousState; // State doesn't change, reference previous state object
        return result;
    }

    result.isActive = true;
    result.isCommand = true;

    const parts = line.split(/\s+/);
    const commandPart = parts.find(p => p.startsWith('G') || p.startsWith('M'));

    let newState = { ...previousState }; // Start with a copy of previous state, modify if needed

    if (commandPart) {
        const command = commandPart.substring(0); // e.g. G90.1
        const commandLetter = command.charAt(0); // G
        const commandCode = command.substring(1); // 90.1

        if (commandLetter === 'G') {
            const commandNum = parseFloat(commandCode);
            const normalizedCommand = commandLetter + commandNum;

            // Check for move commands
            if (commandNum === 0 || commandNum === 1 || commandNum === 2 || commandNum === 3) {
                result.isMoveCommand = true;
                result.moveCommandType = normalizedCommand;
            }

            // Check for control commands that change state
            if (commandCode === '90') {
                result.isControlCommand = true;
                if (newState.relative !== false) newState.relative = false;
                else newState = previousState; // No actual change, reference previous state
            } else if (commandCode === '91') {
                result.isControlCommand = true;
                if (newState.relative !== true) newState.relative = true;
                else newState = previousState; // No actual change, reference previous state
            } else if (commandCode === '90.1') {
                result.isControlCommand = true;
                if (newState.arcCenterRelative !== false) newState.arcCenterRelative = false;
                else newState = previousState; // No actual change, reference previous state
            } else if (commandCode === '91.1') {
                result.isControlCommand = true;
                if (newState.arcCenterRelative !== true) newState.arcCenterRelative = true;
                else newState = previousState; // No actual change, reference previous state
            }
        }
    }

    // Parse parameters
    parts.forEach(part => {
        const letter = part.charAt(0);
        if ('XYZIJKFSP'.includes(letter)) {
            const value = parseFloat(part.substring(1));
            result.params[letter.toLowerCase()] = value;
        }
    });

    // Calculate endPosition based on the newState (which reflects G90/G91 changes)
    // and update the position in newState if a move occurred.
    if (result.isMoveCommand) {
        const currentX = previousState.x;
        const currentY = previousState.y;
        const currentZ = previousState.z;

        let targetX = currentX;
        let targetY = currentY;
        let targetZ = currentZ;

        if (newState.relative) { // Use newState.relative here
            if (result.params.x !== undefined) targetX += result.params.x;
            if (result.params.y !== undefined) targetY += result.params.y;
            if (result.params.z !== undefined) targetZ += result.params.z;
        } else { // Absolute mode
            if (result.params.x !== undefined) targetX = result.params.x;
            if (result.params.y !== undefined) targetY = result.params.y;
            if (result.params.z !== undefined) targetZ = result.params.z;
        }

        result.endPosition = { x: targetX, y: targetY, z: targetZ };

        // If the position changed, we need a new state object to reflect the new coordinates
        if (targetX !== currentX || targetY !== currentY || targetZ !== currentZ) {
            if (newState === previousState) { // If newState was just a reference, make it a copy now
                newState = { ...previousState };
            }
            newState.x = targetX;
            newState.y = targetY;
            newState.z = targetZ;
        }
    }

    result.state = newState; // Assign the final state for this line

    return result;
}

/**
 * Parses a multi-line G-code string.
 * @param {string} gcode - The full G-code string.
 * @returns {Array<object>} - An array of parsed line objects.
 */
function parseGcode(gcode) {
    const lines = gcode.split('\n');
    const parsedLines = [];

    // Initial state for the first line
    let currentState = { x: 0, y: 0, z: 0, relative: false, arcCenterRelative: true };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const parsedLine = parseLine(line, i + 1, currentState);
        parsedLines.push(parsedLine);
        currentState = parsedLine.state; // The state after this line becomes the current state for the next
    }

    return parsedLines;
}

/**
 * Reparses G-code from a specific line number onwards and updates the existing parsed data.
 * Stops propagation early if the machine state and position stabilize.
 * @param {Array<object>} existingParsedData - The array of already parsed line objects.
 * @param {string[]} newRawLines - The new raw lines of G-code (full document).
 * @param {number} startLineNumber - The 1-based line number from which to start re-parsing.
 * @returns {Array<object>} - The updated array of parsed line objects.
 */
function reparseFromLine(existingParsedData, newRawLines, startLineNumber) {
    // Keep unchanged lines before the start of the change.
    const updatedParsedData = existingParsedData.slice(0, startLineNumber - 1);

    let currentState;
    if (startLineNumber > 1) {
        // Get the state from the line just before the change.
        // A deep copy is used to prevent any potential mutation of the original state object.
        currentState = JSON.parse(JSON.stringify(existingParsedData[startLineNumber - 2].state));
    } else {
        // If the change is on the first line, start with the initial state.
        currentState = { x: 0, y: 0, z: 0, relative: false, arcCenterRelative: true };
    }

    // Re-parse all subsequent lines from the point of change to the end of the file.
    for (let i = startLineNumber - 1; i < newRawLines.length; i++) {
        const line = newRawLines[i];
        const newParsedLine = parseLine(line, i + 1, currentState);
        updatedParsedData.push(newParsedLine);
        currentState = newParsedLine.state; // Propagate the state to the next line.
    }

    return updatedParsedData;
}


module.exports = {
    parseLine,
    parseGcode,
    reparseFromLine,
    areStatesEqual, // Export for potential testing/debugging
    arePositionsEqual // Export for potential testing/debugging
};