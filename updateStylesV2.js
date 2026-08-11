const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      if (dirFile.endsWith('.jsx')) {
        filelist.push(dirFile);
      }
    }
  });
  return filelist;
};

const processFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  const replacements = [
    { from: /card-glass/g, to: 'card-neon' },
    { from: /className="card"/g, to: 'className="card-neon"' },
    { from: /className="card /g, to: 'className="card-neon ' },
    { from: /className=\{`card /g, to: 'className={`card-neon ' },
    
    // Badges
    { from: /badge-new/g, to: 'badge-info' },
    { from: /badge-contacted/g, to: 'badge-purple' },
    { from: /badge-qualified/g, to: 'badge-success' },
    { from: /badge-proposal/g, to: 'badge-warning' },
    { from: /badge-negotiation/g, to: 'badge-danger' },
    { from: /badge-won/g, to: 'badge-success' },
    { from: /badge-lost/g, to: 'badge-danger' },

    { from: /badge-pending/g, to: 'badge-warning' },
    { from: /badge-inprogress/g, to: 'badge-info' },
    { from: /badge-completed/g, to: 'badge-success' }
  ];

  replacements.forEach(r => {
    if (content.match(r.from)) {
      content = content.replace(r.from, r.to);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${path.basename(filePath)}`);
  }
};

const files = walkSync(path.join(__dirname, 'client', 'src', 'pages'));
files.forEach(file => processFile(file));

console.log('V2 replacement complete.');
