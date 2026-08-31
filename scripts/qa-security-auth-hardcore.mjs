import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const auth=read("lib/auth.ts"),abuse=read("lib/auth-abuse.ts"),otp=read("app/api/signup/otp/route.ts"),signup=read("app/api/signup/route.ts"),forgot=read("app/api/password/forgot/route.ts"),reset=read("app/api/password/reset/route.ts"),config=read("auth.config.ts"),proxy=read("proxy.ts"),apiGuard=read("lib/public-api-auth.ts"),apiKeysRoute=read("app/api/api-keys/route.ts"),v1Clients=read("app/api/v1/clients/route.ts"),v1Metrics=read("app/api/v1/metrics/route.ts"),v1Tasks=read("app/api/v1/tasks/route.ts"),webhooks=read("app/api/webhooks/route.ts"),oauth=read("lib/ad-oauth.ts"),oauthStart=read("app/api/ad-oauth/[platform]/start/route.ts"),oauthCallback=read("app/api/ad-oauth/[platform]/callback/route.ts");
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

check("API keys are generated with 256 bits and stored hashed",apiKeysRoute.includes('randomBytes(32)')&&apiKeysRoute.includes('createHash("sha256")')&&!apiKeysRoute.includes('keyHash:apiKeys.keyHash'));
check("API key management is Super Admin and workspace scoped",apiKeysRoute.includes('session.user.role==="SUPER_ADMIN"')&&apiKeysRoute.includes('eq(apiKeys.workspaceId,workspaceId)'));
check("Public API requires canonical Vivit key format",apiGuard.includes('KEY_RE=/^vvt_[a-f0-9]{64}$/'));
check("Public API has per-key and per-IP minute limits",apiGuard.includes('keyRows.length>=120')&&apiGuard.includes('ipRows.length>=300'));
check("Public API limiter serializes request buckets",apiGuard.includes("pg_advisory_xact_lock")&&apiGuard.includes("public-api:key:")&&apiGuard.includes("public-api:ip:"));
check("All v1 reads use the centralized API guard",[v1Clients,v1Metrics,v1Tasks].every(s=>s.includes("authenticatePublicRead")));
check("All v1 reads remain workspace scoped",v1Clients.includes("eq(clients.workspaceId,apiKey.workspaceId)")&&v1Metrics.includes("eq(mediaMetrics.workspaceId,key.workspaceId)")&&v1Tasks.includes("eq(creativeTasks.workspaceId,key.workspaceId)"));

check("Webhook management is Super Admin and workspace scoped",webhooks.includes('session.user.role==="SUPER_ADMIN"')&&webhooks.includes('eq(webhooks.workspaceId,workspaceId)'));
check("Webhook URLs require HTTPS and reject embedded credentials",webhooks.includes('u.protocol!=="https:"')&&webhooks.includes("u.username||u.password"));
check("Webhook dispatch resolves DNS and rejects private targets",webhooks.includes('lookup(u.hostname,{all:true,verbatim:true})')&&webhooks.includes("privateIp(record.address)"));
check("Webhook dispatch does not follow redirects",webhooks.includes('redirect:"manual"'));
check("Webhook retry keeps one stable delivery identity",webhooks.includes("const deliveryId=crypto.randomUUID()")&&webhooks.includes('"X-Vivit-Delivery":deliveryId'));
check("Webhook delivery identity and timestamp are HMAC-covered",webhooks.includes('body=JSON.stringify({event,timestamp,deliveryId,workspaceId,data:payload})')&&webhooks.includes('createHmac("sha256",hook.secret).update(body)'));

check("OAuth state is HMAC signed, time limited and user bound",oauth.includes('createHmac("sha256"')&&oauth.includes("10*60_000")&&oauthStart.includes("userId")&&oauthCallback.includes("state.userId!==userId"));
check("OAuth tokens use AES-256-GCM encryption",oauth.includes('createCipheriv("aes-256-gcm"')&&oauth.includes("getAuthTag")&&oauth.includes("setAuthTag"));
check("OAuth callback revalidates current client tenant and role access",oauthCallback.includes("eq(clients.workspaceId,workspaceId)")&&oauthCallback.includes("roleScope")&&oauthCallback.includes("eq(clients.isActive,true)"));
check("OAuth connection ownership is serialized per platform/account",oauthCallback.includes("oauth-connection:")&&oauthCallback.includes("pg_advisory_xact_lock"));
check("OAuth existing connection updates remain workspace and client scoped",oauthCallback.includes("eq(adPlatformConnections.workspaceId,workspaceId)")&&oauthCallback.includes("eq(adPlatformConnections.clientId,state.clientId)"));
check("OAuth connection write and audit are one DB transaction",oauthCallback.includes("db.transaction(async tx=>")&&oauthCallback.includes("tx.insert(auditLogs)"));

check("Live session rejects inactive/unapproved users",config.includes('live?.is_active')&&config.includes('approval_status||"")==="APPROVED"'));
check("Password change invalidates older JWTs",config.includes("passwordChangedAt")&&config.includes("passwordChangedMs<=issuedAtMs"));
check("Mutation CSRF guard rejects cross-site fetch metadata",proxy.includes('site==="cross-site"')&&proxy.includes("mutationCsrfValid(req)"));
check("Cookie-authenticated mutation requires an Origin",proxy.includes("hasSessionCookie(req)")&&proxy.includes("if(hasSessionCookie(req))return false"));
check("Production CSP removes unsafe-eval",proxy.includes('process.env.NODE_ENV==="production"')&&proxy.includes('?"\'self\' \'unsafe-inline\' https://fonts.googleapis.com"'));
check("CSP blocks framing, plugins and hostile base/form targets",proxy.includes("frame-ancestors 'none'")&&proxy.includes("object-src 'none'")&&proxy.includes("base-uri 'self'")&&proxy.includes("form-action 'self'"));
check("Cron routes require server-side secret",proxy.includes("CRON_SECRET")&&proxy.includes('pathname.startsWith("/api/cron")'));
check("Security headers include frame/content-type/HSTS",proxy.includes('X-Frame-Options')&&proxy.includes('X-Content-Type-Options')&&proxy.includes('Strict-Transport-Security'));

const failed=checks.filter(c=>!c.ok);for(const c of checks)console.log(`${c.ok?"PASS":"FAIL"}  ${c.name}`);console.log(`\n${checks.length-failed.length}/${checks.length} security/auth invariants passed.`);if(failed.length)process.exit(1);
