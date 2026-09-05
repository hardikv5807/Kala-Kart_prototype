import React, { useEffect } from "react";
import { CatalogItem, LanguageCode, PricingTiers } from "../../types/artisan";
import { TTSButton } from "../common/TTSButton";
import { playTextToSpeech, soundEffects } from "../../utils/speechUtils";
import {
  IndianRupee,
  TrendingUp,
  Award,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Volume2,
  Sparkles,
  ShieldCheck,
  Percent,
  Calculator,
  HelpCircle,
} from "lucide-react";

interface PricingAssistantScreenProps {
  catalog: CatalogItem;
  language: LanguageCode;
  onPriceSelected: (updatedCatalog: CatalogItem) => void;
  onBack: () => void;
}

export const PricingAssistantScreen: React.FC<PricingAssistantScreenProps> = ({
  catalog,
  language,
  onPriceSelected,
  onBack,
}) => {
  const { pricing } = catalog;
  const selectedTier = pricing.selectedTier || "market";

  // Auto-play voice explanation on screen entry for low-literacy artisans
  useEffect(() => {
    const audioText = language === "hi" ? pricing.explanationHi : pricing.explanationEn;
    const timer = setTimeout(() => {
      playTextToSpeech(audioText, language);
    }, 400);
    return () => clearTimeout(timer);
  }, [language]);

  const handleSelectTier = (tier: "base" | "market" | "exhibition") => {
    soundEffects.playMicStart();
    const updatedPricing: PricingTiers = {
      ...pricing,
      selectedTier: tier,
    };
    const updatedCatalog: CatalogItem = {
      ...catalog,
      pricing: updatedPricing,
    };
    onPriceSelected(updatedCatalog);

    // Audio confirmation of selected price
    const tierNameHi = tier === "base" ? "लागत मूल्य" : tier === "market" ? "सर्वोत्तम ऑनलाइन मूल्य" : "प्रदर्शनी प्रीमियम मूल्य";
    const tierNameEn = tier === "base" ? "Cost price" : tier === "market" ? "Recommended market price" : "Premium exhibition price";
    const priceVal = tier === "base" ? pricing.baseCost : tier === "market" ? pricing.marketPrice : pricing.exhibitionPrice;

    playTextToSpeech(
      language === "hi"
        ? `आपने ₹${priceVal} का ${tierNameHi} चुना है।`
        : `Selected ${tierNameEn} of ₹${priceVal}.`,
      language
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#FDFBF7] text-[#0F172A] p-4 sm:p-5 overflow-y-auto font-sans">
      {/* Top Bar with Kala-Kart Branding */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 bg-[#EA580C] rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-xs">
              4
            </span>
            <div>
              <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                {language === "hi" ? "4. स्मार्ट मूल्य निर्धारण" : "4. Smart Pricing Engine"}
              </h2>
              <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">
                Fair Wages Algorithm
              </span>
            </div>
          </div>
        </div>

        <TTSButton
          text={language === "hi" ? pricing.explanationHi : pricing.explanationEn}
          lang={language}
          size="sm"
          variant="iconOnly"
        />
      </div>

      {/* Voice Explanation Banner */}
      <div className="mt-3 p-3.5 bg-white rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-orange-100 text-[#EA580C] rounded-xl flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wide">
                {language === "hi" ? "मूल्य का गणित (AI विश्लेषण)" : "Pricing Logic & AI Derivation"}
              </span>
              <TTSButton
                text={language === "hi" ? pricing.explanationHi : pricing.explanationEn}
                lang={language}
                variant="iconOnly"
                size="sm"
              />
            </div>
            <p className="text-xs text-stone-600 font-medium leading-relaxed">
              {language === "hi" ? pricing.explanationHi : pricing.explanationEn}
            </p>
          </div>
        </div>
      </div>

      {/* Three Color-Coded Pricing Tiers */}
      <div className="mt-3.5 space-y-2.5 flex-1">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
            {language === "hi" ? "उपयुक्त मूल्य चुनें (स्पर्श करें)" : "Select Your Selling Price Tier"}
          </h3>
          <span className="text-[10px] text-stone-400 font-semibold uppercase">
            3 Tier Valuation
          </span>
        </div>

        {/* Tier 1: Base / Cost Price */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleSelectTier("base")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden select-none active:scale-[0.98] ${
            selectedTier === "base"
              ? "bg-emerald-50/80 border-2 border-emerald-600 shadow-xs text-emerald-950"
              : "bg-white border-stone-200 hover:bg-stone-50 text-stone-800 opacity-90"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-lg border border-emerald-300">
                ₹
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  {language === "hi" ? "लागत मूल्य (Base Cost)" : "Base Cost (Break-even)"}
                </span>
                <h4 className="text-2xl font-black text-[#0F172A] mt-0.5">
                  ₹{pricing.baseCost.toLocaleString("en-IN")}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <TTSButton
                text={
                  language === "hi"
                    ? `लागत मूल्य ₹${pricing.baseCost} है। यह आपकी न्यूनतम सामग्री व मजदूरी की भरपाई करता है।`
                    : `Cost price is ₹${pricing.baseCost}, covering materials and basic daily wages.`
                }
                lang={language}
                variant="iconOnly"
                size="sm"
              />
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedTier === "base"
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-stone-300"
                }`}
              >
                {selectedTier === "base" && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-stone-500 font-medium mt-1.5 pl-1">
            {language === "hi" 
              ? "• कच्चा माल + बुनियादी 1 दिन की न्यूनतम कारीगर मजदूरी"
              : "• Raw materials + 1-day essential craftsman labor wage"}
          </p>
        </div>

        {/* Tier 2: Recommended Market Price (Terracotta / Orange Card) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleSelectTier("market")}
          className={`p-3.5 rounded-2xl transition-all cursor-pointer relative overflow-hidden select-none active:scale-[0.98] ${
            selectedTier === "market"
              ? "bg-orange-50/80 border-2 border-[#EA580C] shadow-md ring-2 ring-[#EA580C]/20 text-[#0F172A]"
              : "bg-white border border-stone-200 hover:bg-stone-50 text-stone-800 opacity-90"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#EA580C] flex items-center justify-center font-black text-lg border border-orange-300">
                ₹
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-orange-800">
                    {language === "hi" ? "बाज़ार बिक्री मूल्य" : "Recommended Market"}
                  </span>
                  <span className="text-[10px] font-extrabold bg-[#EA580C] text-white px-1.5 py-0.2 rounded">
                    ★ {language === "hi" ? "सर्वोत्तम" : "Best Value"}
                  </span>
                </div>
                <h4 className="text-2xl font-black text-[#0F172A] mt-0.5">
                  ₹{pricing.marketPrice.toLocaleString("en-IN")}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <TTSButton
                text={
                  language === "hi"
                    ? `सर्वोत्तम बाज़ार मूल्य ₹${pricing.marketPrice} है। यह ONDC और ऑनलाइन ग्राहकों के लिए सबसे उचित है।`
                    : `Recommended market selling price is ₹${pricing.marketPrice}, optimized for online e-commerce.`
                }
                lang={language}
                variant="iconOnly"
                size="sm"
              />
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedTier === "market"
                    ? "border-[#EA580C] bg-[#EA580C] text-white"
                    : "border-stone-300"
                }`}
              >
                {selectedTier === "market" && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-stone-600 font-medium mt-1.5 pl-1">
            {language === "hi"
              ? "• ONDC, Amazon Karigar और ऑनलाइन ग्राहकों के लिए उचित व प्रतिस्पर्धी दर"
              : "• Competitive fair rate for ONDC, Amazon Karigar, and direct retail buyers"}
          </p>
        </div>

        {/* Tier 3: Premium Exhibition Price */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleSelectTier("exhibition")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden select-none active:scale-[0.98] ${
            selectedTier === "exhibition"
              ? "bg-purple-50/80 border-2 border-purple-600 shadow-xs text-purple-950"
              : "bg-white border-stone-200 hover:bg-stone-50 text-stone-800 opacity-90"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-lg border border-purple-300">
                ₹
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800">
                  {language === "hi" ? "प्रदर्शनी / एक्सपो मूल्य" : "Exhibition & Export"}
                </span>
                <h4 className="text-2xl font-black text-[#0F172A] mt-0.5">
                  ₹{pricing.exhibitionPrice.toLocaleString("en-IN")}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <TTSButton
                text={
                  language === "hi"
                    ? `प्रदर्शनी और कला दीर्घा का मूल्य ₹${pricing.exhibitionPrice} है। यह बड़े खरीदारों और निर्यातकों के लिए है।`
                    : `Exhibition price is ₹${pricing.exhibitionPrice}, tailored for high-end boutique buyers.`
                }
                lang={language}
                variant="iconOnly"
                size="sm"
              />
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedTier === "exhibition"
                    ? "border-purple-600 bg-purple-600 text-white"
                    : "border-stone-300"
                }`}
              >
                {selectedTier === "exhibition" && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-stone-500 font-medium mt-1.5 pl-1">
            {language === "hi"
              ? "• कला दीर्घाओं, एक्सपो मेलों और वैश्विक निर्यात खरीदारों हेतु"
              : "• Tailored for craft expos, boutique galleries, and export collectors"}
          </p>
        </div>
      </div>

      {/* Selected Price Highlight & Proceed Button */}
      <div className="mt-3.5 pt-3 border-t border-stone-200">
        <button
          type="button"
          onClick={() => onPriceSelected(catalog)}
          className="w-full py-3.5 rounded-xl bg-[#EA580C] hover:bg-[#c2410c] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
        >
          <span>
            {language === "hi"
              ? `₹${(selectedTier === "base" ? pricing.baseCost : selectedTier === "market" ? pricing.marketPrice : pricing.exhibitionPrice).toLocaleString("en-IN")} में प्रकाशित करें`
              : `PROCEED TO PUBLISH • ₹${(selectedTier === "base" ? pricing.baseCost : selectedTier === "market" ? pricing.marketPrice : pricing.exhibitionPrice).toLocaleString("en-IN")}`}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
