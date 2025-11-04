
import { Diagnostic, Severity } from './diagnostic.js';

// Helper function to calculate the length of a token based on its components
function getTokenLength(token) {
  const letter = token.letter ? token.letter.length : 0;
  const value = token.value ? token.value.length : 0;
  return letter + value;
}

export function validateSyntax(tokens) {
  const diagnostics = [];

  // Rule 1: Spacing Check
  for (let i = 0; i < tokens.length - 1; i++) {
    const currentToken = tokens[i];
    const nextToken = tokens[i + 1];

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
    // Rule 5: ERROR token
    if (token.type === 'ERROR') {
      diagnostics.push(new Diagnostic(Severity.Error, 'error.wrong_token', token.startOffset, token.startOffset + getTokenLength(token)));
      continue;
    }

    // Rule 2: Uppercase Letter
    if (token.letter && token.letter.toUpperCase() !== token.letter) {
      diagnostics.push(new Diagnostic(Severity.Warning, 'warning.lowercase_letter', token.startOffset, token.startOffset + 1));
    }

    if (token.value === null) continue;

    const isCommand = token.type === 'COMMAND';
    const hasDecimal = token.value.includes('.');
    const letterOffset = token.letter ? token.letter.length : 0;

    if (!hasDecimal) {
      // Rule 3: Leading Zeros (Integers)
      if (token.value.length > 1 && token.value.startsWith('0')) {
        const firstDigitMatch = /[1-9]/.exec(token.value);
        const firstDigitIndex = firstDigitMatch ? firstDigitMatch.index : token.value.length;

        if (firstDigitIndex > 0) {
          const startPos = token.startOffset + letterOffset;
          const endPos = startPos + firstDigitIndex;
          const message = isCommand ? 'warning.extra_zero_in_command' : 'warning.leading_zeros_in_parameter';
          diagnostics.push(new Diagnostic(Severity.Warning, message, startPos, endPos));
        }
      }
    } else {
      // Rule 4: Floating Point Zeros
      const parts = token.value.split('.');
      const integerPart = parts[0];
      const fractionalPart = parts[1];

      if (integerPart.length === 0) {
        diagnostics.push(new Diagnostic(Severity.Warning, 'warning.missing_leading_zero', token.startOffset + letterOffset, token.startOffset + letterOffset + 1));
      }

      if (fractionalPart.length === 0) {
        diagnostics.push(new Diagnostic(Severity.Warning, 'warning.missing_trailing_zero', token.startOffset + letterOffset + (integerPart.length || 0), token.startOffset + letterOffset + (integerPart.length || 0) + 1));
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