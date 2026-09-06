"use client";
import {FormEvent,useState} from "react";

type Field={name:string;label:string;type?:"text"|"number"|"date"|"email";required?:boolean;placeholder?:string;defaultValue?:string|number;readOnly?:boolean};
function readableError(value:unknown,fallback="Request failed"){
 if(typeof value==="string"&&value.trim())return value;
 if(value&&typeof value==="object"){
  const record=value as Record<string,unknown>;
  if(typeof record.message==="string"&&record.message.trim())return record.message;
  if(typeof record.code==="string"&&record.code.trim())return record.code.replaceAll("_"," ").toLowerCase();
  try{const json=JSON.stringify(value);if(json&&json!=="{}")return json}catch{}
 }
 return fallback;
}
export function JsonMutationForm({endpoint,title,submitLabel="Save",fields,tone="group"}:{endpoint:string;title:string;submitLabel?:string;fields:Field[];tone?:"hospitality"|"tech"|"group"}){
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState<string>("");const [ok,setOk]=useState(false);
 const accent=tone==="hospitality"?"#c9a24d":tone==="tech"?"#42adf5":"#a78bfa";
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setMessage("");setOk(false);const form=new FormData(e.currentTarget);const payload:Record<string,unknown>={};for(const f of fields){const raw=String(form.get(f.name)??"");payload[f.name]=f.type==="number"?Number(raw):raw}try{const res=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});const body=await res.json().catch(()=>({}));if(!res.ok)throw new Error(readableError((body as Record<string,unknown>)?.error,`Request failed (${res.status})`));setMessage("Saved successfully");setOk(true);e.currentTarget.reset();window.location.reload()}catch(err){setMessage(err instanceof Error?err.message:"Request failed")}finally{setBusy(false)}}
 return <form onSubmit={submit} style={{padding:20,border:"1px solid #d7dde7",borderRadius:20,background:"#fff",display:"grid",gap:12,color:"#111827",minWidth:0}}><h3 style={{margin:0,fontSize:18}}>{title}</h3><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(180px,100%),1fr))",gap:10,minWidth:0}}>{fields.map(f=><label key={f.name} style={{display:"grid",gap:6,fontSize:12,fontWeight:800,minWidth:0}}>{f.label}<input name={f.name} type={f.type||"text"} required={f.required} placeholder={f.placeholder} defaultValue={f.defaultValue} readOnly={f.readOnly} style={{width:"100%",minWidth:0,boxSizing:"border-box",padding:"12px",borderRadius:12,border:"1px solid #cfd6df",background:f.readOnly?"#f3f4f6":"#fff",color:"#111827",opacity:f.readOnly?.8:1,fontSize:16}}/></label>)}</div><button disabled={busy} style={{justifySelf:"start",padding:"11px 16px",borderRadius:999,border:0,background:accent,color:"#071018",fontWeight:900,cursor:"pointer",opacity:busy?.6:1}}>{busy?"Saving…":submitLabel}</button>{message?<div role="status" style={{fontSize:13,color:ok?"#166534":"#b42318",fontWeight:700,overflowWrap:"anywhere"}}>{message}</div>:null}</form>
}
