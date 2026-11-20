import { registerHooks } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const SRC_ROOT = path.join(PROJECT_ROOT, "src");

const EXTENSIONS = [".ts", ".tsx", ".mjs", ".js"];

function resolveFileCandidate(basePath) {
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
    return basePath;
  }
  for (const ext of EXTENSIONS) {
    const candidate = `${basePath}${ext}`;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  for (const ext of EXTENSIONS) {
    const candidate = path.join(basePath, `index${ext}`);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function getVariant(parentURL) {
  if (!parentURL) return null;
  try {
    return new URL(parentURL).searchParams.get("e2e_variant");
  } catch {
    return null;
  }
}

function withVariant(fileUrl, variant) {
  if (!variant) return fileUrl;
  const u = new URL(fileUrl);
  u.searchParams.set("e2e_variant", variant);
  return u.href;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const variant = getVariant(context.parentURL);

    if (specifier === "next/server") {
      return nextResolve("next/server.js", context);
    }

    if (specifier === "@supabase/supabase-js" && variant) {
      const resolved = nextResolve(specifier, context);
      return {
        ...resolved,
        url: withVariant(resolved.url, variant),
      };
    }

    if (specifier.startsWith("@/")) {
      const subPath = specifier.slice(2);
      const candidate = resolveFileCandidate(path.join(SRC_ROOT, subPath));
      if (candidate) {
        return {
          shortCircuit: true,
          url: withVariant(pathToFileURL(candidate).href, variant),
        };
      }
    }

    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      context.parentURL &&
      context.parentURL.startsWith("file:")
    ) {
      const parentPath = fileURLToPath(context.parentURL.split("?")[0]);
      const baseDir = path.dirname(parentPath);
      const cleanSpecifier = specifier.split("?")[0];
      const candidate = resolveFileCandidate(path.resolve(baseDir, cleanSpecifier));
      if (candidate) {
        return {
          shortCircuit: true,
          url: withVariant(pathToFileURL(candidate).href, variant),
        };
      }
    }

    return nextResolve(specifier, context);
  },

  load(url, context, nextLoad) {
    const u = new URL(url);
    const variant = u.searchParams.get("e2e_variant");

    if (
      variant &&
      globalThis.__E2E_MOCK_CLIENTS__ &&
      globalThis.__E2E_MOCK_CLIENTS__.has(variant)
    ) {
      const normalizedPath = u.pathname.replace(/\\/g, "/");
      if (normalizedPath.endsWith("/src/lib/supabase.ts")) {
        return {
          format: "module",
          shortCircuit: true,
          source: [
            `export const isSupabaseConfigured = true;`,
            `export const supabase = globalThis.__E2E_MOCK_CLIENTS__.get(${JSON.stringify(variant)});`,
          ].join("\n"),
        };
      }
      if (normalizedPath.includes("@supabase/supabase-js")) {
        return {
          format: "module",
          shortCircuit: true,
          source: `export function createClient() { return globalThis.__E2E_MOCK_CLIENTS__.get(${JSON.stringify(variant)}); }`,
        };
      }
    }

    if (
      u.protocol === "file:" &&
      (u.pathname.endsWith(".ts") || u.pathname.endsWith(".tsx"))
    ) {
      const filePath = fileURLToPath(url.split("?")[0]);
      const source = fs.readFileSync(filePath, "utf8");
      const { outputText } = ts.transpileModule(source, {
        fileName: filePath,
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      });
      return {
        format: "module",
        shortCircuit: true,
        source: outputText,
      };
    }

    return nextLoad(url, context);
  },
});
