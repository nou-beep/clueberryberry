/**
 * The seat a browser is holding, kept in localStorage so a refresh returns to
 * the same participant — same display name, same colour, same grid — instead
 * of creating a second ghost seat.
 */

export interface StoredSeat {
  code: string;
  roomId: string;
  participantId: string;
  displayName: string;
  token: string;
  /** Epoch ms; a stale seat is discarded rather than presented to the server. */
  expiresAt: number;
}

const KEY = "clueberry.room-seat.v1";
/** Locally muted or blocked participants: a viewer choice, not room state. */
const HIDDEN_KEY = "clueberry.room-hidden.v1";

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Private browsing or a full quota: the seat simply will not persist. */
  }
}

export function loadSeat(code: string): StoredSeat | null {
  const seats = read<Record<string, StoredSeat>>(KEY) ?? {};
  const seat = seats[code];
  if (!seat) return null;
  if (seat.expiresAt <= Date.now()) {
    clearSeat(code);
    return null;
  }
  return seat;
}

/** Codes this browser holds live seats for, newest first. */
export function listSeatCodes(): string[] {
  const seats = read<Record<string, StoredSeat>>(KEY) ?? {};
  const now = Date.now();
  return Object.values(seats)
    .filter((seat) => seat.expiresAt > now)
    .sort((a, b) => b.expiresAt - a.expiresAt)
    .map((seat) => seat.code);
}

export function saveSeat(seat: StoredSeat): void {
  const seats = read<Record<string, StoredSeat>>(KEY) ?? {};
  seats[seat.code] = seat;
  write(KEY, seats);
}

export function clearSeat(code: string): void {
  const seats = read<Record<string, StoredSeat>>(KEY) ?? {};
  delete seats[code];
  write(KEY, seats);
}

/** The last guest name typed, offered as the default next time. */
const NAME_KEY = "clueberry.guest-name.v1";

export function loadGuestName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveGuestName(name: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NAME_KEY, name);
  } catch {
    /* ignore */
  }
}

export interface HiddenParticipants {
  muted: string[];
  blocked: string[];
}

export function loadHidden(code: string): HiddenParticipants {
  const all = read<Record<string, HiddenParticipants>>(HIDDEN_KEY) ?? {};
  return all[code] ?? { muted: [], blocked: [] };
}

export function saveHidden(code: string, value: HiddenParticipants): void {
  const all = read<Record<string, HiddenParticipants>>(HIDDEN_KEY) ?? {};
  all[code] = value;
  write(HIDDEN_KEY, all);
}
