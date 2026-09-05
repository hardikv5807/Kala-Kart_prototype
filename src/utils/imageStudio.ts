import { removeBackground, preload, type Config } from "@imgly/background-removal";
import { StudioOptions, StudioPreset } from "../types/artisan";

/**
 * Local Browser AI Image Studio Pipeline
 * Uses @imgly/background-removal to perform on-device neural network
 * background segmentation directly in the browser via WebAssembly & ONNX Runtime.
 * 
 * ZERO external API calls, ZERO paid services, completely free and private.
 * Then composites the transparent cutout onto artisan-grade studio presets in-memory.
 */

export interface RemovalProgress {
  stage: "preparing" | "removing" | "finalizing";
  message: string;
  percent?: number;
}

// Track whether the model has been warmed up/cached
let isModelPreloaded = false;
let isPreloadInProgress = false;

/**
 * Preloads and warms up the local ONNX model and WASM runtime in the background.
 * Subsequent background removal calls will execute significantly faster.
 */
export async function preloadLocalAI(): Promise<void> {
  if (isModelPreloaded || isPreloadInProgress) return;
  isPreloadInProgress = true;
  try {
    await preload({
      model: "isnet_fp16",
      output: {
        format: "image/png",
      },
    });
    isModelPreloaded = true;
  } catch (err) {
    console.warn("Background AI model preloading info:", err);
  } finally {
    isPreloadInProgress = false;
  }
}

/**
 * Executes local on-device AI background removal directly in the browser.
 * Returns a transparent PNG product cutout as a data URL.
 */
export async function removeBackgroundLocally(
  imageSrc: string,
  onProgress?: (progress: RemovalProgress) => void
): Promise<string> {
  if (!imageSrc) {
    throw new Error("No image source provided for background removal.");
  }

  onProgress?.({
    stage: "preparing",
    message: "Preparing AI Studio...",
  });

  const config: Config = {
    // "isnet_fp16" provides optimal artisan edge precision for craft textures
    model: "isnet_fp16",
    output: {
      format: "image/png",
      quality: 0.95,
    },
    progress: (key: string, current: number, total: number) => {
      if (key.startsWith("fetch:")) {
        const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : undefined;
        onProgress?.({
          stage: "preparing",
          message: "Preparing AI Studio...",
          percent: pct,
        });
      } else if (key === "compute:decode" || key === "compute:inference") {
        onProgress?.({
          stage: "removing",
          message: "Removing background...",
          percent: 50,
        });
      } else if (key === "compute:mask" || key === "compute:encode") {
        onProgress?.({
          stage: "finalizing",
          message: "Almost done...",
          percent: 90,
        });
      }
    },
  };

  try {
    const transparentBlob = await removeBackground(imageSrc, config);
    isModelPreloaded = true;

    onProgress?.({
      stage: "finalizing",
      message: "Almost done...",
      percent: 100,
    });

    return await blobToDataURL(transparentBlob);
  } catch (err: any) {
    console.error("Local browser AI background removal failed:", err);
    throw new Error(
      err?.message || "Local AI background removal failed to process product photo."
    );
  }
}

/**
 * Backward compatibility alias: redirects to removeBackgroundLocally.
 * Completely eliminates any network call to Remove.bg or backend server.
 */
export async function fetchRealBackgroundRemoval(
  imageSrc: string,
  onProgress?: (progress: RemovalProgress) => void
): Promise<string> {
  return removeBackgroundLocally(imageSrc, onProgress);
}

/**
 * Convert transparent Blob to data URL for seamless canvas compositing & rendering
 */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert transparent product cutout to data URL."));
      }
    };
    reader.onerror = () => reject(new Error("FileReader error converting product cutout."));
    reader.readAsDataURL(blob);
  });
}

/**
 * Helper to decode an image source into an HTMLImageElement
 */
function decodeImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to decode transparent product cutout."));
    img.src = src;
  });
}

/**
 * Programmatically composite the transparent product cutout onto one of the
 * 3 official studio presets:
 * 1. Clean Studio
 * 2. Soft Pedestal
 * 3. Warm Daylight
 *
 * Runs locally on an off-screen HTML5 canvas in milliseconds, reusing the
 * existing transparent cutout without consuming another API request.
 */
export async function applyStudioPreset(
  cutoutSrc: string,
  preset: StudioPreset = "clean-studio"
): Promise<string> {
  if (!cutoutSrc) {
    throw new Error("Cannot apply studio preset: No transparent cutout provided.");
  }

  const img = await decodeImage(cutoutSrc);

  // Render on a standardized high-resolution 1200x1200 square catalog canvas
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1200;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas context initialization failed for studio composition.");
  }

  // Enable high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (preset === "clean-studio") {
    // =========================================================================
    // 1. CLEAN STUDIO
    // - Clean white/light neutral background
    // - Centered product, fully visible
    // - Very subtle natural-looking contact shadow underneath
    // - Product's actual colors completely preserved
    // =========================================================================

    // Clean neutral studio backdrop
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, "#FFFFFF");
    bgGrad.addColorStop(0.75, "#FFFFFF");
    bgGrad.addColorStop(1, "#F8FAFC");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Compute dimensions to comfortably fit the complete product
    const maxW = canvas.width * 0.78;
    const maxH = canvas.height * 0.76;
    const scale = Math.min(maxW / img.width, maxH / img.height, 1.0);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = (canvas.width - drawW) / 2;
    const drawY = (canvas.height - drawH) / 2 - 12; // Slight optical lift for shadow
    const contactY = drawY + drawH;
    const shadowRX = drawW * 0.42;

    // Soft, natural contact shadow underneath
    ctx.save();
    // Inner crisp contact line
    const coreGrad = ctx.createRadialGradient(
      drawX + drawW / 2, contactY, 1,
      drawX + drawW / 2, contactY, shadowRX
    );
    coreGrad.addColorStop(0, "rgba(15, 23, 42, 0.15)");
    coreGrad.addColorStop(0.45, "rgba(15, 23, 42, 0.05)");
    coreGrad.addColorStop(1, "rgba(15, 23, 42, 0.0)");
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.ellipse(drawX + drawW / 2, contactY, shadowRX, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Outer diffused ambient pool
    const ambientGrad = ctx.createRadialGradient(
      drawX + drawW / 2, contactY + 3, 2,
      drawX + drawW / 2, contactY + 3, shadowRX * 1.35
    );
    ambientGrad.addColorStop(0, "rgba(15, 23, 42, 0.06)");
    ambientGrad.addColorStop(0.6, "rgba(15, 23, 42, 0.02)");
    ambientGrad.addColorStop(1, "rgba(15, 23, 42, 0.0)");
    ctx.fillStyle = ambientGrad;
    ctx.beginPath();
    ctx.ellipse(drawX + drawW / 2, contactY + 3, shadowRX * 1.35, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw the product with authentic colors intact
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

  } else if (preset === "soft-pedestal") {
    // =========================================================================
    // 2. SOFT PEDESTAL
    // - Soft light beige/neutral background
    // - Simple subtle pedestal/platform underneath the product
    // - Soft contact shadow
    // - Minimal and suitable for an artisan e-commerce catalog
    // =========================================================================

    // Soft light beige warm neutral backdrop
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, "#FBF9F5");
    bgGrad.addColorStop(0.55, "#F5EFE6");
    bgGrad.addColorStop(1, "#ECE5D9");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Compute dimensions and pedestal positioning
    const maxW = canvas.width * 0.72;
    const maxH = canvas.height * 0.65;
    const scale = Math.min(maxW / img.width, maxH / img.height, 1.0);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = (canvas.width - drawW) / 2;

    const pedestalCenterX = canvas.width / 2;
    const pedestalTopY = canvas.height * 0.73;
    const drawY = pedestalTopY - drawH + 3; // Align base of product to top of pedestal
    const pedestalRadiusX = Math.max(drawW * 0.70, canvas.width * 0.35);
    const pedestalRadiusY = pedestalRadiusX * 0.20;
    const pedestalThickness = 30;

    // A. Soft ground shadow underneath the pedestal
    ctx.save();
    const groundY = pedestalTopY + pedestalThickness + 8;
    const groundGrad = ctx.createRadialGradient(
      pedestalCenterX, groundY, 10,
      pedestalCenterX, groundY, pedestalRadiusX * 1.15
    );
    groundGrad.addColorStop(0, "rgba(65, 45, 25, 0.12)");
    groundGrad.addColorStop(0.5, "rgba(65, 45, 25, 0.04)");
    groundGrad.addColorStop(1, "rgba(65, 45, 25, 0.0)");
    ctx.fillStyle = groundGrad;
    ctx.beginPath();
    ctx.ellipse(pedestalCenterX, groundY, pedestalRadiusX * 1.15, pedestalRadiusY * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // B. Pedestal cylinder body (curved side/front bevel)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(pedestalCenterX, pedestalTopY + pedestalThickness, pedestalRadiusX, pedestalRadiusY, 0, 0, Math.PI);
    ctx.lineTo(pedestalCenterX - pedestalRadiusX, pedestalTopY);
    ctx.ellipse(pedestalCenterX, pedestalTopY, pedestalRadiusX, pedestalRadiusY, 0, Math.PI, 0, true);
    ctx.closePath();
    const bodyGrad = ctx.createLinearGradient(pedestalCenterX - pedestalRadiusX, 0, pedestalCenterX + pedestalRadiusX, 0);
    bodyGrad.addColorStop(0, "#E0D7CC");
    bodyGrad.addColorStop(0.2, "#ECE5DB");
    bodyGrad.addColorStop(0.5, "#F3EDE3");
    bodyGrad.addColorStop(0.8, "#E6DED4");
    bodyGrad.addColorStop(1, "#DDD4C8");
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.restore();

    // C. Pedestal top face disc
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(pedestalCenterX, pedestalTopY, pedestalRadiusX, pedestalRadiusY, 0, 0, Math.PI * 2);
    const topGrad = ctx.createRadialGradient(
      pedestalCenterX, pedestalTopY - 10, 5,
      pedestalCenterX, pedestalTopY, pedestalRadiusX
    );
    topGrad.addColorStop(0, "#FCFAF7");
    topGrad.addColorStop(0.7, "#F6F1EA");
    topGrad.addColorStop(1, "#EDE6DC");
    ctx.fillStyle = topGrad;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.stroke();
    ctx.restore();

    // D. Soft contact shadow of product on pedestal top face
    ctx.save();
    const contactShadowGrad = ctx.createRadialGradient(
      pedestalCenterX, pedestalTopY, 2,
      pedestalCenterX, pedestalTopY, drawW * 0.44
    );
    contactShadowGrad.addColorStop(0, "rgba(65, 45, 25, 0.20)");
    contactShadowGrad.addColorStop(0.4, "rgba(65, 45, 25, 0.08)");
    contactShadowGrad.addColorStop(1, "rgba(65, 45, 25, 0.0)");
    ctx.fillStyle = contactShadowGrad;
    ctx.beginPath();
    ctx.ellipse(pedestalCenterX, pedestalTopY, drawW * 0.44, pedestalRadiusY * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // E. Draw product with authentic colors intact
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

  } else if (preset === "warm-daylight") {
    // =========================================================================
    // 3. WARM DAYLIGHT
    // - Warm cream/off-white background
    // - Subtle warm daylight appearance (ambient directional sunlit glow)
    // - Soft natural directional shadow
    // - No heavy color-filtering or distortion of the actual product
    // =========================================================================

    // Warm cream background with sunlit ambiance from top-left
    const bgGrad = ctx.createRadialGradient(
      canvas.width * 0.15, canvas.height * 0.12, 40,
      canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.95
    );
    bgGrad.addColorStop(0, "#FFFDF7");
    bgGrad.addColorStop(0.35, "#FAF4E8");
    bgGrad.addColorStop(0.75, "#F4ECE0");
    bgGrad.addColorStop(1, "#EDE2D2");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle golden sun ray ambient wash
    ctx.save();
    const sunRay = ctx.createLinearGradient(0, 0, canvas.width * 0.65, canvas.height * 0.65);
    sunRay.addColorStop(0, "rgba(255, 248, 230, 0.20)");
    sunRay.addColorStop(1, "rgba(255, 248, 230, 0.0)");
    ctx.fillStyle = sunRay;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Compute dimensions
    const maxW = canvas.width * 0.76;
    const maxH = canvas.height * 0.74;
    const scale = Math.min(maxW / img.width, maxH / img.height, 1.0);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = (canvas.width - drawW) / 2 - 8; // Slight optical offset for right-cast shadow
    const drawY = (canvas.height - drawH) / 2 - 12;
    const contactY = drawY + drawH;
    const shadowCenterBaseX = drawX + drawW / 2;

    // Directional shadow trailing toward bottom-right from top-left light
    const dirOffsetX = drawW * 0.14;
    const dirOffsetY = 12;

    ctx.save();
    // Immediate directional contact shadow
    const contactGrad = ctx.createRadialGradient(
      shadowCenterBaseX + dirOffsetX * 0.5, contactY + 2, 2,
      shadowCenterBaseX + dirOffsetX * 0.5, contactY + 2, drawW * 0.44
    );
    contactGrad.addColorStop(0, "rgba(80, 55, 30, 0.18)");
    contactGrad.addColorStop(0.4, "rgba(80, 55, 30, 0.07)");
    contactGrad.addColorStop(1, "rgba(80, 55, 30, 0.0)");
    ctx.fillStyle = contactGrad;
    ctx.beginPath();
    ctx.ellipse(shadowCenterBaseX + dirOffsetX * 0.5, contactY + 2, drawW * 0.44, 9, 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Extended soft daylight projection
    const sunGrad = ctx.createRadialGradient(
      shadowCenterBaseX + dirOffsetX * 1.2, contactY + dirOffsetY, 5,
      shadowCenterBaseX + dirOffsetX * 1.2, contactY + dirOffsetY, drawW * 0.65
    );
    sunGrad.addColorStop(0, "rgba(90, 65, 40, 0.09)");
    sunGrad.addColorStop(0.55, "rgba(90, 65, 40, 0.03)");
    sunGrad.addColorStop(1, "rgba(90, 65, 40, 0.0)");
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.ellipse(shadowCenterBaseX + dirOffsetX * 1.2, contactY + dirOffsetY, drawW * 0.65, 22, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw the product with authentic colors intact
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  } else {
    // Default fallback to clean studio
    return applyStudioPreset(cutoutSrc, "clean-studio");
  }

  // Export high-quality JPEG (quality 0.94 preserves fine artisanal textures)
  return canvas.toDataURL("image/jpeg", 0.94);
}

/**
 * Standard processing wrapper:
 * 1. Obtains authentic transparent background removal
 * 2. Composites onto the requested studio preset
 */
export async function processStudioImage(
  imageSrc: string,
  options: StudioOptions = {
    lightingMode: "studio-soft",
    brightness: 1.05,
    contrast: 1.15,
    sharpness: 1.5,
    backdropType: "clean-studio",
    showDropShadow: true,
  }
): Promise<{ transparentCutout: string; studioImage: string }> {
  const transparentCutout = await fetchRealBackgroundRemoval(imageSrc);

  // Map option backdrop to preset
  let preset: StudioPreset = "clean-studio";
  if (options.preset) {
    preset = options.preset;
  } else if (options.backdropType === "soft-pedestal" || options.backdropType === "pedestal") {
    preset = "soft-pedestal";
  } else if (options.backdropType === "warm-daylight" || options.backdropType === "warm-terracotta") {
    preset = "warm-daylight";
  } else {
    preset = "clean-studio";
  }

  const studioImage = await applyStudioPreset(transparentCutout, preset);

  return { transparentCutout, studioImage };
}

/**
 * Check image enhancement service status.
 * Browser AI is completely self-contained and operates client-side.
 */
export async function checkImageEnhancementStatus(): Promise<{
  available: boolean;
  activeProvider: string | null;
}> {
  return {
    available: true,
    activeProvider: "Local Browser AI (@imgly/background-removal)",
  };
}
