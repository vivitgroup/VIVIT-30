import fs from 'node:fs';

const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const packages = lock.packages ?? {};
const queries = [];
const seen = new Set();

for (const [path, meta] of Object.entries(packages)) {
  if (!path || !path.includes('node_modules/') || !meta?.version || meta.dev === true) continue;
  const marker = 'node_modules/';
  const tail = path.slice(path.lastIndexOf(marker) + marker.length);
  const parts = tail.split('/');
  const name = tail.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
  if (!name) continue;
  const key = `${name}@${meta.version}`;
  if (seen.has(key)) continue;
  seen.add(key);
  queries.push({ package: { ecosystem: 'npm', name }, version: meta.version, key });
}

if (queries.length === 0) {
  throw new Error('No production dependencies found in package-lock.json');
}

const findings = [];
for (let offset = 0; offset < queries.length; offset += 100) {
  const chunk = queries.slice(offset, offset + 100);
  const response = await fetch('https://api.osv.dev/v1/querybatch', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ queries: chunk.map(({ package: pkg, version }) => ({ package: pkg, version })) }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    throw new Error(`OSV dependency security check unavailable: HTTP ${response.status}`);
  }
  const body = await response.json();
  const results = Array.isArray(body.results) ? body.results : [];
  results.forEach((result, index) => {
    const vulns = Array.isArray(result?.vulns) ? result.vulns : [];
    if (vulns.length) {
      findings.push({ dependency: chunk[index].key, advisories: vulns.map((v) => v.id).filter(Boolean) });
    }
  });
}

if (findings.length) {
  console.error('Known production dependency vulnerabilities detected by OSV:');
  for (const finding of findings) console.error(`- ${finding.dependency}: ${finding.advisories.join(', ')}`);
  process.exit(1);
}

console.log(`Production dependency security: PASS (${queries.length} unique package versions checked against OSV)`);
