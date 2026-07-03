import { useEffect, useState } from "react";
import "./App.css";

import LoadingScreen from "./components/LoadingScreen";
import SmoothScroll from "./components/SmoothScroll";
import ScrollProgress from "./components/ScrollProgress";
import SpaceParticles from "./components/SpaceParticles";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Mission from "./components/Mission";
import Galaxy from "./components/Galaxy";
import Contact from "./components/Contact";
import Footer from "./components/Footer";

export default function App() {
  const [activeSection, setActiveSection] = useState("home");
  const [isLoading, setIsLoading] = useState(true);
  const [isLeavingLoading, setIsLeavingLoading] = useState(false);
  const [config, setConfig] = useState({
    apiBase: "",
    model: "gpt-4-all",
    backendKeyConfigured: false
  });

  useEffect(() => {
    const leaveTimer = setTimeout(() => setIsLeavingLoading(true), 2300);
    const removeTimer = setTimeout(() => setIsLoading(false), 3050);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  useEffect(() => {
    fetch("/api/config").then((res) => res.json()).then(setConfig).catch(() => {});
  }, []);

  useEffect(() => {
    function handleScroll() {
      const sections = ["home", "mission", "galaxy", "contact"];
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
  }, []);

  return (
    <div className="page space-site">
      {isLoading && <LoadingScreen isLeaving={isLeavingLoading} />}
      <SmoothScroll />
      <ScrollProgress />
      <SpaceParticles />
      <Navbar activeSection={activeSection} />
      <Hero />
      <Mission />
      <Galaxy />
      <Contact config={config} />
      <Footer />
    </div>
  );
}
