import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(f)=>fs.readFileSync(path.join(root,f),'utf8');
const checks=[];
const check=(name,ok)=>checks.push({name,ok:!!ok});

const oauth=read('lib/ad-oauth.ts');
const oauthStart=read('app/api/ad-oauth/[platform]/start/route.ts');
const oauthCb=read('app/api/ad-oauth/[platform]/callback/route.ts');
const cron=read('app/api/cron/media-sync/route.ts');
const platforms=read('lib/ad-platforms.ts');
const media=read('app/api/media-control-v2/route.ts');
const setup=read('MEDIA-INTEGRATION-SETUP.md');

const providers=['META','TIKTOK','GOOGLE','SNAPCHAT','LINKEDIN'];
for(const p of providers) check(`Provider supported: ${p}`,oauth.includes(`\"${p}\"`)&&oauthStart.includes(`\"${p}\"`));

check('OAuth start requires authenticated session',oauthStart.includes('if(!session?.user)'));
check('OAuth start requires workspace context',oauthStart.includes('workspace-missing'));
check('OAuth start restricts roles',oauthStart.includes('SUPER_ADMIN')&&oauthStart.includes('MEDIA_BUYER')&&oauthStart.includes('ACCOUNT_MANAGER'));
check('OAuth start scopes active client ownership',oauthStart.includes('eq(clients.workspaceId,workspaceId)')&&oauthStart.includes('eq(clients.isActive,true)')&&oauthStart.includes('clients.mediaBuyerId')&&oauthStart.includes('clients.accountManagerId'));
check('Unsupported providers fail closed',oauthStart.includes('Unsupported platform'));
check('Missing provider config fails closed',oauthStart.includes('oauthConfigured(platform)')&&oauthStart.includes('oauth=missing'));
check('OAuth state is signed and short lived',oauth.includes('createHmac("sha256"')&&oauth.includes('Date.now()+10*60_000')&&oauth.includes('OAuth request expired'));
check('OAuth callback binds state to browser cookie',oauthCb.includes('timingSafeEqual')&&oauthCb.includes('browserState')&&oauthCb.includes('was already consumed'));
check('OAuth callback revalidates workspace/client access',oauthCb.includes('eq(clients.workspaceId,workspaceId)')&&oauthCb.includes('eq(clients.isActive,true)')&&oauthCb.includes('Client access changed or the client was archived'));
check('OAuth callback prevents cross-workspace account reassignment',oauthCb.includes('already connected outside this client workspace'));
check('OAuth callback serializes account connection changes',oauthCb.includes('pg_advisory_xact_lock')&&oauthCb.includes('oauth-connection:'));
check('OAuth access and refresh tokens are encrypted before storage',oauthCb.includes('encryptToken(tokens.accessToken)')&&oauthCb.includes('encryptToken(tokens.refreshToken)'));
check('Token encryption uses AES-256-GCM',oauth.includes('aes-256-gcm')&&oauth.includes('getAuthTag')&&oauth.includes('setAuthTag'));
check('Encryption secret requires minimum length',oauth.includes('secret.length<32'));
check('Token refresh update is workspace scoped',oauth.includes('eq(adPlatformConnections.workspaceId,connection.workspaceId)'));
check('Provider token exchange has network timeout',oauth.includes('AbortSignal.timeout(10000)'));
check('Production OAuth base URL requires public HTTPS',oauth.includes('OAuth application URL must be a public HTTPS origin in production'));
check('All documented callbacks are server routes',providers.every(p=>setup.includes(`/api/ad-oauth/${p.toLowerCase()}/callback`)));
check('Cron requires bearer CRON_SECRET',cron.includes('process.env.CRON_SECRET')&&cron.includes('bearer!==expected')&&cron.includes('Unauthorized'));
check('Cron only syncs active clients',cron.includes('eq(clients.isActive,true)'));
check('Cron excludes archived campaigns',cron.includes('archived_at is null'));
check('Cron validates exact connection workspace/client/platform',cron.includes('connection.workspaceId!==c.workspaceId')&&cron.includes('connection.clientId!==c.clientId')&&cron.includes('connection.platform!==c.platform'));
check('Cron has rate-limit retry/backoff',cron.includes('syncWithRetry')&&cron.includes('isRateLimit')&&cron.includes('Math.pow(2,attempt)'));
check('Campaign sync supports all five providers',providers.every(p=>platforms.includes(`case\"${p}\"`))||providers.every(p=>platforms.includes(`case"${p}"`)));
check('Unsupported campaign provider fails closed',platforms.includes('Unsupported platform'));
check('Media Control enforces authorized roles',media.includes('SUPER_ADMIN')&&media.includes('MEDIA_BUYER')&&media.includes('ACCOUNT_MANAGER'));
check('Media Control scopes active clients to workspace',media.includes('eq(clients.workspaceId,workspaceId)')&&media.includes('eq(clients.isActive,true)'));
check('Media Control uses connectionAccessToken',media.includes('connectionAccessToken'));

const failed=checks.filter(c=>!c.ok);
for(const c of checks) console.log(`${c.ok?'PASS':'FAIL'}  ${c.name}`);
console.log(`\n${checks.length-failed.length}/${checks.length} Stage 5 integration checks passed.`);
if(failed.length) process.exit(1);
