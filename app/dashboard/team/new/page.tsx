export const dynamic="force-dynamic";
import Link from "next/link";
import {auth} from "@/lib/auth";
import {redirect} from "next/navigation";
import {NewEmployeeForm} from "@/components/hr/NewEmployeeForm";
import {hasEffectiveRole} from "@/lib/session-access";

export default async function NewEmployeePage(){
 const session=await auth();
 if(!session?.user)redirect("/login");
 if(!hasEffectiveRole(session.user,["SUPER_ADMIN","HR"]))redirect("/dashboard");
 return <div style={{display:"grid",gap:16}}><div><Link href="/dashboard/team" className="btn btn-ghost btn-sm">← HR & Team</Link><h1 className="page-title" style={{marginTop:10}}>Add employee</h1><p className="page-subtitle">Create the employee, salary, login and access profile in one flow.</p></div><NewEmployeeForm/></div>;
}
