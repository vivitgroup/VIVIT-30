import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {auditStringify,redactAuditValue} from "../lib/vivito/audit-safety";

const actionRoute=readFileSync("app/api/assistant/actions/route.ts","utf8");
const historyRoute=readFileSync("app/api/assistant/history/route.ts","utf8");

const sample=redactAuditValue({
 authorization:"Bearer top-secret",
 accessToken:"abc",
 nested:{password:"pw",safe:"ok"},
 message:"request failed with Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIn0.signature123456789"
}) as Record<string,unknown>;
assert.equal(sample.authorization,"[REDACTED]");
assert.equal(sample.accessToken,"[REDACTED]");
assert.deepEqual(sample.nested,{password:"[REDACTED]",safe:"ok"});
assert(!auditStringify(sample).includes("top-secret"));
assert(!auditStringify(sample).includes("signature123456789"));

assert.match(actionRoute,/vivito_history_/);
assert.match(actionRoute,/confirmation_required/);
assert.match(actionRoute,/"denied"/);
assert.match(actionRoute,/"duplicate"/);
assert.match(actionRoute,/auditStringify\(\{requestId,op,args,state:"STARTED"\}\)/);
assert.match(actionRoute,/External provider writes require an explicit requestId for idempotency/);
assert.match(actionRoute,/workspace_id=\$\{workspaceId\}/);
assert.match(actionRoute,/user_id=\$\{userId\}/);

assert.match(historyRoute,/if\(!session\?\.user\)/);
assert.match(historyRoute,/workspace_id=\$\{workspaceId\}/);
assert.match(historyRoute,/role==="SUPER_ADMIN"\?sql``:sql`and user_id=\$\{userId\}`/);
assert.match(historyRoute,/Math\.min\(100,Math\.max\(1/);
assert.match(historyRoute,/action like 'vivito_history_%'/);
assert.match(historyRoute,/parseSanitizedAudit/);
assert(!historyRoute.includes("workspaceId=url.searchParams"));
assert(!historyRoute.includes("userId=url.searchParams"));

console.log("VIVITO Audit Trail & Action History Certification: PASS");
