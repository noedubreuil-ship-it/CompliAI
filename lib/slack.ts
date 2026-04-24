export async function sendSlackNotification(webhookUrl: string, message: {
  title: string;
  text: string;
  color?: string;
}): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attachments: [{
          color: message.color ?? "#0f172a",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*🛡️ CompliAI — ${message.title}*\n${message.text}`,
              },
            },
          ],
        }],
      }),
    });
  } catch {
    // Non-blocking
  }
}
