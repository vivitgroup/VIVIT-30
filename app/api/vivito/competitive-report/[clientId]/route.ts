export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,sql} from "@/lib/db";
import {renderCompetitorReportPdf,type CompetitorReportPayload} from "@/lib/vivito/competitor-report-pdf";

type Row=Record<string,unknown>;const rows=(v:unknown)=>Array.from(v as Iterable<Row>);
export async function GET(req:NextRequest,{params}:{params:Promise<{clientId:string}>}){
 const session=await auth();if(!session?.user)return new NextResponse("Unauthorized",{status:401});const workspaceId=String(session.user.workspaceId||""),userId=String(session.user.id||""),role=String(session.user.role||""),{clientId}=await params,runId=String(req.nextUrl.searchParams.get("runId")||"");if(!workspaceId)return new NextResponse("Workspace unavailable",{status:403});
 const [client]=rows(await db.execute(sql`select id,company_name,account_manager_id,media_buyer_id,user_id from clients where id=${clientId} and workspace_id=${workspaceId} and deleted_at is null limit 1`));if(!client)return new NextResponse("Client not found",{status:404});
 const creator=role==="CREATOR"&&rows(await db.execute(sql`select 1 from creative_tasks where workspace_id=${workspaceId} and client_id=${clientId} and assigned_to_id=${userId} and deleted_at is null limit 1`)).length>0,allowed=role==="SUPER_ADMIN"||(role==="ACCOUNT_MANAGER"&&client.account_manager_id===userId)||(role==="MEDIA_BUYER"&&client.media_buyer_id===userId)||creator;if(!allowed)return new NextResponse("Forbidden",{status:403});
 const reportRows=runId?rows(await db.execute(sql`select id,report_json from vivito_report_runs where id=${runId}::uuid and workspace_id=${workspaceId} and client_id=${clientId} limit 1`)):rows(await db.execute(sql`select id,report_json from vivito_report_runs where workspace_id=${workspaceId} and client_id=${clientId} and report_type='COMPETITOR_MONITORING' order by generated_at desc limit 1`));const report=reportRows[0];if(!report)return new NextResponse("Report not found",{status:404});
 const payload=(report.report_json&&typeof report.report_json==="object"?report.report_json:{}) as CompetitorReportPayload,pdf=renderCompetitorReportPdf(String(client.company_name||"Client"),payload),filename=`${String(client.company_name||"client").replace(/[^a-z0-9_-]+/gi,"-")}-vivito-competitor-report.pdf`;
 return new NextResponse(Buffer.from(pdf),{headers:{"Content-Type":"application/pdf","Content-Disposition":`inline; filename="${filename}"`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
