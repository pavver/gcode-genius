class Token {
  constructor(type, letter, value, startOffset) {
    this.type = type;
    this.letter = letter;
    this.value = value;
    this.startOffset = startOffset;
  }
}

export default function tokenize(line) {
  const tokens = [];

  const patterns = {
    whitespace: /^\s+/,
    commentSemicolon: /^;.*/,
    commentParen: /^\(.*?\)/,
    lineNumber: /^N\d+/i,
    command: /^[GMT]\d*\.?\d+/i,
    parameterWithValue: /^[A-Z][-+]?(?:\d+\.?\d*|\.\d+)/i,
    parameterAsFlag: /^[A-Z]/i
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
      tokens.push(new Token('COMMENT', null, fullMatch, position, position));
      position += fullMatch.length;
      matched = true;
      continue;
    }

    // 3. Comment (parentheses)
    match = remaining.match(patterns.commentParen);
    if (match) {
      const fullMatch = match[0];
      tokens.push(new Token('COMMENT', null, fullMatch, position, position));
      position += fullMatch.length;
      matched = true;
      continue;
    }

    // 4. Line Number
    match = remaining.match(patterns.lineNumber);
    if (match) {
      const fullMatch = match[0];
      const token = new Token('LINE_NUMBER', fullMatch[0], fullMatch.substring(1), position);
      tokens.push(token);
      position += fullMatch.length;
      matched = true;
      continue;
    }

    // 5. Command
    match = remaining.match(patterns.command);
    if (match) {
      const fullMatch = match[0];
      const token = new Token('COMMAND', fullMatch[0], fullMatch.substring(1), position);
      tokens.push(token);
      position += fullMatch.length;
      matched = true;
      continue;
    }

    // 6. Parameter with Value
    match = remaining.match(patterns.parameterWithValue);
    if (match) {
      const fullMatch = match[0];
      const token = new Token('PARAMETER', fullMatch[0], fullMatch.substring(1), position);
      tokens.push(token);
      position += fullMatch.length;
      matched = true;
      continue;
    }

    // 7. Parameter as Flag
    match = remaining.match(patterns.parameterAsFlag);
    if (match) {
      const fullMatch = match[0];
      const token = new Token('PARAMETER', fullMatch[0], null, position);
      tokens.push(token);
      position += fullMatch.length;
      matched = true;
      continue;
    }

    // 8. Error
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
      tokens.push(new Token('ERROR', null, errorStr, position));
      position = errorEnd;
    }
  }

  return tokens;
}
