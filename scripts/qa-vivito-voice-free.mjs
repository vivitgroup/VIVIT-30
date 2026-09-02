import fs from "node:fs";

const read=path=>fs.readFileSync(path,"utf8");
const helper=read("lib/vivito/free-audio.ts");
const transcribe=read("app/api/assistant/voice/transcribe/route.ts");
const speak=read("app/api/assistant/voice/speak/route.ts");
const ui=read("components/assistant/VivitoVoiceRuntime.tsx");
const layout=read("app/dashboard/layout.tsx");
const fail=[];
const ok=(condition,message)=>condition||fail.push(message);

for(const id of ["fish-audio/transcribe-1-free","fish-audio/s2.1-pro-free","fish-audio/s2-pro-free"])ok(helper.includes(id),`missing free audio model ${id}`);
ok(helper.includes('tags.includes("free")')&&helper.includes("pricingIsZero"),"audio catalog does not require free tag + zero pricing");
ok(helper.includes('candidates.filter(explicitFree)'),"catalog failure must fail closed to explicit -free IDs");
ok(!/openai\/tts|whisper|elevenlabs|paid/i.test(helper),"unexpected paid/non-free audio model found in free helper");
ok(transcribe.includes("const session=await auth()")&&speak.includes("const session=await auth()"),"voice routes must require authenticated session");
ok(transcribe.includes("MAX_BASE64_CHARS")&&transcribe.includes("ALLOWED_MEDIA"),"transcription route needs size and media guards");
ok(speak.includes("MAX_TEXT")&&speak.includes("VIVITO_FREE_SPEECH_MODELS"),"speech route needs bounded free-only model chain");
ok(!/db\.|file_documents|storage\/v1|upload/i.test(transcribe),"voice recording must not be persisted by transcription route");
ok(ui.includes("MediaRecorder")&&ui.includes("getUserMedia"),"voice UI must support microphone recording");
ok(ui.includes("MAX_RECORDING_SECONDS=90"),"voice recording must have a hard duration cap");
ok(ui.includes("setComposerText(text)")&&!ui.includes('fetch("/api/assistant"'),"transcription must populate composer without auto-sending");
ok(ui.includes('vivitoVoiceReplies')&&ui.includes('aria-pressed={voiceReplies}'),"voice replies need persistent explicit opt-in control");
ok(ui.includes("va-voice-listen")&&ui.includes("Listen to this VIVITO reply"),"each assistant reply needs an accessible listen action");
ok(ui.includes("prefers-reduced-motion")&&ui.includes("@media(max-width:560px)"),"voice UX needs reduced-motion and mobile handling");
ok(layout.includes("<VivitoVoiceRuntime/>"),"voice runtime is not mounted in dashboard layout");

if(fail.length){console.error("VIVITO voice/free audit failed:\n- "+fail.join("\n- "));process.exit(1)}
console.log("VIVITO voice/free audit passed");
