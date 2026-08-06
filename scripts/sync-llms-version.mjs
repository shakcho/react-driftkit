import fs from "node:fs";

const version = process.argv[2];
if (!version) {
  console.error("Usage: node scripts/sync-llms-version.mjs <version>");
  process.exit(1);
}

const path = "llms.txt";
const src = fs.readFileSync(path, "utf8");
const out = src.replace(
  /(Current documented version:\s*`)[^`]+(`)/,
  `$1${version}$2`,
);

if (out === src) {
  console.warn(
    `llms.txt: no "Current documented version" line updated for ${version}`,
  );
} else {
  fs.writeFileSync(path, out);
  console.log(`llms.txt: set Current documented version to ${version}`);
}
