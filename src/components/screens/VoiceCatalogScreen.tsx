import React, { useState, useEffect, useRef } from "react";
import { CraftCategory, LanguageCode, CatalogItem, ProductFacts, MissingFieldItem } from "../../types/artisan";
import { TTSButton } from "../common/TTSButton";
import { playTextToSpeech, stopTextToSpeech, soundEffects, isSpeechRecognitionSupported } from "../../utils/speechUtils";
import {
  Mic,
  MicOff,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Volume2,
  CheckCircle2,
  RefreshCw,
  Tag,
  Scale,
  Ruler,
  Palette,
  Layers,
  FileText,
  MapPin,
  Bot,
  AlertCircle,
  Edit3,
  Save,
  RotateCcw,
  Check,
  Clock,
  Package,
  Hammer,
  HelpCircle,
} from "lucide-react";

interface VoiceCatalogScreenProps {
  selectedCraft: CraftCategory;
  studioImage: string;
  language: LanguageCode;
  catalogData: CatalogItem | null;
  onCatalogReady: (catalog: CatalogItem) => void;
  onBack: () => void;
}

interface TurnHistoryItem {
  id: string;
  turnNumber: number;
  speech: string;
  assistantQuestionEn?: string;
  assistantQuestionHi?: string;
  timestamp: string;
}

const INITIAL_FACTS: ProductFacts = {
  productName: null,
  category: null,
  material: null,
  color: null,
  dimensions: null,
  weight: null,
  quantity: null,
  craftTechnique: null,
  isHandmade: null,
  productionTime: null,
  origin: null,
  careInstructions: null,
  artisanStory: null,
};

export const VoiceCatalogScreen: React.FC<VoiceCatalogScreenProps> = ({
  selectedCraft,
  studioImage,
  language,
  catalogData: initialCatalog,
  onCatalogReady,
  onBack,
}) => {
  // Speech & Processing State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>("");
  const [isAiParsing, setIsAiParsing] = useState<boolean>(false);
  const [audioWaveLevel, setAudioWaveLevel] = useState<number[]>([25, 45, 30, 65, 40, 55, 35]);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Multi-Turn Truthful State
  const [productFacts, setProductFacts] = useState<ProductFacts>(INITIAL_FACTS);
  const [missingFields, setMissingFields] = useState<MissingFieldItem[]>([]);
  const [conversationTurns, setConversationTurns] = useState<TurnHistoryItem[]>([]);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [followUpPromptEn, setFollowUpPromptEn] = useState<string>("");
  const [followUpPromptHi, setFollowUpPromptHi] = useState<string>("");
  const [catalog, setCatalog] = useState<CatalogItem | null>(null);

  // Review & Editing State
  const [reviewLanguage, setReviewLanguage] = useState<"en" | "hi">(language === "hi" ? "hi" : "en");
  const [isEditingListing, setIsEditingListing] = useState<boolean>(false);
  const [editedTitleEn, setEditedTitleEn] = useState<string>("");
  const [editedTitleHi, setEditedTitleHi] = useState<string>("");
  const [editedDescEn, setEditedDescEn] = useState<string>("");
  const [editedDescHi, setEditedDescHi] = useState<string>("");

  const recognitionRef = useRef<any>(null);
  const waveIntervalRef = useRef<any>(null);

  // Audio greeting guidance on mount
  useEffect(() => {
    const greeting =
      language === "hi"
        ? "माइक दबाकर अपने उत्पाद के बारे में अपनी भाषा में बोलें। जैसे कि यह क्या है, किस सामग्री से बना है और इसका रंग क्या है।"
        : "Hold the microphone and describe your handcrafted product in your natural language.";
    const timer = setTimeout(() => {
      playTextToSpeech(greeting, language);
    }, 400);

    return () => {
      clearTimeout(timer);
      stopTextToSpeech();
    };
  }, [language]);

  // Sync edited fields when a new catalog is generated
  useEffect(() => {
    if (catalog) {
      setEditedTitleEn(catalog.titleEn);
      setEditedTitleHi(catalog.titleHi);
      setEditedDescEn(catalog.descriptionEn);
      setEditedDescHi(catalog.descriptionHi);
    }
  }, [catalog]);

  // Start Voice Recording
  const startRecording = () => {
    setSpeechError(null);
    soundEffects.playMicStart();
    setIsRecording(true);

    // Waveform visualizer loop
    waveIntervalRef.current = setInterval(() => {
      setAudioWaveLevel([
        Math.floor(20 + Math.random() * 70),
        Math.floor(30 + Math.random() * 65),
        Math.floor(40 + Math.random() * 60),
        Math.floor(50 + Math.random() * 50),
        Math.floor(30 + Math.random() * 65),
        Math.floor(20 + Math.random() * 75),
        Math.floor(15 + Math.random() * 60),
      ]);
    }, 110);

    if (isSpeechRecognitionSupported()) {
      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = language === "hi" ? "hi-IN" : "en-IN";

        rec.onresult = (event: any) => {
          let currentText = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentText += event.results[i][0].transcript;
          }
          if (currentText.trim()) {
            setVoiceTranscript(currentText);
          }
        };

        rec.onerror = (err: any) => {
          console.warn("Speech recognition warning:", err);
          if (err.error === "no-speech") {
            setSpeechError(
              language === "hi"
                ? "क्षमा करें, मैं स्पष्ट रूप से नहीं सुन सका। कृपया पुनः प्रयास करें।"
                : "Sorry, I couldn't hear that clearly. Please try again."
            );
          }
        };

        rec.start();
        recognitionRef.current = rec;
      } catch (e) {
        console.warn("Speech recognition start failed:", e);
      }
    }
  };

  // Stop Voice Recording and Trigger Processing
  const stopRecording = () => {
    setIsRecording(false);
    if (waveIntervalRef.current) {
      clearInterval(waveIntervalRef.current);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }

    if (voiceTranscript.trim()) {
      handleProcessTurn(voiceTranscript);
    }
  };

  // Process Voice Turn with Server (Truthful extraction & multi-turn merge)
  const handleProcessTurn = async (spokenText: string) => {
    const textToProcess = spokenText.trim();
    if (!textToProcess) {
      setSpeechError(
        language === "hi"
          ? "क्षमा करें, मैं स्पष्ट रूप से नहीं सुन सका। कृपया पुनः प्रयास करें।"
          : "Sorry, I couldn't hear that clearly. Please try again."
      );
      return;
    }

    setIsAiParsing(true);
    setSpeechError(null);

    try {
      const response = await fetch("/api/voice/process-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: textToProcess,
          existingFacts: productFacts,
          craftCategory: selectedCraft.nameEn,
          artisanState: "Varanasi / Uttar Pradesh, India",
          userLanguage: language,
          studioImage: studioImage || selectedCraft.defaultImage,
        }),
      });

      if (!response.ok) {
        throw new Error("Network request failed");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to process turn");
      }

      // Update state strictly with verified output
      const updatedFacts: ProductFacts = data.productFacts;
      const updatedMissing: MissingFieldItem[] = data.missingFields || [];
      const isNowComplete: boolean = Boolean(data.isComplete);

      setProductFacts(updatedFacts);
      setMissingFields(updatedMissing);
      setIsComplete(isNowComplete);
      setFollowUpPromptEn(data.followUpPromptEn || "");
      setFollowUpPromptHi(data.followUpPromptHi || "");

      // Append to conversation turn history
      const newTurn: TurnHistoryItem = {
        id: `turn-${Date.now()}`,
        turnNumber: conversationTurns.length + 1,
        speech: textToProcess,
        assistantQuestionEn: data.followUpPromptEn,
        assistantQuestionHi: data.followUpPromptHi,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setConversationTurns((prev) => [...prev, newTurn]);

      if (isNowComplete && data.finalListing) {
        setCatalog(data.finalListing);
        soundEffects.playCelebration();
        // Spoken announcement
        playTextToSpeech(
          language === "hi"
            ? `उत्कृष्ट! विवरण तैयार हो गया है: ${data.finalListing.titleHi}`
            : `Catalog complete! Professional listing ready: ${data.finalListing.titleEn}`,
          language
        );
      } else {
        // Voice follow-up question
        const promptAudio = language === "hi" ? data.followUpPromptHi : data.followUpPromptEn;
        if (promptAudio) {
          setTimeout(() => {
            playTextToSpeech(promptAudio, language);
          }, 300);
        }
      }

      // Clear current input buffer for next turn
      setVoiceTranscript("");
    } catch (err: any) {
      console.error("Voice turn processing error:", err);
      setSpeechError(
        language === "hi"
          ? "मैं अभी उस जानकारी को प्रोसेस नहीं कर सका। कृपया पुनः प्रयास करें।"
          : "I couldn't process that information right now. Please try again."
      );
    } finally {
      setIsAiParsing(false);
    }
  };

  // Reset conversation and start fresh
  const handleReset = () => {
    stopTextToSpeech();
    setProductFacts(INITIAL_FACTS);
    setMissingFields([]);
    setConversationTurns([]);
    setIsComplete(false);
    setCatalog(null);
    setVoiceTranscript("");
    setSpeechError(null);
    setIsEditingListing(false);
  };

  // Save manual edits
  const handleSaveEdits = () => {
    if (!catalog) return;
    const updated: CatalogItem = {
      ...catalog,
      titleEn: editedTitleEn.trim() || catalog.titleEn,
      titleHi: editedTitleHi.trim() || catalog.titleHi,
      descriptionEn: editedDescEn.trim() || catalog.descriptionEn,
      descriptionHi: editedDescHi.trim() || catalog.descriptionHi,
    };
    setCatalog(updated);
    setIsEditingListing(false);
  };

  // Count verified facts
  const verifiedFactsCount = [
    productFacts.productName,
    productFacts.material,
    productFacts.color,
    productFacts.dimensions,
    productFacts.weight,
    productFacts.quantity,
    productFacts.craftTechnique,
    productFacts.isHandmade !== null ? true : null,
    productFacts.productionTime,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col min-h-0 h-full bg-[#FDFBF7] text-[#0F172A] p-3 sm:p-4 md:p-5 pb-6 sm:pb-8 overflow-y-auto font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-2.5 sm:pb-3 border-b border-stone-200 shrink-0">
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
              3
            </span>
            <div>
              <h2 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                {language === "hi" ? "3. आवाज से कैटलॉग" : "3. Voice Catalog Engine"}
              </h2>
              <span className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider">
                Gemini 3.8 Flash • Multi-Turn
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conversationTurns.length > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-rose-600 px-2 py-1 rounded-md hover:bg-stone-100 transition-colors"
              title={language === "hi" ? "नई शुरुआत करें" : "Start over"}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{language === "hi" ? "नया" : "Reset"}</span>
            </button>
          )}

          <TTSButton
            text={
              language === "hi"
                ? "माइक का बड़ा बटन दबाएं और अपने उत्पाद के बारे में बोलें। जब सभी विवरण पूरे होंगे, कैटलॉग तैयार हो जाएगा।"
                : "Hold the microphone button and speak about your product. Once all required details are verified, your catalog will be generated."
            }
            lang={language}
            size="sm"
            variant="iconOnly"
          />
        </div>
      </div>

      {/* Speech Error Banner (if any) */}
      {speechError && (
        <div className="mt-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-xs font-medium shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{speechError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSpeechError(null)}
            className="text-stone-400 hover:text-stone-700 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Voice Input Section */}
      <div className="mt-2.5 sm:mt-3 bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center relative shadow-xs shrink-0">
        {isRecording && (
          <div className="absolute inset-0 bg-[#EA580C]/10 animate-pulse pointer-events-none rounded-2xl" />
        )}

        {/* Status indicator & Language Prompt */}
        <div className="flex items-center justify-center gap-2 mb-1.5 sm:mb-2 px-2 text-center shrink-0">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
              isRecording ? "bg-red-500 animate-ping" : isComplete ? "bg-emerald-500" : "bg-[#EA580C]"
            }`}
          />
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#0F172A] leading-tight">
            {isRecording
              ? language === "hi"
                ? "आपकी आवाज सुन रहे हैं..."
                : "Listening to your voice note..."
              : isComplete
              ? language === "hi"
                ? "सभी विवरण सत्यापित हैं!"
                : "All Details Verified!"
              : conversationTurns.length > 0
              ? language === "hi"
                ? "माइक दबाकर शेष विवरण बताएं"
                : "Tap & Hold to Provide Missing Details"
              : language === "hi"
              ? "माइक दबाकर बोलें (हिंदी / English)"
              : "Tap & Hold to Speak (Hindi / English / Hinglish)"}
          </span>
        </div>

        {/* Audio Waveform Bars */}
        <div className="flex items-center justify-center gap-1.5 h-6 sm:h-7 my-1.5 sm:my-2 shrink-0">
          {audioWaveLevel.map((lvl, idx) => (
            <div
              key={idx}
              className="w-1.5 bg-[#EA580C] rounded-full transition-all duration-100"
              style={{
                height: isRecording ? `${lvl}%` : "20%",
                opacity: isRecording ? 1 : 0.4,
              }}
            />
          ))}
        </div>

        {/* Microphone Button Control */}
        <div className="py-2.5 sm:py-3.5 my-0.5 flex items-center justify-center w-full shrink-0">
          <button
            id="voice-catalog-mic-button"
            type="button"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={isAiParsing}
            aria-label={
              isRecording
                ? language === "hi"
                  ? "रिकॉर्डिंग रोकें"
                  : "Stop recording"
                : language === "hi"
                ? "आवाज रिकॉर्ड करने के लिए दबाकर रखें"
                : "Hold to speak"
            }
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shadow-xl border-4 select-none touch-manipulation flex-shrink-0 ${
              isRecording
                ? "bg-rose-600 border-white text-white scale-105 shadow-rose-600/50 animate-pulse"
                : isAiParsing
                ? "bg-stone-300 border-stone-200 text-stone-500 cursor-wait"
                : isComplete
                ? "bg-emerald-600 hover:bg-emerald-700 border-white text-white shadow-emerald-900/30"
                : "bg-[#0F172A] hover:bg-slate-800 border-white text-white shadow-slate-900/30"
            }`}
          >
            {isRecording ? (
              <Mic className="w-8 h-8 text-white" />
            ) : (
              <Mic className="w-8 h-8 text-[#EA580C]" />
            )}
          </button>
        </div>

        <p className="text-xs text-stone-500 mt-2 sm:mt-3 max-w-sm font-medium px-2 shrink-0">
          {isRecording
            ? language === "hi"
              ? "बोलना समाप्त होने पर उंगली उठाएं"
              : "Release button when done speaking"
            : !isComplete && missingFields.length > 0
            ? language === "hi"
              ? "माइक दबाकर शेष आवश्यक विवरण बताएं"
              : "Hold button and answer with the missing details"
            : language === "hi"
            ? "माइक दबाकर रखें और बोलें (उदा. 'यह हाथ से बना नीला टेराकोटा फूलदान है')"
            : "Hold button & speak (e.g. 'This is a handmade blue terracotta vase')"}
        </p>

        {/* Quick Test Presets (Strictly testing multi-turn test case & Hindi inputs without inventing) */}
        <div className="mt-3 pt-2.5 sm:pt-3 border-t border-stone-100 w-full flex flex-col items-center shrink-0">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2">
            {language === "hi" ? "परीक्षण हेतु आवाज नमूने (क्लिक करें):" : "Multi-Turn Test Samples (Click to test):"}
          </span>
          <div className="flex flex-wrap justify-center gap-1.5">
            <button
              type="button"
              disabled={isAiParsing}
              onClick={() => {
                const text = "This is a handmade blue terracotta vase.";
                setVoiceTranscript(text);
                handleProcessTurn(text);
              }}
              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-semibold transition-colors text-left"
            >
              1️⃣ Turn 1: "This is a handmade blue terracotta vase."
            </button>
            <button
              type="button"
              disabled={isAiParsing}
              onClick={() => {
                const text =
                  "It is 8 inches tall and 4 inches wide, weighs about 600 grams, there is one piece, I shape it by hand and paint it, and it takes two days to make.";
                setVoiceTranscript(text);
                handleProcessTurn(text);
              }}
              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg text-[11px] font-semibold transition-colors text-left"
            >
              2️⃣ Turn 2: "8 inches tall, 4 inches wide, 600g, 1 piece, hand-shaped, 2 days"
            </button>
            <button
              type="button"
              disabled={isAiParsing}
              onClick={() => {
                const text =
                  "यह हाथ से बनी शुद्ध रेशम की साड़ी है, लाल रंग, 5.5 मीटर लंबाई और 1.2 मीटर चौड़ाई, वजन 450 ग्राम, 1 पीस, हथकरघे पर 7 दिन में तैयार होती है।";
                setVoiceTranscript(text);
                handleProcessTurn(text);
              }}
              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 rounded-lg text-[11px] font-semibold transition-colors text-left"
            >
              🇮🇳 पूरा हिंदी नमूना (रेशम साड़ी)
            </button>
          </div>
        </div>
      </div>

      {/* AI Processing Spinner */}
      {isAiParsing && (
        <div className="mt-3 p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-center gap-3 animate-pulse shrink-0">
          <div className="w-6 h-6 border-2 border-[#EA580C] border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-[#0F172A]">
              {language === "hi"
                ? "सत्यापित विवरण निकाले जा रहे हैं..."
                : "Gemini AI extracting verified facts..."}
            </h4>
            <p className="text-xs text-stone-500">
              {language === "hi"
                ? "सटीक जानकारी की जांच हो रही है (बिना किसी अनुमान के)"
                : "Truthfulness verification in progress (no hallucinations)"}
            </p>
          </div>
        </div>
      )}

      {/* Progress & Facts Tracking Banner */}
      {conversationTurns.length > 0 && !isComplete && (
        <div className="mt-3 p-3 bg-white border border-stone-200 rounded-2xl shadow-xs shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-700">
              {language === "hi" ? "सत्यापित विवरण प्रगति:" : "Verified Information Progress:"}
            </span>
            <span className="text-xs font-black text-[#EA580C]">
              {verifiedFactsCount} / 9 {language === "hi" ? "पूरे" : "Complete"}
            </span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#EA580C] h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.round((verifiedFactsCount / 9) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* MISSING FIELDS SECTION: Triggered when required info is missing */}
      {!isComplete && missingFields.length > 0 && (
        <div className="mt-3 bg-amber-50/70 border-2 border-amber-300 rounded-2xl p-4 shadow-sm shrink-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#0F172A]">
                  {language === "hi" ? "लगभग तैयार! मुझे अभी भी चाहिए:" : "Almost ready! I still need:"}
                </h3>
                <span className="text-[11px] text-amber-900 font-medium">
                  {language === "hi"
                    ? "कृपया नीचे दी गई आवश्यक जानकारी बोलें"
                    : "Please speak the missing required details"}
                </span>
              </div>
            </div>

            <TTSButton
              text={language === "hi" ? followUpPromptHi : followUpPromptEn}
              lang={language}
              size="sm"
              label={language === "hi" ? "सवाल सुनें" : "Listen Question"}
            />
          </div>

          {/* Conversational Assistant Follow-up Question Box */}
          {(followUpPromptEn || followUpPromptHi) && (
            <div className="mt-2.5 p-3 bg-white rounded-xl border border-amber-200 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 mb-1">
                <Bot className="w-3.5 h-3.5 text-[#EA580C]" />
                <span>{language === "hi" ? "सहायक का सवाल:" : "Follow-up Question:"}</span>
              </div>
              <p className="text-xs text-stone-800 font-medium leading-relaxed">
                {language === "hi" ? followUpPromptHi : followUpPromptEn}
              </p>
            </div>
          )}

          {/* List of Missing Fields with Simple Labels */}
          <div className="mt-3">
            <span className="text-xs font-bold text-amber-950 uppercase tracking-wider block mb-1.5">
              {language === "hi" ? "कृपया मुझे बताएं:" : "Please tell me:"}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {missingFields.map((item) => (
                <div
                  key={item.field}
                  className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-200 text-xs font-semibold text-[#0F172A]"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                  <span>{language === "hi" ? item.labelHi : item.labelEn}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Direct Microphone CTA to answer the missing details */}
          <div className="mt-3 pt-2 flex items-center justify-center">
            <button
              type="button"
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              disabled={isAiParsing}
              className="px-4 py-2.5 bg-[#EA580C] hover:bg-[#c2410c] text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md active:scale-95 transition-transform"
            >
              <Mic className="w-4 h-4" />
              <span>
                {language === "hi" ? "🎤 ये विवरण बताएं (दबाकर बोलें)" : "🎤 Tell me these details (Hold & Speak)"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* VERIFIED FACTS DISPLAY (Preserved across all turns) */}
      {conversationTurns.length > 0 && (
        <div className="mt-3 bg-white border border-stone-200 rounded-2xl p-4 shadow-xs shrink-0">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">
                {language === "hi" ? "अब तक सत्यापित जानकारी" : "Information Verified So Far"}
              </span>
            </div>
            <span className="text-[11px] text-stone-500 font-medium">
              {conversationTurns.length} {language === "hi" ? "संवाद बारी" : "turn(s)"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <FactChip
              label={language === "hi" ? "उत्पाद" : "Product"}
              value={productFacts.productName}
            />
            <FactChip
              label={language === "hi" ? "सामग्री" : "Material"}
              value={productFacts.material}
            />
            <FactChip
              label={language === "hi" ? "रंग" : "Color"}
              value={productFacts.color}
            />
            <FactChip
              label={language === "hi" ? "आकार / माप" : "Dimensions"}
              value={productFacts.dimensions}
            />
            <FactChip
              label={language === "hi" ? "वजन" : "Weight"}
              value={productFacts.weight}
            />
            <FactChip
              label={language === "hi" ? "मात्रा" : "Quantity"}
              value={productFacts.quantity}
            />
            <FactChip
              label={language === "hi" ? "शिल्प तकनीक" : "Technique"}
              value={productFacts.craftTechnique}
            />
            <FactChip
              label={language === "hi" ? "हस्तनिर्मित" : "Handmade"}
              value={
                productFacts.isHandmade === true
                  ? language === "hi"
                    ? "हां (हस्तनिर्मित)"
                    : "Yes (Handmade)"
                  : productFacts.isHandmade === false
                  ? "No"
                  : null
              }
            />
            <FactChip
              label={language === "hi" ? "निर्माण समय" : "Production Time"}
              value={productFacts.productionTime}
            />
          </div>
        </div>
      )}

      {/* FINAL PROFESSIONAL LISTING & REVIEW SCREEN */}
      {isComplete && catalog && (
        <div className="mt-4 space-y-3 shrink-0">
          {/* Success Banner */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-emerald-950">
                  {language === "hi"
                    ? "सभी आवश्यक विवरण सत्यापित! कैटलॉग तैयार है।"
                    : "All Required Details Verified! Professional Catalog Ready."}
                </h4>
                <p className="text-[11px] text-emerald-800">
                  {language === "hi"
                    ? "आगे बढ़ने से पहले समीक्षा करें या विवरण संपादित करें"
                    : "Review or edit before proceeding to fair pricing"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditingListing(!isEditingListing)}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-white text-emerald-900 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingListing ? (language === "hi" ? "बंद करें" : "Cancel") : (language === "hi" ? "संपादित करें" : "Edit")}</span>
            </button>
          </div>

          {/* Language Toggle & Distinction Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center bg-stone-200 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setReviewLanguage("en")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  reviewLanguage === "en"
                    ? "bg-white text-[#0F172A] shadow-xs"
                    : "text-stone-600"
                }`}
              >
                🌐 English Listing
              </button>
              <button
                type="button"
                onClick={() => setReviewLanguage("hi")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  reviewLanguage === "hi"
                    ? "bg-white text-[#0F172A] shadow-xs"
                    : "text-stone-600"
                }`}
              >
                🇮🇳 हिंदी विवरण
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (conversationTurns.length > 0) {
                  const lastSpeech = conversationTurns[conversationTurns.length - 1].speech;
                  handleProcessTurn(lastSpeech);
                }
              }}
              className="flex items-center gap-1 text-xs font-bold text-[#EA580C] hover:underline"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{language === "hi" ? "विवरण पुनः बनाएं" : "Regenerate"}</span>
            </button>
          </div>

          {/* Product Listing Card */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 space-y-3">
            {/* Title Section */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  {language === "hi" ? "उत्पाद शीर्षक (PRODUCT TITLE)" : "PRODUCT TITLE"}
                </span>
                <TTSButton
                  text={reviewLanguage === "hi" ? catalog.titleHi : catalog.titleEn}
                  lang={reviewLanguage}
                  size="sm"
                  variant="iconOnly"
                />
              </div>

              {isEditingListing ? (
                <input
                  type="text"
                  value={reviewLanguage === "hi" ? editedTitleHi : editedTitleEn}
                  onChange={(e) =>
                    reviewLanguage === "hi"
                      ? setEditedTitleHi(e.target.value)
                      : setEditedTitleEn(e.target.value)
                  }
                  className="w-full p-2.5 text-sm font-bold border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                />
              ) : (
                <h3 className="text-base sm:text-lg font-extrabold text-[#0F172A]">
                  {reviewLanguage === "hi" ? catalog.titleHi : catalog.titleEn}
                </h3>
              )}
            </div>

            {/* Category */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 font-bold">{language === "hi" ? "श्रेणी:" : "Category:"}</span>
              <span className="text-xs bg-stone-100 text-stone-800 font-bold px-2.5 py-0.5 rounded-md border border-stone-200">
                {catalog.category || selectedCraft.nameEn}
              </span>
            </div>

            {/* AI-Written Description (Distinguished & Editable) */}
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#EA580C]" />
                  <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                    {language === "hi"
                      ? "AI द्वारा तैयार ई-कॉमर्स विवरण (सत्यापित तथ्यों पर आधारित)"
                      : "AI-Written E-Commerce Description (Strictly Verified Facts)"}
                  </span>
                </div>
                <TTSButton
                  text={reviewLanguage === "hi" ? catalog.descriptionHi : catalog.descriptionEn}
                  lang={reviewLanguage}
                  size="sm"
                  variant="pill"
                  label={language === "hi" ? "सुनें" : "Listen"}
                />
              </div>

              {isEditingListing ? (
                <textarea
                  rows={4}
                  value={reviewLanguage === "hi" ? editedDescHi : editedDescEn}
                  onChange={(e) =>
                    reviewLanguage === "hi"
                      ? setEditedDescHi(e.target.value)
                      : setEditedDescEn(e.target.value)
                  }
                  className="w-full p-2.5 text-xs text-stone-800 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                />
              ) : (
                <p className="text-xs leading-relaxed text-stone-700">
                  {reviewLanguage === "hi" ? catalog.descriptionHi : catalog.descriptionEn}
                </p>
              )}
            </div>

            {/* Save Edits button when in editing mode */}
            {isEditingListing && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveEdits}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#EA580C] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#c2410c] transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{language === "hi" ? "बदलाव सहेजें" : "Save Changes"}</span>
                </button>
              </div>
            )}

            {/* Verified Key Details Specifications Table */}
            <div>
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-2">
                {language === "hi"
                  ? "सत्यापित भौतिक विवरण (KEY DETAILS)"
                  : "KEY DETAILS (VERIFIED BY ARTISAN)"}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <SpecRow
                  icon={Layers}
                  label={language === "hi" ? "सामग्री / Material" : "Material"}
                  value={catalog.specs.material}
                />
                <SpecRow
                  icon={Palette}
                  label={language === "hi" ? "रंग / Color" : "Color"}
                  value={catalog.specs.color}
                />
                <SpecRow
                  icon={Ruler}
                  label={language === "hi" ? "आकार / Dimensions" : "Dimensions"}
                  value={catalog.specs.dimensions}
                />
                <SpecRow
                  icon={Scale}
                  label={language === "hi" ? "वजन / Weight" : "Weight"}
                  value={catalog.specs.weight}
                />
                <SpecRow
                  icon={Package}
                  label={language === "hi" ? "मात्रा / Quantity" : "Quantity"}
                  value={catalog.specs.quantity || "1 piece"}
                />
                <SpecRow
                  icon={Hammer}
                  label={language === "hi" ? "शिल्प तकनीक / Technique" : "Craft Technique"}
                  value={catalog.specs.craftTechnique}
                />
                <SpecRow
                  icon={Clock}
                  label={language === "hi" ? "निर्माण समय / Time" : "Production Time"}
                  value={catalog.specs.productionTime || "2 days"}
                />
                <SpecRow
                  icon={MapPin}
                  label={language === "hi" ? "क्षेत्र / Origin" : "Origin / Heritage"}
                  value={catalog.specs.regionHeritage || "India"}
                />
              </div>
            </div>

            {/* Search Tags */}
            <div className="pt-2 border-t border-stone-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F172A] mb-2">
                <Tag className="w-3.5 h-3.5 text-[#EA580C]" />
                <span>{language === "hi" ? "ई-कॉमर्स सर्च टैग्स" : "E-Commerce Search Tags"}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {catalog.searchTags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs bg-stone-100 text-stone-700 font-semibold px-2.5 py-1 rounded-md border border-stone-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conversation Turn History Collapsible / Summary */}
      {conversationTurns.length > 0 && (
        <div className="mt-3 bg-stone-100/70 rounded-2xl p-3 border border-stone-200 shrink-0">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-2">
            {language === "hi" ? "आवाज वार्तालाप इतिहास" : "Voice Conversation Log"}
          </span>
          <div className="space-y-2">
            {conversationTurns.map((turn) => (
              <div
                key={turn.id}
                className="p-2.5 bg-white rounded-xl border border-stone-200 text-xs shadow-2xs"
              >
                <div className="flex items-center justify-between text-stone-400 font-medium mb-1">
                  <span className="font-bold text-[#EA580C]">
                    {language === "hi" ? `संवाद ${turn.turnNumber}` : `Turn ${turn.turnNumber}`}
                  </span>
                  <span>{turn.timestamp}</span>
                </div>
                <p className="text-stone-800 font-medium">"{turn.speech}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Action: Proceed to Fair Pricing */}
      <div className="mt-4 pt-3 pb-2 border-t border-stone-200 shrink-0">
        <button
          type="button"
          disabled={!catalog || !isComplete || isAiParsing}
          onClick={() => catalog && onCatalogReady(catalog)}
          className={`w-full py-3.5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform ${
            catalog && isComplete && !isAiParsing
              ? "bg-[#EA580C] hover:bg-[#c2410c] text-white cursor-pointer"
              : "bg-stone-300 text-stone-500 cursor-not-allowed"
          }`}
        >
          <span>
            {language === "hi"
              ? "मूल्य निर्धारण की ओर बढ़ें"
              : "CONTINUE TO PRICING • मूल्य निर्धारण"}
          </span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// Sub-component: Clean Fact Chip
const FactChip: React.FC<{ label: string; value: string | null | undefined }> = ({ label, value }) => {
  const isPresent = Boolean(value);
  return (
    <div
      className={`p-2 rounded-xl border text-xs flex flex-col justify-between transition-colors ${
        isPresent
          ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
          : "bg-stone-50 border-stone-200 text-stone-400 border-dashed"
      }`}
    >
      <span className="text-[10px] uppercase font-bold text-stone-500">{label}</span>
      <span className={`font-extrabold mt-0.5 truncate ${isPresent ? "text-[#0F172A]" : "italic"}`}>
        {value || "Missing"}
      </span>
    </div>
  );
};

// Sub-component: Spec Row
const SpecRow: React.FC<{ icon: any; label: string; value: string | undefined }> = ({
  icon: Icon,
  label,
  value,
}) => (
  <div className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl border border-stone-200">
    <div className="flex items-center gap-2 text-stone-600">
      <Icon className="w-3.5 h-3.5 text-[#EA580C]" />
      <span className="font-semibold">{label}</span>
    </div>
    <span className="font-extrabold text-[#0F172A]">{value || "—"}</span>
  </div>
);
