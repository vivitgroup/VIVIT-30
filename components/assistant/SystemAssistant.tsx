"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import VivitVivito from "@/components/experience/VivitVivito";

const CLIENT_QUICK = [
  "Show my current tasks",
  "What is waiting for review?",
  "What is my closest deadline?",
  "Show overdue items",
];
const ADMIN_QUICK = [
  "Executive pulse",
  "Top media issues",
  "Overdue tasks",
  "Add a new client",
  "Log an expense",
  "Top 5 priority decisions",
];
const TEAM_QUICK = [
  "Show my current tasks",
  "What is overdue?",
  "Recommendations for my clients",
  "Help with content strategy",
  "Review media performance",
];

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type Risk = "low" | "medium" | "high" | "destructive";
type ActionProposal = { op: string; summary: string; args: Record<string, unknown>; risk: Risk; requiresConfirmation: true; missingFields: string[] };
type ActionPlan = { summary: string; steps: ActionProposal[]; risk: Risk; requiresConfirmation: true; missingFields: string[] };
type ArtifactProposal = { kind: "pdf" | "pptx" | "xlsx" | "content-plan"; title: string; fileName: string; summary: string; pdf?: JsonValue; presentation?: JsonValue; workbook?: JsonValue; contentPlan?: JsonValue };
type AssistantResponse = { answer?: string; error?: string; sources?: string[]; actionProposal?: ActionProposal; actionPlan?: ActionPlan; artifactProposal?: ArtifactProposal };
type AskResult = { ok: boolean; data: AssistantResponse };
type RunState = "ready" | "running" | "done" | "failed";
type ChatMsg = {
  id: string;
  who: "you" | "vivito";
  text: string;
  sources?: string[];
  action?: ActionProposal;
  plan?: ActionPlan;
  artifact?: ArtifactProposal;
  artifactState?: RunState;
  artifactResult?: string;
  actionRequestId?: string;
  actionState?: RunState;
  actionResult?: string;
  planRequestId?: string;
  planState?: RunState;
  planResult?: string;
};
type Attachment = { fileId: string; name: string; mimeType: string };

const mid = () => crypto.randomUUID();
const errorText = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

export function SystemAssistant({ role }: { role: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const isClient = role === "CLIENT";
  const isAdmin = role === "SUPER_ADMIN";
  const quick = useMemo(() => isClient ? CLIENT_QUICK : isAdmin ? ADMIN_QUICK : TEAM_QUICK, [isClient, isAdmin]);

  useEffect(() => {
    if (!open) return;
    const node = chatRef.current;
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [msgs, busy, uploading, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function ask(v: string, atts: Attachment[], attempt = 0): Promise<AskResult> {
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: v, attachments: atts }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({})) as AssistantResponse;
      if (!response.ok && attempt < 1) return ask(v, atts, attempt + 1);
      return { ok: response.ok, data };
    } catch {
      if (attempt < 1) return ask(v, atts, attempt + 1);
      return { ok: false, data: { error: "Connection interrupted. Try again." } };
    }
  }

  async function executeAction(messageId: string, action: ActionProposal, requestId?: string) {
    const id = requestId || crypto.randomUUID();
    setMsgs((messages) => messages.map((message) => message.id === messageId ? { ...message, actionRequestId: id, actionState: "running" } : message));
    try {
      const response = await fetch("/api/assistant/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: action.op, args: action.args, confirm: true, requestId: id }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Action failed");
      const text = data?.result?.message || "Action completed.";
      setMsgs((messages) => messages.map((message) => message.id === messageId ? { ...message, actionState: "done", actionResult: text } : message));
    } catch (error) {
      setMsgs((messages) => messages.map((message) => message.id === messageId ? { ...message, actionState: "failed", actionResult: errorText(error, "Action failed safely.") } : message));
    }
  }

  async function executePlan(messageId: string, plan: ActionPlan, requestId?: string) {
    const id = requestId || crypto.randomUUID();
    setMsgs((messages) => messages.map((message) => message.id === messageId ? { ...message, planRequestId: id, planState: "running" } : message));
    try {
      const response = await fetch("/api/assistant/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.steps.map((step) => ({ op: step.op, args: step.args, summary: step.summary })), confirm: true, requestId: id }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const completed = Array.isArray(data.completedSteps) ? data.completedSteps.length : 0;
        throw new Error(`${data.error || "Plan stopped safely."}${completed ? ` · ${completed} step(s) completed` : ""}`);
      }
      const text = `${Array.isArray(data.results) ? data.results.length : plan.steps.length} step(s) completed successfully.`;
      setMsgs((messages) => messages.map((message) => message.id === messageId ? { ...message, planState: "done", planResult: text } : message));
    } catch (error) {
      setMsgs((messages) => messages.map((message) => message.id === messageId ? { ...message, planState: "failed", planResult: errorText(error, "Plan stopped safely.") } : message));
    }
  }

  async function generateArtifact(messageId: string, artifact: ArtifactProposal) {
    setMsgs((messages) => messages.map((message) => message.id === messageId ? { ...message, artifactState: "running" } : message));
    const isPdf = artifact.kind === "pdf";
    const isPptx = artifact.kind === "pptx";
    const preview = isPdf ? window.open("about:blank", "_blank") : null;
    try {
      const endpoint = isPdf ? "/api/assistant/artifacts/pdf" : isPptx ? "/api/assistant/artifacts/pptx" : "/api/assistant/artifacts/xlsx";
      const payload = isPdf
        ? { spec: artifact.pdf, fileName: artifact.fileName }
        : isPptx
          ? { presentation: artifact.presentation, fileName: artifact.fileName }
          : artifact.kind === "content-plan"
            ? { contentPlan: artifact.contentPlan, fileName: artifact.fileName }
            : { workbook: artifact.workbook, fileName: artifact.fileName };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Artifact generation failed");
      }
      const contentType = String(response.headers.get("content-type") || "");
      if (isPdf && contentType.includes("text/html")) {
        const html = await response.text();
        if (!preview) throw new Error("Popup was blocked. Allow popups to print this PDF.");
        preview.document.open();
        preview.document.write(html);
        preview.document.close();
        setTimeout(() => { preview.focus(); preview.print(); }, 450);
        setMsgs((messages) => messages.map((message) => message.id === messageId ? { ...message, artifactState: "done", artifactResult: "Print-ready PDF opened." } : message));
        return;
      }
      preview?.close();
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const ext = isPdf ? "pdf" : isPptx ? "pptx" : "xlsx";
      link.download = (artifact.fileName || "vivito-artifact") + "." + ext;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      const label = isPdf ? "PDF" : isPptx ? "PowerPoint presentation" : "Excel workbook";
      setMsgs((messages) => messages.map((message) => message.id === messageId ? { ...message, artifactState: "done", artifactResult: `${label} generated.` } : message));
    } catch (error) {
      preview?.close();
      setMsgs((messages) => messages.map((message) => message.id === messageId ? { ...message, artifactState: "failed", artifactResult: errorText(error, "Artifact generation failed safely.") } : message));
    }
  }

  async function send(text = q) {
    const value = text.trim();
    if (!value || busy || uploading) return;
    const currentAttachments = [...attachments];
    const userMessageId = mid();
    setQ("");
    setAttachments([]);
    setMsgs((messages) => [...messages, { id: userMessageId, who: "you", text: value + (currentAttachments.length ? `\nAttached: ${currentAttachments.map((attachment) => attachment.name).join(", ")}` : "") }]);
    setBusy(true);
    const output = await ask(value, currentAttachments);
    const data = output.data || {};
    const botId = mid();
    const message: ChatMsg = {
      id: botId,
      who: "vivito",
      text: data.answer || data.error || "Connection interrupted. Try again.",
      sources: Array.isArray(data.sources) ? data.sources : [],
      action: data.actionProposal,
      plan: data.actionPlan,
      artifact: data.artifactProposal,
      artifactState: data.artifactProposal ? "ready" : undefined,
      actionState: data.actionProposal ? "ready" : undefined,
      planState: data.actionPlan ? "ready" : undefined,
    };
    setMsgs((messages) => [...messages, message]);
    setBusy(false);
    if (data.actionPlan && !data.actionPlan.missingFields?.length && ["low", "medium"].includes(data.actionPlan.risk)) {
      setTimeout(() => executePlan(botId, data.actionPlan!), 0);
    } else if (data.actionProposal && !data.actionProposal.missingFields?.length && ["low", "medium"].includes(data.actionProposal.risk)) {
      setTimeout(() => executeAction(botId, data.actionProposal!), 0);
    }
  }

  async function uploadFile(file: File) {
    if (file.size > 500 * 1024 * 1024) throw new Error("Maximum file size is 500 MB.");
    const sign = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "sign", name: file.name, size: file.size, mimeType: file.type }),
    });
    const signed = await sign.json().catch(() => ({}));
    if (!sign.ok) throw new Error(signed.error || "Could not prepare upload");
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", signed.uploadUrl);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.onerror = () => reject(new Error("Network error while uploading."));
      xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Storage rejected the file (${xhr.status}).`));
      const body = new FormData();
      body.append("cacheControl", "3600");
      body.append("", file, file.name);
      xhr.send(body);
    });
    const complete = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "complete", path: signed.path, name: file.name, size: file.size, mimeType: file.type, category: "GENERAL", clientId: null, taskId: null }),
    });
    const done = await complete.json().catch(() => ({}));
    if (!complete.ok) throw new Error(done.error || "Could not save file details");
    return { fileId: String(done.file?.id || done.fileId || ""), name: file.name, mimeType: file.type || "application/octet-stream" };
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const attachment = await uploadFile(file);
      if (!attachment.fileId) throw new Error("Upload completed without a file reference.");
      setAttachments([attachment]);
    } catch (error) {
      setMsgs((messages) => [...messages, { id: mid(), who: "vivito", text: errorText(error, "File upload failed.") }]);
    } finally {
      setUploading(false);
    }
  }

  const intro = isClient
    ? "I can see the account, tasks, reviews and deadlines available to your role."
    : isAdmin
      ? "VIVIT Operating Intelligence with live context, governed memory and role-scoped actions."
      : "I connect your question to live workspace context and execute only the actions allowed for your role.";
  const artifactLabel = (artifact: ArtifactProposal) => artifact.kind === "pdf" ? "PROFESSIONAL PDF" : artifact.kind === "pptx" ? "POWERPOINT · PPTX" : artifact.kind === "content-plan" ? "CONTENT PLAN · XLSX" : "EXCEL WORKBOOK";
  const artifactButton = (artifact: ArtifactProposal) => artifact.kind === "pdf" ? "PDF" : artifact.kind === "pptx" ? "PowerPoint" : "Excel";

  return (
    <>
      <button onClick={() => setOpen((value) => !value)} aria-label={open ? "Close VIVITO" : "Open VIVITO"} className={`va-fab${open ? " active" : ""}`}>
        <VivitVivito mood={busy || uploading ? "thinking" : msgs.length ? "insight" : "calm"} compact />
        <span className="va-fab-label">VIVITO</span>
      </button>

      {open && (
        <aside className="va-panel" aria-label="VIVITO assistant">
          <header className="va-head">
            <div className="va-identity">
              <VivitVivito mood={busy || uploading ? "thinking" : "calm"} compact />
              <div>
                <b>VIVITO</b>
                <small>VIVIT OPERATING INTELLIGENCE</small>
              </div>
            </div>
            <div className="va-head-status"><span className="va-live" /> LIVE</div>
            <button onClick={() => setOpen(false)} aria-label="Close VIVITO">×</button>
          </header>

          <div className="va-context">{intro}</div>

          <div className="va-quick" aria-label="Quick prompts">
            {quick.map((prompt) => (
              <button key={prompt} onClick={() => send(prompt)} disabled={busy || uploading}>
                <span>{prompt}</span><b>↗</b>
              </button>
            ))}
          </div>

          <div className="va-chat" ref={chatRef}>
            {msgs.length === 0 && (
              <div className="va-empty">
                <span className="va-empty-kicker">YOUR AI TEAMMATE</span>
                <strong>Ask, teach, or command VIVITO</strong>
                <span>Try: “Show the campaigns that need attention, then create a task for the owner.”</span>
              </div>
            )}

            {msgs.map((message) => (
              <div key={message.id} className={`va-row ${message.who}`}>
                <div className="va-speaker">{message.who === "vivito" ? "VIVITO" : "YOU"}</div>
                <div className={`va-msg ${message.who === "vivito" ? "ai" : "you"}`}>
                  <div>{message.text}</div>

                  {message.artifact && (
                    <div className="va-action">
                      <div className="va-action-top"><b>{artifactLabel(message.artifact)}</b><span>ARTIFACT</span></div>
                      <div>{message.artifact.summary || message.artifact.title}</div>
                      {message.artifactState === "running" ? <div className="va-action-progress" role="status">Generating…</div>
                        : message.artifactState === "done" ? <div className="va-action-ok">✓ {message.artifactResult}</div>
                          : message.artifactState === "failed" ? <><div className="va-action-error">{message.artifactResult}</div><button onClick={() => generateArtifact(message.id, message.artifact!)}>Retry generation</button></>
                            : <button onClick={() => generateArtifact(message.id, message.artifact!)}>Generate {artifactButton(message.artifact)}</button>}
                    </div>
                  )}

                  {message.plan && (
                    <div className={`va-action va-plan risk-${message.plan.risk}`}>
                      <div className="va-action-top"><b>MULTI-STEP PLAN · {message.plan.steps.length}</b><span>{message.plan.risk}</span></div>
                      <div>{message.plan.summary}</div>
                      <ol className="va-plan-steps">
                        {message.plan.steps.map((step, index) => <li key={`${step.op}-${index}`}><b>{step.op.replaceAll("_", " ")}</b><span>{step.summary}</span></li>)}
                      </ol>
                      {message.plan.missingFields?.length ? <div className="va-action-missing">Missing: {message.plan.missingFields.join(", ")}</div> : null}
                      {message.planState === "running" ? <div className="va-action-progress" role="status">Executing plan…</div>
                        : message.planState === "done" ? <div className="va-action-ok">✓ {message.planResult}</div>
                          : message.planState === "failed" ? <><div className="va-action-error">{message.planResult}</div><button onClick={() => executePlan(message.id, message.plan!, message.planRequestId)}>Resume safely</button></>
                            : message.plan.missingFields?.length ? null
                              : ["high", "destructive"].includes(message.plan.risk) ? <button className={message.plan.risk === "destructive" ? "danger" : ""} onClick={() => executePlan(message.id, message.plan!)}>Confirm entire plan</button>
                                : <div className="va-action-auto">Executing authorized plan…</div>}
                    </div>
                  )}

                  {message.action && (
                    <div className={`va-action risk-${message.action.risk}`}>
                      <div className="va-action-top"><b>{message.action.op.replaceAll("_", " ")}</b><span>{message.action.risk}</span></div>
                      <div>{message.action.summary}</div>
                      {message.action.missingFields?.length ? <div className="va-action-missing">Missing: {message.action.missingFields.join(", ")}</div> : null}
                      {message.actionState === "running" ? <div className="va-action-progress" role="status">Executing…</div>
                        : message.actionState === "done" ? <div className="va-action-ok">✓ {message.actionResult}</div>
                          : message.actionState === "failed" ? <><div className="va-action-error">{message.actionResult}</div><button onClick={() => executeAction(message.id, message.action!, message.actionRequestId)}>Retry safely</button></>
                            : message.action.missingFields?.length ? null
                              : ["high", "destructive"].includes(message.action.risk) ? <button className={message.action.risk === "destructive" ? "danger" : ""} onClick={() => executeAction(message.id, message.action!)}>Confirm & execute</button>
                                : <div className="va-action-auto">Executing authorized command…</div>}
                    </div>
                  )}

                  {message.who === "vivito" && message.sources?.length ? <div className="va-sources">{message.sources.map((source) => <span key={source}>{source}</span>)}</div> : null}
                </div>
              </div>
            ))}

            {(busy || uploading) && <div className="va-thinking"><span /><span /><span /> {uploading ? "Uploading securely" : "Reading live workspace context"}</div>}
          </div>

          {attachments.length > 0 && <div className="va-attachments">{attachments.map((attachment) => <span key={attachment.fileId}>Attached · {attachment.name}<button onClick={() => setAttachments([])} aria-label="Remove attachment">×</button></span>)}</div>}

          <div className="va-input">
            <input ref={fileRef} type="file" hidden onChange={chooseFile} />
            <button className="va-attach" onClick={() => fileRef.current?.click()} disabled={busy || uploading} aria-label="Attach file">＋</button>
            <textarea value={q} onChange={(event) => setQ(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder="Ask VIVITO anything about your workspace…" />
            <button className="va-send" onClick={() => send()} disabled={busy || uploading || !q.trim()} aria-label="Send message">↑</button>
          </div>
          <footer className="va-foot">Scoped memory · role-scoped execution · audited actions · confirmation for destructive changes</footer>
        </aside>
      )}
    </>
  );
}
