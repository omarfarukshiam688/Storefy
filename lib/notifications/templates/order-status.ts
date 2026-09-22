const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const NEXT_STEPS: Record<string, string> = {
  pending: 'Your order is pending and will be reviewed by the store.',
  confirmed: 'Your order has been confirmed and is being prepared.',
  processing: 'Your order is being processed and will be shipped soon.',
  shipped: 'Your order has been shipped and is on its way.',
  delivered: 'Your order has been delivered. Thank you for shopping with us!',
  cancelled: 'Your order has been cancelled. If you have any questions, please contact the store.',
};

export function renderOrderStatusEmail(context: {
  orderNumber: string;
  customerName: string;
  previousStatus: string;
  nextStatus: string;
  storeName: string;
}): string {
  const previousLabel = STATUS_LABELS[context.previousStatus] ?? context.previousStatus;
  const nextLabel = STATUS_LABELS[context.nextStatus] ?? context.nextStatus;
  const nextSteps = NEXT_STEPS[context.nextStatus] ?? `Your order status has been updated to ${nextLabel}.`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Update - ${context.orderNumber}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #e5e5e5;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;">Storefy</h1>
              <p style="margin:4px 0 0;font-size:14px;color:#6b7280;">${context.storeName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">Order Status Updated</h2>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;">
                Hello <strong>${context.customerName}</strong>, your order status has changed.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f9fafb;border-radius:6px;font-size:14px;color:#6b7280;">
                    <strong style="color:#374151;">Order Number:</strong> ${context.orderNumber}
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="padding:8px 0;font-size:15px;color:#6b7280;">Previous Status</td>
                  <td align="right" style="padding:8px 0;font-size:15px;color:#9ca3af;text-decoration:line-through;">${previousLabel}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:15px;color:#374151;font-weight:600;">New Status</td>
                  <td align="right" style="padding:8px 0;font-size:15px;color:#111827;font-weight:600;">${nextLabel}</td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-left:4px solid #111827;border-radius:0 6px 6px 0;margin:0 0 24px;">
                <tr>
                  <td style="padding:16px 20px;font-size:15px;line-height:1.6;color:#374151;">
                    ${nextSteps}
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#374151;">
                You can track your order from your account dashboard. If you have any questions, please contact the store directly.
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
