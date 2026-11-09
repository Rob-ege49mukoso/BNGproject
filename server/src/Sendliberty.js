
export async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.SENDLIBERTY_API_KEY;
  const from = process.env.SENDLIBERTY_FROM;

  if (!apiKey || !from) {
    throw new Error("Sendliberty configuration is incomplete.");
  }

  const response = await fetch("https://sendliberty.com/api/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Sendliberty rejected the request:", response.status);
    throw new Error(`Sendliberty request failed (${response.status}).`);
  }

  return result;
}
  
