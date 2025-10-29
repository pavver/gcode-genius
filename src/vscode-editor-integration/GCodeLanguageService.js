/**
 * A stateless service that provides language-related operations
 * like validation and fixing, based on the G-code parser components.
 */
export class GCodeLanguageService {
  #validator;
  #fixer;

  constructor(validator, fixer) {
    this.#validator = validator;
    this.#fixer = fixer;
  }

  validate(tokens) {
    if (!this.#validator) return [];
    return this.#validator.getDiagnostics(tokens);
  }

  getFix(error, tokens) {
    // TODO: Implement fix logic using this.#fixer
    return null; // Return a workspace edit or similar
  }
}
