export async function slackAlert(
  type: "task" | "budget" | "contract" | "invoice" | "lead",
  data: Record<string, unknown>
) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  const msgs: Record<string, string> = {
    task:     `🎨 Task "${data.title}" needs review — Client: ${data.client}`,
    budget:   `⚠️ Budget ${data.pct}% used: ${data.client} ($${data.spent} of $${data.budget})`,
    contract: `📋 Contract expiring: ${data.client} — ${data.daysLeft} days left`,
    invoice:  `💳 Invoice overdue: ${data.client} — $${data.amount} outstanding`,
    lead:     `🎯 Deal ${data.status}: ${data.company} — $${data.value}`,
  };
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: msgs[type] ?? JSON.stringify(data) }),
    });
  } catch {}
}
