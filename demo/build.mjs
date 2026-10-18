// Bundles the domain core and inlines it into the demo page.
// Run: npm run demo:app   then open demo/index.html in a browser.
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";

const here = (f) => new URL(f, import.meta.url);
const out = await build({
  entryPoints: [here("./core.ts").pathname],
  bundle: true, format: "iife", globalName: "Core", write: false, minify: true, target: "es2020",
});
const core = out.outputFiles[0].text;
const page = readFileSync(here("./app.html"), "utf8").replace("/*CORE*/", () => core);

// Standalone file you can double-click on a laptop.
writeFileSync(here("./index.html"),
  `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>\n${page}\n</body></html>\n`);
// Body-only version for hosting as a Claude artifact.
writeFileSync(here("./artifact.html"), page);
console.log("wrote demo/index.html");
