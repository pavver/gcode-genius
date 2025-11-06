
import { Diagnostic, Severity } from './diagnostic.js';

// Helper function to calculate the length of a token based on its components
function getTokenLength(token) {
  const letter = token.letter ? token.letter.length : 0;
  const value = token.value ? token.value.length : 0;
  return letter + value;
}

export function validateSyntax(tokens) {
  const diagnostics = [];
  let commandCount = 0;
  // Rule: Leading whitespace
  if (tokens.length > 0 && tokens[0].type !== 'TRAILING_WHITESPACE' && tokens[0].startOffset > 0) {
    diagnostics.push(new Diagnostic(Severity.Warning, 'warning.leading_whitespace', 0, tokens[0].startOffset));
  }

  // Rule: Multiple commands on one line
  for (const token of tokens) {
    if (token.type === 'COMMAND') {
      commandCount++;
      if (commandCount > 1) {
        diagnostics.push(new Diagnostic(Severity.Warning, 'warning.multiple_commands_on_line', token.startOffset, token.startOffset + getTokenLength(token)));
      }
    }
  }

  // Rule 1: Spacing Check
  for (let i = 0; i < tokens.length - 1; i++) {
    const currentToken = tokens[i];
    const nextToken = tokens[i + 1];

    // If nextToken is TRAILING_WHITESPACE, we should skip this spacing check.
    if (nextToken.type === 'TRAILING_WHITESPACE') {
        continue; // Don't check spacing before trailing whitespace
    }

    const currentTokenEnd = currentToken.startOffset + getTokenLength(currentToken);
    const spaceBetween = nextToken.startOffset - currentTokenEnd;

    const areConsecutiveFlags = 
      currentToken.type === 'PARAMETER' && currentToken.value === null &&
      nextToken.type === 'PARAMETER' && nextToken.value === null;

    if (areConsecutiveFlags) {
      if (spaceBetween > 1) {
        diagnostics.push(new Diagnostic(Severity.Warning, 'warning.invalid_spacing_between_flags', currentTokenEnd, nextToken.startOffset));
      }
    } else if (i === tokens.length - 2 && nextToken.type === 'COMMENT') {
      if (spaceBetween < 1) {
        diagnostics.push(new Diagnostic(Severity.Warning, 'warning.invalid_spacing_before_comment', currentTokenEnd, nextToken.startOffset));
      }
    } else {
      if (spaceBetween !== 1) {
        diagnostics.push(new Diagnostic(Severity.Warning, 'warning.invalid_spacing_between_tokens', currentTokenEnd, nextToken.startOffset));
      }
    }
  }

  for (const token of tokens) {
    // Rule: Trailing whitespace
    if (token.type === 'TRAILING_WHITESPACE') {
      diagnostics.push(new Diagnostic(Severity.Warning, 'warning.trailing_whitespace', token.startOffset, token.startOffset + token.value.length));
      continue; // No other checks needed for this token
    }

    // Rule 5: ERROR token
    if (token.type === 'ERROR') {
      diagnostics.push(new Diagnostic(Severity.Error, 'error.wrong_token', token.startOffset, token.startOffset + getTokenLength(token)));
      continue;
    }

    if(token.type === 'COMMENT')
      continue;

    // Rule 2: Uppercase Letter
    if (token.letter && token.letter.toUpperCase() !== token.letter) {
      diagnostics.push(new Diagnostic(Severity.Warning, 'warning.lowercase_letter', token.startOffset, token.startOffset + 1));
    }

    if (token.value === null) continue;

    const isCommand = token.type === 'COMMAND';
    const hasDecimal = token.value.includes('.');
    const hasComma = token.value.includes(',');
    const letterOffset = token.letter ? token.letter.length : 0;

    if (hasComma) {
        const commaIndex = token.value.indexOf(',');
        const startPos = token.startOffset + letterOffset + commaIndex;
        diagnostics.push(new Diagnostic(Severity.Error, 'error.comma_as_decimal_separator', startPos, startPos + 1));
    }

    if (!hasDecimal && !hasComma) {
      // Rule 3: Leading Zeros (Integers)
      if (token.value.length > 1 && token.value.startsWith('0')) {
        const firstDigitMatch = /[1-9]/.exec(token.value);
        let firstDigitIndex = firstDigitMatch ? firstDigitMatch.index : token.value.length;

        // If the value is all zeros (like "00"), we want to keep one zero.
        // So, the "extra" part is all but the last zero.
        if (!firstDigitMatch && token.value.length > 1) {
          firstDigitIndex = token.value.length - 1;
        }

        if (firstDigitIndex > 0) {
          const startPos = token.startOffset + letterOffset;
          const endPos = startPos + firstDigitIndex;
          const message = isCommand ? 'warning.extra_zero_in_command' : 'warning.leading_zeros_in_parameter';
          diagnostics.push(new Diagnostic(Severity.Warning, message, startPos, endPos));
        }
      }
    } else {
      // Rule 4: Floating Point Zeros
      const parts = token.value.replace(',', '.').split('.');
      const integerPart = parts[0];
      const fractionalPart = parts[1];

      if (integerPart.length === 0) {
        diagnostics.push(new Diagnostic(Severity.Warning, 'warning.missing_leading_zero', token.startOffset + letterOffset, token.startOffset + letterOffset + 1));
      }

      if (fractionalPart.length === 0) {
        const startPos = token.startOffset + getTokenLength(token);
        diagnostics.push(new Diagnostic(Severity.Warning, 'warning.missing_trailing_zero', startPos, startPos));
      }

      if (integerPart.length > 1 && integerPart.startsWith('0')) {
        const firstDigitMatch = /[1-9]/.exec(integerPart);
        const firstDigitIndex = firstDigitMatch ? firstDigitMatch.index : integerPart.length;
        if (firstDigitIndex > 0) {
          const startPos = token.startOffset + letterOffset;
          const endPos = startPos + firstDigitIndex;
          diagnostics.push(new Diagnostic(Severity.Warning, 'warning.leading_zeros_in_parameter', startPos, endPos));
        }
      }

            if (fractionalPart.length > 1 && fractionalPart.endsWith('0')) {
              const reversedFractional = fractionalPart.split('').reverse().join('');
              const lastDigitMatch = /[1-9]/.exec(reversedFractional);
              
              let trailingZerosCount = 0;
              if (lastDigitMatch) {
                  trailingZerosCount = lastDigitMatch.index;
              } else {
                  trailingZerosCount = fractionalPart.length - 1;
              }
      
              if (trailingZerosCount > 0) {
                  const endPos = token.startOffset + getTokenLength(token);
                  const startPos = endPos - trailingZerosCount;
                  diagnostics.push(new Diagnostic(Severity.Warning, 'warning.trailing_zeros_in_parameter', startPos, endPos));
              }
            }    }
  }

  return diagnostics;
}