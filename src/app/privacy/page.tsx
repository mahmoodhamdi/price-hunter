import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Price Hunter privacy policy - how we handle your data",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto prose dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: December 2024</p>

        <h2>1. Introduction</h2>
        <p>
          Welcome to Price Hunter. We respect your privacy and are committed to protecting
          your personal data. This privacy policy explains how we collect, use, and
          safeguard your information when you use our service.
        </p>

        <h2>2. Information We Collect</h2>
        <h3>2.1 Information you provide</h3>
        <ul>
          <li>Account information (name, email, password)</li>
          <li>Country and currency preferences</li>
          <li>Telegram ID (optional, for notifications)</li>
          <li>Wishlist and price alert preferences</li>
        </ul>

        <h3>2.2 Information collected automatically</h3>
        <ul>
          <li>Search queries and browsing history within our platform</li>
          <li>Device information and IP address</li>
          <li>Usage analytics</li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <ul>
          <li>Provide price comparison services</li>
          <li>Send price drop notifications</li>
          <li>Improve our services and user experience</li>
          <li>Communicate with you about your account</li>
        </ul>

        <h2>4. Data Sharing</h2>
        <p>
          We do not sell your personal data. We may share data with:
        </p>
        <ul>
          <li>Service providers (email, analytics)</li>
          <li>Law enforcement when required by law</li>
        </ul>

        <h2>5. Data Security</h2>
        <p>
          We implement appropriate security measures including:
        </p>
        <ul>
          <li>Password hashing with bcrypt</li>
          <li>HTTPS encryption</li>
          <li>Regular security audits</li>
        </ul>

        <h2>6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Correct inaccurate data</li>
          <li>Delete your account and data</li>
          <li>Export your data</li>
          <li>Opt-out of marketing communications</li>
        </ul>

        <h2>7. Cookies</h2>
        <p>
          We use essential cookies for authentication and preferences.
          We use analytics cookies to improve our service.
        </p>

        <h2>8. Contact Us</h2>
        <p>
          For privacy-related questions, contact us at:{" "}
          <a href="mailto:privacy@pricehunter.app">privacy@pricehunter.app</a>
        </p>

        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this policy periodically. We will notify you of any
          significant changes via email or through our platform.
        </p>
      </div>
    </div>
  );
}
