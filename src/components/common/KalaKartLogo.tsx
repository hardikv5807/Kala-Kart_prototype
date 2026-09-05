import React from "react";

interface KalaKartLogoProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "hero";
  alt?: string;
  showBorder?: boolean;
}

const sizeClasses = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-16 h-16",
  xl: "w-24 h-24",
  hero: "w-32 h-32 sm:w-36 sm:h-36",
};

export const OFFICIAL_LOGO_PATH = "/WhatsApp Image 2026-08-31 at 19.51.33.jpeg";

export const KalaKartLogo: React.FC<KalaKartLogoProps> = ({
  className = "",
  size = "md",
  alt = "Kala-Kart Official Logo",
  showBorder = false,
}) => {
  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 overflow-hidden rounded-2xl ${
        showBorder ? "border border-amber-900/20 shadow-sm" : ""
      } ${sizeClasses[size]} ${className}`}
    >
      <img
        src={OFFICIAL_LOGO_PATH}
        alt={alt}
        className="w-full h-full object-contain select-none"
        loading="eager"
        draggable={false}
        referrerPolicy="no-referrer"
        onError={(e) => {
          // Fallback to alias paths if needed
          const target = e.currentTarget;
          if (target.src.includes("WhatsApp")) {
            target.src = "/kala-kart-logo.jpeg";
          }
        }}
      />
    </div>
  );
};
