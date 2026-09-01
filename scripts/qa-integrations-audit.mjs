import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const checks=[];
const check=(name,ok)=>checks.push({name,ok:Boolean(ok)});

const env=read('.env.example');
const oauth=read('lib/ad-oauth.ts');
const oauthStart=read('app/api/ad-oauth/[platform]/start/route.ts');
const oauthCallback=read('app/api/ad-oauth/[platform]/callback/route.ts');
const cron=read('app/api/cron/media-sync/route.ts');
const webhooks=read('app/api/webhooks/route.ts');
const whatsapp=read('app/api/whatsapp-templates/route.ts');

check('CRON_SECRET example has no reusable default', /CRON_SECRET=""/.test(env) && !env.includes('vivit-cron-secret-2025'));
check('OAuth encryption uses dedicated key only', oauth.includes('process.env.OAUTH_ENCRYPTION_KEY||""') && !oauth.includes('process.env.OAUTH_ENCRYPTION_KEY||process.env.AUTH_SECRET'));
check('OAuth encryption key minimum is enforced in every environment', oauth.includes('if(secret.length<32)throw new Error("OAuth encryption secret is too short")'));
check('OAuth tokens use authenticated AES-256-GCM', oauth.includes('createCipheriv("aes-256-gcm"') && oauth.includes('getAuthTag()') && oauth.includes('setAuthTag('));
check('OAuth state is HMAC signed', oauth.includes('createHmac("sha256",key()).update(payload)'));
check('OAuth state comparison is timing safe', oauth.includes('crypto.timingSafeEqual'));
check('OAuth state has bounded lifetime', oauth.includes('Date.now()+10*60_000') && oauth.includes('state.exp<Date.now()'));
check('OAuth provider requests have timeout', oauth.includes('AbortSignal.timeout(10000)'));
check('OAuth start has provider allowlist', oauthStart.includes('const allowed=["META","TIKTOK","GOOGLE","SNAPCHAT","LINKEDIN"]'));
check('OAuth start is role gated', oauthStart.includes('SUPER_ADMIN') && oauthStart.includes('MEDIA_BUYER') && oauthStart.includes('ACCOUNT_MANAGER'));
check('OAuth start is workspace and active-client scoped', oauthStart.includes('eq(clients.workspaceId,workspaceId)') && oauthStart.includes('eq(clients.isActive,true)'));
check('OAuth callback binds state to current user and platform', oauthCallback.includes('state.platform!==platform||state.userId!==userId'));
check('OAuth callback rechecks workspace and active-client access', oauthCallback.includes('eq(clients.workspaceId,workspaceId)') && oauthCallback.includes('eq(clients.isActive,true)'));
check('OAuth callback blocks cross-tenant ad-account reassignment', oauthCallback.includes('already connected outside this client workspace'));
check('OAuth callback stores encrypted tokens', oauthCallback.includes('encryptToken(tokens.accessToken)') && oauthCallback.includes('encryptToken(tokens.refreshToken)'));
check('Media cron fails closed without CRON_SECRET', cron.includes('process.env.CRON_SECRET') && cron.includes('if(!expected||bearer!==expected)'));
check('Media cron validates connection workspace/client/platform', cron.includes('connection.workspaceId!==c.workspaceId') && cron.includes('connection.clientId!==c.clientId') && cron.includes('connection.platform!==c.platform'));
check('Media cron retries rate limits with backoff', cron.includes('syncWithRetry') && cron.includes('isRateLimit') && cron.includes('Math.pow(2,attempt)'));
check('Webhook management is Super Admin only', webhooks.includes('session.user.role==="SUPER_ADMIN"'));
check('Webhook management is workspace scoped', webhooks.includes('eq(webhooks.workspaceId,workspaceId)'));
check('Webhook targets require public HTTPS', webhooks.includes('u.protocol!=="https:"') && webhooks.includes('lookup(u.hostname') && webhooks.includes('privateIp(record.address)'));
check('Webhook redirects are disabled', webhooks.includes('redirect:"manual"'));
check('Webhook deliveries are signed and identifiable', webhooks.includes('createHmac("sha256",hook.secret)') && webhooks.includes('X-Vivit-Signature') && webhooks.includes('X-Vivit-Delivery') && webhooks.includes('X-Vivit-Timestamp'));
check('Webhook deliveries have timeout and retries', webhooks.includes('AbortSignal.timeout(5000)') && webhooks.includes('attempt<3'));
check('WhatsApp send is authenticated and role gated', whatsapp.includes('allowedRoles=["SUPER_ADMIN","ACCOUNT_MANAGER","SALES"]') && whatsapp.includes('await auth()'));
check('WhatsApp client association is workspace scoped', whatsapp.includes('eq(clients.workspaceId,workspaceId)') && whatsapp.includes('eq(clients.isActive,true)'));
check('WhatsApp provider request has timeout', whatsapp.includes('AbortSignal.timeout(10000)'));
check('WhatsApp message state is workspace scoped', whatsapp.includes('eq(whatsappMessages.workspaceId,input.workspaceId)'));

const failed=checks.filter((x)=>!x.ok);
for(const item of checks) console.log(`${item.ok?'PASS':'FAIL'}  ${item.name}`);
console.log(`\n${checks.length-failed.length}/${checks.length} Integration Audit contract checks passed.`);
if(failed.length) process.exit(1);
