import {canAccessBusinessUnit,hasPermission} from "@/lib/vgroup/contracts";
import {getVGroupSql} from "@/lib/vgroup/db";
import type {VGroupSession} from "@/lib/vgroup/session";
import type {VivitoWorkspace} from "@/lib/vgroup/vivito-cross-workspace";

export type VivitoEntityType="hospitality.property"|"hospitality.reservation"|"tech.project"|"tech.client";
export type VivitoResolvedEntity={type:VivitoEntityType;id:string;label:string;aliases:string[];score:number};
export type VivitoEntityResolution={matches:VivitoResolvedEntity[];ambiguous:boolean;query:string};

type Candidate={type:VivitoEntityType;id:string;label:string;aliases:string[]};

const normalize=(value:string)=>value
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[\u064B-\u065F\u0670]/g,"")
  .replace(/[إأآ]/g,"ا")
  .replace(/ى/g,"ي")
  .replace(/ة/g,"ه")
  .replace(/[^\p{L}\p{N}]+/gu," ")
  .trim();

function tokens(value:string){return new Set(normalize(value).split(/\s+/).filter(Boolean))}
function score(query:string,candidate:Candidate){
  const q=normalize(query); if(!q)return 0;
  const labels=[candidate.label,...candidate.aliases].map(normalize).filter(Boolean);
  if(labels.some(v=>v===q))return 100;
  if(labels.some(v=>q.includes(v)&&v.length>=3))return 90;
  const qt=tokens(q); let best=0;
  for(const label of labels){
    const lt=tokens(label); if(!lt.size)continue;
    let common=0; for(const token of lt)if(qt.has(token))common++;
    best=Math.max(best,Math.round((common/Math.max(lt.size,1))*80));
  }
  return best;
}

async function candidatesFor(session:VGroupSession,workspace:VivitoWorkspace):Promise<Candidate[]>{
  const sql=getVGroupSql(); const out:Candidate[]=[];
  if((workspace==="group"||workspace==="hospitality")&&canAccessBusinessUnit(session,"hospitality")){
    if(hasPermission(session,"hospitality","properties:view")){
      const rows=await sql<{id:string;name:string;owner_name:string|null;city:string|null}[]>`select p.id::text,p.name,o.full_name owner_name,p.city from hospitality.properties p left join hospitality.owners o on o.id=p.owner_id where p.archived_at is null limit 500`;
      for(const row of rows)out.push({type:"hospitality.property",id:row.id,label:row.name,aliases:[row.owner_name??"",row.city??""].filter(Boolean)});
    }
    if(hasPermission(session,"hospitality","reservations:view")){
      const rows=await sql<{id:string;guest_name:string;property_name:string}[]>`select r.id::text,r.guest_name,p.name property_name from hospitality.reservations r join hospitality.properties p on p.id=r.property_id where r.archived_at is null order by r.created_at desc limit 500`;
      for(const row of rows)out.push({type:"hospitality.reservation",id:row.id,label:row.guest_name,aliases:[row.property_name]});
    }
  }
  if((workspace==="group"||workspace==="tech")&&canAccessBusinessUnit(session,"tech")&&hasPermission(session,"tech","projects:view")){
    const [projects,clients]=await Promise.all([
      sql<{id:string;name:string;client_name:string}[]>`select p.id::text,p.name,c.company_name client_name from tech.projects p join tech.clients c on c.id=p.client_id where p.archived_at is null limit 500`,
      sql<{id:string;company_name:string}[]>`select id::text,company_name from tech.clients where archived_at is null limit 500`,
    ]);
    for(const row of projects)out.push({type:"tech.project",id:row.id,label:row.name,aliases:[row.client_name]});
    for(const row of clients)out.push({type:"tech.client",id:row.id,label:row.company_name,aliases:[]});
  }
  return out;
}

export async function resolveVivitoEntities(session:VGroupSession,workspace:VivitoWorkspace,query:string):Promise<VivitoEntityResolution>{
  const candidates=await candidatesFor(session,workspace);
  const ranked=candidates.map(candidate=>({...candidate,score:score(query,candidate)})).filter(item=>item.score>=60).sort((a,b)=>b.score-a.score).slice(0,8);
  const top=ranked[0]?.score??0;
  const close=ranked.filter(item=>item.score>=Math.max(60,top-5));
  return {query,matches:ranked,ambiguous:close.length>1&&top<100};
}
