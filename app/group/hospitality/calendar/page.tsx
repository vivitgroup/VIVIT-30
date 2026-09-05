import Link from "next/link";
import {notFound} from "next/navigation";
import {requireBusinessPermission} from "@/lib/vgroup/access";
import {hasPermission} from "@/lib/vgroup/contracts";
import {getVGroupSql} from "@/lib/vgroup/db";
import {AirbnbSyncButton} from "@/components/vgroup/airbnb-sync-button";
import {AirbnbSyncAllButton} from "@/components/vgroup/airbnb-sync-all-button";

export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const monthPattern=/^\d{4}-\d{2}$/;
type Channel={id:string;property_id:string;property_name:string;external_listing_id:string;status:string;last_sync_at:string|null;last_error:string|null;has_feed:boolean};
type Block={id:string;property_id:string;property_name:string;summary:string;starts_on:string;ends_on:string;source:string};
type Reservation={id:string;property_id:string;property_name:string;guest_name:string;check_in:string;check_out:string;status:string};

const iso=(d:Date)=>d.toISOString().slice(0,10);
const addDays=(d:Date,n:number)=>new Date(d.getTime()+n*86400000);
const monthLabel=(month:string)=>new Intl.DateTimeFormat("en-US",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(`${month}-01T00:00:00Z`));
const statusTone=(status:string)=>status==="CONFIRMED"||status==="CHECKED_IN"?"#111827":status==="PENDING"?"#7C3AED":"#344054";

export default async function HospitalityCalendarPage({searchParams}:{searchParams:Promise<{propertyId?:string;month?:string}>}){
  const session=await requireBusinessPermission("hospitality","reservations:view");
  const canSync=hasPermission(session,"hospitality","reservations:create");
  const {propertyId:rawPropertyId,month:rawMonth}=await searchParams;
  if(rawPropertyId&&!uuid.test(rawPropertyId))notFound();
  if(rawMonth&&!monthPattern.test(rawMonth))notFound();
  const propertyId=rawPropertyId||"";
  const currentMonth=rawMonth||new Date().toISOString().slice(0,7);
  const monthStart=new Date(`${currentMonth}-01T00:00:00Z`);
  if(Number.isNaN(monthStart.getTime()))notFound();
  const nextMonth=new Date(Date.UTC(monthStart.getUTCFullYear(),monthStart.getUTCMonth()+1,1));
  const prevMonth=new Date(Date.UTC(monthStart.getUTCFullYear(),monthStart.getUTCMonth()-1,1));
  const monthEnd=addDays(nextMonth,-1);
  const gridStart=addDays(monthStart,-monthStart.getUTCDay());
  const gridDays=Array.from({length:42},(_,i)=>addDays(gridStart,i));
  const sql=getVGroupSql();
  let propertyName="";
  if(propertyId){const [property]=await sql<{name:string}[]>`select name from hospitality.properties where id=${propertyId}::uuid and archived_at is null limit 1`;if(!property)notFound();propertyName=property.name}

  const channels=propertyId
    ?await sql<Channel[]>`select c.id::text,c.property_id::text,p.name property_name,c.external_listing_id,c.status,c.last_sync_at::text,c.last_error,(c.token_ref is not null and btrim(c.token_ref)<>'') has_feed from hospitality.channel_connections c join hospitality.properties p on p.id=c.property_id and p.archived_at is null join vgroup.business_units bu on bu.id=p.business_unit_id and bu.code='hospitality' and bu.status='active' where c.channel='airbnb' and c.property_id=${propertyId}::uuid order by p.name,c.created_at`
    :await sql<Channel[]>`select c.id::text,c.property_id::text,p.name property_name,c.external_listing_id,c.status,c.last_sync_at::text,c.last_error,(c.token_ref is not null and btrim(c.token_ref)<>'') has_feed from hospitality.channel_connections c join hospitality.properties p on p.id=c.property_id and p.archived_at is null join vgroup.business_units bu on bu.id=p.business_unit_id and bu.code='hospitality' and bu.status='active' where c.channel='airbnb' order by p.name,c.created_at`;

  const from=iso(monthStart),to=iso(monthEnd);
  const blocks=propertyId
    ?await sql<Block[]>`select b.id::text,b.property_id::text,p.name property_name,b.summary,b.starts_on::text,b.ends_on::text,b.source from hospitality.calendar_blocks b join hospitality.properties p on p.id=b.property_id and p.archived_at is null where b.archived_at is null and b.starts_on<=${to}::date and b.ends_on>=${from}::date and b.property_id=${propertyId}::uuid order by b.starts_on,p.name limit 500`
    :await sql<Block[]>`select b.id::text,b.property_id::text,p.name property_name,b.summary,b.starts_on::text,b.ends_on::text,b.source from hospitality.calendar_blocks b join hospitality.properties p on p.id=b.property_id and p.archived_at is null where b.archived_at is null and b.starts_on<=${to}::date and b.ends_on>=${from}::date order by b.starts_on,p.name limit 500`;

  const reservations=propertyId
    ?await sql<Reservation[]>`select r.id::text,r.property_id::text,p.name property_name,r.guest_name,r.check_in::text,r.check_out::text,r.status from hospitality.reservations r join hospitality.properties p on p.id=r.property_id and p.archived_at is null where r.archived_at is null and r.status not in ('CANCELLED','REJECTED') and r.check_in<${iso(nextMonth)}::date and r.check_out>${from}::date and r.property_id=${propertyId}::uuid order by r.check_in,p.name limit 500`
    :await sql<Reservation[]>`select r.id::text,r.property_id::text,p.name property_name,r.guest_name,r.check_in::text,r.check_out::text,r.status from hospitality.reservations r join hospitality.properties p on p.id=r.property_id and p.archived_at is null where r.archived_at is null and r.status not in ('CANCELLED','REJECTED') and r.check_in<${iso(nextMonth)}::date and r.check_out>${from}::date order by r.check_in,p.name limit 500`;

  const connected=Array.from(channels).filter(c=>c.status==="connected").length;
  const syncable=Array.from(channels).filter(channel=>channel.status!=="disabled"&&channel.has_feed);
  const backHref=propertyId?`/group/hospitality/properties/${propertyId}`:"/group/hospitality";
  const monthHref=(m:string)=>`/group/hospitality/calendar?month=${m}${propertyId?`&propertyId=${propertyId}`:""}`;
  const sameDay=(a:string,d:Date)=>a===iso(d);
  const overlaps=(start:string,end:string,d:Date)=>start<=iso(d)&&end>iso(d);

  return <main className="aircal-page"><style>{`
    .aircal-page{min-height:100vh;padding:26px 20px 56px;background:#fff!important;color:#101828!important;font-family:Inter,system-ui,sans-serif}
    .aircal-shell{max-width:1440px;margin:0 auto}.aircal-top{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;flex-wrap:wrap}
    .aircal-back{color:#101828!important;text-decoration:none;font-weight:800}.aircal-kicker{margin-top:24px;font-size:12px;letter-spacing:.14em;font-weight:900;color:#667085}
    .aircal-title{font-size:clamp(34px,5vw,56px);letter-spacing:-.045em;margin:6px 0 8px;color:#101828}.aircal-sub{margin:0;color:#667085;line-height:1.65;max-width:760px}
    .aircal-stats{display:flex;gap:10px;flex-wrap:wrap;margin:22px 0}.aircal-chip{border:1px solid #EAECF0;background:#fff;border-radius:999px;padding:8px 12px;font-size:13px;font-weight:700;color:#344054}
    .aircal-toolbar{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:12px 0 14px}.aircal-monthnav{display:flex;align-items:center;gap:10px}.aircal-navbtn{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border:1px solid #D0D5DD;border-radius:999px;color:#101828!important;text-decoration:none;background:#fff;font-weight:900}.aircal-month{font-size:22px;font-weight:800;min-width:190px;text-align:center}
    .aircal-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border:1px solid #E4E7EC;border-right:0;border-bottom:0;border-radius:18px;overflow:hidden;background:#fff}.aircal-dow{padding:12px 10px;border-right:1px solid #E4E7EC;border-bottom:1px solid #E4E7EC;color:#667085;font-size:12px;font-weight:800;text-align:center;background:#F9FAFB}.aircal-day{min-height:146px;padding:8px;border-right:1px solid #E4E7EC;border-bottom:1px solid #E4E7EC;background:#fff;overflow:hidden}.aircal-day.out{background:#FCFCFD;color:#98A2B3}.aircal-day.today{box-shadow:inset 0 0 0 2px #101828}.aircal-num{font-size:13px;font-weight:800;margin-bottom:7px}
    .aircal-event{display:block;width:100%;border-radius:8px;padding:6px 7px;margin:4px 0;font-size:11px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.aircal-res{color:#fff}.aircal-block{background:#F2F4F7;color:#344054;border:1px solid #E4E7EC}.aircal-event small{display:block;opacity:.82;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.aircal-legend{display:flex;gap:16px;flex-wrap:wrap;color:#667085;font-size:12px;margin:12px 0 22px}.aircal-dot{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}.aircal-connections{margin-top:24px;border:1px solid #EAECF0!important;border-radius:18px;padding:18px;background:#fff!important;box-shadow:none!important}.aircal-connection{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:12px 0;border-bottom:1px solid #F2F4F7}.aircal-connection:last-child{border-bottom:0}.aircal-muted{color:#667085;font-size:12px}.aircal-error{color:#B42318;font-size:12px;margin-top:5px}
    @media(max-width:900px){.aircal-grid{overflow-x:auto;grid-template-columns:repeat(7,minmax(125px,1fr))}.aircal-day{min-height:130px}}
  `}</style><section className="aircal-shell">
    <div className="aircal-top"><div><Link href={backHref} className="aircal-back">← {propertyId?`${propertyName} dashboard`:"Hospitality"}</Link><div className="aircal-kicker">RESERVATIONS CALENDAR</div><h1 className="aircal-title">{propertyId?propertyName:"Hospitality calendar"}</h1><p className="aircal-sub">Airbnb-style monthly availability with trusted VIVIT guest reservations shown by name. Airbnb iCal blocks stay availability-only unless a trusted reservation record exists.</p></div>{canSync?(propertyId?syncable.map(channel=><AirbnbSyncButton key={channel.id} channelId={channel.id}/>):<AirbnbSyncAllButton/>):null}</div>
    <div className="aircal-stats"><span className="aircal-chip">{reservations.length} reservations this month</span><span className="aircal-chip">{blocks.length} Airbnb/channel blocks</span><span className="aircal-chip">{connected}/{channels.length} Airbnb listings connected</span></div>
    <div className="aircal-toolbar"><div className="aircal-monthnav"><Link className="aircal-navbtn" href={monthHref(iso(prevMonth).slice(0,7))}>‹</Link><div className="aircal-month">{monthLabel(currentMonth)}</div><Link className="aircal-navbtn" href={monthHref(iso(nextMonth).slice(0,7))}>›</Link></div><Link href={monthHref(new Date().toISOString().slice(0,7))} className="aircal-back">Today</Link></div>
    <div className="aircal-grid">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d} className="aircal-dow">{d}</div>)}{gridDays.map(day=>{const dayIso=iso(day),inMonth=day.getUTCMonth()===monthStart.getUTCMonth(),today=dayIso===new Date().toISOString().slice(0,10),dayReservations=reservations.filter(r=>overlaps(r.check_in,r.check_out,day)),dayBlocks=blocks.filter(b=>overlaps(b.starts_on,b.ends_on,day));return <div key={dayIso} className={`aircal-day${inMonth?"":" out"}${today?" today":""}`}><div className="aircal-num">{day.getUTCDate()}</div>{dayReservations.map(r=><div key={`r-${r.id}`} className="aircal-event aircal-res" style={{background:statusTone(r.status)}} title={`${r.guest_name} · ${r.property_name} · ${r.check_in} → ${r.check_out}`}><b>{sameDay(r.check_in,day)?"● ":""}{r.guest_name}</b><small>{propertyId?r.status:r.property_name}</small></div>)}{dayBlocks.filter(b=>!dayReservations.some(r=>r.property_id===b.property_id&&overlaps(r.check_in,r.check_out,day))).map(b=><div key={`b-${b.id}`} className="aircal-event aircal-block" title={`${b.property_name} · ${b.summary||"Airbnb unavailable"}`}><b>{sameDay(b.starts_on,day)?"● ":""}{b.summary&&b.summary.toLowerCase()!=="reserved"?b.summary:"Airbnb unavailable"}</b><small>{propertyId?b.source:b.property_name}</small></div>)}</div>})}</div>
    <div className="aircal-legend"><span><i className="aircal-dot" style={{background:"#111827"}}/>VIVIT reservation · guest name shown</span><span><i className="aircal-dot" style={{background:"#EAECF0"}}/>Airbnb/channel availability block · no invented guest identity</span></div>
    <article className="aircal-connections"><h2 style={{margin:"0 0 8px"}}>Airbnb connections</h2>{channels.length===0?<p className="aircal-muted">No Airbnb calendar feed is configured.</p>:channels.map(channel=><div className="aircal-connection" key={channel.id}><div><strong>{channel.property_name}</strong><div className="aircal-muted">airbnb.com/h/{channel.external_listing_id} · {channel.status}{channel.last_sync_at?` · Last sync ${channel.last_sync_at}`:" · Never synced"}</div>{channel.last_error?<div className="aircal-error">{channel.last_error}</div>:null}</div>{canSync&&channel.status!=="disabled"&&channel.has_feed?<AirbnbSyncButton channelId={channel.id}/>:null}</div>)}</article>
  </section></main>;
}
