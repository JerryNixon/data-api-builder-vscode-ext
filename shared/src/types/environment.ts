/**
 * Represents an environment variable entry from .env file
 */
export interface EnvEntry {
    /**
     * Environment variable name (e.g., "MSSQL_CONNECTION_STRING")
     */
    name: string;
    
    /**
     * Environment variable value (the connection string)
     */
    value: string;
    
    /**
     * Human-readable display text (e.g., "Server=localhost;Database=mydb")
     */
    display?: string;
}
