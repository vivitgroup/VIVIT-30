import {db,clients} from "@/lib/db";
import {eq,and} from "drizzle-orm";

const WORKSPACE_ID="default";
export async function canAccessClient(session:any,clientId:string,options:{finance?:boolean;write?:boolean}={}){
 if(!session?.user||!clientId)return false;
 const role=String((session.user as any).role||""),userId=String((session.user as any).id||"");
 const [client]=await db.select({workspaceId:clients.workspaceId,isActive:clients.isActive,userId:clients.userId,accountManagerId:clients.accountManagerId,mediaBuyerId:clients.mediaBuyerId}).from(clients).where(and(eq(clients.id,clientId),eq(clients.workspaceId,WORKSPACE_ID))).limit(1);
 if(!client)return false;
 const historicalFinance=Boolean(options.finance)&&!options.write;
 if(!client.isActive&&!historicalFinance)return false;
 if(role==="SUPER_ADMIN")return true;
 if(role==="CLIENT")return !options.write&&!options.finance&&client.isActive&&client.userId===userId;
 if(role==="ACCOUNT_MANAGER")return !options.finance&&client.isActive&&client.accountManagerId===userId;
 if(role==="MEDIA_BUYER")return !options.finance&&!options.write&&client.isActive&&client.mediaBuyerId===userId;
 if(role==="ACCOUNTANT")return historicalFinance;
 return false;
}
