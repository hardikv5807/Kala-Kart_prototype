/**
 * Real Image Enhancement & Background Removal Service Abstraction
 * Supports pluggable external background removal providers (e.g. Remove.bg, ClipDrop, custom ML endpoint)
 * Never exposes API keys or secrets to client-side code.
 */

export interface ImageEnhancementOptions {
  lightingMode?: string;
  backdropType?: string;
  showDropShadow?: boolean;
}

export interface EnhancementResult {
  success: boolean;
  enhancedImageUrl?: string; // base64 data URL or public URL
  provider?: string;
  error?: string;
  code?: string;
}

export interface ImageEnhancementProvider {
  id: string;
  name: string;
  isConfigured(): boolean;
  enhance(
    imageBuffer: Buffer,
    mimeType: string,
    options?: ImageEnhancementOptions
  ): Promise<EnhancementResult>;
}

/**
 * Provider: Remove.bg API integration
 */
export class RemoveBgProvider implements ImageEnhancementProvider {
  id = "remove-bg";
  name = "Remove.bg AI Studio";

  isConfigured(): boolean {
    const key = process.env.REMOVE_BG_API_KEY;
    return Boolean(key && key.trim() !== "" && key !== "YOUR_REMOVE_BG_KEY");
  }

  async enhance(
    imageBuffer: Buffer,
    mimeType: string,
    options?: ImageEnhancementOptions
  ): Promise<EnhancementResult> {
    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "Remove.bg API key not configured.",
        code: "PROVIDER_NOT_CONFIGURED",
      };
    }

    try {
      const base64Image = imageBuffer.toString("base64");
      const formData = new URLSearchParams();
      formData.append("image_file_b64", base64Image);
      formData.append("size", "auto");
      formData.append("format", "png");
      // Omit bg_color so Remove.bg returns a transparent PNG cutout with alpha channel

      const response = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: {
          "X-Api-Key": apiKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Remove.bg API error (status ${response.status})`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.errors && parsed.errors[0]?.title) {
            errorMessage = parsed.errors[0].title;
          }
        } catch {
          // Keep default message
        }
        return {
          success: false,
          error: errorMessage,
          code: "PROVIDER_API_ERROR",
          provider: this.name,
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      const outputBuffer = Buffer.from(arrayBuffer);
      const enhancedImageUrl = `data:image/png;base64,${outputBuffer.toString("base64")}`;

      return {
        success: true,
        enhancedImageUrl,
        provider: this.name,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to communicate with Remove.bg API",
        code: "PROVIDER_NETWORK_ERROR",
        provider: this.name,
      };
    }
  }
}

/**
 * Provider: ClipDrop Background Removal API
 */
export class ClipDropProvider implements ImageEnhancementProvider {
  id = "clipdrop";
  name = "ClipDrop AI Background Removal";

  isConfigured(): boolean {
    const key = process.env.CLIPDROP_API_KEY;
    return Boolean(key && key.trim() !== "" && key !== "YOUR_CLIPDROP_KEY");
  }

  async enhance(
    imageBuffer: Buffer,
    mimeType: string,
    options?: ImageEnhancementOptions
  ): Promise<EnhancementResult> {
    const apiKey = process.env.CLIPDROP_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "ClipDrop API key not configured.",
        code: "PROVIDER_NOT_CONFIGURED",
      };
    }

    try {
      const form = new FormData();
      const blob = new Blob([imageBuffer], { type: mimeType });
      form.append("image_file", blob, "input.png");

      const response = await fetch("https://clipdrop-api.co/remove-background/v1", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
        },
        body: form,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `ClipDrop API error: ${errorText || response.statusText}`,
          code: "PROVIDER_API_ERROR",
          provider: this.name,
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      const outputBuffer = Buffer.from(arrayBuffer);
      const enhancedImageUrl = `data:image/png;base64,${outputBuffer.toString("base64")}`;

      return {
        success: true,
        enhancedImageUrl,
        provider: this.name,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to communicate with ClipDrop API",
        code: "PROVIDER_NETWORK_ERROR",
        provider: this.name,
      };
    }
  }
}

/**
 * Provider: Custom ML / Microservice Webhook
 */
export class CustomServiceEndpointProvider implements ImageEnhancementProvider {
  id = "custom-service";
  name = "Custom ML Background Removal Service";

  isConfigured(): boolean {
    const url = process.env.IMAGE_ENHANCE_API_URL;
    return Boolean(url && url.trim() !== "");
  }

  async enhance(
    imageBuffer: Buffer,
    mimeType: string,
    options?: ImageEnhancementOptions
  ): Promise<EnhancementResult> {
    const endpoint = process.env.IMAGE_ENHANCE_API_URL;
    if (!endpoint) {
      return {
        success: false,
        error: "Custom image enhancement endpoint not configured.",
        code: "PROVIDER_NOT_CONFIGURED",
      };
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": mimeType,
      };
      if (process.env.IMAGE_ENHANCE_API_KEY) {
        headers["Authorization"] = `Bearer ${process.env.IMAGE_ENHANCE_API_KEY}`;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: imageBuffer,
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          success: false,
          error: `Custom endpoint error: ${errText || response.statusText}`,
          code: "PROVIDER_API_ERROR",
          provider: this.name,
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      const outputBuffer = Buffer.from(arrayBuffer);
      const enhancedImageUrl = `data:image/png;base64,${outputBuffer.toString("base64")}`;

      return {
        success: true,
        enhancedImageUrl,
        provider: this.name,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to communicate with custom ML service",
        code: "PROVIDER_NETWORK_ERROR",
        provider: this.name,
      };
    }
  }
}

/**
 * Master Image Enhancement Service Manager
 */
export class ImageEnhancementService {
  private providers: ImageEnhancementProvider[] = [];

  constructor() {
    this.registerProvider(new RemoveBgProvider());
    this.registerProvider(new ClipDropProvider());
    this.registerProvider(new CustomServiceEndpointProvider());
  }

  registerProvider(provider: ImageEnhancementProvider) {
    this.providers.push(provider);
  }

  getProviders(): ImageEnhancementProvider[] {
    return this.providers;
  }

  getActiveProvider(): ImageEnhancementProvider | null {
    return this.providers.find((p) => p.isConfigured()) || null;
  }

  isAvailable(): boolean {
    return this.getActiveProvider() !== null;
  }

  getStatus() {
    const active = this.getActiveProvider();
    return {
      available: active !== null,
      activeProvider: active ? active.name : null,
      configuredProviders: this.providers.filter((p) => p.isConfigured()).map((p) => p.name),
      supportedProviders: this.providers.map((p) => p.name),
    };
  }

  async enhanceImage(
    imageBuffer: Buffer,
    mimeType: string,
    options?: ImageEnhancementOptions
  ): Promise<EnhancementResult> {
    const activeProvider = this.getActiveProvider();

    if (!activeProvider) {
      return {
        success: false,
        error:
          "Real AI image enhancement provider is not configured yet. Configure a background-removal service (such as REMOVE_BG_API_KEY, CLIPDROP_API_KEY, or IMAGE_ENHANCE_API_URL in server environment).",
        code: "PROVIDER_NOT_CONFIGURED",
      };
    }

    try {
      return await activeProvider.enhance(imageBuffer, mimeType, options);
    } catch (error: any) {
      console.error(`Error in provider ${activeProvider.name}:`, error);
      return {
        success: false,
        error: error.message || `Failed to process image with ${activeProvider.name}`,
        code: "PROVIDER_EXECUTION_ERROR",
        provider: activeProvider.name,
      };
    }
  }
}

// Singleton instance for server-side usage
export const imageEnhancementService = new ImageEnhancementService();
