import {lookup} from "node:dns/promises";
import {isIP} from "node:net";

const AIRBNB_ICAL_HOST="www.airbnb.com";
const MAX_ICAL_BYTES=2*1024*1024;
const MAX_EVENTS=5000;
const MAX_LINE_LENGTH=16*1024;
const FETCH_TIMEOUT_MS=15_000;

type AirbnbIcalEvent={uid:string;summary:string;startsOn:string;endsOn:string};

function isPrivateIpv4(address:string){
  const parts=address.split(".").map(Number);
  if(parts.length!==4||parts.some(part=>!Number.isInteger(part)||part<0||part>255))return true;
  const [a,b]=parts;
  return a===0||a===10||a===127||a>=224||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===100&&b>=64&&b<=127);
}

function isPrivateIpv6(address:string){
  const value=address.toLowerCase().split("%")[0];
  return value==="::"||value==="::1"||value.startsWith("fc")||value.startsWith("fd")||value.startsWith("fe8")||value.startsWith("fe9")||value.startsWith("fea")||value.startsWith("feb")||value.startsWith("ff");
}

function isPublicAddress(address:string){
  const family=isIP(address);
  if(family===4)return !isPrivateIpv4(address);
  if(family===6)return !isPrivateIpv6(address);
  return false;
}

export function validateAirbnbIcalUrl(value:string){
  let url:URL;
  try{url=new URL(value)}catch{throw new Error("Airbnb iCal URL is invalid")}
  if(url.protocol!=="https:"||url.hostname!==AIRBNB_ICAL_HOST||!url.pathname.startsWith("/calendar/ical/")||!url.pathname.endsWith(".ics"))throw new Error("Airbnb iCal URL is not allowed");
  if(url.username||url.password||url.port)throw new Error("Airbnb iCal URL contains unsupported authority fields");
  return url;
}

async function assertPublicAirbnbDns(url:URL){
  const records=await lookup(url.hostname,{all:true,verbatim:true});
  if(records.length===0||records.some(record=>!isPublicAddress(record.address)))throw new Error("Airbnb calendar DNS resolution is unsafe");
}

async function readBoundedText(response:Response){
  const declared=Number(response.headers.get("content-length")??0);
  if(Number.isFinite(declared)&&declared>MAX_ICAL_BYTES)throw new Error("Airbnb calendar payload is too large");
  if(!response.body)return "";
  const reader=response.body.getReader();
  const chunks:Uint8Array[]=[];
  let total=0;
  while(true){
    const {done,value}=await reader.read();
    if(done)break;
    if(!value)continue;
    total+=value.byteLength;
    if(total>MAX_ICAL_BYTES){await reader.cancel();throw new Error("Airbnb calendar payload is too large")}
    chunks.push(value);
  }
  const merged=new Uint8Array(total);
  let offset=0;
  for(const chunk of chunks){merged.set(chunk,offset);offset+=chunk.byteLength}
  return new TextDecoder("utf-8",{fatal:false}).decode(merged);
}

export async function fetchAirbnbIcal(value:string){
  const url=validateAirbnbIcalUrl(value);
  await assertPublicAirbnbDns(url);
  const response=await fetch(url,{headers:{"User-Agent":"Vivit-Hospitality-CalendarSync/1.0","Accept":"text/calendar,text/plain;q=0.9"},cache:"no-store",redirect:"manual",signal:AbortSignal.timeout(FETCH_TIMEOUT_MS)});
  if(response.status>=300&&response.status<400)throw new Error("Airbnb calendar redirect was blocked");
  if(!response.ok)throw new Error(`Airbnb calendar returned HTTP ${response.status}`);
  const contentType=(response.headers.get("content-type")??"").toLowerCase();
  if(contentType&&!contentType.includes("text/calendar")&&!contentType.includes("text/plain")&&!contentType.includes("application/octet-stream"))throw new Error("Airbnb calendar content type is invalid");
  const text=await readBoundedText(response);
  if(!text.includes("BEGIN:VCALENDAR")||!text.includes("END:VCALENDAR"))throw new Error("Airbnb calendar payload is invalid");
  return text;
}

function unescapeText(value:string){return value.replace(/\\n/gi," ").replace(/\\,/g,",").replace(/\\;/g,";").replace(/\\\\/g,"\\").trim()}
function dateValue(value:string){const v=value.trim();if(/^\d{8}$/.test(v))return `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}`;const m=v.match(/^(\d{4})(\d{2})(\d{2})T/);return m?`${m[1]}-${m[2]}-${m[3]}`:null}

export function parseAirbnbIcal(text:string):AirbnbIcalEvent[]{
  const unfolded=text.replace(/\r?\n[ \t]/g,"");
  const rawBlocks=unfolded.split("BEGIN:VEVENT").slice(1);
  if(rawBlocks.length>MAX_EVENTS)throw new Error("Airbnb calendar contains too many events");
  const events:AirbnbIcalEvent[]=[];
  for(const rawBlock of rawBlocks){
    const block=rawBlock.split("END:VEVENT")[0]??"";
    let uid="",summary="Unavailable",startsOn:string|null=null,endsOn:string|null=null;
    for(const line of block.split(/\r?\n/)){
      if(line.length>MAX_LINE_LENGTH)throw new Error("Airbnb calendar contains an oversized line");
      const idx=line.indexOf(":");if(idx<0)continue;
      const key=line.slice(0,idx).toUpperCase(),value=line.slice(idx+1);
      if(key==="UID")uid=value.trim().slice(0,512);
      else if(key==="SUMMARY")summary=(unescapeText(value)||"Unavailable").slice(0,500);
      else if(key.startsWith("DTSTART"))startsOn=dateValue(value);
      else if(key.startsWith("DTEND"))endsOn=dateValue(value);
    }
    if(uid&&startsOn&&endsOn&&endsOn>startsOn)events.push({uid,summary,startsOn,endsOn});
  }
  return events;
}
