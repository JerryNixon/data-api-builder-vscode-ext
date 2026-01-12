/**
 * Pure utility functions that don't depend on VS Code API
 */

/**
 * Extracts environment variable name from @env() syntax
 * 
 * @param connectionString - Connection string with @env() syntax
 * @returns Environment variable name or empty string
 * 
 * @example
 * ```typescript
 * extractEnvVarName("@env('DB_CONN')") // Returns: "DB_CONN"
 * extractEnvVarName('@env("DB_CONN")') // Returns: "DB_CONN"
 * extractEnvVarName("@env( 'DB_CONN' )") // Returns: "DB_CONN"
 * ```
 */
export function extractEnvVarName(connectionString: string): string {
    // Match @env() with single quotes, double quotes, and optional whitespace
    const envVarMatch = connectionString.match(/@env\(\s*['"](.+?)['"]\s*\)/);
    return envVarMatch ? envVarMatch[1].trim() : '';
}
