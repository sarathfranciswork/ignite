"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";

interface WhiteLabelTheme {
  platformName: string;
  logoUrl: string | null;
  logoSmallUrl: string | null;
  faviconUrl: string | null;
  loginBannerUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

const DEFAULT_THEME: WhiteLabelTheme = {
  platformName: "Ignite",
  logoUrl: null,
  logoSmallUrl: null,
  faviconUrl: null,
  loginBannerUrl: null,
  primaryColor: "#6366F1",
  secondaryColor: "#8B5CF6",
  accentColor: "#EC4899",
};

const WhiteLabelContext = createContext<WhiteLabelTheme>(DEFAULT_THEME);

export function useWhiteLabel() {
  return useContext(WhiteLabelContext);
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function generateColorScale(hex: string, prefix: string): string {
  const { h, s } = hexToHsl(hex);

  const shades = [
    { name: "50", l: 97 },
    { name: "100", l: 94 },
    { name: "200", l: 86 },
    { name: "300", l: 76 },
    { name: "400", l: 64 },
    { name: "500", l: 52 },
    { name: "600", l: 44 },
    { name: "700", l: 36 },
    { name: "800", l: 28 },
    { name: "900", l: 20 },
    { name: "950", l: 12 },
  ];

  return shades.map((shade) => `--${prefix}-${shade.name}: ${h} ${s}% ${shade.l}%;`).join("\n    ");
}

function applyThemeColors(theme: WhiteLabelTheme) {
  const root = document.documentElement;

  const primaryVars = generateColorScale(theme.primaryColor, "color-primary");
  const secondaryVars = generateColorScale(theme.secondaryColor, "color-secondary");
  const accentVars = generateColorScale(theme.accentColor, "color-accent");

  const style = document.getElementById("white-label-theme") ?? document.createElement("style");
  style.id = "white-label-theme";
  style.textContent = `
    :root {
    ${primaryVars}
    ${secondaryVars}
    ${accentVars}
    }
  `;

  if (!document.getElementById("white-label-theme")) {
    root.appendChild(style);
  }
}

function applyFavicon(faviconUrl: string | null) {
  if (!faviconUrl) return;

  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = faviconUrl;
}

interface WhiteLabelProviderProps {
  children: ReactNode;
}

export function WhiteLabelProvider({ children }: WhiteLabelProviderProps) {
  const { data } = trpc.whiteLabel.getPublic.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const theme = data ?? DEFAULT_THEME;

  useEffect(() => {
    applyThemeColors(theme);
    applyFavicon(theme.faviconUrl);
  }, [theme]);

  useEffect(() => {
    if (theme.platformName !== "Ignite") {
      document.title = theme.platformName;
    }
  }, [theme.platformName]);

  return <WhiteLabelContext.Provider value={theme}>{children}</WhiteLabelContext.Provider>;
}
