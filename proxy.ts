import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { NextResponse } from "next/server";

function secHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(),microphone=(),geolocation=()");
  res.headers.set("X-Robots-Tag", "noindex,nofollow");
  res.headers.set("Content-Security-Policy", "default-src 'self';script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com;style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;font-src 'self' https://fonts.gstatic.com;img-src 'self' data: blob: https:;connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.resend.com https://graph.facebook.com https://www.facebook.com;frame-ancestors 'none';");
  if (process.env.NODE_ENV === "production") res.headers.set("Strict-Transport-Security", "max-age=31536000;includeSubDomains");
  return res;
}
function corsHeaders(res: NextResponse, origin: string | null): NextResponse {
  const allowed = (process.env.ALLOWED_ORIGINS ?? "*").split(",").map(v=>v.trim());
  if (origin && (allowed.includes("*") || allowed.includes(origin))) res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type,X-API-Key,Authorization");
  res.headers.set("Access-Control-Max-Age", "86400");
  return res;
}
const { auth } = NextAuth(authConfig);
export default auth((req) => {
  const { pathname } = req.nextUrl, session=req.auth, origin=req.headers.get("origin");
  if (req.method === "OPTIONS" && pathname.startsWith("/api/v1")) return corsHeaders(new NextResponse(null,{status:204}),origin);
  if (["POST","PUT","DELETE","PATCH"].includes(req.method)) {
    const host=req.headers.get("host");
    if(origin&&host&&!origin.includes(host)&&!pathname.startsWith("/api/v1")&&!pathname.startsWith("/api/auth")) return new NextResponse("CSRF validation failed",{status:403});
  }
  if(pathname.startsWith("/api/cron")){
    const bearer=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
    const secret=req.headers.get("x-cron-secret")??bearer??req.nextUrl.searchParams.get("secret"),expected=process.env.CRON_SECRET;
    if(!expected||secret!==expected)return NextResponse.json({error:"Unauthorized"},{status:401});
  }
  const publicExact=["/","/login","/signup","/forgot-password","/reset-password","/robots.txt","/sitemap.xml"],publicPrefixes=["/api/auth","/api/health","/api/signup","/api/password","/approve/","/api/v1/"];
  if(publicExact.includes(pathname)||publicPrefixes.some(p=>pathname.startsWith(p))){const res=NextResponse.next();secHeaders(res);if(pathname.startsWith("/api/v1"))corsHeaders(res,origin);return res;}
  if(!session){if(pathname.startsWith("/api/"))return secHeaders(NextResponse.json({error:"Unauthorized"},{status:401}));const loginUrl=new URL("/login",req.url);loginUrl.searchParams.set("callbackUrl",pathname);return NextResponse.redirect(loginUrl);}
  const role=(session.user as any)?.role;
  if(pathname.startsWith("/api/ad-oauth")&&!["SUPER_ADMIN","MEDIA_BUYER"].includes(role))return NextResponse.json({error:"Forbidden"},{status:403});
  if(pathname==="/dashboard"){
    const homes:Record<string,string>={CLIENT:"/dashboard/portal",CREATOR:"/dashboard/creative",ACCOUNTANT:"/dashboard/finance",MEDIA_BUYER:"/dashboard/media/control-center",SALES:"/dashboard/sales",ACCOUNT_MANAGER:"/dashboard/clients"};
    if(homes[role])return NextResponse.redirect(new URL(homes[role],req.url));
  }
  const pageAccess:[string,string[]][]=[
    ["/dashboard/settings",["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","ACCOUNTANT","SALES","CLIENT"]],
    ["/dashboard/archive",["SUPER_ADMIN","ACCOUNT_MANAGER","SALES"]],
    ["/dashboard/team",["SUPER_ADMIN"]],["/dashboard/workspace",["SUPER_ADMIN"]],["/dashboard/activity",["SUPER_ADMIN"]],["/dashboard/kpis",["SUPER_ADMIN"]],["/dashboard/billing",["SUPER_ADMIN"]],["/dashboard/referrals",["SUPER_ADMIN"]],["/dashboard/saas-analytics",["SUPER_ADMIN"]],["/dashboard/revenue-attribution",["SUPER_ADMIN"]],["/dashboard/nps",["SUPER_ADMIN"]],
    ["/dashboard/onboarding",["SUPER_ADMIN","ACCOUNT_MANAGER"]],["/dashboard/monthly-reports",["SUPER_ADMIN","ACCOUNT_MANAGER"]],["/dashboard/marketplace",["SUPER_ADMIN","ACCOUNT_MANAGER","CREATOR"]],["/dashboard/budget",["SUPER_ADMIN","MEDIA_BUYER","ACCOUNT_MANAGER"]],
    ["/dashboard/contracts",["SUPER_ADMIN","ACCOUNTANT"]],["/dashboard/finance",["SUPER_ADMIN","ACCOUNTANT"]],["/dashboard/forecast",["SUPER_ADMIN","ACCOUNTANT"]],["/dashboard/ltv",["SUPER_ADMIN","ACCOUNTANT"]],
    ["/dashboard/sales",["SUPER_ADMIN","SALES"]],["/dashboard/media/sync",["SUPER_ADMIN","MEDIA_BUYER"]],["/dashboard/media",["SUPER_ADMIN","MEDIA_BUYER","ACCOUNT_MANAGER"]],["/dashboard/analytics",["SUPER_ADMIN"]],
    ["/dashboard/ai-studio",["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","SALES","ACCOUNTANT","CLIENT"]],
    ["/dashboard/clients",["SUPER_ADMIN","MEDIA_BUYER","ACCOUNT_MANAGER","ACCOUNTANT"]],["/dashboard/creative",["SUPER_ADMIN","ACCOUNT_MANAGER","CREATOR"]],["/dashboard/tasks-inbox",["SUPER_ADMIN","ACCOUNT_MANAGER"]],
    ["/dashboard/calendar",["SUPER_ADMIN","ACCOUNT_MANAGER","CREATOR","SALES","CLIENT"]],["/dashboard/reports",["SUPER_ADMIN","ACCOUNTANT","ACCOUNT_MANAGER","MEDIA_BUYER","SALES"]],["/dashboard/portal",["CLIENT"]],
  ];
  if(pathname.startsWith("/dashboard")){const rule=pageAccess.find(([prefix])=>pathname.startsWith(prefix));if(rule&&!rule[1].includes(role))return NextResponse.redirect(new URL(role==="CLIENT"?"/dashboard/portal":"/dashboard",req.url));}
  if(role==="CLIENT"){
    const clientAllowed=["/dashboard/portal","/dashboard/calendar","/dashboard/ai-studio","/dashboard/notifications","/dashboard/files","/dashboard/settings","/api/notifications","/api/onboarding","/api/search","/api/files","/api/assistant"];
    if(pathname.startsWith("/dashboard")&&!clientAllowed.some(prefix=>pathname.startsWith(prefix)))return NextResponse.redirect(new URL("/dashboard/portal",req.url));
  }
  return secHeaders(NextResponse.next());
});
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.ico$).*)"]};
