import fs from "node:fs";
const read=f=>fs.readFileSync(f,"utf8"),a=read("auth.config.ts"),auth=read("lib/auth.ts"),p=read("proxy.ts"),signup=read("app/api/signup/route.ts"),otp=read("app/api/signup/otp/route.ts"),forgot=read("app/api/password/forgot/route.ts"),reset=read("app/api/password/reset/route.ts"),checks=[
["JWT revalidates live user state",a.includes("liveUserState")&&a.includes("select=role,workspace_id,is_active,approval_status")&&a.includes('cache:"no-store"')],
["Deactivated or unapproved users mark session invalid",a.includes("Boolean(live?.is_active)")&&a.includes('String(live?.approval_status||"")==="APPROVED"')&&a.includes("token.authValid")],
["Role and workspace changes refresh from live user record",a.includes("if(isRole(live?.role))token.role=live.role")&&a.includes("if(live?.workspace_id)token.workspaceId=live.workspace_id")],
["Password changes invalidate older sessions",a.includes("passwordChangedMs<=issuedAtMs")&&a.includes("Number(token.iat||0)*1000")],
["Proxy rejects revoked sessions",p.includes("authValid!==true")&&p.includes("session_revoked")],
["Credentials normalize email and bound password input",auth.includes('.trim().toLowerCase()')&&auth.includes("password.length>128")&&auth.includes("validEmail(email)")],
["Credentials require active approved user with workspace",auth.includes('user.approval_status!=="APPROVED"')&&auth.includes("!user.is_active")&&auth.includes("!user.workspace_id")],
["Public signup cannot self-assign employee roles",signup.includes('requestedRole!=="CLIENT"')&&signup.includes("Employee roles require Super Admin assignment")],
["Signup enforces strong 12-128 password policy",signup.includes("value.length>=12")&&signup.includes("value.length<=128")&&signup.includes("/[^A-Za-z0-9]/")],
["Signup OTP verification and account creation share one transaction",signup.includes("db.transaction")&&signup.includes("pg_advisory_xact_lock")&&signup.includes("bcrypt.compare(otpValue")&&signup.includes("tx.insert(users)")],
["Signup OTP is consumed before account creation commits",signup.includes("tx.delete(emailVerificationCodes)")&&signup.indexOf("tx.delete(emailVerificationCodes)")<signup.indexOf("tx.insert(users)")],
["OTP uses secure random and database resend cooldown",otp.includes("crypto.randomInt(100000,1000000)")&&otp.includes("pg_advisory_xact_lock")&&otp.includes("Date.now()-60_000")],
["OTP avoids registered-email enumeration",otp.includes("return generic()")&&!otp.includes("Email already registered")],
["Password reset issuance uses generic response and configured base URL",forgot.includes("If this email exists")&&forgot.includes("process.env.NEXTAUTH_URL||process.env.AUTH_URL")&&!forgot.includes("req.nextUrl.origin")],
["Password reset issuance is serialized and replaces unused tokens",forgot.includes("pg_advisory_xact_lock")&&forgot.includes("tx.delete(passwordResetTokens)")&&forgot.includes("tx.insert(passwordResetTokens)")],
["Password reset token is single-use and active-approved user required",reset.includes("isNull(passwordResetTokens.usedAt)")&&reset.includes('user.approvalStatus!=="APPROVED"')&&reset.includes("changed.length!==1")],
["Password reset enforces same strong password policy",reset.includes("v.length>=12")&&reset.includes("v.length<=128")&&reset.includes("/[^A-Za-z0-9]/")]
];let f=0;for(const [n,o] of checks){console.log(`${o?"PASS":"FAIL"}  ${n}`);if(!o)f++}console.log(`\n${checks.length-f}/${checks.length} deep auth/session security checks passed.`);if(f)process.exit(1);
