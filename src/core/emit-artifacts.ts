/** Bundled output sections used to emit a generated module. */
export type EmitArtifactsInput = {
  /** Import lines to place at the top of the file. */
  imports: string[];
  /** Exported constant declarations. */
  constLines: string[];
  /** Exported type declarations. */
  typeLines: string[];
};

/**
 * Concatenates generated artifact sections into final module source.

 * @param input Generated import, const, and type sections.
 * @returns Module source joined with newline separators.
 */
export function emitArtifacts({ imports, constLines, typeLines }: EmitArtifactsInput): string {
  return [...imports, ...constLines, ...typeLines].join("\n");
}
