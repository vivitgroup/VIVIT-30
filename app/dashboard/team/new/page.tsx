export const dynamic="force-dynamic";
import {auth} from "@/lib/auth";
import {db,sql} from "@/lib/db";
import {redirect} from "next/navigation";
import Link from "next/link";
import {NewEmployeeForm} from "@/components/team/NewEmployeeForm";

type Row={id:string;name:string;description?:string|null;permissions?:string|null};
export default async function NewEmployeePage(){
 const session=await auth();if(!session?.user)redirect("/login");const workspaceId=String(session.user.workspaceId||""),userId=String(session.user.id||""),role=String(session.user.role||"");if(!workspaceId||!userId)redirect("/login");
 const grants=Array.from(await db.execute(sql`select wr.id,wr.name,wr.description,wr.permissions from user_roles ur join workspace_roles wr on wr.id=ur.role_id and wr.workspace_id=ur.workspace_id where ur.user_id=${userId} and ur.workspace_id=${workspaceId}`)) as unknown as Row[];
 const canProvision=role==="SUPER_ADMIN"||grants.some(r=>String(r.name||"").toUpperCase()==="HR"||String(r.permissions||"").includes("hr.employee.create"));if(!canProvision)redirect("/dashboard");
 const roles=Array.from(await db.execute(sql`select id,name,description from workspace_roles where workspace_id=${workspaceId} order by is_system desc,name asc`)) as unknown as Row[];
 return <div className="client-new-page"><div className="page-heading"><Link href="/dashboard/team" className="back-link">←</Link><div><h1 className="page-title">New Employee</h1><p className="page-subtitle">Create the system account, set starting salary, primary role and multiple additional permission roles.</p></div></div><NewEmployeeForm roles={roles}/></div>;
}
