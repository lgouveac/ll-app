import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { to, inviterName, groupName, memberName, invitationId } = req.body;
  if (!to || !invitationId) return res.status(400).json({ error: "Missing fields" });

  const APP_URL = process.env.VITE_APP_URL || "https://ll-app-three.vercel.app";
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return res.status(500).json({ error: "RESEND_API_KEY not configured" });

  const inviteUrl = `${APP_URL}/auth?invite=${invitationId}`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
    body: JSON.stringify({
      from: "L&L <onboarding@resend.dev>",
      to: [to],
      subject: `${inviterName || "Alguem"} te convidou para "${groupName || "um grupo"}" no L&L`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0F0A1A;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0F0A1A;padding:40px 20px;">
<tr><td align="center"><table width="100%" style="max-width:480px;">
<tr><td align="center" style="padding-bottom:32px;">
<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#DC2626,#7C3AED);line-height:64px;text-align:center;font-size:28px;">&#10084;</div>
</td></tr>
<tr><td style="background:#1A1128;border-radius:16px;padding:32px;border:1px solid #2D2240;">
<h1 style="color:#F0ECF5;font-size:22px;font-weight:700;margin:0 0 8px;text-align:center;">Voce foi convidado!</h1>
<p style="color:#8B7FA0;font-size:15px;line-height:1.6;margin:0 0 24px;text-align:center;">
<strong style="color:#F0ECF5;">${inviterName}</strong> te convidou para o grupo
<strong style="color:#F0ECF5;">"${groupName}"</strong> como <strong style="color:#F0ECF5;">${memberName}</strong>.
</p>
<table width="100%"><tr><td align="center">
<a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#DC2626,#7C3AED);color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:12px;">Aceitar convite</a>
</td></tr></table>
<p style="color:#8B7FA0;font-size:13px;margin:24px 0 0;text-align:center;">Se nao tem conta, crie uma ao clicar.</p>
</td></tr>
<tr><td style="padding-top:24px;text-align:center;">
<p style="color:#8B7FA0;font-size:12px;margin:0;">L&amp;L — Split with Love</p>
</td></tr></table></td></tr></table></body></html>`,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return res.status(500).json({ error: "Email failed", details: err });
  }

  return res.status(200).json({ success: true });
}
