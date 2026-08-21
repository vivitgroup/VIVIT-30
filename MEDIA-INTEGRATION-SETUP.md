# VIVIT Media OAuth Setup

VIVIT ERP includes OAuth connect buttons, encrypted token storage, refresh-token handling, campaign sync, daily cron sync, and performance alerts. Users never enter advertising passwords or access tokens in the ERP.

## Shared Vercel settings

- `NEXTAUTH_URL=https://YOUR-DOMAIN.vercel.app`
- `OAUTH_ENCRYPTION_KEY=` a new random secret of at least 32 characters
- `CRON_SECRET=` a separate random secret

Do not change `OAUTH_ENCRYPTION_KEY` after accounts are connected, or stored tokens cannot be decrypted.

## Developer applications

Create one developer application in every required platform and add the exact callback URL shown below. Add its Client ID and Client Secret to Vercel.

### Meta

- Callback: `https://YOUR-DOMAIN.vercel.app/api/ad-oauth/meta/callback`
- Variables: `META_CLIENT_ID`, `META_CLIENT_SECRET`, `META_GRAPH_VERSION`
- Request Marketing API access and the required `ads_read`, `ads_management`, and `business_management` permissions.

### TikTok

- Callback: `https://YOUR-DOMAIN.vercel.app/api/ad-oauth/tiktok/callback`
- Variables: `TIKTOK_CLIENT_ID`, `TIKTOK_CLIENT_SECRET`
- Request TikTok API for Business / Marketing API access.

### Google Ads

- Callback: `https://YOUR-DOMAIN.vercel.app/api/ad-oauth/google/callback`
- Variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_LOGIN_CUSTOMER_ID`, `GOOGLE_ADS_VERSION`
- Enable Google Ads API and configure an OAuth Web Application.

### Snapchat

- Callback: `https://YOUR-DOMAIN.vercel.app/api/ad-oauth/snapchat/callback`
- Variables: `SNAPCHAT_CLIENT_ID`, `SNAPCHAT_CLIENT_SECRET`
- Enable Snapchat Marketing API access.

### LinkedIn

- Callback: `https://YOUR-DOMAIN.vercel.app/api/ad-oauth/linkedin/callback`
- Variables: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_VERSION`
- Apply for Advertising API and Reporting access.

## Usage

1. Open Platform Sync.
2. Select the client and platform and enter the platform Ad Account ID.
3. Press **Connect securely** and approve access on the platform.
4. Link a campaign in Media Control, then press **Sync now**.
5. The protected daily cron imports recent results and creates CPL, ROAS, CTR, no-results-spend, and creative-fatigue alerts.

Never commit real secrets to GitHub. Store them only in Vercel Environment Variables.
