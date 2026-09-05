import React, { useEffect } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { LanguageCode } from "../../types/artisan";
import { playTextToSpeech } from "../../utils/speechUtils";

interface SplashScreenProps {
  language: LanguageCode;
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ language, onFinish }) => {
  useEffect(() => {
    // Play subtle audio welcome
    const welcomeText =
      language === "hi"
        ? "कला-कार्ट में आपका स्वागत है। पारंपरिक शिल्प का डिजिटल मंच।"
        : "Welcome to Kala-Kart. Empowering Traditional Craftsmanship.";
    const voiceTimer = setTimeout(() => {
      playTextToSpeech(welcomeText, language);
    }, 400);

    // Auto-advance after 2.4 seconds
    const timer = setTimeout(() => {
      onFinish();
    }, 2400);

    return () => {
      clearTimeout(timer);
      clearTimeout(voiceTimer);
    };
  }, [language, onFinish]);

  return (
    <div
      onClick={onFinish}
      role="button"
      tabIndex={0}
      className="flex flex-col h-full bg-[#0F172A] text-white p-6 justify-between items-center relative overflow-hidden select-none cursor-pointer"
    >
      {/* Ambient background glow */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-[#EA580C]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top minimal status marker */}
      <div className="w-full flex justify-between items-center z-10 pt-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700">
          Smart Artisan Engine
        </span>
        <span className="text-[10px] font-mono text-[#EA580C] font-semibold">
          v2.4 Pro
        </span>
      </div>

      {/* Central Hero Logo & Branding */}
      <div className="flex flex-col items-center text-center z-10 my-auto">
        {/* Animated Brand Emblem */}
        <div className="relative mb-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-[#EA580C] via-[#F97316] to-amber-400 p-0.5 shadow-2xl shadow-orange-950/60 animate-pulse">
            <div className="w-full h-full bg-[#0F172A] rounded-[22px] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#EA580C]/20 to-transparent opacity-60" />
              <div className="text-4xl sm:text-5xl transform hover:scale-110 transition-transform">
                🪡
              </div>
            </div>
          </div>

          {/* Floating Sparkle Pill */}
          <div className="absolute -bottom-2 -right-2 bg-[#EA580C] text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-lg border-2 border-[#0F172A] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-200" />
            <span>AI Studio</span>
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 font-sans">
          Kala-Kart
        </h1>
        <div className="h-1 w-12 bg-[#EA580C] rounded-full mx-auto mb-3" />

        {/* Tagline */}
        <p className="text-xs sm:text-sm font-medium text-slate-300 max-w-xs leading-relaxed">
          {language === "hi"
            ? "पारंपरिक शिल्पकारों व बुनकरों का डिजिटल मंच"
            : "Empowering Traditional Craftsmanship"}
        </p>

        <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">
          {language === "hi"
            ? "वॉइस कैटलॉग • स्मार्ट मूल्य • ई-मार्केट"
            : "Voice Catalog • Smart Pricing • ONDC Ready"}
        </p>
      </div>

      {/* Bottom Loading Progress & Tap CTA */}
      <div className="w-full max-w-xs flex flex-col items-center gap-3 z-10 pb-4">
        {/* Animated Loading Bar */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#EA580C] to-amber-400 rounded-full animate-[progress_2.2s_ease-in-out_infinite]" />
        </div>

        <button
          type="button"
          onClick={onFinish}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors group mt-1"
        >
          <span>{language === "hi" ? "आगे बढ़ने के लिए टैप करें" : "Tap anywhere to continue"}</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-[#EA580C]" />
        </button>
      </div>
    </div>
  );
};
