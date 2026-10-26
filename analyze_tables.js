const fs = require('fs');
const xml = fs.readFileSync('D:/projects/HOMEFIX/document_raw.xml', 'utf8');

const tblMatches = xml.match(/<w:tbl[\s>].*?<\/w:tbl>/gs) || [];

tblMatches.forEach((tbl, tIdx) => {
  console.log(`\n=================== TABLE ${tIdx + 1} ===================`);
  const rows = tbl.match(/<w:tr[\s>].*?<\/w:tr>/gs) || [];
  rows.forEach((r, rIdx) => {
    const cells = r.match(/<w:tc[\s>].*?<\/w:tc>/gs) || [];
    const cellTexts = cells.map(c => {
      const texts = c.match(/<w:t[\s>].*?<\/w:t>/gs) || [];
      return texts.map(t => t.replace(/<.*?>/g, '')).join('');
    });
    console.log(`Row ${rIdx + 1} (${cells.length} cells): ${JSON.stringify(cellTexts)}`);
  });
});
