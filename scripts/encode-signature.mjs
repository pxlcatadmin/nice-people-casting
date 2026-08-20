#!/usr/bin/env node
/**
 * Encode a signature PNG into src/lib/signature-images.ts.
 *
 * Usage:
 *   node scripts/encode-signature.mjs <key> <path-to-png>
 *
 * Example:
 *   node scripts/encode-signature.mjs joel-fenton ~/Desktop/joel-signature.png
 *
 * Keys must match the `signatureKey` values in src/lib/talent-agreement.ts
 * (currently "joel-fenton" and "jake-mercer").
 *
 * The image is stored as a base64 data URI rather than a file in public/ so
 * the PDF generator works inside a serverless function with no filesystem.
 * A transparent background is recommended — the signature sits above a rule
 * on the page.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET = path.join(__dirname, "..", "src", "lib", "signature-images.ts");

const [key, imgPath] = process.argv.slice(2);

if (!key || !imgPath) {
  console.error("Usage: node scripts/encode-signature.mjs <key> <path-to-png>");
  process.exit(1);
}

const resolved = imgPath.startsWith("~")
  ? path.join(process.env.HOME || "", imgPath.slice(1))
  : path.resolve(imgPath);

if (!fs.existsSync(resolved)) {
  console.error(`❌ File not found: ${resolved}`);
  process.exit(1);
}

if (path.extname(resolved).toLowerCase() !== ".png") {
  console.error("❌ Must be a .png (jsPDF needs PNG for transparency).");
  process.exit(1);
}

const bytes = fs.readFileSync(resolved);
const b64 = bytes.toString("base64");
const dataUri = `data:image/png;base64,${b64}`;

console.log(`Image:  ${resolved}`);
console.log(`Size:   ${(bytes.length / 1024).toFixed(1)} KB → ${(b64.length / 1024).toFixed(1)} KB base64`);

if (bytes.length > 400 * 1024) {
  console.warn("⚠️  Over 400 KB. Consider downscaling — this is inlined into the bundle.");
}

let src = fs.readFileSync(TARGET, "utf8");

// Replace the value for this key, whether it is currently empty or populated.
const pattern = new RegExp(
  `("${key}":\\s*)(?:"[^"]*"|\\s*\\n\\s*"[^"]*")`,
  "m"
);

if (!pattern.test(src)) {
  console.error(`❌ Key "${key}" not found in signature-images.ts`);
  console.error("   Known keys:", [...src.matchAll(/"([a-z-]+)":/g)].map((m) => m[1]).join(", "));
  process.exit(1);
}

src = src.replace(pattern, `$1\n    "${dataUri}"`);
fs.writeFileSync(TARGET, src);

console.log(`✅ Wrote "${key}" into src/lib/signature-images.ts`);
