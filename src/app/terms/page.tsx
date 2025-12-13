import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Price Hunter terms of service - rules for using our platform",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto prose dark:prose-invert">
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: December 2024</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using Price Hunter, you agree to be bound by these
          Terms of Service. If you do not agree to these terms, please do not
          use our service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          Price Hunter is a price comparison platform that allows users to:
        </p>
        <ul>
          <li>Compare prices across multiple online stores</li>
          <li>Track price history of products</li>
          <li>Set price alerts for products</li>
          <li>Save products to wishlists</li>
        </ul>

        <h2>3. User Accounts</h2>
        <ul>
          <li>You must provide accurate information when creating an account</li>
          <li>You are responsible for maintaining the security of your account</li>
          <li>You must be at least 18 years old to use our service</li>
          <li>One person may not maintain multiple accounts</li>
        </ul>

        <h2>4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use our service for any illegal purpose</li>
          <li>Attempt to gain unauthorized access to our systems</li>
          <li>Scrape or harvest data from our platform</li>
          <li>Interfere with the proper functioning of our service</li>
          <li>Use automated tools to access our service without permission</li>
        </ul>

        <h2>5. Price Information</h2>
        <p>
          While we strive to provide accurate price information:
        </p>
        <ul>
          <li>Prices may change at any time without notice</li>
          <li>We are not responsible for pricing errors on third-party websites</li>
          <li>Always verify the final price before making a purchase</li>
          <li>We do not guarantee availability of products</li>
        </ul>

        <h2>6. Intellectual Property</h2>
        <p>
          All content on Price Hunter, including text, graphics, logos, and
          software, is owned by us or our licensors and is protected by
          intellectual property laws.
        </p>

        <h2>7. Third-Party Links</h2>
        <p>
          Our service contains links to third-party websites. We are not
          responsible for the content or practices of these websites. Your
          use of third-party websites is at your own risk.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law:
        </p>
        <ul>
          <li>We provide our service &quot;as is&quot; without warranties</li>
          <li>We are not liable for any indirect or consequential damages</li>
          <li>Our total liability is limited to the amount you paid us (if any)</li>
        </ul>

        <h2>9. Termination</h2>
        <p>
          We may terminate or suspend your account at any time for any reason,
          including violation of these terms. You may also delete your account
          at any time through your account settings.
        </p>

        <h2>10. Changes to Terms</h2>
        <p>
          We may modify these terms at any time. Continued use of our service
          after changes constitutes acceptance of the new terms.
        </p>

        <h2>11. Governing Law</h2>
        <p>
          These terms are governed by the laws of Saudi Arabia. Any disputes
          will be resolved in the courts of Riyadh, Saudi Arabia.
        </p>

        <h2>12. Contact</h2>
        <p>
          For questions about these terms, contact us at:{" "}
          <a href="mailto:legal@pricehunter.app">legal@pricehunter.app</a>
        </p>
      </div>
    </div>
  );
}
