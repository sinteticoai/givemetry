import Link from "next/link";
import { BarChart3 } from "lucide-react";

export const metadata = {
  title: "Terms of Service | GiveMetry",
  description: "Terms of Service for GiveMetry - AI-powered donor analytics platform.",
};

const sections = [
  { id: "agreement", title: "Agreement to Terms" },
  { id: "service", title: "Service Description" },
  { id: "registration", title: "Account Registration" },
  { id: "billing", title: "Subscription and Billing" },
  { id: "acceptable-use", title: "Acceptable Use Policy" },
  { id: "ip", title: "Intellectual Property" },
  { id: "privacy", title: "Data Protection and Privacy" },
  { id: "ai", title: "AI-Generated Content" },
  { id: "availability", title: "Service Availability" },
  { id: "warranties", title: "Disclaimer of Warranties" },
  { id: "liability", title: "Limitation of Liability" },
  { id: "indemnification", title: "Indemnification" },
  { id: "termination", title: "Termination" },
  { id: "changes", title: "Changes to Terms" },
  { id: "governing-law", title: "Governing Law" },
  { id: "general", title: "General Provisions" },
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

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">GiveMetry<sup className="text-[0.5em] font-normal">™</sup></span>
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
              Terms of Service
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
              Last Updated: January 26, 2026
            </p>

            <CalloutBox variant="neutral">
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                By accessing or using the Service, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use the Service.
              </p>
            </CalloutBox>

            <div className="space-y-12 mt-12">
              {/* Section 1 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="1" title="Agreement to Terms" id="agreement" />
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you and Sintetico Inc., a Delaware corporation (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), governing your access to and use of GiveMetry (the &quot;Service&quot;), including our website, applications, and related services.
                </p>
              </section>

              {/* Section 2 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="2" title="Service Description" id="service" />
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  GiveMetry is an AI-powered donor analytics platform for nonprofit organizations. The Service includes:
                </p>
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
                  <li>Constituent and donor record management</li>
                  <li>Gift and donation history tracking</li>
                  <li>Lapse risk prediction and priority scoring</li>
                  <li>AI-generated donor briefings and insights</li>
                  <li>Portfolio management for gift officers</li>
                  <li>Contact and interaction logging</li>
                  <li>CSV data import and export</li>
                  <li>Alert and notification systems</li>
                </ul>
              </section>

              {/* Section 3 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="3" title="Account Registration" id="registration" />
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  To use the Service, you must create an account. You agree to:
                </p>
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2 mb-4">
                  <li>Provide accurate, current, and complete information</li>
                  <li>Maintain the security of your login credentials</li>
                  <li>Promptly update any changes to your information</li>
                  <li>Accept responsibility for all activities under your account</li>
                  <li>Notify us immediately of any unauthorized access</li>
                </ul>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  You must be at least 18 years old and have the authority to bind your organization to these Terms.
                </p>
              </section>

              {/* Section 4 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="4" title="Subscription and Billing" id="billing" />
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
                  <li><strong>Billing Cycle:</strong> Subscriptions are billed monthly in advance</li>
                  <li><strong>Payment:</strong> You authorize us to charge your payment method on file</li>
                  <li><strong>Price Changes:</strong> We will provide 30 days&apos; notice of pricing changes</li>
                  <li><strong>Refunds:</strong> Subscription fees are non-refundable except as required by law</li>
                  <li><strong>Cancellation:</strong> You may cancel at any time; access continues until the end of the billing period</li>
                  <li><strong>Overages:</strong> Usage exceeding plan limits may incur additional charges</li>
                </ul>
              </section>

              {/* Section 5 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="5" title="Acceptable Use Policy" id="acceptable-use" />
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  You agree not to use the Service to:
                </p>
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
                  <li>Violate any applicable laws or regulations</li>
                  <li>Upload data you do not have the right to use or share</li>
                  <li>Infringe on intellectual property rights</li>
                  <li>Transmit malware, viruses, or harmful code</li>
                  <li>Attempt to gain unauthorized access to systems</li>
                  <li>Interfere with or disrupt the Service</li>
                  <li>Resell or redistribute the Service without authorization</li>
                  <li>Use the Service for any illegal or fraudulent purpose</li>
                  <li>Harass, abuse, or harm others</li>
                </ul>
              </section>

              {/* Section 6 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="6" title="Intellectual Property" id="ip" />
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Our Property</h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  The Service, including all software, designs, text, graphics, and other content, is owned by Sintetico Inc. and protected by intellectual property laws. We grant you a limited, non-exclusive, non-transferable license to use the Service during your subscription.
                </p>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Your Content</h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  You retain ownership of all data and content you upload to the Service. You grant us a limited license to process, store, and display your content solely to provide the Service.
                </p>
              </section>

              {/* Section 7 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="7" title="Data Protection and Privacy" id="privacy" />
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  Our collection and use of personal information is governed by our <Link href="/privacy" className="text-emerald-600 dark:text-emerald-400 hover:underline">Privacy Policy</Link>, which is incorporated into these Terms by reference.
                </p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  You are responsible for ensuring that you have appropriate consent and legal basis to upload constituent data to the Service, and that your use of the Service complies with applicable data protection laws.
                </p>
              </section>

              {/* Section 8 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="8" title="AI-Generated Content" id="ai" />
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  The Service uses artificial intelligence to generate insights, predictions, and briefings. AI-generated content is provided for informational purposes only and should not be the sole basis for donor engagement decisions. We do not guarantee the accuracy or completeness of AI-generated content, and you should use your own judgment when acting on such information.
                </p>
              </section>

              {/* Section 9 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="9" title="Service Availability" id="availability" />
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  We strive to maintain high availability but do not guarantee uninterrupted access to the Service. We may perform maintenance, updates, or experience outages. We are not liable for any loss or damage resulting from Service interruptions.
                </p>
              </section>

              {/* Section 10 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="10" title="Disclaimer of Warranties" id="warranties" />
                <CalloutBox variant="warning">
                  <p className="text-amber-800 dark:text-amber-200 text-sm uppercase font-medium">
                    THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE ERROR-FREE, SECURE, OR UNINTERRUPTED.
                  </p>
                </CalloutBox>
              </section>

              {/* Section 11 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="11" title="Limitation of Liability" id="liability" />
                <CalloutBox variant="warning">
                  <p className="text-amber-800 dark:text-amber-200 text-sm uppercase font-medium">
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, SINTETICO INC. SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE MONTHS PRECEDING THE CLAIM.
                  </p>
                </CalloutBox>
              </section>

              {/* Section 12 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="12" title="Indemnification" id="indemnification" />
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  You agree to indemnify, defend, and hold harmless Sintetico Inc. and its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including reasonable attorneys&apos; fees) arising from your use of the Service, violation of these Terms, or infringement of any third-party rights.
                </p>
              </section>

              {/* Section 13 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="13" title="Termination" id="termination" />
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  We may suspend or terminate your access to the Service at any time for violation of these Terms or for any other reason with notice. Upon termination:
                </p>
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
                  <li>Your right to use the Service immediately ceases</li>
                  <li>You may request export of your data within 30 days</li>
                  <li>We may delete your data after 30 days</li>
                  <li>Provisions that should survive termination will remain in effect</li>
                </ul>
              </section>

              {/* Section 14 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="14" title="Changes to Terms" id="changes" />
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  We may modify these Terms at any time. We will notify you of material changes by posting the updated Terms and updating the &quot;Last Updated&quot; date. Your continued use of the Service after changes constitutes acceptance of the modified Terms.
                </p>
              </section>

              {/* Section 15 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="15" title="Governing Law" id="governing-law" />
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to conflict of law principles. Any disputes arising from these Terms shall be resolved in the state or federal courts located in Delaware.
                </p>
              </section>

              {/* Section 16 */}
              <section className="border-b dark:border-slate-800 pb-8">
                <SectionHeading number="16" title="General Provisions" id="general" />
                <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
                  <li><strong>Entire Agreement:</strong> These Terms constitute the entire agreement between you and us regarding the Service</li>
                  <li><strong>Severability:</strong> If any provision is found unenforceable, the remaining provisions remain in effect</li>
                  <li><strong>Waiver:</strong> Failure to enforce any right does not waive that right</li>
                  <li><strong>Assignment:</strong> You may not assign these Terms without our consent; we may assign freely</li>
                  <li><strong>Force Majeure:</strong> We are not liable for failures due to circumstances beyond our control</li>
                </ul>
              </section>

              {/* Section 17 */}
              <section className="pb-8">
                <SectionHeading number="17" title="Contact Us" id="contact" />
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  If you have questions about these Terms, please contact us:
                </p>
                <CalloutBox variant="neutral">
                  <ul className="text-slate-600 dark:text-slate-300 space-y-2 text-sm">
                    <li><strong>Email:</strong> <a href="mailto:legal@sintetico.ai" className="text-emerald-600 dark:text-emerald-400 hover:underline">legal@sintetico.ai</a></li>
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
                <span className="font-bold dark:text-white">GiveMetry<sup className="text-[0.5em] font-normal">™</sup></span>
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
