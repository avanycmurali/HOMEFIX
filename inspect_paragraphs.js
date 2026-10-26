const fs = require('fs');
const xml = fs.readFileSync('D:/projects/HOMEFIX/document_raw.xml', 'utf8');

const parts = xml.split(/(<w:tbl[\s>].*?<\/w:tbl>)/gs);
parts.forEach((part, i) => {
  if (part.startsWith('<w:tbl')) {
    console.log(`\n--- [TABLE ${Math.floor(i / 2) + 1}] ---`);
  } else {
    const pMatches = part.match(/<w:p[\s>].*?<\/w:p>/gs) || [];
    pMatches.forEach(p => {
      const texts = p.match(/<w:t[\s>].*?<\/w:t>/gs) || [];
      const text = texts.map(t => t.replace(/<.*?>/g, '')).join('');
      if (text.trim()) {
        console.log('P: ' + text.trim());
      }
    });
  }
});
