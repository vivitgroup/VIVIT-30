"use client";

import {useEffect,useRef} from "react";

export function MarketingHandoffForm({endpoint,assertion}:{endpoint:string;assertion:string}){
  const formRef=useRef<HTMLFormElement>(null);
  useEffect(()=>{formRef.current?.submit()},[]);
  return <form ref={formRef} method="post" action={endpoint} style={{marginTop:20,padding:22,borderRadius:20,border:"1px solid #4b272c",background:"rgba(231,90,99,.08)"}}>
    <input type="hidden" name="assertion" value={assertion}/>
    <strong style={{display:"block",fontSize:18}}>Connecting securely to Vivit Marketing…</strong>
    <p style={{color:"#caa9ad",lineHeight:1.6}}>Your Marketing account will be revalidated before a session is issued.</p>
    <button type="submit" style={{border:0,borderRadius:999,padding:"11px 16px",fontWeight:900,cursor:"pointer",background:"#e75a63",color:"#fff"}}>Continue to Marketing</button>
  </form>;
}
