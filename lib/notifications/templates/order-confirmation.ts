export function renderOrderConfirmationEmail(context: {
  orderNumber: string;
  customerName: string;
  items: Array<{ productName: string; quantity: number; itemTotal: number }>;
  subtotal: number;
  deliveryCharge: number;
  total: number;
  district: string;
  deliveryAddress: string;
  phoneNumber: string;
  storeName: string;
}): string {
  const itemsHtml = context.items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e5e5e5;font-size:15px;color:#374151;">
          ${item.productName} <span style="color:#9ca3af;">x${item.quantity}</span>
        </td>
        <td align="right" style="padding:12px 0;border-bottom:1px solid #e5e5e5;font-size:15px;color:#374151;white-space:nowrap;">
          $${item.itemTotal.toFixed(2)}
        </td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - ${context.orderNumber}</title>
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
              <h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">Order Confirmed</h2>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;">
                Thank you, <strong>${context.customerName}</strong>. Your order has been received.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f9fafb;border-radius:6px;font-size:14px;color:#6b7280;">
                    <strong style="color:#374151;">Order Number:</strong> ${context.orderNumber}
                  </td>
                </tr>
              </table>
              <h3 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111827;">Items</h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                ${itemsHtml}
                <tr>
                  <td style="padding:12px 0 0;font-size:15px;color:#374151;">Subtotal</td>
                  <td align="right" style="padding:12px 0 0;font-size:15px;color:#374151;white-space:nowrap;">$${context.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:15px;color:#374151;">Delivery</td>
                  <td align="right" style="padding:4px 0;font-size:15px;color:#374151;white-space:nowrap;">$${context.deliveryCharge.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0 0;border-top:2px solid #111827;font-size:16px;font-weight:600;color:#111827;">Total</td>
                  <td align="right" style="padding:8px 0 0;border-top:2px solid #111827;font-size:16px;font-weight:600;color:#111827;white-space:nowrap;">$${context.total.toFixed(2)}</td>
                </tr>
              </table>
              <h3 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111827;">Delivery Details</h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="padding:6px 0;font-size:15px;color:#6b7280;vertical-align:top;width:100px;">Address</td>
                  <td style="padding:6px 0;font-size:15px;color:#374151;">${context.deliveryAddress}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:15px;color:#6b7280;vertical-align:top;">District</td>
                  <td style="padding:6px 0;font-size:15px;color:#374151;">${context.district}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:15px;color:#6b7280;vertical-align:top;">Phone</td>
                  <td style="padding:6px 0;font-size:15px;color:#374151;">${context.phoneNumber}</td>
                </tr>
              </table>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#374151;">
                We will notify you when your order status changes. If you have any questions, please contact us.
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
