"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface AppSettings {
  /** "lamp" is the warm evening mode (see docs/design-system.md). */
  theme: "light" | "lamp" | "system";
  reducedMotion: boolean;
  sound: boolean;
  autoCheck: boolean;
  showTimer: boolean;
  highContrast: boolean;
  textSize: "normal" | "large";
  dyslexiaFont: boolean;
  puzzleLanguage: "en" | "fr" | "ar";
  arabicFoldAlef: boolean;
  arabicFoldYa: boolean;
  /** ؤ / ئ are distinct letters: off unless the player opts in. */
  arabicFoldHamzaWaw: boolean;
  arabicFoldHamzaYa: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  reducedMotion: false,
  sound: true,
  autoCheck: false,
  showTimer: true,
  highContrast: false,
  textSize: "normal",
  dyslexiaFont: false,
  puzzleLanguage: "en",
  arabicFoldAlef: true,
  arabicFoldYa: true,
  arabicFoldHamzaWaw: false,
  arabicFoldHamzaYa: false,
};

const STORAGE_KEY = "compendium.settings";

interface SettingsContextValue {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  update: () => undefined,
});

export function applySettingsToDocument(s: AppSettings) {
  const el = document.documentElement;
  const lamp =
    s.theme === "lamp" ||
    (s.theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  el.dataset.theme = lamp ? "lamp" : "light";
  el.dataset.contrast = s.highContrast ? "high" : "normal";
  el.dataset.textsize = s.textSize;
  el.dataset.dyslexia = String(s.dyslexiaFont);
  el.dataset.motion = s.reducedMotion ? "reduced" : "full";
}

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    applySettingsToDocument(loaded);
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Private browsing / storage full: settings stay in-memory.
      }
      applySettingsToDocument(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

/** Inline pre-hydration script: applies stored theme before first paint. */
export const SETTINGS_BOOT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(
  STORAGE_KEY
)})||"{}");var t=s.theme||"system";var lamp=t==="lamp"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.dataset.theme=lamp?"lamp":"light";e.dataset.contrast=s.highContrast?"high":"normal";e.dataset.textsize=s.textSize||"normal";e.dataset.dyslexia=String(!!s.dyslexiaFont);e.dataset.motion=s.reducedMotion?"reduced":"full";}catch(err){}})();`;
