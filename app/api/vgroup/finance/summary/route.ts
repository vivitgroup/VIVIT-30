import {NextResponse} from "next/server";
import {getVGroupSql} from "@/lib/vgroup/db";
import {apiErrorResponse} from "@/lib/vgroup/api-access";
import {getVGroupSession} from "@/lib/vgroup/session";
import {isBusinessUnitCode,type BusinessUnitCode} from "@/lib/vgroup/contracts";

export const dynamic="force-dynamic";
type FinanceRow={business_unit:BusinessUnitCode;revenue:number|string;expenses:number|string;net_profit:number|string;transactions:number};
type Totals={revenue:number;expenses:number;netProfit:number;transactions:number};

export async function GET(request:Request){
  try{
    const session=await getVGroupSession();
    if(!session)return NextResponse.json({error:"Unauthorized"},{status:401});
    const allowed=new Set<BusinessUnitCode>(session.memberships.map(m=>m.businessUnit));
    const superAdmin=session.memberships.some(m=>m.role==="GROUP_SUPER_ADMIN");
    if(superAdmin){allowed.add("marketing");allowed.add("hospitality");allowed.add("tech")}
    const url=new URL(request.url);
    const requested=url.searchParams.get("businessUnit")??"all";
    if(requested!=="all"&&(!isBusinessUnitCode(requested)||!allowed.has(requested)))return NextResponse.json({error:"Forbidden"},{status:403});
    const units:BusinessUnitCode[]=requested==="all"?Array.from(allowed):[requested as BusinessUnitCode];
    const sql=getVGroupSql();
    const rows=await sql<FinanceRow[]>`
      select bu.code business_unit,
             coalesce(sum(case when lt.direction='credit' then lt.amount else 0 end),0) revenue,
             coalesce(sum(case when lt.direction='debit' then lt.amount else 0 end),0) expenses,
             coalesce(sum(case when lt.direction='credit' then lt.amount else -lt.amount end),0) net_profit,
             count(lt.id)::int transactions
      from vgroup.business_units bu
      left join vgroup.ledger_transactions lt on lt.business_unit_id=bu.id
      where bu.code=any(${units}::text[])
      group by bu.code order by bu.code
    `;
    const byUnit=Array.from(rows);
    const totals=byUnit.reduce<Totals>((acc,row)=>{acc.revenue+=Number(row.revenue??0);acc.expenses+=Number(row.expenses??0);acc.netProfit+=Number(row.net_profit??0);acc.transactions+=Number(row.transactions??0);return acc},{revenue:0,expenses:0,netProfit:0,transactions:0});
    return NextResponse.json({filter:requested,totals,byUnit},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return apiErrorResponse(error)}
}
