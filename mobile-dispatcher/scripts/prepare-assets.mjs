import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

for (const name of ["icon.png", "adaptive-icon.png"]) {
  const source = resolve(projectRoot, "assets", `${name}.base64`);
  const target = resolve(projectRoot, "assets", name);
  const encoded = (await readFile(source, "utf8")).replace(/\s/g, "");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(encoded, "base64"));
}
