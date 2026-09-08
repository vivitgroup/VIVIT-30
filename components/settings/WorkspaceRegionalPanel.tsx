"use client";

import {useEffect,useMemo,useState} from "react";

type RegionResponse={currency?:string;timezone?:string;canEdit?:boolean;error?:string};
const FALLBACK_CURRENCIES=["AED","AUD","BHD","CAD","CHF","CNY","EGP","EUR","GBP","JPY","KWD","OMR","QAR","SAR","SGD","USD"];
const FALLBACK_TIMEZONES=["Africa/Cairo","Africa/Johannesburg","America/Los_Angeles","America/New_York","Asia/Dubai","Asia/Riyadh","Asia/Singapore","Asia/Tokyo","Australia/Sydney","Europe/London","Europe/Paris","UTC"];

function supported(kind:"currency"|"timeZone",fallback:string[]){
 try{
  const fn=(Intl as typeof Intl&{supportedValuesOf?:(key:string)=>string[]}).supportedValuesOf;
  const values=fn?.(kind);return values?.length?values:fallback;
 }catch{return fallback}
}

export function WorkspaceRegionalPanel(){
 const [currency,setCurrency]=useState("USD"),[timezone,setTimezone]=useState("Africa/Cairo"),[canEdit,setCanEdit]=useState(false),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(""),[saved,setSaved]=useState("");
 const currencies=useMemo(()=>supported("currency",FALLBACK_CURRENCIES),[]),timezones=useMemo(()=>supported("timeZone",FALLBACK_TIMEZONES),[]);
 useEffect(()=>{let active=true;fetch("/api/workspace-region",{cache:"no-store"}).then(async r=>({ok:r.ok,data:await r.json().catch(()=>({})) as RegionResponse})).then(({ok,data})=>{if(!active)return;if(!ok)throw new Error(data.error||"Could not load regional settings.");setCurrency(String(data.currency||"USD"));setTimezone(String(data.timezone||"Africa/Cairo"));setCanEdit(Boolean(data.canEdit))}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Could not load regional settings.")}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]);
 const save=async()=>{setSaving(true);setError("");setSaved("");try{const response=await fetch("/api/workspace-region",{method:"PATCH",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({currency,timezone})}),data=await response.json().catch(()=>({})) as RegionResponse;if(!response.ok)throw new Error(data.error||"Could not save regional settings.");setCurrency(String(data.currency||currency));setTimezone(String(data.timezone||timezone));setSaved("Workspace regional settings saved.")}catch(e){setError(e instanceof Error?e.message:"Could not save regional settings.")}finally{setSaving(false)}};
 const sample=useMemo(()=>{try{return new Intl.NumberFormat("en",{style:"currency",currency}).format(123456.78)}catch{return currency+" 123,456.78"}},[currency]);
 return <section className="card" style={{minWidth:0}}><div className="card-body">
  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}><div><h2 className="card-title">Workspace Region</h2><p className="page-subtitle">Company-wide currency and timezone used for multinational reporting and scheduling.</p></div><span className="badge">{canEdit?"Admin controlled":"Workspace policy"}</span></div>
  {loading?<p style={{marginTop:14,color:"var(--text-muted)"}}>Loading regional policy…</p>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(220px,100%),1fr))",gap:12,marginTop:14}}>
   <label><span className="form-label">Base currency</span><select className="form-select" aria-label="Workspace currency" value={currency} disabled={!canEdit||saving} onChange={e=>{setCurrency(e.target.value);setSaved("")}}>{currencies.map(v=><option key={v} value={v}>{v}</option>)}</select><small style={{display:"block",marginTop:6,color:"var(--text-muted)"}}>Preview: {sample}</small></label>
   <label><span className="form-label">Workspace timezone</span><select className="form-select" aria-label="Workspace timezone" value={timezone} disabled={!canEdit||saving} onChange={e=>{setTimezone(e.target.value);setSaved("")}}>{timezones.map(v=><option key={v} value={v}>{v}</option>)}</select><small style={{display:"block",marginTop:6,color:"var(--text-muted)"}}>IANA timezone · used for calendar boundaries and scheduled activity.</small></label>
  </div>}
  {error&&<p role="alert" style={{color:"var(--red)",fontSize:12,marginTop:10}}>{error}</p>}{saved&&<p role="status" style={{color:"var(--green)",fontSize:12,marginTop:10}}>{saved}</p>}
  {!loading&&canEdit&&<div style={{display:"flex",justifyContent:"flex-end",marginTop:14}}><button type="button" className="btn btn-primary" disabled={saving} onClick={save}>{saving?"Saving…":"Save Workspace Region"}</button></div>}
 </div></section>;
}
