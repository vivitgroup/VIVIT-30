import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const auth=read("lib/auth.ts"),abuse=read("lib/auth-abuse.ts"),otp=read("app/api/signup/otp/route.ts"),signup=read("app/api/signup/route.ts"),forgot=read("app/api/password/forgot/route.ts"),reset=read("app/api/password/reset/route.ts"),config=read("auth.config.ts"),proxy=read("proxy.ts");
const checks=[];const check=(name,ok)=>checks.push({name,ok:Boolean(ok)});

check("Credential login uses shared DB-backed rate limiting",auth.includes("consumeAuthRateLimit")&&auth.includes("security_login_attempt"));
check("Unknown credentials execute a dummy bcrypt path",auth.includes("dummyPasswordHash")&&auth.includes("user?.password??await dummyPasswordHash"));
check("Credential email is normalized before lookup",auth.includes("trim().toLowerCase()")&&auth.includes("encodeURIComponent(normalizedEmail)"));
check("Auth limiter serializes IP and subject counters",abuse.includes("pg_advisory_xact_lock")&&abuse.includes(":ip:")&&abuse.includes(":subject:"));
check("Auth limiter records both IP and opaque subject",abuse.includes("ipAddress:ip")&&abuse.includes("authSubject")&&abuse.includes("sha256"));

check("OTP endpoint does not expose registered-email message",!otp.includes("Email already registered"));
check("OTP endpoint has burst and hourly DB limits",otp.includes("security_signup_otp_burst")&&otp.includes("security_signup_otp_hourly"));
check("OTP issuance is serialized by email",otp.includes("signup-otp:")&&otp.includes("pg_advisory_xact_lock"));
check("OTP send is bound to the exact issued hash",otp.includes("eq(emailVerificationCodes.codeHash,codeHash)"));

check("Signup password policy is 12-128 characters",signup.includes("length<12")&&signup.includes("length>128"));
check("Signup attempts are rate limited",signup.includes("security_signup_attempt")&&signup.includes("consumeAuthRateLimit"));
check("Signup verification is serialized",signup.includes("pg_advisory_xact_lock")&&signup.includes("signup:"));
check("OTP failed-attempt mutation is compare-and-set",signup.includes("eq(emailVerificationCodes.attempts,verification.attempts)"));
check("Signup duplicate response does not expose registered email",!signup.includes('error:"Email already registered"'));
check("Signup notifications target active approved admins",signup.includes('eq(users.isActive,true)')&&signup.includes('eq(users.approvalStatus,"APPROVED")'));

check("Forgot-password response remains enumeration-safe",forgot.includes("If this email exists"));
check("Forgot-password requests are DB rate limited",forgot.includes("security_password_reset_request")&&forgot.includes("consumeAuthRateLimit"));
check("Reset-token issuance is transaction locked",forgot.includes("password-reset:")&&forgot.includes("pg_advisory_xact_lock"));
check("Undelivered reset token is revoked",forgot.includes("if(!sent)await db.delete(passwordResetTokens)"));
check("Reset tokens are single-use claimed atomically",reset.includes("isNull(passwordResetTokens.usedAt)")&&reset.includes("returning({id:passwordResetTokens.id,userId:passwordResetTokens.userId})"));
check("Password reset enforces 12-128 characters",reset.includes("password.length<12")&&reset.includes("password.length>128"));

check("Live session rejects inactive/unapproved users",config.includes('live?.is_active')&&config.includes('approval_status||"")==="APPROVED"'));
check("Password change invalidates older JWTs",config.includes("passwordChangedAt")&&config.includes("passwordChangedMs<=issuedAtMs"));
check("Mutation CSRF guard is same-origin",proxy.includes("CSRF validation failed")&&proxy.includes("sameOrigin(origin,req.url)"));
check("Cron routes require server-side secret",proxy.includes("CRON_SECRET")&&proxy.includes('pathname.startsWith("/api/cron")'));
check("Security headers include frame/content-type/HSTS",proxy.includes('X-Frame-Options')&&proxy.includes('X-Content-Type-Options')&&proxy.includes('Strict-Transport-Security'));

const failed=checks.filter(c=>!c.ok);for(const c of checks)console.log(`${c.ok?"PASS":"FAIL"}  ${c.name}`);console.log(`\n${checks.length-failed.length}/${checks.length} security/auth invariants passed.`);if(failed.length)process.exit(1);
