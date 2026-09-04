# Vivito Cross-Workspace Integration Contract

## Objective
Vivito is one governed assistant surface across Vivit Group, Vivit Marketing, Vivit Hospitality and Vivit Technology. It may execute business actions only through registered, permission-checked capabilities. It is not an unrestricted HTTP, SQL, shell or provider proxy.

## Identity and authorization
- The signed-in human user remains the initiating actor.
- Group-side capability visibility is derived from the user's actual Group membership and permissions.
- The target API remains the final validation and authorization authority.
- Sensitive Group/Hospitality/Tech actions require Group Super Admin approval before execution.
- Every task records initiating actor, workspace, capability, risk, idempotency key, status and approval/execution timestamps.

## Execution safety
- Capability targets are code-defined and same-origin only.
- User payload cannot replace a capability endpoint or its fixed operation discriminator.
- Every mutating request requires a stable idempotency key.
- Dry-run performs preflight only and must not insert or execute a task.
- Secrets and credential-shaped fields are redacted from task/result ledgers.
- Internal execution has a timeout, rejects redirects and bounds captured output.
- Sensitive actions remain `waiting_approval` until explicitly approved.

## Marketing pre-integration state
`marketing.task_execute` MUST remain disabled and return `INTEGRATION_REQUIRED` until the controlled Marketing integration is explicitly authorized and certified. Visibility of the Vivito launcher in Marketing does not mean Marketing execution is enabled.

## Marketing adapter requirements at cutover
The final Marketing adapter MUST provide a server-side manifest that maps Vivito capability keys to existing Marketing-native operations. It MUST NOT expose arbitrary route names, SQL, provider tokens or generic tool execution.

For every Marketing capability the adapter must define:
1. Stable capability key and human label.
2. Required Marketing role/permission/workspace state.
3. Risk level and whether approval is required.
4. Strict request schema and bounded result schema.
5. Idempotency semantics for mutations.
6. Audit entity/action identifiers.
7. Failure code mapping.
8. Whether the action is reversible and the rollback/compensation path when applicable.

## Marketing identity handoff
- Use the certified short-lived POST-only handoff.
- Assertion TTL must remain <=60 seconds.
- Nonce is single-use and replay-protected.
- Normalized email is used only to map to an existing Marketing account during first cutover.
- Marketing independently verifies active user, approval state, active workspace and valid role.
- No automatic Marketing account creation in first cutover.
- No assertion/token in query strings.

## Data boundary
- Group does not receive or store Marketing provider/OAuth secrets.
- Marketing does not receive Group database credentials.
- Task/result ledgers store only redacted business payload/evidence.
- Cross-company financial data uses a dedicated read-only aggregate adapter; media spend or client gross must never be silently treated as Vivit revenue.

## Availability and failure mode
- Marketing integration is fail-closed.
- If Marketing adapter health/certification is missing, Marketing execution capability remains disabled while Group/Hospitality/Tech Vivito capabilities continue independently.
- A Marketing outage must not block the other three workspaces.

## Cutover certification
Before enabling Marketing execution:
1. Fresh Marketing SHA drift check.
2. Rollback checkpoint.
3. Marketing receiver/adapter full certification.
4. Capability manifest contract tests.
5. Identity, permission, replay and idempotency tests.
6. Group exact-head CTO regression.
7. Controlled integration smoke tests.
8. Explicit cutover flag only after all gates are green.

## Production boundary
This contract and the Group-side orchestration layer are preparation only. They do not authorize Marketing production mutation, production deployment or final cutover.
