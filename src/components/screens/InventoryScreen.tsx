import React, { useState } from "react";
import { 
  Search, 
  Filter, 
  Package, 
  Sparkles, 
  Share2, 
  QrCode, 
  ArrowLeft, 
  Plus, 
  CheckCircle2, 
  ExternalLink,
  Tag
} from "lucide-react";
import { CatalogItem, LanguageCode } from "../../types/artisan";
import { TTSButton } from "../common/TTSButton";

interface InventoryScreenProps {
  items: CatalogItem[];
  language: LanguageCode;
  onSelectItem?: (item: CatalogItem) => void;
  onAddNew: () => void;
  onBack?: () => void;
  onBackToDashboard?: () => void;
  onUpdateStock?: (id: string, newStock: number) => void;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  items,
  language,
  onSelectItem,
  onAddNew,
  onBack,
  onBackToDashboard,
}) => {
  const handleBack = onBack || onBackToDashboard || (() => {});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "live" | "sold" | "draft">("all");
  const [selectedQrItem, setSelectedQrItem] = useState<CatalogItem | null>(null);

  const filteredItems = items.filter((item) => {
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesSearch =
      item.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.titleHi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.specs.material.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-[#FDFBF7] text-[#0F172A] p-4 sm:p-5 overflow-y-auto font-sans">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold text-[#0F172A] tracking-tight">
              {language === "hi" ? "मेरा उत्पाद भंडार (Inventory)" : "My Craft Inventory"}
            </h2>
            <span className="text-[10px] text-stone-500 font-semibold uppercase">
              {items.length} {language === "hi" ? "कुल उत्पाद सूचीबद्ध" : "Total Catalog Items"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onAddNew}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#EA580C] hover:bg-[#c2410c] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{language === "hi" ? "नया जोड़ें" : "Add Item"}</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="mt-3.5 space-y-2">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === "hi"
                ? "उत्पाद का नाम, सामग्री या टैग खोजें..."
                : "Search by title, material, or heritage..."
            }
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-white border border-stone-300 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/20 shadow-xs"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              statusFilter === "all"
                ? "bg-[#0F172A] text-white shadow-xs"
                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
            }`}
          >
            {language === "hi" ? "सभी (" + items.length + ")" : "All (" + items.length + ")"}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("live")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              statusFilter === "live"
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
            }`}
          >
            ● {language === "hi" ? "लाइव बिक्री (" + items.filter((i) => i.status === "live").length + ")" : "Live (" + items.filter((i) => i.status === "live").length + ")"}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("sold")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              statusFilter === "sold"
                ? "bg-stone-800 text-white shadow-xs"
                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
            }`}
          >
            {language === "hi" ? "बिक चुका (" + items.filter((i) => i.status === "sold").length + ")" : "Sold Out (" + items.filter((i) => i.status === "sold").length + ")"}
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="mt-3 space-y-3 flex-1">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-stone-300 p-6">
            <Package className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-[#0F172A]">
              {language === "hi" ? "कोई उत्पाद नहीं मिला" : "No craft items found"}
            </h4>
            <p className="text-xs text-stone-500 mt-1">
              {language === "hi" ? "नया हस्तशिल्प उत्पाद जोड़ने के लिए ऊपर '+ नया जोड़ें' बटन दबाएं।" : "Tap '+ Add Item' to photograph and digitize a new product."}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const activePrice =
              item.pricing.selectedTier === "base"
                ? item.pricing.baseCost
                : item.pricing.selectedTier === "market"
                ? item.pricing.marketPrice
                : item.pricing.exhibitionPrice;

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem && onSelectItem(item)}
                role="button"
                tabIndex={0}
                className="p-3 bg-white rounded-2xl border border-stone-200 shadow-xs hover:border-[#EA580C] hover:shadow-md transition-all cursor-pointer flex flex-col gap-2.5 group"
              >
                <div className="flex items-start gap-3">
                  <div className="relative w-20 h-20 rounded-xl bg-stone-900 overflow-hidden flex-shrink-0">
                    <img
                      src={item.studioImage || item.originalImage}
                      alt={item.titleEn}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <span
                      className={`absolute top-1 left-1 text-[8px] font-extrabold px-1.5 py-0.2 rounded-md uppercase ${
                        item.status === "live"
                          ? "bg-emerald-600 text-white"
                          : item.status === "sold"
                          ? "bg-stone-800 text-stone-300"
                          : "bg-amber-500 text-white"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-extrabold text-xs sm:text-sm text-[#0F172A] leading-snug line-clamp-1">
                        {language === "hi" ? item.titleHi : item.titleEn}
                      </h4>
                    </div>

                    <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                      🧱 {item.specs.material} • ⚖️ {item.specs.weight}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-black text-[#EA580C]">
                        ₹{activePrice.toLocaleString("en-IN")}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedQrItem(item);
                          }}
                          className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors"
                          title="View QR Code"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                        <TTSButton
                          text={language === "hi" ? item.titleHi + ". मूल्य ₹" + activePrice : item.titleEn + ". Price ₹" + activePrice}
                          lang={language}
                          size="sm"
                          variant="iconOnly"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Platforms Tags */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-[10px]">
                  <div className="flex flex-wrap gap-1">
                    {item.marketplacePlatforms.slice(0, 2).map((plat) => (
                      <span
                        key={plat}
                        className="bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded font-medium"
                      >
                        {plat}
                      </span>
                    ))}
                  </div>
                  <span className="text-stone-400 font-mono text-[9px]">
                    ID: #{item.id.toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* QR Modal */}
      {selectedQrItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 border border-stone-200 shadow-2xl text-center space-y-3">
            <h3 className="text-sm font-black text-[#0F172A]">
              {language === "hi" ? selectedQrItem.titleHi : selectedQrItem.titleEn}
            </h3>
            <p className="text-xs text-stone-500">
              Scan to purchase directly via ONDC Karigar at ₹
              {selectedQrItem.pricing.marketPrice}
            </p>
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 inline-block">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https://kala-kart.app/item/${selectedQrItem.id}?price=${selectedQrItem.pricing.marketPrice}`}
                alt="Product QR"
                className="w-36 h-36 mx-auto"
              />
            </div>
            <button
              type="button"
              onClick={() => setSelectedQrItem(null)}
              className="w-full py-2.5 bg-[#0F172A] text-white rounded-xl text-xs font-bold hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
