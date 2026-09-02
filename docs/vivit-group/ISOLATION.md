# Vivit Group ERP — Isolation Contract

## Purpose
This branch is the isolated implementation track for the new Vivit Group platform defined by `vivit_erp_master.pdf`.

## Hard boundary
Until the final integration stage:
- Do not merge into `main`.
- Do not modify the existing Vivit Marketing ERP production deployment.
- Do not reuse production database write credentials.
- Do not run migrations against the production database.
- Do not reuse production storage buckets for new Hospitality/Tech data.
- Do not point OAuth callbacks at the production app.
- Do not promote this branch to the current production Vercel project.

## Development branch
`feat/vivit-group-erp-7d`

## Baseline snapshot
The branch was cut from:
`999a1c6e772e9fcae2699825dcd9632e43255b1e`

This SHA is only a code baseline. Existing production remains out of scope until the final integration stage.

## Stage 0 checklist
- [x] 0.1 Create isolated development branch/workspace
- [ ] 0.2 Separate preview deployment
- [ ] 0.3 Separate environment variables
- [ ] 0.4 Separate database/schema
- [ ] 0.5 Separate storage/media namespace
- [ ] 0.6 Separate OAuth/Auth callbacks
- [ ] 0.7 Prove no migration/write path reaches current production
- [ ] 0.8 Record baseline + rollback/integration boundary

## Release plan
7-day full-scope sprint. No feature deferral. Quality gates remain mandatory.
