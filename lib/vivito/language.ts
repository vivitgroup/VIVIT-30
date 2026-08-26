export type VivitoLanguageStyle="ARABIC"|"EGYPTIAN"|"ENGLISH"|"FRANCO"|"MIXED"|"GEN_Z";

const AR=/[\u0600-\u06ff]/;
const LATIN=/[A-Za-z]/;
const FRANCO_HINT=/(\b(?:3ayez|3awez|3ayza|3awza|5aly|5alli|2fel|2fl|3del|3addel|msh|mesh|el|da|de|yalla|kda|keda|3amel|7ot|7ott|emsa7|ms7|edfa3|daf3|3amel|3and|3ala|mn|fe|fi|kol|koll)\b|[2356789][a-z])/i;
const GENZ_HINT=/\b(?:lol|lmao|fr|ngl|bro|bruh|vibe|vibes|slay|cringe|lowkey|highkey|w|l|goated|mid|sus|cap|no cap|bet|lit|fire|fyp|pov|rn|idk|imo|tbh)\b/i;
const EGYPTIAN_HINT=/(عايز|عاوزه|عاوز|خلي|خلّي|اقفل|قفل|امسح|حط|يلا|كده|مش|دلوقتي|النهارده|أوي|اوي|جامد|تمام|فلوس|تاسك|عميل)/i;

const MAP:Record<string,string>={
  "3ayez":"عايز","3awez":"عايز","3ayza":"عايزة","3awza":"عايزة","5aly":"خلي","5alli":"خلي","2fel":"اقفل","2fl":"اقفل","3del":"عدل","3addel":"عدل","msh":"مش","mesh":"مش","el":"ال","da":"ده","de":"دي","yalla":"يلا","kda":"كده","keda":"كده","7ot":"حط","7ott":"حط","emsa7":"امسح","ms7":"امسح","edfa3":"ادفع","daf3":"دفع","3amel":"اعمل","3and":"عند","3ala":"على","mn":"من","fe":"في","fi":"في","kol":"كل","koll":"كل","client":"عميل","task":"تاسك","campaign":"كامبين","budget":"بادجت","payment":"دفعة","expense":"مصروف","invoice":"فاتورة"
};

export function detectVivitoLanguageStyle(text:string):VivitoLanguageStyle{
  const hasAr=AR.test(text),hasLatin=LATIN.test(text),franco=FRANCO_HINT.test(text),genz=GENZ_HINT.test(text),egy=EGYPTIAN_HINT.test(text);
  if(franco&&!hasAr)return "FRANCO";
  if(genz&&(hasAr||franco))return "GEN_Z";
  if(hasAr&&hasLatin)return "MIXED";
  if(egy)return "EGYPTIAN";
  if(hasAr)return "ARABIC";
  return "ENGLISH";
}

export function normalizeVivitoLanguage(text:string){
  const raw=String(text||"");
  const style=detectVivitoLanguageStyle(raw);
  const normalized=raw.replace(/\b[\w']+\b/g,(token)=>MAP[token.toLowerCase()]||token).replace(/\s+/g," ").trim();
  return {raw,normalized,style};
}

export function vivitoLanguageInstruction(text:string){
  const {style,normalized}=normalizeVivitoLanguage(text);
  const reply=style==="FRANCO"?"Reply in natural Egyptian Franco/Arabizi unless clarity requires Arabic script or an English technical term.":style==="GEN_Z"?"Reply in concise natural Egyptian Gen Z style without sounding forced; preserve standard marketing/ERP English terms.":style==="MIXED"?"Reply in the same natural Arabic-English mix and keep technical terms in English where clearer.":style==="EGYPTIAN"||style==="ARABIC"?"Reply in natural Egyptian Arabic, not formal MSA, while preserving standard English marketing/ERP terms.":"Reply in natural concise English.";
  return `LANGUAGE PROFILE\nDetected style: ${style}.\nNormalized intent aid: ${normalized}.\n${reply}\nUnderstand Egyptian slang, Gen Z shorthand, mixed Arabic-English, and Franco/Arabizi as equivalent business intent. Do not change entity names, amounts, dates, IDs, URLs, emails, or file references while interpreting slang.`;
}
