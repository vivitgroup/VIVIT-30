import {WorkspacePage} from "@/components/vgroup/workspace-page";
import {InstallmentPayControl} from "@/components/vgroup/installment-pay-control";
import {requireBusinessUnitAccess} from "@/lib/vgroup/access";
import {getVGroupSql} from "@/lib/vgroup/db";

export const dynamic="force-dynamic";
type BillingRow={id:string;installment_number:number;label:string|null;currency:string;amount:number|string;paid_amount:number|string;due_date:string|Date|null;status:string;project_name:string;client_name:string};
export default async function Page(){
 await requireBusinessUnitAccess("tech");
 const sql=getVGroupSql();
 const rows=await sql<BillingRow[]>`select i.id::text,i.installment_number,i.label,i.currency,i.amount,i.paid_amount,i.due_date,i.status,p.name project_name,c.company_name client_name from tech.payment_installments i join tech.projects p on p.id=i.project_id join tech.clients c on c.id=p.client_id order by i.due_date asc nulls last,i.installment_number asc limit 120`;
 return <><WorkspacePage tone="tech" eyebrow="TECH COMMERCIAL" title="Billing & Collections" description="Commercial controls for total project value, installments, payment capture, overdue monitoring and budget snapshots." sections={[{title:"Installments",body:"Schedule, paid/remaining balance and next due payment"},{title:"Collections",body:"Payment registration with overpayment prevention"},{title:"Overdue",body:"Past-due visibility and escalation-ready status"},{title:"Budget",body:"Commercial snapshots for original, approved-change and current project value"}]}/><section style={{maxWidth:1180,margin:"-40px auto 60px",padding:"0 20px",color:"#eef7ff",display:"grid",gap:10}}>{Array.from(rows).map(r=>{const remaining=Math.max(0,Number(r.amount||0)-Number(r.paid_amount||0));return <article key={r.id} style={{padding:16,border:"1px solid #193650",borderRadius:16,display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",flexWrap:"wrap"}}><div><b>{r.project_name} · #{r.installment_number} {r.label||""}</b><div style={{fontSize:12,color:"#9eb3c8",marginTop:4}}>{r.client_name} · due {String(r.due_date||"—")}</div><div style={{fontSize:12,marginTop:5}}>{r.currency} {Number(r.amount||0).toFixed(2)} · paid {Number(r.paid_amount||0).toFixed(2)} · remaining {remaining.toFixed(2)} · <b>{r.status}</b></div></div><InstallmentPayControl id={r.id} remaining={remaining}/></article>})}</section></>
}
