import { createInterface } from 'node:readline';

export class InputClosedError extends Error {}

export function createTerminal(input = process.stdin, output = process.stdout) {
  const readline = createInterface({ input, crlfDelay: Infinity, terminal: false });
  const lines = [];
  let pending;
  let closed = false;

  // Queue lines so pasted or piped answers survive between asynchronous database calls.
  readline.on('line', (line) => {
    if (pending) {
      const resolve = pending;
      pending = undefined;
      resolve(line);
    } else lines.push(line);
  });
  readline.on('close', () => {
    closed = true;
    if (pending) {
      pending(undefined);
      pending = undefined;
    }
  });

  return {
    write(message) { output.write(`${message}
`); },
    async ask(prompt) {
      output.write(prompt);
      let line;
      if (lines.length) line = lines.shift();
      else if (!closed) line = await new Promise((resolve) => { pending = resolve; });
      if (line === undefined) throw new InputClosedError();
      return line.trim();
    },
    close() { readline.close(); },
  };
}
