import React, { useState } from "react";
import { JETPACK_COMPOSE_ARCHITECTURE, KotlinCodeFile } from "../../data/jetpackComposeCode";
import { 
  Code2, 
  Copy, 
  Check, 
  X, 
  FileCode2, 
  Smartphone, 
  Layers, 
  Cpu, 
  Palette,
  FileText
} from "lucide-react";

interface CodeInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CodeInspectorModal: React.FC<CodeInspectorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedFile, setSelectedFile] = useState<KotlinCodeFile>(
    JETPACK_COMPOSE_ARCHITECTURE[0]
  );
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "ui":
        return <Smartphone className="w-4 h-4 text-blue-400" />;
      case "viewmodel":
        return <Cpu className="w-4 h-4 text-emerald-400" />;
      case "pipeline":
        return <Layers className="w-4 h-4 text-amber-400" />;
      case "theme":
        return <Palette className="w-4 h-4 text-purple-400" />;
      default:
        return <FileCode2 className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-6 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white">
                  SIH 2026 Kotlin & Jetpack Compose Architecture
                </h3>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Android Native • Problem #26090
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Principal Mobile & AI Solutions Engineer Blueprint
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Two-pane layout: File explorer & Code Viewer */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* File list sidebar */}
          <div className="w-full md:w-72 bg-slate-950/60 border-r border-slate-800 p-3 overflow-y-auto space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2 py-1 block">
              Kotlin & Compose Sources
            </span>
            {JETPACK_COMPOSE_ARCHITECTURE.map((file) => {
              const isSelected = selectedFile.name === file.name;
              return (
                <button
                  key={file.name}
                  type="button"
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-mono flex items-center gap-2.5 transition-all ${
                    isSelected
                      ? "bg-slate-800 text-amber-300 font-bold border border-slate-700 shadow-xs"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                >
                  {getCategoryIcon(file.category)}
                  <span className="truncate">{file.name}</span>
                </button>
              );
            })}

            {/* Architecture Highlights */}
            <div className="mt-4 p-3 bg-slate-900 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-2">
              <span className="font-bold text-amber-400 block">
                ⭐ SIH 2026 Core Pillars:
              </span>
              <p>• <strong>Low-Literacy UI:</strong> 64dp targets & Speech-first audio buttons.</p>
              <p>• <strong>Studio Pipeline:</strong> CameraX + Neural segmenter for soft studio background.</p>
              <p>• <strong>Gemini Multimodal:</strong> Structured JSON spec extraction from Indian dialects.</p>
              <p>• <strong>3-Tier INR Pricing:</strong> Mathematical base, market & exhibition formula.</p>
            </div>
          </div>

          {/* Code Content */}
          <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-900/80">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-amber-400 font-bold">
                  {selectedFile.name}
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  — {selectedFile.description}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex-1 p-4 overflow-auto font-mono text-xs text-slate-300 leading-relaxed bg-[#0F172A]">
              <pre className="select-text whitespace-pre-wrap">{selectedFile.code}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
