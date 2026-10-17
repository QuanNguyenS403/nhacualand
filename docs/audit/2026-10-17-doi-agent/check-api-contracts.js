const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..');

const callsCsv = fs.readFileSync(path.join(__dirname, 'inv-calls.csv'), 'utf8');
const epCsv = fs.readFileSync(path.join(__dirname, 'inv-endpoints.csv'), 'utf8');

function parseCsv(content) {
  const lines = content.split('\n').filter(Boolean);
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    // simple csv row split (handling quoted strings)
    const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g;
    const row = [];
    let match;
    while ((match = regex.exec(lines[i])) !== null) {
      if (match.index === regex.lastIndex) regex.lastIndex++;
      row.push(match[1] ? match[1].replace(/""/g, '"') : match[2]);
    }
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = row[idx]; });
    rows.push(obj);
  }
  return rows;
}

const calls = parseCsv(callsCsv);
const eps = parseCsv(epCsv);

console.log(`Parsed ${calls.length} calls and ${eps.length} endpoints.`);

// Collect distinct target expressions
const distinctTargets = new Map();
for (const c of calls) {
  const expr = c.target_expression;
  if (!distinctTargets.has(expr)) distinctTargets.set(expr, []);
  distinctTargets.get(expr).push(c);
}

console.log('Distinct target expressions in frontend calls:', distinctTargets.size);
const unmatchedCalls = [];

for (const [expr, instances] of distinctTargets.entries()) {
  if (!expr || typeof expr !== 'string') continue;
  let cleanRoute = expr.replace(/^[`'"]|[`'"]$/g, '');
  cleanRoute = cleanRoute.replace(/\$\{apiUrl\}|\$\{NEXT_PUBLIC_API_URL\}/g, '');
  cleanRoute = cleanRoute.split('?')[0]; // strip query string
  // Replace dynamic template literals like ${id} with :param
  cleanRoute = cleanRoute.replace(/\$\{[^}]+\}/g, ':param');
  if (cleanRoute.startsWith('/api/')) {
    // Next route handler
  }

  // Check if matches any endpoint in eps
  const matchedEp = eps.find(e => {
    let epRoute = e.route.replace(/:[a-zA-Z0-9_]+/g, ':param');
    return cleanRoute === epRoute || cleanRoute.startsWith(epRoute) || epRoute.startsWith(cleanRoute);
  });

  if (!matchedEp && !cleanRoute.startsWith('http') && !cleanRoute.includes('google')) {
    unmatchedCalls.push({ expr, cleanRoute, count: instances.length, file: instances[0].file, line: instances[0].line });
  }
}

console.log('Unmatched frontend calls:');
console.table(unmatchedCalls);
