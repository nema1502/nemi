/**
 * Models often write a whole step as \text{water + air \rightarrow food}, and KaTeX prints a command inside \text
 * as letters. Close the text around each command so the arrow (or any symbol) is drawn as math.
 */
export function mathOutOfText(tex: string): string {
  return tex.replace(/\\text\{([^{}]*)\}/g, (_, body: string) =>
    body
      .split(/(\\[a-zA-Z]+)/)
      .filter(Boolean)
      .map((part) => (/^\\[a-zA-Z]+$/.test(part) ? part : `\\text{${part}}`))
      .join(""),
  );
}
