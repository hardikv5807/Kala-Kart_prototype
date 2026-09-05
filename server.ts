import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import multer from "multer";
import { imageEnhancementService } from "./src/services/imageEnhancementService";
import { processVoiceTurn } from "./src/services/voiceCatalogService";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Configure Multer for secure in-memory file uploads with strict size & type limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB maximum
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, and WebP images are supported."));
    }
  },
});

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

// 1. Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "KalaKriti SIH 2026 Virtual Business Manager",
    hasApiKey: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"),
  });
});

// Kala-Kart Official Logo Asset Handler (Serves exact uploaded JPEG image asset)
app.get([
  "/WhatsApp%20Image%202026-08-31%20at%2019.51.33.jpeg",
  "/WhatsApp Image 2026-08-31 at 19.51.33.jpeg",
  "/kala-kart-logo.jpeg",
  "/kala-kart-logo.jpg",
  "/logo.jpeg",
  "/logo.jpg",
  /\/WhatsApp.*Image.*\.jpe?g$/i,
], (req, res) => {
  const publicDir = path.join(process.cwd(), "public");
  const candidates = [
    path.join(publicDir, "WhatsApp Image 2026-08-31 at 19.51.33.jpeg"),
    path.join(publicDir, "WhatsApp Image 2026-08-31 at 19.51.33.jpg"),
    path.join(publicDir, "kala-kart-logo.jpeg"),
    path.join(publicDir, "kala-kart-logo.jpg"),
    path.join(publicDir, "logo.jpeg"),
    path.join(publicDir, "logo.jpg"),
  ];

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.sendFile(filePath);
    }
  }

  // If not found yet, respond with 404
  res.status(404).send("Logo asset WhatsApp Image 2026-08-31 at 19.51.33.jpeg not found in public directory");
});

// 2. Real Image Enhancement & Background Removal Endpoint (multipart/form-data)
app.get("/api/image/status", (req, res) => {
  res.json({
    success: true,
    status: imageEnhancementService.getStatus(),
  });
});

app.post("/api/image/enhance", (req, res) => {
  upload.single("image")(req, res, async (err: any) => {
    // 1. Multer upload validation errors
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          error: "Image file exceeds maximum allowable size (10MB). Please select a smaller photo.",
          code: "FILE_TOO_LARGE",
        });
      }
      return res.status(400).json({
        success: false,
        error: `File upload error: ${err.message}`,
        code: "UPLOAD_ERROR",
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        error: err.message || "Invalid image upload. Please upload a valid image file.",
        code: "INVALID_FILE",
      });
    }

    // 2. Missing file check
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No product image was provided in the request. Please provide an image file in the 'image' field.",
        code: "MISSING_FILE",
      });
    }

    try {
      const options = {
        lightingMode: typeof req.body.lightingMode === "string" ? req.body.lightingMode : undefined,
        backdropType: typeof req.body.backdropType === "string" ? req.body.backdropType : undefined,
        showDropShadow: req.body.showDropShadow === "true" || req.body.showDropShadow === true,
      };

      // 3. Delegate to image enhancement service abstraction
      const result = await imageEnhancementService.enhanceImage(
        req.file.buffer,
        req.file.mimetype,
        options
      );

      if (!result.success) {
        return res.status(503).json({
          success: false,
          error: result.error || "Image enhancement failed.",
          code: result.code || "ENHANCEMENT_UNAVAILABLE",
          provider: result.provider,
        });
      }

      return res.json({
        success: true,
        processedImage: result.enhancedImageUrl,
        provider: result.provider,
      });
    } catch (endpointError: any) {
      console.error("Backend image enhancement failed:", endpointError);
      return res.status(500).json({
        success: false,
        error: endpointError.message || "Internal server error while processing product photo.",
        code: "INTERNAL_ERROR",
      });
    }
  });
});

// 2. Truthful Multilingual Voice-to-Catalog Engine (Multi-turn)
app.post("/api/voice/process-turn", async (req, res) => {
  try {
    const { transcript, existingFacts, craftCategory, artisanState, userLanguage, studioImage } = req.body;
    const result = await processVoiceTurn({
      transcript: transcript || "",
      existingFacts: existingFacts || null,
      craftCategory: craftCategory || "Handicrafts",
      artisanState: artisanState || "India",
      userLanguage: userLanguage || "hi",
      studioImage: studioImage || "",
    });
    return res.json(result);
  } catch (error: any) {
    console.error("Voice process turn error:", error);
    return res.status(500).json({
      success: false,
      error: "I couldn't process that information right now. Please try again.",
      messageHi: "मैं अभी उस जानकारी को प्रोसेस नहीं कर सका। कृपया पुनः प्रयास करें।",
    });
  }
});

// Legacy / compatibility voice parse endpoint
app.post("/api/gemini/parse-voice", async (req, res) => {
  try {
    const { transcript, craftCategory, artisanState, userLanguage, studioImage } = req.body;
    const result = await processVoiceTurn({
      transcript: transcript || "",
      existingFacts: null,
      craftCategory: craftCategory || "Handicrafts",
      artisanState: artisanState || "India",
      userLanguage: userLanguage || "hi",
      studioImage: studioImage || "",
    });

    if (result.finalListing) {
      return res.json({
        success: true,
        data: result.finalListing,
        productFacts: result.productFacts,
        missingFields: result.missingFields,
        isComplete: result.isComplete,
        source: result.source,
      });
    }

    return res.json({
      success: true,
      data: null,
      productFacts: result.productFacts,
      missingFields: result.missingFields,
      isComplete: false,
      followUpPromptEn: result.followUpPromptEn,
      followUpPromptHi: result.followUpPromptHi,
      source: result.source,
    });
  } catch (error: any) {
    console.error("Gemini Voice Parse Error:", error);
    return res.status(500).json({
      success: false,
      error: "I couldn't process that information right now. Please try again.",
      messageHi: "मैं अभी उस जानकारी को प्रोसेस नहीं कर सका। कृपया पुनः प्रयास करें।",
    });
  }
});

// ==========================================
// ML PRICING FOUNDATION API ENDPOINTS (STEP 4A)
// ==========================================

// Get current model metadata & status
app.get("/api/pricing/metadata", (req, res) => {
  try {
    const metaPath = path.join(process.cwd(), "data", "pricing", "model_metadata.json");
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
      return res.json({ success: true, metadata: meta });
    }
    return res.json({
      success: true,
      metadata: {
        modelVersion: "pricing-v0.1",
        modelType: "RandomForestRegressor",
        status: "dataset_required",
        notes: "Canonical training dataset is awaiting legitimate empirical field data.",
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Run pricing prediction
app.post("/api/pricing/predict", async (req, res) => {
  try {
    const { features } = req.body;
    if (!features) {
      return res.status(400).json({ success: false, error: "Missing required 'features' object." });
    }

    const { PricingPipeline } = await import("./src/services/pricing/pricingPipeline");
    const weightsPath = path.join(process.cwd(), "data", "pricing", "model_weights.json");
    const metaPath = path.join(process.cwd(), "data", "pricing", "model_metadata.json");

    if (fs.existsSync(weightsPath) && fs.existsSync(metaPath)) {
      const weights = JSON.parse(fs.readFileSync(weightsPath, "utf-8"));
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
      // Demo/synthetic data must NEVER power user-facing predictions (Step 4B rule 8).
      // Only legitimate models trained on verified empirical data with status 'trained' and samples > 0 are loaded.
      if (
        meta.status === "trained" &&
        !meta.trainingDatasetVersion?.includes("synthetic") &&
        (meta.trainingSampleCount || 0) > 0
      ) {
        PricingPipeline.loadSerializedModel(weights, meta);
      } else {
        PricingPipeline.resetModel(meta);
      }
    } else if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
      PricingPipeline.resetModel(meta);
    } else {
      PricingPipeline.resetModel(null);
    }

    const prediction = await PricingPipeline.predictPrice(features);
    return res.json({ success: true, prediction });
  } catch (err: any) {
    console.error("ML Pricing prediction error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`KalaKriti Virtual Business Manager running on port ${PORT}`);
  });
}

startServer();
