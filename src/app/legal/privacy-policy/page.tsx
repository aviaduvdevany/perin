import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy - Perin",
  description:
    "Privacy Policy for Perin AI Assistant - How we collect, use, and protect your personal data",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[var(--background-primary)]">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-[var(--background-secondary)] rounded-lg border border-[var(--card-border)] p-8">
          <h1 className="text-3xl font-bold text-[var(--foreground-primary)] mb-2">
            Privacy Policy
          </h1>
          <p className="text-[var(--foreground-muted)] mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <div className="prose prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                1. Introduction
              </h2>
              <p className="text-[var(--foreground-secondary)] mb-4">
                Perin (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is
                committed to protecting your privacy and personal data. This
                Privacy Policy explains how we collect, use, disclose, and
                safeguard your information when you use our AI-powered digital
                delegate service.
              </p>
              <p className="text-[var(--foreground-secondary)] mb-4">
                This policy complies with the General Data Protection Regulation
                (GDPR) and other applicable privacy laws. By using our service,
                you consent to the data practices described in this policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                2. Data Controller
              </h2>
              <p className="text-[var(--foreground-secondary)] mb-4">
                Perin is the data controller for the personal data we process.
                If you have any questions about this Privacy Policy or our data
                practices, please contact us at:
              </p>
              <div className="bg-[var(--background-primary)] p-4 rounded-lg border border-[var(--card-border)]">
                <p className="text-[var(--foreground-secondary)]">
                  <strong>Email:</strong> privacy@perin.ai
                  <br />
                  <strong>Address:</strong> Perin AI, Timna 21, Tel Aviv, Israel
                  <br />
                  <strong>Data Protection Officer:</strong> dpo@perin.ai
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                3. Information We Collect
              </h2>

              <h3 className="text-xl font-medium text-[var(--foreground-primary)] mb-3">
                3.1 Personal Information
              </h3>
              <ul className="list-disc pl-6 text-[var(--foreground-secondary)] mb-4">
                <li>Name and email address</li>
                <li>
                  Profile information (Perin name, tone preferences, avatar)
                </li>
                <li>Timezone and preferred working hours</li>
                <li>Authentication credentials (hashed passwords)</li>
                <li>Account creation and last login timestamps</li>
              </ul>

              <h3 className="text-xl font-medium text-[var(--foreground-primary)] mb-3">
                3.2 Communication Data
              </h3>
              <ul className="list-disc pl-6 text-[var(--foreground-secondary)] mb-4">
                <li>AI conversation history and context</li>
                <li>Memory and preferences stored by the AI</li>
                <li>
                  Delegation session data (when using delegation features)
                </li>
                <li>Chat messages and interactions with Perin</li>
              </ul>

              <h3 className="text-xl font-medium text-[var(--foreground-primary)] mb-3">
                3.3 Integration Data (Optional)
              </h3>
              <ul className="list-disc pl-6 text-[var(--foreground-secondary)] mb-4">
                <li>
                  <strong>Gmail Integration:</strong> Email metadata (sender,
                  subject, date, unread status)
                </li>
                <li>
                  <strong>Calendar Integration:</strong> Event details (title,
                  time, location, attendees)
                </li>
                <li>
                  <strong>OAuth Tokens:</strong> Encrypted access and refresh
                  tokens for connected services
                </li>
              </ul>

              <h3 className="text-xl font-medium text-[var(--foreground-primary)] mb-3">
                3.4 Technical Data
              </h3>
              <ul className="list-disc pl-6 text-[var(--foreground-secondary)] mb-4">
                <li>IP address and browser information</li>
                <li>Device information and operating system</li>
                <li>Usage analytics and performance metrics</li>
                <li>Push notification tokens (if enabled)</li>
                <li>Audit logs for security and compliance</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                4. Legal Basis for Processing
              </h2>
              <p className="text-[var(--foreground-secondary)] mb-4">
                We process your personal data based on the following legal
                grounds:
              </p>
              <ul className="list-disc pl-6 text-[var(--foreground-secondary)] mb-4">
                <li>
                  <strong>Contract Performance:</strong> To provide our AI
                  assistant services
                </li>
                <li>
                  <strong>Legitimate Interest:</strong> To improve our services
                  and ensure security
                </li>
                <li>
                  <strong>Consent:</strong> For optional integrations and
                  marketing communications
                </li>
                <li>
                  <strong>Legal Obligation:</strong> To comply with applicable
                  laws and regulations
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                5. How We Use Your Information
              </h2>
              <p className="text-[var(--foreground-secondary)] mb-4">
                We use your personal data for the following purposes:
              </p>
              <ul className="list-disc pl-6 text-[var(--foreground-secondary)] mb-4">
                <li>Provide and maintain our AI assistant service</li>
                <li>Process and respond to your requests and conversations</li>
                <li>Manage your account and preferences</li>
                <li>
                  Enable optional integrations (Gmail, Calendar) when you choose
                  to connect them
                </li>
                <li>Send important service notifications and updates</li>
                <li>Improve our AI models and service quality</li>
                <li>Ensure security and prevent fraud</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                6. Third-Party Services
              </h2>
              <p className="text-[var(--foreground-secondary)] mb-4">
                We use the following third-party services that may process your
                data:
              </p>

              <div className="bg-[var(--background-primary)] p-4 rounded-lg border border-[var(--card-border)] mb-4">
                <h4 className="font-medium text-[var(--foreground-primary)] mb-2">
                  OpenAI API
                </h4>
                <p className="text-[var(--foreground-secondary)] text-sm mb-2">
                  We use OpenAI&apos;s API to power our AI assistant. Your
                  conversations may be processed by OpenAI to generate
                  responses. OpenAI&apos;s data usage policy applies.
                </p>
                <p className="text-[var(--foreground-muted)] text-xs">
                  <strong>Data Transfer:</strong> United States |{" "}
                  <strong>Legal Basis:</strong> Contract Performance
                </p>
              </div>

              <div className="bg-[var(--background-primary)] p-4 rounded-lg border border-[var(--card-border)] mb-4">
                <h4 className="font-medium text-[var(--foreground-primary)] mb-2">
                  Google Services (Optional)
                </h4>
                <p className="text-[var(--foreground-secondary)] text-sm mb-2">
                  When you connect Gmail or Calendar, we access your Google data
                  through OAuth2. We only access data you explicitly authorize.
                </p>
                <p className="text-[var(--foreground-muted)] text-xs">
                  <strong>Data Transfer:</strong> United States |{" "}
                  <strong>Legal Basis:</strong> Consent
                </p>
              </div>

              <div className="bg-[var(--background-primary)] p-4 rounded-lg border border-[var(--card-border)] mb-4">
                <h4 className="font-medium text-[var(--foreground-primary)] mb-2">
                  OneSignal (Optional)
                </h4>
                <p className="text-[var(--foreground-secondary)] text-sm mb-2">
                  We use OneSignal for push notifications. You can opt-out at
                  any time through your device settings.
                </p>
                <p className="text-[var(--foreground-muted)] text-xs">
                  <strong>Data Transfer:</strong> United States |{" "}
                  <strong>Legal Basis:</strong> Consent
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                7. Data Retention
              </h2>
              <p className="text-[var(--foreground-secondary)] mb-4">
                We retain your personal data for the following periods:
              </p>
              <ul className="list-disc pl-6 text-[var(--foreground-secondary)] mb-4">
                <li>
                  <strong>Account Data:</strong> Until you delete your account
                  or request deletion
                </li>
                <li>
                  <strong>Conversation History:</strong> 2 years from last
                  interaction, unless you request earlier deletion
                </li>
                <li>
                  <strong>Integration Data:</strong> Until you disconnect the
                  integration or delete your account
                </li>
                <li>
                  <strong>Audit Logs:</strong> 1 year for security and
                  compliance purposes
                </li>
                <li>
                  <strong>Marketing Data:</strong> Until you withdraw consent or
                  unsubscribe
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                8. Your Rights (GDPR)
              </h2>
              <p className="text-[var(--foreground-secondary)] mb-4">
                Under GDPR, you have the following rights regarding your
                personal data:
              </p>
              <ul className="list-disc pl-6 text-[var(--foreground-secondary)] mb-4">
                <li>
                  <strong>Right of Access:</strong> Request a copy of your
                  personal data
                </li>
                <li>
                  <strong>Right to Rectification:</strong> Correct inaccurate or
                  incomplete data
                </li>
                <li>
                  <strong>Right to Erasure:</strong> Request deletion of your
                  personal data
                </li>
                <li>
                  <strong>Right to Restrict Processing:</strong> Limit how we
                  use your data
                </li>
                <li>
                  <strong>Right to Data Portability:</strong> Receive your data
                  in a structured format
                </li>
                <li>
                  <strong>Right to Object:</strong> Object to processing based
                  on legitimate interests
                </li>
                <li>
                  <strong>Right to Withdraw Consent:</strong> Withdraw consent
                  for optional processing
                </li>
              </ul>
              <p className="text-[var(--foreground-secondary)] mb-4">
                To exercise these rights, contact us at privacy@perin.ai. We
                will respond within 30 days.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                9. Data Security
              </h2>
              <p className="text-[var(--foreground-secondary)] mb-4">
                We implement appropriate technical and organizational measures
                to protect your data:
              </p>
              <ul className="list-disc pl-6 text-[var(--foreground-secondary)] mb-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure authentication with NextAuth and JWT tokens</li>
                <li>Password hashing with bcryptjs</li>
                <li>Rate limiting and security headers</li>
                <li>Regular security audits and monitoring</li>
                <li>Access controls and audit logging</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                10. International Data Transfers
              </h2>
              <p className="text-[var(--foreground-secondary)] mb-4">
                Some of our third-party services are located outside the
                European Economic Area (EEA). We ensure adequate protection
                through:
              </p>
              <ul className="list-disc pl-6 text-[var(--foreground-secondary)] mb-4">
                <li>
                  Standard Contractual Clauses (SCCs) with service providers
                </li>
                <li>Adequacy decisions where applicable</li>
                <li>Data minimization and purpose limitation</li>
                <li>Regular transfer impact assessments</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                11. Cookies and Tracking
              </h2>
              <p className="text-[var(--foreground-secondary)] mb-4">
                We use essential cookies for authentication and service
                functionality. Optional cookies for analytics and
                personalization require your consent. You can manage cookie
                preferences in your account settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                12. Children&apos;s Privacy
              </h2>
              <p className="text-[var(--foreground-secondary)] mb-4">
                Our service is not intended for children under 16. We do not
                knowingly collect personal data from children under 16. If we
                become aware of such collection, we will delete the data
                immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                13. Changes to This Policy
              </h2>
              <p className="text-[var(--foreground-secondary)] mb-4">
                We may update this Privacy Policy from time to time. We will
                notify you of any material changes by email or through our
                service. Your continued use after such changes constitutes
                acceptance of the updated policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                14. Contact Information
              </h2>
              <p className="text-[var(--foreground-secondary)] mb-4">
                If you have questions about this Privacy Policy or our data
                practices, please contact us:
              </p>
              <div className="bg-[var(--background-primary)] p-4 rounded-lg border border-[var(--card-border)]">
                <p className="text-[var(--foreground-secondary)]">
                  <strong>Email:</strong> privacy@perin.ai
                  <br />
                  <strong>Data Protection Officer:</strong> dpo@perin.ai
                  <br />
                  <strong>Address:</strong> Perin AI, Timna 21, Tel Aviv, Israel
                </p>
              </div>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--card-border)]">
            <Link
              href="/"
              className="inline-flex items-center text-[var(--accent-primary)] hover:text-[var(--accent-primary)]/80 transition-colors"
            >
              ← Back to Perin
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
