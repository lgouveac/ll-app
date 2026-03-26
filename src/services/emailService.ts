interface SendInviteEmailParams {
  to: string;
  inviterName: string;
  groupName: string;
  memberName: string;
  invitationId: string;
}

export async function sendInviteEmail(params: SendInviteEmailParams): Promise<void> {
  const res = await fetch("/api/send-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as Record<string, string>).error || "Email failed");
  }
}
