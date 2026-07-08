import { useEffect, useState } from "react";
import "./App.css";

import LoadingScreen from "./components/LoadingScreen";
import ScrollProgress from "./components/ScrollProgress";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import ConsolePage from "./components/ConsolePage";

export default function App() {
  const isConsoleRoute = window.location.pathname === "/console";
  const [activeSection, setActiveSection] = useState("home");
  const [isLoading, setIsLoading] = useState(true);
  const [isLeavingLoading, setIsLeavingLoading] = useState(false);
  const [config, setConfig] = useState({
    apiBase: "",
    model: "gpt-4-all",
    backendKeyConfigured: false
  });

  useEffect(() => {
    const leaveTimer = setTimeout(() => setIsLeavingLoading(true), 1550);
    const removeTimer = setTimeout(() => setIsLoading(false), 2850);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  useEffect(() => {
    fetch("/api/config").then((res) => res.json()).then(setConfig).catch(() => {});
  }, []);

  useEffect(() => {
    if (isConsoleRoute) return;
    function handleScroll() {
      const sections = ["home", "contact"];
      const currentSection = sections.find((sectionId) => {
        const section = document.getElementById(sectionId);
        if (!section) return false;
        const rect = section.getBoundingClientRect();
        return rect.top <= window.innerHeight * 0.35 && rect.bottom >= window.innerHeight * 0.35;
      });
      if (currentSection) setActiveSection(currentSection);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isConsoleRoute]);

  if (isConsoleRoute) {
    return <ConsolePage config={config} />;
  }

  return (
    <div className="page space-site">
      {isLoading && <LoadingScreen isLeaving={isLeavingLoading} />}
      <ScrollProgress />
      <Navbar activeSection={activeSection} />
      <Hero />
      <Contact config={config} />
      <Footer />
    </div>
  );
}
