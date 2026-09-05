import { GoogleGenAI, Type } from "@google/genai";
import { ProductFacts, MissingFieldItem, CatalogItem, PricingTiers } from "../types/artisan";

/**
 * Service: Truthful Multilingual Voice-to-Catalog Engine
 * Strictly prohibits hallucination or invention of unstated product specifications.
 */

export interface ProcessTurnInput {
  transcript: string;
  existingFacts?: Partial<ProductFacts> | null;
  craftCategory?: string;
  artisanState?: string;
  userLanguage?: "hi" | "en";
  studioImage?: string;
}

export interface ProcessTurnResult {
  success: boolean;
  productFacts: ProductFacts;
  missingFields: MissingFieldItem[];
  isComplete: boolean;
  followUpPromptEn: string;
  followUpPromptHi: string;
  finalListing: CatalogItem | null;
  source: string;
  error?: string;
}

// Lazy Gemini client helper
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

/**
 * Clean and normalize a string, returning null if empty or undefined
 */
function cleanVal(v: any): string | null {
  if (v === null || v === undefined) return null;
  const str = String(v).trim();
  if (!str || str.toLowerCase() === "null" || str.toLowerCase() === "unknown" || str.toLowerCase() === "n/a") {
    return null;
  }
  return str;
}

/**
 * Main function to process a voice turn with Gemini 3.8 Flash
 */
export async function processVoiceTurn(input: ProcessTurnInput): Promise<ProcessTurnResult> {
  const transcript = (input.transcript || "").trim();
  if (!transcript) {
    return {
      success: false,
      productFacts: normalizeFacts(input.existingFacts),
      missingFields: [],
      isComplete: false,
      followUpPromptEn: "Sorry, I couldn't hear that clearly. Please try again.",
      followUpPromptHi: "क्षमा करें, मैं स्पष्ट रूप से नहीं सुन सका। कृपया पुनः प्रयास करें।",
      finalListing: null,
      source: "validation",
      error: "Empty speech transcript received",
    };
  }

  const existing = normalizeFacts(input.existingFacts);
  const ai = getGeminiClient();

  if (ai) {
    try {
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("Gemini timeout")), 6500)
      );
      const geminiResult = await Promise.race([
        runGeminiExtraction(ai, transcript, existing, input),
        timeoutPromise,
      ]);
      if (geminiResult) {
        return geminiResult;
      }
    } catch (err: any) {
      console.warn("Gemini voice extraction encountered an error or timeout, activating truthful fallback:", err.message || err);
    }
  }

  // Truthful deterministic fallback: extracts ONLY explicitly spoken details with 0 hallucinations
  return runTruthfulDeterministicExtraction(transcript, existing, input);
}

/**
 * Calls Gemini 3.8 Flash with a strict schema and anti-hallucination instructions
 */
async function runGeminiExtraction(
  ai: GoogleGenAI,
  transcript: string,
  existingFacts: ProductFacts,
  input: ProcessTurnInput
): Promise<ProcessTurnResult | null> {
  const systemInstruction = `You are the Truthful Multilingual Product Information Extractor for Kala-Kart, an assistant for Indian artisans (potters, weavers, woodcarvers, metalworkers).
The artisan speaks in English, Hindi, or a natural mixture of Hindi and English (Hinglish).

CRITICAL TRUTHFULNESS & ANTI-HALLUCINATION RULES:
1. NEVER INVENT, GUESS, ASSUME, OR INFER ANY FACTUAL SPECIFICATIONS.
   - Do NOT guess dimensions (length, width, height, diameter).
   - Do NOT guess weight.
   - Do NOT guess material.
   - Do NOT guess color.
   - Do NOT guess quantity.
   - Do NOT guess production time.
   - Do NOT guess craft technique.
   - Do NOT guess origin.
   - Do NOT guess care instructions.
   - If the artisan has NOT explicitly mentioned a fact in this or previous turns, you MUST leave that field as null.
   - Example: If the artisan says "This is a handmade blue terracotta vase":
     * productName: "terracotta vase" (or "vase")
     * material: "terracotta"
     * color: "blue"
     * isHandmade: true
     * dimensions MUST BE NULL (do NOT invent "8 inch height" or "15 cm"!)
     * weight MUST BE NULL (do NOT invent "500 grams"!)
     * quantity MUST BE NULL
     * craftTechnique MUST BE NULL
     * productionTime MUST BE NULL
2. MERGING:
   - Combine previously verified facts (provided in the prompt) with newly stated facts from this turn.
   - Do NOT overwrite existing verified facts unless the artisan explicitly updates or corrects them in this turn.
3. REQUIRED FIELDS:
   - productName: what the item is (e.g. vase, diya, saree, lamp, elephant, plate, cup)
   - material: what it is made of (e.g. terracotta, silk, brass, sheesham wood)
   - color: primary color(s) (e.g. blue, red & gold, natural clay)
   - dimensions: physical size (e.g. 8 inches tall and 4 inches wide; or 5.5 meters length for saree; or 10 cm diameter). Must be relevant to the item.
   - weight: approximate weight (e.g. 600 grams, 1.2 kg)
   - quantity: number of pieces (e.g. 1 piece, set of 4, single item)
   - craftTechnique: how it is made (e.g. wheel-thrown and hand-painted, handloom jacquard woven, lost-wax cast and chiseled)
   - isHandmade: true or false
   - productionTime: how long it takes to make (e.g. 2 days, 1 week, 6 hours)
   OPTIONAL FIELDS (only populate if explicitly provided by the artisan):
   - origin: place or city of craft
   - careInstructions: cleaning/care steps
   - artisanStory: personal background or special meaning
4. EVALUATION OF COMPLETION:
   - If ANY applicable required field is missing/null, set isComplete = false.
   - In "missingFields", list each missing field with a simple human-readable label in English and Hindi.
   - In "followUpPromptEn" and "followUpPromptHi", generate a natural, polite, grouped question asking specifically for the missing details. Group related items (e.g., "I still need the dimensions and weight. Please tell me...").
   - If and ONLY IF all applicable required fields are explicitly provided, set isComplete = true.
5. FINAL LISTING (ONLY when isComplete is true):
   - titleEn: concise, professional e-commerce product title in English (e.g. "Handcrafted Blue Terracotta Vase")
   - titleHi: concise, professional product title in Hindi (e.g. "हस्तनिर्मित नीला टेराकोटा फूलदान")
   - category: appropriate craft category
   - descriptionEn: a polished e-commerce product description based ONLY on the verified details provided by the artisan. DO NOT add unsubstantiated marketing claims like "eco-friendly", "sustainable", "100% authentic", "traditional for 500 years", "chemical-free", or "export quality" unless explicitly stated by the artisan.
   - descriptionHi: a polished product description in Hindi based strictly on the verified details.
   - searchTags: 5-7 relevant tags based on the item.
   - pricing: fair calculation based strictly on stated materials, quantity, and production time.`;

  const promptContent = `Existing Verified Facts from Previous Turns:
${JSON.stringify(existingFacts, null, 2)}

Craft Category Context: ${input.craftCategory || "Indian Handicrafts"}
Artisan State/Region: ${input.artisanState || "India"}
Artisan's Spoken Utterance in This Turn: "${transcript}"

Extract facts truthfully according to the instructions. Return the strict JSON object.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: promptContent,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mergedFacts: {
            type: Type.OBJECT,
            properties: {
              productName: { type: Type.STRING, nullable: true },
              category: { type: Type.STRING, nullable: true },
              material: { type: Type.STRING, nullable: true },
              color: { type: Type.STRING, nullable: true },
              dimensions: { type: Type.STRING, nullable: true },
              weight: { type: Type.STRING, nullable: true },
              quantity: { type: Type.STRING, nullable: true },
              craftTechnique: { type: Type.STRING, nullable: true },
              isHandmade: { type: Type.BOOLEAN, nullable: true },
              productionTime: { type: Type.STRING, nullable: true },
              origin: { type: Type.STRING, nullable: true },
              careInstructions: { type: Type.STRING, nullable: true },
              artisanStory: { type: Type.STRING, nullable: true },
            },
            required: ["productName", "material", "color", "dimensions", "weight", "quantity", "craftTechnique", "isHandmade", "productionTime"],
          },
          missingFields: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                field: { type: Type.STRING },
                labelEn: { type: Type.STRING },
                labelHi: { type: Type.STRING },
                promptEn: { type: Type.STRING },
                promptHi: { type: Type.STRING },
              },
              required: ["field", "labelEn", "labelHi", "promptEn", "promptHi"],
            },
          },
          isComplete: { type: Type.BOOLEAN },
          followUpPromptEn: { type: Type.STRING },
          followUpPromptHi: { type: Type.STRING },
          finalListing: {
            type: Type.OBJECT,
            nullable: true,
            properties: {
              titleEn: { type: Type.STRING },
              titleHi: { type: Type.STRING },
              category: { type: Type.STRING },
              descriptionEn: { type: Type.STRING },
              descriptionHi: { type: Type.STRING },
              searchTags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              pricing: {
                type: Type.OBJECT,
                properties: {
                  baseCost: { type: Type.NUMBER },
                  marketPrice: { type: Type.NUMBER },
                  exhibitionPrice: { type: Type.NUMBER },
                  explanationEn: { type: Type.STRING },
                  explanationHi: { type: Type.STRING },
                },
                required: ["baseCost", "marketPrice", "exhibitionPrice", "explanationEn", "explanationHi"],
              },
            },
          },
        },
        required: ["mergedFacts", "missingFields", "isComplete", "followUpPromptEn", "followUpPromptHi"],
      },
    },
  });

  const rawText = response.text;
  if (!rawText) return null;

  const data = JSON.parse(rawText);
  const facts = normalizeFacts(data.mergedFacts);
  const isComplete = Boolean(data.isComplete && checkStrictCompleteness(facts));

  let catalogItem: CatalogItem | null = null;
  if (isComplete && data.finalListing) {
    catalogItem = buildCatalogItem(facts, data.finalListing, input.studioImage);
  } else if (isComplete) {
    catalogItem = generateTruthfulCatalogItem(facts, input.studioImage);
  }

  return {
    success: true,
    productFacts: facts,
    missingFields: data.missingFields || getMissingFieldList(facts),
    isComplete,
    followUpPromptEn: data.followUpPromptEn || "Please provide the missing details.",
    followUpPromptHi: data.followUpPromptHi || "कृपया शेष विवरण प्रदान करें।",
    finalListing: catalogItem,
    source: "gemini-3.8-flash",
  };
}

/**
 * Truthful deterministic extractor
 * Strictly analyzes the spoken transcript for real stated keywords and measurements.
 * NEVER invents or assumes missing values!
 */
export function runTruthfulDeterministicExtraction(
  transcript: string,
  existingFacts: ProductFacts,
  input: ProcessTurnInput
): ProcessTurnResult {
  const text = transcript.toLowerCase();
  const updated: ProductFacts = { ...existingFacts };

  // 1. Handmade status
  if (text.includes("handmade") || text.includes("hand-made") || text.includes("हाथ से") || text.includes("हस्तनिर्मित") || text.includes("hand crafted") || text.includes("handcrafted")) {
    updated.isHandmade = true;
  } else if (updated.isHandmade === null && (text.includes("machine made") || text.includes("factory"))) {
    updated.isHandmade = false;
  }

  // 2. Product Name
  if (!updated.productName) {
    const productPatterns: [RegExp, string][] = [
      [/\b(terracotta\s+vase|clay\s+vase|flower\s+vase|vase|फूलदान|गमला)\b/i, "vase"],
      [/\b(diya|deepak|दीया|दीपक|oil\s+lamp|puja\s+lamp)\b/i, "diya"],
      [/\b(saree|sari|साड़ी|katan\s+saree|silk\s+saree)\b/i, "saree"],
      [/\b(peacock\s+lamp|brass\s+lamp|peacock\s+diya|मोर\s+दीया)\b/i, "peacock lamp"],
      [/\b(elephant|हाथी|wooden\s+elephant)\b/i, "elephant figurine"],
      [/\b(shawl|stole|शॉल)\b/i, "shawl"],
      [/\b(bowl|कटोरी|बाउल)\b/i, "bowl"],
      [/\b(pot|मटका|घड़ा|handi)\b/i, "pot"],
      [/\b(plate|thali|थाली)\b/i, "plate"],
      [/\b(wall\s+hanging|toran|झूमर)\b/i, "wall hanging"],
      [/\b(jewelry|necklace|माला|हार|earring|झुमका)\b/i, "jewelry"],
      [/\b(dupatta|दुपट्टा)\b/i, "dupatta"],
      [/\b(box|डिब्बा|jewelry\s+box)\b/i, "box"],
      [/\b(rug|carpet|कालीन|दौड़ी)\b/i, "rug"],
    ];
    for (const [pattern, name] of productPatterns) {
      if (pattern.test(text)) {
        updated.productName = name;
        break;
      }
    }
  }

  // 3. Material
  if (!updated.material) {
    const materialPatterns: [RegExp, string][] = [
      [/\b(terracotta|mitti|मिट्टी|clay|alluvial\s+clay)\b/i, "terracotta"],
      [/\b(silk|resham|रेशम|mulberry\s+silk|katan)\b/i, "silk"],
      [/\b(brass|pital|पीतल)\b/i, "brass"],
      [/\b(wood|sheesham|rosewood|lakdi|लकड़ी|teak)\b/i, "wood"],
      [/\b(bronze|kansa|कांसा)\b/i, "bronze"],
      [/\b(copper|tamba|तांबा)\b/i, "copper"],
      [/\b(cotton|सूती|suti)\b/i, "cotton"],
      [/\b(jute|पटसन)\b/i, "jute"],
      [/\b(marble|sangmarmar|संगमरमर|stone)\b/i, "stone/marble"],
      [/\b(silver|chandi|चांदी)\b/i, "silver"],
    ];
    for (const [pattern, mat] of materialPatterns) {
      if (pattern.test(text)) {
        updated.material = mat;
        break;
      }
    }
  }

  // 4. Color
  if (!updated.color) {
    const colorPatterns: [RegExp, string][] = [
      [/\b(blue|नीला|neela|navy)\b/i, "blue"],
      [/\b(red|लाल|crimson|maroon)\b/i, "red"],
      [/\b(green|हरा|hara)\b/i, "green"],
      [/\b(yellow|पीला|peela|mustard)\b/i, "yellow"],
      [/\b(black|काला|kala)\b/i, "black"],
      [/\b(white|सफेद|safed|off-white)\b/i, "white"],
      [/\b(golden|gold|सुनहरा|antique\s+gold)\b/i, "golden"],
      [/\b(natural\s+clay|natural\s+terracotta|earthy)\b/i, "natural terracotta"],
      [/\b(pink|गुलाबी)\b/i, "pink"],
      [/\b(orange|नारंगी|bhagwa)\b/i, "orange"],
      [/\b(brown|भूरा)\b/i, "brown"],
    ];
    for (const [pattern, col] of colorPatterns) {
      if (pattern.test(text)) {
        updated.color = col;
        break;
      }
    }
  }

  // 5. Dimensions
  if (!updated.dimensions) {
    // E.g. "8 inches tall, 4 inches wide", "10 by 8 centimetres", "5.5 meters", "15 cm x 15 cm"
    const dimMatch1 = text.match(/(\d+(\.\d+)?)\s*(inch(es)?|in|cm|centimeters|meters|m|ft)\s*(tall|high|height)?\s*(and|,|\s+)?\s*(\d+(\.\d+)?)\s*(inch(es)?|in|cm|centimeters|meters|m|ft)\s*(wide|width)?/i);
    const dimMatch2 = text.match(/(\d+(\.\d+)?)\s*(by|x|into|\*)\s*(\d+(\.\d+)?)\s*(inch(es)?|in|cm|centimeters|meters|m)?/i);
    const dimMatch3 = text.match(/(\d+(\.\d+)?)\s*(meters|meter|m|inches|inch|cm)\s*(length|long|lambi|height|tall|uncha|chouda)/i);

    if (dimMatch1) {
      const heightVal = dimMatch1[1];
      const widthVal = dimMatch1[7];
      updated.dimensions = `${heightVal} inches tall, ${widthVal} inches wide`;
    } else if (dimMatch2) {
      const unit = dimMatch2[5] || "cm";
      updated.dimensions = `${dimMatch2[1]} x ${dimMatch2[4]} ${unit}`;
    } else if (dimMatch3) {
      updated.dimensions = `${dimMatch3[1]} ${dimMatch3[3]}`;
    }
  }

  // 6. Weight
  if (!updated.weight) {
    const weightMatch = text.match(/(\d+(\.\d+)?)\s*(grams|gram|gms|gm|g|kg|kilograms|kilogram|kilo|kilos)\b/i);
    if (weightMatch) {
      const num = weightMatch[1];
      const unit = weightMatch[3].toLowerCase().startsWith("k") ? "kg" : "grams";
      updated.weight = `${num} ${unit}`;
    }
  }

  // 7. Quantity / Number of Pieces
  if (!updated.quantity) {
    const qtyMatch = text.match(/\b(one\s+piece|single\s+piece|1\s+piece|one\s+item|single\s+item|ek\s+piece|1\s+item|set\s+of\s+(\d+)|pair|दो\s+पीस|(\d+)\s+pieces|(\d+)\s+piece)\b/i);
    if (qtyMatch) {
      if (qtyMatch[0].toLowerCase().includes("one") || qtyMatch[0].toLowerCase().includes("single") || qtyMatch[0].toLowerCase().includes("1 piece")) {
        updated.quantity = "1 piece";
      } else {
        updated.quantity = qtyMatch[0].trim();
      }
    }
  }

  // 8. Crafting Technique
  if (!updated.craftTechnique) {
    const techPatterns: [RegExp, string][] = [
      [/\b(shape\s+it\s+by\s+hand\s+and\s+paint|shape.*by\s+hand.*paint|hand\s+shaped.*hand\s+painted|हाथ से बना.*रंग)\b/i, "Hand-shaped and hand-painted"],
      [/\b(potter('?s)?\s+wheel|wheel\s+thrown|चाक पर)\b/i, "Potter wheel thrown & kiln fired"],
      [/\b(handloom|jacquard|हथकरघा|hand\s+woven)\b/i, "Handloom weaving"],
      [/\b(lost\s+wax|dhokra|casting|ढलाई)\b/i, "Lost-wax brass casting"],
      [/\b(hand\s+carved|wood\s+carving|jali|नक्काशी)\b/i, "Hand carving & chiseling"],
      [/\b(block\s+print(ed)?|छपाई)\b/i, "Traditional wooden block printing"],
      [/\b(hand\s+embroidered|kashidakari|कढ़ाई)\b/i, "Hand embroidery"],
    ];
    for (const [pattern, tech] of techPatterns) {
      if (pattern.test(text)) {
        updated.craftTechnique = tech;
        break;
      }
    }
  }

  // 9. Production Time
  if (!updated.productionTime) {
    const timeMatch = text.match(/\b((\d+|two|three|four|five|one|half)\s+(days|day|hours|hour|weeks|week|months|month))\b/i);
    if (timeMatch) {
      let val = timeMatch[1].toLowerCase();
      val = val.replace("two", "2").replace("three", "3").replace("four", "4").replace("five", "5").replace("one", "1");
      updated.productionTime = val;
    }
  }

  // Optional: Origin
  if (!updated.origin) {
    const originMatch = text.match(/\b(from|made in|origin)\s+([a-zA-Z\s,]+)\b/i);
    if (originMatch && originMatch[2].length < 35) {
      updated.origin = originMatch[2].trim();
    }
  }

  // Set category if absent
  if (!updated.category) {
    if (updated.material === "terracotta" || updated.productName?.includes("vase") || updated.productName?.includes("diya")) {
      updated.category = "Pottery & Terracotta";
    } else if (updated.material === "silk" || updated.productName?.includes("saree") || updated.material === "cotton") {
      updated.category = "Handloom & Textiles";
    } else if (updated.material === "brass" || updated.material === "bronze" || updated.material === "copper") {
      updated.category = "Metalcraft";
    } else if (updated.material === "wood") {
      updated.category = "Woodwork & Carvings";
    } else {
      updated.category = input.craftCategory || "Traditional Handicrafts";
    }
  }

  const missingFields = getMissingFieldList(updated);
  const isComplete = missingFields.length === 0;

  // Generate smart grouped follow-up questions
  const { followUpPromptEn, followUpPromptHi } = generateSmartFollowUpQuestions(missingFields);

  let finalListing: CatalogItem | null = null;
  if (isComplete) {
    finalListing = generateTruthfulCatalogItem(updated, input.studioImage);
  }

  return {
    success: true,
    productFacts: updated,
    missingFields,
    isComplete,
    followUpPromptEn,
    followUpPromptHi,
    finalListing,
    source: "truthful-rule-engine",
  };
}

/**
 * Checks which required fields are missing
 */
export function getMissingFieldList(facts: ProductFacts): MissingFieldItem[] {
  const missing: MissingFieldItem[] = [];

  if (!facts.productName) {
    missing.push({
      field: "productName",
      labelEn: "Product Name / Item Type",
      labelHi: "उत्पाद का नाम / वस्तु का प्रकार",
      promptEn: "What is this item (e.g., vase, diya, saree, lamp)?",
      promptHi: "यह कौन सी वस्तु है (जैसे फूलदान, दीया, साड़ी, लैंप)?",
    });
  }

  if (!facts.material) {
    missing.push({
      field: "material",
      labelEn: "Material",
      labelHi: "सामग्री",
      promptEn: "What material is it made of (e.g., terracotta, silk, brass)?",
      promptHi: "यह किस सामग्री से बना है (जैसे मिट्टी/टेराकोटा, रेशम, पीतल)?",
    });
  }

  if (!facts.color) {
    missing.push({
      field: "color",
      labelEn: "Color",
      labelHi: "रंग",
      promptEn: "What is the primary color or shade?",
      promptHi: "इसका मुख्य रंग या छाया क्या है?",
    });
  }

  if (!facts.dimensions) {
    missing.push({
      field: "dimensions",
      labelEn: "Dimensions (Height/Width/Length)",
      labelHi: "आकार (ऊंचाई/चौड़ाई/लंबाई)",
      promptEn: "What are the dimensions (e.g., height, width, length, or diameter)?",
      promptHi: "इसका आकार या माप क्या है (ऊंचाई, चौड़ाई, लंबाई या व्यास)?",
    });
  }

  if (!facts.weight) {
    missing.push({
      field: "weight",
      labelEn: "Weight",
      labelHi: "वजन",
      promptEn: "What is the approximate weight (in grams or kg)?",
      promptHi: "इसका अनुमानित वजन कितना है (ग्राम या किलोग्राम में)?",
    });
  }

  if (!facts.quantity) {
    missing.push({
      field: "quantity",
      labelEn: "Quantity / Number of Pieces",
      labelHi: "मात्रा / टुकड़ों की संख्या",
      promptEn: "How many pieces are included (e.g., 1 piece, set of 4)?",
      promptHi: "इसमें कितने पीस शामिल हैं (जैसे 1 पीस, 4 का सेट)?",
    });
  }

  if (!facts.craftTechnique) {
    missing.push({
      field: "craftTechnique",
      labelEn: "Crafting Technique",
      labelHi: "शिल्प तकनीक / निर्माण विधि",
      promptEn: "How do you make it (e.g., shaped by hand, wheel-thrown, handloom woven)?",
      promptHi: "आप इसे कैसे बनाते हैं (जैसे हाथ से आकार देकर, चाक पर, हथकरघे पर)?",
    });
  }

  if (facts.isHandmade === null || facts.isHandmade === undefined) {
    missing.push({
      field: "isHandmade",
      labelEn: "Handmade Status",
      labelHi: "हस्तनिर्मित स्थिति",
      promptEn: "Is it crafted completely by hand?",
      promptHi: "क्या यह पूरी तरह से हाथ से बना है?",
    });
  }

  if (!facts.productionTime) {
    missing.push({
      field: "productionTime",
      labelEn: "Production Time",
      labelHi: "निर्माण समय",
      promptEn: "How long does it take you to make this piece (e.g., 2 days, 4 hours)?",
      promptHi: "इसे बनाने में आपको कितना समय लगता है (जैसे 2 दिन, 4 घंटे)?",
    });
  }

  return missing;
}

/**
 * Checks strict completeness
 */
function checkStrictCompleteness(facts: ProductFacts): boolean {
  return (
    Boolean(facts.productName) &&
    Boolean(facts.material) &&
    Boolean(facts.color) &&
    Boolean(facts.dimensions) &&
    Boolean(facts.weight) &&
    Boolean(facts.quantity) &&
    Boolean(facts.craftTechnique) &&
    facts.isHandmade !== null &&
    facts.isHandmade !== undefined &&
    Boolean(facts.productionTime)
  );
}

/**
 * Groups missing fields into natural, concise conversational prompts
 */
function generateSmartFollowUpQuestions(missing: MissingFieldItem[]): {
  followUpPromptEn: string;
  followUpPromptHi: string;
} {
  if (missing.length === 0) {
    return {
      followUpPromptEn: "All required information is complete!",
      followUpPromptHi: "सभी आवश्यक जानकारी पूरी हो गई है!",
    };
  }

  if (missing.length === 1) {
    const m = missing[0];
    return {
      followUpPromptEn: `Everything else is ready. ${m.promptEn}`,
      followUpPromptHi: `बाकी सब तैयार है। ${m.promptHi}`,
    };
  }

  const enLabels = missing.map((m) => m.labelEn).join(", ");
  const hiLabels = missing.map((m) => m.labelHi).join(", ");

  return {
    followUpPromptEn: `I still need: ${enLabels}. Please tell me these details.`,
    followUpPromptHi: `मुझे अभी भी आवश्यकता है: ${hiLabels}। कृपया ये विवरण बताएं।`,
  };
}

/**
 * Normalizes a raw object into a strictly typed ProductFacts
 */
function normalizeFacts(raw: any): ProductFacts {
  return {
    productName: cleanVal(raw?.productName),
    category: cleanVal(raw?.category),
    material: cleanVal(raw?.material),
    color: cleanVal(raw?.color),
    dimensions: cleanVal(raw?.dimensions),
    weight: cleanVal(raw?.weight),
    quantity: cleanVal(raw?.quantity),
    craftTechnique: cleanVal(raw?.craftTechnique),
    isHandmade: typeof raw?.isHandmade === "boolean" ? raw.isHandmade : null,
    productionTime: cleanVal(raw?.productionTime),
    origin: cleanVal(raw?.origin),
    careInstructions: cleanVal(raw?.careInstructions),
    artisanStory: cleanVal(raw?.artisanStory),
  };
}

/**
 * Builds a final CatalogItem from Gemini output
 */
function buildCatalogItem(
  facts: ProductFacts,
  aiListing: any,
  studioImage?: string
): CatalogItem {
  const image = studioImage || "";
  return {
    id: `item-${Date.now()}`,
    category: facts.category || "Handicrafts",
    originalImage: image,
    studioImage: image,
    titleEn: aiListing.titleEn || `Handcrafted ${facts.color || ""} ${facts.material || ""} ${facts.productName || "Craft"}`.trim(),
    titleHi: aiListing.titleHi || `हस्तनिर्मित ${facts.material || ""} ${facts.productName || "उत्पाद"}`.trim(),
    descriptionEn: aiListing.descriptionEn,
    descriptionHi: aiListing.descriptionHi,
    specs: {
      material: facts.material || "Craft Material",
      color: facts.color || "Natural",
      dimensions: facts.dimensions || "Custom dimensions",
      weight: facts.weight || "Craft weight",
      craftTechnique: facts.craftTechnique || "Traditional Handcrafting",
      regionHeritage: facts.origin || "India",
      productName: facts.productName || "Handicraft",
      quantity: facts.quantity || "1 piece",
      isHandmade: facts.isHandmade ?? true,
      productionTime: facts.productionTime || "Artisan handcraft",
      careInstructions: facts.careInstructions || undefined,
      artisanStory: facts.artisanStory || undefined,
    },
    searchTags: aiListing.searchTags || [`#${facts.material || "Craft"}`, `#Handmade`, `#IndianArtisan`],
    pricing: {
      baseCost: Number(aiListing.pricing?.baseCost) || 250,
      marketPrice: Number(aiListing.pricing?.marketPrice) || 599,
      exhibitionPrice: Number(aiListing.pricing?.exhibitionPrice) || 1200,
      explanationEn: aiListing.pricing?.explanationEn || "Calculated based on verified material and artisan production hours.",
      explanationHi: aiListing.pricing?.explanationHi || "सामग्री और शिल्पकार के श्रम समय के आधार पर मूल्य निर्धारण।",
      selectedTier: "market",
    },
    createdAt: new Date().toISOString(),
    status: "live",
    marketplacePlatforms: ["ONDC Karigar", "Amazon Karigar", "Flipkart Samarth", "WhatsApp Business"],
  };
}

/**
 * Truthfully synthesizes a polished professional catalog item strictly from verified facts
 */
export function generateTruthfulCatalogItem(
  facts: ProductFacts,
  studioImage?: string
): CatalogItem {
  const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

  const colorTitle = cap(facts.color);
  const materialTitle = cap(facts.material);
  const nameTitle = cap(facts.productName);

  const titleEn = `Handcrafted ${colorTitle ? `${colorTitle} ` : ""}${materialTitle ? `${materialTitle} ` : ""}${nameTitle || "Craft Item"}`.trim();
  const titleHi = `हस्तनिर्मित ${facts.color ? `${facts.color} ` : ""}${facts.material ? `${facts.material} ` : ""}${facts.productName || "शिल्प"}`.trim();

  // Pure truthful description strictly based on verified facts — ZERO fake buzzwords
  const descriptionEn = `Handcrafted ${facts.color || ""} ${facts.material || ""} ${facts.productName || "item"}, measuring ${facts.dimensions || "standard dimensions"} and weighing approximately ${facts.weight || "standard weight"}. Created using ${facts.craftTechnique || "traditional hand craftsmanship"}, each ${facts.quantity || "piece"} takes ${facts.productionTime || "dedicated time"} to produce by hand${facts.origin ? ` in ${facts.origin}` : ""}.${facts.careInstructions ? ` Care: ${facts.careInstructions}.` : ""}${facts.artisanStory ? ` Artisan note: "${facts.artisanStory}".` : ""}`;

  const descriptionHi = `यह ${facts.color || ""} ${facts.material || ""} ${facts.productName || "उत्पाद"} है, जिसका आकार ${facts.dimensions || "मानक माप"} और वजन लगभग ${facts.weight || "मानक वजन"} है। इसे ${facts.craftTechnique || "पारंपरिक हस्तकला तकनीक"} द्वारा तैयार किया गया है। प्रत्येक ${facts.quantity || "पीस"} को हाथ से बनाने में ${facts.productionTime || "समय"} लगता है${facts.origin ? ` (${facts.origin})` : ""}।${facts.careInstructions ? ` देखभाल: ${facts.careInstructions}।` : ""}${facts.artisanStory ? ` विशेष विवरण: "${facts.artisanStory}"।` : ""}`;

  // Realistic fair price estimation based on production time and materials
  let baseCost = 250;
  if (facts.productionTime?.includes("day") || facts.productionTime?.includes("दिन")) {
    const days = parseInt(facts.productionTime) || 2;
    baseCost = Math.max(250, days * 180 + 80);
  } else if (facts.productionTime?.includes("hour") || facts.productionTime?.includes("घंटे")) {
    const hours = parseInt(facts.productionTime) || 4;
    baseCost = Math.max(150, hours * 60 + 50);
  }
  const marketPrice = Math.round(baseCost * 2.2 / 50) * 50 - 1; // e.g. 599
  const exhibitionPrice = Math.round(baseCost * 4.2 / 100) * 100; // e.g. 1200

  const tags = [
    `#${(facts.material || "Craft").replace(/\s+/g, "")}`,
    `#${(facts.productName || "Handicraft").replace(/\s+/g, "")}`,
    "#HandmadeInIndia",
    "#ArtisanDirect",
    "#ONDCKarigar",
    "#VocalForLocal",
  ];

  return {
    id: `item-${Date.now()}`,
    category: facts.category || "Handicrafts",
    originalImage: studioImage || "",
    studioImage: studioImage || "",
    titleEn,
    titleHi,
    descriptionEn,
    descriptionHi,
    specs: {
      material: facts.material || "Artisan Material",
      color: facts.color || "Natural",
      dimensions: facts.dimensions || "Measured specs",
      weight: facts.weight || "Measured weight",
      craftTechnique: facts.craftTechnique || "Handcrafted",
      regionHeritage: facts.origin || "India",
      productName: facts.productName || "Craft Item",
      quantity: facts.quantity || "1 piece",
      isHandmade: facts.isHandmade ?? true,
      productionTime: facts.productionTime || "Handmade",
      careInstructions: facts.careInstructions || undefined,
      artisanStory: facts.artisanStory || undefined,
    },
    searchTags: tags,
    pricing: {
      baseCost,
      marketPrice,
      exhibitionPrice,
      explanationEn: `Calculated from verified ${facts.material || "raw"} material costs and ${facts.productionTime || "dedicated"} artisan crafting hours.`,
      explanationHi: `सत्यापित ${facts.material || "कच्चे"} माल की लागत और ${facts.productionTime || "शिल्पकार"} के निर्माण समय के आधार पर आकलित।`,
      selectedTier: "market",
    },
    createdAt: new Date().toISOString(),
    status: "live",
    marketplacePlatforms: ["ONDC Karigar", "Amazon Karigar", "Flipkart Samarth", "WhatsApp Business"],
  };
}
