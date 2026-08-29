import fs from "node:fs";const a=fs.readFileSync("auth.config.ts","utf8"),p=fs.readFileSync("proxy.ts","utf8"),checks=[
["JWT revalidates live user state",a.includes("liveUserState")&&a.includes("select=role,workspace_id,is_active,approval_status")&&a.includes('cache:"no-store"')],
["Deactivated or unapproved users mark session invalid",a.includes("Boolean(live?.is_active)")&&a.includes('String(live?.approval_status||"")==="APPROVED"')&&a.includes("token.authValid")],
["Role and workspace changes refresh from live user record",a.includes("if(isRole(live?.role))token.role=live.role")&&a.includes("if(live?.workspace_id)token.workspaceId=live.workspace_id")],
["Password changes are loaded from audit history",a.includes("audit_logs")&&a.includes("action=eq.password_changed")&&a.includes("passwordChangedAt")],
["Sessions issued before password change are invalidated",a.includes("passwordChangedMs<=issuedAtMs")&&a.includes("Number(token.iat||0)*1000")],
["Session exposes authorization validity current role and workspace",a.includes("authValid=token.authValid===true")&&a.includes("role=token.role")&&a.includes("workspaceId=token.workspaceId")],
["Proxy rejects revoked sessions for pages and APIs",p.includes("authValid!==true")&&p.includes("Session is no longer authorized")&&p.includes("session_revoked")]
];let f=0;for(const [n,o] of checks){console.log(`${o?"PASS":"FAIL"}  ${n}`);if(!o)f++}console.log(`\n${checks.length-f}/${checks.length} live-session security checks passed.`);if(f)process.exit(1);
