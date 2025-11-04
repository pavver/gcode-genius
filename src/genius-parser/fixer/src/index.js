
const fixableErrors = new Set([
  'warning.invalid_spacing_between_tokens',
  'warning.lowercase_letter',
  'warning.leading_zeros_in_parameter',
  'warning.trailing_zeros_in_parameter',
  'warning.extra_zero_in_command',
  'warning.missing_leading_zero',
  'warning.missing_trailing_zero',
  'warning.invalid_spacing_before_comment',
  'warning.invalid_spacing_between_flags',
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

  const { start, end, message } = diagnostic;

  switch (message) {
    case 'warning.invalid_spacing_between_tokens':
      return gcodeLine.slice(0, start) + ' ' + gcodeLine.slice(end);
    case 'warning.lowercase_letter':
      return gcodeLine.slice(0, start) + gcodeLine.slice(start, end).toUpperCase() + gcodeLine.slice(end);
    case 'warning.leading_zeros_in_parameter':
    case 'warning.extra_zero_in_command':
      return gcodeLine.slice(0, start) + gcodeLine.slice(end);
    case 'warning.trailing_zeros_in_parameter':
        return gcodeLine.slice(0, start) + gcodeLine.slice(end);
    case 'warning.missing_leading_zero':
      return gcodeLine.slice(0, start) + '0' + gcodeLine.slice(start);
    case 'warning.missing_trailing_zero':
      return gcodeLine.slice(0, end) + '0' + gcodeLine.slice(end);
    case 'warning.invalid_spacing_before_comment':
      return gcodeLine.slice(0, start) + ' ' + gcodeLine.slice(start);
    case 'warning.invalid_spacing_between_flags':
      return gcodeLine.slice(0, start) + ' ' + gcodeLine.slice(end);
    default:
      return gcodeLine;
  }
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
