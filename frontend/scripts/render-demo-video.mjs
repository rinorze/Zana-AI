import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const entryPoint = path.join(rootDir, "remotion", "index.tsx");
const outputLocation = path.join(rootDir, "out", "zana-website-demo.mp4");

async function main() {
  await fs.mkdir(path.dirname(outputLocation), { recursive: true });

  const serveUrl = await bundle({
    entryPoint,
    outDir: path.join(rootDir, "remotion-bundle"),
    publicPath: null,
    rootDir,
    publicDir: path.join(rootDir, "public"),
    enableCaching: true,
    keyboardShortcutsEnabled: false,
    askAIEnabled: false,
    rspack: false,
    symlinkPublicDir: false,
    onProgress: (progress) => {
      process.stdout.write(`\rBundling ${(progress * 100).toFixed(0)}%   `);
    },
    onPublicDirCopyProgress: () => undefined,
    onSymlinkDetected: () => undefined,
    ignoreRegisterRootWarning: true,
  });

  process.stdout.write("\n");

  const composition = await selectComposition({
    serveUrl,
    id: "DemoVideo",
    inputProps: {
      homeImage: "/remotion-demo/home.png",
      servicesImage: "/remotion-demo/services.png",
      chatImage: "/remotion-demo/chat.png",
      agentImage: "/remotion-demo/agent.png",
      adminImage: "/remotion-demo/admin.png",
    },
    logLevel: "info",
    port: 3123,
  });

  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    outputLocation,
    inputProps: {
      homeImage: "/remotion-demo/home.png",
      servicesImage: "/remotion-demo/services.png",
      chatImage: "/remotion-demo/chat.png",
      agentImage: "/remotion-demo/agent.png",
      adminImage: "/remotion-demo/admin.png",
    },
    overwrite: true,
    logLevel: "info",
    chromiumOptions: {
      disableWebSecurity: false,
      gl: null,
    },
    onProgress: (progress) => {
      process.stdout.write(`\rRendering ${(progress.progress * 100).toFixed(0)}%   `);
    },
    port: 3123,
  });

  process.stdout.write("\n");
  console.log(`Rendered ${outputLocation}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});