import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service - Perin",
  description:
    "Terms of Service for Perin AI Assistant - Service terms, user obligations, and legal conditions",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[var(--background-primary)]">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-[var(--background-secondary)] rounded-lg border border-[var(--card-border)] p-8">
          <h1 className="text-3xl font-bold text-[var(--foreground-primary)] mb-2">
            Terms of Service
          </h1>
          <p className="text-[var(--foreground-muted)] mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <div className="prose prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-[var(--foreground-secondary)] mb-4">
                By accessing or using Perin (&quot;the Service&quot;), you agree
                to be bound by these Terms of Service (&quot;Terms&quot;). If
                you disagree with any part of these terms, you may not access
                the Service.
              </p>
              <p className="text-[var(--foreground-secondary)] mb-4">
                These Terms constitute a legally binding agreement between you
                and Perin. We reserve the right to modify these Terms at any
                time, and your continued use of the Service constitutes
                acceptance of any changes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                2. Description of Service
              </h2>
              <p className="text-[var(--foreground-secondary)] mb-4">
                Perin is an AI-powered digital delegate that provides:
              </p>
              <ul className="list-disc pl-6 text-[var(--foreground-secondary)] mb-4">
                <li>Intelligent conversation and task assistance</li>
                <li>Email management and analysis (when Gmail is connected)</li>
                <li>
                  Calendar scheduling and coordination (when Calendar is
                  connected)
                </li>
                <li>Memory and context awareness across conversations</li>
                <li>Delegation capabilities for external users</li>
                <li>Network coordination and meeting management</li>
                <li>Integration with third-party services</li>
              </ul>
              <p className="text-[var(--foreground-secondary)] mb-4">
                The Service is provided &quot;as is&quot; and we make no
                warranties about its availability, accuracy, or suitability for
                your specific needs.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                3. User Accounts
              </h2>
              <h3 className="text-xl font-medium text-[var(--foreground-primary)] mb-3">
                3.1 Account Creation
              </h3>
              <p className="text-[var(--foreground-secondary)] mb-4">
                To use the Service, you must create an account by providing
                accurate and complete information. You are responsible for
                maintaining the confidentiality of your account credentials and
                for all activities that occur under your account.
              </p>

              <h3 className="text-xl font-medium text-[var(--foreground-primary)] mb-3">
                3.2 Account Security
              </h3>
              <p className="text-[var(--foreground-secondary)] mb-4">
                You must:
              </p>
              <ul className="list-disc pl-6 text-[var(--foreground-secondary)] mb-4">
                <li>Use a strong, unique password</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Not share your account credentials with others</li>
                <li>Be responsible for all actions taken under your account</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                4. Acceptable Use
              </h2>
              <h3 className="text-xl font-medium text-[var(--foreground-primary)] mb-3">
                4.1 Permitted Uses
              </h3>
              <p className="text-[var(--foreground-secondary)] mb-4">
                You may use the Service for lawful business and personal
                purposes, including:
              </p>
              <ul className="list-disc pl-6 text-[var(--foreground-secondary)] mb-4">
                <li>Personal productivity and task management</li>
                <li>Business communication and scheduling</li>
                <li>Email and calendar organization</li>
                <li>Delegation of tasks to external parties</li>
                <li>Integration with your existing tools and services</li>
              </ul>

              <h3 className="text-xl font-medium text-[var(--foreground-primary)] mb-3">
                4.2 Prohibited Uses
              </h3>
              <p className="text-[var(--foreground-secondary)] mb-4">
                You may not use the Service to:
              </p>
              <ul className="list-disc pl-6 text-[var(--foreground-secondary)] mb-4">
                <li>Violate any applicable laws or regulations</li>
                <li>Transmit harmful, abusive, or offensive content</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Use the Service for spam or unsolicited communications</li>
                <li>Reverse engineer or attempt to extract source code</li>
                <li>
                  Use the Service to compete with us or create competing
                  services
                </li>
                <li>
                  Share content that infringes on intellectual property rights
                </li>
                <li>Engage in any fraudulent or deceptive practices</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                5. Third-Party Integrations
              </h2>
              <p className="text-[var(--foreground-secondary)] mb-4">
                The Service may integrate with third-party services (such as
                Gmail, Google Calendar, and OpenAI). Your use of these
                integrations is subject to:
              </p>
              <ul className="list-disc pl-6 text-[var(--foreground-secondary)] mb-4">
                <li>
                  The terms of service of the respective third-party providers
                </li>
                <li>Your authorization and consent for data sharing</li>
                <li>Our Privacy Policy regarding data processing</li>
                <li>Your ability to disconnect integrations at any time</li>
              </ul>
              <p className="text-[var(--foreground-secondary)] mb-4">
                We are not responsible for the availability, accuracy, or
                security of third-party services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                6. Intellectual Property Rights
              </h2>
              <h3 className="text-xl font-medium text-[var(--foreground-primary)] mb-3">
                6.1 Our Rights
              </h3>
              <p className="text-[var(--foreground-secondary)] mb-4">
                Perin and its original content, features, and functionality are
                owned by us and are protected by international copyright,
                trademark, patent, trade secret, and other intellectual property
                laws.
              </p>

              <h3 className="text-xl font-medium text-[var(--foreground-primary)] mb-3">
                6.2 Your Rights
              </h3>
              <p className="text-[var(--foreground-secondary)] mb-4">
                You retain ownership of your personal data and content. By using
                the Service, you grant us a limited license to process your data
                as necessary to provide the Service, as described in our Privacy
                Policy.
              </p>

              <h3 className="text-xl font-medium text-[var(--foreground-primary)] mb-3">
                6.3 User Content
              </h3>
              <p className="text-[var(--foreground-secondary)] mb-4">
                You are responsible for any content you provide through the
                Service. You represent that you have the right to share such
                content and that it does not violate any third-party rights.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                7. Privacy and Data Protection
              </h2>
              <p className="text-[var(--foreground-secondary)] mb-4">
                Your privacy is important to us. Our collection and use of
                personal information is governed by our Privacy Policy, which is
                incorporated into these Terms by reference. By using the
                Service, you consent to the collection and use of information as
                described in our Privacy Policy.
              </p>
              <p className="text-[var(--foreground-secondary)] mb-4">
                We comply with applicable data protection laws, including GDPR,
                and provide you with rights regarding your personal data as
                described in our Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                8. Service Availability
              </h2>
              <p className="text-[var(--foreground-secondary)] mb-4">
                We strive to provide reliable service, but we do not guarantee:
              </p>
              <ul className="list-disc pl-6 text-[var(--foreground-secondary)] mb-4">
                <li>Uninterrupted or error-free service</li>
                <li>Specific response times or performance levels</li>
                <li>Compatibility with all devices or browsers</li>
                <li>Availability during maintenance or updates</li>
              </ul>
              <p className="text-[var(--foreground-secondary)] mb-4">
                We may temporarily suspend the Service for maintenance, updates,
                or technical issues without prior notice.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                9. Limitation of Liability
              </h2>
              <p className="text-[var(--foreground-secondary)] mb-4">
                To the maximum extent permitted by law:
              </p>
              <ul className="list-disc pl-6 text-[var(--foreground-secondary)] mb-4">
                <li>
                  We provide the Service &quot;as is&quot; without warranties of
                  any kind
                </li>
                <li>
                  We are not liable for any indirect, incidental, or
                  consequential damages
                </li>
                <li>
                  Our total liability is limited to the amount you paid for the
                  Service in the past 12 months
                </li>
                <li>
                  We are not responsible for third-party service failures or
                  data loss
                </li>
                <li>
                  We are not liable for decisions made based on AI-generated
                  content
                </li>
              </ul>
              <p className="text-[var(--foreground-secondary)] mb-4">
                Some jurisdictions do not allow the exclusion of certain
                warranties or limitations of liability, so these limitations may
                not apply to you.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                10. Indemnification
              </h2>
              <p className="text-[var(--foreground-secondary)] mb-4">
                You agree to indemnify and hold us harmless from any claims,
                damages, or expenses arising from:
              </p>
              <ul className="list-disc pl-6 text-[var(--foreground-secondary)] mb-4">
                <li>Your use of the Service in violation of these Terms</li>
                <li>Your violation of any third-party rights</li>
                <li>Your violation of applicable laws or regulations</li>
                <li>Content you provide through the Service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                11. Termination
              </h2>
              <h3 className="text-xl font-medium text-[var(--foreground-primary)] mb-3">
                11.1 Termination by You
              </h3>
              <p className="text-[var(--foreground-secondary)] mb-4">
                You may terminate your account at any time by contacting us or
                using the account deletion feature in your settings. Upon
                termination, your right to use the Service ceases immediately.
              </p>

              <h3 className="text-xl font-medium text-[var(--foreground-primary)] mb-3">
                11.2 Termination by Us
              </h3>
              <p className="text-[var(--foreground-secondary)] mb-4">
                We may terminate or suspend your account immediately if you:
              </p>
              <ul className="list-disc pl-6 text-[var(--foreground-secondary)] mb-4">
                <li>Violate these Terms</li>
                <li>Engage in fraudulent or illegal activities</li>
                <li>Fail to pay required fees (if applicable)</li>
                <li>Pose a security risk to our systems or other users</li>
              </ul>

              <h3 className="text-xl font-medium text-[var(--foreground-primary)] mb-3">
                11.3 Effect of Termination
              </h3>
              <p className="text-[var(--foreground-secondary)] mb-4">
                Upon termination, we will delete your personal data in
                accordance with our Privacy Policy, except where we are required
                to retain it for legal or regulatory purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                12. Dispute Resolution
              </h2>
              <h3 className="text-xl font-medium text-[var(--foreground-primary)] mb-3">
                12.1 Governing Law
              </h3>
              <p className="text-[var(--foreground-secondary)] mb-4">
                These Terms are governed by the laws of Israel, without regard
                to conflict of law principles.
              </p>

              <h3 className="text-xl font-medium text-[var(--foreground-primary)] mb-3">
                12.2 Dispute Resolution Process
              </h3>
              <p className="text-[var(--foreground-secondary)] mb-4">
                Before pursuing legal action, you agree to:
              </p>
              <ul className="list-disc pl-6 text-[var(--foreground-secondary)] mb-4">
                <li>Contact us first to attempt informal resolution</li>
                <li>Participate in good faith negotiations</li>
                <li>Consider mediation if direct negotiation fails</li>
              </ul>

              <h3 className="text-xl font-medium text-[var(--foreground-primary)] mb-3">
                12.3 Jurisdiction
              </h3>
              <p className="text-[var(--foreground-secondary)] mb-4">
                Any legal action must be brought in the courts of Israel. You
                consent to the jurisdiction of such courts.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                13. General Provisions
              </h2>
              <h3 className="text-xl font-medium text-[var(--foreground-primary)] mb-3">
                13.1 Entire Agreement
              </h3>
              <p className="text-[var(--foreground-secondary)] mb-4">
                These Terms, together with our Privacy Policy, constitute the
                entire agreement between you and us.
              </p>

              <h3 className="text-xl font-medium text-[var(--foreground-primary)] mb-3">
                13.2 Severability
              </h3>
              <p className="text-[var(--foreground-secondary)] mb-4">
                If any provision of these Terms is found to be unenforceable,
                the remaining provisions will remain in full force and effect.
              </p>

              <h3 className="text-xl font-medium text-[var(--foreground-primary)] mb-3">
                13.3 Waiver
              </h3>
              <p className="text-[var(--foreground-secondary)] mb-4">
                Our failure to enforce any provision of these Terms does not
                constitute a waiver of that provision.
              </p>

              <h3 className="text-xl font-medium text-[var(--foreground-primary)] mb-3">
                13.4 Assignment
              </h3>
              <p className="text-[var(--foreground-secondary)] mb-4">
                You may not assign these Terms without our written consent. We
                may assign these Terms without your consent.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-[var(--foreground-primary)] mb-4">
                14. Contact Information
              </h2>
              <p className="text-[var(--foreground-secondary)] mb-4">
                If you have questions about these Terms, please contact us:
              </p>
              <div className="bg-[var(--background-primary)] p-4 rounded-lg border border-[var(--card-border)]">
                <p className="text-[var(--foreground-secondary)]">
                  <strong>Email:</strong> legal@perin.ai
                  <br />
                  <strong>Address:</strong> Perin AI, Timna 21, Tel Aviv, Israel
                  <br />
                  <strong>Support:</strong> hello@perin.ai
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
