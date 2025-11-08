class Token {
  constructor(type, letter, value, startOffset) {
    this.type = type;
    this.letter = letter;
    this.value = value;
    this.startOffset = startOffset;
  }
}

/**
 * Normalizes a single token according to a set of rules.
 * @param {Token} token The input token.
 * @returns {Token} The normalized token.
 */
export default function normalizeToken(token) {
  let newLetter = token.letter;
  let newValue = token.value;
  let hasChanged = false;

  // Rule 1: Uppercase letter
  if (token.letter && token.letter.toLowerCase() === token.letter) {
    newLetter = token.letter.toUpperCase();
    hasChanged = true;
  }

  // Rule 2: Normalize numeric value for COMMAND and PARAMETER types
  if ((token.type === 'COMMAND' || token.type === 'PARAMETER') && token.value) {
    let value = token.value.replace(',', '.');
    if(value !== token.value)
      hasChanged = true;

    if (value === '.') {
      newValue = '0';
      hasChanged = true;
    } else if (value.startsWith('.')) {
      newValue = '0' + value;
      hasChanged = true;
    } else if (value.endsWith('.')) {
      newValue = value + '0';
      hasChanged = true;
    }
  }

  if (hasChanged) {
    return new Token(token.type, newLetter, newValue, token.startOffset);
  }

  return token;
}
