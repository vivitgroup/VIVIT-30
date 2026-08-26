"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";

export default function PortalAutoRefresh({seconds=30}:{seconds?:number}){
  const router=useRouter();
  const [last,setLast]=useState(()=>new Date());
  useEffect(()=>{const id=setInterval(()=>{router.refresh();setLast(new Date())},Math.max(10,seconds)*1000);return()=>clearInterval(id)},[router,seconds]);
  return <span className="portal-live"><i/> Live · updated {last.toLocaleTimeString("en-EG",{hour:"2-digit",minute:"2-digit"})}</span>;
}
