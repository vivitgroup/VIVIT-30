"use client";
import {FormEvent,useEffect,useMemo,useState} from "react";

type Statement={id:string;owner_name:string;period_start:string;period_end:string;currency:string;gross_revenue:number;net_payable:number;status:string};
type FinanceData={statements:Statement[];payouts:unknown[];refunds:unknown[];deposits:unknown[]};
type Ref={id:string;name:string};
type Expense={id:string;property_id:string;property_name:string;vendor_name:string|null;category_name:string|null;invoice_number:string|null;invoice_type:string;currency:string;subtotal:number;tax:number;total:number;issued_at:string;status:string;notes:string|null;receipt_count:number};
type ExpenseData={expenses:Expense[];properties:Ref[];categories:Ref[];vendors:Ref[]};

const card:React.CSSProperties={padding:18,border:"1px solid #4a3a1c",borderRadius:18,background:"#12100c"};
const input:React.CSSProperties={width:"100%",boxSizing:"border-box",background:"#0c0b09",color:"#f7f1e3",border:"1px solid #5a4927",borderRadius:12,padding:"11px 12px"};
const label:React.CSSProperties={display:"grid",gap:6,fontSize:12,fontWeight:800,color:"#d8c9a7"};
const button:React.CSSProperties={border:0,borderRadius:12,padding:"11px 15px",fontWeight:900,cursor:"pointer",background:"#d6ad5b",color:"#0c1b2a"};

function errorText(value:unknown){if(typeof value==="string")return value;if(value&&typeof value==="object"&&"message" in value)return String((value as {message?:unknown}).message??"Request failed");return "Request failed"}

export function HospitalityFinancePanel(){
  const[finance,setFinance]=useState<FinanceData|null>(null);
  const[expenseData,setExpenseData]=useState<ExpenseData|null>(null);
  const[error,setError]=useState("");
  const[saving,setSaving]=useState(false);
  const[message,setMessage]=useState("");
  const[reportProperty,setReportProperty]=useState("");
  const today=new Date().toISOString().slice(0,10);
  const monthStart=`${today.slice(0,8)}01`;
  const[reportFrom,setReportFrom]=useState(monthStart);
  const[reportTo,setReportTo]=useState(today);

  const loadFinance=()=>fetch("/api/vgroup/hospitality/finance",{cache:"no-store"}).then(async r=>{const body=await r.json();if(!r.ok)throw new Error(errorText(body.error));return body as FinanceData}).then(setFinance);
  const loadExpenses=()=>fetch("/api/vgroup/hospitality/expenses",{cache:"no-store"}).then(async r=>{const body=await r.json();if(!r.ok)throw new Error(errorText(body.error));return body as ExpenseData}).then(data=>{setExpenseData(data);setReportProperty(current=>current||data.properties[0]?.id||"")});
  const load=()=>Promise.all([loadFinance(),loadExpenses()]).catch((e:unknown)=>setError(e instanceof Error?e.message:"load_failed"));
  useEffect(()=>{void load()},[]);

  const propertyTotals=useMemo(()=>{
    const map=new Map<string,{name:string,total:number;currency:string}>();
    for(const item of expenseData?.expenses??[]){const current=map.get(item.property_id)??{name:item.property_name,total:0,currency:item.currency};current.total+=Number(item.total);map.set(item.property_id,current)}
    return Array.from(map.entries());
  },[expenseData]);

  async function submitExpense(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setSaving(true);setMessage("");setError("");
    const form=new FormData(event.currentTarget);
    try{
      const response=await fetch("/api/vgroup/hospitality/expenses",{method:"POST",body:form});
      const body=await response.json();if(!response.ok)throw new Error(errorText(body.error));
      event.currentTarget.reset();setMessage("Expense saved and locked to its property.");await loadExpenses();
    }catch(e){setError(e instanceof Error?e.message:"expense_save_failed")}finally{setSaving(false)}
  }

  function exportReport(format:"xls"|"pdf"){
    if(!reportProperty){setError("Select a property before exporting");return}
    const qs=new URLSearchParams({propertyId:reportProperty,from:reportFrom,to:reportTo,format});
    window.location.href=`/api/vgroup/hospitality/expenses/report?${qs.toString()}`;
  }

  if(!finance||!expenseData)return <p>{error||"Loading finance…"}</p>;
  return <div style={{display:"grid",gap:26}}>
    {error&&<div style={{...card,borderColor:"#7b2c2c",color:"#ffb8b8"}}>{error}</div>}
    {message&&<div style={{...card,borderColor:"#4c6c40",color:"#d9ffc9"}}>{message}</div>}

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
      {[["Expenses",expenseData.expenses.length],["Properties with spend",propertyTotals.length],["Statements",finance.statements.length],["Payouts",finance.payouts.length],["Refunds",finance.refunds.length],["Deposits",finance.deposits.length]].map(([l,v])=><div key={String(l)} style={card}><b style={{fontSize:24}}>{v}</b><div style={{opacity:.7}}>{l}</div></div>)}
    </div>

    <section style={card}>
      <div style={{display:"flex",justifyContent:"space-between",gap:16,flexWrap:"wrap",alignItems:"start"}}><div><div style={{fontSize:12,letterSpacing:".14em",color:"#d6ad5b",fontWeight:900}}>PROPERTY-BOUND EXPENSE</div><h2 style={{margin:"6px 0"}}>Add hospitality expense</h2><p style={{margin:0,opacity:.72,maxWidth:720}}>Property is mandatory. A receipt/invoice image is optional and stays in private Hospitality storage.</p></div><span style={{padding:"7px 10px",borderRadius:999,background:"#211b10",color:"#d6ad5b",fontWeight:800}}>JPG / PNG / WEBP / PDF · max 20MB</span></div>
      <form onSubmit={submitExpense} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12,marginTop:18}}>
        <label style={label}>Property / Apartment *<select name="propertyId" required style={input} defaultValue=""><option value="" disabled>Select property</option>{expenseData.properties.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label style={label}>Category<select name="categoryId" style={input} defaultValue=""><option value="">Uncategorized</option>{expenseData.categories.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label style={label}>Vendor<select name="vendorId" style={input} defaultValue=""><option value="">No vendor</option>{expenseData.vendors.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label style={label}>Invoice #<input name="invoiceNumber" style={input}/></label>
        <label style={label}>Expense type<select name="invoiceType" style={input} defaultValue="vendor_bill"><option value="vendor_bill">Vendor bill</option><option value="owner_charge">Owner charge</option><option value="platform_fee">Platform fee</option><option value="company_fee">Company fee</option><option value="other">Other</option></select></label>
        <label style={label}>Currency<input name="currency" defaultValue="EGP" maxLength={3} style={input}/></label>
        <label style={label}>Subtotal *<input name="subtotal" type="number" min="0" step="0.01" required style={input}/></label>
        <label style={label}>Tax<input name="tax" type="number" min="0" step="0.01" defaultValue="0" style={input}/></label>
        <label style={label}>Issue date *<input name="issuedAt" type="date" required defaultValue={today} style={input}/></label>
        <label style={label}>Due date<input name="dueAt" type="date" style={input}/></label>
        <label style={{...label,gridColumn:"span 2"}}>Invoice / receipt image or PDF<input name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={input}/></label>
        <label style={{...label,gridColumn:"1 / -1"}}>Notes<textarea name="notes" rows={3} style={input}/></label>
        <div style={{gridColumn:"1 / -1"}}><button disabled={saving} style={{...button,opacity:saving?.65:1}}>{saving?"Saving…":"Save expense"}</button></div>
      </form>
    </section>

    <section style={card}>
      <div style={{display:"flex",justifyContent:"space-between",gap:14,flexWrap:"wrap",alignItems:"end"}}><div><div style={{fontSize:12,letterSpacing:".14em",color:"#d6ad5b",fontWeight:900}}>VIVIT HOSPITALITY REPORTING</div><h2 style={{margin:"6px 0"}}>Property expense statement</h2><p style={{margin:0,opacity:.72}}>Export one apartment/property only, for any selected period, in branded Excel or PDF.</p></div></div>
      <div style={{display:"grid",gridTemplateColumns:"minmax(200px,2fr) repeat(2,minmax(150px,1fr)) auto auto",gap:10,marginTop:16,alignItems:"end"}}>
        <label style={label}>Property<select value={reportProperty} onChange={e=>setReportProperty(e.target.value)} style={input}>{expenseData.properties.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label style={label}>From<input type="date" value={reportFrom} onChange={e=>setReportFrom(e.target.value)} style={input}/></label>
        <label style={label}>To<input type="date" value={reportTo} onChange={e=>setReportTo(e.target.value)} style={input}/></label>
        <button type="button" style={button} onClick={()=>exportReport("xls")}>Excel</button>
        <button type="button" style={{...button,background:"#f7f1e3"}} onClick={()=>exportReport("pdf")}>PDF</button>
      </div>
    </section>

    <section><h2>Recent property expenses</h2><div style={{display:"grid",gap:8}}>{expenseData.expenses.map(e=><div key={e.id} style={{...card,display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:10}}><span><b>{e.property_name}</b><br/><small>{e.issued_at} · {e.category_name||e.invoice_type}{e.vendor_name?` · ${e.vendor_name}`:""}</small></span><span>Invoice<br/><b>{e.invoice_number||"—"}</b></span><span>Total<br/><b>{e.currency} {Number(e.total).toLocaleString()}</b></span><span>Receipt<br/><b>{e.receipt_count>0?"Attached":"No receipt"}</b></span></div>)}</div></section>

    <section><h2>Owner statements</h2><div style={{display:"grid",gap:8}}>{finance.statements.map(s=><div key={s.id} style={{...card,display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:10}}><span>{s.owner_name}<br/><small>{s.period_start} → {s.period_end}</small></span><span>Gross<br/><b>{s.currency} {Number(s.gross_revenue).toLocaleString()}</b></span><span>Net<br/><b>{s.currency} {Number(s.net_payable).toLocaleString()}</b></span><span>{s.status}</span></div>)}</div></section>
  </div>
}
