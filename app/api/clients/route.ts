export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, clients, contacts, auditLogs, users } from "@/lib/db";
import { and, eq, ilike, inArray } from "drizzle-orm";

const str = (value: any, max = 500) => String(value || "").trim().slice(0, max);
const num = (value: any) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};
const parseDate = (value: any) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value) : null;
const validEmail = (value: string) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validUrl = (value: string) => {
  if (!value) return true;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = String((session.user as any).role);
  const userId = String((session.user as any).id);
  if (!["SUPER_ADMIN", "ACCOUNT_MANAGER", "MEDIA_BUYER", "ACCOUNTANT", "CREATOR", "CLIENT"].includes(role)) return NextResponse.json({ clients: [] });

  let rows: { id: string; companyName: string }[] = [];
  if (role === "CREATOR") {
    const { creativeTasks } = await import("@/lib/db");
    const taskRows = await db.select({ clientId: creativeTasks.clientId }).from(creativeTasks).where(and(eq(creativeTasks.workspaceId, "default"), eq(creativeTasks.assignedToId, userId)));
    const ids = [...new Set(taskRows.map((task) => task.clientId))];
    rows = ids.length
      ? await db.select({ id: clients.id, companyName: clients.companyName }).from(clients).where(and(eq(clients.workspaceId, "default"), eq(clients.isActive, true), inArray(clients.id, ids)))
      : [];
  } else {
    rows = await db.select({ id: clients.id, companyName: clients.companyName }).from(clients).where(and(
      eq(clients.workspaceId, "default"),
      eq(clients.isActive, true),
      role === "ACCOUNT_MANAGER" ? eq(clients.accountManagerId, userId) :
      role === "MEDIA_BUYER" ? eq(clients.mediaBuyerId, userId) :
      role === "CLIENT" ? eq(clients.userId, userId) :
      eq(clients.workspaceId, "default"),
    ));
  }
  return NextResponse.json({ clients: rows });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = String((session.user as any).role);
  const userId = String((session.user as any).id);
  if (!["SUPER_ADMIN", "ACCOUNT_MANAGER", "ACCOUNTANT"].includes(role)) return NextResponse.json({ error: "You do not have permission to add clients." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  const companyName = str(body.companyName, 160);
  if (companyName.length < 2) return NextResponse.json({ error: "Company name is required." }, { status: 400 });

  const website = str(body.website, 500);
  const metaAdsLink = str(body.metaAdsLink, 500);
  const tiktokAdsLink = str(body.tiktokAdsLink, 500);
  const snapchatAdsLink = str(body.snapchatAdsLink, 500);
  const googleAdsLink = str(body.googleAdsLink, 500);
  if (![website, metaAdsLink, tiktokAdsLink, snapchatAdsLink, googleAdsLink].every(validUrl)) {
    return NextResponse.json({ error: "Website and advertising links must use valid http or https URLs." }, { status: 400 });
  }

  const contactEmail = str(body.contactEmail, 254).toLowerCase();
  if (!validEmail(contactEmail)) return NextResponse.json({ error: "Enter a valid contact email." }, { status: 400 });
  const contractStart = parseDate(body.contractStart);
  const contractEnd = parseDate(body.contractEnd);
  if (body.contractStart && !contractStart || body.contractEnd && !contractEnd) return NextResponse.json({ error: "Enter valid contract dates." }, { status: 400 });
  if (contractStart && contractEnd && contractEnd < contractStart) return NextResponse.json({ error: "Contract end date cannot be before the start date." }, { status: 400 });

  const duplicate = await db.select({ id: clients.id }).from(clients).where(and(eq(clients.workspaceId, "default"), ilike(clients.companyName, companyName))).limit(1);
  if (duplicate[0]) return NextResponse.json({ error: "A client with this company name already exists.", clientId: duplicate[0].id }, { status: 409 });

  const canSetupMarketing = role !== "ACCOUNTANT";
  const portalUserId = canSetupMarketing ? str(body.portalUserId, 80) || null : null;
  if (portalUserId) {
    const [portalUser] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, portalUserId), eq(users.role, "CLIENT"), eq(users.isActive, true))).limit(1);
    if (!portalUser) return NextResponse.json({ error: "Choose a valid active client portal user." }, { status: 400 });
    const existingLink = await db.select({ id: clients.id }).from(clients).where(and(eq(clients.workspaceId, "default"), eq(clients.userId, portalUserId))).limit(1);
    if (existingLink[0]) return NextResponse.json({ error: "This portal user is already linked to another client." }, { status: 409 });
  }

  const accountManagerId = canSetupMarketing ? (role === "ACCOUNT_MANAGER" ? userId : str(body.accountManagerId, 80) || null) : null;
  const mediaBuyerId = canSetupMarketing ? str(body.mediaBuyerId, 80) || null : null;
  if (accountManagerId) {
    const [manager] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, accountManagerId), eq(users.role, "ACCOUNT_MANAGER"), eq(users.isActive, true))).limit(1);
    if (!manager) return NextResponse.json({ error: "Choose a valid active account manager." }, { status: 400 });
  }
  if (mediaBuyerId) {
    const [buyer] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, mediaBuyerId), eq(users.role, "MEDIA_BUYER"), eq(users.isActive, true))).limit(1);
    if (!buyer) return NextResponse.json({ error: "Choose a valid active media buyer." }, { status: 400 });
  }

  const [client] = await db.insert(clients).values({
    workspaceId: "default",
    companyName,
    industry: str(body.industry, 100) || null,
    website: website || null,
    monthlyRetainer: num(body.monthlyRetainer),
    mediaBudget: canSetupMarketing ? num(body.mediaBudget) : 0,
    contractValue: num(body.contractValue),
    userId: portalUserId,
    accountManagerId,
    mediaBuyerId,
    metaAdsLink: canSetupMarketing ? metaAdsLink || null : null,
    tiktokAdsLink: canSetupMarketing ? tiktokAdsLink || null : null,
    snapchatAdsLink: canSetupMarketing ? snapchatAdsLink || null : null,
    googleAdsLink: canSetupMarketing ? googleAdsLink || null : null,
    internalNotes: canSetupMarketing ? str(body.internalNotes, 2000) || null : null,
    contractStart,
    contractEnd,
  } as any).returning();

  if (str(body.contactName, 160)) {
    await db.insert(contacts).values({
      clientId: client.id,
      name: str(body.contactName, 160),
      title: str(body.contactTitle, 120) || null,
      email: contactEmail || null,
      phone: str(body.contactPhone, 60) || null,
      whatsapp: str(body.contactPhone, 60) || null,
      isPrimary: true,
    } as any);
  }

  await db.insert(auditLogs).values({ userId, action: "client_created", entity: "Client", entityId: client.id, newValues: JSON.stringify({ companyName }) } as any);
  return NextResponse.json({ success: true, clientId: client.id }, { status: 201 });
}
