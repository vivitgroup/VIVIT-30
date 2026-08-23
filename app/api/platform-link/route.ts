export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  db, clients, adPlatformConnections, adCampaigns, adPerformanceDaily, auditLogs,
} from "@/lib/db";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { platformConfigured, syncCampaign } from "@/lib/ad-platforms";
import { connectionAccessToken, oauthConfigured } from "@/lib/ad-oauth";

const ALLOWED = ["SUPER_ADMIN", "MEDIA_BUYER"];
const PLATFORMS = ["META", "TIKTOK"] as const;

type Platform = typeof PLATFORMS[number];

async function ctx() {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  const userId = (session?.user as any)?.id as string | undefined;
  if (!session?.user || !role || !userId || !ALLOWED.includes(role)) return null;
  const owned = await db.select({ id: clients.id, name: clients.companyName })
    .from(clients)
    .where(and(
      eq(clients.isActive, true),
      role === "MEDIA_BUYER" ? eq(clients.mediaBuyerId, userId) : eq(clients.workspaceId, "default"),
    ));
  return { role, userId, clients: owned, clientIds: owned.map(x => x.id) };
}

function cleanId(value: unknown, label: string) {
  const s = String(value || "").trim().replace(/\s+/g, "");
  if (!/^\d{5,30}$/.test(s)) throw new Error(`${label} must be a numeric ID`);
  return s;
}

async function writeDays(campaignId: string, days: any[]) {
  for (const day of days) {
    const date = new Date(`${day.date}T00:00:00Z`);
    await db.delete(adPerformanceDaily).where(and(
      eq(adPerformanceDaily.campaignId, campaignId),
      eq(adPerformanceDaily.date, date),
      eq(adPerformanceDaily.breakdownType, "TOTAL"),
      isNull(adPerformanceDaily.adId),
    ));
    const spend = Number(day.spend || 0), results = Number(day.results || 0), revenue = Number(day.revenue || 0);
    const clicks = Number(day.clicks || 0), impressions = Number(day.impressions || 0);
    await db.insert(adPerformanceDaily).values({
      campaignId,
      date,
      spend,
      impressions,
      reach: Number(day.reach || 0),
      clicks,
      results,
      purchases: Number(day.purchases || 0),
      revenue,
      frequency: Number(day.frequency || 0),
      ctr: impressions ? clicks / impressions * 100 : 0,
      cpc: clicks ? spend / clicks : 0,
      cpm: impressions ? spend / impressions * 1000 : 0,
      cpl: results ? spend / results : 0,
      roas: spend ? revenue / spend : 0,
    } as any);
  }
}

export async function GET() {
  const c = await ctx();
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!c.clientIds.length) return NextResponse.json({ clients: [], accounts: [], campaigns: [], configured: {} });
  const accounts = await db.select({
    id: adPlatformConnections.id,
    clientId: adPlatformConnections.clientId,
    platform: adPlatformConnections.platform,
    adAccountId: adPlatformConnections.adAccountId,
    accountName: adPlatformConnections.accountName,
    status: adPlatformConnections.status,
    lastSyncAt: adPlatformConnections.lastSyncAt,
    syncError: adPlatformConnections.syncError,
  }).from(adPlatformConnections).where(inArray(adPlatformConnections.clientId, c.clientIds)).orderBy(desc(adPlatformConnections.updatedAt));
  const campaigns = await db.select().from(adCampaigns).where(inArray(adCampaigns.clientId, c.clientIds)).orderBy(desc(adCampaigns.updatedAt));
  return NextResponse.json({
    clients: c.clients,
    accounts,
    campaigns,
    configured: {
      META: platformConfigured("META") || oauthConfigured("META"),
      TIKTOK: platformConfigured("TIKTOK") || oauthConfigured("TIKTOK"),
    },
  });
}

export async function POST(req: NextRequest) {
  const c = await ctx();
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const op = String(body.op || "link");

  if (op === "link") {
    try {
      const platform = String(body.platform || "").toUpperCase() as Platform;
      if (!PLATFORMS.includes(platform)) return NextResponse.json({ error: "Only Meta and TikTok are supported here." }, { status: 400 });
      const clientId = String(body.clientId || "");
      if (!c.clientIds.includes(clientId)) return NextResponse.json({ error: "Client access denied" }, { status: 403 });
      const adAccountId = cleanId(body.adAccountId, platform === "META" ? "Ad Account ID" : "Advertiser ID");
      const campaignExternalId = cleanId(body.campaignId, "Campaign ID");

      let connection = (await db.select().from(adPlatformConnections).where(and(
        eq(adPlatformConnections.platform, platform),
        eq(adPlatformConnections.adAccountId, adAccountId),
      )).limit(1))[0];

      if (connection && connection.clientId && connection.clientId !== clientId) {
        return NextResponse.json({ error: "This ad account is already linked to another client." }, { status: 409 });
      }

      if (!connection) {
        [connection] = await db.insert(adPlatformConnections).values({
          clientId,
          platform,
          adAccountId,
          accountName: String(body.accountName || "").trim().slice(0, 120) || null,
          status: platformConfigured(platform) ? "CONNECTED" : "ID_LINKED",
          createdBy: c.userId,
        } as any).returning();
      } else {
        [connection] = await db.update(adPlatformConnections).set({
          clientId,
          accountName: String(body.accountName || connection.accountName || "").trim().slice(0, 120) || null,
          status: connection.accessTokenEncrypted || platformConfigured(platform) ? "CONNECTED" : "ID_LINKED",
          syncError: null,
          updatedAt: new Date(),
        } as any).where(eq(adPlatformConnections.id, connection.id)).returning();
      }

      let campaign = (await db.select().from(adCampaigns).where(and(
        eq(adCampaigns.platform, platform), eq(adCampaigns.externalId, campaignExternalId),
      )).limit(1))[0];

      if (campaign && campaign.clientId !== clientId) {
        return NextResponse.json({ error: "This campaign ID is already linked to another client." }, { status: 409 });
      }

      if (!campaign) {
        [campaign] = await db.insert(adCampaigns).values({
          clientId,
          connectionId: connection.id,
          platform,
          externalId: campaignExternalId,
          name: String(body.campaignName || `${platform} Campaign ${campaignExternalId}`).trim().slice(0, 160),
          objective: String(body.objective || "LEADS").slice(0, 40),
          createdBy: c.userId,
        } as any).returning();
      } else {
        [campaign] = await db.update(adCampaigns).set({
          connectionId: connection.id,
          name: String(body.campaignName || campaign.name).trim().slice(0, 160),
          updatedAt: new Date(),
        } as any).where(eq(adCampaigns.id, campaign.id)).returning();
      }

      let sync: any = { attempted: false, ok: false };
      if (body.syncNow !== false && (connection.accessTokenEncrypted || platformConfigured(platform))) {
        sync.attempted = true;
        const accessToken = connection.accessTokenEncrypted ? await connectionAccessToken(connection) : "";
        const end = new Date(), start = new Date(Date.now() - 30 * 86400000);
        const iso = (d: Date) => d.toISOString().slice(0, 10);
        try {
          const result = await syncCampaign({
            platform,
            campaignId: campaignExternalId,
            adAccountId,
            accessToken,
            start: iso(start), end: iso(end),
          });
          await writeDays(campaign.id, result.days);
          [campaign] = await db.update(adCampaigns).set({
            name: result.name || campaign.name,
            status: result.status || campaign.status,
            lastSyncAt: new Date(), updatedAt: new Date(),
          } as any).where(eq(adCampaigns.id, campaign.id)).returning();
          await db.update(adPlatformConnections).set({ lastSyncAt: new Date(), status: "CONNECTED", syncError: null, updatedAt: new Date() } as any).where(eq(adPlatformConnections.id, connection.id));
          sync = { attempted: true, ok: true, days: result.days.length };
        } catch (error: any) {
          const message = String(error?.message || "Platform sync failed").slice(0, 500);
          await db.update(adPlatformConnections).set({ syncError: message, updatedAt: new Date() } as any).where(eq(adPlatformConnections.id, connection.id));
          sync = { attempted: true, ok: false, error: message };
        }
      }

      await db.insert(auditLogs).values({
        userId: c.userId,
        action: "platform_campaign_linked",
        entity: "ad_campaigns",
        entityId: campaign.id,
        newValues: JSON.stringify({ platform, adAccountId, campaignId: campaignExternalId, sync }),
      } as any);

      return NextResponse.json({ success: true, account: { ...connection, accessTokenEncrypted: undefined, refreshTokenEncrypted: undefined }, campaign, sync });
    } catch (error: any) {
      return NextResponse.json({ error: String(error?.message || "Could not link campaign") }, { status: 400 });
    }
  }

  if (op === "sync") {
    const campaignId = String(body.internalCampaignId || "");
    const campaign = (await db.select().from(adCampaigns).where(eq(adCampaigns.id, campaignId)).limit(1))[0];
    if (!campaign || !c.clientIds.includes(campaign.clientId)) return NextResponse.json({ error: "Campaign access denied" }, { status: 403 });
    const connection = campaign.connectionId
      ? (await db.select().from(adPlatformConnections).where(eq(adPlatformConnections.id, campaign.connectionId)).limit(1))[0]
      : undefined;
    if (!connection) return NextResponse.json({ error: "Ad account is not linked." }, { status: 400 });
    if (!connection.accessTokenEncrypted && !platformConfigured(campaign.platform)) return NextResponse.json({ error: "API credentials are not configured yet." }, { status: 400 });
    try {
      const accessToken = connection.accessTokenEncrypted ? await connectionAccessToken(connection) : "";
      const end = new Date(), start = new Date(Date.now() - 30 * 86400000), iso = (d: Date) => d.toISOString().slice(0, 10);
      const result = await syncCampaign({ platform: campaign.platform, campaignId: campaign.externalId, adAccountId: connection.adAccountId, accessToken, start: iso(start), end: iso(end) });
      await writeDays(campaign.id, result.days);
      await db.update(adCampaigns).set({ name: result.name || campaign.name, status: result.status || campaign.status, lastSyncAt: new Date(), updatedAt: new Date() } as any).where(eq(adCampaigns.id, campaign.id));
      await db.update(adPlatformConnections).set({ lastSyncAt: new Date(), status: "CONNECTED", syncError: null, updatedAt: new Date() } as any).where(eq(adPlatformConnections.id, connection.id));
      return NextResponse.json({ success: true, days: result.days.length });
    } catch (error: any) {
      const message = String(error?.message || "Sync failed").slice(0, 500);
      await db.update(adPlatformConnections).set({ syncError: message, updatedAt: new Date() } as any).where(eq(adPlatformConnections.id, connection.id));
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Unknown operation" }, { status: 400 });
}
