import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/ui/navbar";
import { useEffect } from "react";

export default function HomePage() {
  const [, setLocation] = useLocation();

  // Handle referral codes in URL
  useEffect(() => {
    // Check if there's a ref parameter in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get('ref');
    
    if (referralCode) {
      // Store the referral code in localStorage so it can be used during registration
      localStorage.setItem('referralCode', referralCode);
      console.log('Referral code saved:', referralCode);
      
      // Redirect to registration page after storing the referral code
      setLocation('/register');
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 px-4 md:px-6 lg:px-8 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              The First Free, Unlimited<br />
              Halal AI Chat Assistant
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              🚀 Chat with the world's best AI model, filtered for Islamic principles
            </p>
            <Link href="/login">
              <Button size="lg" className="text-lg px-8">
                Start Chatting for Free
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 md:px-6 lg:px-8">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose Halal AI Chat?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-6 rounded-lg border bg-card">
                <h3 className="text-xl font-semibold mb-4">🔹 Ethical & Halal AI</h3>
                <p className="text-muted-foreground">
                  AI-generated content is carefully filtered to align with Islamic principles
                </p>
              </div>
              <div className="p-6 rounded-lg border bg-card">
                <h3 className="text-xl font-semibold mb-4">🔹 Unlimited Free Access</h3>
                <p className="text-muted-foreground">
                  No credit card or payment required. Just chat and generate.
                </p>
              </div>
              <div className="p-6 rounded-lg border bg-card">
                <h3 className="text-xl font-semibold mb-4">🔹 Share & Learn</h3>
                <p className="text-muted-foreground">
                  Save, organize, and share AI-generated Islamic content.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Coming Soon Section */}
        <section className="py-20 px-4 md:px-6 lg:px-8 bg-primary/5">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8">Coming Soon</h2>
            <div className="max-w-2xl mx-auto">
              <p className="text-lg text-muted-foreground mb-6">
                We're constantly working to improve your experience. Here's what's next:
              </p>
              <ul className="text-left space-y-4 max-w-md mx-auto">
                <li className="flex items-center gap-2">
                  <span className="text-primary">💡</span>
                  <span>Faster AI responses</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">💡</span>
                  <span>Audio and video generation</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">💡</span>
                  <span>Specialized tools for specific niches</span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 px-4 md:px-6 lg:px-8">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} Halal AI Chat. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
