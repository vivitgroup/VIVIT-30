import Link from "next/link";

export function VivitoLauncher({workspace}:{workspace:"group"|"marketing"|"hospitality"|"tech"}){
  const accent=workspace==="marketing"?"#e75a63":workspace==="hospitality"?"#D6AD5B":workspace==="tech"?"#42ADF5":"#8bd3ff";
  return <Link data-vivito-launcher={workspace} href={`/group/vivito?workspace=${workspace}`} aria-label={`Open Vivito in ${workspace}`} style={{position:"fixed",right:20,bottom:20,zIndex:80,width:58,height:58,borderRadius:20,display:"grid",placeItems:"center",textDecoration:"none",fontWeight:950,fontSize:18,color:"#071018",background:accent,border:"1px solid rgba(255,255,255,.42)",boxShadow:`0 18px 55px ${accent}55`}}>V</Link>;
}
