const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

const requiredFiles = [
  "index.html",
  "styles.css",
  "app.js",
  "manifest.json",
  "sw.js",
  "vercel.json",
  "assets/avatar.png",
  "assets/icons/apple-touch-icon.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/maskable-512.png",
];

function assertFile(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
}

function copyRecursive(source, target) {
  const stat = fs.statSync(source);

  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(target, entry));
    }
    return;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

for (const file of requiredFiles) {
  assertFile(file);
}

JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));

execFileSync(process.execPath, ["--check", path.join(root, "app.js")], { stdio: "inherit" });
execFileSync(process.execPath, ["--check", path.join(root, "sw.js")], { stdio: "inherit" });

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const file of ["index.html", "styles.css", "app.js", "manifest.json", "sw.js", "vercel.json"]) {
  copyRecursive(path.join(root, file), path.join(dist, file));
}

copyRecursive(path.join(root, "assets"), path.join(dist, "assets"));

console.log("Build complete: dist/");
