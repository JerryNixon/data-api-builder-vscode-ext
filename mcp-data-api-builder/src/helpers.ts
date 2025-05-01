/**
 * Normalizes object names to schema-qualified, lower-case form.
 * @param name - SQL object name, optionally schema-qualified.
 * @returns Normalized name like "dbo.actor".
 */
export function normalizeObjectName(name: string): string {
  const cleaned = name.replace(/\[|\]/g, '');
  const [schema, object] = cleaned.includes('.') ? cleaned.split('.') : ['dbo', cleaned];
  return `${schema.trim()}.${object.trim()}`.toLowerCase();
}

/**
 * Creates a dictionary mapping source column names to aliases.
 */
export function buildAliasMap(mappings?: { name: string; alias: string }[]): Record<string, string> {
  return mappings?.reduce((map, m) => {
    map[m.name] = m.alias;
    return map;
  }, {} as Record<string, string>) ?? {};
}

/**
 * Converts a string to PascalCase.
 */
export function toPascalCase(name: string): string {
  return name
    .replace(/[_\s\-]+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Converts a string to camelCase (lowerFirst).
 */
export function lowerFirst(name: string): string {
  return name.length > 0
    ? name.charAt(0).toLowerCase() + name.slice(1)
    : '';
}

/**
 * Ensures a string is a valid C# identifier.
 * - Replaces invalid characters with underscores
 * - Prefixes with '@' if it's a reserved keyword
 */
export function sanitizeIdentifier(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_]/g, '_');
  const prefixed = /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned;
  const reserved = new Set([
    'class', 'namespace', 'event', 'string', 'int', 'public', 'private', 'return',
    'internal', 'new', 'base', 'params', 'static', 'void', 'null', 'true', 'false',
    'object', 'default', 'override'
  ]);
  return reserved.has(prefixed) ? `@${prefixed}` : prefixed;
}
