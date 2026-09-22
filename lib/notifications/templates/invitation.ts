export function renderInvitationEmail(context: {
  tenantName: string;
  invitedBy: string;
  role: string;
  invitationLink: string;
}): string {
  const roleLabel = context.role === 'tenant_admin' ? 'Administrator' : 'Staff';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You have been invited to ${context.tenantName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #e5e5e5;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;">Storefy</h1>
              <p style="margin:4px 0 0;font-size:14px;color:#6b7280;">Multi-tenant e-commerce platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#111827;">You have been invited</h2>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
                <strong>${context.invitedBy}</strong> has invited you to join <strong>${context.tenantName}</strong> as a <strong>${roleLabel}</strong>.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;">
                Click the button below to accept the invitation and get started.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#111827;border-radius:6px;">
                    <a href="${context.invitationLink}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#6b7280;">
                This invitation link will expire in 7 days. If you did not expect this invitation, you can safely ignore this email.
              </p>
              <p style="margin:0;font-size:14px;line-height:1.5;color:#6b7280;">
                If the button above does not work, copy and paste the following URL into your browser:
              </p>
              <p style="margin:8px 0 0;font-size:13px;line-height:1.4;color:#9ca3af;word-break:break-all;">
                ${context.invitationLink}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #e5e5e5;background-color:#f9fafb;">
              <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
                This is an automated message from Storefy. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
