"use client";
import {useEffect} from "react";

export default function DashboardError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  useEffect(()=>{console.error("Dashboard page error",error)},[error]);
  return <section className="error-surface" role="alert">
    <div className="error-orb">!</div>
    <p className="section-title">VIVIT ERP</p>
    <h1>We couldn’t load this page</h1>
    <p>Your data is safe. Retry the page, or return to the dashboard if the problem continues.</p>
    {error.digest&&<code>Reference: {error.digest}</code>}
    <div className="error-actions">
      <button className="btn btn-primary" onClick={reset}>Try again</button>
      <a className="btn btn-ghost" href="/dashboard">Back to dashboard</a>
    </div>
  </section>;
}
