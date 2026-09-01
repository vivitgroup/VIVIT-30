import type {Session} from "next-auth";
import {db,clients} from "@/lib/db";
import {eq,and} from "drizzle-orm";
import {isDualOperator} from "@/lib/dual-operator";

export async function canAccessClient(session:Session|null,clientId:string,options:{finance?:boolean;write?:boolean}={}){
 if(!session?.user||!clientId)return false;
 const role=String(session.user.role||""),email=String(session.user.email||""),userId=String(session.user.id||""),workspaceId=String(session.user.workspaceId||"");
 if(!workspaceId)return false;
 const [client]=await db.select({workspaceId:clients.workspaceId,isActive:clients.isActive,userId:clients.userId,accountManagerId:clients.accountManagerId,mediaBuyerId:clients.mediaBuyerId}).from(clients).where(and(eq(clients.id,clientId),eq(clients.workspaceId,workspaceId))).limit(1);
 if(!client)return false;
 const historicalFinance=Boolean(options.finance)&&!options.write;
 if(!client.isActive&&!historicalFinance)return false;
 if(role==="SUPER_ADMIN")return true;
 if(role==="CLIENT")return !options.write&&!options.finance&&client.isActive&&client.userId===userId;
 if(isDualOperator(email)&&(role==="ACCOUNT_MANAGER"||role==="MEDIA_BUYER"))return !options.finance&&client.isActive&&(client.accountManagerId===userId||client.mediaBuyerId===userId);
 if(role==="ACCOUNT_MANAGER")return !options.finance&&client.isActive&&client.accountManagerId===userId;
 if(role==="MEDIA_BUYER")return !options.finance&&!options.write&&client.isActive&&client.mediaBuyerId===userId;
 if(role==="ACCOUNTANT")return historicalFinance;
 return false;
}