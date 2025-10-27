class Token {
  constructor(type, value, startOffset, endOffset) {
    this.type = type;
    this.value = value;
    this.startOffset = startOffset;
    this.endOffset = endOffset;
    this.letter = null;
  }
}

export default function tokenize(line) {
  const tokens = [];

  const patterns = {
    whitespace: /^\s+/,
    commentSemicolon: /^;.*/,
    commentParen: /^\(.*?\)/,
    lineNumber: /^N\d+/i,
    command: /^[GMT]\d+(?:\.\d+)?/i,
    parameter: /^[A-Z][-+]?\d+(?:\.\d+)?/i
  };

  let position = 0;
  while (position < line.length) {
    const remaining = line.substring(position);
    let matched = false;

    // 1. Whitespace
    let match = remaining.match(patterns.whitespace);
    if (match) {
      position += match[0].length;
      matched = true;
      continue;
    }

    // 2. Comment (semicolon)
    match = remaining.match(patterns.commentSemicolon);
    if (match) {
      const fullMatch = match[0];
      tokens.push(new Token('COMMENT', fullMatch, position, position + fullMatch.length));
      position += fullMatch.length;
      matched = true;
      continue;
    }

    // 3. Comment (parentheses)
    match = remaining.match(patterns.commentParen);
    if (match) {
      const fullMatch = match[0];
      tokens.push(new Token('COMMENT', fullMatch, position, position + fullMatch.length));
      position += fullMatch.length;
      matched = true;
      continue;
    }

    // 4. Line Number
    match = remaining.match(patterns.lineNumber);
    if (match) {
      const fullMatch = match[0];
      const letter = fullMatch[0];
      const token = new Token('LINE_NUMBER', parseFloat(fullMatch.substring(1)), position, position + fullMatch.length);
      token.letter = letter.toUpperCase();
      if (letter !== letter.toUpperCase()) {
        token.isLowercase = true;
      }
      tokens.push(token);
      position += fullMatch.length;
      matched = true;
      continue;
    }

    // 5. Command
    match = remaining.match(patterns.command);
    if (match) {
      const fullMatch = match[0];
      const letter = fullMatch[0];
      const number = parseInt(fullMatch.substring(1), 10);
      const token = new Token(`COMMAND_${letter.toUpperCase()}`, `${letter.toUpperCase()}${number}`, position, position + fullMatch.length);
      if (letter !== letter.toUpperCase()) {
        token.isLowercase = true;
      }
      tokens.push(token);
      position += fullMatch.length;
      matched = true;
      continue;
    }

    // 6. Parameter
    match = remaining.match(patterns.parameter);
    if (match) {
      const fullMatch = match[0];
      const letter = fullMatch[0];
      const value = parseFloat(fullMatch.substring(1));
      const token = new Token('PARAMETER', value, position, position + fullMatch.length);
      token.letter = letter.toUpperCase();
      if (letter !== letter.toUpperCase()) {
        token.isLowercase = true;
      }
      tokens.push(token);
      position += fullMatch.length;
      matched = true;
      continue;
    }

    // 7. Error
    if (!matched) {
      let errorEnd = position + 1;
      while (errorEnd < line.length) {
        const nextChar = line[errorEnd];
        if (/\s/.test(nextChar) || /[NGMTABCDEFHIJKLPQRSUVWXYZ\(]/.test(nextChar)) {
          break;
        }
        errorEnd++;
      }

      const errorStr = line.substring(position, errorEnd);
      tokens.push(new Token('ERROR', errorStr, position, errorEnd));
      position = errorEnd;
    }
  }

  return tokens;
}
