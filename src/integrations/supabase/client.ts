import { io, type Socket } from "socket.io-client";

const TOKEN_KEY = "qh_access_token";
const BACKEND_URL = import.meta.env.VITE_API_URL || "";

// ---------------------------------------------------------------------------
// Minimal type surface (only what the app actually reads)
// ---------------------------------------------------------------------------
export type User = {
  id: string;
  email: string;
  phone?: string | null;
  user_metadata?: Record<string, unknown>;
};
export type Session = { access_token: string; user: User };
type AuthChangeEvent = "INITIAL_SESSION" | "SIGNED_IN" | "SIGNED_OUT" | "USER_UPDATED" | "PASSWORD_RECOVERY";
type AuthListener = (event: AuthChangeEvent, session: Session | null) => void;

// ---------------------------------------------------------------------------
// Low-level fetch helper
// ---------------------------------------------------------------------------
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

async function apiFetch(path: string, init?: RequestInit) {
  const token = getToken();
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${BACKEND_URL}/api${path}`, { ...init, headers });
  return res.json();
}

// ---------------------------------------------------------------------------
// Realtime (Socket.io) — one shared connection, reconnected on auth changes
// ---------------------------------------------------------------------------
let socket: Socket | null = null;
function getSocket(): Socket {
  if (!socket) {
    socket = io(BACKEND_URL, { path: "/socket.io", auth: { token: getToken() }, transports: ["websocket", "polling"] });
  }
  return socket;
}
function reconnectSocket() {
  if (socket) {
    socket.auth = { token: getToken() };
    socket.disconnect().connect();
  } else {
    getSocket();
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
const listeners = new Set<AuthListener>();

function setSession(session: Session | null) {
  if (typeof window !== "undefined") {
    if (session) window.localStorage.setItem(TOKEN_KEY, session.access_token);
    else window.localStorage.removeItem(TOKEN_KEY);
  }
  reconnectSocket();
}

function notify(event: AuthChangeEvent, session: Session | null) {
  for (const l of listeners) l(event, session);
}

async function currentSession(): Promise<Session | null> {
  const token = getToken();
  if (!token) return null;
  const { data, error } = await apiFetch("/auth/session");
  if (error || !data?.session) return null;
  return { access_token: token, user: data.session.user };
}

const auth = {
  async getSession() {
    const session = await currentSession();
    return { data: { session }, error: null as null };
  },
  async getUser() {
    const { data, error } = await apiFetch("/auth/user");
    if (error) return { data: { user: null }, error };
    return { data: { user: data.user as User | null }, error: null };
  },
  onAuthStateChange(cb: AuthListener) {
    listeners.add(cb);
    currentSession().then((s) => cb("INITIAL_SESSION", s));
    return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
  },
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const { data, error } = await apiFetch("/auth/signin", { method: "POST", body: JSON.stringify({ email, password }) });
    if (error) return { data: { user: null, session: null }, error };
    setSession(data.session);
    notify("SIGNED_IN", data.session);
    return { data, error: null };
  },
  async signInWithGoogle(idToken: string) {
    const { data, error } = await apiFetch("/auth/google", { method: "POST", body: JSON.stringify({ idToken }) });
    if (error) return { data: { user: null, session: null }, error };
    setSession(data.session);
    notify("SIGNED_IN", data.session);
    return { data, error: null };
  },
  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, unknown>; emailRedirectTo?: string } }) {
    const { data, error } = await apiFetch("/auth/signup", { method: "POST", body: JSON.stringify({ email, password, options }) });
    if (error) return { data: { user: null, session: null }, error };
    setSession(data.session);
    notify("SIGNED_IN", data.session);
    return { data, error: null };
  },
  async signOut() {
    await apiFetch("/auth/signout", { method: "POST" });
    setSession(null);
    notify("SIGNED_OUT", null);
    return { error: null };
  },
  async resetPasswordForEmail(email: string, opts?: { redirectTo?: string }) {
    const redirectTo = opts?.redirectTo || `${window.location.origin}/reset-password`;
    const { error } = await apiFetch("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email, redirectTo }) });
    return { data: {}, error: error ?? null };
  },
  async updateUser(attrs: { password?: string; email?: string; data?: Record<string, unknown> }) {
    const { data, error } = await apiFetch("/auth/update-user", { method: "POST", body: JSON.stringify(attrs) });
    if (error) return { data: { user: null }, error };
    notify("USER_UPDATED", await currentSession());
    return { data, error: null };
  },
  /** Used by the reset-password page after following the emailed link (?code=...). */
  async exchangeCodeForSession(code: string) {
    const { data, error } = await apiFetch("/auth/exchange-code", { method: "POST", body: JSON.stringify({ code }) });
    if (error || !data?.session) return { data: { session: null }, error: error ?? { message: "Invalid or expired link" } };
    setSession(data.session);
    notify("PASSWORD_RECOVERY", data.session);
    return { data, error: null };
  },
  /** Call after a direct password reset to store the session returned by the server. */
  setSession(session: Session) {
    setSession(session);
    notify("SIGNED_IN", session);
  },
  /** Single-step reset: validates the token and updates the password in one call. */
  async resetPassword(code: string, password: string) {
    const { data, error } = await apiFetch("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ code, password }),
    });
    if (error) return { data: null, error };
    if (data?.session) {
      setSession(data.session);
      notify("SIGNED_IN", data.session);
    }
    return { data, error: null };
  },
};

// ---------------------------------------------------------------------------
// Query builder — mirrors the subset of supabase-js's PostgREST builder used
// throughout the app (.select/.eq/.neq/.is/.in/.order/.limit/.single/
// .maybeSingle/.insert/.update/.upsert/.delete), backed by our generic
// /api/db/:table/* endpoints.
// ---------------------------------------------------------------------------
type Filter = { col: string; op: string; val: unknown };
type Op = "select" | "insert" | "update" | "upsert" | "delete";

class QueryBuilder implements PromiseLike<{ data: any; error: any }> {
  private table: string;
  private op: Op = "select";
  private filters: Filter[] = [];
  private selectCols?: string;
  private orderSpec?: { col: string; ascending: boolean };
  private limitN?: number;
  private wantSingle = false;
  private wantMaybeSingle = false;
  private payload?: unknown;

  constructor(table: string) {
    this.table = table;
  }

  select(cols?: string) {
    this.selectCols = cols;
    return this;
  }
  eq(col: string, val: unknown) { this.filters.push({ col, op: "eq", val }); return this; }
  neq(col: string, val: unknown) { this.filters.push({ col, op: "neq", val }); return this; }
  not(col: string, op: string, val: unknown) {
    if (op === "eq") return this.neq(col, val);
    if (op === "neq") return this.eq(col, val);
    if (op === "is" && val === null) return this.neq(col, null);
    this.filters.push({ col, op: `not_${op}`, val });
    return this;
  }
  is(col: string, val: unknown) { this.filters.push({ col, op: "is", val }); return this; }
  in(col: string, val: unknown[]) { this.filters.push({ col, op: "in", val }); return this; }
  gt(col: string, val: unknown) { this.filters.push({ col, op: "gt", val }); return this; }
  gte(col: string, val: unknown) { this.filters.push({ col, op: "gte", val }); return this; }
  lt(col: string, val: unknown) { this.filters.push({ col, op: "lt", val }); return this; }
  lte(col: string, val: unknown) { this.filters.push({ col, op: "lte", val }); return this; }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderSpec = { col, ascending: opts?.ascending !== false };
    return this;
  }
  limit(n: number) { this.limitN = n; return this; }
  single() { this.wantSingle = true; return this; }
  maybeSingle() { this.wantMaybeSingle = true; return this; }

  insert(values: unknown) { this.op = "insert"; this.payload = values; return this; }
  update(values: unknown) { this.op = "update"; this.payload = values; return this; }
  upsert(values: unknown) { this.op = "upsert"; this.payload = values; return this; }
  delete() { this.op = "delete"; return this; }

  private async execute(): Promise<{ data: any; error: any }> {
    const body: Record<string, unknown> = {
      filters: this.filters,
      select: this.selectCols,
      order: this.orderSpec,
      limit: this.limitN,
      single: this.wantSingle,
      maybeSingle: this.wantMaybeSingle,
    };
    if (this.op === "insert" || this.op === "upsert") body.values = this.payload;
    if (this.op === "update") body.values = this.payload;
    return apiFetch(`/db/${this.table}/${this.op}`, { method: "POST", body: JSON.stringify(body) });
  }

  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected as any);
  }
}

// ---------------------------------------------------------------------------
// Realtime channels — mirrors `.channel(name).on("postgres_changes", filter, cb).subscribe()`
// ---------------------------------------------------------------------------
type PgChangePayload = { eventType: "INSERT" | "UPDATE" | "DELETE"; new: any; old: any; table: string };
type PgFilter = { event: "INSERT" | "UPDATE" | "DELETE" | "*"; schema?: string; table: string; filter?: string };

function matchesFilter(filter: string | undefined, row: any): boolean {
  if (!filter || !row) return true;
  const m = /^([a-zA-Z_]+)=eq\.(.+)$/.exec(filter);
  if (!m) return true;
  const [, col, val] = m;
  return String(row[col]) === val;
}

class RealtimeChannel {
  private handlers: { filter: PgFilter; cb: (p: PgChangePayload) => void }[] = [];
  private socketHandler?: (payload: PgChangePayload) => void;
  private tables = new Set<string>();

  constructor(private name: string) {}

  on(_type: "postgres_changes", filter: PgFilter, cb: (p: PgChangePayload) => void) {
    this.handlers.push({ filter, cb });
    this.tables.add(filter.table);
    return this;
  }

  subscribe() {
    const s = getSocket();
    for (const table of this.tables) {
      const handler = (payload: PgChangePayload) => {
        const row = payload.eventType === "DELETE" ? payload.old : payload.new;
        for (const { filter, cb } of this.handlers) {
          if (filter.table !== table) continue;
          if (filter.event !== "*" && filter.event !== payload.eventType) continue;
          if (!matchesFilter(filter.filter, row)) continue;
          cb(payload);
        }
      };
      s.on(`change:${table}`, handler);
      (this as any)[`__handler_${table}`] = handler;
    }
    return this;
  }

  _teardown() {
    const s = getSocket();
    for (const table of this.tables) {
      const handler = (this as any)[`__handler_${table}`];
      if (handler) s.off(`change:${table}`, handler);
    }
  }
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------
function storageFrom(bucket: string) {
  return {
    async upload(objectPath: string, file: File | Blob, _opts?: { upsert?: boolean }) {
      const form = new FormData();
      form.append("file", file);
      form.append("objectPath", objectPath);
      const token = getToken();
      const headers = new Headers();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const res = await fetch(`${BACKEND_URL}/api/storage/${bucket}/upload`, { method: "POST", headers, body: form });
      const json = await res.json();
      return json as { data: { path: string } | null; error: { message: string } | null };
    },
    async createSignedUrl(objectPath: string, _expiresInSeconds: number) {
      return apiFetch(`/storage/${bucket}/signed-url`, { method: "POST", body: JSON.stringify({ path: objectPath }) });
    },
  };
}

// ---------------------------------------------------------------------------
// Public client
// ---------------------------------------------------------------------------
export const supabase = {
  auth,
  from(table: string) {
    return new QueryBuilder(table);
  },
  async rpc(fn: string, params?: Record<string, unknown>) {
    return apiFetch(`/rpc/${fn}`, { method: "POST", body: JSON.stringify(params ?? {}) });
  },
  channel(name: string) {
    return new RealtimeChannel(name);
  },
  removeChannel(channel: RealtimeChannel) {
    channel._teardown();
  },
  storage: { from: storageFrom },
};
