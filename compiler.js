const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const indexFile = path.join(srcDir, 'GASIndex.html');
const outFile = path.join(srcDir, 'index.html');

console.log('Compiling HTML files...');

let indexContent = fs.readFileSync(indexFile, 'utf8');

// Match: <?!= include('FileName'); ?>
const includeRegex = /<\?!= include\('(.*?)'\);\s*\?>/g;

function resolveIncludes(html) {
  return html.replace(includeRegex, (match, filename) => {
    console.log(`Resolving include for: ${filename}`);
    const filePath = path.join(srcDir, `${filename}.html`);
    if (fs.existsSync(filePath)) {
      let fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Recursively resolve includes inside the included file if any
      return resolveIncludes(fileContent);
    } else {
      console.warn(`Warning: file not found: ${filePath}`);
      return `<!-- File not found: ${filename} -->`;
    }
  });
}

const compiled = resolveIncludes(indexContent);
fs.writeFileSync(outFile, compiled, 'utf8');
console.log(`Success! Compiled file written to: ${outFile}`);
