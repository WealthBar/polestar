CREATE TABLE permission
(
  permission_name VARCHAR NOT NULL PRIMARY KEY CHECK (permission_name::text ~ '^[A-Z][_A-Z0-9]+$')
);

CREATE TRIGGER permission_prevent_change
  BEFORE UPDATE OR DELETE OR TRUNCATE
  ON permission
EXECUTE PROCEDURE func.prevent_change();
------------------------------------------------------------------------------------------------------
CREATE TABLE permission_group
(
  permission_group_name VARCHAR NOT NULL PRIMARY KEY CHECK (permission_group_name::text ~ '^[A-Z][_A-Z0-9]+$')
);

CREATE TRIGGER permission_group_prevent_change
  BEFORE UPDATE OR DELETE OR TRUNCATE
  ON permission_group
EXECUTE PROCEDURE func.prevent_change();
------------------------------------------------------------------------------------------------------
CREATE TABLE permission_x_permission_group
(
  permission_x_permission_group_id UUID NOT NULL DEFAULT func.tuid_generate(),
  permission_group_name VARCHAR NOT NULL REFERENCES permission_group,
  permission_name VARCHAR NOT NULL REFERENCES permission,
  relation_type VARCHAR NOT NULL DEFAULT 'add' CHECK (relation_type::text = ANY
                                                      (ARRAY ['add'::text, 'remove'::text, 'add_grant'::text]))
);
SELECT add_history_to_table('permission_x_permission_group');
