-- Clean approach: Simple pattern matching without complex parsing
-- This avoids line feed issues by using simple LIKE patterns

IF OBJECT_ID('tempdb..#Procedures') IS NOT NULL
    DROP TABLE #Procedures;

CREATE TABLE #Procedures (
    FullName NVARCHAR(255),
    ParamInfo NVARCHAR(MAX),
    ColInfo NVARCHAR(MAX),
    Script NVARCHAR(MAX),
    Processed BIT DEFAULT 0
);

-- Populate procedures
INSERT INTO #Procedures (FullName)
SELECT CONCAT(s.name, '.', p.name)
FROM sys.procedures p
INNER JOIN sys.schemas s ON p.schema_id = s.schema_id
WHERE is_ms_shipped = 0
  AND p.name NOT IN (
      'sp_upgraddiagrams', 'sp_helpdiagrams', 'sp_helpdiagramdefinition', 
      'sp_creatediagram', 'sp_renamediagram', 'sp_alterdiagram', 'sp_dropdiagram');

-- Process each procedure
WHILE EXISTS (SELECT 1 FROM #Procedures WHERE Processed = 0)
BEGIN
    DECLARE @procName NVARCHAR(255), @objectId INT, @params NVARCHAR(MAX), @columns NVARCHAR(MAX), @script NVARCHAR(MAX);
    DECLARE @cleanScript NVARCHAR(MAX);
    
    -- Get the next unprocessed procedure
    SELECT TOP 1 @procName = FullName, @objectId = OBJECT_ID(FullName)
    FROM #Procedures
    WHERE Processed = 0;

    -- Get the procedure definition and clean it
    SELECT @script = OBJECT_DEFINITION(@objectId);
    
    -- Clean script: remove line feeds, carriage returns, tabs, and normalize spaces
    SET @cleanScript = REPLACE(REPLACE(REPLACE(@script, CHAR(13), ' '), CHAR(10), ' '), CHAR(9), ' ');
    -- Remove multiple spaces
    WHILE CHARINDEX('  ', @cleanScript) > 0
        SET @cleanScript = REPLACE(@cleanScript, '  ', ' ');

    -- Find parameters with defaults using simple pattern matching
    SELECT @params = STRING_AGG(
        CONCAT(
            CASE WHEN LEFT(p.name,1) = '@' THEN SUBSTRING(p.name,2,LEN(p.name)-1) ELSE p.name END,
            ':?'
        ), ', ')
    FROM sys.parameters p
    WHERE p.object_id = @objectId
      AND (@cleanScript LIKE '%' + p.name + ' = %'
           OR @cleanScript LIKE '%' + p.name + '= %'
           OR @cleanScript LIKE '%' + p.name + ' =%'
           OR @cleanScript LIKE '%' + p.name + '=%');

    -- Get result set columns
    SELECT @columns = STRING_AGG(name, ', ')
    FROM sys.dm_exec_describe_first_result_set_for_object(@objectId, NULL);

    -- Update the metadata
    UPDATE #Procedures
    SET 
        ParamInfo = ISNULL(@params, ''),
        ColInfo = ISNULL(@columns, ''),
        Script = @script,
        Processed = 1
    WHERE FullName = @procName;
END;

-- Output metadata
SELECT 
    FullName AS name,
    ParamInfo AS paramInfo,
    ColInfo AS colInfo,
    Script AS script
FROM #Procedures;