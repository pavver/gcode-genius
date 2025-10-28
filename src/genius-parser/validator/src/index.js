class Diagnostic {
  constructor(severity, message, start, end) {
    this.severity = severity;
    this.message = message;
    this.start = start;
    this.end = end;
  }
}

export class Validator {
  constructor(gcodeDatabase) {
    this.gcodeDatabase = gcodeDatabase;
    this.commandDefs = new Map((gcodeDatabase.commands || []).map(cmd => [cmd.code, cmd]));
  }

  getDiagnostics(tokens) {
    const syntaxDiagnostics = this._checkSyntax(tokens);
    const commandDiagnostics = this._parseAndValidateCommands(tokens);

    return [...syntaxDiagnostics, ...commandDiagnostics];
  }

  isTokenValid(token, diagnostics) {
    if (token.type === 'COMMENT') {
      return false;
    }

    const errorDiagnostics = diagnostics.filter(d => d.severity === 'error');

    for (const diagnostic of errorDiagnostics) {
      if (token.startOffset < diagnostic.end && token.endOffset > diagnostic.start) {
        return false;
      }
    }

    return true;
  }

  _checkSyntax(tokens) {
    const diagnostics = [];

    // Spacing Check
    for (let i = 0; i < tokens.length - 1; i++) {
      const currentToken = tokens[i];
      const nextToken = tokens[i + 1];

      const spaceBetween = nextToken.startOffset - currentToken.endOffset;

      if (nextToken.type === 'COMMENT' && i === tokens.length - 2) {
        if (spaceBetween < 1) {
          diagnostics.push(new Diagnostic('warning', 'warning.invalid_spacing_between_tokens', currentToken.endOffset, nextToken.startOffset));
        }
      } else {
        if (spaceBetween !== 1) {
          diagnostics.push(new Diagnostic('warning', 'warning.invalid_spacing_between_tokens', currentToken.endOffset, nextToken.startOffset));
        }
      }
    }

    for (const token of tokens) {
      // Wrong token type check
      if (token.type === 'ERROR') {
        diagnostics.push(new Diagnostic('error', 'error.wrong_token', token.startOffset, token.endOffset));
        continue;
      }

      // Lowercase Check
      if (token.isLowercase) {
        diagnostics.push(new Diagnostic('warning', 'warning.lowercase_letter', token.startOffset, token.startOffset + 1));
      }

      // Extra Zeros Check
      if (token.type.startsWith('COMMAND_')) {
        if (token.value.length < token.endOffset - token.startOffset) {
          diagnostics.push(new Diagnostic('warning', 'warning.extra_zero_in_command', token.startOffset + 1, token.endOffset - 1));
        }
      }

      // Check for extra zeros after the decimal point
      if (token.type === 'PARAMETER') {
        const length = token.value.toString().length + 1;
        if (length < (token.endOffset - token.startOffset)) {
          diagnostics.push(new Diagnostic('warning', 'warning.extra_zero_in_parameter', token.startOffset + length, token.endOffset));
        }
      }
    }

    return diagnostics;
  }

  _parseAndValidateCommands(tokens) {
    const diagnostics = [];
    let currentCommand = null;

    const flushCommand = () => {
      if (currentCommand) {
        diagnostics.push(...this._validateCommandFromDb(currentCommand));
        currentCommand = null;
      }
    };

    for (const token of tokens) {
      if (token.type.startsWith('COMMAND_')) {
        flushCommand(); // Validate the previous command before starting a new one
        currentCommand = {
          command: token.value,
          parameters: {},
          start: token.startOffset,
          end: token.endOffset
        };
      } else if (token.type === 'PARAMETER' && currentCommand) {
        currentCommand.parameters[token.letter] = token.value;
        currentCommand.end = token.endOffset; // Extend the command's end position
      } else if (token.type === 'COMMENT') {
        flushCommand(); // Comments terminate a command
      }
    }

    flushCommand(); // Validate the last command in the line

    return diagnostics;
  }

  _validateCommandFromDb(command) {
    const diagnostics = [];
    const commandDef = this.commandDefs.get(command.command);

    if (!commandDef) {
      diagnostics.push(new Diagnostic('error', 'error.unknown_command', command.start, command.end));
      return diagnostics;
    }

    let effectiveCommandDef = commandDef;
    if (commandDef.variants) {
      const commandParamsSet = new Set(Object.keys(command.parameters));
      const matchingVariant = commandDef.variants.find(variant => {
        const requiredParams = new Set(variant.parameters.filter(p => p.required).map(p => p.name));
        return Array.from(requiredParams).every(p => commandParamsSet.has(p));
      });

      if (matchingVariant) {
        effectiveCommandDef = { ...commandDef, ...matchingVariant, parameters: matchingVariant.parameters, constraints: matchingVariant.constraints };
      } else {
         // It's possible no variant matches, in which case we might use base command rules or fail
         // For now, we'll proceed with the base definition if no variant is a clear match
      }
    }

    const paramDefs = new Map(effectiveCommandDef.parameters.map(p => [p.name, p]));

    for (const paramName in command.parameters) {
      const paramValue = command.parameters[paramName];
      const paramDef = paramDefs.get(paramName);

      if (!paramDef) {
        diagnostics.push(new Diagnostic('error', 'error.unknown_parameter', command.start, command.end));
        continue;
      }

      if (paramDef.type === 'integer' && !Number.isInteger(paramValue)) {
        diagnostics.push(new Diagnostic('error', 'error.invalid_parameter_type', command.start, command.end));
      } else if (paramDef.type === 'float' && typeof paramValue !== 'number') {
        diagnostics.push(new Diagnostic('error', 'error.invalid_parameter_type', command.start, command.end));
      }

      if (paramDef.min_value !== undefined && paramValue < paramDef.min_value) {
        diagnostics.push(new Diagnostic('error', 'error.value_out_of_range', command.start, command.end));
      }
      if (paramDef.max_value !== undefined && paramValue > paramDef.max_value) {
        diagnostics.push(new Diagnostic('error', 'error.value_out_of_range', command.start, command.end));
      }

      if (paramDef.allowed_values && !paramDef.allowed_values.includes(paramValue)) {
        diagnostics.push(new Diagnostic('error', 'error.value_not_allowed', command.start, command.end));
      }
    }

    for (const [paramName, paramDef] of paramDefs.entries()) {
      if (paramDef.required && command.parameters[paramName] === undefined) {
        diagnostics.push(new Diagnostic('error', 'error.missing_required_parameter', command.start, command.end));
      }
    }

    if (effectiveCommandDef.constraints) {
      diagnostics.push(...this._validateConstraints(command, effectiveCommandDef));
    }

    return diagnostics;
  }

  _validateConstraints(command, commandDef) {
    const diagnostics = [];
    const commandParams = Object.keys(command.parameters);

    for (const constraint of commandDef.constraints) {
      switch (constraint.rule) {
        case 'no_parameters':
          if (commandParams.length > 0) {
            diagnostics.push(new Diagnostic('error', 'error.no_parameters_allowed', command.start, command.end));
          }
          break;
        case 'at_least_one_axis':
          if (!constraint.params.some(p => commandParams.includes(p))) {
            diagnostics.push(new Diagnostic('error', 'error.at_least_one_axis_required', command.start, command.end));
          }
          break;
        case 'require_one':
          if (!constraint.params.some(p => commandParams.includes(p))) {
            diagnostics.push(new Diagnostic('error', 'error.require_one_parameter', command.start, command.end));
          }
          break;
        case 'all_required':
          if (!constraint.params.every(p => commandParams.includes(p))) {
            diagnostics.push(new Diagnostic('error', 'error.all_parameters_required', command.start, command.end));
          }
          break;
        case 'mutually_exclusive':
          if (constraint.params.filter(p => commandParams.includes(p)).length > 1) {
            diagnostics.push(new Diagnostic('error', 'error.mutually_exclusive_parameters', command.start, command.end));
          }
          break;
        case 'require_one_group':
          if (!constraint.groups.some(group => group.every(p => commandParams.includes(p)))) {
            diagnostics.push(new Diagnostic('error', 'error.parameter_group_missing', command.start, command.end));
          }
          break;
        case 'valid_relationship': {
          const condition = constraint.condition.trim();
          const parts = condition.split(/([>|<|=]+)/).map(p => p.trim());
          if (parts.length === 3) {
            const [paramA, operator, paramB] = parts;
            if (command.parameters[paramA] !== undefined && command.parameters[paramB] !== undefined) {
              const valA = command.parameters[paramA];
              const valB = command.parameters[paramB];
              if (operator === '>' && !(valA > valB)) {
                diagnostics.push(new Diagnostic('error', 'error.invalid_parameter_relationship', command.start, command.end));
              }
              // Add other operators as needed
            }
          }
          break;
        }
        case 'positive':
          for (const paramName of constraint.params) {
            if (command.parameters[paramName] !== undefined && command.parameters[paramName] <= 0) {
              diagnostics.push(new Diagnostic('error', 'error.parameter_must_be_positive', command.start, command.end));
            }
          }
          break;
      }
    }

    return diagnostics;
  }
}
