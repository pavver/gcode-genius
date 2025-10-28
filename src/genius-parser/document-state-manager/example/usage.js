import { DocumentStateManager } from '../src/index.js';

// For example, let's create a simple mock tokenizer.
// The actual tokenizer will be imported from '../tokenizer/src/index.js'
const mockTokenizer = {
  tokenize: (text) => {
    // This simple logic just breaks the string into words (tokens)
    return text.split(' ').map(word => ({ type: 'WORD', value: word }));
  }
};

console.log('--- Creating DocumentStateManager ---');
const manager = new DocumentStateManager(mockTokenizer);

// Let's set up event listeners to see what's happening inside the manager
manager.on('file:opened', ({ filePath }) => {
  console.log(`EVENT: File opened: ${filePath}`);
});

manager.on('file:closed', ({ filePath }) => {
  console.log(`EVENT: File closed: ${filePath}`);
});

manager.on('line:added', ({ filePath, lineNumber, newTokens }) => {
  console.log(`EVENT: Line ${lineNumber} added in ${filePath}. Tokens:`, newTokens);
});

manager.on('line:updated', ({ filePath, lineNumber, newTokens }) => {
  console.log(`EVENT: Line ${lineNumber} updated in ${filePath}. Tokens:`, newTokens);
});

manager.on('line:deleted', ({ filePath, lineNumber }) => {
  console.log(`EVENT: Line ${lineNumber} deleted in ${filePath}.`);
});


// --- We start work ---
const myFilePath = 'C:/gcode/test.nc';
const initialContent = 'G0 X10 Y10\nG1 Z5 F500';

console.log(`\n1. Opening file: ${myFilePath}`);
manager.openFile(myFilePath, initialContent);

let state = manager.getDocumentState(myFilePath);
console.log('Current state:', JSON.stringify(state, null, 2));

console.log('\n2. Updating line 0');
manager.updateLine(myFilePath, 0, 'G0 X20 Y20');

console.log('\n3. Inserting line 2');
manager.insertLine(myFilePath, 2, 'M3 S1000');

state = manager.getDocumentState(myFilePath);
console.log('Current state:', JSON.stringify(state, null, 2));

console.log('\n4. Deleting line 1');
manager.deleteLine(myFilePath, 1);

console.log('\n5. Closing file');
manager.closeFile(myFilePath);

state = manager.getDocumentState(myFilePath);
console.log('State after closing:', state); // має бути undefined
