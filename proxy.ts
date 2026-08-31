import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { NextResponse, type NextRequest } from "next/server";

function secHeaders(res:NextResponse):NextResponse{
  res.headers.set("X-Frame-Options","DENY");
  res.headers.set("X-Content-Type-Options","nosniff");
  res.headers.set("X-XSS-Protection","1; mode=block");
  res.headers.set("Referrer-Policy","strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy","camera=(),microphone=(),geolocation=()");
  res.headers.set("X-Robots-Tag","noindex,nofollow");
  const scriptSrc=process.env.NODE_ENV==="production"?"'self' 'unsafe-inline' https://fonts.googleapis.com":"'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com";
  res.headers.set("Content-Security-Policy",`default-src 'self';script-src ${scriptSrc};style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;font-src 'self' https://fonts.gstatic.com;img-src 'self' data: blob: https:;connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.resend.com https://graph.facebook.com https://www.facebook.com;frame-ancestors 'none';base-uri 'self';form-action 'self';object-src 'none';`);
  if(process.env.NODE_ENV==="production")res.headers.set("Strict-Transport-Security","max-age=31536000;includeSubDomains");
  return res;
}
function corsHeaders(res:NextResponse,origin:string|null):NextResponse{
  const allowed=(process.env.ALLOWED_ORIGINS??"").split(",").map(v=>v.trim()).filter(Boolean);
  if(origin&&allowed.includes(origin))res.headers.set("Access-Control-Allow-Origin",origin);
  res.headers.set("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers","Content-Type,X-API-Key,Authorization");
  res.headers.set("Access-Control-Max-Age","86400");
  res.headers.set("Vary","Origin");
  return res;
}
function sameOrigin(origin:string,reqUrl:string){
  try{const a=new URL(origin),b=new URL(reqUrl);return a.protocol===b.protocol&&a.host===b.host}catch{return false}
}
function hasSessionCookie(req:NextRequest){
  return ["authjs.session-token","__Secure-authjs.session-token","next-auth.session-token","__Secure-next-auth.session-token"].some(name=>Boolean(req.cookies.get(name)?.value));
}
function mutationCsrfValid(req:NextRequest){
  const site=String(req.headers.get("sec-fetch-site")||"").toLowerCase();
  if(site==="cross-site")return false;
  const origin=req.headers.get("origin");
  if(origin)return sameOrigin(origin,req.url);
  // Non-browser/server-to-server clients can legitimately omit Origin. A cookie-authenticated
  // browser mutation cannot: require Origin when a session cookie is present.
  if(hasSessionCookie(req))return false;
  return site===""||site==="same-origin"||site==="same-site"||site==="none";
}

const {auth}=NextAuth(authConfig);
const OPS=["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"];
const clientTaskDetailPath=(pathname:string)=>/^\/dashboard\/creative\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(pathname);

export default auth((req)=>{
  const {pathname}=req.nextUrl,session=req.auth,origin=req.headers.get("origin");
  if(req.method==="OPTIONS"&&pathname.startsWith("/api/v1"))return corsHeaders(new NextResponse(null,{status:204}),origin);
  if(["POST","PUT","DELETE","PATCH"].includes(req.method)&&!pathname.startsWith("/api/v1")&&!pathname.startsWith("/api/auth")&&!mutationCsrfValid(req))return secHeaders(new NextResponse("CSRF validation failed",{status:403}));
  if(pathname.startsWith("/api/cron")){
    const bearer=req.headers.get("authorization")?.replace(/^Bearer\s+/i,""),secret=req.headers.get("x-cron-secret")??bearer,expected=process.env.CRON_SECRET;
    if(!expected||secret!==expected)return secHeaders(NextResponse.json({error:"Unauthorized"},{status:401}));
  }
  const publicExact=["/","/login","/signup","/forgot-password","/reset-password","/robots.txt","/sitemap.xml"],publicPrefixes=["/api/auth","/api/health","/api/signup","/api/password","/approve/","/api/v1/"];
  if(publicExact.includes(pathname)||publicPrefixes.some(p=>pathname.startsWith(p))){
    const res=NextResponse.next();secHeaders(res);if(pathname.startsWith("/api/v1"))corsHeaders(res,origin);return res;
  }
  if(!session){
    if(pathname.startsWith("/api/"))return secHeaders(NextResponse.json({error:"Unauthorized"},{status:401}));
    const loginUrl=new URL("/login",req.url);loginUrl.searchParams.set("callbackUrl",pathname);return NextResponse.redirect(loginUrl);
  }
  if(session.user?.authValid!==true){
    if(pathname.startsWith("/api/"))return secHeaders(NextResponse.json({error:"Session is no longer authorized"},{status:401}));
    return NextResponse.redirect(new URL("/login?reason=session_revoked",req.url));
  }
  const role=String(session.user?.role||"");
  const isClientTaskDetail=role==="CLIENT"&&clientTaskDetailPath(pathname);
  if(pathname.startsWith("/api/ad-oauth")&&!OPS.includes(role))return secHeaders(NextResponse.json({error:"Forbidden"},{status:403}));
  if(pathname==="/dashboard"){
    const homes:Record<string,string>={CLIENT:"/dashboard/portal",CREATOR:"/dashboard/creative",ACCOUNTANT:"/dashboard/finance",MEDIA_BUYER:"/dashboard/universe",SALES:"/dashboard/sales",ACCOUNT_MANAGER:"/dashboard/universe"};
    if(homes[role])return NextResponse.redirect(new URL(homes[role],req.url));
  }
  const pageAccess:[string,string[]][]=[
    ["/dashboard/clients/accounts-payment",["SUPER_ADMIN","ACCOUNTANT"]],
    ["/dashboard/creative/quality",["SUPER_ADMIN","ACCOUNT_MANAGER","CREATOR"]],
    ["/dashboard/ai-studio/actions",["SUPER_ADMIN","ACCOUNT_MANAGER"]],
    ["/dashboard/executive",["SUPER_ADMIN"]],["/dashboard/operations",["SUPER_ADMIN","ACCOUNT_MANAGER"]],
    ["/dashboard/whatsapp",[...OPS,"SALES"]],
    ["/dashboard/settings",["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","ACCOUNTANT","SALES","CLIENT"]],
    ["/dashboard/archive",[...OPS,"SALES"]],
    ["/dashboard/team",["SUPER_ADMIN"]],["/dashboard/workspace",["SUPER_ADMIN"]],["/dashboard/activity",["SUPER_ADMIN"]],["/dashboard/kpis",["SUPER_ADMIN"]],["/dashboard/billing",["SUPER_ADMIN"]],["/dashboard/referrals",["SUPER_ADMIN"]],["/dashboard/saas-analytics",["SUPER_ADMIN"]],["/dashboard/revenue-attribution",["SUPER_ADMIN"]],["/dashboard/nps",["SUPER_ADMIN"]],
    ["/dashboard/onboarding",OPS],["/dashboard/monthly-reports",OPS],["/dashboard/marketplace",[...OPS,"CREATOR"]],["/dashboard/budget",OPS],
    ["/dashboard/contracts",["SUPER_ADMIN","ACCOUNTANT"]],["/dashboard/finance",["SUPER_ADMIN","ACCOUNTANT"]],["/dashboard/forecast",["SUPER_ADMIN","ACCOUNTANT"]],["/dashboard/ltv",["SUPER_ADMIN","ACCOUNTANT"]],
    ["/dashboard/sales",["SUPER_ADMIN","SALES"]],["/dashboard/media/sync",OPS],["/dashboard/media",OPS],["/dashboard/analytics",["SUPER_ADMIN"]],
    ["/dashboard/ai-studio",["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","SALES","ACCOUNTANT","CLIENT"]],
    ["/dashboard/clients",[...OPS,"ACCOUNTANT"]],["/dashboard/creative",[...OPS,"CREATOR"]],["/dashboard/tasks-inbox",OPS],
    ["/dashboard/calendar",[...OPS,"CREATOR","SALES","CLIENT"]],["/dashboard/reports",["SUPER_ADMIN","ACCOUNTANT","ACCOUNT_MANAGER","MEDIA_BUYER","SALES"]],["/dashboard/portal",["CLIENT"]]
  ];
  if(pathname.startsWith("/dashboard")){
    const rule=pageAccess.find(([prefix])=>pathname.startsWith(prefix));
    if(rule&&!rule[1].includes(role)&&!isClientTaskDetail)return NextResponse.redirect(new URL(role==="CLIENT"?"/dashboard/portal":"/dashboard",req.url));
  }
  if(role==="CLIENT"){
    const clientAllowed=["/dashboard/today","/dashboard/portal","/dashboard/calendar","/dashboard/ai-studio","/dashboard/notifications","/dashboard/files","/dashboard/settings","/api/notifications","/api/onboarding","/api/search","/api/files","/api/assistant"];
    if(pathname.startsWith("/dashboard")&&!isClientTaskDetail&&!clientAllowed.some(prefix=>pathname.startsWith(prefix)))return NextResponse.redirect(new URL("/dashboard/portal",req.url));
  }
  return secHeaders(NextResponse.next());
});
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.ico$).*)"]};
