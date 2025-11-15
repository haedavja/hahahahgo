const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const sourcePath = path.join(rootDir, "legacy", "battle", "battle-app.jsx");
const htmlPath = path.join(rootDir, "public", "battle.html");

if (!fs.existsSync(sourcePath)) {
  console.error("Source file not found:", sourcePath);
  process.exit(1);
}
if (!fs.existsSync(htmlPath)) {
  console.error("Target public/battle.html not found.");
  process.exit(1);
}

const source = fs.readFileSync(sourcePath, "utf8").replace(/\ufeff/g, "").trim();
const html = fs.readFileSync(htmlPath, "utf8");

const startMarker = '<script type="text/babel">';
const startIdx = html.indexOf(startMarker);
if (startIdx === -1) {
  console.error("Could not find <script type=\"text/babel\"> in battle.html");
  process.exit(1);
}
const scriptStart = startIdx + startMarker.length;
const endIdx = html.indexOf("</script>", scriptStart);
if (endIdx === -1) {
  console.error("Could not find closing </script> after the battle script block.");
  process.exit(1);
}

const indentedSource = source
  .split(/\r?\n/)
  .map((line) => (line ? `        ${line}` : "        "))
  .join("\n");

const result =
  html.slice(0, scriptStart) + "\n" + indentedSource + "\n    " + html.slice(endIdx);

fs.writeFileSync(htmlPath, result, "utf8");
console.log("battle.html synced from legacy/battle/battle-app.jsx");
