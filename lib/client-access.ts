import { db, clients } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function canAccessClient(session:any, clientId:string, options:{finance?:boolean;write?:boolean}={}){
  if(!session?.user)return false;
  const role=String((session.user as any).role||""),userId=String((session.user as any).id||"");
  if(role==="SUPER_ADMIN")return true;
  const [client]=await db.select({userId:clients.userId,accountManagerId:clients.accountManagerId,mediaBuyerId:clients.mediaBuyerId}).from(clients).where(eq(clients.id,clientId)).limit(1);
  if(!client)return false;
  if(role==="CLIENT")return !options.write&&client.userId===userId;
  if(role==="ACCOUNT_MANAGER")return client.accountManagerId===userId;
  if(role==="MEDIA_BUYER")return !options.finance&&!options.write&&client.mediaBuyerId===userId;
  if(role==="ACCOUNTANT")return Boolean(options.finance)&&!options.write;
  return false;
}
