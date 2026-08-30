"use client";
import {useEffect} from "react";

export function AIStudioRuntime(){
  useEffect(()=>{
    const onClick=async(e:MouseEvent)=>{
      const btn=(e.target as HTMLElement).closest<HTMLButtonElement>('[id$="-btn"]');
      if(!btn)return;
      const toolId=btn.id.replace(/-btn$/,""),output=document.getElementById(toolId+"-output"),placeholder=document.getElementById(toolId+"-placeholder");
      if(!output||!placeholder)return;
      const original=btn.textContent;btn.textContent="⏳ Generating…";btn.disabled=true;
      const data:unknown={tool:toolId};
      document.querySelectorAll<HTMLInputElement|HTMLSelectElement>(`[id^="${toolId}-"]`).forEach(el=>{const field=el.id.replace(toolId+"-","");if(!["btn","output","placeholder"].includes(field))data[field]=el.value});
      try{const res=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});const result=await res.json();if(!res.ok)throw new Error(result.error||"Generation failed");output.textContent=result.content||result.result;output.style.display="block";output.style.color="var(--text-primary)";placeholder.style.display="none";}
      catch(err){output.textContent=err.message||"Generation failed. Please try again.";output.style.display="block";output.style.color="var(--red)";placeholder.style.display="none";}
      finally{btn.textContent=original;btn.disabled=false;}
    };
    document.addEventListener("click",onClick);return()=>document.removeEventListener("click",onClick);
  },[]);
  return null;
}
