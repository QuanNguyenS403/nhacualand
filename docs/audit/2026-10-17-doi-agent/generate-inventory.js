const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..');
const outDir = __dirname;

function escapeCsv(val) {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

// =============================================================================
// 1. ENDPOINTS INVENTORY (NestJS controllers + Next.js route handlers)
// =============================================================================
console.log('--- Generating inv-endpoints.csv ---');
const endpoints = [];

// A. Parse NestJS Controllers
const controllers = [
  'apps/api/src/app.controller.ts',
  'apps/api/src/modules/admin/admin.controller.ts',
  'apps/api/src/modules/auth/auth.controller.ts',
  'apps/api/src/modules/commissions/commissions.controller.ts',
  'apps/api/src/modules/deals/deals.controller.ts',
  'apps/api/src/modules/health/health.controller.ts',
  'apps/api/src/modules/leads/leads.controller.ts',
  'apps/api/src/modules/listings/listings.controller.ts',
  'apps/api/src/modules/locations/locations.controller.ts',
  'apps/api/src/modules/membership/admin-membership.controller.ts',
  'apps/api/src/modules/membership/membership.controller.ts',
  'apps/api/src/modules/universities/universities.controller.ts',
  'apps/api/src/modules/users/users.controller.ts',
  'apps/api/src/modules/viewings/viewings.controller.ts',
];

for (const relPath of controllers) {
  const fullPath = path.join(repoRoot, relPath);
  if (!fs.existsSync(fullPath)) continue;
  const content = fs.readFileSync(fullPath, 'utf8');

  // Find class controller prefix
  const ctrlMatch = content.match(/@Controller\s*\(\s*['"`]?([^'"`\)]*)['"`]?\s*\)/);
  const classPrefix = ctrlMatch ? ctrlMatch[1].trim() : '';

  // Class-level Guards & Roles
  const classUseGuards = [...content.matchAll(/@UseGuards\s*\(([^)]+)\)\s*(?=export\s+class)/g)].map(m => m[1].replace(/\s+/g, ' '));
  const classRoles = [...content.matchAll(/@Roles\s*\(([^)]+)\)\s*(?=export\s+class)/g)].map(m => m[1].replace(/\s+/g, ' '));

  // Find methods
  const lines = content.split('\n');
  let currentMethodDecorators = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('@')) {
      currentMethodDecorators.push(line);
    } else if (line.match(/^(async\s+)?(public\s+)?([a-zA-Z0-9_]+)\s*\(/)) {
      // Method signature
      const methodDecs = currentMethodDecorators.join(' ');
      const httpMatch = methodDecs.match(/@(Get|Post|Put|Delete|Patch)\s*\(\s*['"`]?([^'"`\)]*)['"`]?\s*\)/i);
      
      if (httpMatch) {
        const httpMethod = httpMatch[1].toUpperCase();
        const subPath = httpMatch[2].trim();
        let fullRoute = '/' + [classPrefix, subPath].filter(Boolean).join('/').replace(/\/+/g, '/');
        if (fullRoute.endsWith('/') && fullRoute.length > 1) fullRoute = fullRoute.slice(0, -1);

        const methodGuards = [...methodDecs.matchAll(/@UseGuards\s*\(([^)]+)\)/g)].map(m => m[1].replace(/\s+/g, ' '));
        const methodRoles = [...methodDecs.matchAll(/@Roles\s*\(([^)]+)\)/g)].map(m => m[1].replace(/\s+/g, ' '));
        
        // Find DTO in method parameters
        let paramSignature = '';
        let j = i;
        while (j < lines.length && !lines[j].includes('{')) {
          paramSignature += ' ' + lines[j].trim();
          j++;
        }
        const bodyMatch = paramSignature.match(/@Body\s*\([^)]*\)\s*([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_<>[\]]+)/);
        const dto = bodyMatch ? bodyMatch[2] : '';

        const allGuards = [...new Set([...classUseGuards, ...methodGuards])].join('; ');
        const allRoles = [...new Set([...classRoles, ...methodRoles])].join('; ');

        endpoints.push({
          type: 'NestJS',
          method: httpMethod,
          route: fullRoute,
          controller_or_file: relPath,
          line: i + 1,
          guards: allGuards,
          roles: allRoles,
          dto: dto,
          da_ra_boi: '',
          ket_qua: ''
        });
      }
      currentMethodDecorators = [];
    } else if (line === '' || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
      // comment or empty line, ignore
    } else {
      if (!line.startsWith('@')) {
        currentMethodDecorators = [];
      }
    }
  }
}

// B. Parse Next.js route handlers
const nextRouteFiles = [
  'apps/web/src/app/api/consultation/route.ts',
  'apps/web/src/app/api/custom-listings/route.ts',
  'apps/web/src/app/api/custom-listings/[slug]/route.ts',
  'apps/web/src/app/api/feedback/route.ts',
  'apps/web/src/app/api/reviews/route.ts',
  'apps/web/src/app/api/reviews/blacklist-check/route.ts',
  'apps/web/src/app/api/upload-images/route.ts',
];

for (const relPath of nextRouteFiles) {
  const fullPath = path.join(repoRoot, relPath);
  if (!fs.existsSync(fullPath)) continue;
  const content = fs.readFileSync(fullPath, 'utf8');

  // Derive route path from file path
  const routePath = '/' + relPath
    .replace(/^apps\/web\/src\/app\//, '')
    .replace(/\/route\.ts$/, '');

  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  for (const m of methods) {
    const regex = new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\s*\\(`, 'g');
    const match = regex.exec(content);
    if (match) {
      // Find line number
      const lineNo = content.slice(0, match.index).split('\n').length;
      endpoints.push({
        type: 'NextRoute',
        method: m,
        route: routePath,
        controller_or_file: relPath,
        line: lineNo,
        guards: 'NextAuth/Custom/None',
        roles: '',
        dto: 'N/A (Request body json)',
        da_ra_boi: '',
        ket_qua: ''
      });
    }
  }
}

const endpointCsvHeaders = ['type', 'method', 'route', 'controller_or_file', 'line', 'guards', 'roles', 'dto', 'da_ra_boi', 'ket_qua'];
const endpointRows = [endpointCsvHeaders.map(escapeCsv).join(',')];
for (const ep of endpoints) {
  endpointRows.push([
    ep.type, ep.method, ep.route, ep.controller_or_file, ep.line, ep.guards, ep.roles, ep.dto, ep.da_ra_boi, ep.ket_qua
  ].map(escapeCsv).join(','));
}
fs.writeFileSync(path.join(outDir, 'inv-endpoints.csv'), endpointRows.join('\n'), 'utf8');
console.log(`Saved inv-endpoints.csv (${endpoints.length} endpoints)`);

// =============================================================================
// 2. ROUTES INVENTORY (Next.js page.tsx and layout.tsx)
// =============================================================================
console.log('--- Generating inv-routes.csv ---');
function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      walkDir(p, fileList);
    } else {
      fileList.push(p);
    }
  }
  return fileList;
}

const webAppDir = path.join(repoRoot, 'apps/web/src/app');
const allWebFiles = walkDir(webAppDir);
const routeFiles = allWebFiles.filter(f => f.match(/[/\\](page|layout)\.tsx$/));

const routes = [];
for (const f of routeFiles) {
  const relPath = path.relative(repoRoot, f).replace(/\\/g, '/');
  const type = f.endsWith('page.tsx') ? 'page' : 'layout';
  
  let routePath = '/' + relPath
    .replace(/^apps\/web\/src\/app/, '')
    .replace(/\/(page|layout)\.tsx$/, '');
  if (routePath === '') routePath = '/';

  const content = fs.readFileSync(f, 'utf8');
  const isAuthRequired = routePath.startsWith('/admin') || routePath.startsWith('/tai-khoan') || routePath.startsWith('/dang-tin');
  const hasMetadata = content.includes('generateMetadata') || content.includes('export const metadata');
  const isClient = content.includes("'use client'") || content.includes('"use client"');

  routes.push({
    route_path: routePath,
    file_path: relPath,
    type: type,
    is_client: isClient ? 'yes' : 'no',
    auth_required: isAuthRequired ? 'yes' : 'no',
    has_metadata: hasMetadata ? 'yes' : 'no',
    da_ra_boi: '',
    ket_qua: ''
  });
}

const routeCsvHeaders = ['route_path', 'file_path', 'type', 'is_client', 'auth_required', 'has_metadata', 'da_ra_boi', 'ket_qua'];
const routeRows = [routeCsvHeaders.map(escapeCsv).join(',')];
for (const r of routes) {
  routeRows.push([
    r.route_path, r.file_path, r.type, r.is_client, r.auth_required, r.has_metadata, r.da_ra_boi, r.ket_qua
  ].map(escapeCsv).join(','));
}
fs.writeFileSync(path.join(outDir, 'inv-routes.csv'), routeRows.join('\n'), 'utf8');
console.log(`Saved inv-routes.csv (${routes.length} routes)`);

// =============================================================================
// 3. MODELS INVENTORY (Prisma Models & Read/Write Locations)
// =============================================================================
console.log('--- Generating inv-models.csv ---');
const schemaPath = path.join(repoRoot, 'packages/database/prisma/schema.prisma');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');
const modelMatches = [...schemaContent.matchAll(/model\s+(\w+)\s*\{([^}]*)\}/gs)];

// Scan codebase for model usage
function getTsFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return walkDir(dir).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
}

const tsFiles = [
  ...getTsFiles(path.join(repoRoot, 'apps/api/src')),
  ...getTsFiles(path.join(repoRoot, 'apps/web/src')),
  ...getTsFiles(path.join(repoRoot, 'packages/database/scripts')),
  ...getTsFiles(path.join(repoRoot, 'packages/database/src')),
];

const modelUsages = [];

for (const m of modelMatches) {
  const modelName = m[1];
  const block = m[2];
  
  // Table name mapping @@map("...")
  const mapMatch = block.match(/@@map\("([^"]+)"\)/);
  const tableName = mapMatch ? mapMatch[1] : modelName.toLowerCase();

  // Model accessor in PrismaClient: e.g. prisma.user, prisma.listingReport
  const camelModel = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const readRegex = new RegExp(`prisma\\.${camelModel}\\.(findMany|findUnique|findFirst|count|aggregate|groupBy)`, 'g');
  const writeRegex = new RegExp(`prisma\\.${camelModel}\\.(create|createMany|update|updateMany|upsert|delete|deleteMany)`, 'g');

  const reads = new Set();
  const writes = new Set();

  for (const f of tsFiles) {
    const code = fs.readFileSync(f, 'utf8');
    const rel = path.relative(repoRoot, f).replace(/\\/g, '/');
    if (readRegex.test(code)) reads.add(rel);
    if (writeRegex.test(code)) writes.add(rel);
  }

  // Business classification based on R6
  let category = 'core';
  const financeDepositModels = ['DepositRecord', 'UnitReservation', 'Payment', 'PaymentAllocation', 'FinanceLedger', 'Dispute', 'Commission'];
  const agencyOldModels = ['AgencyProfile', 'AgentProfile', 'OwnerProfile', 'RentalUnit', 'OwnerServiceAgreement', 'AgreementUnit', 'RentalRequest', 'Introduction', 'RentalDeal', 'HandoverRecord', 'Document', 'DocumentAcceptance', 'ConsentRecord'];
  const buySellModels = ['Project', 'PriceIndex'];
  
  if (financeDepositModels.includes(modelName)) {
    category = 'finance_payment (check R6)';
  } else if (agencyOldModels.includes(modelName)) {
    category = 'legacy_agency_complex';
  } else if (buySellModels.includes(modelName)) {
    category = 'buy_sell_project (check R6)';
  }

  const readArr = Array.from(reads);
  const writeArr = Array.from(writes);

  modelUsages.push({
    model_name: modelName,
    table_name: tableName,
    category: category,
    read_count: readArr.length,
    write_count: writeArr.length,
    read_locations: readArr.slice(0, 5).join('; ') + (readArr.length > 5 ? ` (+${readArr.length - 5} more)` : ''),
    write_locations: writeArr.slice(0, 5).join('; ') + (writeArr.length > 5 ? ` (+${writeArr.length - 5} more)` : ''),
    status: (readArr.length === 0 && writeArr.length === 0) ? 'DEAD_CODE (0 reads/writes)' : 'ACTIVE',
    da_ra_boi: '',
    ket_qua: ''
  });
}

const modelCsvHeaders = ['model_name', 'table_name', 'category', 'status', 'read_count', 'write_count', 'read_locations', 'write_locations', 'da_ra_boi', 'ket_qua'];
const modelRows = [modelCsvHeaders.map(escapeCsv).join(',')];
for (const mu of modelUsages) {
  modelRows.push([
    mu.model_name, mu.table_name, mu.category, mu.status, mu.read_count, mu.write_count, mu.read_locations, mu.write_locations, mu.da_ra_boi, mu.ket_qua
  ].map(escapeCsv).join(','));
}
fs.writeFileSync(path.join(outDir, 'inv-models.csv'), modelRows.join('\n'), 'utf8');
console.log(`Saved inv-models.csv (${modelUsages.length} models)`);

// =============================================================================
// 4. ENVIRONMENT VARIABLES INVENTORY
// =============================================================================
console.log('--- Generating inv-env.csv ---');
const envExamplePath = path.join(repoRoot, '.env.example');
const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
const exampleVars = new Set();
for (const line of envExampleContent.split('\n')) {
  const m = line.trim().match(/^([A-Z0-9_]+)=/);
  if (m) exampleVars.add(m[1]);
}

const codeFilesForEnv = [
  ...getTsFiles(path.join(repoRoot, 'apps/api/src')),
  ...getTsFiles(path.join(repoRoot, 'apps/web/src')),
  ...getTsFiles(path.join(repoRoot, 'packages/database')),
  ...getTsFiles(path.join(repoRoot, 'packages/shared')),
];

const foundEnvVars = new Map();

for (const f of codeFilesForEnv) {
  const code = fs.readFileSync(f, 'utf8');
  const rel = path.relative(repoRoot, f).replace(/\\/g, '/');
  
  // process.env.VAR
  const pMatches = [...code.matchAll(/process\.env\.([A-Z0-9_]+)/g)];
  for (const pm of pMatches) {
    const v = pm[1];
    if (!foundEnvVars.has(v)) foundEnvVars.set(v, new Set());
    foundEnvVars.get(v).add(rel);
  }

  // configService.get('VAR') or configService.get<string>('VAR')
  const cMatches = [...code.matchAll(/configService\.get(?:<[^>]+>)?\s*\(\s*['"]([A-Z0-9_]+)['"]/g)];
  for (const cm of cMatches) {
    const v = cm[1];
    if (!foundEnvVars.has(v)) foundEnvVars.set(v, new Set());
    foundEnvVars.get(v).add(rel);
  }
}

const allEnvVarKeys = new Set([...exampleVars, ...foundEnvVars.keys()]);
const envList = [];

for (const v of Array.from(allEnvVarKeys).sort()) {
  const usedIn = foundEnvVars.has(v) ? Array.from(foundEnvVars.get(v)) : [];
  const inExample = exampleVars.has(v);

  let status = 'active';
  if (usedIn.length === 0) {
    status = 'UNUSED_IN_CODE (only in .env.example)';
  } else if (!inExample) {
    status = 'MISSING_IN_ENV_EXAMPLE';
  } else {
    status = 'ACTIVE';
  }

  envList.push({
    env_var: v,
    in_example: inExample ? 'yes' : 'no',
    usage_count: usedIn.length,
    used_in: usedIn.slice(0, 5).join('; ') + (usedIn.length > 5 ? ` (+${usedIn.length - 5} more)` : ''),
    status: status,
    da_ra_boi: '',
    ket_qua: ''
  });
}

const envCsvHeaders = ['env_var', 'in_example', 'status', 'usage_count', 'used_in', 'da_ra_boi', 'ket_qua'];
const envRows = [envCsvHeaders.map(escapeCsv).join(',')];
for (const e of envList) {
  envRows.push([
    e.env_var, e.in_example, e.status, e.usage_count, e.used_in, e.da_ra_boi, e.ket_qua
  ].map(escapeCsv).join(','));
}
fs.writeFileSync(path.join(outDir, 'inv-env.csv'), envRows.join('\n'), 'utf8');
console.log(`Saved inv-env.csv (${envList.length} env vars)`);

// =============================================================================
// 5. FRONTEND FETCH CALLS INVENTORY (inv-calls.csv)
// =============================================================================
console.log('--- Generating inv-calls.csv ---');
const frontendFiles = walkDir(path.join(repoRoot, 'apps/web/src')).filter(f => f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js'));
const apiCalls = [];

for (const f of frontendFiles) {
  const code = fs.readFileSync(f, 'utf8');
  const rel = path.relative(repoRoot, f).replace(/\\/g, '/');
  const lines = code.split('\n');

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const fetchMatch = line.match(/(authFetch|fetch)\s*\(\s*([^,\)]+)/);
    if (fetchMatch) {
      const callType = fetchMatch[1];
      let rawUrl = fetchMatch[2].trim();
      
      // Determine HTTP method from context
      let method = 'GET';
      let snippet = lines.slice(idx, Math.min(lines.length, idx + 10)).join(' ');
      const methodMatch = snippet.match(/method\s*:\s*['"]([A-Z]+)['"]/i);
      if (methodMatch) {
        method = methodMatch[1].toUpperCase();
      } else if (snippet.includes('POST') || snippet.includes('method: "POST"')) {
        method = 'POST';
      }

      apiCalls.push({
        file: rel,
        line: idx + 1,
        call_type: callType,
        target_expression: rawUrl.slice(0, 100),
        method: method,
        matching_backend_endpoint: '',
        da_ra_boi: '',
        ket_qua: ''
      });
    }
  }
}

const callCsvHeaders = ['file', 'line', 'call_type', 'method', 'target_expression', 'matching_backend_endpoint', 'da_ra_boi', 'ket_qua'];
const callRows = [callCsvHeaders.map(escapeCsv).join(',')];
for (const ac of apiCalls) {
  callRows.push([
    ac.file, ac.line, ac.call_type, ac.method, ac.target_expression, ac.matching_backend_endpoint, ac.da_ra_boi, ac.ket_qua
  ].map(escapeCsv).join(','));
}
fs.writeFileSync(path.join(outDir, 'inv-calls.csv'), callRows.join('\n'), 'utf8');
console.log(`Saved inv-calls.csv (${apiCalls.length} fetch calls)`);

// =============================================================================
// 6. SCRIPTS INVENTORY (inv-scripts.csv)
// =============================================================================
console.log('--- Generating inv-scripts.csv ---');
const scriptEntries = [];

// A. package.json root and packages
const pkgFiles = [
  'package.json',
  'apps/api/package.json',
  'apps/web/package.json',
  'packages/database/package.json',
  'packages/shared/package.json'
];

for (const pf of pkgFiles) {
  const pPath = path.join(repoRoot, pf);
  if (fs.existsSync(pPath)) {
    const pkg = JSON.parse(fs.readFileSync(pPath, 'utf8'));
    if (pkg.scripts) {
      for (const [sName, sCmd] of Object.entries(pkg.scripts)) {
        scriptEntries.push({
          source: pf,
          script_name_or_file: sName,
          command_or_purpose: sCmd,
          safety_risk: (sCmd.includes('reset') || sCmd.includes('drop') || sCmd.includes('accept-data-loss')) ? 'HIGH (data destruction)' : 'NORMAL',
          da_ra_boi: '',
          ket_qua: ''
        });
      }
    }
  }
}

// B. .bat files in root
const rootFiles = fs.readdirSync(repoRoot);
for (const rf of rootFiles) {
  if (rf.endsWith('.bat')) {
    const batPath = path.join(repoRoot, rf);
    const content = fs.readFileSync(batPath, 'utf8');
    const hasSecret = content.includes('eyJh') || content.includes('token') || content.includes('secret');
    scriptEntries.push({
      source: 'root .bat',
      script_name_or_file: rf,
      command_or_purpose: `Windows batch script (${content.split('\n').length} lines)`,
      safety_risk: hasSecret ? 'CRITICAL (contains token/secret)' : 'NORMAL',
      da_ra_boi: '',
      ket_qua: ''
    });
  }
}

// C. Files in scripts/ and packages/database/scripts/
const scriptDirs = ['scripts', 'packages/database/scripts'];
for (const sd of scriptDirs) {
  const fullDir = path.join(repoRoot, sd);
  if (fs.existsSync(fullDir)) {
    const sFiles = fs.readdirSync(fullDir);
    for (const sf of sFiles) {
      const sFull = path.join(fullDir, sf);
      if (fs.statSync(sFull).isFile()) {
        const content = fs.readFileSync(sFull, 'utf8');
        const hasDb = content.includes('PrismaClient');
        const hasWrite = content.includes('.create') || content.includes('.update') || content.includes('.delete') || content.includes('$executeRaw');
        scriptEntries.push({
          source: sd,
          script_name_or_file: sf,
          command_or_purpose: `Node script (${content.split('\n').length} lines)`,
          safety_risk: (hasDb && hasWrite) ? 'MEDIUM (writes to DB without _test check)' : 'LOW (read/test)',
          da_ra_boi: '',
          ket_qua: ''
        });
      }
    }
  }
}

const scriptCsvHeaders = ['source', 'script_name_or_file', 'command_or_purpose', 'safety_risk', 'da_ra_boi', 'ket_qua'];
const scriptRows = [scriptCsvHeaders.map(escapeCsv).join(',')];
for (const se of scriptEntries) {
  scriptRows.push([
    se.source, se.script_name_or_file, se.command_or_purpose, se.safety_risk, se.da_ra_boi, se.ket_qua
  ].map(escapeCsv).join(','));
}
fs.writeFileSync(path.join(outDir, 'inv-scripts.csv'), scriptRows.join('\n'), 'utf8');
console.log(`Saved inv-scripts.csv (${scriptEntries.length} scripts)`);

console.log('=== All 6 inventory files generated successfully! ===');
