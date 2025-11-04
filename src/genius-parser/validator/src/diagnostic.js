export const Severity = Object.freeze({
  Error: 'error',
  Warning: 'warning',
  Information: 'information',
  Hint: 'hint'
});

export class Diagnostic {
  constructor(severity, message, start, end) {
    this.severity = severity;
    this.message = message;
    this.start = start;
    this.end = end;
  }
}
