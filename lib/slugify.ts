/**
 * Converts a string to a URL-safe slug.
 * Strips diacritics, lowercases, replaces non-alphanumeric runs with hyphens.
 */
export function slugify(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics (é → e, ü → u, etc.)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
