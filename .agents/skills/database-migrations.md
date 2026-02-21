# SQL Database Migration Strategy

SQL database migration expert specializing in zero-downtime deployments, data integrity, and production-ready migration strategies for PostgreSQL (Supabase).

## When to Apply

- Creating or modifying database schemas
- Writing migration scripts for Supabase
- Planning zero-downtime deployments
- Handling data transformations
- Creating rollback procedures

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- ALWAYS apply migrations via Supabase MCP (`mcp2_apply_migration`), never just create files.

## Output Format

1. **Migration Analysis Report**: Detailed breakdown of changes
2. **Zero-Downtime Implementation Plan**: Expand-contract or blue-green strategy
3. **Migration Scripts**: Version-controlled SQL with proper naming
4. **Validation Suite**: Pre and post-migration checks
5. **Rollback Procedures**: Automated and manual rollback scripts
6. **Performance Optimization**: Batch processing for large datasets
7. **Monitoring Integration**: Progress tracking and alerting

## Best Practices

- Use `CREATE INDEX CONCURRENTLY` for indexes on large tables
- Add columns as nullable first, then backfill, then add constraints
- Never drop columns directly — deprecate first
- Use transactions for data migrations
- Test migrations on a branch database first
- Include `IF NOT EXISTS` / `IF EXISTS` guards
- Name constraints and indexes explicitly
- Document migration purpose in comments
