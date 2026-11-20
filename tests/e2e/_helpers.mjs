import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { NextRequest } from "next/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECT_ROOT = path.resolve(__dirname, "../..");

export function projectPath(relPath) {
  return path.join(PROJECT_ROOT, relPath);
}

export function projectFileExists(relPath) {
  return fs.existsSync(projectPath(relPath));
}

export function readProjectFile(relPath) {
  return fs.readFileSync(projectPath(relPath), "utf8");
}

/**
 * Generates a real Stripe `stripe-signature` header (`t=<ts>,v1=<hmac_sha256>`).
 */
export function generateStripeSignature(
  rawBody,
  secret,
  timestampSeconds = Math.floor(Date.now() / 1000)
) {
  const payload = `${timestampSeconds}.${rawBody}`;
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("hex");
  return `t=${timestampSeconds},v1=${hmac}`;
}

/**
 * Constructs a real NextRequest for testing App Router route handlers.
 */
export function makeNextRequest(
  urlPath,
  { method = "POST", headers = {}, body } = {}
) {
  const url = urlPath.startsWith("http")
    ? urlPath
    : `http://localhost:3000${urlPath.startsWith("/") ? "" : "/"}${urlPath}`;
  const init = {
    method,
    headers: new Headers(headers),
  };
  if (body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return new NextRequest(url, init);
}

/**
 * Temporarily overrides process.env keys for the duration of `fn`, restoring exact prior state.
 */
export async function withEnv(overrides, fn) {
  const saved = new Map();
  for (const key of Object.keys(overrides)) {
    saved.set(key, Object.prototype.hasOwnProperty.call(process.env, key) ? process.env[key] : undefined);
    if (overrides[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = overrides[key];
    }
  }
  try {
    return await fn();
  } finally {
    for (const [key, val] of saved.entries()) {
      if (val === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = val;
      }
    }
  }
}

/**
 * Safely dynamically imports a project module (returning { ok: true, mod } or { ok: false, error }).
 */
export async function safeImport(relPathFromRoot, variant) {
  try {
    const abs = projectPath(relPathFromRoot);
    if (!fs.existsSync(abs)) {
      return { ok: false, error: new Error(`Module not found: ${relPathFromRoot}`) };
    }
    const u = new URL(pathToFileURL(abs).href);
    if (variant) {
      u.searchParams.set("e2e_variant", variant);
    }
    const mod = await import(u.href);
    return { ok: true, mod };
  } catch (error) {
    return { ok: false, error };
  }
}

export function registerMockSupabase(variant, client) {
  if (!globalThis.__E2E_MOCK_CLIENTS__) {
    globalThis.__E2E_MOCK_CLIENTS__ = new Map();
  }
  globalThis.__E2E_MOCK_CLIENTS__.set(variant, client);
  return client;
}

export function unregisterMockSupabase(variant) {
  globalThis.__E2E_MOCK_CLIENTS__?.delete(variant);
}

/**
 * In-memory mock Supabase client supporting `.from(table).select/insert/update/upsert/delete/eq/in/order/limit/single/maybeSingle`.
 */
export function createMockSupabaseClient(initialTables = {}, options = {}) {
  const tables = {};
  for (const [name, rows] of Object.entries(initialTables)) {
    tables[name] = (rows ?? []).map((r) => ({ ...r }));
  }

  let idSeq = 1;
  const nextId = () => `mock-uuid-${idSeq++}`;

  function ensureTable(name) {
    if (!tables[name]) tables[name] = [];
    return tables[name];
  }

  function applyFilters(rows, filters) {
    return rows.filter((row) =>
      filters.every((f) => {
        if (f.type === "eq") return row[f.col] === f.val;
        if (f.type === "in") return Array.isArray(f.vals) && f.vals.includes(row[f.col]);
        if (f.type === "not") {
          const cell = row[f.col];
          if (f.op === "in") {
            let excluded = [];
            if (Array.isArray(f.val)) {
              excluded = f.val;
            } else if (typeof f.val === "string") {
              const trimmed = f.val.trim();
              const inner =
                trimmed.startsWith("(") && trimmed.endsWith(")")
                  ? trimmed.slice(1, -1)
                  : trimmed;
              excluded =
                inner === ""
                  ? []
                  : inner.split(",").map((s) => s.trim().replace(/^"(.*)"$/, "$1"));
            }
            const excludedStrs = excluded.map((v) => String(v));
            return !excludedStrs.includes(String(cell));
          }
          if (f.op === "eq") {
            return cell !== f.val;
          }
          if (f.op === "is") {
            if (f.val === null) return cell !== null && cell !== undefined;
            return cell !== f.val;
          }
        }
        return true;
      })
    );
  }

  function createQueryBuilder(tableName) {
    const state = {
      op: "select",
      filters: [],
      orders: [],
      limitCount: null,
      payload: null,
      upsertOpts: null,
      returnRows: false,
      singleMode: null, // "single" | "maybeSingle"
    };

    function execute() {
      const table = ensureTable(tableName);

      if (state.op === "insert") {
        const items = Array.isArray(state.payload) ? state.payload : [state.payload];
        const inserted = items.map((item) => {
          const row = {
            id: item.id ?? nextId(),
            created_at: item.created_at ?? new Date().toISOString(),
            ...item,
          };
          table.push(row);
          return { ...row };
        });
        return formatResult(inserted);
      }

      if (state.op === "upsert") {
        const items = Array.isArray(state.payload) ? state.payload : [state.payload];
        const conflictCols = state.upsertOpts?.onConflict
          ? String(state.upsertOpts.onConflict).split(",").map((s) => s.trim())
          : ["id"];
        const upserted = items.map((item) => {
          const idx = table.findIndex((existing) =>
            conflictCols.every((c) => item[c] !== undefined && existing[c] === item[c])
          );
          if (idx >= 0) {
            table[idx] = { ...table[idx], ...item };
            return { ...table[idx] };
          }
          const row = {
            id: item.id ?? nextId(),
            created_at: item.created_at ?? new Date().toISOString(),
            ...item,
          };
          table.push(row);
          return { ...row };
        });
        return formatResult(upserted);
      }

      if (state.op === "update") {
        const matched = applyFilters(table, state.filters);
        for (const row of matched) {
          Object.assign(row, state.payload);
        }
        return formatResult(matched.map((r) => ({ ...r })));
      }

      if (state.op === "delete") {
        const matched = new Set(applyFilters(table, state.filters));
        const deleted = [...matched].map((r) => ({ ...r }));
        tables[tableName] = table.filter((r) => !matched.has(r));
        return formatResult(deleted);
      }

      // select
      let rows = applyFilters(table, state.filters).map((r) => ({ ...r }));
      for (const ord of state.orders) {
        rows.sort((a, b) => {
          const av = a[ord.col];
          const bv = b[ord.col];
          if (av === bv) return 0;
          if (av === undefined || av === null) return ord.ascending ? -1 : 1;
          if (bv === undefined || bv === null) return ord.ascending ? 1 : -1;
          return (av < bv ? -1 : 1) * (ord.ascending ? 1 : -1);
        });
      }
      if (state.limitCount !== null) {
        rows = rows.slice(0, state.limitCount);
      }
      return formatResult(rows);
    }

    function formatResult(rows) {
      if (state.singleMode === "single") {
        if (rows.length === 0) {
          return { data: null, error: { message: "No rows found", code: "PGRST116" } };
        }
        return { data: rows[0], error: null };
      }
      if (state.singleMode === "maybeSingle") {
        return { data: rows[0] ?? null, error: null };
      }
      return { data: rows, error: null };
    }

    const builder = {
      select() {
        if (state.op === "select") {
          state.op = "select";
        } else {
          state.returnRows = true;
        }
        return builder;
      },
      insert(rows) {
        state.op = "insert";
        state.payload = rows;
        return builder;
      },
      update(patch) {
        state.op = "update";
        state.payload = patch;
        return builder;
      },
      upsert(rows, opts) {
        state.op = "upsert";
        state.payload = rows;
        state.upsertOpts = opts ?? null;
        return builder;
      },
      delete() {
        state.op = "delete";
        return builder;
      },
      eq(col, val) {
        state.filters.push({ type: "eq", col, val });
        return builder;
      },
      in(col, vals) {
        state.filters.push({ type: "in", col, vals });
        return builder;
      },
      not(col, op, val) {
        state.filters.push({ type: "not", col, op, val });
        return builder;
      },
      order(col, { ascending = true } = {}) {
        state.orders.push({ col, ascending });
        return builder;
      },
      limit(n) {
        state.limitCount = n;
        return builder;
      },
      single() {
        state.singleMode = "single";
        return Promise.resolve(execute());
      },
      maybeSingle() {
        state.singleMode = "maybeSingle";
        return Promise.resolve(execute());
      },
      then(resolve, reject) {
        return Promise.resolve(execute()).then(resolve, reject);
      },
    };

    return builder;
  }

  return {
    __tables: tables,
    auth: {
      async getSession() {
        return {
          data: { session: options.session ?? null },
          error: null,
        };
      },
    },
    from(tableName) {
      return createQueryBuilder(tableName);
    },
  };
}
