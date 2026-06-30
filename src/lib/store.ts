import { create } from "zustand";

export type ViewKey =
  | "dashboard"
  | "approvals"
  | "transactions"
  | "items"
  | "locations"
  | "projects"
  | "guides"
  | "reports"
  | "scanner"
  | "audit";

interface UserOption { id: string; fullName: string; role: string }

interface UIState {
  view: ViewKey;
  setView: (v: ViewKey) => void;

  // Acting user (in lieu of NextAuth session for this single-tenant demo)
  currentUserId: string | null;
  currentUserName: string | null;
  users: UserOption[];
  setUsers: (u: UserOption[]) => void;
  setCurrentUser: (id: string, name: string) => void;

  // QR scanner modal — optionally pre-bound to a transaction
  scannerOpen: boolean;
  scannerTransactionId: number | null;
  openScanner: (txnId?: number) => void;
  closeScanner: () => void;

  // Theme
  theme: "light" | "dark";
  toggleTheme: () => void;
  setTheme: (t: "light" | "dark") => void;

  // Sidebar collapse (mobile + desktop)
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

// No persist middleware — avoids setState-during-render hydration issues.
// Theme is persisted by next-themes; acting user defaults to admin each session.
export const useUI = create<UIState>((set, get) => ({
  view: "dashboard",
  setView: (view) => set({ view }),

  currentUserId: null,
  currentUserName: null,
  users: [],
  setUsers: (users) => set({ users }),
  setCurrentUser: (id, name) => set({ currentUserId: id, currentUserName: name }),

  scannerOpen: false,
  scannerTransactionId: null,
  openScanner: (txnId = null) => set({ scannerOpen: true, scannerTransactionId: txnId }),
  closeScanner: () => set({ scannerOpen: false, scannerTransactionId: null }),

  theme: "light",
  toggleTheme: () => set({ theme: get().theme === "light" ? "dark" : "light" }),
  setTheme: (theme) => set({ theme }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
