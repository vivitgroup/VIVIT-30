import fs from "node:fs";
const read=f=>fs.readFileSync(f,"utf8"),checks=[],check=(name,ok)=>checks.push({name,ok:Boolean(ok)});
const globals=read("app/globals.css"),mobileCss=read("app/dashboard/mobile-release.css"),microCss=read("app/dashboard/uiux-micro-fixes.css"),layout=read("app/dashboard/layout.tsx"),nav=read("components/layout/MobileNav.tsx"),header=read("components/layout/Header.tsx"),clientForm=globals;
check("Dashboard loads mobile release overrides after other polish layers",layout.includes('import "./odoo-module-polish.css";\nimport "./mobile-release.css";'));
check("Global Search remains visible on mobile",mobileCss.includes(".app-header .header-search")&&mobileCss.includes("display: flex !important"));
check("Mobile Search final touch target is at least 44px",microCss.includes("width: 44px !important")&&microCss.includes("min-width: 44px !important")&&microCss.includes("height: 44px !important")&&microCss.includes("min-height: 44px !important")&&microCss.includes("flex-basis: 44px !important"));
check("Mobile Search hides label and keyboard shortcut only",mobileCss.includes("header-search > span:nth-of-type(2)")&&mobileCss.includes("header-search kbd")&&mobileCss.includes("display: none !important"));
const directSearchOpen=header.includes('onClick={()=>setSearchOpen(true)}');
const callbackSearchOpen=/const openSearch=useCallback\(\(\)=>\{[^}]*setSearchOpen\(true\)/.test(header)&&header.includes('onClick={openSearch}');
check("Header Search still opens the real search palette",(directSearchOpen||callbackSearchOpen)&&header.includes('className="header-search"')&&header.includes("searchOpen&&"));
check("Mobile shell prevents page-level horizontal overflow",globals.includes("html,body{max-width:100%;overflow-x:hidden}")&&mobileCss.includes("overflow-x: hidden !important"));
check("Wide tables scroll inside their container",globals.includes(".card-body-flush,.table-scroll,.responsive-table")&&globals.includes("overflow-x:auto!important")&&mobileCss.includes("overflow-x: auto !important"));
check("Calendar remains horizontally scrollable rather than breaking viewport",globals.includes(".calendar-board{overflow-x:auto!important")&&globals.includes("min-width:644px"));
check("Sticky form actions stay above mobile navigation safe area",mobileCss.includes(".form-actions")&&mobileCss.includes("82px + env(safe-area-inset-bottom)"));
check("Content reserves bottom space for fixed mobile navigation",mobileCss.includes("96px + env(safe-area-inset-bottom)"));
check("Client forms collapse to one column on mobile",clientForm.includes(".form-grid,.form-grid.three{grid-template-columns:1fr"));
check("Mobile navigation uses longest-prefix active matching",nav.includes("sort((a,b)=>b.href.length-a.href.length)"));
for(const role of ["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","ACCOUNTANT","SALES","CLIENT"]){const m=nav.match(new RegExp(`${role}:\\[(.*?)\\](?:,|})`));const count=m?(m[1].match(/href:/g)||[]).length:0;check(`${role} mobile nav is present and fits five actions`,count>0&&count<=5)}
const failed=checks.filter(c=>!c.ok);for(const c of checks)console.log(`${c.ok?"PASS":"FAIL"}  ${c.name}`);console.log(`\n${checks.length-failed.length}/${checks.length} mobile UX checks passed.`);if(failed.length)process.exit(1);
