"use client";
import {useEffect} from "react";

type Lang="en"|"ar";
const AR:Record<string,string>={
  "Dashboard":"لوحة التحكم","Today":"اليوم","Clients":"العملاء","Active Clients":"العملاء النشطون","Sales CRM":"إدارة المبيعات","WhatsApp":"واتساب","Media Buying":"إدارة الإعلانات","Creative Tasks":"المهام الإبداعية","Tasks Inbox":"صندوق المهام","Finance":"المالية","Analytics":"التحليلات","HR & Team":"الفريق والموارد البشرية","AI Studio":"استوديو الذكاء الاصطناعي","Settings":"الإعدادات","Reports":"التقارير","Notifications":"الإشعارات","Files & Documents":"الملفات والمستندات","Calendar":"التقويم","Contracts":"العقود","Archive":"الأرشيف","Search...":"بحث...","Sign Out":"تسجيل الخروج","Export CSV":"تصدير CSV","Appearance":"المظهر","Theme":"المظهر","Light":"فاتح","Dark":"داكن","Task Reminders":"تذكيرات المهام","Session":"الجلسة",
  "Active leads":"العملاء المحتملون النشطون","Weighted pipeline":"قيمة المبيعات المتوقعة","Total won":"إجمالي الصفقات الناجحة","Win rate":"نسبة النجاح","Pipeline Board":"مسار المبيعات","New":"جديد","Contacted":"تم التواصل","Qualified":"مؤهل","Proposal":"عرض سعر","Negotiation":"تفاوض","Won":"تم الفوز","Lost":"مفقود","Active":"نشط","No leads":"لا توجد فرص","Archive":"الأرشيف","+ New Lead":"+ عميل محتمل جديد","Add New Lead":"إضافة عميل محتمل","Company Name *":"اسم الشركة *","Contact Person *":"جهة الاتصال *","Lead Source":"مصدر العميل","Add to Pipeline":"إضافة لمسار المبيعات","All Leads":"كل العملاء المحتملين","Company":"الشركة","Contact":"جهة الاتصال","Value":"القيمة","Stage":"المرحلة","Source":"المصدر","Updated":"آخر تحديث","No contact":"لا توجد جهة اتصال","Phone not added":"لم يتم إضافة الهاتف","Phone":"الهاتف","Notes":"ملاحظات","Save Contact & Notes":"حفظ الهاتف والملاحظات","Archive Lead":"أرشفة الفرصة","Converted to client":"تم التحويل إلى عميل",
  "Active Tasks":"المهام النشطة","Overdue":"متأخر","Awaiting Review":"بانتظار المراجعة","Needs Revision":"يحتاج تعديل","Priority":"الأولوية","Deadline":"الموعد النهائي","Status":"الحالة","Create":"إنشاء","Save":"حفظ","Save changes":"حفظ التغييرات","Update":"تحديث","Delete":"حذف","Edit":"تعديل","Open":"فتح","View":"عرض","Download":"تنزيل","Upload":"رفع","Close":"إغلاق","Back":"رجوع","Next":"التالي","Name":"الاسم","Email":"البريد الإلكتروني","Industry":"المجال","Category":"التصنيف","Amount":"المبلغ","Date":"التاريخ","Description":"الوصف","Actions":"الإجراءات","No data yet":"لا توجد بيانات بعد","No results":"لا توجد نتائج","Loading...":"جارٍ التحميل...","Try again":"حاول مرة أخرى",
  "Content Calendar":"تقويم المحتوى","Add Post":"إضافة منشور","All Platforms":"كل المنصات","All Clients":"كل العملاء","Scheduled":"مجدول","Posted":"تم النشر","Mark Posted":"تم النشر","Connected":"متصل","Not Connected":"غير متصل","Connect":"ربط","Authorize":"تفويض","Campaign sync":"مزامنة الحملات","New Client":"عميل جديد","Create client":"إنشاء عميل","Client Portal":"بوابة العميل","Client Lifetime Value":"القيمة الدائمة للعميل","Revenue Forecast":"توقع الإيرادات","KPIs & BI":"مؤشرات الأداء","Outstanding":"المستحق","Collected":"المُحصّل","Invoice History":"سجل الفواتير","Generate Invoice":"إنشاء فاتورة","Expense Quick-Log":"تسجيل مصروف سريع"
};
const originals=new WeakMap<Text,string>(),placeholderOriginals=new WeakMap<Element,string>();
const excluded=(el:Element|null)=>!el||Boolean(el.closest(".va-panel,.search-overlay,[data-no-translate],script,style,code,pre"));
function dynamicTranslate(source:string){
  return source
    .replace(/(\d+) active leads\b/gi,"$1 عميل محتمل نشط")
    .replace(/(\d+) active tasks\b/gi,"$1 مهمة نشطة")
    .replace(/(\d+) overdue tasks\b/gi,"$1 مهمة متأخرة")
    .replace(/(\d+) stale leads\b/gi,"$1 فرصة تحتاج متابعة")
    .replace(/\bNo leads\b/g,"لا توجد فرص");
}
function translate(root:ParentNode,lang:Lang){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node:Node|null;
  while((node=walker.nextNode())){
    const text=node as Text,parent=text.parentElement;if(excluded(parent))continue;
    if(!originals.has(text))originals.set(text,text.data);
    const source=originals.get(text)??text.data;
    if(lang==="en"){if(text.data!==source)text.data=source;continue}
    const trimmed=source.trim(),translated=AR[trimmed];const next=translated?source.replace(trimmed,translated):dynamicTranslate(source);if(text.data!==next)text.data=next;
  }
  root.querySelectorAll?.("input[placeholder],textarea[placeholder]").forEach(el=>{
    if(excluded(el))return;const source=placeholderOriginals.get(el)||el.getAttribute("placeholder")||"";if(!placeholderOriginals.has(el))placeholderOriginals.set(el,source);el.setAttribute("placeholder",lang==="ar"?(AR[source]||source):source)
  });
}
export function DashboardLanguage(){
  useEffect(()=>{
    const root=document.querySelector<HTMLElement>(".app-main-shell");if(!root)return;
    let lang:Lang=localStorage.getItem("vivit-lang")==="ar"?"ar":"en",raf=0;
    const apply=()=>{document.documentElement.lang=lang;document.documentElement.dir="ltr";document.documentElement.dataset.vivitLang=lang;root.dir=lang==="ar"?"rtl":"ltr";translate(root,lang)};
    const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(apply)};
    const onLanguage=(event:Event)=>{const next=(event as CustomEvent<string>).detail;lang=next==="ar"?"ar":"en";localStorage.setItem("vivit-lang",lang);schedule()};
    const observer=new MutationObserver(()=>schedule());observer.observe(root,{subtree:true,childList:true});window.addEventListener("vivit-language",onLanguage);schedule();
    return()=>{cancelAnimationFrame(raf);observer.disconnect();window.removeEventListener("vivit-language",onLanguage)};
  },[]);
  return null;
}
