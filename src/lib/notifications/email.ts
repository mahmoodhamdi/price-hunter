import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  if (!resend) {
    console.warn("Resend API key not configured, skipping email");
    return false;
  }

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "Price Hunter <alerts@pricehunter.app>",
      to,
      subject,
      html,
    });

    console.log(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

export function generatePriceAlertEmail(data: {
  productName: string;
  productUrl: string;
  currentPrice: number;
  targetPrice: number;
  currency: string;
  storeName: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Price Alert</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .price-box { background: white; border: 2px solid #16a34a; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .current-price { font-size: 32px; font-weight: bold; color: #16a34a; }
    .target-price { font-size: 14px; color: #666; margin-top: 5px; }
    .btn { display: inline-block; background: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Price Alert!</h1>
      <p>Great news! The price has dropped!</p>
    </div>
    <div class="content">
      <h2>${data.productName}</h2>
      <div class="price-box">
        <div class="current-price">${data.currency} ${data.currentPrice.toFixed(2)}</div>
        <div class="target-price">Your target: ${data.currency} ${data.targetPrice.toFixed(2)}</div>
      </div>
      <p>The price at <strong>${data.storeName}</strong> has dropped below your target price!</p>
      <center>
        <a href="${data.productUrl}" class="btn">View Product</a>
      </center>
    </div>
    <div class="footer">
      <p>You received this email because you set a price alert on Price Hunter.</p>
      <p>© ${new Date().getFullYear()} Price Hunter. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function generateWelcomeEmail(name: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Price Hunter</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .feature { display: flex; align-items: center; margin: 15px 0; }
    .feature-icon { font-size: 24px; margin-right: 15px; }
    .btn { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 Welcome to Price Hunter!</h1>
      <p>Your smart shopping companion</p>
    </div>
    <div class="content">
      <h2>Hello ${name}!</h2>
      <p>Thanks for joining Price Hunter. Here's what you can do:</p>

      <div class="feature">
        <span class="feature-icon">🔍</span>
        <span>Search and compare prices across 15+ stores</span>
      </div>
      <div class="feature">
        <span class="feature-icon">🔔</span>
        <span>Set price alerts and get notified when prices drop</span>
      </div>
      <div class="feature">
        <span class="feature-icon">📊</span>
        <span>Track price history to buy at the right time</span>
      </div>
      <div class="feature">
        <span class="feature-icon">❤️</span>
        <span>Save products to your wishlist</span>
      </div>

      <center>
        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}" class="btn">Start Hunting Prices</a>
      </center>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Price Hunter. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}
