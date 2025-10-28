
import { EventEmitter } from 'events';

/**
 * Manages the tokenized state of multiple G-code documents.
 * It handles opening, closing, and modifying documents, emitting events on any change.
 * This class is the single source of truth for the state of all open G-code files.
 */
export class DocumentStateManager extends EventEmitter {
  #tokenizer;
  #documents = new Map();

  /**
   * @param {object} tokenizer An instance of the tokenizer component.
   */
  constructor(tokenizer) {
    super();
    if (!tokenizer || typeof tokenizer.tokenize !== 'function') {
      throw new Error('A valid tokenizer instance must be provided.');
    }
    this.#tokenizer = tokenizer;
  }

  /**
   * Opens a new document, tokenizes its content, and adds it to the manager.
   * @param {string} filePath The unique identifier for the file.
   * @param {string} content The initial content of the file.
   */
  openFile(filePath, content) {
    if (this.#documents.has(filePath)) {
      console.warn(`File ${filePath} is already open.`);
      return;
    }

    const lines = content.split(/\r?\n/);
    const tokenizedLines = lines.map(line => this.#tokenizer.tokenize(line));
    
    this.#documents.set(filePath, { lines: tokenizedLines });
    this.emit('file:opened', { filePath });
  }

  /**
   * Closes a document and removes it from the manager.
   * @param {string} filePath The identifier for the file to close.
   */
  closeFile(filePath) {
    if (!this.#documents.has(filePath)) {
      console.warn(`Attempted to close a file that was not open: ${filePath}`);
      return;
    }

    this.#documents.delete(filePath);
    this.emit('file:closed', { filePath });
  }

  /**
   * Updates a single line in a specified document.
   * @param {string} filePath The identifier for the file.
   * @param {number} lineNumber The 0-based index of the line to update.
   * @param {string} newText The new text of the line.
   */
  updateLine(filePath, lineNumber, newText) {
    const document = this.#documents.get(filePath);
    if (!document) {
      console.warn(`Attempted to update a line in a non-existent document: ${filePath}`);
      return;
    }

    const newTokens = this.#tokenizer.tokenize(newText);
    document.lines[lineNumber] = newTokens;

    this.emit('line:updated', { filePath, lineNumber, newTokens });
  }

  /**
   * Inserts a new line into a specified document.
   * @param {string} filePath The identifier for the file.
   * @param {number} lineNumber The 0-based index at which to insert the new line.
   * @param {string} newText The text of the line to insert.
   */
  insertLine(filePath, lineNumber, newText) {
    const document = this.#documents.get(filePath);
    if (!document) {
      console.warn(`Attempted to insert a line in a non-existent document: ${filePath}`);
      return;
    }

    const newTokens = this.#tokenizer.tokenize(newText);
    document.lines.splice(lineNumber, 0, newTokens);

    this.emit('line:added', { filePath, lineNumber, newTokens });
  }

  /**
   * Deletes a line from a specified document.
   * @param {string} filePath The identifier for the file.
   * @param {number} lineNumber The 0-based index of the line to delete.
   */
  deleteLine(filePath, lineNumber) {
    const document = this.#documents.get(filePath);
    if (!document) {
      console.warn(`Attempted to delete a line from a non-existent document: ${filePath}`);
      return;
    }

    document.lines.splice(lineNumber, 1);
    this.emit('line:deleted', { filePath, lineNumber });
  }

  /**
   * Retrieves the tokenized state of a specific document.
   * @param {string} filePath The identifier for the file.
   * @returns {object | undefined} The document's state object or undefined if not found.
   */
  getDocumentState(filePath) {
    return this.#documents.get(filePath);
  }

  /**
   * Retrieves the tokens for a specific line in a document.
   * @param {string} filePath The identifier for the file.
   * @param {number} lineNumber The 0-based index of the line.
   * @returns {Array | undefined} The array of tokens for the line or undefined.
   */
  getLineTokens(filePath, lineNumber) {
    const document = this.#documents.get(filePath);
    return document?.lines[lineNumber];
  }
}
