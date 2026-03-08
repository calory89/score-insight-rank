import Navbar from "@/components/Navbar";

const Privacy = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container mx-auto px-4 py-20 max-w-3xl">
      <h1 className="text-3xl font-bold text-foreground mb-8">Privacy Policy</h1>
      <div className="prose prose-sm text-muted-foreground space-y-6">
        <p><strong>Last updated:</strong> March 2026</p>

        <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
        <p>We collect information you provide directly: email address, property URLs you analyze, and usage data. We do not collect sensitive personal information beyond what is necessary for the service.</p>

        <h2 className="text-lg font-semibold text-foreground">2. How We Use Your Information</h2>
        <p>Your data is used to provide property analysis, personalize your experience, and improve our AI scoring models. We never sell your personal data to third parties.</p>

        <h2 className="text-lg font-semibold text-foreground">3. Data Storage & Security</h2>
        <p>All data is encrypted at rest (AES-256) and in transit (TLS 1.3). Your analyses are private by default and only visible to you unless you explicitly share them.</p>

        <h2 className="text-lg font-semibold text-foreground">4. Cookies</h2>
        <p>We use essential cookies for authentication and session management. No third-party tracking cookies are used.</p>

        <h2 className="text-lg font-semibold text-foreground">5. Your Rights</h2>
        <p>You can request data export or deletion at any time by contacting <a href="mailto:hello@realhunt.com" className="text-primary hover:underline">hello@realhunt.com</a>. Account deletion removes all associated data permanently.</p>

        <h2 className="text-lg font-semibold text-foreground">6. Contact</h2>
        <p>For privacy-related inquiries: <a href="mailto:hello@realhunt.com" className="text-primary hover:underline">hello@realhunt.com</a></p>
      </div>
    </div>
  </div>
);

export default Privacy;
