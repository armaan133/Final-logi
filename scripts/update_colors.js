const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '../app/globals.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Replace all occurrences of 120, 124, 128, 158, 156, 154 hues with 40
// The format is usually oklch(L C H) or oklch(L C H / A)
css = css.replace(/oklch\(([^)]+?)\s+12[048](\s*\/\s*[^)]*)?\)/g, 'oklch($1 40$2)');

// Also replace the specific accent and focus colors
// --logi-accent: oklch(0.78 0.12 158); -> #FC4C02
css = css.replace(/--logi-accent: oklch\([^)]+\);/g, '--logi-accent: #FC4C02;');
// --logi-risk: oklch(0.78 0.12 78); -> #FC4C02
css = css.replace(/--logi-risk: oklch\([^)]+\);/g, '--logi-risk: #FC4C02;');

// --logi-accent-strong: oklch(0.68 0.14 156); -> oklch(0.65 0.19 55);
css = css.replace(/--logi-accent-strong: oklch\([^)]+\);/g, '--logi-accent-strong: oklch(0.65 0.19 55);');

// --logi-focus: oklch(0.86 0.11 154); -> oklch(0.70 0.19 55);
css = css.replace(/--logi-focus: oklch\([^)]+\);/g, '--logi-focus: oklch(0.70 0.19 55);');

// Replace the inline accent usages which were hue 158
css = css.replace(/oklch\(([^)]+?)\s+15[468](\s*\/\s*[^)]*)?\)/g, 'oklch($1 55$2)');
css = css.replace(/oklch\(([^)]+?)\s+78(\s*\/\s*[^)]*)?\)/g, 'oklch($1 55$2)');

fs.writeFileSync(cssPath, css);
console.log('Successfully updated globals.css');
