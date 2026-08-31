import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const css=read('app/dashboard/uiux-micro-fixes.css');
const layout=read('app/dashboard/layout.tsx');
const mobile=read('components/layout/MobileNav.tsx');
const launcher=read('components/layout/OperatingSystemLauncher.tsx');
const assistant=read('components/assistant/SystemAssistant.tsx');
const header=read('components/layout/Header.tsx');

const checks=[
 ['micro-fix stylesheet is loaded last', layout.lastIndexOf('uiux-micro-fixes.css')>layout.lastIndexOf('release-corrections-v5.css')],
 ['header search touch target is at least 44px', css.includes('.app-header .header-search')&&css.includes('min-height: 44px !important')],
 ['header notifications touch target is 44px', css.includes('.app-header .header-notifications')&&css.includes('height: 44px !important')],
 ['VIVITO close control is 44px', css.includes('.va-head > button')&&css.includes('width: 44px !important')],
 ['VIVITO input controls are 44px', css.includes('.va-input > button')&&css.includes('height: 44px !important')],
 ['VIVITO quick actions have 44px minimum height', css.includes('.va-quick button')&&css.includes('min-height: 44px !important')],
 ['Apps launcher is shifted clear of VIVITO on desktop', css.includes('.vx-apps { right: 104px !important')],
 ['Apps launcher is shifted clear of VIVITO on mobile', css.includes('.vx-apps { right: 86px !important')],
 ['Apps launcher button reaches 44px target', css.includes('.vx-apps-btn')&&css.includes('height: 44px !important')],
 ['mobile skeleton collapses main grid', css.includes('.dashboard-skeleton-main { grid-template-columns: minmax(0,1fr) !important')],
 ['mobile skeleton KPIs collapse responsively', css.includes('.dashboard-skeleton-kpis')&&css.includes('repeat(2,minmax(0,1fr))')],
 ['focus-visible treatment exists', css.includes(':focus-visible')&&css.includes('outline-offset: 2px')],
 ['reduced motion treatment exists', css.includes('prefers-reduced-motion: reduce')],
 ['closed mobile drawer is inert', mobile.includes('inert={!open}')],
 ['mobile drawer returns focus to trigger', mobile.includes('menuButtonRef.current?.focus()')],
 ['mobile drawer focuses close button when opened', mobile.includes('closeButtonRef.current?.focus()')],
 ['mobile full menu has controls relationship', mobile.includes('aria-controls="vivit-mobile-full-menu"')&&mobile.includes('id="vivit-mobile-full-menu"')],
 ['mobile navigation exposes current page', mobile.includes('aria-current={isActive?"page":undefined}')],
 ['full mobile menu exposes current page', mobile.includes('aria-current={active===i.href?"page":undefined}')],
 ['VIVITO already labels launcher and input controls', assistant.includes('aria-label="Open VIVITO"')&&assistant.includes('aria-label="Attach file"')&&assistant.includes('aria-label="Send"')],
 ['header notifications are labeled', header.includes('aria-label={`Notifications')],
 ['existing launcher exposes expanded state', launcher.includes('aria-expanded={open}')],
];

let pass=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(ok)pass++;}
console.log(`\n${pass}/${checks.length} UI/UX micro-audit checks passed.`);
if(pass!==checks.length)process.exit(1);
