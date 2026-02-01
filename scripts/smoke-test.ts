/**
 * Smoke Test — v0.2 Integration Validation
 *
 * Validates that all CLI commands, preview server API endpoints, and
 * barrel module imports work correctly. This is the final integration
 * gate before declaring v0.2 complete.
 *
 * Sections:
 *   1. TypeScript compilation check
 *   2. CLI help/dry-run validation
 *   3. Preview server API endpoint validation
 *   4. Module import validation
 *
 * Usage:
 *   npx tsx scripts/smoke-test.ts
 *   npm run smoke-test
 *
 * Exit code: 0 if all pass, 1 if any fail.
 *
 * Phase 20: Integration Testing & Polish
 */

import { execSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// =============================================================================
// ANSI Color Helpers
// =============================================================================

const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

// =============================================================================
// Test Result Tracking
// =============================================================================

interface TestResult {
  section: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  detail?: string;
  durationMs?: number;
}

const results: TestResult[] = [];

function record(section: string, name: string, status: TestResult['status'], detail?: string, durationMs?: number): void {
  results.push({ section, name, status, detail, durationMs });
  const icon = status === 'PASS' ? `${C.green}PASS${C.reset}` :
               status === 'WARN' ? `${C.yellow}WARN${C.reset}` :
               `${C.red}FAIL${C.reset}`;
  const timeStr = durationMs !== undefined ? ` ${C.dim}(${durationMs}ms)${C.reset}` : '';
  const detailStr = detail ? ` ${C.gray}— ${detail}${C.reset}` : '';
  console.log(`  [${icon}] ${name}${timeStr}${detailStr}`);
}

// =============================================================================
// 1. TypeScript Compilation Check
// =============================================================================

async function checkTypeScript(): Promise<void> {
  console.log(`\n${C.bold}${C.cyan}[1/4] TypeScript Compilation Check${C.reset}`);
  const start = Date.now();
  try {
    execSync('npx tsc --noEmit', { cwd: PROJECT_ROOT, timeout: 120_000, stdio: 'pipe' });
    record('TypeScript', 'tsc --noEmit', 'PASS', 'Zero errors', Date.now() - start);
  } catch (err: unknown) {
    const stderr = (err as { stderr?: Buffer })?.stderr?.toString() || '';
    const errorCount = (stderr.match(/error TS/g) || []).length;
    record('TypeScript', 'tsc --noEmit', 'FAIL', `${errorCount} type error(s)`, Date.now() - start);
  }
}

// =============================================================================
// 2. CLI Help/Dry-Run Validation
// =============================================================================

interface CliTest {
  name: string;
  cmd: string;
  args: string[];
  /** Whether exit code 1 is acceptable (e.g., validate without env vars) */
  allowNonZero?: boolean;
}

const CLI_TESTS: CliTest[] = [
  {
    name: 'validate-pipeline (dry-run)',
    cmd: 'npx',
    args: ['tsx', 'scripts/pipeline/validate-pipeline.ts'],
    allowNonZero: true, // Will fail without env vars but exercises code
  },
  {
    name: 'monitor/manage.ts help',
    cmd: 'npx',
    args: ['tsx', 'scripts/monitor/manage.ts', 'help'],
  },
  {
    name: 'sync/manage.ts help',
    cmd: 'npx',
    args: ['tsx', 'scripts/sync/manage.ts', 'help'],
  },
  {
    name: 'orders/manage.ts help',
    cmd: 'npx',
    args: ['tsx', 'scripts/orders/manage.ts', 'help'],
  },
  {
    name: 'orders/cart-cli.ts help',
    cmd: 'npx',
    args: ['tsx', 'scripts/orders/cart-cli.ts', 'help'],
  },
  {
    name: 'margin-report.ts --help',
    cmd: 'npx',
    args: ['tsx', 'scripts/pipeline/margin-report.ts', '--help'],
  },
  {
    name: 'sale-pricing.ts (no args = help)',
    cmd: 'npx',
    args: ['tsx', 'scripts/pipeline/sale-pricing.ts'],
    allowNonZero: true, // Shows help when no command given
  },
  {
    name: 'wix-coupons.ts (no args = help)',
    cmd: 'npx',
    args: ['tsx', 'scripts/pipeline/wix-coupons.ts'],
  },
];

async function checkCli(): Promise<void> {
  console.log(`\n${C.bold}${C.cyan}[2/4] CLI Help/Dry-Run Validation${C.reset}`);

  for (const test of CLI_TESTS) {
    const start = Date.now();
    try {
      execSync(`${test.cmd} ${test.args.join(' ')}`, {
        cwd: PROJECT_ROOT,
        timeout: 60_000,
        stdio: 'pipe',
        env: { ...process.env, NODE_NO_WARNINGS: '1' },
      });
      record('CLI', test.name, 'PASS', 'exit 0', Date.now() - start);
    } catch (err: unknown) {
      const exitCode = (err as { status?: number })?.status;
      const stderr = (err as { stderr?: Buffer })?.stderr?.toString()?.slice(0, 200) || '';
      if (test.allowNonZero && exitCode !== null) {
        // Non-zero exit is acceptable for this test
        record('CLI', test.name, 'WARN', `exit ${exitCode} (expected without env vars)`, Date.now() - start);
      } else {
        record('CLI', test.name, 'FAIL', `exit ${exitCode}: ${stderr.trim().split('\n')[0]}`, Date.now() - start);
      }
    }
  }
}

// =============================================================================
// 3. Preview Server API Endpoint Validation
// =============================================================================

interface EndpointTest {
  path: string;
  description: string;
  /** Expected content-type prefix */
  contentType?: string;
  /** Whether to validate JSON parse-ability */
  expectJson?: boolean;
}

const ENDPOINT_TESTS: EndpointTest[] = [
  { path: '/', description: 'Root HTML page', contentType: 'text/html' },
  { path: '/api/presets', description: 'Pricing presets', expectJson: true },
  { path: '/api/templates', description: 'Product templates', expectJson: true },
  { path: '/api/logos', description: 'Logo registry', expectJson: true },
  { path: '/api/margins', description: 'Margin data', expectJson: true },
  { path: '/api/sales', description: 'Active sales', expectJson: true },
  { path: '/api/inventory/products', description: 'Inventory products', expectJson: true },
  { path: '/api/inventory/alerts', description: 'Inventory alerts', expectJson: true },
  { path: '/api/inventory/health', description: 'Sync health', expectJson: true },
  { path: '/api/orders', description: 'Order list', expectJson: true },
  { path: '/api/cart/preview', description: 'Cart preview', expectJson: true },
  { path: '/api/cart/history', description: 'Cart history', expectJson: true },
  { path: '/api/printers', description: 'Printer list', expectJson: true },
];

async function checkPreviewServer(): Promise<void> {
  console.log(`\n${C.bold}${C.cyan}[3/4] Preview Server API Endpoint Validation${C.reset}`);

  // Start the preview server as a child process and detect its port
  const serverProc2 = spawn('npx', ['tsx', 'scripts/pipeline/preview-server.ts'], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, NODE_NO_WARNINGS: '1' },
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
  });

  let serverPort: number | null = null;
  let serverReady = false;

  // Wait for server to announce its port
  const readyPromise = new Promise<number>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Server startup timeout (30s)'));
    }, 30_000);

    const onData = (data: Buffer) => {
      const line = data.toString();
      // Match "Preview server running at http://localhost:XXXX"
      const match = line.match(/localhost:(\d+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(parseInt(match[1], 10));
      }
    };

    serverProc2.stdout?.on('data', onData);
    serverProc2.stderr?.on('data', onData);

    serverProc2.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    serverProc2.on('exit', (code) => {
      if (!serverReady) {
        clearTimeout(timeout);
        reject(new Error(`Server exited with code ${code} before becoming ready`));
      }
    });
  });

  try {
    serverPort = await readyPromise;
    serverReady = true;
    console.log(`  ${C.gray}Server started on port ${serverPort}${C.reset}`);

    // Small delay to ensure server is fully ready
    await new Promise((r) => setTimeout(r, 500));

    // Test each endpoint
    for (const test of ENDPOINT_TESTS) {
      const url = `http://localhost:${serverPort}${test.path}`;
      const start = Date.now();
      try {
        const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) });
        const elapsed = Date.now() - start;

        if (!resp.ok && resp.status >= 500) {
          const body = await resp.text().catch(() => '');
          record('API', `GET ${test.path}`, 'FAIL', `HTTP ${resp.status}: ${body.slice(0, 100)}`, elapsed);
          continue;
        }

        // Check content type if specified
        const ct = resp.headers.get('content-type') || '';
        if (test.contentType && !ct.startsWith(test.contentType)) {
          record('API', `GET ${test.path}`, 'WARN', `Expected ${test.contentType}, got ${ct}`, elapsed);
          continue;
        }

        // Check JSON parsability
        if (test.expectJson) {
          const text = await resp.text();
          try {
            JSON.parse(text);
            record('API', `GET ${test.path}`, 'PASS', `HTTP ${resp.status}, valid JSON`, elapsed);
          } catch {
            record('API', `GET ${test.path}`, 'FAIL', `HTTP ${resp.status} but invalid JSON`, elapsed);
          }
        } else {
          record('API', `GET ${test.path}`, 'PASS', `HTTP ${resp.status}`, elapsed);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        record('API', `GET ${test.path}`, 'FAIL', msg.slice(0, 100), Date.now() - start);
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    record('API', 'Server startup', 'FAIL', msg);
    console.log(`  ${C.red}Skipping endpoint tests — server failed to start${C.reset}`);
  } finally {
    // Kill the server process
    try {
      serverProc2.kill('SIGTERM');
      // On Windows, also try taskkill for the child tree
      if (process.platform === 'win32' && serverProc2.pid) {
        try {
          execSync(`taskkill /PID ${serverProc2.pid} /T /F`, { stdio: 'pipe' });
        } catch {
          // Best effort
        }
      }
    } catch {
      // Already dead
    }
  }
}

// =============================================================================
// 4. Module Import Validation
// =============================================================================

interface ModuleTest {
  name: string;
  path: string;
}

const MODULE_TESTS: ModuleTest[] = [
  { name: 'sanmar/index', path: './sanmar/index.js' },
  { name: 'ss-activewear/index', path: './ss-activewear/index.js' },
  { name: 'vendor/index', path: './vendor/index.js' },
  { name: 'pipeline/index', path: './pipeline/index.js' },
  { name: 'monitor/index', path: './monitor/index.js' },
  { name: 'sync/index', path: './sync/index.js' },
  { name: 'orders/index', path: './orders/index.js' },
];

async function checkModuleImports(): Promise<void> {
  console.log(`\n${C.bold}${C.cyan}[4/4] Module Import Validation${C.reset}`);

  for (const mod of MODULE_TESTS) {
    const start = Date.now();
    try {
      // Write a temp script that imports the module and prints OK
      const tmpFile = path.join(PROJECT_ROOT, 'scripts', `_smoke_test_import_${mod.name.replace(/\//g, '_')}.ts`);
      const importPath = mod.path.replace(/\\/g, '/');
      const scriptContent = `import '${importPath}';\nconsole.log('OK');`;
      const fs = await import('node:fs');
      fs.writeFileSync(tmpFile, scriptContent);

      try {
        execSync(`npx tsx "${tmpFile}"`, {
          cwd: PROJECT_ROOT,
          timeout: 30_000,
          stdio: 'pipe',
          env: { ...process.env, NODE_NO_WARNINGS: '1' },
        });
        record('Import', mod.name, 'PASS', 'Module loaded successfully', Date.now() - start);
      } finally {
        // Clean up temp file
        try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
      }
    } catch (err: unknown) {
      const stderr = (err as { stderr?: Buffer })?.stderr?.toString() || '';
      // Extract the most useful error line (skip node internals)
      const lines = stderr.trim().split('\n');
      const errorLine = lines.find(l =>
        l.includes('Error:') || l.includes('Cannot find') || l.includes('SyntaxError')
      ) || lines[0] || 'Unknown error';
      record('Import', mod.name, 'FAIL', errorLine.trim().slice(0, 150), Date.now() - start);
    }
  }
}

// =============================================================================
// Report
// =============================================================================

function printReport(): void {
  console.log(`\n${C.bold}${'='.repeat(60)}${C.reset}`);
  console.log(`${C.bold}  SMOKE TEST RESULTS${C.reset}`);
  console.log(`${C.bold}${'='.repeat(60)}${C.reset}\n`);

  const pass = results.filter(r => r.status === 'PASS').length;
  const warn = results.filter(r => r.status === 'WARN').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  // Summary by section
  const sections = [...new Set(results.map(r => r.section))];
  for (const section of sections) {
    const sectionResults = results.filter(r => r.section === section);
    const sPass = sectionResults.filter(r => r.status === 'PASS').length;
    const sWarn = sectionResults.filter(r => r.status === 'WARN').length;
    const sFail = sectionResults.filter(r => r.status === 'FAIL').length;
    const sTotal = sectionResults.length;

    const statusColor = sFail > 0 ? C.red : sWarn > 0 ? C.yellow : C.green;
    console.log(`  ${C.bold}${section}${C.reset}: ${statusColor}${sPass}/${sTotal} pass${C.reset}` +
      (sWarn > 0 ? `, ${C.yellow}${sWarn} warn${C.reset}` : '') +
      (sFail > 0 ? `, ${C.red}${sFail} fail${C.reset}` : ''));
  }

  console.log();
  const overallColor = fail > 0 ? C.red : warn > 0 ? C.yellow : C.green;
  console.log(`  ${C.bold}Total: ${overallColor}${pass}/${total} pass${C.reset}` +
    (warn > 0 ? `, ${C.yellow}${warn} warn${C.reset}` : '') +
    (fail > 0 ? `, ${C.red}${fail} fail${C.reset}` : ''));

  // List failures
  if (fail > 0) {
    console.log(`\n  ${C.bold}${C.red}Failures:${C.reset}`);
    for (const r of results.filter(r => r.status === 'FAIL')) {
      console.log(`    ${C.red}x${C.reset} [${r.section}] ${r.name}: ${r.detail || 'No detail'}`);
    }
  }

  console.log(`\n${C.bold}${'='.repeat(60)}${C.reset}`);

  if (fail > 0) {
    console.log(`\n  ${C.red}${C.bold}SMOKE TEST FAILED${C.reset} — ${fail} failure(s) found\n`);
  } else if (warn > 0) {
    console.log(`\n  ${C.yellow}${C.bold}SMOKE TEST PASSED WITH WARNINGS${C.reset} — ${warn} warning(s)\n`);
  } else {
    console.log(`\n  ${C.green}${C.bold}SMOKE TEST PASSED${C.reset} — All ${total} checks green\n`);
  }
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.log(`${C.bold}${C.blue}`);
  console.log('  ╔════════════════════════════════════════╗');
  console.log('  ║       HotBox v0.2 Smoke Test           ║');
  console.log('  ╚════════════════════════════════════════╝');
  console.log(`${C.reset}`);

  await checkTypeScript();
  await checkCli();
  await checkPreviewServer();
  await checkModuleImports();

  printReport();

  const failCount = results.filter(r => r.status === 'FAIL').length;
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`\nFatal error in smoke test: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
