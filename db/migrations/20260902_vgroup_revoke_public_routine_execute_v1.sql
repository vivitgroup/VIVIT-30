-- Deep-audit remediation: all Vivit Group DB routines are server-only.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name,p.proname,pg_get_function_identity_arguments(p.oid) AS args,p.prokind
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname IN ('vgroup','hospitality','tech') AND p.prokind IN ('f','p')
  LOOP
    IF r.prokind='f' THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',r.schema_name,r.proname,r.args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role',r.schema_name,r.proname,r.args);
    ELSE
      EXECUTE format('REVOKE ALL ON PROCEDURE %I.%I(%s) FROM PUBLIC, anon, authenticated',r.schema_name,r.proname,r.args);
      EXECUTE format('GRANT EXECUTE ON PROCEDURE %I.%I(%s) TO service_role',r.schema_name,r.proname,r.args);
    END IF;
  END LOOP;
END $$;
