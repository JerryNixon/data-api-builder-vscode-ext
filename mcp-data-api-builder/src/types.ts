// types.ts

export interface Relationship {
    targetEntity: string;
    cardinality: 'one' | 'many' | 'many-to-many';
    sourceFields: string[];
    targetFields: string[];
    linkingObject?: string;
    linkingSourceFields?: string[];
    linkingTargetFields?: string[];
  }
  
  export interface EntitySource {
    object: string;
    type: 'table' | 'view' | 'stored-procedure';
    'key-fields'?: string[];
    parameters?: Record<string, string>;
    normalizedObjectName?: string;
  }
  
  export interface FieldMapping {
    name: string;
    alias: string;
  }
  
  export interface RestInfo {
    path: string;
    methods?: string[];
    enabled?: boolean;
    pathComplete?: string;
  }
  
  export interface EntityDefinition {
    source: EntitySource;
    restPath: string;
    runtimeRestPath?: string;
    rest?: RestInfo;
    mappings?: FieldMapping[];
    relationships?: Relationship[];
    dbMetadata?: DbEntity;
  }
  
  export interface DbColumn {
    name: string;
    alias: string;
    dbType: string;
    netType: string;
    isKey: boolean;
  }
  
  export interface DbParameter {
    name: string;
    dbType: string;
    netType: string;
  }
  
  export interface DbEntity {
    objectName: string;
    normalizedObjectName: string;
    type: 'table' | 'view' | 'stored-procedure';
    columns: DbColumn[];
    parameters?: DbParameter[] | null;
  }
  