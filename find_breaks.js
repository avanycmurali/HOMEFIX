const fs = require('fs');
const xml = fs.readFileSync('D:/projects/HOMEFIX/document_raw.xml', 'utf8');

const regex = /<w:br w:type="page"\/>/g;
let match;
let count = 0;
while ((match = regex.exec(xml)) !== null) {
  count++;
  const beforeXml = xml.substring(Math.max(0, match.index - 500), match.index);
  const afterXml = xml.substring(match.index + 20, Math.min(xml.length, match.index + 500));
  const beforeText = (beforeXml.match(/<w:t[\s>].*?<\/w:t>/g) || []).map(t => t.replace(/<.*?>/g, '')).join('').slice(-80);
  const afterText = (afterXml.match(/<w:t[\s>].*?<\/w:t>/g) || []).map(t => t.replace(/<.*?>/g, '')).join('').slice(0, 80);
  console.log(`\nPage Break ${count}:`);
  console.log(`  BEFORE: "${beforeText.trim()}"`);
  console.log(`  AFTER:  "${afterText.trim()}"`);
}
