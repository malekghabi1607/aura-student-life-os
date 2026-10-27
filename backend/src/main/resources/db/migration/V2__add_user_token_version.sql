-- Flyway V2: per-user JWT version (AUDIT_COMPLET.md AUTH-1, AUTH-2).
-- Every JWT carries a "ver" claim that must equal users.token_version; incrementing the
-- column revokes all tokens issued before (password reset, account deactivation).
-- Existing rows get 0. On PostgreSQL 11+ a constant default is stored in the catalog:
-- no table rewrite, but ALTER TABLE still needs an exclusive lock and can wait.
-- Backward compatible: an image without this column in its
-- entity still inserts users (the default applies) and Hibernate validation ignores it.
ALTER TABLE users ADD COLUMN token_version integer NOT NULL DEFAULT 0;
