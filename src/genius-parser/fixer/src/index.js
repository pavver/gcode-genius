
const fixableErrors = new Set([
  'warning.invalid_spacing_between_tokens'
]);

/**
 * Checks if a given diagnostic error can be automatically fixed.
 * @param {object} diagnostic - The diagnostic object from the validator.
 * @returns {boolean} - True if the error is fixable, false otherwise.
 */
function canFix(diagnostic) {
  return fixableErrors.has(diagnostic.message);
}

/**
 * Fixes a single error in a G-code line.
 * @param {string} gcodeLine - The raw G-code line.
 * @param {object} diagnostic - The diagnostic object.
 * @returns {string} - The corrected G-code line.
 */
function fixError(gcodeLine, diagnostic) {
  if (!canFix(diagnostic)) {
    return gcodeLine;
  }

  const { start, end } = diagnostic;

  if (diagnostic.message === 'warning.invalid_spacing_between_tokens') {
    return gcodeLine.slice(0, start) + ' ' + gcodeLine.slice(end);
  }

  return gcodeLine;
}

/**
 * Fixes all fixable errors in a G-code line.
 * @param {string} gcodeLine - The raw G-code line.
 * @param {object[]} diagnostics - An array of diagnostic objects.
 * @returns {string} - The corrected G-code line.
 */
function fixAllErrors(gcodeLine, diagnostics) {
  let correctedLine = gcodeLine;
  // Sort diagnostics by start position to avoid conflicts when modifying the line
  const sortedDiagnostics = [...diagnostics].sort((a, b) => b.start - a.start);

  for (const diagnostic of sortedDiagnostics) {
    if (canFix(diagnostic)) {
      correctedLine = fixError(correctedLine, diagnostic);
    }
  }

  return correctedLine;
}

export {
  canFix,
  fixError,
  fixAllErrors
};
