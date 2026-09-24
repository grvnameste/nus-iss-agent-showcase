/**
 * Minimal class-name joiner. Avoids adding a dependency for simple conditional
 * class composition (coding-standards: no unnecessary dependencies).
 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}
