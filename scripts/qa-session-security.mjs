import fs from "node:fs";const a=fs.readFileSync("auth.config.ts","utf8"),p=fs.readFileSync("proxy.ts","utf8"),checks=[
["JWT revalidates live user state",a.includes("liveUserState")&&a.includes("select=role,is_active")&&a.includes('cache:"no-store"')],
["Deactivated users mark session invalid",a.includes("token.authValid=Boolean(live?.is_active)")],
["Role changes refresh from live user record",a.includes("if(live?.role)token.role=live.role")],
["Session exposes authorization validity and current role",a.includes("authValid=token.authValid===true")&&a.includes("role=token.role")],
["Proxy rejects revoked sessions for pages and APIs",p.includes("authValid!==true")&&p.includes("Session is no longer authorized")&&p.includes("session_revoked")]
];let f=0;for(const [n,o] of checks){console.log(`${o?"PASS":"FAIL"}  ${n}`);if(!o)f++}console.log(`\n${checks.length-f}/${checks.length} live-session security checks passed.`);if(f)process.exit(1);
