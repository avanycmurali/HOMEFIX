const fs = require('fs');
const xml = fs.readFileSync('D:/projects/HOMEFIX/document_raw.xml', 'utf8');

const tblMatches = xml.match(/<w:tbl[\s>].*?<\/w:tbl>/gs) || [];
console.log('Total tables:', tblMatches.length);

tblMatches.forEach((tbl, idx) => {
  const rows = tbl.match(/<w:tr[\s>].*?<\/w:tr>/gs) || [];
  console.log(`\n=== Table ${idx + 1}: ${rows.length} rows ===`);
  rows.forEach((row, rIdx) => {
    const cells = row.match(/<w:tc[\s>].*?<\/w:tc>/gs) || [];
    const cellTexts = cells.map(c => {
      const texts = c.match(/<w:t[\s>].*?<\/w:t>/gs) || [];
      return texts.map(t => t.replace(/<.*?>/g, '')).join('');
    });
    console.log(`Row ${rIdx + 1}: ${cellTexts.join(' | ')}`);
  });
});
