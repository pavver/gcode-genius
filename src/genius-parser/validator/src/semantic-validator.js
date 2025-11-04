import { Diagnostic, Severity } from './diagnostic.js';

export class SemanticValidator {
  constructor(gcodeDatabase) {
    this.gcodeDatabase = gcodeDatabase;
    this.commandDefs = new Map((gcodeDatabase.commands || []).map(cmd => [cmd.code, cmd]));
  }

  validateCommand(command) {
    if (!command) return [];

    const diagnostics = [];
    const commandDef = this.commandDefs.get(command[0].value);

    if (!commandDef) {
      diagnostics.push(new Diagnostic(Severity.Error, 'error.unknown_command', command[0].startOffset, command[-1].endOffset));
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
        diagnostics.push(new Diagnostic(Severity.Error, 'error.unknown_parameter', paramValue.startOffset, paramValue.endOffset));
        continue;
      }

      if (paramDef.type === 'integer') {
        if (paramValue.value === null)
          diagnostics.push(new Diagnostic(Severity.Warning, 'error.invalid_parameter_type_need_int', paramValue.startOffset, paramValue.endOffset));
        const valueAsString = paramValue.value.toString();
        const rawLength = paramDef.endOffset - paramDef.startOffset;
        const letterLength = 1;
        const expectedLength = letterLength + valueAsString.length;
        if (expectedLength !== rawLength) {
          diagnostics.push(new Diagnostic(Severity.Warning, 'error.invalid_parameter_type_need_int', paramValue.startOffset + 1, paramValue.endOffset));
        }
      } else if (paramDef.type === 'float') {
        console.log(paramValue);
        if (paramValue.value === null)
          diagnostics.push(new Diagnostic(Severity.Warning, 'error.invalid_parameter_type_need_float', paramValue.startOffset, paramValue.endOffset));
        const valueAsString = paramValue.value.toFixed(1);
        const rawLength = paramDef.endOffset - paramDef.startOffset;
        const letterLength = 1;
        const expectedLength = letterLength + valueAsString.length;
        if (expectedLength !== rawLength) {
          diagnostics.push(new Diagnostic(Severity.Warning, 'error.invalid_parameter_type_need_float', paramValue.startOffset + 1, paramValue.endOffset));
        }
      }
      else if (paramDef.type === 'flag') {
        if (paramValue.value !== null)
          diagnostics.push(new Diagnostic(Severity.Warning, 'error.invalid_parameter_type_need_flag', paramValue.startOffset + 1, paramValue.endOffset));
      }

      if (paramDef.min_value !== undefined && paramValue < paramDef.min_value) {
        diagnostics.push(new Diagnostic(Severity.Error, 'error.value_out_of_range', command.start, command.end));
      }
      if (paramDef.max_value !== undefined && paramValue > paramDef.max_value) {
        diagnostics.push(new Diagnostic(Severity.Error, 'error.value_out_of_range', command.start, command.end));
      }

      if (paramDef.allowed_values && !paramDef.allowed_values.includes(paramValue)) {
        diagnostics.push(new Diagnostic(Severity.Error, 'error.value_not_allowed', command.start, command.end));
      }
    }

    for (const [paramName, paramDef] of paramDefs.entries()) {
      if (paramDef.required && command.parameters[paramName] === undefined) {
        diagnostics.push(new Diagnostic(Severity.Error, 'error.missing_required_parameter', command.start, command.end));
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
            diagnostics.push(new Diagnostic(Severity.Error, 'error.no_parameters_allowed', command.start, command.end));
          }
          break;
        case 'at_least_one_axis':
          if (!constraint.params.some(p => commandParams.includes(p))) {
            diagnostics.push(new Diagnostic(Severity.Error, 'error.at_least_one_axis_required', command.start, command.end));
          }
          break;
        case 'require_one':
          if (!constraint.params.some(p => commandParams.includes(p))) {
            diagnostics.push(new Diagnostic(Severity.Error, 'error.require_one_parameter', command.start, command.end));
          }
          break;
        case 'all_required':
          if (!constraint.params.every(p => commandParams.includes(p))) {
            diagnostics.push(new Diagnostic(Severity.Error, 'error.all_parameters_required', command.start, command.end));
          }
          break;
        case 'mutually_exclusive':
          if (constraint.params.filter(p => commandParams.includes(p)).length > 1) {
            diagnostics.push(new Diagnostic(Severity.Error, 'error.mutually_exclusive_parameters', command.start, command.end));
          }
          break;
        case 'require_one_group':
          if (!constraint.groups.some(group => group.every(p => commandParams.includes(p)))) {
            diagnostics.push(new Diagnostic(Severity.Error, 'error.parameter_group_missing', command.start, command.end));
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
                diagnostics.push(new Diagnostic(Severity.Error, 'error.invalid_parameter_relationship', command.start, command.end));
              }
              // Add other operators as needed
            }
          }
          break;
        }
        case 'positive':
          for (const paramName of constraint.params) {
            if (command.parameters[paramName] !== undefined && command.parameters[paramName] <= 0) {
              diagnostics.push(new Diagnostic(Severity.Error, 'error.parameter_must_be_positive', command.start, command.end));
            }
          }
          break;
      }
    }

    return diagnostics;
  }
}
