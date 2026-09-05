/**
 * Kala-Kart: Virtual Business Manager for Indian Artisans & Weavers
 * Production-Grade Native Android UI & Full E-Commerce Flow
 */

import React, { useState } from "react";
import {
  CraftCategory,
  LanguageCode,
  CatalogItem,
  ArtisanUser,
  RecentOrder,
} from "./types/artisan";
import {
  CRAFT_CATEGORIES,
  INITIAL_CATALOG_ITEMS,
  RECENT_ORDERS,
} from "./data/sampleCrafts";
import { SplashScreen } from "./components/screens/SplashScreen";
import { AuthScreen } from "./components/screens/AuthScreen";
import { SellerDashboardScreen } from "./components/screens/SellerDashboardScreen";
import { InventoryScreen } from "./components/screens/InventoryScreen";
import { OnboardingScreen } from "./components/screens/OnboardingScreen";
import { ImageStudioScreen } from "./components/screens/ImageStudioScreen";
import { VoiceCatalogScreen } from "./components/screens/VoiceCatalogScreen";
import { PricingAssistantScreen } from "./components/screens/PricingAssistantScreen";
import { MarketplaceListingScreen } from "./components/screens/MarketplaceListingScreen";
import { CodeInspectorModal } from "./components/modals/CodeInspectorModal";
import { KalaKartLogo } from "./components/common/KalaKartLogo";
import {
  Sparkles,
  Code2,
  Maximize2,
  Minimize2,
  Flame,
  Camera,
  Mic,
  IndianRupee,
  ShoppingBag,
  LayoutDashboard,
  Boxes,
  User,
  PlusCircle,
} from "lucide-react";

export type AppScreen =
  | "splash"
  | "auth"
  | "dashboard"
  | "inventory"
  | "sell_onboarding"
  | "sell_studio"
  | "sell_voice"
  | "sell_pricing"
  | "sell_publish";

export default function App() {
  // Navigation & User State
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("splash");
  const [user, setUser] = useState<ArtisanUser | null>(null);
  const [language, setLanguage] = useState<LanguageCode>("hi");

  // Catalog & Inventory Data
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>(INITIAL_CATALOG_ITEMS);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>(RECENT_ORDERS);

  // Active Flow Item Data (Step 1 to 5) - Initial photo state is empty/null
  const [selectedCraft, setSelectedCraft] = useState<CraftCategory | null>(CRAFT_CATEGORIES[0]);
  const [rawImage, setRawImage] = useState<string>("");
  const [studioImage, setStudioImage] = useState<string>("");
  const [catalogData, setCatalogData] = useState<CatalogItem | null>(INITIAL_CATALOG_ITEMS[0]);

  // UI Inspector & View controls
  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(false);
  const [isFullView, setIsFullView] = useState<boolean>(false);

  // Splash -> Auth or Dashboard
  const handleSplashFinish = () => {
    if (user) {
      setCurrentScreen("dashboard");
    } else {
      setCurrentScreen("auth");
    }
  };

  // Auth -> Dashboard
  const handleLogin = (loggedUser: ArtisanUser) => {
    setUser(loggedUser);
    setCurrentScreen("dashboard");
  };

  // Logout -> Auth
  const handleLogout = () => {
    setUser(null);
    setCurrentScreen("auth");
  };

  // Start "Sell" / "Add Item" flow
  const handleStartSellFlow = () => {
    const defaultCraft = CRAFT_CATEGORIES[0];
    setSelectedCraft(defaultCraft);
    setRawImage("");
    setStudioImage("");
    setCurrentScreen("sell_onboarding");
  };

  // Direct select and view item from dashboard/inventory
  const handleSelectItem = (item: CatalogItem) => {
    setCatalogData(item);
    setRawImage(item.originalImage);
    setStudioImage(item.studioImage);
    const matchedCraft = CRAFT_CATEGORIES.find((c) => c.id === item.category) || CRAFT_CATEGORIES[0];
    setSelectedCraft(matchedCraft);
    setCurrentScreen("sell_publish");
  };

  // Step 1 (Onboarding) -> Step 2 (Image Studio)
  const handleProceedFromOnboarding = () => {
    if (selectedCraft) {
      setRawImage("");
      setStudioImage("");
      setCurrentScreen("sell_studio");
    }
  };

  // Step 2 (Image Studio) -> Step 3 (Voice Catalog)
  const handleImageReady = (raw: string, studio: string) => {
    setRawImage(raw);
    setStudioImage(studio);
    setCurrentScreen("sell_voice");
  };

  // Step 3 (Voice Catalog) -> Step 4 (Pricing)
  const handleCatalogReady = (catalog: CatalogItem) => {
    setCatalogData(catalog);
    setCurrentScreen("sell_pricing");
  };

  // Step 4 (Pricing) -> Step 5 (Publish)
  const handlePriceSelected = (updatedCatalog: CatalogItem) => {
    setCatalogData(updatedCatalog);
    // Add or update in catalog items list
    setCatalogItems((prev) => [updatedCatalog, ...prev.filter((i) => i.id !== updatedCatalog.id)]);
    setCurrentScreen("sell_publish");
  };

  // Step 5 (Publish complete) -> Dashboard
  const handlePublishDone = () => {
    setCurrentScreen("dashboard");
  };

  // Sell Flow Step Indicator Mapping
  const sellSteps = [
    { id: "sell_onboarding", num: 1, nameHi: "कला चयन", nameEn: "Craft", icon: Flame },
    { id: "sell_studio", num: 2, nameHi: "स्टूडियो फोटो", nameEn: "Studio", icon: Camera },
    { id: "sell_voice", num: 3, nameHi: "आवाज विवरण", nameEn: "Voice AI", icon: Mic },
    { id: "sell_pricing", num: 4, nameHi: "मूल्य निर्धारण", nameEn: "Pricing", icon: IndianRupee },
    { id: "sell_publish", num: 5, nameHi: "ई-मार्केट", nameEn: "Publish", icon: ShoppingBag },
  ];

  const isSellFlow = currentScreen.startsWith("sell_");
  const currentSellStepNum = sellSteps.find((s) => s.id === currentScreen)?.num || 1;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col font-sans selection:bg-[#EA580C] selection:text-white">
      {/* Top Application Header with Kala-Kart Branding & Controls */}
      <header className="bg-[#0F172A] border-b border-slate-800 px-4 py-2.5 sticky top-0 z-40 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <KalaKartLogo
            size="md"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl shadow-md border border-slate-700/80 bg-[#FAF6ED] p-0.5"
            alt="Kala-Kart Official Logo"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                कला-कार्ट (Kala-Kart)
              </h1>
              <span className="bg-[#EA580C]/20 text-[#EA580C] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#EA580C]/30 uppercase">
                Artisan OS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              {language === "hi"
                ? "कारीगरों व बुनकरों का हैंड्स-फ्री डिजिटल बिजनेस मैनेजर"
                : "Voice-First Virtual Business Manager for Artisans"}
            </p>
          </div>
        </div>

        {/* Action buttons: App Navigation Shortcuts, Kotlin Code Inspector, Fullscreen, Language */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Quick Navigation Pills for Demo Flow */}
          <div className="hidden lg:flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
            <button
              type="button"
              onClick={() => setCurrentScreen("dashboard")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                currentScreen === "dashboard"
                  ? "bg-[#EA580C] text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>{language === "hi" ? "डैशबोर्ड" : "Dashboard"}</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentScreen("inventory")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                currentScreen === "inventory"
                  ? "bg-[#EA580C] text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>{language === "hi" ? "इन्वेंट्री" : "Inventory"}</span>
            </button>

            <button
              type="button"
              onClick={handleStartSellFlow}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                isSellFlow
                  ? "bg-[#EA580C] text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{language === "hi" ? "+ नया उत्पाद" : "+ Add Item"}</span>
            </button>
          </div>

          {/* Kotlin Code Inspector Button */}
          <button
            type="button"
            onClick={() => setIsCodeModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-bold border border-amber-500/30 shadow-xs transition-colors"
            title="Inspect Native Android Architecture"
          >
            <Code2 className="w-4 h-4" />
            <span className="hidden sm:inline">Kotlin & Compose</span>
          </button>

          {/* Toggle Phone Frame vs Full View */}
          <button
            type="button"
            onClick={() => setIsFullView(!isFullView)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition-colors hidden md:flex items-center justify-center border border-slate-700"
            title={isFullView ? "Phone Frame View" : "Full Stage View"}
          >
            {isFullView ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Language Switch */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setLanguage("hi")}
              className={`px-2 py-1 text-xs font-bold rounded-lg transition-all ${
                language === "hi"
                  ? "bg-[#EA580C] text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              हिंदी
            </button>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`px-2 py-1 text-xs font-bold rounded-lg transition-all ${
                language === "en"
                  ? "bg-[#EA580C] text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 md:p-5 overflow-hidden">
        {/* Step Progress Navigation Tracker (shown when in Sell Flow) */}
        {isSellFlow && (
          <div className="w-full max-w-md sm:max-w-lg mb-2.5 flex items-center justify-between px-3 py-2 bg-[#0F172A]/90 rounded-2xl border border-slate-800 shadow-sm backdrop-blur-xs">
            {sellSteps.map((step, idx) => {
              const Icon = step.icon;
              const isCompleted = currentSellStepNum > step.num;
              const isCurrent = currentSellStepNum === step.num;
              return (
                <React.Fragment key={step.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (step.num <= currentSellStepNum || catalogData) {
                        setCurrentScreen(step.id as AppScreen);
                      }
                    }}
                    className={`flex flex-col items-center gap-1 group transition-all ${
                      isCurrent
                        ? "scale-105"
                        : isCompleted
                        ? "opacity-90 hover:opacity-100"
                        : "opacity-40 cursor-not-allowed"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                        isCurrent
                          ? "bg-[#EA580C] text-white ring-4 ring-[#EA580C]/20 shadow-orange-900/30"
                          : isCompleted
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span
                      className={`text-[9px] font-bold ${
                        isCurrent
                          ? "text-[#EA580C]"
                          : isCompleted
                          ? "text-emerald-400"
                          : "text-slate-500"
                      }`}
                    >
                      {language === "hi" ? step.nameHi : step.nameEn}
                    </span>
                  </button>

                  {idx < sellSteps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-1 transition-all ${
                        currentSellStepNum > step.num ? "bg-emerald-500" : "bg-slate-800"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Android Device Shell Frame */}
        <div
          className={`transition-all duration-300 w-full flex items-center justify-center ${
            isFullView
              ? "max-w-4xl h-[86vh]"
              : "max-w-[420px] h-[820px] max-h-[88vh]"
          }`}
        >
          <div className="w-full h-full bg-[#0F172A] rounded-[38px] p-2 sm:p-2.5 border-4 border-slate-700/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] flex flex-col relative overflow-hidden ring-1 ring-slate-600/40">
            {/* Android Dynamic Notch & Status Bar */}
            <div className="h-6 w-full bg-[#0F172A] flex items-center justify-between px-5 select-none z-30">
              <span className="text-[11px] font-bold font-mono text-slate-300">
                12:45
              </span>
              {/* Dynamic Camera Punch Hole */}
              <div className="w-20 h-3.5 bg-black rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-900 border border-slate-800" />
              </div>
              <div className="flex items-center gap-1.5 text-slate-300 text-[11px] font-bold">
                <span>5G</span>
                <span>📶</span>
                <span>🔋 95%</span>
              </div>
            </div>

            {/* Android Screen Display Viewport */}
            <div className="flex-1 rounded-[26px] overflow-hidden relative bg-[#FDFBF7]">
              {/* 1. Splash Screen */}
              {currentScreen === "splash" && (
                <SplashScreen onFinish={handleSplashFinish} />
              )}

              {/* 2. Authentication Screen */}
              {currentScreen === "auth" && (
                <AuthScreen
                  language={language}
                  onLoginSuccess={handleLogin}
                  onLanguageChange={(lang) => setLanguage(lang)}
                />
              )}

              {/* 3. Main Seller Dashboard Screen */}
              {currentScreen === "dashboard" && (
                <SellerDashboardScreen
                  user={user}
                  language={language}
                  catalogItems={catalogItems}
                  recentOrders={recentOrders}
                  onStartSell={handleStartSellFlow}
                  onViewInventory={() => setCurrentScreen("inventory")}
                  onSelectItem={handleSelectItem}
                  onLanguageChange={(lang) => setLanguage(lang)}
                  onLogout={handleLogout}
                />
              )}

              {/* 4. Full Inventory Screen */}
              {currentScreen === "inventory" && (
                <InventoryScreen
                  items={catalogItems}
                  language={language}
                  onBack={() => setCurrentScreen("dashboard")}
                  onAddNew={handleStartSellFlow}
                  onUpdateStock={(id, newStock) => {
                    setCatalogItems((prev) =>
                      prev.map((it) => (it.id === id ? { ...it, stockCount: newStock } : it))
                    );
                  }}
                />
              )}

              {/* 5. Sell Flow: Step 1 - Craft Category & Photo Upload */}
              {currentScreen === "sell_onboarding" && (
                <OnboardingScreen
                  selectedCraft={selectedCraft}
                  onSelectCraft={(craft) => setSelectedCraft(craft)}
                  language={language}
                  onLanguageChange={(lang) => setLanguage(lang)}
                  onProceed={handleProceedFromOnboarding}
                  onBack={() => setCurrentScreen("dashboard")}
                />
              )}

              {/* 6. Sell Flow: Step 2 - AI Image Studio */}
              {currentScreen === "sell_studio" && selectedCraft && (
                <ImageStudioScreen
                  selectedCraft={selectedCraft}
                  initialRawImage={rawImage || null}
                  initialStudioImage={studioImage || null}
                  language={language}
                  onImageReady={handleImageReady}
                  onBack={() => setCurrentScreen("sell_onboarding")}
                />
              )}

              {/* 7. Sell Flow: Step 3 - Multimodal Voice Catalog Engine */}
              {currentScreen === "sell_voice" && selectedCraft && (
                <VoiceCatalogScreen
                  selectedCraft={selectedCraft}
                  studioImage={studioImage}
                  language={language}
                  catalogData={catalogData}
                  onCatalogReady={handleCatalogReady}
                  onBack={() => setCurrentScreen("sell_studio")}
                />
              )}

              {/* 8. Sell Flow: Step 4 - Smart Fair Pricing Assistant */}
              {currentScreen === "sell_pricing" && catalogData && (
                <PricingAssistantScreen
                  catalog={catalogData}
                  language={language}
                  onPriceSelected={handlePriceSelected}
                  onBack={() => setCurrentScreen("sell_voice")}
                />
              )}

              {/* 9. Sell Flow: Step 5 - Publish Listing & ONDC Syndication */}
              {currentScreen === "sell_publish" && catalogData && (
                <MarketplaceListingScreen
                  catalog={catalogData}
                  language={language}
                  onReset={handlePublishDone}
                  onBack={() => setCurrentScreen("sell_pricing")}
                />
              )}
            </div>

            {/* Android Gesture Navigation Bar Pill */}
            <div className="h-3.5 w-full flex items-center justify-center bg-[#0F172A]">
              <div className="w-28 h-1 bg-slate-500 rounded-full" />
            </div>
          </div>
        </div>
      </main>

      {/* Jetpack Compose Native Architecture Modal */}
      <CodeInspectorModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
      />
    </div>
  );
}

