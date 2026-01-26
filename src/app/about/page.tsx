import Link from "next/link";
import { BarChart3, Mic } from "lucide-react";

export const metadata = {
  title: "About | GiveMetry",
  description: "Learn about Sintetico and our AI-powered products for businesses.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">GiveMetry<sup className="text-[0.6em] font-normal text-slate-400">™</sup></span><span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">AI</span>
          </Link>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="text-sm text-slate-600 dark:text-slate-300 hover:text-emerald-400 dark:hover:text-emerald-400"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-emerald-400 text-white px-4 py-2 rounded-lg hover:bg-emerald-500"
            >
              Request a Demo
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white text-center mb-8">
          About Sintetico
        </h1>

        <p className="text-lg text-slate-600 dark:text-slate-300 text-center mb-16 max-w-2xl mx-auto">
          Sintetico builds AI technology that works for everyone — from individuals to small businesses to enterprise customers. GiveMetry is a Sintetico product.
        </p>

        {/* Three Pillars */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Our Mission</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              To democratize AI technology, making powerful tools accessible to organizations of all sizes — not just those with enterprise budgets.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Our Focus</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Strategically leveraging AI technology to deploy solutions that deliver immediate, actionable benefits for our customers — not experiments, but real results.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Our Approach</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              We are an AI-first organization, built from the ground up to maximize what AI has to offer — bringing powerful solutions directly into the hands of consumers and businesses.
            </p>
          </div>
        </div>

        {/* Products Section */}
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-8">
          Our Products
        </h2>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border dark:border-slate-700">
            <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">GiveMetry<sup className="text-[0.6em] font-normal text-slate-400">™</sup> <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">AI</span></h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              AI-powered donor analytics for nonprofit gift officers. Predict lapse risk, prioritize outreach, and generate AI briefings to strengthen donor relationships.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border dark:border-slate-700">
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
              <Mic className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Converza</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              AI voice receptionist that handles calls 24/7 for home service businesses. Automatic appointment booking, call transcription, and smart routing.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Transform your donor relationships with AI-powered analytics.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-emerald-400 text-white px-6 py-3 rounded-lg hover:bg-emerald-500 font-medium"
            >
              Contact Us
            </Link>
            <a
              href="mailto:hello@sintetico.ai"
              className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-6 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 font-medium border dark:border-slate-600"
            >
              Contact Us
            </a>
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
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                </div>
                <span className="font-bold dark:text-white">GiveMetry<sup className="text-[0.6em] font-normal text-slate-400">™</sup></span><span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">AI</span>
              </Link>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                AI-powered donor analytics for nonprofit gift officers.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><Link href="/#features" className="hover:text-emerald-400 dark:hover:text-emerald-400">Features</Link></li>
                <li><Link href="/#benchmarks" className="hover:text-emerald-400 dark:hover:text-emerald-400">Benchmarks</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><Link href="/about" className="hover:text-emerald-400 dark:hover:text-emerald-400">About</Link></li>
                <li><a href="mailto:hello@sintetico.ai" className="hover:text-emerald-400 dark:hover:text-emerald-400">Contact Us</a></li>
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
