import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/20 selection:text-accent font-sans">
      <Navbar />

      <main>
        <HeroSection />
        <WorkflowSection />
      </main>

      <Footer />
    </div>
  );
}
