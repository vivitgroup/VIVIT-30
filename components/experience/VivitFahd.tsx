"use client";
import {useEffect,useMemo,useState} from "react";

type Mood="calm"|"thinking"|"insight"|"warning"|"success";
export default function VivitFahd({mood="calm",message}:{mood?:Mood;message?:string}){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{const t=setTimeout(()=>setVisible(true),700);return()=>clearTimeout(t)},[]);
 const face=useMemo(()=>mood==="warning"?"!":mood==="success"?"✓":mood==="thinking"?"…":"✦",[mood]);
 return <div className={`vivit-fahd ${visible?"is-visible":""} mood-${mood}`} aria-live="polite">
   {message&&<div className="vivit-fahd-bubble">{message}</div>}
   <div className="vivit-fahd-runway" aria-hidden="true"><span className="vivit-fahd-mark">🐆</span><span className="vivit-fahd-signal">{face}</span></div>
 </div>
}
