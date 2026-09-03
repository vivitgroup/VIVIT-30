import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/permissions";
import { Role } from "@/lib/types";
import { MarketingTypewriter } from "@/components/landing/MarketingTypewriter";

export default async function LandingPage(){
  const session=await auth();
  if(session?.user){
    const role=session.user.role as Role;
    if(role===Role.SUPER_ADMIN)redirect("/group");
    redirect(homeFor(role));
  }

  const journey=[
    ["01","STRATEGIZE","Plan campaigns, audiences and objectives around clear growth goals."],
    ["02","CREATE","Move briefs, content, revisions and approvals through one workflow."],
    ["03","PUBLISH","Keep every channel, content date and campaign launch in sync."],
    ["04","OPTIMIZE","Read spend, leads, conversions and ROAS without jumping between tools."],
  ];

  return <main className="marketing-landing">
    <style>{`
      .marketing-landing{min-height:100vh;background:#08090b;color:#fff;font-family:Inter,system-ui,sans-serif;overflow:hidden}
      .marketing-nav{height:82px;padding:0 clamp(20px,6vw,80px);display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(8,9,11,.84);backdrop-filter:blur(18px);position:sticky;top:0;z-index:30}
      .marketing-hero{min-height:calc(100vh - 82px);padding:clamp(54px,8vw,100px) clamp(24px,7vw,100px) 70px;position:relative;display:flex;align-items:center;justify-content:center;text-align:center;overflow:hidden}
      .marketing-hero:before{content:"";position:absolute;inset:-20%;background:radial-gradient(circle at 50% 45%,rgba(197,42,49,.34),transparent 30%),radial-gradient(circle at 18% 78%,rgba(197,42,49,.16),transparent 24%),radial-gradient(circle at 82% 18%,rgba(244,178,35,.07),transparent 20%);pointer-events:none}
      .marketing-ring{position:absolute;border:1px solid rgba(197,42,49,.28);border-radius:50%;pointer-events:none}.ring-a{width:430px;height:430px;left:-250px;bottom:-100px}.ring-b{width:620px;height:620px;right:-410px;top:40px}
      .marketing-copy{position:relative;z-index:2;width:min(1040px,100%)}
      .eyebrow{font-size:12px;font-weight:900;letter-spacing:.25em;color:#ef6269;text-transform:uppercase}
      .marketing-title{font-size:clamp(44px,7vw,90px);line-height:1.02;letter-spacing:-.055em;margin:18px auto 22px;font-weight:900;min-height:2.1em;display:flex;align-items:center;justify-content:center}
      .marketing-typewriter{display:inline-block;background:linear-gradient(100deg,#fff 0%,#fff 55%,#ff6b70 92%);-webkit-background-clip:text;background-clip:text;color:transparent}
      .marketing-caret{display:inline-block;width:3px;height:.85em;background:#ff555b;margin-left:8px;vertical-align:-.04em;border-radius:2px;animation:caretBlink .75s steps(1,end) infinite;box-shadow:0 0 18px rgba(255,85,91,.72)}
      .marketing-sub{font-size:clamp(16px,2vw,20px);line-height:1.75;color:#b9b9bf;max-width:760px;margin:0 auto}
      .hero-actions{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:30px}
      .cta-primary,.cta-secondary{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 22px;border-radius:12px;text-decoration:none;font-weight:850;font-size:14px;transition:.22s ease}.cta-primary{color:#fff;background:linear-gradient(110deg,#8e161d,#c52a31 62%,#e34b50);box-shadow:0 16px 45px rgba(197,42,49,.3);border:1px solid rgba(255,255,255,.12)}.cta-primary:hover{transform:translateY(-2px);box-shadow:0 22px 60px rgba(197,42,49,.42)}.cta-secondary{color:#fff;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.14)}
      .marketing-flow{width:min(1200px,100%);margin:52px auto 0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid rgba(255,255,255,.1);border-bottom:1px solid rgba(255,255,255,.1)}
      .flow-item{padding:22px 22px 24px;text-align:left;border-right:1px solid rgba(255,255,255,.1)}.flow-item:last-child{border-right:none}.flow-num{font-size:11px;color:#ef6269;font-weight:900;letter-spacing:.14em}.flow-title{margin:10px 0 7px;font-size:14px;letter-spacing:.08em}.flow-desc{font-size:12.5px;line-height:1.65;color:#96969e;margin:0}
      .marketing-section{padding:90px clamp(24px,7vw,100px);background:linear-gradient(180deg,#0b0c0f,#111216)}
      .marketing-section-inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:.9fr 1.1fr;gap:70px;align-items:center}.marketing-section h2{font-size:clamp(34px,5vw,62px);line-height:1.04;letter-spacing:-.045em;margin:12px 0 18px}.marketing-section p{color:#a7a7ae;line-height:1.75}
      .integration-card{padding:26px;border-radius:22px;background:linear-gradient(145deg,rgba(197,42,49,.16),rgba(255,255,255,.035));border:1px solid rgba(255,255,255,.09);box-shadow:0 30px 80px rgba(0,0,0,.28)}.integration-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.08)}.integration-row:last-child{border-bottom:0}.integration-label{display:flex;align-items:center;gap:12px}.platform-dot{width:38px;height:38px;border-radius:12px;background:rgba(197,42,49,.16);display:grid;place-items:center;font-weight:900;color:#ff676d}.status{font-size:11px;font-weight:800;color:#69d49d;background:rgba(41,167,103,.12);padding:5px 9px;border-radius:999px}
      footer{padding:26px clamp(24px,7vw,100px);display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;background:#08090b;border-top:1px solid rgba(255,255,255,.08);font-size:12px;color:#77777f}
      @keyframes caretBlink{0%,48%{opacity:1}49%,100%{opacity:0}}
      @media(max-width:900px){.marketing-flow{grid-template-columns:repeat(2,1fr)}.flow-item:nth-child(2){border-right:0}.flow-item:nth-child(-n+2){border-bottom:1px solid rgba(255,255,255,.1)}.marketing-section-inner{grid-template-columns:1fr;gap:36px}.marketing-title{min-height:2.6em}}
      @media(max-width:560px){.marketing-nav{height:72px;padding:0 16px}.marketing-nav img{width:112px;height:auto}.marketing-hero{min-height:calc(100vh - 72px);padding:44px 18px 48px}.marketing-title{font-size:clamp(38px,12vw,58px);min-height:3.2em}.marketing-flow{grid-template-columns:1fr;margin-top:40px}.flow-item,.flow-item:nth-child(2){border-right:0;border-bottom:1px solid rgba(255,255,255,.1)}.flow-item:last-child{border-bottom:0}.marketing-section{padding:68px 18px}}
      @media(prefers-reduced-motion:reduce){.marketing-caret{animation:none}}
    `}</style>

    <nav className="marketing-nav">
      <Image src="/vivit-logo.png" alt="VIVIT Marketing" width={145} height={64} style={{objectFit:"contain",filter:"brightness(0) invert(1)"}} priority/>
      <div style={{display:"flex",gap:10}}>
        <Link href="/login" className="cta-secondary" style={{minHeight:42,padding:"0 16px"}}>Sign in</Link>
        <Link href="/signup" className="cta-primary" style={{minHeight:42,padding:"0 16px"}}>Request access</Link>
      </div>
    </nav>

    <section className="marketing-hero">
      <div className="marketing-ring ring-a"/><div className="marketing-ring ring-b"/>
      <div className="marketing-copy">
        <p className="eyebrow">VIVIT MARKETING OPERATING SYSTEM</p>
        <h1 className="marketing-title"><MarketingTypewriter/></h1>
        <p className="marketing-sub">One connected workspace for strategy, creative production, media buying, publishing and performance — built for the way modern marketing teams actually work.</p>
        <div className="hero-actions"><Link href="/signup" className="cta-primary">Start with VIVIT →</Link><Link href="/login" className="cta-secondary">Open your workspace</Link></div>
        <div className="marketing-flow">{journey.map(([num,title,desc])=><div className="flow-item" key={title}><span className="flow-num">{num}</span><h3 className="flow-title">{title}</h3><p className="flow-desc">{desc}</p></div>)}</div>
      </div>
    </section>

    <section className="marketing-section">
      <div className="marketing-section-inner">
        <div><p className="eyebrow">CONNECTED MEDIA</p><h2>From campaign launch to real performance.</h2><p>VIVIT brings advertising data into the same ERP where your team plans content, handles approvals and tracks client work. Meta connection is available inside the authorized Media workspace.</p><Link href="/login" className="cta-primary" style={{marginTop:16}}>Sign in to connect Meta →</Link></div>
        <div className="integration-card">
          {[['M','Meta Ads','OAuth + live campaign sync'],['IG','Instagram','Content + campaign visibility'],['FB','Facebook','Spend, results & conversion data'],['↗','Reporting','ROAS, leads, purchases & trends']].map(([icon,title,desc],index)=><div className="integration-row" key={title}><div className="integration-label"><div className="platform-dot">{icon}</div><div><strong style={{fontSize:14}}>{title}</strong><p style={{fontSize:11.5,margin:"3px 0 0",color:'#8f8f97'}}>{desc}</p></div></div><span className="status">{index===3?'LIVE VIEW':'READY'}</span></div>)}
        </div>
      </div>
    </section>
    <footer><span>© 2026 VIVIT Marketing</span><span>Plan · Create · Launch · Optimize</span></footer>
  </main>;
}
