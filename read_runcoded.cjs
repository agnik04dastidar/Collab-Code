const fs = require('fs');
const content = fs.readFileSync('frontend/src/App.jsx', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(570, 618).join('\n'));

