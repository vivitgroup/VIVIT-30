"use client";
import Image from "next/image";
import Link from "next/link";
import {signOut} from "next-auth/react";
import {useEffect,useState} from "react";

export default function SignOutPage(){
  const [busy,setBusy]=useState(false),[ar,setAr]=useState(false);
  useEffect(()=>{const timer=setTimeout(()=>setAr(localStorage.getItem("vivit-lang")==="ar"),0);return()=>clearTimeout(timer)},[]);
  return <main className="signout-page" dir={ar?"rtl":"ltr"}>
    <section className="signout-card">
      <div className="signout-brand"><Image src="/vivit-mark.png" width={64} height={64} alt="VIVIT"/><span>VIVIT ERP</span></div>
      <div className="signout-icon">↗</div>
      <h1>{ar?"تسجيل الخروج":"Ready to sign out?"}</h1>
      <p>{ar?"سيتم إنهاء الجلسة بأمان ويمكنك تسجيل الدخول مرة أخرى في أي وقت.":"Your session will be closed securely. You can sign in again at any time."}</p>
      <button disabled={busy} onClick={async()=>{setBusy(true);await signOut({callbackUrl:"/login"})}} className="btn btn-primary signout-confirm">{busy?(ar?"جاري الخروج...":"Signing out…"):(ar?"تأكيد تسجيل الخروج":"Yes, sign me out")}</button>
      <Link href="/dashboard" className="signout-cancel">{ar?"الرجوع إلى لوحة التحكم":"Back to dashboard"}</Link>
    </section>
  </main>;
}
