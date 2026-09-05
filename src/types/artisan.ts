export type LanguageCode = "hi" | "en" | "mr" | "bn" | "ta";

export type SellerRole = "individual" | "cooperative";

export interface ArtisanUser {
  id: string;
  name: string;
  phone: string;
  role: SellerRole;
  roleTitle: string;
  roleTitleHi: string;
  craftId: string;
  craftName: string;
  location: string;
  state: string;
  avatarUrl: string;
  isVerified: boolean;
  totalEarnings: number;
  totalProductsCount: number;
  totalInquiriesCount: number;
}

export interface CraftCategory {
  id: string;
  nameEn: string;
  nameHi: string;
  subtextHi: string;
  iconName: string;
  color: string;
  defaultImage: string;
  sampleVoiceHi: string;
  sampleVoiceEn: string;
  materialDefault: string;
}

export interface ProductSpecs {
  material: string;
  weight: string;
  dimensions: string;
  color: string;
  craftTechnique: string;
  regionHeritage: string;
  // Extended fields for rich catalog
  productName?: string;
  quantity?: string;
  isHandmade?: boolean;
  productionTime?: string;
  careInstructions?: string;
  artisanStory?: string;
}

export interface ProductFacts {
  productName: string | null;
  category: string | null;
  material: string | null;
  color: string | null;
  dimensions: string | null;
  weight: string | null;
  quantity: string | null;
  craftTechnique: string | null;
  isHandmade: boolean | null;
  productionTime: string | null;
  origin?: string | null;
  careInstructions?: string | null;
  artisanStory?: string | null;
}

export interface MissingFieldItem {
  field: string;
  labelEn: string;
  labelHi: string;
  promptEn: string;
  promptHi: string;
}

export interface VoiceConversationTurn {
  id: string;
  speaker: "artisan" | "system";
  text: string;
  timestamp: string;
  language?: "hi" | "en" | "mixed";
}

export interface VoiceTurnResponse {
  success: boolean;
  productFacts: ProductFacts;
  missingFields: MissingFieldItem[];
  isComplete: boolean;
  followUpPromptEn: string;
  followUpPromptHi: string;
  finalListing?: CatalogItem | null;
  error?: string;
  source?: string;
}

export interface PricingTiers {
  baseCost: number; // Break-even + basic wage
  marketPrice: number; // Competitive online rate
  exhibitionPrice: number; // Premium / B2B rate
  explanationHi: string;
  explanationEn: string;
  selectedTier: "base" | "market" | "exhibition";
}

export type StudioPreset = "clean-studio" | "soft-pedestal" | "warm-daylight";

export interface StudioOptions {
  preset?: StudioPreset;
  lightingMode: "studio-soft" | "warm-craft" | "exhibition-spotlight";
  brightness: number; // 0.8 to 1.3
  contrast: number; // 0.9 to 1.4
  sharpness: number; // 1 to 3
  backdropType: "clean-studio" | "soft-pedestal" | "warm-daylight" | "pedestal" | "warm-terracotta" | "slate-luxury" | "soft-white";
  showDropShadow: boolean;
}

export interface CatalogItem {
  id: string;
  category: string;
  originalImage: string;
  studioImage: string;
  specs: ProductSpecs;
  titleHi: string;
  titleEn: string;
  descriptionHi: string;
  descriptionEn: string;
  searchTags: string[];
  pricing: PricingTiers;
  createdAt: string;
  status: "live" | "sold" | "draft" | "pending";
  viewsCount?: number;
  ordersCount?: number;
  marketplacePlatforms: string[];
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  buyerName: string;
  buyerType: "gem" | "ondc" | "b2b_wholesale" | "retail";
  buyerTypeLabel: string;
  itemTitle: string;
  itemImage: string;
  quantity: number;
  amount: number;
  status: "completed" | "processing" | "shipped" | "new";
  date: string;
}

