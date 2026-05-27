const fs = require('fs');
const path = require('path');

const files = [
  'app/system/page.tsx',
  'app/vendor/page.tsx',
  'app/agent/page.tsx',
  'app/customer/page.tsx'
];

const replacements = [
  // Backgrounds and Core Text
  { regex: /bg-\[\#090a08\](\/\[[0-9.]+\])?/g, replace: 'bg-background' },
  { regex: /bg-slate-950/g, replace: 'bg-background' },
  { regex: /bg-zinc-950/g, replace: 'bg-background' },
  { regex: /bg-slate-900/g, replace: 'bg-card' },
  { regex: /bg-zinc-900/g, replace: 'bg-card' },
  { regex: /text-zinc-100/g, replace: 'text-foreground' },
  { regex: /text-slate-100/g, replace: 'text-foreground' },
  { regex: /text-white/g, replace: 'text-foreground' },
  
  // Muted Text
  { regex: /text-zinc-300/g, replace: 'text-muted-foreground' },
  { regex: /text-zinc-400/g, replace: 'text-muted-foreground' },
  { regex: /text-zinc-500/g, replace: 'text-muted-foreground' },
  { regex: /text-zinc-600/g, replace: 'text-muted-foreground' },
  { regex: /text-slate-300/g, replace: 'text-muted-foreground' },
  { regex: /text-slate-400/g, replace: 'text-muted-foreground' },
  { regex: /text-slate-500/g, replace: 'text-muted-foreground' },
  
  // Borders
  { regex: /border-white\/10/g, replace: 'border-border' },
  { regex: /border-white\/20/g, replace: 'border-border' },
  { regex: /border-slate-800/g, replace: 'border-border' },
  { regex: /border-zinc-800/g, replace: 'border-border' },
  
  // Gradients and "Slop" backgrounds
  { regex: /bg-\[linear-gradient\([^\]]+\)\]/g, replace: '' },
  
  // Slop colors (emerald, cyan, amber, pink) -> switch to neutral or primary
  { regex: /text-emerald-100/g, replace: 'text-foreground' },
  { regex: /text-emerald-200/g, replace: 'text-primary' },
  { regex: /text-cyan-100/g, replace: 'text-foreground' },
  { regex: /text-cyan-200/g, replace: 'text-foreground' },
  { regex: /text-amber-100/g, replace: 'text-foreground' },
  { regex: /text-amber-200/g, replace: 'text-foreground' },
  { regex: /text-pink-400/g, replace: 'text-primary' },
  { regex: /text-pink-500/g, replace: 'text-primary' },
  
  { regex: /bg-emerald-200\/10/g, replace: 'bg-primary/10' },
  { regex: /bg-emerald-300\/10/g, replace: 'bg-primary/10' },
  { regex: /bg-cyan-300\/10/g, replace: 'bg-secondary' },
  { regex: /bg-amber-300\/10/g, replace: 'bg-secondary' },
  { regex: /bg-pink-500\/10/g, replace: 'bg-primary/10' },
  
  { regex: /border-emerald-200\/\[[0-9.]+\]/g, replace: 'border-border' },
  { regex: /border-emerald-200\/20/g, replace: 'border-border' },
  { regex: /border-cyan-200\/\[[0-9.]+\]/g, replace: 'border-border' },
  { regex: /border-amber-200\/\[[0-9.]+\]/g, replace: 'border-border' },
  { regex: /border-pink-500\/20/g, replace: 'border-border' },
  
  { regex: /bg-emerald-200/g, replace: 'bg-primary' },
  { regex: /bg-emerald-300/g, replace: 'bg-primary/90' },
  { regex: /bg-pink-600/g, replace: 'bg-primary' },
  { regex: /bg-pink-500/g, replace: 'bg-primary/90' },
  
  // Selections
  { regex: /selection:bg-emerald-200/g, replace: 'selection:bg-primary' },
  { regex: /selection:text-zinc-950/g, replace: 'selection:text-primary-foreground' },
  { regex: /selection:bg-pink-500\/30/g, replace: 'selection:bg-primary/30' },
  
  // Focus rings
  { regex: /focus-visible:ring-emerald-200\/\[0.7\]/g, replace: 'focus-visible:ring-ring' },
  { regex: /focus-visible:ring-emerald-200\/50/g, replace: 'focus-visible:ring-ring' },
  { regex: /focus-visible:ring-pink-500\/50/g, replace: 'focus-visible:ring-ring' },
  
  // Generic secondary backgrounds
  { regex: /bg-white\/\[0\.055\]/g, replace: 'bg-secondary' },
  { regex: /bg-white\/\[0\.03\]/g, replace: 'bg-secondary/50' },
  { regex: /bg-black\/20/g, replace: 'bg-secondary/50' },
];

for (const file of files) {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    for (const { regex, replace } of replacements) {
      content = content.replace(regex, replace);
    }
    // Clean up multiple spaces left by removed classes
    content = content.replace(/  +/g, ' ');
    // Remove empty classNames
    content = content.replace(/className="\s+"/g, '');
    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${file}`);
  }
}
