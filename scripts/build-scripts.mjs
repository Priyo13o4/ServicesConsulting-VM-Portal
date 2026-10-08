// Bundles one-off Node scripts (migrations, seed) so the production image needs no dev dependencies.
import { build } from "esbuild";

await build({
  entryPoints: ["scripts/migrate.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outdir: "dist-scripts",
  outExtension: { ".js": ".mjs" },
  banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
  logLevel: "info",
});
