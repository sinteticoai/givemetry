// Marketing landing page
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  BarChart3,
  Brain,
  FileText,
  Shield,
  TrendingUp,
  Users,
  Zap,
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
      <nav className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold dark:text-white">GiveMetry<sup className="text-[0.6em] font-normal text-slate-400">™</sup></span><span className="text-xl font-light text-slate-400 dark:text-slate-500 ml-1">AI</span>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button>Request a Demo</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-lg sm:text-xl font-medium text-slate-600 dark:text-slate-400 mb-8">
            AI-Powered Advancement Intelligence
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
            Know who to call.
            <br />
            <span className="text-emerald-600 dark:text-emerald-400">Know what to say.</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto mb-10">
            GiveMetry transforms your donor data into actionable intelligence.
            Stop guessing. Start prioritizing. Raise more with the team you have.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="text-lg px-8 py-6">
                Request a Demo
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                See How It Works
              </Button>
            </Link>
          </div>
          <p className="text-sm text-slate-500 mt-6">
            No CRM replacement required. Works with your existing data.
          </p>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">
              Your data is working against you
            </h2>
            <p className="text-lg text-slate-300 mb-12">
              Gift officers manage 150+ prospects with no systematic way to know who to call.
              Wealth screenings sit untouched. Opportunities slip away.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-400 mb-2">46%</div>
              <p className="text-slate-300">of gift officers plan to leave within 2 years</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-400 mb-2">40%</div>
              <p className="text-slate-300">of advancement time spent on manual reports</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-400 mb-2">62%</div>
              <p className="text-slate-300">decline in alumni giving since the 1980s</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Intelligence that drives results
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              GiveMetry answers the question advancement leaders ask daily:
              &ldquo;Who should we focus on, and what should we do next?&rdquo;
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<TrendingUp className="w-6 h-6" />}
              title="Lapse Risk Predictions"
              description="Identify donors at risk of lapsing before it's too late. Intervene proactively with AI-powered alerts."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Smart Prioritization"
              description="Know exactly which 5 donors your gift officers should call tomorrow. No more guesswork."
            />
            <FeatureCard
              icon={<FileText className="w-6 h-6" />}
              title="AI Donor Briefs"
              description="Generate comprehensive donor briefs before every meeting. Everything you need to know, instantly."
            />
            <FeatureCard
              icon={<Brain className="w-6 h-6" />}
              title="Natural Language Queries"
              description="Ask questions in plain English. &ldquo;Show me lapsed donors from the class of 2005 who gave over $1,000.&rdquo;"
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Data Health Dashboard"
              description="See the quality and completeness of your CRM data at a glance. Prioritize cleanup efforts."
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Enterprise Security"
              description="SOC 2 compliant. Role-based access. Your donor data stays safe and private."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-slate-50 dark:bg-slate-800/50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Get started in minutes
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              No complex integration required. No CRM replacement.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <StepCard
              number="1"
              title="Upload Your Data"
              description="Export a CSV from your existing CRM. Blackbaud, Salesforce, or any system."
            />
            <StepCard
              number="2"
              title="Get Your Assessment"
              description="Within minutes, see your data health score and AI-powered insights."
            />
            <StepCard
              number="3"
              title="Start Prioritizing"
              description="Know exactly who to call, who's at risk, and where to focus your team."
            />
          </div>
        </div>
      </section>

      {/* Industry Benchmarks */}
      <section id="benchmarks" className="py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-3">
              BUILT ON RESEARCH
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              40 years of advancement data
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              GiveMetry&apos;s models are trained on industry benchmarks from CASE, RNL, and decades of giving patterns.
            </p>
          </div>

          {/* Historical Decline - Before/After Design */}
          <div className="bg-slate-900 dark:bg-slate-800 rounded-2xl p-8 mb-8">
            <h3 className="text-xl font-semibold text-white text-center mb-6">
              The Participation Crisis
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
              Alumni giving rates have declined dramatically. Advancement offices need smarter tools to reverse this trend.
            </p>

            <p className="text-xs text-slate-400 mt-4 text-center">
              Source: CASE VSE Survey 2023-24
            </p>
          </div>

          {/* Participation by School Size */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <BenchmarkCard
              size="Small Institutions"
              description="< 3,000 students"
              rate="14.2%"
              topQuartile="22.5%"
              avgGift="$285"
              colorClass="emerald"
              examples="Liberal Arts Colleges"
            />
            <BenchmarkCard
              size="Medium Institutions"
              description="3,000 - 10,000 students"
              rate="8.4%"
              topQuartile="14.8%"
              avgGift="$425"
              colorClass="amber"
              examples="Regional Universities"
            />
            <BenchmarkCard
              size="Large Institutions"
              description="> 10,000 students"
              rate="5.8%"
              topQuartile="9.2%"
              avgGift="$680"
              colorClass="red"
              examples="Research Universities"
            />
          </div>

          {/* Donor Lifecycle Insight */}
          <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20 rounded-2xl p-8 border border-violet-200 dark:border-violet-800">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="md:w-2/3">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  The &ldquo;Valley&rdquo; Problem
                </h3>
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  Alumni giving drops to just <strong>6-7%</strong> during years 6-15 after graduation —
                  the &ldquo;valley&rdquo; where most donor pipeline attrition occurs. But those who stay engaged
                  through this period become your <strong>20x higher-value</strong> major gift prospects at peak giving years (30-50).
                </p>
                <p className="text-sm text-slate-500">
                  GiveMetry identifies at-risk donors before they enter the valley, so you can maintain engagement
                  through non-monetary touchpoints.
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

      {/* Testimonial / Value Prop */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl p-12">
            <blockquote className="text-2xl sm:text-3xl font-medium text-slate-900 dark:text-white mb-8">
              &ldquo;We have plenty of data. We have wealth screenings from three years ago we haven&apos;t touched.
              I don&apos;t need more data; I need to know which 5 people my gift officer should call tomorrow.&rdquo;
            </blockquote>
            <p className="text-slate-600 dark:text-slate-400">
              — Director of Research, Private University
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 bg-slate-900 text-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                An intelligence layer, not another platform
              </h2>
              <p className="text-lg text-slate-300 mb-8">
                GiveMetry works alongside your existing CRM. No rip-and-replace.
                No two-year procurement battle. Just better intelligence from data you already have.
              </p>
              <ul className="space-y-4">
                <BenefitItem text="Works with Blackbaud, Salesforce, and others" />
                <BenefitItem text="No data migration required" />
                <BenefitItem text="Up and running in days, not months" />
                <BenefitItem text="Explainable AI you can trust" />
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800 rounded-2xl p-6">
                <div className="text-3xl font-bold text-emerald-400 mb-2">5x</div>
                <p className="text-slate-300 text-sm">more cost-effective to retain donors than acquire new ones</p>
              </div>
              <div className="bg-slate-800 rounded-2xl p-6">
                <div className="text-3xl font-bold text-emerald-400 mb-2">2 hrs</div>
                <p className="text-slate-300 text-sm">saved per gift officer per week on meeting prep</p>
              </div>
              <div className="bg-slate-800 rounded-2xl p-6">
                <div className="text-3xl font-bold text-emerald-400 mb-2">34%</div>
                <p className="text-slate-300 text-sm">improvement in engagement tracking</p>
              </div>
              <div className="bg-slate-800 rounded-2xl p-6">
                <div className="text-3xl font-bold text-emerald-400 mb-2">15min</div>
                <p className="text-slate-300 text-sm">from upload to first insights</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-6">
            Ready to transform your advancement office?
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-10">
            Start with a data health assessment. See where you stand, who&apos;s at risk,
            and who to prioritize — in minutes, not months.
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
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold dark:text-white">GiveMetry<sup className="text-[0.6em] font-normal text-slate-400">™</sup></span><span className="font-light text-slate-400 dark:text-slate-500 ml-1">AI</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                AI-powered donor analytics for nonprofit gift officers.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><a href="#features" className="hover:text-emerald-600 dark:hover:text-emerald-400">Features</a></li>
                <li><a href="#benchmarks" className="hover:text-emerald-600 dark:hover:text-emerald-400">Benchmarks</a></li>
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

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border dark:border-slate-700 hover:shadow-md transition-shadow">
      <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">{title}</h3>
      <p className="text-slate-600 dark:text-slate-300">{description}</p>
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
      <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-6">
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
  examples,
}: {
  size: string;
  description: string;
  rate: string;
  topQuartile: string;
  avgGift: string;
  colorClass: "emerald" | "amber" | "red";
  examples: string;
}) {
  const colorStyles = {
    emerald: {
      badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
      rate: "text-emerald-600 dark:text-emerald-400",
    },
    amber: {
      badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
      rate: "text-amber-600 dark:text-amber-400",
    },
    red: {
      badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
      rate: "text-red-600 dark:text-red-400",
    },
  };

  const styles = colorStyles[colorClass];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-semibold text-slate-900 dark:text-white">{size}</h4>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${styles.badge}`}>
          {examples}
        </span>
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
