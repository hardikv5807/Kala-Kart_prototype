import React, { useState, useEffect, useRef, useCallback } from "react";
import { CraftCategory, LanguageCode, StudioOptions, StudioPreset } from "../../types/artisan";
import {
  removeBackgroundLocally,
  preloadLocalAI,
  applyStudioPreset,
  processStudioImage,
} from "../../utils/imageStudio";
import { playTextToSpeech, soundEffects } from "../../utils/speechUtils";
import { TTSButton } from "../common/TTSButton";
import {
  Camera,
  Upload,
  Sparkles,
  Sliders,
  Sun,
  Layers,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  RefreshCw,
  Eye,
  Zap,
  Image as ImageIcon,
  AlertCircle,
  X,
} from "lucide-react";

interface ImageStudioScreenProps {
  selectedCraft: CraftCategory;
  language: LanguageCode;
  initialRawImage?: string | null;
  initialStudioImage?: string | null;
  onImageReady: (rawImage: string, studioImage: string) => void;
  onBack: () => void;
}

export const ImageStudioScreen: React.FC<ImageStudioScreenProps> = ({
  selectedCraft,
  language,
  initialRawImage = null,
  initialStudioImage = null,
  onImageReady,
  onBack,
}) => {
  // Current raw image, transparent cutout, and processed studio image
  const [currentRawImage, setCurrentRawImage] = useState<string | null>(initialRawImage || null);
  const [transparentCutout, setTransparentCutout] = useState<string | null>(null);
  const [studioImage, setStudioImage] = useState<string | null>(initialStudioImage || null);
  const [currentPreset, setCurrentPreset] = useState<StudioPreset>("clean-studio");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [pipelineStep, setPipelineStep] = useState<number>(0);
  const [loadingProgress, setLoadingProgress] = useState<{ message: string; percent?: number }>({
    message: "Preparing AI Studio...",
  });
  const [sliderPos, setSliderPos] = useState<number>(50); // Split comparison slider (0 to 100)

  const hasPhoto = Boolean(currentRawImage && currentRawImage.trim() !== "");

  // Camera state & stream lifecycle
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraStarting, setIsCameraStarting] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [enhancementError, setEnhancementError] = useState<string | null>(null);

  // Preload local AI on component mount to warm up model cache in background
  useEffect(() => {
    preloadLocalAI();
  }, []);

  // Studio enhancement options
  const [studioOptions, setStudioOptions] = useState<StudioOptions>({
    preset: "clean-studio",
    lightingMode: "studio-soft",
    brightness: 1.05,
    contrast: 1.18,
    sharpness: 1.6,
    backdropType: "clean-studio",
    showDropShadow: true,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sliderContainerRef = useRef<HTMLDivElement | null>(null);

  // Full studio pipeline: executes on-device AI background removal locally in the browser,
  // then composites the authentic transparent product cutout onto the chosen studio preset.
  const runStudioPipeline = async (
    imageSrc: string,
    preset: StudioPreset = currentPreset,
    forceRefreshCutout = false
  ) => {
    if (!imageSrc) return;
    setIsProcessing(true);
    setEnhancementError(null);
    soundEffects.playCameraShutter();

    try {
      let cutout = transparentCutout;

      // Only perform background removal if we don't have a cutout yet or forced refresh
      if (!cutout || forceRefreshCutout) {
        setPipelineStep(1); // 1. Preparing AI Studio...
        setLoadingProgress({
          message: language === "hi" ? "AI स्टूडियो तैयार हो रहा है..." : "Preparing AI Studio...",
        });

        // Run local browser AI segmentation (no external servers or API keys required)
        cutout = await removeBackgroundLocally(imageSrc, (p) => {
          setLoadingProgress({
            message:
              language === "hi"
                ? p.stage === "preparing"
                  ? "AI स्टूडियो तैयार हो रहा है..."
                  : p.stage === "removing"
                  ? "बैकग्राउंड हटाया जा रहा है..."
                  : "लगभग पूरा हो गया..."
                : p.message,
            percent: p.percent,
          });
          if (p.stage === "preparing") setPipelineStep(1);
          else if (p.stage === "removing") setPipelineStep(2);
          else if (p.stage === "finalizing") setPipelineStep(3);
        });

        setTransparentCutout(cutout);
      }

      setPipelineStep(3); // 3. Rendering chosen studio preset
      setLoadingProgress({
        message: language === "hi" ? "स्टूडियो प्रीसेट लागू हो रहा है..." : "Almost done...",
      });
      const enhanced = await applyStudioPreset(cutout, preset);
      setStudioImage(enhanced);
      setEnhancementError(null);
      setIsProcessing(false);
      setPipelineStep(0);

      playTextToSpeech(
        language === "hi"
          ? "स्टूडियो फोटो तैयार है! नीचे दिए गए स्लाइडर से पहले और बाद का अंतर देखें।"
          : "Studio photo ready! Use the slider to compare before and after.",
        language
      );
    } catch (err: any) {
      console.warn("Local browser AI background removal or preset rendering failed:", err);
      setIsProcessing(false);
      setPipelineStep(0);
      setEnhancementError(
        err.message ||
          (language === "hi"
            ? "स्थानीय AI बैकग्राउंड हटाने में असमर्थ रहा। कृपया पुनः प्रयास करें।"
            : "Local AI background removal failed to process product image. Please retry.")
      );
    }
  };

  // Fast preset switching: reuses the existing transparent cutout in memory (0 extra processing)
  const handlePresetChange = async (preset: StudioPreset) => {
    setCurrentPreset(preset);
    setStudioOptions((prev) => ({
      ...prev,
      preset,
      backdropType: preset,
    }));

    if (transparentCutout) {
      // Re-composite locally without calling the background-removal model again
      setIsProcessing(true);
      setEnhancementError(null);
      try {
        const rendered = await applyStudioPreset(transparentCutout, preset);
        setStudioImage(rendered);
        setIsProcessing(false);
      } catch (err: any) {
        setIsProcessing(false);
        setEnhancementError(err.message || "Failed to render studio preset.");
      }
    } else if (currentRawImage) {
      // If cutout is not yet loaded, run the full pipeline
      runStudioPipeline(currentRawImage, preset);
    }
  };

  useEffect(() => {
    if (currentRawImage) {
      runStudioPipeline(currentRawImage, currentPreset);
    }
  }, []);

  // Stop all camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn("Error stopping media stream track:", e);
        }
      });
      mediaStreamRef.current = null;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn("Error stopping cameraStream track:", e);
        }
      });
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStream(null);
    setIsCameraActive(false);
  }, [cameraStream]);

  // Stop all camera tracks when component unmounts or leaving the camera screen
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            console.warn("Error stopping track on unmount:", e);
          }
        });
        mediaStreamRef.current = null;
      }
    };
  }, []);

  // Callback ref: Attaches camera stream immediately when the <video> element mounts
  const setVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;
      if (node && cameraStream) {
        if (node.srcObject !== cameraStream) {
          node.srcObject = cameraStream;
        }
        node.play().catch((err) => {
          console.warn("Video playback on mount:", err);
        });
      }
    },
    [cameraStream]
  );

  // Synchronize stream with video element whenever isCameraActive and cameraStream change
  useEffect(() => {
    let isMounted = true;
    const video = videoRef.current;
    if (isCameraActive && cameraStream && video) {
      if (video.srcObject !== cameraStream) {
        video.srcObject = cameraStream;
      }
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (isMounted) {
            console.warn("Video play error in effect:", err);
          }
        });
      }
    }
    return () => {
      isMounted = false;
    };
  }, [isCameraActive, cameraStream]);

  // Request camera permissions and start video stream
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraStarting(true);

    // Stop existing stream if any
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("CAMERA_NOT_SUPPORTED");
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (constraintErr) {
        console.warn("Environment camera constraint failed, retrying with default video:", constraintErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      mediaStreamRef.current = stream;
      setCameraStream(stream);
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setIsCameraActive(false);
      setCameraStream(null);
      mediaStreamRef.current = null;

      let msg = language === "hi"
        ? "कैमरा उपलब्ध नहीं हो सका। कृपया गैलरी से फोटो चुनें या पुनः प्रयास करें।"
        : "Camera could not be accessed. Please select a photo from your gallery or try again.";

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = language === "hi"
          ? "कैमरा अनुमति अस्वीकृत कर दी गई है। कृपया ब्राउज़र सेटिंग्स में कैमरा अनुमति दें या नीचे दिए गए बटन से फोटो चुनें।"
          : "Camera permission was denied. Please grant camera access in browser settings or select a photo from your device.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = language === "hi"
          ? "डिवाइस पर कोई कैमरा नहीं मिला। कृपया गैलरी से फोटो चुनें।"
          : "No camera device detected on this device. Please select an image from your gallery.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        msg = language === "hi"
          ? "कैमरा किसी अन्य ऐप द्वारा उपयोग में है। कृपया उसे बंद करके पुनः प्रयास करें या गैलरी से चुनें।"
          : "Camera is busy in another application. Please close other camera apps and retry or choose from gallery.";
      }

      setCameraError(msg);
    } finally {
      setIsCameraStarting(false);
    }
  };

  // Draw current live frame to canvas and capture real data URL
  const captureCameraFrame = () => {
    const video = videoRef.current;
    if (!video) return;

    const width = video.videoWidth || video.clientWidth || 1280;
    const height = video.videoHeight || video.clientHeight || 720;

    if (width === 0 || height === 0) {
      console.warn("Video dimensions not yet ready for capture");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      // Draw actual live video frame
      ctx.drawImage(video, 0, 0, width, height);

      // Create genuine data URL
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      soundEffects.playCameraShutter();

      // Display captured image in existing preview UI
      setCurrentRawImage(dataUrl);
      setStudioImage(dataUrl);
      setTransparentCutout(null); // Reset cutout for new authentic photo

      // Stop camera tracks cleanly
      stopCamera();

      // Trigger studio pipeline on the real photo
      runStudioPipeline(dataUrl, currentPreset, true);
    }
  };

  // Fallback: device gallery / file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setCurrentRawImage(result);
          setStudioImage(result);
          setTransparentCutout(null); // Reset cutout for new authentic photo
          stopCamera();
          runStudioPipeline(result, currentPreset, true);
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset file input value so same file can be selected again if desired
    e.target.value = "";
  };

  // Handle back navigation safely with camera cleanup
  const handleBack = () => {
    stopCamera();
    onBack();
  };

  // Handle proceeding with camera cleanup
  const handleConfirmAndProceed = () => {
    if (!currentRawImage) return;
    stopCamera();
    onImageReady(currentRawImage, studioImage || currentRawImage);
  };

  // Dragging slider logic
  const handleSliderMove = (clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setSliderPos(pos);
  };

  return (
    <div className="flex flex-col h-full bg-[#FDFBF7] text-[#0F172A] p-4 sm:p-5 overflow-y-auto font-sans">
      {/* Header Bar with Kala-Kart Branding */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 bg-[#EA580C] rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-xs">
              2
            </span>
            <div>
              <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                {language === "hi" ? "2. AI फोटो स्टूडियो" : "2. AI Image Studio"}
              </h2>
              <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">
                {selectedCraft.nameEn}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasPhoto && (
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                studioImage && studioImage !== currentRawImage
                  ? "bg-emerald-100 text-emerald-800"
                  : enhancementError
                  ? "bg-amber-100 text-amber-800"
                  : "bg-stone-100 text-stone-700"
              }`}
            >
              {studioImage && studioImage !== currentRawImage
                ? "AI ENHANCED"
                : enhancementError
                ? (language === "hi" ? "मूल फोटो (AI अनुपलब्ध)" : "ORIGINAL PHOTO (AI UNAVAILABLE)")
                : (language === "hi" ? "मूल फोटो" : "ORIGINAL PHOTO")}
            </span>
          )}
          <TTSButton
            text={
              hasPhoto
                ? language === "hi"
                  ? "स्टूडियो फोटो तैयार है। नीचे दिए गए स्लाइडर से अंतर देखें या लाइटिंग बदलें।"
                  : "Studio photo ready. Compare before and after or change lighting preset."
                : language === "hi"
                  ? "यहाँ अपने उत्पाद की फोटो लें। हमारा AI बैकग्राउंड साफ करके स्टूडियो जैसी चमक देगा।"
                  : "Capture your handicraft photo. AI will remove cluttered backgrounds and enhance lighting."
            }
            lang={language}
            size="sm"
            variant="iconOnly"
          />
        </div>
      </div>

      {/* Main Studio Viewport / Camera / Before-After Comparison / Empty State */}
      <div className="mt-3 relative flex-1 min-h-[280px] max-h-[420px] rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 shadow-sm flex flex-col items-center justify-center">
        {isCameraActive ? (
          /* Live Camera Stream with Mounted Video Element */
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <video
              ref={setVideoRef}
              playsInline
              autoPlay
              muted
              className="w-full h-full object-cover"
              onLoadedMetadata={() => {
                videoRef.current?.play().catch((err) => console.warn("Video play on metadata:", err));
              }}
            />
            {/* Viewfinder Target Framing Grid */}
            <div className="absolute inset-8 border-2 border-dashed border-white/60 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
              <div className="text-center bg-black/60 text-white text-xs px-3 py-1 rounded-full self-center backdrop-blur-xs font-semibold">
                {language === "hi" ? "उत्पाद को बीच में रखें" : "Center your craft item"}
              </div>
              <div className="text-center text-[11px] text-white/80 font-medium">
                {language === "hi" ? "पर्याप्त रोशनी रखें" : "Ensure good lighting"}
              </div>
            </div>

            {/* Camera Snap Controls & Gallery Switcher */}
            <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 px-4 z-20">
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2 bg-slate-800/90 hover:bg-slate-700 text-white rounded-full text-xs font-semibold backdrop-blur-xs shadow-md active:scale-95 transition-transform"
              >
                {language === "hi" ? "रद्द करें" : "Cancel"}
              </button>

              {/* Massive 64x64dp Camera Capture Button */}
              <button
                type="button"
                onClick={captureCameraFrame}
                className="w-16 h-16 rounded-full bg-[#EA580C] hover:bg-[#c2410c] border-4 border-white shadow-2xl flex items-center justify-center text-white active:scale-90 transition-transform text-2xl"
                title={language === "hi" ? "फोटो खींचें" : "Capture Photo"}
              >
                📷
              </button>

              {/* Gallery Fallback Action Inside Camera */}
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  fileInputRef.current?.click();
                }}
                className="px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700 text-white rounded-full text-xs font-semibold backdrop-blur-xs shadow-md flex items-center gap-1.5 active:scale-95 transition-transform"
                title={language === "hi" ? "गैलरी से चुनें" : "Select from Gallery"}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{language === "hi" ? "गैलरी" : "Gallery"}</span>
              </button>
            </div>
          </div>
        ) : hasPhoto ? (
          /* Interactive Before / After Split Comparison Slider - Only shown when actual user photo exists */
          <div
            ref={sliderContainerRef}
            className="relative w-full h-full select-none cursor-ew-resize overflow-hidden bg-white"
            onMouseMove={(e) => handleSliderMove(e.clientX)}
            onTouchMove={(e) => {
              if (e.touches[0]) handleSliderMove(e.touches[0].clientX);
            }}
          >
            {/* Studio Processed Image (Background Base) */}
            <img
              src={studioImage || currentRawImage!}
              alt="AI Studio Enhanced"
              className="w-full h-full object-contain bg-[#FDFBF7]"
            />

            {/* Original Raw Image (Clipped with slider width) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPos}%` }}
            >
              <img
                src={currentRawImage!}
                alt="Original Photo"
                className="absolute inset-0 w-full h-full object-contain max-w-none bg-stone-200"
                style={{
                  width: sliderContainerRef.current?.offsetWidth || "100%",
                }}
              />
              <div className="absolute top-4 left-4 z-10 bg-black/60 text-white text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-xs">
                {language === "hi" ? "कच्चा फोटो (मूल)" : "Original Background"}
              </div>
            </div>

            {/* Studio Badge Top Right */}
            <div className="absolute top-4 right-4 bg-[#0F172A] text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5 border border-white/20">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>
                {studioImage && studioImage !== currentRawImage
                  ? currentPreset === "clean-studio"
                    ? (language === "hi" ? "क्लीन स्टूडियो" : "Clean Studio")
                    : currentPreset === "soft-pedestal"
                    ? (language === "hi" ? "सॉफ्ट पैडेस्टल" : "Soft Pedestal")
                    : (language === "hi" ? "वॉर्म डेलाइट" : "Warm Daylight")
                  : (language === "hi" ? "मूल उत्पाद फोटो" : "Original Photo")}
              </span>
            </div>

            {/* Draggable Divider Line & Handle */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] z-20 pointer-events-none"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#0F172A] text-white shadow-lg flex items-center justify-center font-bold text-xs border-2 border-white">
                ⮂
              </div>
            </div>

            {/* Step Progress Overlay when AI Pipeline runs */}
            {isProcessing && (
              <div className="absolute inset-0 bg-[#0F172A]/90 backdrop-blur-xs z-30 flex flex-col items-center justify-center p-6 text-white text-center select-none">
                <div className="w-14 h-14 rounded-full border-4 border-[#EA580C] border-t-transparent animate-spin mb-4" />
                <h4 className="font-bold text-base sm:text-lg">
                  {loadingProgress.message || (
                    pipelineStep === 1
                      ? (language === "hi" ? "AI स्टूडियो तैयार हो रहा है..." : "Preparing AI Studio...")
                      : pipelineStep === 2
                      ? (language === "hi" ? "बैकग्राउंड हटाया जा रहा है..." : "Removing background...")
                      : (language === "hi" ? "लगभग पूरा हो गया..." : "Almost done...")
                  )}
                </h4>
                {loadingProgress.percent !== undefined && (
                  <div className="w-52 max-w-full bg-white/20 rounded-full h-2 mt-3.5 overflow-hidden">
                    <div
                      className="bg-[#EA580C] h-full rounded-full transition-all duration-300"
                      style={{ width: `${loadingProgress.percent}%` }}
                    />
                  </div>
                )}
                <p className="text-xs text-stone-300 mt-3 max-w-xs leading-relaxed">
                  {language === "hi"
                    ? "स्थानीय ब्राउज़र AI (On-device) द्वारा बैकग्राउंड निष्कासन • 100% निःशुल्क एवं सुरक्षित"
                    : "On-device Browser AI background removal • 100% free & completely private"}
                </p>
                <p className="text-[11px] text-stone-400 mt-1 max-w-xs">
                  {language === "hi"
                    ? "पहली बार मॉडल लोड होने में कुछ क्षण लग सकते हैं, बाद के फोटो तुरंत प्रोसेस होंगे।"
                    : "Initial run downloads model to browser cache. Subsequent edits run instantly."}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Neutral Empty State Placeholder - No stock image used */
          <div className="w-full h-full p-6 flex flex-col items-center justify-center text-center bg-stone-50 select-none">
            <div className="w-16 h-16 rounded-2xl bg-white border border-stone-200 shadow-xs flex items-center justify-center text-stone-400 mb-3.5">
              <Camera className="w-8 h-8 text-stone-400 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-[#0F172A] tracking-tight">
              {language === "hi" ? "अभी कोई फोटो नहीं है" : "No photo yet"}
            </h3>
            <p className="text-xs text-stone-500 mt-1 max-w-[240px] leading-relaxed">
              {language === "hi"
                ? "अपने उत्पाद की फोटो लें या गैलरी से चुनें"
                : "Take a photo of your product or select one from your gallery."}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={startCamera}
                disabled={isCameraStarting}
                className="px-3.5 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs active:scale-95 transition-transform disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{language === "hi" ? "फोटो खींचें" : "Take Photo"}</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs active:scale-95 transition-transform"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{language === "hi" ? "गैलरी से चुनें" : "Select from Gallery"}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Enhancement Status / Provider Notice with Honest Error & Retry */}
      {enhancementError && hasPhoto && (
        <div className="mt-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                {language === "hi" ? "स्थानीय AI प्रोसेसिंग में त्रुटि" : "Local AI Background Removal Error"}
              </p>
              <p className="text-stone-600 mt-0.5 text-[11px] leading-relaxed">
                {enhancementError}
              </p>
              <p className="text-stone-500 mt-1 text-[11px]">
                {language === "hi"
                  ? "✓ आपकी मूल वास्तविक फोटो पूरी तरह सुरक्षित है।"
                  : "✓ Your authentic original photo is completely preserved."}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => currentRawImage && runStudioPipeline(currentRawImage, currentPreset, true)}
                  className="px-3 py-1 bg-[#EA580C] hover:bg-[#c2410c] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors active:scale-95"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{language === "hi" ? "पुनः प्रयास करें" : "Retry"}</span>
                </button>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEnhancementError(null)}
            className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg flex-shrink-0"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Camera Permission / Access Notice & Gallery Fallback */}
      {cameraError && (
        <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-2xs">
          <div className="flex items-start gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed">{cameraError}</p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-[#EA580C] hover:bg-[#c2410c] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{language === "hi" ? "गैलरी से चुनें" : "Select from Gallery"}</span>
            </button>
            <button
              type="button"
              onClick={() => setCameraError(null)}
              className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Snap / Upload / Preset Controls Toolbar */}
      <div className="mt-3 flex items-center justify-center gap-6 py-1">
        {/* Camera Snap Button (Take Photo) */}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={startCamera}
            disabled={isCameraStarting}
            className="w-14 h-14 sm:w-16 sm:h-16 bg-[#0F172A] hover:bg-slate-800 text-white rounded-full flex items-center justify-center text-2xl shadow-lg border-4 border-white active:scale-95 transition-transform disabled:opacity-50"
            title={language === "hi" ? "कैमरा से फोटो खींचें" : "Take Photo"}
          >
            {isCameraStarting ? <RefreshCw className="w-6 h-6 animate-spin" /> : "📷"}
          </button>
          <span className="text-[11px] font-semibold text-stone-700">
            {language === "hi" ? "फोटो खींचें" : "Take Photo"}
          </span>
        </div>

        {/* Device Gallery / File Upload Fallback */}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-14 h-14 sm:w-16 sm:h-16 bg-[#EA580C] hover:bg-[#c2410c] text-white rounded-full flex items-center justify-center text-2xl shadow-lg border-4 border-white active:scale-95 transition-transform"
            title={language === "hi" ? "गैलरी या फाइल से चुनें" : "Select from Gallery"}
          >
            <Upload className="w-6 h-6 text-white" />
          </button>
          <span className="text-[11px] font-semibold text-stone-700">
            {language === "hi" ? "गैलरी से चुनें" : "Device Gallery"}
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Studio Lighting & Backdrop Preset Chips - only shown when actual photo exists */}
      {hasPhoto && (
        <div className="mt-2 bg-white p-3 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-stone-600 mb-2">
            <span>{language === "hi" ? "स्टूडियो प्रीसेट (Studio Presets)" : "Studio Presets"}</span>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => currentRawImage && runStudioPipeline(currentRawImage, currentPreset, true)}
              className="flex items-center gap-1 text-[#EA580C] font-semibold hover:underline disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isProcessing ? "animate-spin" : ""}`} />
              <span>{language === "hi" ? "AI पुनः प्रोसेस करें" : "AI Re-enhance"}</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handlePresetChange("clean-studio")}
              className={`p-2 rounded-xl text-center text-xs font-semibold border transition-all disabled:opacity-50 ${
                currentPreset === "clean-studio"
                  ? "bg-[#FDFBF7] border-[#EA580C] text-[#0F172A] shadow-xs font-bold ring-1 ring-[#EA580C]"
                  : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
              }`}
            >
              ⚪ {language === "hi" ? "क्लीन स्टूडियो" : "Clean Studio"}
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handlePresetChange("soft-pedestal")}
              className={`p-2 rounded-xl text-center text-xs font-semibold border transition-all disabled:opacity-50 ${
                currentPreset === "soft-pedestal"
                  ? "bg-[#FDFBF7] border-[#EA580C] text-[#0F172A] shadow-xs font-bold ring-1 ring-[#EA580C]"
                  : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
              }`}
            >
              🏛️ {language === "hi" ? "सॉफ्ट पैडेस्टल" : "Soft Pedestal"}
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handlePresetChange("warm-daylight")}
              className={`p-2 rounded-xl text-center text-xs font-semibold border transition-all disabled:opacity-50 ${
                currentPreset === "warm-daylight"
                  ? "bg-[#FDFBF7] border-[#EA580C] text-[#0F172A] shadow-xs font-bold ring-1 ring-[#EA580C]"
                  : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
              }`}
            >
              ☀️ {language === "hi" ? "वॉर्म डेलाइट" : "Warm Daylight"}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Action: Proceed to Voice Engine */}
      <div className="mt-3.5 pt-3 border-t border-stone-200">
        <button
          type="button"
          disabled={!hasPhoto || isProcessing}
          onClick={handleConfirmAndProceed}
          className={`w-full py-3.5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all ${
            !hasPhoto || isProcessing
              ? "bg-stone-200 text-stone-400 cursor-not-allowed shadow-none"
              : "bg-[#EA580C] hover:bg-[#c2410c] text-white shadow-lg active:scale-95"
          }`}
        >
          <span>
            {language === "hi"
              ? "फोटो पक्की करें • बोलकर विवरण दें"
              : "CONFIRM PHOTO • VOICE CATALOG"}
          </span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

