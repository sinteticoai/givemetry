import Link from "next/link";
import { BarChart3 } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | GiveMetry",
  description: "Privacy Policy for GiveMetry - AI-powered donor analytics platform.",
};

const sections = [
  { id: "introduction", title: "Introduction" },
  { id: "information-collected", title: "Information We Collect" },
  { id: "information-use", title: "How We Use Your Information" },
  { id: "information-sharing", title: "Information Sharing" },
  { id: "data-retention", title: "Data Retention" },
  { id: "data-security", title: "Data Security" },
  { id: "your-rights", title: "Your Rights" },
  { id: "cookies", title: "Cookies and Tracking" },
  { id: "international", title: "International Transfers" },
  { id: "children", title: "Children's Privacy" },
  { id: "ccpa", title: "California Privacy Rights (CCPA)" },
  { id: "gdpr", title: "European Privacy Rights (GDPR)" },
  { id: "changes", title: "Changes to This Policy" },
  { id: "contact", title: "Contact Us" },
];

function SectionHeading({ number, title, id }: { number: string; title: string; id: string }) {
  return (
    <div id={id} className="flex items-baseline gap-3 mb-4 scroll-mt-24">
      <span className="text-2xl font-bold text-slate-400 dark:text-slate-500">{number}</span>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
    </div>
  );
}

function CalloutBox({ children, variant = "neutral" }: { children: React.ReactNode; variant?: "neutral" | "warning" }) {
  const styles = {
    neutral: "bg-slate-100 dark:bg-slate-800 border-l-4 border-slate-400 dark:border-slate-500",
    warning: "bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-400 dark:border-amber-500",
  };
  return (
    <div className={`${styles[variant]} p-4 rounded-r-lg my-4`}>
      {children}
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">GiveMetry<sup className="text-[0.6em] font-normal text-slate-400">™</sup></span><span className="font-light text-slate-400 dark:text-slate-500 ml-1">AI</span>
          </Link>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="text-sm text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
            >
              Request a Demo
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="lg:grid lg:grid-cols-[250px_1fr] lg:gap-12">
          {/* Table of Contents - Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 uppercase tracking-wide">
                Table of Contents
              </h3>
              <nav className="space-y-2">
                {sections.map((section, index) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block text-sm text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 py-1"
                  >
                    {index + 1}. {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
              Privacy Policy
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
              Last Updated: January 26, 2026
            </p>

            <CalloutBox variant="neutral">
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                By accessing or using GiveMetry, you agree to this Privacy Policy. If you do not agree with the terms of this Privacy Policy, please do not access the Service.
              </p>
            </CalloutBox>

            <div className="space-y-12 mt-12">
              {/* Section 1 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="1" title="Introduction" id="introduction" />
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Sintetico Inc. (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates GiveMetry (givemetry.com), an AI-powered donor analytics platform for nonprofit organizations. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
                </p>
              </section>

              {/* Section 2 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="2" title="Information We Collect" id="information-collected" />
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                  We collect several types of information to provide and improve our Service:
                </p>

                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Account Information</h3>
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2 mb-6">
                  <li>Name, email address, and phone number</li>
                  <li>Organization name and details</li>
                  <li>Billing and payment information</li>
                  <li>User role and permissions</li>
                </ul>

                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Constituent Data</h3>
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2 mb-6">
                  <li>Donor records uploaded via CSV or entered manually</li>
                  <li>Gift and donation history</li>
                  <li>Contact and interaction logs</li>
                  <li>Portfolio assignments and notes</li>
                </ul>

                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Usage Data</h3>
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
                  <li>Features accessed and actions taken</li>
                  <li>Device information and IP addresses</li>
                  <li>Browser type and operating system</li>
                  <li>Timestamps and session duration</li>
                </ul>
              </section>

              {/* Section 3 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="3" title="How We Use Your Information" id="information-use" />
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  We use the information we collect to:
                </p>
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
                  <li>Provide, operate, and maintain the Service</li>
                  <li>Generate lapse risk predictions and priority scores</li>
                  <li>Create AI-powered donor briefings and insights</li>
                  <li>Process payments and manage subscriptions</li>
                  <li>Send transactional emails and notifications</li>
                  <li>Provide customer support</li>
                  <li>Detect and prevent fraud or abuse</li>
                  <li>Improve and develop new features</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              {/* Section 4 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="4" title="Information Sharing" id="information-sharing" />
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  We may share your information with third-party service providers who assist us in operating the Service:
                </p>

                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Service Providers</h3>
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2 mb-4">
                  <li>Cloud infrastructure providers (Vercel, Railway)</li>
                  <li>Database services (PostgreSQL hosting)</li>
                  <li>Payment processors (Stripe)</li>
                  <li>AI services (Anthropic Claude API)</li>
                  <li>Email delivery services</li>
                  <li>Analytics providers</li>
                </ul>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  We may also disclose information when required by law, to protect our rights, or in connection with a business transfer or acquisition.
                </p>
              </section>

              {/* Section 5 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="5" title="Data Retention" id="data-retention" />
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
                  <li><strong>Account data:</strong> Retained while your account is active, plus 30 days after deletion</li>
                  <li><strong>Constituent data:</strong> Retained for the duration of your subscription, plus 30 days</li>
                  <li><strong>AI-generated briefings:</strong> Retained for 90 days by default</li>
                  <li><strong>Billing records:</strong> Retained for 7 years for legal compliance</li>
                  <li><strong>Usage logs:</strong> Retained for 12 months</li>
                </ul>
              </section>

              {/* Section 6 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="6" title="Data Security" id="data-security" />
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  We implement industry-standard security measures to protect your data:
                </p>
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2 mb-4">
                  <li>Encryption in transit (TLS) and at rest</li>
                  <li>Multi-tenant data isolation at the database level</li>
                  <li>Role-based access controls</li>
                  <li>Regular security audits</li>
                  <li>Secure authentication with JWT tokens</li>
                </ul>
                <CalloutBox variant="warning">
                  <p className="text-amber-800 dark:text-amber-200 text-sm">
                    While we strive to protect your information, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
                  </p>
                </CalloutBox>
              </section>

              {/* Section 7 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="7" title="Your Rights" id="your-rights" />
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  Depending on your jurisdiction, you may have the right to:
                </p>
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2 mb-4">
                  <li>Access your personal data</li>
                  <li>Correct inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Export your data in a portable format</li>
                  <li>Opt out of marketing communications</li>
                  <li>Restrict certain processing activities</li>
                </ul>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  To exercise these rights, contact us at <a href="mailto:privacy@sintetico.ai" className="text-emerald-600 dark:text-emerald-400 hover:underline">privacy@sintetico.ai</a>.
                </p>
              </section>

              {/* Section 8 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="8" title="Cookies and Tracking" id="cookies" />
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  We use essential cookies for authentication and session management. We may use analytics cookies to understand how users interact with our Service. You can control cookie preferences through your browser settings.
                </p>
              </section>

              {/* Section 9 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="9" title="International Transfers" id="international" />
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
                </p>
              </section>

              {/* Section 10 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="10" title="Children's Privacy" id="children" />
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  GiveMetry is not intended for individuals under 18 years of age. We do not knowingly collect personal information from children under 18.
                </p>
              </section>

              {/* Section 11 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="11" title="California Privacy Rights (CCPA)" id="ccpa" />
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  California residents have additional rights under the CCPA, including the right to know what personal information is collected, request deletion, and opt out of the sale of personal information. We do not sell personal information.
                </p>
              </section>

              {/* Section 12 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="12" title="European Privacy Rights (GDPR)" id="gdpr" />
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  If you are in the European Economic Area, you have rights under the GDPR including access, rectification, erasure, restriction, portability, and objection. Our legal basis for processing includes contract performance, legitimate interests, and consent where applicable.
                </p>
              </section>

              {/* Section 13 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="13" title="Changes to This Policy" id="changes" />
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the &quot;Last Updated&quot; date. Your continued use of the Service after changes constitutes acceptance of the updated policy.
                </p>
              </section>

              {/* Section 14 */}
              <section className="pb-8">
                <SectionHeading number="14" title="Contact Us" id="contact" />
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  If you have questions about this Privacy Policy, please contact us:
                </p>
                <CalloutBox variant="neutral">
                  <ul className="text-slate-600 dark:text-slate-300 space-y-2 text-sm">
                    <li><strong>Email:</strong> <a href="mailto:privacy@sintetico.ai" className="text-emerald-600 dark:text-emerald-400 hover:underline">privacy@sintetico.ai</a></li>
                    <li><strong>DPO:</strong> <a href="mailto:dpo@sintetico.ai" className="text-emerald-600 dark:text-emerald-400 hover:underline">dpo@sintetico.ai</a></li>
                    <li><strong>Address:</strong> 21 SE 1st Ave. Suite 300, Miami, FL 33133</li>
                  </ul>
                </CalloutBox>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t dark:border-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Footer Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold dark:text-white">GiveMetry<sup className="text-[0.6em] font-normal text-slate-400">™</sup></span><span className="font-light text-slate-400 dark:text-slate-500 ml-1">AI</span>
              </Link>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                AI-powered donor analytics for nonprofit gift officers.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><Link href="/#features" className="hover:text-emerald-600 dark:hover:text-emerald-400">Features</Link></li>
                <li><Link href="/#benchmarks" className="hover:text-emerald-600 dark:hover:text-emerald-400">Benchmarks</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><Link href="/about" className="hover:text-emerald-600 dark:hover:text-emerald-400">About</Link></li>
                <li><a href="mailto:hello@sintetico.ai" className="hover:text-emerald-600 dark:hover:text-emerald-400">Contact Us</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><Link href="/privacy" className="hover:text-emerald-600 dark:hover:text-emerald-400">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-emerald-600 dark:hover:text-emerald-400">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t dark:border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              A Sintetico Labs Product · © 2026 Sintetico Inc.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              21 SE 1st Ave. Suite 300, Miami, FL 33133
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
