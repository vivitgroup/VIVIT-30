"use client";
import { useEffect } from "react";

const AR: Record<string,string> = {
  "Dashboard":"لوحة التحكم","Clients":"العملاء","Active Clients":"العملاء النشطون",
  "Tasks":"المهام","Creative Tasks":"المهام الإبداعية","Calendar":"التقويم",
  "Finance":"المالية","Contracts":"العقود","Reports":"التقارير","Analytics":"التحليلات",
  "Revenue Forecast":"توقع الإيرادات","KPIs & BI":"مؤشرات الأداء",
  "Files & Documents":"الملفات والمستندات","Notifications":"الإشعارات","Settings":"الإعدادات",
  "Custom Report":"تقرير مخصص","Run Report":"تشغيل التقرير",
  "Select Fields":"اختر الحقول","Select All":"تحديد الكل","Clear":"مسح",
  "Schedule New Post":"جدولة منشور جديد","Post Date":"تاريخ النشر","Platform":"المنصة",
  "Client":"العميل","Post Title / Brief":"عنوان المنشور / الملخص","Caption":"النص",
  "Cancel":"إلغاء","Schedule Post":"جدولة المنشور","Month Stats":"إحصائيات الشهر",
  "Scheduled":"مجدول","Posted":"تم النشر","Total":"الإجمالي","No posts this day":"لا توجد منشورات في هذا اليوم",
  "Upcoming Posts":"المنشورات القادمة","Pending approvals":"الموافقات المعلقة",
  "Ad Spend MTD":"الإنفاق الإعلاني هذا الشهر","Revenue MTD":"الإيراد هذا الشهر",
  "Outstanding":"المستحق","Search...":"بحث...","Sign Out":"تسجيل الخروج",
  "Active":"نشط","Inactive":"غير نشط","Pending":"قيد الانتظار","In Progress":"قيد التنفيذ",
  "Review":"قيد المراجعة","Approved":"مقبول","Rejected":"مرفوض","Revision":"طلب تعديل",
  "Completed":"مكتمل","High":"عالية","Medium":"متوسطة","Low":"منخفضة",
  "Create":"إنشاء","Save":"حفظ","Update":"تحديث","Delete":"حذف","Edit":"تعديل","Open":"فتح",
  "View":"عرض","Download":"تنزيل","Upload":"رفع","Close":"إغلاق","Back":"رجوع","Next":"التالي",
  "Name":"الاسم","Company":"الشركة","Email":"البريد الإلكتروني","Phone":"الهاتف","Industry":"المجال",
  "Status":"الحالة","Priority":"الأولوية","Deadline":"الموعد النهائي","Category":"التصنيف",
  "Amount":"المبلغ","Date":"التاريخ","Description":"الوصف","Notes":"ملاحظات","Actions":"الإجراءات",
  "No data yet":"لا توجد بيانات بعد","No results":"لا توجد نتائج","Loading...":"جارٍ التحميل...",
  "Try again":"حاول مرة أخرى","Back to dashboard":"العودة للوحة التحكم","Settings & Preferences":"الإعدادات والتفضيلات",
  "Upload a file":"رفع ملف","Recent files":"أحدث الملفات","Private / not linked":"خاص / غير مرتبط",
  "Custom Report Builder":"منشئ التقارير المخصصة","Quick Export":"تصدير سريع","Export CSV":"تصدير CSV",
  "Export JSON":"تصدير JSON","Print / PDF":"طباعة / PDF","Load 50 more":"تحميل 50 نتيجة إضافية"
};

const originals = new WeakMap<Text,string>();
const placeholderOriginals = new WeakMap<Element,string>();
function translate(root: ParentNode, lang: "en"|"ar") {
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let node:Node|null;
  while((node=walker.nextNode())){
    const text=node as Text;
    const parent=text.parentElement;
    if(!parent||["SCRIPT","STYLE","CODE","PRE"].includes(parent.tagName))continue;
    if(!originals.has(text)) originals.set(text,text.data);
    const source=originals.get(text) || text.data;
    if(lang==="en"){ if(text.data!==source)text.data=source; continue; }
    const trimmed=source.trim();
    const translated=AR[trimmed];
    if(translated) text.data=source.replace(trimmed,translated);
  }
  root.querySelectorAll?.("input[placeholder],textarea[placeholder]").forEach(el=>{
    const source=placeholderOriginals.get(el)||el.getAttribute("placeholder")||"";
    if(!placeholderOriginals.has(el))placeholderOriginals.set(el,source);
    el.setAttribute("placeholder",lang==="ar"?(AR[source]||source):source);
  });
}

export function DashboardLanguage(){
  useEffect(()=>{
    let lang=((localStorage.getItem("vivit-lang")||"en") as "en"|"ar");
    const apply=()=>{document.documentElement.lang=lang;document.documentElement.dir=lang==="ar"?"rtl":"ltr";translate(document.body,lang);};
    apply();
    const language=(event:Event)=>{lang=(event as CustomEvent).detail;apply();};
    const observer=new MutationObserver(()=>translate(document.body,lang));
    observer.observe(document.body,{subtree:true,childList:true});
    window.addEventListener("vivit-language",language);
    return()=>{observer.disconnect();window.removeEventListener("vivit-language",language);};
  },[]);
  return null;
}
