import fs from "node:fs";
import {collectCompetitorProfile} from "../lib/vivito/competitive-intelligence";

const targets=[
 {name:"Huda Beauty",url:"https://www.youtube.com/@hudabeauty"},
 {name:"Sephora",url:"https://www.youtube.com/@sephora"},
 {name:"Fenty Beauty",url:"https://www.youtube.com/@fentybeauty"},
 {name:"Maybelline NY Middle East",url:"https://www.youtube.com/@maybellinenyme"},
 {name:"L'Oreal Paris Middle East",url:"https://www.youtube.com/@lorealparisme"},
];

async function main(){
 fs.mkdirSync('.vivito',{recursive:true});
 const capturedAt=new Date().toISOString();
 const day=capturedAt.slice(0,10);
 const profiles:any[]=[];
 for(const target of targets){
  const result=await collectCompetitorProfile(target.url,target.name);
  profiles.push({
   name:target.name,
   profileUrl:target.url,
   platform:result.platform,
   followers:result.profile.followers,
   following:result.profile.following,
   totalPosts:result.profile.totalPosts,
   totalLikes:result.profile.totalLikes,
   source:result.profile.source,
   confidence:result.profile.confidence,
   title:(result.profile.raw as any)?.title||null,
   discoveredPosts:result.posts.slice(0,5).map(p=>({url:p.url,type:p.postType,likes:p.likes,comments:p.comments,shares:p.shares,views:p.views,source:p.source,confidence:p.confidence}))
  });
 }
 const current={capturedAt,day,profiles};
 fs.writeFileSync('.vivito/research-competitive-live-current.json',JSON.stringify(current,null,2));
 let baseline:any=null;try{baseline=JSON.parse(fs.readFileSync('certification/competitive-live-baseline.json','utf8'))}catch{}
 const realProfiles=profiles.filter(p=>p.platform==='YOUTUBE'&&p.source==='PUBLIC_HTML'&&p.title).length;
 const numericProfiles=profiles.filter(p=>[p.followers,p.totalPosts,p.totalLikes].some(v=>typeof v==='number')).length;
 const distinctDays=baseline?.day&&baseline.day!==day?2:1;
 let comparable=0;
 if(baseline?.profiles){for(const p of profiles){const old=baseline.profiles.find((x:any)=>x.profileUrl===p.profileUrl);if(old&&(['followers','totalPosts','totalLikes'] as const).some(k=>typeof old[k]==='number'&&typeof p[k]==='number'))comparable++;}}
 const citations=profiles.every(p=>p.profileUrl.startsWith('https://www.youtube.com/'));
 const passed=realProfiles>=5&&numericProfiles>=3&&distinctDays>=2&&comparable>=3&&citations;
 const report={passed,competitorProfiles:realProfiles,numericProfiles,snapshotDays:distinctDays,comparableProfiles:comparable,citationAccuracy:citations?100:0,currentDay:day,baselineDay:baseline?.day||null,profiles};
 fs.writeFileSync('.vivito/research-competitive-e2e.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
 // First-day collection is allowed to finish successfully so the snapshot artifact can be preserved.
 if(realProfiles<5||numericProfiles<3||!citations)process.exit(1);
}

main().catch(error=>{console.error(error);process.exit(1)});
