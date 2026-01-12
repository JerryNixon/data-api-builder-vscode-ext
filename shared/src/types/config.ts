/**
 * Data API Builder configuration file schema
 */
export interface DabConfig {
    '$schema'?: string;
    'data-source': DataSource;
    runtime?: Runtime;
    entities: Record<string, EntityDefinition>;
}

/**
 * Data source configuration
 */
export interface DataSource {
    'database-type': 'mssql' | 'cosmosdb_nosql' | 'postgresql' | 'mysql';
    'connection-string': string;
    options?: Record<string, any>;
}

/**
 * Runtime configuration
 */
export interface Runtime {
    rest?: {
        path?: string;
        enabled?: boolean;
    };
    graphql?: {
        path?: string;
        enabled?: boolean;
    };
    host?: {
        mode?: 'development' | 'production';
        cors?: {
            origins?: string[];
            'allow-credentials'?: boolean;
        };
    };
    cache?: {
        enabled?: boolean;
        ttl?: number;
    };
}

/**
 * Entity source definition
 */
export interface EntitySource {
    /**
     * Database object name (e.g., "dbo.users", "users")
     */
    object: string;
    
    /**
     * Type of database object
     */
    type: 'table' | 'view' | 'stored-procedure';
    
    /**
     * Primary key fields for tables/views
     */
    'key-fields'?: string[];
    
    /**
     * Parameters for stored procedures
     */
    parameters?: Record<string, string>;
}

/**
 * Entity definition in DAB config
 */
export interface EntityDefinition {
    source: EntitySource;
    rest?: {
        path?: string;
        methods?: Array<'get' | 'post' | 'put' | 'patch' | 'delete'>;
        enabled?: boolean;
    };
    graphql?: {
        type?: {
            singular?: string;
            plural?: string;
        };
        enabled?: boolean;
    };
    mappings?: Record<string, string>;
    relationships?: Record<string, Relationship>;
    permissions?: Permission[];
}

/**
 * Relationship definition between entities
 */
export interface Relationship {
    /**
     * Relationship cardinality
     */
    cardinality: 'one' | 'many';
    
    /**
     * Target entity name
     */
    'target.entity': string;
    
    /**
     * Source fields that define the relationship
     */
    'source.fields': string[];
    
    /**
     * Target fields that define the relationship
     */
    'target.fields': string[];
    
    /**
     * Linking/junction table for many-to-many relationships
     */
    'linking.object'?: string;
    
    /**
     * Source fields in the linking table
     */
    'linking.source.fields'?: string[];
    
    /**
     * Target fields in the linking table
     */
    'linking.target.fields'?: string[];
}

/**
 * Permission definition for entity
 */
export interface Permission {
    /**
     * Role name (e.g., "anonymous", "authenticated")
     */
    role: string;
    
    /**
     * Allowed actions for this role
     */
    actions: Array<'create' | 'read' | 'update' | 'delete' | 'execute' | '*'>;
    
    /**
     * Field-level permissions
     */
    fields?: {
        include?: string[];
        exclude?: string[];
    };
}
