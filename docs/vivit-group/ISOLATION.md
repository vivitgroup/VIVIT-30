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
- Do not deploy, promote, configure, inspect, or mutate any Vercel project for Vivit Group ERP.

## Hosting decision
Vercel is explicitly outside the Vivit Group ERP delivery scope. Hosting/deployment is not a prerequisite for the isolated application, database, business-logic, security, or CTO certification work. Any future hosting target is a separate approved decision and must preserve the same isolation contract.

## Development branch
`feat/vivit-group-erp-7d`

## Baseline snapshot
The branch was cut from:
`999a1c6e772e9fcae2699825dcd9632e43255b1e`

This SHA is only a code baseline. Existing production remains out of scope until the final integration stage.

## Stage 0 checklist
- [x] 0.1 Create isolated development branch/workspace
- [x] 0.2 Hosting/deployment excluded by approved delivery scope; no Vercel dependency
- [x] 0.3 Separate VGROUP_* environment-variable contract and runtime credential guards
- [x] 0.4 Separate Supabase project/database and vgroup/hospitality/tech schemas
- [x] 0.5 Separate storage/media namespace inside the isolated Group project
- [x] 0.6 No production OAuth callback reuse; Group auth remains isolated
- [x] 0.7 Runtime guards and CI regression prove Group credentials cannot equal Marketing credentials
- [x] 0.8 Baseline, release, rollback and final-integration boundaries recorded

## Release plan
Full scope remains mandatory. Quality gates remain mandatory. No hosting platform action is implied by CTO certification.
