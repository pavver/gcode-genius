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
  const validFlags = new Set(['X', 'Y', 'Z', 'O']);

  const patterns = {
    whitespace: /^\s+/,
    commentSemicolon: /^;.*/,
    commentParen: /^\(.*?\)/,
    lineNumber: /^N\d+/i,
    command: /^[GMT]\d*\.?\d+/i,
    parameterWithValue: /^[A-Z][-+]?(?:\d+[.,]?\d*|[.,]\d*)/i,
    word: /^[A-Z]{2,}/i,
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
      tokens.push(new Token('COMMENT', null, fullMatch, position));
      position += fullMatch.length;
      matched = true;
      continue;
    }

    // 3. Comment (parentheses)
    match = remaining.match(patterns.commentParen);
    if (match) {
      const fullMatch = match[0];
      tokens.push(new Token('COMMENT', null, fullMatch, position));
      position += fullMatch.length;
      matched = true;
      continue;
    }

    // 4. Line Number
    match = remaining.match(patterns.lineNumber);
    if (match) {
      const fullMatch = match[0];
      tokens.push(new Token('LINE_NUMBER', fullMatch[0], fullMatch.substring(1), position));
      position += fullMatch.length;
      matched = true;
      continue;
    }

    // 5. Command
    match = remaining.match(patterns.command);
    if (match) {
      const fullMatch = match[0];
      tokens.push(new Token('COMMAND', fullMatch[0], fullMatch.substring(1), position));
      position += fullMatch.length;
      matched = true;
      continue;
    }

    // 6. Parameter with Value
    match = remaining.match(patterns.parameterWithValue);
    if (match) {
      const fullMatch = match[0];
      tokens.push(new Token('PARAMETER', fullMatch[0], fullMatch.substring(1), position));
      position += fullMatch.length;
      matched = true;
      continue;
    }

    // 7. Multi-letter word (potential flags or error)
    match = remaining.match(patterns.word);
    if (match) {
      const fullMatch = match[0];
      const chars = fullMatch.split('');
      const allCharsAreValidFlags = chars.every(char => validFlags.has(char.toUpperCase()));

      if (allCharsAreValidFlags) {
        // Create individual flag tokens
        for (let i = 0; i < chars.length; i++) {
          const char = chars[i];
          tokens.push(new Token('PARAMETER', char, null, position + i));
        }
      } else {
        // Create a single error token for the whole word
        tokens.push(new Token('ERROR', null, fullMatch, position));
      }

      position += fullMatch.length;
      matched = true;
      continue;
    }

    // 8. Single Parameter as Flag (or single-letter error)
    match = remaining.match(patterns.parameterAsFlag);
    if (match) {
      const fullMatch = match[0];
      if (validFlags.has(fullMatch.toUpperCase())) {
        tokens.push(new Token('PARAMETER', fullMatch, null, position));
      } else {
        tokens.push(new Token('ERROR', null, fullMatch, position));
      }
      position += fullMatch.length;
      matched = true;
      continue;
    }

    // 9. Error
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

  if (tokens.length === 0 && line.length > 0) {
    tokens.push(new Token('TRAILING_WHITESPACE', null, line, 0));
  }

  if (tokens.length > 0) {
    const lastToken = tokens[tokens.length - 1];
    const lastTokenEnd = lastToken.startOffset + (lastToken.letter ? lastToken.letter.length : 0) + (lastToken.value ? lastToken.value.length : 0);

    if (lastTokenEnd < line.length) {
      const trailingWhitespace = line.substring(lastTokenEnd);
      if (/^\s+$/.test(trailingWhitespace)) {
        tokens.push(new Token('TRAILING_WHITESPACE', null, trailingWhitespace, lastTokenEnd));
      }
    }
  }

  return tokens;
}
