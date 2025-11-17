import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, CheckCircle, Zap, FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Secure Verification",
      description: "Enterprise-grade security with encrypted data handling and secure API integration"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Lightning Fast",
      description: "Bulk verify thousands of phone numbers in minutes with our optimized processing"
    },
    {
      icon: <CheckCircle className="w-6 h-6" />,
      title: "Accurate Results",
      description: "Powered by NumVerify API for reliable carrier, country, and line type detection"
    },
    {
      icon: <FileSpreadsheet className="w-6 h-6" />,
      title: "Easy Export",
      description: "Download verification results as CSV or Excel with comprehensive details"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold text-foreground">PhoneVerify</span>
          </div>
          <Button onClick={() => navigate("/auth")} variant="outline">
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
            Verify Phone Numbers
            <span className="block text-primary mt-2">At Scale</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Upload Excel files, validate thousands of phone numbers instantly, and export detailed reports.
            Built for businesses that need reliable phone verification.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              className="text-lg px-8"
              onClick={() => navigate("/auth")}
            >
              Get Started
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-foreground mb-12">
          How It Works
        </h2>
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto">
              1
            </div>
            <h3 className="text-xl font-semibold text-foreground">Upload Excel</h3>
            <p className="text-muted-foreground">
              Upload your Excel file containing phone numbers
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto">
              2
            </div>
            <h3 className="text-xl font-semibold text-foreground">Verify</h3>
            <p className="text-muted-foreground">
              Our system validates each number with real-time API checks
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto">
              3
            </div>
            <h3 className="text-xl font-semibold text-foreground">Export</h3>
            <p className="text-muted-foreground">
              Download comprehensive reports with all verification details
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-4xl mx-auto p-12 text-center bg-gradient-primary text-primary-foreground">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Start Verifying?
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Join businesses worldwide using PhoneVerify for accurate phone number validation
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            className="text-lg px-8"
            onClick={() => navigate("/auth")}
          >
            Create Free Account
          </Button>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 PhoneVerify. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
