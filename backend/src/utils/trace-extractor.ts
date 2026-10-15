// src/utils/trace-extractor.ts
// Detects complete stack traces in streamed stderr output

const TRACE_STARTERS = [
  /^(Error|TypeError|ReferenceError|SyntaxError|RangeError|URIError|EvalError):/m,
  /^Traceback \(most recent call last\):/m, // Python
  /^goroutine \d+ \[/m, // Go
  /^thread '.*' panicked at/m, // Rust
  /^fatal error:/m,
  /^panic:/m,
];

const STACK_LINE = /^\s+at\s|^\s+File\s"|^\s+goroutine|^\s+\d+\s+0x/m;

/**
 * Extracts complete stack traces from a buffered string.
 * Returns an array of trace strings to analyze.
 */
export function extractTraces(buffer: string): string[] {
  const traces: string[] = [];

  for (const starter of TRACE_STARTERS) {
    const match = starter.exec(buffer);
    if (!match) continue;

    // Find start of trace
    const startIdx = match.index;

    // Find end — look for 2+ blank lines or end of buffer
    let endIdx = buffer.length;
    const afterStart = buffer.slice(startIdx);
    const blankLineEnd = afterStart.search(/\n\n\n|\n\n(?!\s+at\s)/);
    if (blankLineEnd > 100) {
      endIdx = startIdx + blankLineEnd;
    }

    const trace = buffer.slice(startIdx, endIdx).trim();

    // Only include if it actually looks like a stack trace
    if (STACK_LINE.test(trace) && trace.length > 50) {
      traces.push(trace);
    }
  }

  return traces;
}