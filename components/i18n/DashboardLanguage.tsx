"use client";
import {useEffect} from "react";

type Lang="en"|"ar";
const AR:Record<string,string>={
  "Dashboard":"لوحة التحكم","Today":"اليوم","Clients":"العملاء","Active Clients":"العملاء النشطون","Sales CRM":"إدارة المبيعات","WhatsApp":"واتساب","Media Buying":"إدارة الإعلانات","Creative Tasks":"المهام الإبداعية","Tasks Inbox":"صندوق المهام","Finance":"المالية","Analytics":"التحليلات","HR & Team":"الفريق والموارد البشرية","AI Studio":"استوديو الذكاء الاصطناعي","Settings":"الإعدادات","Reports":"التقارير","Notifications":"الإشعارات","Files & Documents":"الملفات والمستندات","Calendar":"التقويم","Contracts":"العقود","Archive":"الأرشيف","Search...":"بحث...","Sign Out":"تسجيل الخروج","Export CSV":"تصدير CSV","Appearance":"المظهر","Theme":"المظهر","Light":"فاتح","Dark":"داكن","Task Reminders":"تذكيرات المهام","Session":"الجلسة",
  "Active leads":"العملاء المحتملون النشطون","Weighted pipeline":"قيمة المبيعات المتوقعة","Total won":"إجمالي الصفقات الناجحة","Win rate":"نسبة النجاح","Pipeline Board":"مسار المبيعات","New":"جديد","Contacted":"تم التواصل","Qualified":"مؤهل","Proposal":"عرض سعر","Negotiation":"تفاوض","Won":"تم الفوز","Lost":"مفقود","Active":"نشط","No leads":"لا توجد فرص","+ New Lead":"+ عميل محتمل جديد","Add New Lead":"إضافة عميل محتمل","Company Name *":"اسم الشركة *","Contact Person *":"جهة الاتصال *","Lead Source":"مصدر العميل","Add to Pipeline":"إضافة لمسار المبيعات","All Leads":"كل العملاء المحتملين","Company":"الشركة","Contact":"جهة الاتصال","Value":"القيمة","Stage":"المرحلة","Source":"المصدر","Updated":"آخر تحديث","No contact":"لا توجد جهة اتصال","Phone not added":"لم يتم إضافة الهاتف","Phone":"الهاتف","Notes":"ملاحظات","Save Contact & Notes":"حفظ الهاتف والملاحظات","Archive Lead":"أرشفة الفرصة","Converted to client":"تم التحويل إلى عميل",
  "Active Tasks":"المهام النشطة","Overdue":"متأخر","Awaiting Review":"بانتظار المراجعة","Needs Revision":"يحتاج تعديل","Priority":"الأولوية","Deadline":"الموعد النهائي","Status":"الحالة","Create":"إنشاء","Save":"حفظ","Save changes":"حفظ التغييرات","Update":"تحديث","Delete":"حذف","Edit":"تعديل","Open":"فتح","View":"عرض","Download":"تنزيل","Upload":"رفع","Close":"إغلاق","Back":"رجوع","Next":"التالي","Name":"الاسم","Email":"البريد الإلكتروني","Industry":"المجال","Category":"التصنيف","Amount":"المبلغ","Date":"التاريخ","Description":"الوصف","Actions":"الإجراءات","No data yet":"لا توجد بيانات بعد","No results":"لا توجد نتائج","Loading...":"جارٍ التحميل...","Try again":"حاول مرة أخرى",
  "Content Calendar":"تقويم المحتوى","Add Post":"إضافة منشور","All Platforms":"كل المنصات","All Clients":"كل العملاء","Scheduled":"مجدول","Posted":"تم النشر","Mark Posted":"تم النشر","Connected":"متصل","Not Connected":"غير متصل","Connect":"ربط","Authorize":"تفويض","Campaign sync":"مزامنة الحملات","New Client":"عميل جديد","Create client":"إنشاء عميل","Client Portal":"بوابة العميل","Client Lifetime Value":"القيمة الدائمة للعميل","Revenue Forecast":"توقع الإيرادات","KPIs & BI":"مؤشرات الأداء","Outstanding":"المستحق","Collected":"المُحصّل","Invoice History":"سجل الفواتير","Generate Invoice":"إنشاء فاتورة","Expense Quick-Log":"تسجيل مصروف سريع",
  "Overview":"نظرة عامة","Performance":"الأداء","Campaigns":"الحملات","Campaign":"الحملة","Ad Spend":"الإنفاق الإعلاني","Spend":"الإنفاق","Results":"النتائج","Purchases":"المشتريات","Revenue":"الإيرادات","ROAS":"العائد على الإنفاق","Budget":"الميزانية","Daily Budget":"الميزانية اليومية","Control Center":"مركز التحكم","Platform Sync":"مزامنة المنصات","Media Portfolio":"محفظة الإعلانات","Refresh":"تحديث","Sync now":"مزامنة الآن",
  "Creative":"الإبداع","Creative Quality":"جودة الإبداع","In Progress":"قيد التنفيذ","In Review":"قيد المراجعة","Approved":"معتمد","Revision":"تعديل مطلوب","Completed":"مكتمل","Rejected":"مرفوض","Assignee":"المسؤول","Task":"المهمة","Task title":"عنوان المهمة","Brief":"البريف","Create Task":"إنشاء مهمة","New Task":"مهمة جديدة","Assign to":"إسناد إلى",
  "Invoices":"الفواتير","Payments":"المدفوعات","Expenses":"المصروفات","Ledger Revenue":"إيرادات الدفتر","Ledger Expenses":"مصروفات الدفتر","Net Cash Flow":"صافي التدفق النقدي","Outstanding Invoices":"الفواتير المستحقة","Invoice Collection":"تحصيل الفواتير","Monthly ledger":"الدفتر الشهري","AR Aging":"أعمار المستحقات","Generate invoice":"إنشاء فاتورة","Mark paid":"تسجيل كمدفوع","Payment method":"طريقة الدفع","Retainer":"الاشتراك","Media buying fee":"رسوم إدارة الإعلانات","Extra services":"خدمات إضافية",
  "Team":"الفريق","Team Members":"أعضاء الفريق","Employees":"الموظفون","Role":"الدور","Account Manager":"مدير الحساب","Media Buyer":"ميديا باير","Creator":"كريتور","Accountant":"محاسب","Sales":"المبيعات","Super Admin":"مدير النظام","Payroll":"الرواتب","Leave Requests":"طلبات الإجازة","Leave Request":"طلب إجازة","Approve":"موافقة","Reject":"رفض","Paid":"مدفوع","Draft":"مسودة",
  "Workspace":"مساحة العمل","Workspace Settings":"إعدادات مساحة العمل","Branding":"الهوية","Currency":"العملة","Timezone":"المنطقة الزمنية","Billing Email":"بريد الفواتير","Primary Color":"اللون الأساسي","Save Settings":"حفظ الإعدادات","Integrations":"التكاملات","Disconnect":"فصل الربط",
  "Client Workspace":"مساحة العميل","Account Details":"تفاصيل الحساب","Contacts":"جهات الاتصال","Add Contact":"إضافة جهة اتصال","Contract":"العقد","Start Date":"تاريخ البداية","End Date":"تاريخ النهاية","Monthly Retainer":"الاشتراك الشهري","Media Budget":"ميزانية الإعلانات","Internal Notes":"ملاحظات داخلية",
  "Search":"بحث","Filter":"تصفية","Filters":"الفلاتر","Clear":"مسح","Apply":"تطبيق","Sort":"ترتيب","Previous":"السابق","Page":"صفحة","Showing":"عرض","of":"من","No notifications":"لا توجد إشعارات","Mark all read":"تحديد الكل كمقروء","No files yet":"لا توجد ملفات بعد","No tasks yet":"لا توجد مهام بعد","No clients yet":"لا يوجد عملاء بعد","No campaigns yet":"لا توجد حملات بعد",
  "Onboarding":"التجهيز","Referrals":"الإحالات","NPS":"رضا العملاء","Forecast":"التوقعات","Executive":"التنفيذي","Operations":"العمليات","Action Center":"مركز الإجراءات","Monthly Reports":"التقارير الشهرية","Universe":"نظرة شاملة","Accounts Payment":"تحصيلات العملاء",
  "Language":"اللغة","English":"الإنجليزية","Arabic":"العربية","Switch language":"تغيير اللغة","Notifications settings":"إعدادات الإشعارات","Security":"الأمان","Profile":"الملف الشخصي","Help":"المساعدة"
};
const originals=new WeakMap<Text,string>(),attributeOriginals=new WeakMap<Element,Map<string,string>>();
const excluded=(el:Element|null)=>!el||Boolean(el.closest(".va-panel,.search-overlay,[data-no-translate],[data-user-content],[data-vivito-message],[contenteditable=true],script,style,code,pre"));
function dynamicTranslate(source:string){
  return source
    .replace(/(\d+) active leads\b/gi,"$1 عميل محتمل نشط")
    .replace(/(\d+) active tasks\b/gi,"$1 مهمة نشطة")
    .replace(/(\d+) overdue tasks\b/gi,"$1 مهمة متأخرة")
    .replace(/(\d+) stale leads\b/gi,"$1 فرصة تحتاج متابعة")
    .replace(/(\d+) invoices?\b/gi,"$1 فاتورة")
    .replace(/(\d+) campaigns?\b/gi,"$1 حملة")
    .replace(/\bNo leads\b/g,"لا توجد فرص");
}
function translated(source:string,lang:Lang){if(lang==="en")return source;const trimmed=source.trim(),value=AR[trimmed];return value?source.replace(trimmed,value):dynamicTranslate(source)}
function translateAttribute(el:Element,name:string,lang:Lang){
 if(excluded(el))return;let map=attributeOriginals.get(el);if(!map){map=new Map();attributeOriginals.set(el,map)}
 if(!map.has(name)){const current=el.getAttribute(name);if(current!==null)map.set(name,current)}const source=map.get(name);if(source===undefined)return;
 const next=translated(source,lang);if(el.getAttribute(name)!==next)el.setAttribute(name,next);
}
function translate(root:ParentNode,lang:Lang){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node:Node|null;
  while((node=walker.nextNode())){const text=node as Text,parent=text.parentElement;if(excluded(parent))continue;if(!originals.has(text))originals.set(text,text.data);const source=originals.get(text)??text.data,next=translated(source,lang);if(text.data!==next)text.data=next}
  root.querySelectorAll?.("[placeholder],[title],[aria-label]").forEach(el=>{for(const name of ["placeholder","title","aria-label"])if(el.hasAttribute(name))translateAttribute(el,name,lang)});
}
export function DashboardLanguage(){
  useEffect(()=>{
    const root=document.querySelector<HTMLElement>(".app-main-shell");if(!root)return;
    let lang:Lang=localStorage.getItem("vivit-lang")==="ar"?"ar":"en",raf=0;
    const apply=()=>{document.documentElement.lang=lang;document.documentElement.dir="ltr";document.documentElement.dataset.vivitLang=lang;root.dir=lang==="ar"?"rtl":"ltr";translate(root,lang)};
    const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(apply)};
    const onLanguage=(event:Event)=>{const next=(event as CustomEvent<string>).detail;lang=next==="ar"?"ar":"en";localStorage.setItem("vivit-lang",lang);schedule()};
    const observer=new MutationObserver(()=>schedule());observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:["placeholder","title","aria-label"]});window.addEventListener("vivit-language",onLanguage);schedule();
    return()=>{cancelAnimationFrame(raf);observer.disconnect();window.removeEventListener("vivit-language",onLanguage)};
  },[]);
  return null;
}
