// news-image-20261122 entry: places the bundled newspaper image at the
// output path the harness expects. The picture itself is the entry — this
// script only moves it, byte for byte, and does nothing else. Node 22
// standard library only; no network access of any kind.
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The image lives next to this script, wherever the repository is checked out.
const here = dirname(fileURLToPath(import.meta.url));
const picture = resolve(here, "entry.png");

// The harness tells us where to write via MAKEFUN_OUTPUT_DIR; without it we
// fall back to the conventional /output directory. An empty value counts as
// unset, not as a real directory.
function destinationDir() {
  const given = (process.env.MAKEFUN_OUTPUT_DIR ?? "").trim();
  return given === "" ? "/output" : given;
}

const target = resolve(destinationDir(), "entry.png");

// Refuse to hand the harness a broken or truncated image: the entry must be
// a real file, and it must fit inside the competition's 1 MiB cap.
const info = statSync(picture, { throwIfNoEntry: false });
if (info === undefined || !info.isFile() || info.size === 0) {
  console.error(`no usable entry.png found at ${picture}`);
  process.exit(1);
}
if (info.size > 1024 * 1024) {
  console.error(`entry.png is ${info.size} bytes, over the 1 MiB limit`);
  process.exit(1);
}

mkdirSync(destinationDir(), { recursive: true });
const bytes = readFileSync(picture);

// The entry is a JPEG: its first two bytes must be the SOI marker. If the
// file were corrupted or swapped for something else, fail loudly here
// instead of handing the harness a bad image.
if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
  console.error("entry.png does not start with the JPEG SOI marker");
  process.exit(1);
}

writeFileSync(target, bytes);

// Confirm the write actually landed in full before reporting success.
const written = statSync(target);
if (written.size !== info.size) {
  console.error(`only ${written.size} of ${info.size} bytes reached ${target}`);
  process.exit(1);
}
console.log(`wrote ${info.size} bytes -> ${target}`);
