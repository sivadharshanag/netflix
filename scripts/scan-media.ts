import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import "dotenv/config";
import { scanMediaDirectory } from "../server/src/services/mediaScanner.js";

async function run(): Promise<void> {
  const mediaRoot = process.env.MEDIA_ROOT ?? "./media";
  console.log(`Scanning "${path.resolve(mediaRoot)}" ...`);

  const result = await scanMediaDirectory(mediaRoot);

  const outDir = path.resolve("server/data");
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "media-manifest.json"), JSON.stringify(result, null, 2), "utf-8");

  console.log(`Found ${result.items.length} supported media files across ${result.folders.length} folders:`);
  for (const folder of result.folders) {
    const count = result.items.filter((item) => item.folder === folder).length;
    console.log(`  - ${folder}: ${count}`);
  }

  if (result.warnings.length > 0) {
    console.log(`\n${result.warnings.length} warning(s):`);
    for (const warning of result.warnings) {
      console.log(`  - ${warning.path}: ${warning.reason}`);
    }
  }

  console.log(`\nWrote server/data/media-manifest.json (for inspection only — the server re-scans live at startup).`);
}

run().catch((error) => {
  console.error("Scan failed:", error);
  process.exitCode = 1;
});
