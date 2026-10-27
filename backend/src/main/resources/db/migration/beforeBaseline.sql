-- Flyway SQL callback, run only when Flyway baselines an existing schema
-- (spring.flyway.baseline-on-migrate=true on a non-empty schema without history).
-- It refuses the baseline unless schema "public" is exactly the V1 schema, so that
-- V1 is never wrongly marked as applied on a different or partially migrated database.
-- Read-only: it only inspects catalogs. Also usable for a dry run, see
-- scripts/Test-DatabaseBaseline.ps1. Signature of V1 on PostgreSQL 16.
DO $$
DECLARE
    expected_signature constant text := '2787e44dd1123d77411caf8528c5a51a';
    actual_signature text;
BEGIN
    IF current_schema() IS DISTINCT FROM 'public' THEN
        RAISE EXCEPTION 'Refusing Flyway baseline: expected schema public, current schema is %', current_schema();
    END IF;

    SELECT md5(string_agg(line, E'\n' ORDER BY line COLLATE "C")) INTO actual_signature FROM (
        SELECT format('column|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s',
                      c.table_name, c.column_name, c.data_type,
                      coalesce(c.character_maximum_length::text, ''), coalesce(c.numeric_precision::text, ''),
                      coalesce(c.numeric_scale::text, ''), coalesce(c.datetime_precision::text, ''),
                      c.is_nullable, c.is_identity, coalesce(c.column_default, '')) AS line
        FROM information_schema.columns c
        WHERE c.table_schema = 'public' AND c.table_name <> 'flyway_schema_history'
        UNION ALL
        SELECT format('constraint|%s|%s|%s', rel.relname, con.contype,
                      CASE WHEN con.contype = 'c'
                           -- pg_dump/pg_restore re-deparses CHECK expressions with different casts and
                           -- parentheses; compare them without casts, parentheses or brackets.
                           THEN regexp_replace(regexp_replace(pg_get_constraintdef(con.oid),
                                    '::[a-z][a-z ]*[a-z](\[\])?', '', 'g'), '[][()]', '', 'g')
                           ELSE pg_get_constraintdef(con.oid) END)
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = rel.relnamespace
        WHERE n.nspname = 'public' AND rel.relname <> 'flyway_schema_history'
        UNION ALL
        SELECT format('index|%s|%s', i.tablename,
                      regexp_replace(i.indexdef, '^CREATE (UNIQUE )?INDEX \S+ ON', 'CREATE \1INDEX ON'))
        FROM pg_indexes i
        WHERE i.schemaname = 'public' AND i.tablename <> 'flyway_schema_history'
        UNION ALL
        SELECT format('relation|%s|%s', cl.relname, cl.relkind)
        FROM pg_class cl
        JOIN pg_namespace n ON n.oid = cl.relnamespace
        WHERE n.nspname = 'public' AND cl.relkind IN ('r', 'p', 'v', 'm', 'f')
          AND cl.relname NOT LIKE 'flyway_schema_history%'
    ) s;

    IF actual_signature IS DISTINCT FROM expected_signature THEN
        RAISE EXCEPTION 'Refusing Flyway baseline: schema public does not match V1 (expected signature %, found %). '
            'Compare it with V1__baseline_schema.sql before any adoption.', expected_signature, actual_signature;
    END IF;
    RAISE NOTICE 'Schema public matches V1 (signature %): baseline at version 1 is safe.', actual_signature;
END
$$;
