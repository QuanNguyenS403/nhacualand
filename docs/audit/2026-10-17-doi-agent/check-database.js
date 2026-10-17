const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..');
const schemaPath = path.join(repoRoot, 'packages/database/prisma/schema.prisma');
const schema = fs.readFileSync(schemaPath, 'utf8');

console.log('=== 1. Checking Float Fields in Prisma Schema ===');
const floatLines = [];
const lines = schema.split('\n');
lines.forEach((l, idx) => {
  if (l.match(/\bFloat\b/)) {
    floatLines.push(`line ${idx + 1}: ${l.trim()}`);
  }
});
console.log('Total Float fields:', floatLines.length);
console.log(floatLines.join('\n'));

console.log('\n=== 2. Checking Relations without onDelete or with CASCADE ===');
const relationLines = [];
lines.forEach((l, idx) => {
  if (l.includes('@relation') && l.includes('references:')) {
    const hasOnDelete = l.includes('onDelete:');
    const onDeleteVal = hasOnDelete ? l.match(/onDelete:\s*([A-Za-z]+)/)[1] : 'NONE (Default)';
    relationLines.push({ line: idx + 1, text: l.trim(), onDelete: onDeleteVal });
  }
});
console.log(`Total relations: ${relationLines.length}`);
const defaultCascade = relationLines.filter(r => r.onDelete === 'NONE (Default)' || r.onDelete === 'Cascade');
console.log(`Relations with Cascade or Default: ${defaultCascade.length}`);
console.table(defaultCascade.slice(0, 10));

console.log('\n=== 3. Checking prisma/seed.ts Safety Guard ===');
const seedPath = path.join(repoRoot, 'packages/database/prisma/seed.ts');
if (fs.existsSync(seedPath)) {
  const seedCode = fs.readFileSync(seedPath, 'utf8');
  console.log('Checks NODE_ENV === "production":', seedCode.includes('NODE_ENV === \'production\'') || seedCode.includes('NODE_ENV === "production"'));
  console.log('Checks DATABASE_URL name for _test:', seedCode.includes('_test'));
  console.log('Deletes data on seed:', seedCode.includes('deleteMany'));
  console.log('Total lines of seed.ts:', seedCode.split('\n').length);
}

console.log('\n=== 4. Checking Dead Models from inv-models.csv ===');
const modelsCsv = fs.readFileSync(path.join(__dirname, 'inv-models.csv'), 'utf8');
const deadModels = modelsCsv.split('\n')
  .filter(l => l.includes('DEAD_CODE'))
  .map(l => l.split(',')[0].replace(/"/g, ''));
console.log(`Dead models count: ${deadModels.length}`);
console.log(deadModels.join(', '));
