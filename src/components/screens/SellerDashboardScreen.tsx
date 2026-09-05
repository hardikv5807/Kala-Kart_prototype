import React, { useState } from "react";
import { 
  TrendingUp, 
  Package, 
  Eye, 
  PlusCircle, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  ChevronRight,
  IndianRupee,
  Camera,
  Mic,
  Tag,
  Boxes,
  Plus,
  ShoppingBag,
  ExternalLink,
  Share2,
  Calendar,
  User,
  ShieldCheck
} from "lucide-react";
import { 
  ArtisanUser, 
  CatalogItem, 
  RecentOrder, 
  LanguageCode 
} from "../../types/artisan";
import { DEFAULT_USER } from "../../data/sampleCrafts";
import { TTSButton } from "../common/TTSButton";

interface SellerDashboardScreenProps {
  user: ArtisanUser | null;
  catalogItems: CatalogItem[];
  recentOrders: RecentOrder[];
  language: LanguageCode;
  onStartSell: () => void;
  onStartNewListing?: () => void;
  onViewInventory: () => void;
  onSelectItem?: (item: CatalogItem) => void;
  onLanguageChange?: (lang: LanguageCode) => void;
  onLogout?: () => void;
}

export const SellerDashboardScreen: React.FC<SellerDashboardScreenProps> = ({
  user = DEFAULT_USER,
  catalogItems,
  recentOrders,
  language,
  onStartSell,
  onStartNewListing,
  onViewInventory,
  onSelectItem,
}) => {
  const [selectedOrder, setSelectedOrder] = useState<RecentOrder | null>(null);

  // Fallback to onStartSell if onStartNewListing was passed, or vice versa
  const handleTriggerSell = () => {
    if (onStartSell) {
      onStartSell();
    } else if (onStartNewListing) {
      onStartNewListing();
    }
  };

  const activeUser = user || DEFAULT_USER;
  const totalSales = activeUser.totalEarnings.toLocaleString("en-IN");
  const totalItems = catalogItems.length;

  const audioSummaryHi = `नमस्ते ${activeUser.name} जी! इस महीने आपने ${totalItems} उत्पादों के माध्यम से कुल ₹${totalSales} की बिक्री की है। नए उत्पाद जोड़ने के लिए नीचे दिए गए नारंगी बटन पर टैप करें।`;
  const audioSummaryEn = `Hello ${activeUser.name}! You have earned ₹${totalSales} across ${totalItems} listed craft items this month. Tap the orange button to sell a new craft product.`;

  return (
    <div className="flex flex-col h-full bg-[#FDFBF7] text-[#0F172A] p-4 sm:p-5 overflow-y-auto font-sans relative select-none">
      {/* Top Profile Header Bar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <img
              src={activeUser.avatarUrl}
              alt={activeUser.name}
              className="w-11 h-11 rounded-2xl object-cover border-2 border-[#EA580C] shadow-xs"
            />
            {activeUser.isVerified && (
              <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
                {activeUser.name}
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-[#EA580C] uppercase tracking-wider">
                {activeUser.role === "individual" ? "Shilp Guru" : "Co-op"}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 font-normal">
              📍 {activeUser.location}, {activeUser.state}
            </p>
          </div>
        </div>

        {/* Audio Summary Speaker Button */}
        <div className="flex items-center gap-2">
          <TTSButton
            text={language === "hi" ? audioSummaryHi : audioSummaryEn}
            lang={language}
            variant="pill"
            size="sm"
            label={language === "hi" ? "रिपोर्ट सुनें" : "Listen Summary"}
          />
        </div>
      </div>

      {/* Primary CTA Banner: "Sell New Craft / Add New Product" */}
      <div className="mt-3.5">
        <button
          type="button"
          onClick={handleTriggerSell}
          className="w-full p-4 bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white rounded-2xl flex items-center justify-between shadow-xl shadow-slate-950/20 active:scale-[0.98] transition-all group border border-slate-700 hover:border-[#EA580C]"
        >
          <div className="flex items-center gap-3 text-left">
            <div className="w-11 h-11 rounded-xl bg-[#EA580C] flex items-center justify-center text-white shadow-md shadow-orange-950/40 group-hover:scale-105 transition-transform flex-shrink-0">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-400 block">
                {language === "hi" ? "AI कैमरा व स्टूडियो एनहांसर" : "AI Camera & Studio Enhancer"}
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                {language === "hi" ? "+ नया उत्पाद बेचें (Sell New Craft)" : "+ SELL NEW CRAFT PRODUCT"}
              </h3>
              <p className="text-[11px] text-slate-300 font-normal mt-0.5">
                {language === "hi" ? "फोटो खींचें • आवाज से विवरण • 1-क्लिक ONDC" : "Snap photo • Voice catalog • 1-Click ONDC"}
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-[#EA580C] transition-colors flex-shrink-0">
            <ArrowRight className="w-4 h-4 text-white" />
          </div>
        </button>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={handleTriggerSell}
          className="p-2.5 bg-white rounded-xl border border-stone-200 shadow-2xs hover:border-[#EA580C] hover:shadow-xs transition-all flex flex-col items-center text-center group active:scale-95"
        >
          <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#EA580C] flex items-center justify-center mb-1 group-hover:bg-[#EA580C] group-hover:text-white transition-colors">
            <Camera className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-semibold text-[#0F172A] leading-tight">
            {language === "hi" ? "फोटो स्टूडियो" : "AI Studio"}
          </span>
          <span className="text-[9px] font-normal text-stone-500">
            {language === "hi" ? "कैमरा तस्वीर" : "Camera Snap"}
          </span>
        </button>

        <button
          type="button"
          onClick={handleTriggerSell}
          className="p-2.5 bg-white rounded-xl border border-stone-200 shadow-2xs hover:border-[#EA580C] hover:shadow-xs transition-all flex flex-col items-center text-center group active:scale-95"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-1 group-hover:bg-amber-500 group-hover:text-white transition-colors">
            <Mic className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-semibold text-[#0F172A] leading-tight">
            {language === "hi" ? "वॉइस कैटलॉग" : "Voice AI"}
          </span>
          <span className="text-[9px] font-normal text-stone-500">
            {language === "hi" ? "आवाज विवरण" : "Bilingual"}
          </span>
        </button>

        <button
          type="button"
          onClick={onViewInventory}
          className="p-2.5 bg-white rounded-xl border border-stone-200 shadow-2xs hover:border-[#EA580C] hover:shadow-xs transition-all flex flex-col items-center text-center group active:scale-95"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-1 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Boxes className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-semibold text-[#0F172A] leading-tight">
            {language === "hi" ? "इन्वेंट्री स्टॉक" : "Inventory"}
          </span>
          <span className="text-[9px] font-normal text-stone-500">
            {catalogItems.length} {language === "hi" ? "उत्पाद" : "Items"}
          </span>
        </button>
      </div>

      {/* 3 Quick Performance Analytics Cards */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
            {language === "hi" ? "व्यापार विश्लेषण (Overview)" : "Performance Analytics"}
          </h3>
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
            ● Live Sync
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Total Sales Revenue */}
          <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                {language === "hi" ? "कुल कमाई" : "Revenue"}
              </span>
              <IndianRupee className="w-3.5 h-3.5 text-[#EA580C]" />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-bold text-[#0F172A] leading-none">
                ₹{activeUser.totalEarnings.toLocaleString("en-IN")}
              </h4>
              <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5 mt-1">
                <TrendingUp className="w-2.5 h-2.5" /> +18.4%
              </span>
            </div>
          </div>

          {/* Total Listed Products */}
          <div 
            onClick={onViewInventory}
            role="button"
            tabIndex={0}
            className="p-3 bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between cursor-pointer hover:border-orange-300 transition-colors"
          >
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                {language === "hi" ? "उत्पाद" : "Listed"}
              </span>
              <Package className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-bold text-[#0F172A] leading-none">
                {catalogItems.length}
              </h4>
              <span className="text-[10px] font-medium text-stone-500 block mt-1">
                {catalogItems.filter(i => i.status === "live").length} {language === "hi" ? "लाइव" : "Live"}
              </span>
            </div>
          </div>

          {/* Views & Inquiries */}
          <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                {language === "hi" ? "पूछताछ" : "Inquiries"}
              </span>
              <Eye className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-bold text-[#0F172A] leading-none">
                {activeUser.totalInquiriesCount}
              </h4>
              <span className="text-[10px] font-medium text-purple-700 block mt-1">
                34 {language === "hi" ? "नए खरीदार" : "Leads"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Listings Carousel */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {language === "hi" ? "सक्रिय उत्पाद (Active Listings)" : "Active Products Carousel"}
            </h3>
            <span className="text-[10px] font-semibold text-stone-400">
              ({catalogItems.length})
            </span>
          </div>
          <button
            type="button"
            onClick={onViewInventory}
            className="text-xs text-[#EA580C] font-semibold flex items-center gap-0.5 hover:underline"
          >
            <span>{language === "hi" ? "सभी देखें" : "View All"}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Horizontal Scrollable Carousel */}
        <div className="flex gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar snap-x">
          {catalogItems.map((item) => {
            const activePrice =
              item.pricing.selectedTier === "base"
                ? item.pricing.baseCost
                : item.pricing.selectedTier === "market"
                ? item.pricing.marketPrice
                : item.pricing.exhibitionPrice;

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (onSelectItem) {
                    onSelectItem(item);
                  } else {
                    onViewInventory();
                  }
                }}
                role="button"
                tabIndex={0}
                className="w-48 sm:w-52 flex-shrink-0 snap-start bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden cursor-pointer hover:border-[#EA580C] hover:shadow-md transition-all flex flex-col group"
              >
                {/* Photo with status badge */}
                <div className="relative w-full h-32 bg-stone-900 overflow-hidden">
                  <img
                    src={item.studioImage || item.originalImage}
                    alt={item.titleEn}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Status Badge */}
                  <span
                    className={`absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shadow-xs ${
                      item.status === "live"
                        ? "bg-emerald-600 text-white"
                        : item.status === "sold"
                        ? "bg-stone-800 text-stone-300"
                        : "bg-amber-500 text-white"
                    }`}
                  >
                    {item.status === "live" ? "● Live" : item.status === "sold" ? "Sold Out" : "Draft"}
                  </span>

                  {/* Price Tag */}
                  <div className="absolute bottom-2 right-2 bg-[#0F172A]/90 text-white px-2 py-0.5 rounded-lg text-xs font-bold backdrop-blur-xs border border-white/20">
                    ₹{activePrice.toLocaleString("en-IN")}
                  </div>
                </div>

                {/* Details */}
                <div className="p-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-xs text-[#0F172A] line-clamp-1 leading-snug">
                      {language === "hi" ? item.titleHi : item.titleEn}
                    </h4>
                    <p className="text-[10px] text-stone-500 font-normal line-clamp-1 mt-0.5">
                      {item.specs.material}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-stone-100 text-[10px] text-stone-500 font-medium">
                    <span>{item.viewsCount || 120} {language === "hi" ? "व्यूज" : "views"}</span>
                    <span className="text-[#EA580C] font-semibold flex items-center gap-0.5">
                      {language === "hi" ? "विवरण" : "Details"} <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* "+ Add New Craft" Action Card at end of Carousel */}
          <div
            onClick={handleTriggerSell}
            role="button"
            tabIndex={0}
            className="w-40 sm:w-44 flex-shrink-0 snap-start bg-orange-50/50 rounded-2xl border-2 border-dashed border-orange-300 hover:border-[#EA580C] hover:bg-orange-50 cursor-pointer transition-all flex flex-col items-center justify-center p-4 text-center group active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-[#EA580C] text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#EA580C] leading-tight">
              {language === "hi" ? "+ नया उत्पाद" : "+ Add Craft"}
            </span>
            <span className="text-[10px] text-stone-500 font-normal mt-1">
              {language === "hi" ? "कैमरा से जोड़ें" : "Launch Camera"}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Orders & B2B Inquiries Section */}
      <div className="mt-4 pb-14">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {language === "hi" ? "ताज़ा ऑर्डर व खरीदार मांग (Recent Orders)" : "Recent Orders & B2B Demands"}
            </h3>
          </div>
          <span className="text-[10px] font-medium text-stone-400">
            GeM / ONDC / FabIndia
          </span>
        </div>

        <div className="space-y-2">
          {recentOrders.map((order) => (
            <div
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              role="button"
              tabIndex={0}
              className="p-3 bg-white rounded-xl border border-stone-200 shadow-xs flex items-center justify-between gap-3 cursor-pointer hover:border-stone-300 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={order.itemImage}
                  alt={order.itemTitle}
                  className="w-11 h-11 rounded-lg object-cover flex-shrink-0 border border-stone-200"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded uppercase bg-stone-100 text-stone-700">
                      {order.buyerType === "gem" ? "🏛️ GeM Govt" : order.buyerType === "b2b_wholesale" ? "🏢 Wholesale" : "🛍️ ONDC Retail"}
                    </span>
                    <span className="text-[10px] font-mono text-stone-400">
                      {order.orderNumber}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-[#0F172A] truncate mt-0.5">
                    {order.buyerName}
                  </h4>
                  <p className="text-[11px] text-stone-500 font-normal truncate">
                    {order.quantity}x {order.itemTitle}
                  </p>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <span className="text-xs sm:text-sm font-bold text-[#0F172A] block">
                  ₹{order.amount.toLocaleString("en-IN")}
                </span>
                <span
                  className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full inline-block mt-0.5 uppercase ${
                    order.status === "completed"
                      ? "bg-emerald-100 text-emerald-800"
                      : order.status === "shipped"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Action Button (FAB): "Sell New Craft" */}
      <button
        type="button"
        onClick={handleTriggerSell}
        className="fixed bottom-4 right-4 z-40 bg-[#EA580C] hover:bg-[#c2410c] text-white px-4 py-3 rounded-full shadow-2xl shadow-orange-950/40 flex items-center gap-2 border-2 border-white font-semibold text-xs sm:text-sm active:scale-95 transition-all group"
        title="Sell New Craft / Camera Studio"
      >
        <Camera className="w-4 h-4 group-hover:scale-110 transition-transform" />
        <span>{language === "hi" ? "+ नया उत्पाद बेचें" : "+ Sell Craft"}</span>
      </button>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 border border-stone-200 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">Order Details</span>
                <h3 className="text-sm font-bold text-[#0F172A]">{selectedOrder.orderNumber}</h3>
              </div>
              <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                {selectedOrder.status}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <img
                src={selectedOrder.itemImage}
                alt={selectedOrder.itemTitle}
                className="w-14 h-14 rounded-xl object-cover border border-stone-200"
              />
              <div>
                <h4 className="font-semibold text-xs text-[#0F172A]">{selectedOrder.itemTitle}</h4>
                <p className="text-xs text-stone-500 font-normal mt-0.5">Quantity: {selectedOrder.quantity} units</p>
                <p className="text-sm font-bold text-[#EA580C] mt-1">₹{selectedOrder.amount.toLocaleString("en-IN")}</p>
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-500 font-normal">Buyer:</span>
                <span className="font-semibold text-[#0F172A]">{selectedOrder.buyerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-normal">Channel:</span>
                <span className="font-semibold text-stone-700">{selectedOrder.buyerTypeLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-normal">Ordered:</span>
                <span className="font-medium text-stone-600">{selectedOrder.date}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleTriggerSell}
                className="flex-1 py-2.5 bg-[#EA580C] text-white rounded-xl text-xs font-semibold hover:bg-[#c2410c] flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === "hi" ? "नया जोड़ें" : "Add Similar"}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="flex-1 py-2.5 bg-stone-100 text-stone-700 rounded-xl text-xs font-semibold hover:bg-stone-200"
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
