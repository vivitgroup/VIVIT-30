"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";

const ROLES=["HR","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","ACCOUNTANT","SALES"];
const PERMISSIONS=[
 ["view_clients","View clients"],["create_clients","Create clients"],["edit_clients","Edit clients"],["delete_clients","Delete clients"],
 ["view_tasks","View tasks"],["create_tasks","Create tasks"],["edit_tasks","Edit tasks"],["delete_tasks","Delete tasks"],["approve_tasks","Approve tasks"],["assign_tasks","Assign tasks"],
 ["view_media","View media"],["edit_media","Edit media"],["manage_budgets","Manage budgets"],
 ["view_finance","View finance"],["view_payroll","View payroll"],["manage_payroll","Manage payroll"],
 ["view_team","View team"],["manage_team","Manage team"],["view_salaries","View salaries"],["approve_leaves","Approve leaves"],
 ["view_reports","View reports"],["export_data","Export data"],["use_ai_studio","Use Vivito"]
] as const;

export function NewEmployeeForm(){
 const router=useRouter(),[roles,setRoles]=useState<string[]>([]),[permissions,setPermissions]=useState<string[]>([]),[saving,setSaving]=useState(false),[error,setError]=useState("");
 const toggle=(value:string,list:string[],set:(v:string[])=>void)=>set(list.includes(value)?list.filter(x=>x!==value):[...list,value]);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setError("");if(!roles.length)return setError("Choose at least one role.");setSaving(true);const fd=new FormData(e.currentTarget);try{const r=await fetch("/api/hr/employees",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...Object.fromEntries(fd.entries()),roles,permissions})}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Employee could not be created.");router.push("/dashboard/team");router.refresh()}catch(e){setError(e instanceof Error?e.message:"Employee could not be created.")}finally{setSaving(false)}}
 return <form onSubmit={submit} style={{display:"grid",gap:16,maxWidth:1000}}>
  <section className="card"><div className="card-header"><div><p className="card-title">Employee account</p><p className="page-subtitle">HR creates the system login and current monthly salary together.</p></div></div><div className="card-body" style={{display:"grid",gap:12}}><div className="form-grid"><label className="form-label">FULL NAME *<input name="name" required minLength={2} className="form-input"/></label><label className="form-label">EMAIL *<input name="email" required type="email" className="form-input"/></label><label className="form-label">PHONE<input name="phone" type="tel" className="form-input"/></label><label className="form-label">MONTHLY SALARY (EGP) *<input name="salary" required type="number" min="0" step="0.01" className="form-input"/></label></div><label className="form-label">TEMPORARY PASSWORD *<input name="password" required type="password" minLength={10} autoComplete="new-password" className="form-input"/><small style={{color:"var(--text-muted)"}}>Minimum 10 characters. Share it securely and have the employee change it after first login.</small></label></div></section>
  <section className="card"><div className="card-header"><div><p className="card-title">Roles</p><p className="page-subtitle">Choose one or more. The first selected role is the primary login role; all selected roles are retained in the access profile.</p></div></div><div className="card-body" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:8}}>{ROLES.map(role=><label key={role} style={{padding:10,border:"1px solid var(--card-border)",borderRadius:10,display:"flex",gap:8,alignItems:"center",cursor:"pointer"}}><input type="checkbox" checked={roles.includes(role)} onChange={()=>toggle(role,roles,setRoles)}/><b style={{fontSize:12}}>{role.replaceAll("_"," ")}</b></label>)}</div></section>
  <section className="card"><div className="card-header"><div><p className="card-title">Extra permissions</p><p className="page-subtitle">Grant permissions beyond the selected roles without changing the employee’s primary role.</p></div></div><div className="card-body" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:8}}>{PERMISSIONS.map(([key,label])=><label key={key} style={{padding:9,border:"1px solid var(--card-border)",borderRadius:10,display:"flex",gap:8,alignItems:"center",cursor:"pointer"}}><input type="checkbox" checked={permissions.includes(key)} onChange={()=>toggle(key,permissions,setPermissions)}/><span style={{fontSize:12}}>{label}</span></label>)}</div></section>
  {error&&<div className="form-error" role="alert">{error}</div>}<div style={{display:"flex",gap:8}}><Link href="/dashboard/team" className="btn btn-ghost">Cancel</Link><button disabled={saving} className="btn btn-primary">{saving?"Creating employee…":"Create employee & account"}</button></div>
 </form>
}
