const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'client', 'src', 'pages');

const processFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Replace card-glass with card-neon
  if (content.includes('card-glass')) {
    content = content.replace(/card-glass/g, 'card-neon');
    changed = true;
  }
  
  // Replace plain card with card-neon (with caution)
  if (content.includes('className="card"')) {
    content = content.replace(/className="card"/g, 'className="card-neon"');
    changed = true;
  }
  
  if (content.includes('className={`card ')) {
    content = content.replace(/className=\{`card /g, 'className={`card-neon ');
    changed = true;
  }

  // Modals inside .modal-content should look like card-neon
  if (content.includes('className="modal-content"')) {
    content = content.replace(/className="modal-content"/g, 'className="modal-content card-neon"');
    changed = true;
  }

  // Pipeline specific classes
  if (content.includes('className="deal-card"')) {
    content = content.replace(/className="deal-card"/g, 'className="deal-card card-neon"');
    content = content.replace(/background: 'var\(--bg-hover\)'/g, 'background: \'rgba(255,255,255,0.05)\'');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${path.basename(filePath)}`);
  }
};

const files = fs.readdirSync(pagesDir);
files.forEach(file => {
  if (file.endsWith('.jsx')) {
    processFile(path.join(pagesDir, file));
  }
});
console.log('Done replacing styles.');
