/**
 * Table metadata from SQL Server
 */
export interface TableMetadata {
    /**
     * Schema name (e.g., "dbo")
     */
    schema: string;
    
    /**
     * Table name
     */
    name: string;
    
    /**
     * Fully qualified name (e.g., "dbo.users")
     */
    fullName: string;
    
    /**
     * Column metadata
     */
    columns: ColumnMetadata[];
}

/**
 * View metadata from SQL Server
 */
export interface ViewMetadata {
    /**
     * Schema name (e.g., "dbo")
     */
    schema: string;
    
    /**
     * View name
     */
    name: string;
    
    /**
     * Fully qualified name (e.g., "dbo.vw_users")
     */
    fullName: string;
    
    /**
     * Column metadata
     */
    columns: ColumnMetadata[];
}

/**
 * Stored procedure metadata from SQL Server
 */
export interface ProcMetadata {
    /**
     * Schema name (e.g., "dbo")
     */
    schema: string;
    
    /**
     * Procedure name
     */
    name: string;
    
    /**
     * Fully qualified name (e.g., "dbo.sp_GetUsers")
     */
    fullName: string;
    
    /**
     * Parameter metadata
     */
    parameters: ParameterMetadata[];
}

/**
 * Column metadata from SQL Server
 */
export interface ColumnMetadata {
    /**
     * Column name
     */
    name: string;
    
    /**
     * SQL data type (e.g., "nvarchar", "int")
     */
    dataType: string;
    
    /**
     * Whether column allows NULL values
     */
    isNullable: boolean;
    
    /**
     * Whether column is part of primary key
     */
    isPrimaryKey: boolean;
    
    /**
     * Maximum length for string types
     */
    maxLength?: number;
}

/**
 * Stored procedure parameter metadata
 */
export interface ParameterMetadata {
    /**
     * Parameter name (including @)
     */
    name: string;
    
    /**
     * SQL data type (e.g., "nvarchar", "int")
     */
    dataType: string;
    
    /**
     * Whether parameter is OUTPUT parameter
     */
    isOutput: boolean;
    
    /**
     * Maximum length for string types
     */
    maxLength?: number;
}

/**
 * Linking/junction table metadata for many-to-many relationships
 */
export interface LinkingTable {
    leftSchema: string;
    leftTable: string;
    leftKeyColumn: string;
    centerSchema: string;
    centerTable: string;
    centerLeftKeyColumn: string;
    centerRightKeyColumn: string;
    rightSchema: string;
    rightTable: string;
    rightKeyColumn: string;
    text: string;
}
