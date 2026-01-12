/* name | paramInfo (no @) | colInfo | script */
WITH Procs AS (
    SELECT
        p.object_id,
        name   = QUOTENAME(SCHEMA_NAME(p.schema_id)) + '.' + QUOTENAME(p.name),
        script = sm.definition
    FROM sys.procedures AS p
    JOIN sys.sql_modules AS sm
      ON sm.object_id = p.object_id
    WHERE p.is_ms_shipped = 0
      AND p.name NOT IN (
        'sp_upgraddiagrams',
        'sp_helpdiagrams',
        'sp_helpdiagramdefinition',
        'sp_creatediagram',
        'sp_renamediagram',
        'sp_alterdiagram',
        'sp_dropdiagram'
      )
),
ParamAgg AS (
    SELECT
        pr.object_id,
        paramInfo = STRING_AGG(STUFF(pr.name, 1, 1, ''), ',')
                     WITHIN GROUP (ORDER BY pr.parameter_id)
    FROM sys.parameters AS pr
    INNER JOIN Procs AS p
      ON p.object_id = pr.object_id
    GROUP BY pr.object_id
),
ColAgg AS (
    SELECT
        p.object_id,
        colInfo = STRING_AGG(r.name, ',')
                    WITHIN GROUP (ORDER BY r.column_ordinal)
    FROM Procs AS p
    CROSS APPLY sys.dm_exec_describe_first_result_set_for_object(p.object_id, NULL) AS r
    WHERE r.error_state IS NULL
      AND r.is_hidden = 0
    GROUP BY p.object_id
)
SELECT
    p.name,
    paramInfo = ISNULL(pa.paramInfo, ''),
    colInfo   = ISNULL(ca.colInfo, ''),
    script    = p.script
FROM Procs AS p
LEFT JOIN ParamAgg AS pa
  ON pa.object_id = p.object_id
LEFT JOIN ColAgg AS ca
  ON ca.object_id = p.object_id
ORDER BY p.name;
