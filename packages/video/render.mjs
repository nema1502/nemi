// node render.mjs <props.json> <out> [composition=Lesson] [video|still] [frame]
// Bundles once (reused until src/ changes) and renders a composition, printing
// {"progress": 0..1} lines for the engine.
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const [propsFile, out, id = "Lesson", mode = "video", frame = "0"] = process.argv.slice(2);
const inputProps = JSON.parse(fs.readFileSync(propsFile, "utf-8"));
const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const build = path.join(root, "build");

const newest = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).reduce((m, e) => {
    const p = path.join(dir, e.name);
    return Math.max(m, e.isDirectory() ? newest(p) : fs.statSync(p).mtimeMs);
  }, 0);

let serveUrl = build;
const stamp = path.join(build, "index.html");
if (!fs.existsSync(stamp) || fs.statSync(stamp).mtimeMs < newest(path.join(root, "src"))) {
  serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts"), outDir: build });
}

const composition = await selectComposition({ serveUrl, id, inputProps });
if (mode === "still") {
  await renderStill({ composition, serveUrl, output: out, inputProps, frame: Number(frame) });
} else {
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: out,
    inputProps,
    onProgress: ({ progress }) => console.log(JSON.stringify({ progress })),
  });
}
console.log(JSON.stringify({ progress: 1 }));
