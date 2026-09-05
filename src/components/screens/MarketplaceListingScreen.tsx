import React, { useState, useEffect } from "react";
import { CatalogItem, LanguageCode } from "../../types/artisan";
import { TTSButton } from "../common/TTSButton";
import { playTextToSpeech, soundEffects } from "../../utils/speechUtils";
import {
  CheckCircle2,
  Share2,
  Sparkles,
  ArrowLeft,
  ExternalLink,
  QrCode,
  Store,
  Send,
  Download,
  RotateCcw,
  ShoppingBag,
  Award,
  Globe,
  MessageSquare,
} from "lucide-react";

interface MarketplaceListingScreenProps {
  catalog: CatalogItem;
  language: LanguageCode;
  onReset: () => void;
  onBack: () => void;
}

export const MarketplaceListingScreen: React.FC<MarketplaceListingScreenProps> = ({
  catalog,
  language,
  onReset,
  onBack,
}) => {
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  const selectedTier = catalog.pricing.selectedTier || "market";
  const activePrice =
    selectedTier === "base"
      ? catalog.pricing.baseCost
      : selectedTier === "market"
      ? catalog.pricing.marketPrice
      : catalog.pricing.exhibitionPrice;

  // Audio greeting
  useEffect(() => {
    const text =
      language === "hi"
        ? "आपका अंतिम उत्पाद कार्ड तैयार है। नीचे दिए गए 'एक क्लिक में बेचें' बटन को दबाएं।"
        : "Final product catalog ready. Click 'Publish Listing' to syndicate to ONDC and marketplaces.";
    const timer = setTimeout(() => {
      playTextToSpeech(text, language);
    }, 400);
    return () => clearTimeout(timer);
  }, [language]);

  const handlePublish = () => {
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      setIsPublished(true);
      soundEffects.playCelebration();

      playTextToSpeech(
        language === "hi"
          ? "बधाई हो! आपका हस्तशिल्प उत्पाद ONDC और ई-मार्केटप्लेस पर लाइव हो गया है।"
          : "Congratulations! Your handicraft listing is now live across ONDC and e-marketplaces.",
        language
      );
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full bg-[#FDFBF7] text-[#0F172A] p-4 sm:p-5 overflow-y-auto font-sans">
      {/* Top Header with Kala-Kart Branding */}
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
              5
            </span>
            <div>
              <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                {language === "hi" ? "5. अंतिम उत्पाद सूची" : "5. Publish Listing"}
              </h2>
              <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">
                ONDC Karigar Syndication
              </span>
            </div>
          </div>
        </div>

        <TTSButton
          text={`${catalog.titleHi}. मूल्य ₹${activePrice}. ${catalog.descriptionHi}`}
          lang={language}
          size="sm"
          variant="iconOnly"
        />
      </div>

      {/* Main E-Commerce Product Card Preview */}
      <div className="mt-3 bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden flex flex-col">
        {/* Studio Photo Showcase with Price Tag Ribbon */}
        <div className="relative w-full h-52 sm:h-60 bg-stone-900 overflow-hidden flex items-center justify-center">
          <img
            src={catalog.studioImage}
            alt={catalog.titleEn}
            className="w-full h-full object-contain bg-[#FDFBF7]"
          />

          {/* Top Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span className="bg-[#0F172A]/90 text-white text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-xs flex items-center gap-1 border border-white/20">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{language === "hi" ? "सत्यापित शिल्प" : "Authentic Craft"}</span>
            </span>
          </div>

          {/* Floating Price Badge */}
          <div className="absolute bottom-3 right-3 bg-[#EA580C] text-white px-3.5 py-1.5 rounded-xl font-black text-lg shadow-lg flex items-center gap-1 border-2 border-white">
            <span className="text-xs font-semibold">₹</span>
            <span>{activePrice.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* Product Details Section */}
        <div className="p-4 space-y-3">
          {/* Hindi Title with Audio */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                🇮🇳 हिंदी शीर्षक
              </span>
              <TTSButton
                text={catalog.titleHi}
                lang="hi"
                variant="iconOnly"
                size="sm"
              />
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-[#0F172A]">
              {catalog.titleHi}
            </h3>
          </div>

          {/* English Title with Audio */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                🌐 English Title
              </span>
              <TTSButton
                text={catalog.titleEn}
                lang="en"
                variant="iconOnly"
                size="sm"
              />
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-stone-700">
              {catalog.titleEn}
            </h4>
          </div>

          {/* Cultural Heritage Story */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-bold text-stone-600 uppercase">
                {language === "hi" ? "विरासत विवरण" : "Craft Heritage Story"}
              </span>
              <TTSButton
                text={language === "hi" ? catalog.descriptionHi : catalog.descriptionEn}
                lang={language}
                variant="pill"
                size="sm"
                label={language === "hi" ? "सुनें" : "Listen"}
              />
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              {language === "hi" ? catalog.descriptionHi : catalog.descriptionEn}
            </p>
          </div>

          {/* Physical Specs Pills */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex justify-between items-center p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs">
              <span className="text-stone-500 font-bold">वजन / Wt:</span>
              <span className="font-bold text-[#0F172A]">{catalog.specs.weight}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs">
              <span className="text-stone-500 font-bold">आकार / Dim:</span>
              <span className="font-bold text-[#0F172A]">{catalog.specs.dimensions}</span>
            </div>
          </div>

          {/* Target E-Commerce Syndication Channels */}
          <div className="pt-2 border-t border-stone-100">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-2">
              {language === "hi" ? "सिंडिकेटिंग चैनल्स (ONDC नेटवर्क)" : "Active E-Marketplace Channels"}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="flex items-center gap-1.5 p-2 bg-emerald-50 text-emerald-900 rounded-lg text-xs font-bold border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>ONDC Karigar</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 bg-blue-50 text-blue-900 rounded-lg text-xs font-bold border border-blue-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Amazon Karigar</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 bg-amber-50 text-amber-900 rounded-lg text-xs font-bold border border-amber-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Flipkart Samarth</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 bg-purple-50 text-purple-900 rounded-lg text-xs font-bold border border-purple-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                <span>WhatsApp Catalog</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Single "Publish Listing" Button */}
      <div className="mt-3.5 pt-3 border-t border-stone-200">
        {!isPublished ? (
          <button
            type="button"
            disabled={isPublishing}
            onClick={handlePublish}
            className="w-full py-3.5 rounded-xl bg-[#EA580C] hover:bg-[#c2410c] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
          >
            {isPublishing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{language === "hi" ? "मार्केटप्लेस पर लाइव हो रहा है..." : "Publishing to Marketplaces..."}</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-5 h-5 text-white" />
                <span>{language === "hi" ? "एक क्लिक में बेचें (Publish Listing)" : "PUBLISH LISTING • एक क्लिक में बेचें"}</span>
              </>
            )}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white text-emerald-700 rounded-full">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base">
                    {language === "hi" ? "सफलतापूर्वक लिस्ट हो गया!" : "Listing is Live Online!"}
                  </h4>
                  <p className="text-xs text-emerald-100">
                    Product ID: #KALAKART-2026-90
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="px-3 py-1.5 bg-white text-emerald-800 rounded-lg text-xs font-bold shadow-xs hover:bg-emerald-50"
              >
                QR व शेयर
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="flex-1 py-3 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                <Share2 className="w-4 h-4 text-amber-400" />
                <span>{language === "hi" ? "WhatsApp पर शेयर करें" : "Share on WhatsApp"}</span>
              </button>

              <button
                type="button"
                onClick={onReset}
                className="flex-1 py-3 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs"
              >
                <RotateCcw className="w-4 h-4 text-stone-600" />
                <span>{language === "hi" ? "डैशबोर्ड पर लौटें" : "Done / Dashboard"}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Share / QR Code Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-extrabold text-lg text-[#0F172A]">
                {language === "hi" ? "डिजिटल शिल्पकार इनवॉइस व QR" : "Artisan Digital QR & Catalog"}
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                {language === "hi"
                  ? "ग्राहक इस QR को स्कैन करके सीधे ₹" + activePrice + " में खरीद सकते हैं"
                  : "Buyers can scan this QR to purchase directly at ₹" + activePrice}
              </p>
            </div>

            {/* Generated QR Code Box */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 inline-block mx-auto">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https://ondc.org/artisan/catalog/kalakart-2026-90?price=${activePrice}`}
                alt="Product QR Code"
                className="w-36 h-36 mx-auto rounded-lg"
              />
              <span className="text-[11px] font-mono text-stone-500 mt-2 block">
                #KALAKART-2026-90
              </span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  window.open(
                    `https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `Namaste! Check out my handcrafted ${catalog.titleEn} on Kala-Kart / ONDC Marketplace for only ₹${activePrice}. Handcrafted with pure heritage traditions!`
                    )}`,
                    "_blank"
                  );
                }}
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{language === "hi" ? "WhatsApp पर भेजें" : "Send on WhatsApp"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="w-full h-10 rounded-xl bg-stone-100 text-stone-700 font-semibold text-xs hover:bg-stone-200"
              >
                {language === "hi" ? "बंद करें" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
