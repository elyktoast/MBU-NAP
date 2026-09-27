# Supabase migrations

This directory mirrors the migration history applied to the production Supabase project.

It was reconciled from `supabase_migrations.schema_migrations` during the Phase 1 release-hardening pass on 2026-09-27. Applied migration version prefixes and SQL bodies are kept aligned with production so future migration tooling sees one consistent history.

Do not rename or rewrite an applied migration. Add future schema changes as new migrations.
