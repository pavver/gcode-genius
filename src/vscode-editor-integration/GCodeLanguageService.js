import { validateSyntax } from '../genius-parser/validator/src/syntax-validator.js';
import { canFix, fixError, fixAllErrors } from '../genius-parser/fixer/src/index.js';

/**
 * A stateless service that provides language-related operations
 * like validation, based on the G-code parser components.
 */
export class GCodeLanguageService {
  /**
   * @param {Array} tokens An array of tokens for a single line.
   * @returns {Array} An array of diagnostic objects.
   */
  getSyntaxDiagnostics(tokens) {
    return validateSyntax(tokens);
  }

  /**
   * @param {object} diagnostic The diagnostic to check.
   * @returns {boolean} Whether the diagnostic can be fixed.
   */
  canFix(diagnostic) {
    return canFix(diagnostic);
  }

  /**
   * @param {object} diagnostic The diagnostic to fix.
   * @param {string} line The line to fix.
   * @returns {string} The fixed line.
   */
  getFix(diagnostic, line) {
    return fixError(line, diagnostic);
  }

  /**
   * @param {object[]} diagnostics The diagnostics to fix.
   * @param {string} line The line to fix.
   * @returns {string} The fixed line.
   */
  getFixAll(diagnostics, line) {
    return fixAllErrors(line, diagnostics);
  }
}
