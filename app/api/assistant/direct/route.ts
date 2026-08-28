export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,sql} from "@/lib/db";
import {confirmVivitoDirectEvent} from "@/lib/vivito/direct-runtime";
const rows=(v:any)=>Array.from(v as any) as any[];

export async function GET(){
 const s=await auth();if(!s?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const role=String((s.user as any).role||""),userId=String((s.user as any).id||"");
 if(!["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"].includes(role))return NextResponse.json({events:[]},{headers:{"Cache-Control":"private, no-store"}});
 let q:any;
 if(role==="SUPER_ADMIN")q=sql`select e.* from vivito_autonomy_events e where e.workspace_id='default' and e.status='AWAITING_CONFIRMATION' order by e.created_at desc limit 100`;
 else if(role==="ACCOUNT_MANAGER")q=sql`select e.* from vivito_autonomy_events e join clients c on c.id=e.client_id where e.workspace_id='default' and e.status='AWAITING_CONFIRMATION' and c.account_manager_id=${userId} order by e.created_at desc limit 100`;
 else q=sql`select e.* from vivito_autonomy_events e join clients c on c.id=e.client_id where e.workspace_id='default' and e.status='AWAITING_CONFIRMATION' and c.media_buyer_id=${userId} order by e.created_at desc limit 100`;
 try{return NextResponse.json({events:rows(await db.execute(q))},{headers:{"Cache-Control":"private, no-store"}})}catch{return NextResponse.json({events:[],schemaReady:false},{status:503,headers:{"Cache-Control":"private, no-store"}})}
}

export async function POST(req:NextRequest){
 const s=await auth();if(!s?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const role=String((s.user as any).role||""),userId=String((s.user as any).id||"");
 if(!["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"].includes(role))return NextResponse.json({error:"Not authorized"},{status:403});
 const b=await req.json().catch(()=>({})),eventId=String(b.eventId||"");
 if(!eventId||b.confirm!==true)return NextResponse.json({error:"eventId and explicit confirm=true are required."},{status:409});
 try{return NextResponse.json(await confirmVivitoDirectEvent(eventId,role,userId),{headers:{"Cache-Control":"private, no-store"}})}catch(e:any){return NextResponse.json({error:String(e?.message||e)},{status:Number(e?.status||400),headers:{"Cache-Control":"private, no-store"}})}
}
