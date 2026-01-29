// Marketing landing page
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import {
  BarChart3,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default async function HomePage() {
  const session = await auth();

  // Redirect authenticated users to dashboard
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 max-w-screen-2xl mx-auto">
      {/* Navigation */}
      <LandingNavbar />

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-lg sm:text-xl font-medium text-slate-600 dark:text-slate-400 mb-8">
            AI-Powered Advancement Intelligence
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
            Just ask.
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto mb-10">
            Talk to your donor data in plain English. Get instant answers.<br />
            No reports. No SQL. No waiting on IT.
          </p>

          {/* Example Queries */}
          <div className="max-w-2xl mx-auto mb-10">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border dark:border-slate-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
              </div>
              <div className="space-y-3 text-left">
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg px-4 py-3">
                  <p className="text-slate-700 dark:text-slate-300 font-medium">&ldquo;Who should I call this week?&rdquo;</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg px-4 py-3">
                  <p className="text-slate-700 dark:text-slate-300 font-medium">&ldquo;Which donors are at risk of lapsing?&rdquo;</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg px-4 py-3">
                  <p className="text-slate-700 dark:text-slate-300 font-medium">&ldquo;Show me Engineering alumni who gave $10K+ but haven&apos;t been contacted in 6 months&rdquo;</p>
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 text-center">
                Answers in seconds. Always accurate. Always explainable.
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <Link href="/signup">
              <Button size="lg" className="text-lg px-8 py-6">
                Request a Demo
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
          <p className="text-sm text-slate-500 mt-6">
            No CRM replacement required. Works with your existing data.
          </p>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">
              Your data has answers. You just can&apos;t get to them.
            </h2>
            <p className="text-lg text-slate-300">
              Gift officers manage 150+ prospects but can&apos;t ask simple questions without
              waiting days for IT reports. Wealth screenings sit untouched. Opportunities slip away.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Ask anything about your donors
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Every question gets an instant, accurate answer — powered by AI that understands your data.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <QueryCard
              question="Who's at risk of lapsing?"
              answer="Get a prioritized list of donors showing signs of disengagement, with specific reasons why and recommended actions to retain them."
            />
            <QueryCard
              question="Who should I call this week?"
              answer="Your top 5 priorities based on capacity, engagement, timing, and likelihood to give — updated daily."
            />
            <QueryCard
              question="Prepare me for my meeting with Dr. Chen"
              answer="A complete donor brief: giving history, past conversations, interests, connections, and talking points — generated in seconds."
            />
            <QueryCard
              question="Show me Engineering alumni who gave $10K+ but haven't been contacted"
              answer="Instantly filter and segment your database with plain English. No SQL. No report requests."
            />
            <QueryCard
              question="How healthy is our data?"
              answer="See completeness, freshness, and quality scores across your CRM. Know exactly where to focus cleanup efforts."
            />
            <QueryCard
              question="What happened with my portfolio this quarter?"
              answer="Track meetings, asks, and gifts closed. See what's working and where to adjust — all in one view."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-slate-50 dark:bg-slate-800/50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              From data to answers in minutes
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              No complex integration. No training. Just ask.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <StepCard
              number="1"
              title="Connect Your Data"
              description="From Blackbaud, Salesforce, or any CRM — we connect to your system."
            />
            <StepCard
              number="2"
              title="Ask Your First Question"
              description="Type a question in plain English. No training required."
            />
            <StepCard
              number="3"
              title="Get Instant Answers"
              description="Prioritized lists, donor briefs, lapse risks — answers in seconds."
            />
          </div>
        </div>
      </section>

      {/* Industry Benchmarks */}
      <section id="benchmarks" className="py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
              THE REALITY
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              The participation crisis is real
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Giving has collapsed 62% since the 1980s. Your donors are at risk. GiveMetry helps you find them before they&apos;re gone.
            </p>
          </div>

          {/* Historical Decline - Before/After Design */}
          <div className="bg-slate-900 dark:bg-slate-800 rounded-2xl p-8 mb-8">
            <p className="text-slate-400 text-sm text-center mb-2">&ldquo;Why is giving declining?&rdquo;</p>
            <h3 className="text-xl font-semibold text-white text-center mb-6">
              GiveMetry understands the participation crisis
            </h3>

            {/* Before / After Comparison */}
            <div className="flex items-center justify-center gap-4 sm:gap-8 mb-6">
              {/* 1980s */}
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-semibold text-emerald-400">20%</div>
                <div className="text-slate-400 text-sm mt-1">1980s</div>
              </div>

              {/* Arrow with decline */}
              <div className="flex flex-col items-center px-2 sm:px-4">
                <div className="text-5xl sm:text-6xl md:text-7xl font-bold text-red-400">-62%</div>
                <svg className="w-12 sm:w-20 h-6 text-slate-600" viewBox="0 0 80 24" fill="none">
                  <path d="M0 12h72M72 12l-8-8M72 12l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* 2023 */}
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-semibold text-red-400">7.7%</div>
                <div className="text-slate-400 text-sm mt-1">2023</div>
              </div>
            </div>

            {/* Gradient decline bar */}
            <div className="max-w-md mx-auto mb-4">
              <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500" />
            </div>

            <p className="text-slate-400 text-sm text-center max-w-lg mx-auto">
              When you ask about trends, GiveMetry contextualizes your data against 40 years of industry patterns.
            </p>

            <p className="text-xs text-slate-400 mt-4 text-center">
              Source: CASE VSE Survey 2023-24
            </p>
          </div>

          {/* Participation by School Size */}
          <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-4">How do you compare to similar schools?</p>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <BenchmarkCard
              size="Small Institutions"
              description="< 3,000 students"
              rate="14.2%"
              topQuartile="22.5%"
              avgGift="$285"
              colorClass="emerald"
            />
            <BenchmarkCard
              size="Medium Institutions"
              description="3,000 - 10,000 students"
              rate="8.4%"
              topQuartile="14.8%"
              avgGift="$425"
              colorClass="amber"
            />
            <BenchmarkCard
              size="Large Institutions"
              description="> 10,000 students"
              rate="5.8%"
              topQuartile="9.2%"
              avgGift="$680"
              colorClass="rose"
            />
          </div>

          {/* Donor Lifecycle Insight */}
          <div className="bg-[#f8fafc] dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="md:w-2/3">
                <p className="text-slate-500 text-sm mb-2">&ldquo;Who&apos;s at risk of lapsing?&rdquo;</p>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  GiveMetry understands the &ldquo;Valley&rdquo; Problem
                </h3>
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  Alumni giving drops to just <strong>6-7%</strong> during years 6-15 after graduation —
                  the &ldquo;valley&rdquo; where most donor pipeline attrition occurs. But those who stay engaged
                  through this period become your <strong>20x higher-value</strong> major gift prospects at peak giving years (30-50).
                </p>
                <p className="text-sm text-slate-500">
                  Ask &ldquo;Who&apos;s at risk?&rdquo; and GiveMetry finds donors approaching the valley — before it&apos;s too late.
                </p>
              </div>
              <div className="md:w-1/3 flex justify-center">
                {/* Simple lifecycle curve visualization */}
                <div className="relative w-full max-w-xs">
                  <svg viewBox="0 0 200 100" className="w-full h-auto">
                    <defs>
                      <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="50%" stopColor="#ef4444" />
                        <stop offset="100%" stopColor="#22c55e" />
                      </linearGradient>
                    </defs>
                    {/* Curve path representing the lifecycle */}
                    <path
                      d="M 10 30 Q 30 20, 50 70 Q 80 90, 110 60 Q 140 30, 170 15 Q 185 10, 195 20"
                      fill="none"
                      stroke="url(#curveGradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    {/* Labels */}
                    <text x="30" y="95" className="text-[8px] fill-slate-500">Young Alumni</text>
                    <text x="85" y="95" className="text-[8px] fill-red-400 font-medium">The Valley</text>
                    <text x="155" y="95" className="text-[8px] fill-slate-500">Peak Giving</text>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-slate-500 mt-8">
            Data sources: CASE VSE Survey 2023-24, U.S. News & World Report, RNL Analysis, Hanover Research
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 bg-slate-900 text-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Your data. Any CRM. Just ask.
            </h2>
            <p className="text-lg text-slate-300 mb-8">
              Your data lives in Blackbaud. Or Salesforce. Or spreadsheets.
              It doesn&apos;t matter — just ask, and GiveMetry connects the dots.
            </p>
            <ul className="space-y-4 text-left inline-block">
              <BenefitItem text="Connects to Blackbaud, Salesforce, or any CRM" />
              <BenefitItem text="Ask questions across all your donor data" />
              <BenefitItem text="First answers in seconds, not hours" />
              <BenefitItem text="Every answer is explainable and auditable" />
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-6">
            Ready to start asking?
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-10">
            See what your donor data can tell you — in minutes, not months.
          </p>
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8 py-6">
              Request a Demo
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t dark:border-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Footer Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                </div>
                <span className="font-[family-name:var(--font-inter)] text-2xl font-bold tracking-tight dark:text-white">GiveMetry</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                AI-powered donor analytics for nonprofit gift officers.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><a href="#features" className="hover:text-emerald-400 dark:hover:text-emerald-400">Features</a></li>
                <li><a href="#benchmarks" className="hover:text-emerald-400 dark:hover:text-emerald-400">Benchmarks</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><Link href="/about" className="hover:text-emerald-400 dark:hover:text-emerald-400">About</Link></li>
                <li><Link href="/signup" className="hover:text-emerald-400 dark:hover:text-emerald-400">Contact Us</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><Link href="/privacy" className="hover:text-emerald-400 dark:hover:text-emerald-400">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-emerald-400 dark:hover:text-emerald-400">Terms of Service</Link></li>
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

function QueryCard({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border dark:border-slate-700 hover:shadow-md transition-shadow">
      <p className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        &ldquo;{question}&rdquo;
      </p>
      <p className="text-slate-600 dark:text-slate-300">{answer}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-6">
        {number}
      </div>
      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">{title}</h3>
      <p className="text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  );
}

function BenefitItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3">
      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
      <span>{text}</span>
    </li>
  );
}

function BenchmarkCard({
  size,
  description,
  rate,
  topQuartile,
  avgGift,
  colorClass,
}: {
  size: string;
  description: string;
  rate: string;
  topQuartile: string;
  avgGift: string;
  colorClass: "emerald" | "amber" | "rose";
}) {
  const colorStyles = {
    emerald: {
      rate: "text-emerald-400 dark:text-emerald-400",
    },
    amber: {
      rate: "text-amber-600 dark:text-amber-400",
    },
    rose: {
      rate: "text-rose-400 dark:text-rose-400",
    },
  };

  const styles = colorStyles[colorClass];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
      <div className="mb-4">
        <h4 className="font-semibold text-slate-900 dark:text-white">{size}</h4>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <div className={`text-4xl font-bold ${styles.rate} mb-1`}>
        {rate}
      </div>
      <p className="text-sm text-slate-500 mb-4">avg participation rate</p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
          <p className="text-slate-500 text-xs">Top Quartile</p>
          <p className="font-semibold text-slate-900 dark:text-white">{topQuartile}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
          <p className="text-slate-500 text-xs">Avg Gift</p>
          <p className="font-semibold text-slate-900 dark:text-white">{avgGift}</p>
        </div>
      </div>
    </div>
  );
}
