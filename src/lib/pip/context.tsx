"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * What Pip is allowed to do with the puzzle currently on screen. The play
 * screen registers these; Pip calls them. Every ability is the real local game
 * engine — nothing here touches a network.
 */
export interface PuzzleAbilities {
  /** Reveal the selected square. False if nothing is selected. */
  revealSquare: () => boolean;
  /** Reveal the active word. False if there is no active word. */
  revealWord: () => boolean;
  /** The active entry's answer plus its editorial explanation, if any. */
  explainActive: () => { answer: string; explanation?: string } | null;
  /** True once the puzzle is finished, so Pip stops offering hints. */
  isComplete: boolean;
}

interface PipContextValue {
  abilities: PuzzleAbilities | null;
  register: (abilities: PuzzleAbilities | null) => void;
}

const PipContext = createContext<PipContextValue>({
  abilities: null,
  register: () => undefined,
});

export function PipProvider({ children }: { children: ReactNode }) {
  const [abilities, setAbilities] = useState<PuzzleAbilities | null>(null);
  const register = useCallback((next: PuzzleAbilities | null) => {
    setAbilities(next);
  }, []);
  const value = useMemo(() => ({ abilities, register }), [abilities, register]);
  return <PipContext.Provider value={value}>{children}</PipContext.Provider>;
}

export function usePip() {
  return useContext(PipContext);
}

/**
 * Register the current puzzle's abilities with Pip for as long as the play
 * screen is mounted. The latest callbacks are kept in a ref so re-registering
 * on every keystroke isn't necessary.
 */
export function usePipRegistration(abilities: PuzzleAbilities) {
  const { register } = usePip();
  const latest = useRef(abilities);
  latest.current = abilities;

  const { isComplete } = abilities;

  useEffect(() => {
    register({
      revealSquare: () => latest.current.revealSquare(),
      revealWord: () => latest.current.revealWord(),
      explainActive: () => latest.current.explainActive(),
      isComplete,
    });
    return () => register(null);
  }, [register, isComplete]);
}
