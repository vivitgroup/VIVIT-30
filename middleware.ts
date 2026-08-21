import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Brute Force Store ─────────────────────────────────────────
const loginAttempts = new Map<string, { count:number; lockedUntil:number }>();

function checkBruteForce(ip:string):{blocked:boolean;remaining:number}{
  const now   = Date.now();
  const entry = loginAttempts.get(ip);
  if (entry?.lockedUntil && now < entry.lockedUntil)
    return { blocked:true, remaining:Math.ceil((entry.lockedUntil-now)/60000) };
  return { blocked:false, remaining:5-(entry?.count??0) };
}

function addLoginFailure(ip:string){
  const e = loginAttempts.get(ip)??{count:0,lockedUntil:0};
  e.count++;
  if (e.count>=5) e.lockedUntil = Date.now()+15*60000;
  loginAttempts.set(ip,e);
}

// ── Security Headers ──────────────────────────────────────────
function secHeaders(res:NextResponse):NextResponse{
  res.headers.set("X-Frame-Options",         "DENY");
  res.headers.set("X-Content-Type-Options",  "nosniff");
  res.headers.set("X-XSS-Protection",        "1; mode=block");
  res.headers.set("Referrer-Policy",         "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy",      "camera=(),microphone=(),geolocation=()");
  res.headers.set("X-Robots-Tag",            "noindex,nofollow");
  res.headers.set("Content-Security-Policy",
    "default-src 'self';"+
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com;"+
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;"+
    "font-src 'self' https://fonts.gstatic.com;"+
    "img-src 'self' data: blob: https:;"+
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.resend.com;"+
    "frame-ancestors 'none';"
  );
  if (process.env.NODE_ENV==="production")
    res.headers.set("Strict-Transport-Security","max-age=31536000;includeSubDomains");
  return res;
}

// Fix 20: CORS for /api/v1 public API
function corsHeaders(res:NextResponse, origin:string|null):NextResponse{
  const allowed = (process.env.ALLOWED_ORIGINS??"*").split(",");
  if (origin && (allowed.includes("*")||allowed.includes(origin)))
    res.headers.set("Access-Control-Allow-Origin", origin);
  else
    res.headers.set("Access-Control-Allow-Origin", "");
  res.headers.set("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers","Content-Type,X-API-Key,Authorization");
  res.headers.set("Access-Control-Max-Age","86400");
  return res;
}

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session      = req.auth;
  const ip           = req.headers.get("x-forwarded-for")?.split(",")[0]??"unknown";
  const origin       = req.headers.get("origin");

  // Fix 20: Handle CORS preflight for /api/v1
  if (req.method==="OPTIONS" && pathname.startsWith("/api/v1")) {
    const res = new NextResponse(null,{status:204});
    return corsHeaders(res, origin);
  }

  // Fix 1 (CSRF): Validate origin on state-changing requests
  if (["POST","PUT","DELETE","PATCH"].includes(req.method)) {
    const host = req.headers.get("host");
    if (origin && host && !origin.includes(host)
        && !pathname.startsWith("/api/v1")
        && !pathname.startsWith("/api/auth")) {
      return new NextResponse("CSRF validation failed",{status:403});
    }
  }

  // Fix 6: Brute force on login
  if (pathname.startsWith("/api/auth/callback")) {
    const {blocked,remaining} = checkBruteForce(ip);
    if (blocked)
      return NextResponse.json(
        {error:`Too many attempts. Try again in ${remaining} minute(s).`},
        {status:429}
      );
  }

  // Fix 10: Cron protection — must have secret
  if (pathname.startsWith("/api/cron")) {
    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const secret = req.headers.get("x-cron-secret") ?? bearer ??
                   req.nextUrl.searchParams.get("secret");
    const expected = process.env.CRON_SECRET;
    if (!expected || secret !== expected)
      return NextResponse.json({error:"Unauthorized"},{status:401});
  }

  // Public routes
  const publicPaths = ["/","/login","/signup","/api/auth","/api/health",
    "/api/signup","/forgot-password","/reset-password","/api/password",
    "/approve","/api/v1","/robots.txt","/sitemap.xml"];
  if (publicPaths.some(p=>pathname.startsWith(p))) {
    const res = NextResponse.next();
    secHeaders(res);
    if (pathname.startsWith("/api/v1")) corsHeaders(res,origin);
    return res;
  }

  // Auth guard
  if (!session) {
    const loginUrl = new URL("/login",req.url);
    loginUrl.searchParams.set("callbackUrl",pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = (session.user as any)?.role;

  // Fix 12,19: CLIENT portal isolation — strict redirect
  if (role==="CLIENT") {
    const clientAllowed = ["/dashboard/portal","/dashboard/notifications","/dashboard/files",
      "/api/notifications","/api/onboarding","/api/search","/api/files"];
    if (pathname.startsWith("/dashboard") &&
        !clientAllowed.some(p=>pathname.startsWith(p))) {
      return NextResponse.redirect(new URL("/dashboard/portal",req.url));
    }
  }

  const res = NextResponse.next();
  secHeaders(res);
  return res;
});

export const config = {
  matcher:["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.ico$).*)"],
};
