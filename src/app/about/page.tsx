import Link from "next/link";
import { BarChart3, Lightbulb, Phone, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingNavbar } from "@/components/landing/landing-navbar";

export const metadata = {
  title: "About | GiveMetry",
  description: "Learn about Sintetico and our AI-powered products for businesses.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <LandingNavbar />

      {/* Main Content */}
      <main className="w-full px-6 py-16">
        <div className="max-w-5xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-20">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              About Sintetico
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Sintetico is an AI-First company building intelligent solutions that work for
              everyone — from individuals to small businesses to enterprise customers. We create
              products that maximize the power of AI and deliver real value without complexity or
              prohibitive costs.
            </p>
          </div>

          {/* Three Pillars */}
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            <div className="p-6 rounded-xl border border-border bg-muted/30">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Our Mission</h3>
              <p className="text-muted-foreground leading-relaxed">
                To democratize AI technology, making truly powerful tools accessible to businesses of all sizes — not just those with enterprise budgets.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-muted/30">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Lightbulb className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Our Focus</h3>
              <p className="text-muted-foreground leading-relaxed">
                Strategically leveraging AI to build applications that deliver immediate, practical value — transforming how businesses operate and engage with customers.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-muted/30">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Our Approach</h3>
              <p className="text-muted-foreground leading-relaxed">
                Combining large language models with behavioral AI to deliver actionable insights in hours, not weeks — at a fraction of traditional costs.
              </p>
            </div>
          </div>

          {/* Products Section */}
          <h2 className="text-2xl font-bold text-foreground mb-12 text-center">
            Sintetico Apps and Technology Platforms
          </h2>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="p-6 rounded-xl border border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground tracking-tight">Converza</h3>
                </div>
                <span className="text-xs text-muted-foreground">AI Receptionist Platform</span>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                An AI-powered voice receptionist that handles calls 24/7 for businesses. Never miss a call, book appointments automatically, and give your customers the professional experience they deserve.
              </p>
              <a
                href="https://converza.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline"
              >
                Visit converza.ai →
              </a>
            </div>

            <div className="p-6 rounded-xl border border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground tracking-tight">GiveMetry</h3>
                </div>
                <span className="text-xs text-muted-foreground">AI Advancement Companion</span>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The AI layer advancement teams need. Connects to most existing CRM or donor database, enabling users to simply ask questions in natural language and instantly surface insights that once took weeks to compile.
              </p>
              <Link
                href="/"
                className="text-sm font-medium text-primary hover:underline"
              >
                Go back to Home page →
              </Link>
            </div>
          </div>

          {/* CTA Section */}
          <div className="pt-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Interested in What We&apos;re Building?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Get in touch to learn more about our products and how we can help your business.
              </p>
              <Button asChild size="lg">
                <Link href="/signup">Request a Demo</Link>
              </Button>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                </div>
                <span className="text-2xl font-bold tracking-tight text-foreground" style={{ fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '-0.025em' }}>GiveMetry</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                AI-powered donor analytics for nonprofit gift officers.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/#features" className="hover:text-foreground">Features</Link></li>
                <li><Link href="/#benchmarks" className="hover:text-foreground">Benchmarks</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground">About</Link></li>
                <li><a href="mailto:hello@sintetico.ai" className="hover:text-foreground">Contact Us</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              A Sintetico Labs Product · © 2026 Sintetico Inc.
            </p>
            <p className="text-sm text-muted-foreground">
              21 SE 1st Ave. Suite 300, Miami, FL 33133
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
