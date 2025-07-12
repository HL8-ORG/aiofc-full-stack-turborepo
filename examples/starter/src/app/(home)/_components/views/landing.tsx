"use client";
import { useEffect, useState } from "react";
import { FAQSection } from "../sections/faq";
import { HeroSection } from "../sections/hero";
import { TeamSection } from "../sections/team";
import { Header } from "../header/header";
import { motion } from "framer-motion";
import { FeaturesSection } from "../sections/features";

export default function LandingView() {
  const [transition, setTransition] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setTransition(true), 2000);
    return () => {
      clearTimeout(timer);
    };
  }, []);
  return (
    <>
      <Header transition={transition} />

      {transition && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center justify-center w-full"
        >
          <HeroSection />
          <FeaturesSection />
          <TeamSection />
          <FAQSection />
        </motion.div>
      )}
    </>
  );
}
