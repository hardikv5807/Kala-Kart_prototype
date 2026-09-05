import React, { useState, useEffect } from "react";
import { CatalogItem, LanguageCode, PricingTiers } from "../../types/artisan";
import {
  PricingPredictionResult,
  ArtisanCostData,
  ProductPricingFeatures,
} from "../../types/pricing";
import { TTSButton } from "../common/TTSButton";
import { playTextToSpeech, soundEffects } from "../../utils/speechUtils";
import {
  buildProductPricingFeatures,
  normalizeCategory,
  detectSubcategory,
} from "../../utils/pricingFeatureBuilder";
import {
  IndianRupee,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  Scale,
  Maximize2,
  Clock,
  Hammer,
  RotateCcw,
  Check,
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
  // 1. Product Facts Extraction from completed catalog
  const { specs } = catalog;
  const productName = specs.productName || catalog.titleEn || catalog.titleHi || "Handcrafted Product";
  const categoryNorm = normalizeCategory(catalog.category);
  const subcategoryNorm = detectSubcategory(
    categoryNorm,
    productName,
    `${catalog.descriptionEn || ""} ${catalog.descriptionHi || ""}`
  );
  const material = specs.material || "Natural Material";
  const craftTechnique = specs.craftTechnique || "Handcrafted";
  const dimensions = specs.dimensions || "Not specified";
  const weight = specs.weight || "Not specified";
  const quantity = specs.quantity || "1 unit";
  const isHandmade = specs.isHandmade !== false;
  const productionTime = specs.productionTime || "1 day";

  // 2. Artisan Production Cost State
  // Initialize from existing catalog baseCost if present, or sensible starting values
  const initialBase = catalog.pricing.baseCost || 400;
  const [rawMaterialCost, setRawMaterialCost] = useState<number>(
    Math.max(0, Math.round(initialBase * 0.4))
  );
  const [laborCost, setLaborCost] = useState<number>(
    Math.max(0, Math.round(initialBase * 0.4))
  );
  const [packagingCost, setPackagingCost] = useState<number>(
    Math.max(0, Math.round(initialBase * 0.1))
  );
  const [otherCost, setOtherCost] = useState<number>(
    Math.max(0, Math.round(initialBase * 0.1))
  );

  // Deterministic Production Cost calculation (raw + labor + packaging + other)
  const estimatedProductionCost =
    (Number(rawMaterialCost) || 0) +
    (Number(laborCost) || 0) +
    (Number(packagingCost) || 0) +
    (Number(otherCost) || 0);

  // 3. Prediction & API State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [predictionResult, setPredictionResult] = useState<PricingPredictionResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // 4. Artisan Final Selling Price (Artisan Final Control)
  const [artisanSellingPrice, setArtisanSellingPrice] = useState<number>(
    catalog.pricing.marketPrice || estimatedProductionCost || 500
  );

  // Accordion UI toggles
  const [showProductDetails, setShowProductDetails] = useState<boolean>(false);
  const [showTransparency, setShowTransparency] = useState<boolean>(false);

  // Greeting audio
  useEffect(() => {
    const greetingText =
      language === "hi"
        ? "मूल्य निर्धारण सहायक में आपका स्वागत है। अपनी उत्पादन लागत दर्ज करें और AI मूल्य सुझाव प्राप्त करें।"
        : "Welcome to Pricing Assistant. Enter your production cost and get an AI price suggestion.";
    const timer = setTimeout(() => {
      playTextToSpeech(greetingText, language);
    }, 400);
    return () => clearTimeout(timer);
  }, [language]);

  // Handle "Get AI Price Suggestion" Click
  const handleGetPriceSuggestion = async () => {
    soundEffects.playMicStart();
    setIsLoading(true);
    setApiError(null);

    try {
      const costData: ArtisanCostData = {
        rawMaterialCostINR: Number(rawMaterialCost) || 0,
        laborCostINR: Number(laborCost) || 0,
        packagingCostINR: Number(packagingCost) || 0,
        otherCostINR: Number(otherCost) || 0,
        quantity: 1,
      };

      const features: ProductPricingFeatures = buildProductPricingFeatures(catalog, costData);

      const response = await fetch("/api/pricing/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features }),
      });

      if (!response.ok) {
        throw new Error(`API response status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success || !data.prediction) {
        throw new Error(data.error || "Prediction request unsuccessful");
      }

      const prediction: PricingPredictionResult = data.prediction;
      setPredictionResult(prediction);

      // Rule 7: Pre-fill selling price with ML recommendation ONLY when legitimate prediction exists
      if (prediction.predictedPriceINR !== null && prediction.predictedPriceINR > 0) {
        setArtisanSellingPrice(prediction.predictedPriceINR);
      } else {
        // If DATASET_NOT_READY, keep current artisan price or default to estimated production cost
        if (artisanSellingPrice < estimatedProductionCost) {
          setArtisanSellingPrice(estimatedProductionCost);
        }
      }

      // Audio summary of result
      if (prediction.status === "DATASET_NOT_READY") {
        playTextToSpeech(
          language === "hi"
            ? "मॉडल सत्यापित बाज़ार डेटा की प्रतीक्षा कर रहा है। आपकी उत्पादन लागत सुरक्षित है।"
            : "Pricing model awaiting verified market data. Your production cost is calculated.",
          language
        );
      } else if (prediction.predictedPriceINR) {
        playTextToSpeech(
          language === "hi"
            ? `सुझाया गया मूल्य ₹${prediction.predictedPriceINR} है। आप इसे कभी भी बदल सकते हैं।`
            : `Recommended price is ₹${prediction.predictedPriceINR}. You can adjust it anytime.`,
          language
        );
      }
    } catch (err: any) {
      console.error("Pricing prediction error:", err);
      // Rule 9: Do not generate a random fallback price
      setApiError(
        language === "hi"
          ? "हम अभी मूल्य की गणना नहीं कर सके। कृपया पुनः प्रयास करें।"
          : "We couldn't calculate a price right now. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Proceed to Publish
  const handleProceed = () => {
    soundEffects.playCelebration();
    const finalPrice = Number(artisanSellingPrice) > 0 ? Number(artisanSellingPrice) : estimatedProductionCost;

    const updatedPricing: PricingTiers = {
      baseCost: estimatedProductionCost,
      marketPrice: finalPrice,
      exhibitionPrice: Math.round(finalPrice * 1.35),
      selectedTier: "market",
      explanationHi:
        predictionResult?.status === "DATASET_NOT_READY"
          ? `कारीगर उत्पादन लागत: ₹${estimatedProductionCost}। अंतिम निर्धारित बिक्री मूल्य: ₹${finalPrice}।`
          : `AI मूल्य सुझाव: ₹${predictionResult?.predictedPriceINR || finalPrice}। कारीगर द्वारा निर्धारित अंतिम मूल्य: ₹${finalPrice}।`,
      explanationEn:
        predictionResult?.status === "DATASET_NOT_READY"
          ? `Artisan production cost: ₹${estimatedProductionCost}. Final selling price set by artisan: ₹${finalPrice}.`
          : `Market pricing suggestion: ₹${predictionResult?.predictedPriceINR || finalPrice}. Final price selected: ₹${finalPrice}.`,
    };

    const updatedCatalog: CatalogItem = {
      ...catalog,
      pricing: updatedPricing,
    };

    onPriceSelected(updatedCatalog);
  };

  return (
    <div className="flex flex-col h-full bg-[#FDFBF7] text-[#0F172A] p-4 sm:p-5 overflow-y-auto font-sans">
      {/* 1. Header Bar */}
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
              <h2 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                {language === "hi" ? "4. मूल्य निर्धारण सहायक" : "4. Pricing Assistant"}
              </h2>
              <span className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider">
                Fair Wages & Cost Floor
              </span>
            </div>
          </div>
        </div>

        <TTSButton
          text={
            language === "hi"
              ? "मूल्य निर्धारण सहायक। उत्पाद विवरण देखें, लागत भरें और AI मूल्य सुझाव प्राप्त करें।"
              : "Pricing Assistant. View product details, enter costs, and get an AI price suggestion."
          }
          lang={language}
          size="sm"
          variant="iconOnly"
        />
      </div>

      {/* 2. SECTION 1: PRODUCT FACTS (Product Details Compact View) */}
      <div className="mt-3 bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowProductDetails(!showProductDetails)}
          className="w-full p-3.5 flex items-center justify-between hover:bg-stone-50 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-orange-100 text-[#EA580C] rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wide">
                  {language === "hi" ? "उत्पाद विवरण (सत्यापित तथ्य)" : "Product Details (Verified Facts)"}
                </span>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full flex items-center gap-1">
                  <Check className="w-2.5 h-2.5" /> Verified
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium truncate max-w-[230px]">
                {productName} • {material}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-stone-400">
            <span className="text-[10px] font-bold uppercase">{showProductDetails ? "Hide" : "View"}</span>
            {showProductDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showProductDetails && (
          <div className="px-3.5 pb-3.5 pt-1 border-t border-stone-100 bg-stone-50/50">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-400 font-bold uppercase block">Category / Type</span>
                <span className="font-semibold text-stone-800 capitalize">
                  {categoryNorm} ({subcategoryNorm.replace(/_/g, " ")})
                </span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-400 font-bold uppercase block">Material</span>
                <span className="font-semibold text-stone-800">{material}</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-400 font-bold uppercase block">Craft Technique</span>
                <span className="font-semibold text-stone-800">{craftTechnique}</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-400 font-bold uppercase block">Dimensions</span>
                <span className="font-semibold text-stone-800">{dimensions}</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-400 font-bold uppercase block">Weight & Qty</span>
                <span className="font-semibold text-stone-800">
                  {weight} • {quantity}
                </span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-400 font-bold uppercase block">Craft & Time</span>
                <span className="font-semibold text-stone-800">
                  {isHandmade ? "Handmade" : "Crafted"} • {productionTime}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-stone-500 italic mt-2 text-center">
              {language === "hi"
                ? "यह जानकारी वॉइस कैटलॉग से ली गई है। आपको इसे दोबारा दर्ज करने की आवश्यकता नहीं है।"
                : "Information populated from verified Voice Catalog. No re-entry required."}
            </p>
          </div>
        )}
      </div>

      {/* 3. SECTION 2: ARTISAN PRODUCTION COST INPUT */}
      <div className="mt-3.5 bg-white rounded-2xl border border-stone-200 p-3.5 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
              <Hammer className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
              {language === "hi" ? "आपकी उत्पादन लागत" : "Your Production Cost"}
            </h3>
          </div>
          <span className="text-[10px] font-semibold text-stone-400 uppercase">
            Cost Input
          </span>
        </div>

        <p className="text-[11px] text-stone-600 font-medium leading-relaxed mb-3">
          {language === "hi"
            ? "ये लागतें कला-कार्ट को यह जांचने में मदद करती हैं कि सुझाई गई कीमत आपकी उत्पादन लागत को पूरा करती है या नहीं।"
            : "These costs help Kala-Kart check whether a suggested market price covers your production expenses."}
        </p>

        {/* Numeric Inputs Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Raw Material Cost */}
          <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 focus-within:border-[#EA580C] focus-within:bg-orange-50/20 transition-colors">
            <label className="text-[10px] font-bold text-stone-600 uppercase block mb-1">
              {language === "hi" ? "कच्चा माल (₹)" : "Raw Material (₹)"}
            </label>
            <div className="flex items-center">
              <span className="text-sm font-bold text-stone-400 mr-1">₹</span>
              <input
                type="number"
                min="0"
                step="10"
                value={rawMaterialCost}
                onChange={(e) => setRawMaterialCost(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-transparent font-bold text-stone-900 text-sm focus:outline-none"
                placeholder="0"
              />
            </div>
          </div>

          {/* Labour Cost */}
          <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 focus-within:border-[#EA580C] focus-within:bg-orange-50/20 transition-colors">
            <label className="text-[10px] font-bold text-stone-600 uppercase block mb-1">
              {language === "hi" ? "कारीगर मजदूरी (₹)" : "Labour Cost (₹)"}
            </label>
            <div className="flex items-center">
              <span className="text-sm font-bold text-stone-400 mr-1">₹</span>
              <input
                type="number"
                min="0"
                step="10"
                value={laborCost}
                onChange={(e) => setLaborCost(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-transparent font-bold text-stone-900 text-sm focus:outline-none"
                placeholder="0"
              />
            </div>
          </div>

          {/* Packaging Cost */}
          <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 focus-within:border-[#EA580C] focus-within:bg-orange-50/20 transition-colors">
            <label className="text-[10px] font-bold text-stone-600 uppercase block mb-1">
              {language === "hi" ? "पैकेजिंग (₹)" : "Packaging (₹)"}
            </label>
            <div className="flex items-center">
              <span className="text-sm font-bold text-stone-400 mr-1">₹</span>
              <input
                type="number"
                min="0"
                step="5"
                value={packagingCost}
                onChange={(e) => setPackagingCost(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-transparent font-bold text-stone-900 text-sm focus:outline-none"
                placeholder="0"
              />
            </div>
          </div>

          {/* Other Cost */}
          <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 focus-within:border-[#EA580C] focus-within:bg-orange-50/20 transition-colors">
            <label className="text-[10px] font-bold text-stone-600 uppercase block mb-1">
              {language === "hi" ? "अन्य खर्च (₹)" : "Other Cost (₹)"}
            </label>
            <div className="flex items-center">
              <span className="text-sm font-bold text-stone-400 mr-1">₹</span>
              <input
                type="number"
                min="0"
                step="5"
                value={otherCost}
                onChange={(e) => setOtherCost(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-transparent font-bold text-stone-900 text-sm focus:outline-none"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Deterministic Production Cost Floor Display */}
        <div className="mt-3 p-3 bg-stone-100 rounded-xl flex items-center justify-between border border-stone-200">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 block">
              {language === "hi" ? "अनुमानित उत्पादन लागत (कच्चा माल + मजदूरी + पैकेजिंग + अन्य)" : "Estimated Production Cost"}
            </span>
            <span className="text-[11px] text-stone-500 font-medium">
              {rawMaterialCost} + {laborCost} + {packagingCost} + {otherCost}
            </span>
          </div>
          <div className="text-right">
            <span className="text-lg font-black text-stone-900">
              ₹{estimatedProductionCost.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* 4. SECTION 3: GET AI PRICE SUGGESTION CTA */}
      <div className="mt-3.5">
        <button
          type="button"
          onClick={handleGetPriceSuggestion}
          disabled={isLoading}
          className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99] ${
            isLoading
              ? "bg-orange-300 text-white cursor-wait"
              : "bg-[#EA580C] hover:bg-[#c2410c] text-white"
          }`}
        >
          {isLoading ? (
            <>
              <RotateCcw className="w-4 h-4 animate-spin" />
              <span>
                {language === "hi"
                  ? "उत्पाद एवं बाज़ार कारकों का विश्लेषण..."
                  : "Analyzing product and pricing factors..."}
              </span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>
                {language === "hi" ? "AI मूल्य सुझाव प्राप्त करें" : "Get AI Price Suggestion"}
              </span>
            </>
          )}
        </button>
      </div>

      {/* 5. ERROR STATE (Rule 9) */}
      {apiError && (
        <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
          <span>{apiError}</span>
        </div>
      )}

      {/* 6. SECTION 4: PIPELINE STATES RENDERING (A, B, C) */}
      {predictionResult && (
        <div className="mt-3.5 space-y-3">
          {/* State A: DATASET_NOT_READY */}
          {predictionResult.status === "DATASET_NOT_READY" && (
            <div className="p-4 bg-amber-50/80 rounded-2xl border-2 border-amber-300 text-amber-950 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-200 text-amber-900 rounded-xl flex-shrink-0">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-950">
                    {language === "hi"
                      ? "मूल्य निर्धारण मॉडल सत्यापित बाज़ार डेटा की प्रतीक्षा कर रहा है"
                      : "Pricing model awaiting verified market data"}
                  </h4>
                  <p className="text-xs text-amber-800 font-medium leading-relaxed mt-1">
                    {language === "hi"
                      ? "कला-कार्ट की मशीन लर्निंग मूल्य निर्धारण पाइपलाइन तैयार है, लेकिन उत्पादन मॉडल को अभी पर्याप्त सत्यापित कारीगर बाज़ार अवलोकनों पर प्रशिक्षित नहीं किया गया है।"
                      : "Kala-Kart's ML pricing pipeline is ready, but the production model has not yet been trained on enough verified artisan market observations."}
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-amber-200 flex items-center justify-between text-xs">
                    <span className="font-semibold text-amber-900">
                      {language === "hi" ? "आपकी उत्पादन लागत:" : "Your Production Cost:"}
                    </span>
                    <span className="font-extrabold text-amber-950 text-sm">
                      ₹{estimatedProductionCost.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* State B: MARKET_DATA_UNAVAILABLE */}
          {predictionResult.status === "MARKET_DATA_UNAVAILABLE" && (
            <div className="p-4 bg-orange-50/80 rounded-2xl border-2 border-orange-400 text-[#0F172A] shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-orange-800 block">
                    {language === "hi" ? "एमएल अनुमानित मूल्य" : "ML Estimated Price"}
                  </span>
                  <h3 className="text-2xl font-black text-stone-900 mt-0.5">
                    ₹{predictionResult.predictedPriceINR?.toLocaleString("en-IN")}
                  </h3>
                </div>
                <div className="px-2.5 py-1 bg-stone-100 rounded-lg text-stone-600 text-[10px] font-bold uppercase border border-stone-200">
                  {language === "hi" ? "बाज़ार तुलना अनुपलब्ध" : "Current market comparison unavailable"}
                </div>
              </div>

              {predictionResult.lowerBoundINR !== null && predictionResult.upperBoundINR !== null && (
                <div className="mt-2 text-xs text-stone-600 font-medium">
                  {language === "hi" ? "मॉडल अनुमान दायरा: " : "Model estimate range: "}
                  <span className="font-bold text-stone-800">
                    ₹{predictionResult.lowerBoundINR.toLocaleString("en-IN")} – ₹{predictionResult.upperBoundINR.toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              <p className="text-[11px] text-stone-500 font-medium mt-2 pt-2 border-t border-orange-200/60">
                {language === "hi"
                  ? "उत्पाद विशेषताओं एवं कारीगर लागत के आधार पर अनुमानित। वर्तमान बाज़ार तुलना अनुपलब्ध है।"
                  : "Estimated from product attributes and artisan costs. Current market comparison is unavailable."}
              </p>
            </div>
          )}

          {/* State C: FULL_MARKET_AWARE */}
          {predictionResult.status === "FULL_MARKET_AWARE" && (
            <div className="p-4 bg-emerald-50/80 rounded-2xl border-2 border-emerald-500 text-emerald-950 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                    {language === "hi" ? "अनुशंसित बिक्री मूल्य" : "Recommended Selling Price"}
                  </span>
                  <h3 className="text-2xl font-black text-stone-900 mt-0.5">
                    ₹{predictionResult.predictedPriceINR?.toLocaleString("en-IN")}
                  </h3>
                </div>
                <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-md">
                  ★ Market Verified
                </span>
              </div>

              {predictionResult.lowerBoundINR !== null && predictionResult.upperBoundINR !== null && (
                <div className="mt-2 text-xs text-stone-700 font-medium">
                  {language === "hi" ? "मॉडल अनुमान दायरा: " : "Model estimate range: "}
                  <span className="font-bold text-emerald-950">
                    ₹{predictionResult.lowerBoundINR.toLocaleString("en-IN")} – ₹{predictionResult.upperBoundINR.toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              <p className="text-[11px] text-stone-600 font-medium mt-2 pt-2 border-t border-emerald-200">
                {language === "hi"
                  ? "आपके उत्पाद विवरण, उत्पादन लागत और सत्यापित बाज़ार अवलोकनों पर आधारित।"
                  : "Based on your product details, production costs, and verified market observations."}
              </p>
            </div>
          )}

          {/* 7. SECTION 5: COST SANITY CHECK */}
          <div className="p-3.5 bg-white rounded-2xl border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-stone-100">
              <div>
                <span className="text-stone-500 block text-[10px] uppercase font-bold">
                  {language === "hi" ? "उत्पादन लागत" : "Production Cost"}
                </span>
                <span className="text-sm font-bold text-stone-900">
                  ₹{estimatedProductionCost.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="text-right">
                <span className="text-stone-500 block text-[10px] uppercase font-bold">
                  {language === "hi" ? "एमएल अनुमान" : "ML Estimate"}
                </span>
                <span className="text-sm font-bold text-stone-900">
                  {predictionResult.predictedPriceINR !== null
                    ? `₹${predictionResult.predictedPriceINR.toLocaleString("en-IN")}`
                    : language === "hi" ? "डेटा प्रतीक्षारत" : "Awaiting Data"}
                </span>
              </div>
            </div>

            {/* Below-Cost Warning (Rule 5) */}
            {predictionResult.costSanityCheck?.isBelowCost && (
              <div className="mt-2.5 p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="font-medium leading-relaxed">
                  {language === "hi"
                    ? "यह बाज़ार अनुमान आपकी रिपोर्ट की गई उत्पादन लागत से कम है। कृपया लागत की समीक्षा करें या अधिक बिक्री मूल्य चुनें।"
                    : "This market estimate is below your reported production cost. Consider reviewing costs or choosing a higher selling price."}
                </p>
              </div>
            )}
          </div>

          {/* 8. SECTION 6: PRICING BASIS / TRANSPARENCY (Expandable) */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTransparency(!showTransparency)}
              className="w-full p-3 flex items-center justify-between text-left hover:bg-stone-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-stone-500" />
                <span className="text-xs font-bold text-stone-800 uppercase tracking-wide">
                  {language === "hi" ? "इसकी गणना कैसे की गई?" : "How was this calculated?"}
                </span>
              </div>
              {showTransparency ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
            </button>

            {showTransparency && (
              <div className="px-3.5 pb-3.5 pt-1 border-t border-stone-100 text-xs space-y-1.5 bg-stone-50/40">
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500">Product Attributes:</span>
                  <span className="font-semibold text-stone-800 capitalize">{categoryNorm} / {subcategoryNorm}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500">Material & Craft:</span>
                  <span className="font-semibold text-stone-800">{material} • {craftTechnique}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500">Dimensions / Weight:</span>
                  <span className="font-semibold text-stone-800">{dimensions} • {weight}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500">Production Cost Breakdown:</span>
                  <span className="font-semibold text-stone-800">
                    Mat ₹{rawMaterialCost} + Lab ₹{laborCost} + Pack ₹{packagingCost}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500">Verified Market Data:</span>
                  <span className="font-semibold text-stone-800">
                    {predictionResult.status === "FULL_MARKET_AWARE"
                      ? "Aggregated verified observations active"
                      : "None / Market data unavailable"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-stone-500">ML Model Version:</span>
                  <span className="font-mono text-[11px] text-stone-700">{predictionResult.modelVersion}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. SECTION 7: ARTISAN FINAL CONTROL (Your Selling Price) */}
      <div className="mt-3.5 bg-white rounded-2xl border-2 border-stone-300 p-3.5 shadow-xs">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
            <IndianRupee className="w-4 h-4 text-[#EA580C]" />
            {language === "hi" ? "आपका अंतिम बिक्री मूल्य" : "Your Selling Price"}
          </label>
          <span className="text-[10px] font-bold text-[#EA580C] uppercase">
            Artisan Decision
          </span>
        </div>

        <div className="mt-2 flex items-center bg-stone-50 rounded-xl border border-stone-300 px-3 py-2 focus-within:border-[#EA580C] focus-within:ring-2 focus-within:ring-orange-100 transition-all">
          <span className="text-xl font-bold text-stone-700 mr-2">₹</span>
          <input
            type="number"
            min={estimatedProductionCost || 0}
            step="10"
            value={artisanSellingPrice || ""}
            onChange={(e) => setArtisanSellingPrice(parseInt(e.target.value) || 0)}
            className="w-full bg-transparent font-black text-xl text-stone-900 focus:outline-none"
            placeholder={estimatedProductionCost.toString()}
          />
        </div>

        <p className="text-[11px] text-stone-500 font-medium mt-1.5">
          {language === "hi"
            ? "आप हमेशा अपने अंतिम बिक्री मूल्य के नियंत्रण में हैं।"
            : "You are always in control of your final selling price."}
        </p>

        {artisanSellingPrice < estimatedProductionCost && (
          <div className="mt-2 text-[11px] font-semibold text-amber-700 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>
              {language === "hi"
                ? "चेतावनी: यह मूल्य आपकी उत्पादन लागत (₹" + estimatedProductionCost + ") से कम है।"
                : "Notice: This price is below your production cost (₹" + estimatedProductionCost + ")."}
            </span>
          </div>
        )}
      </div>

      {/* 10. Proceed to Publish Primary Action */}
      <div className="mt-4 pt-3 border-t border-stone-200">
        <button
          type="button"
          onClick={handleProceed}
          className="w-full py-3.5 rounded-xl bg-[#EA580C] hover:bg-[#c2410c] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform"
        >
          <span>
            {language === "hi"
              ? `₹${Number(artisanSellingPrice || estimatedProductionCost).toLocaleString("en-IN")} में प्रकाशित करें`
              : `PROCEED TO PUBLISH • ₹${Number(artisanSellingPrice || estimatedProductionCost).toLocaleString("en-IN")}`}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
