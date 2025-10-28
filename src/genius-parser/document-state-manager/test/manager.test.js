import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DocumentStateManager } from '../src/index.js';

// Mock tokenizer to isolate tests from the real tokenizer
const mockTokenizer = {
  tokenize: (text) => text.split(' ').map(word => ({ text: word }))
};

describe('DocumentStateManager', () => {
  let manager;

  beforeEach(() => {
    // We create a new instance of the manager before each test
    manager = new DocumentStateManager(mockTokenizer);
  });

  it('should throw an error if no tokenizer is provided', () => {
    expect(() => new DocumentStateManager()).toThrow('A valid tokenizer instance must be provided.');
  });

  it('should open a file and store its tokenized state', () => {
    const filePath = 'test.nc';
    const content = 'G0 X10\nG1 Y20';
    manager.openFile(filePath, content);

    const state = manager.getDocumentState(filePath);
    expect(state).toBeDefined();
    expect(state.lines).toHaveLength(2);
    expect(state.lines[0]).toEqual([{ text: 'G0' }, { text: 'X10' }]);
    expect(state.lines[1]).toEqual([{ text: 'G1' }, { text: 'Y20' }]);
  });

  it("should emit 'file:opened' event on opening a file", () => {
    const listener = jest.fn();
    manager.on('file:opened', listener);

    manager.openFile('test.nc', 'G0 X0');

    expect(listener).toHaveBeenCalledWith({ filePath: 'test.nc' });
  });

  it("should update a line and emit 'line:updated' event", () => {
    const filePath = 'test.nc';
    const listener = jest.fn();
    manager.on('line:updated', listener);

    manager.openFile(filePath, 'G0 X10\nG1 Y20');
    manager.updateLine(filePath, 0, 'G0 Z5');

    const state = manager.getDocumentState(filePath);
    const expectedTokens = [{ text: 'G0' }, { text: 'Z5' }];

    expect(state.lines[0]).toEqual(expectedTokens);
    expect(listener).toHaveBeenCalledWith({
      filePath: filePath,
      lineNumber: 0,
      newTokens: expectedTokens
    });
  });

  it("should close a file and remove its state", () => {
    const filePath = 'test.nc';
    const listener = jest.fn();
    manager.on('file:closed', listener);

    manager.openFile(filePath, 'G0 X10');
    let state = manager.getDocumentState(filePath);
    expect(state).toBeDefined();

    manager.closeFile(filePath);
    state = manager.getDocumentState(filePath);
    expect(state).toBeUndefined();
    expect(listener).toHaveBeenCalledWith({ filePath: filePath });
  });
});
