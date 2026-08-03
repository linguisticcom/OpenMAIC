type EmailParams = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export function authEmailIsConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM);
}

export async function sendAuthEmail(params: EmailParams): Promise<{ ok: true } | { ok: false }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('Auth email is not configured; account lifecycle email was not sent.');
    }
    return { ok: false };
  }

  let response: Response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      }),
    });
  } catch {
    console.warn('Auth email provider could not be reached.');
    return { ok: false };
  }

  if (!response.ok) {
    console.warn('Auth email provider rejected the message.');
    return { ok: false };
  }

  return { ok: true };
}
