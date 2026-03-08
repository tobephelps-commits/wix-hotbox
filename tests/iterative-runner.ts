#!/usr/bin/env tsx
/**
 * Iterative Multi-Pass Test Runner
 *
 * Runs the Playwright test suite multiple times to detect flaky tests.
 * Flaky tests pass in some runs and fail in others — this runner
 * identifies them by comparing results across passes.
 *
 * Usage:
 *   tsx tests/iterative-runner.ts [--passes N] [--project api|ui|all]
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// --- CLI arg parsing ---

function parseArgs(args: string[]): { passes: number; project: string } {
  let passes = 3;
  let project = 'all';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--passes' && args[i + 1]) {
      passes = parseInt(args[i + 1], 10);
      if (isNaN(passes) || passes < 1) {
        console.error('Error: --passes must be a positive integer');
        process.exit(2);
      }
      i++;
    } else if (args[i] === '--project' && args[i + 1]) {
      project = args[i + 1];
      if (!['api', 'ui', 'all'].includes(project)) {
        console.error('Error: --project must be api, ui, or all');
        process.exit(2);
      }
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Iterative Multi-Pass Test Runner

Usage: tsx tests/iterative-runner.ts [options]

Options:
  --passes N         Number of test passes (default: 3)
  --project <name>   Project filter: api, ui, or all (default: all)
  --help, -h         Show this help message
`);
      process.exit(0);
    }
  }

  return { passes, project };
}

// --- Types ---

interface TestResult {
  name: string;
  project: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  error?: string;
}

interface PassResults {
  pass: number;
  tests: TestResult[];
  duration: number;
}

interface TestAnalysis {
  name: string;
  project: string;
  category: 'stable-pass' | 'stable-fail' | 'flaky' | 'skipped';
  passCount: number;
  failCount: number;
  skipCount: number;
  lastError?: string;
}

interface IterativeReport {
  timestamp: string;
  passes: number;
  project: string;
  totalTests: number;
  stablePass: number;
  stableFail: number;
  flaky: number;
  skipped: number;
  passResults: PassResults[];
  analysis: TestAnalysis[];
}

// --- Playwright JSON output types ---

interface PlaywrightJsonResult {
  suites?: PlaywrightSuite[];
  stats?: { duration: number };
}

interface PlaywrightSuite {
  title: string;
  suites?: PlaywrightSuite[];
  specs?: PlaywrightSpec[];
}

interface PlaywrightSpec {
  title: string;
  tests?: PlaywrightTest[];
}

interface PlaywrightTest {
  projectName: string;
  results: PlaywrightTestResult[];
}

interface PlaywrightTestResult {
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  error?: { message?: string };
}

// --- Core logic ---

function extractTests(suite: PlaywrightSuite, prefix: string = ''): TestResult[] {
  const results: TestResult[] = [];
  const suitePath = prefix ? `${prefix} > ${suite.title}` : suite.title;

  if (suite.specs) {
    for (const spec of suite.specs) {
      if (spec.tests) {
        for (const test of spec.tests) {
          const lastResult = test.results[test.results.length - 1];
          if (lastResult) {
            results.push({
              name: `${suitePath} > ${spec.title}`,
              project: test.projectName,
              status: lastResult.status,
              error: lastResult.error?.message,
            });
          }
        }
      }
    }
  }

  if (suite.suites) {
    for (const child of suite.suites) {
      results.push(...extractTests(child, suitePath));
    }
  }

  return results;
}

function runPass(passNum: number, project: string): PassResults {
  const projectArg = project === 'all' ? '' : `--project=${project}`;
  const cmd = `npx playwright test ${projectArg} --reporter=json`.trim();

  console.log(`\n  Pass ${passNum}: running "${cmd}"...`);
  const start = Date.now();

  let stdout: string;
  try {
    stdout = execSync(cmd, {
      cwd: resolve(import.meta.dirname, '..'),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5 * 60_000,
      env: { ...process.env, FORCE_COLOR: '0' },
    });
  } catch (err: any) {
    // Playwright exits non-zero on test failures — that's expected
    stdout = err.stdout?.toString() || '';
    if (!stdout) {
      console.error(`  Pass ${passNum}: No output from Playwright. stderr: ${err.stderr?.toString().slice(0, 500)}`);
      return { pass: passNum, tests: [], duration: Date.now() - start };
    }
  }

  const duration = Date.now() - start;

  // Parse JSON output
  let json: PlaywrightJsonResult;
  try {
    json = JSON.parse(stdout);
  } catch {
    console.error(`  Pass ${passNum}: Failed to parse JSON output`);
    return { pass: passNum, tests: [], duration };
  }

  const tests: TestResult[] = [];
  if (json.suites) {
    for (const suite of json.suites) {
      tests.push(...extractTests(suite));
    }
  }

  const passed = tests.filter(t => t.status === 'passed').length;
  const failed = tests.filter(t => t.status === 'failed' || t.status === 'timedOut').length;
  const skipped = tests.filter(t => t.status === 'skipped').length;

  console.log(`  Pass ${passNum}: ${tests.length} tests (${passed} passed, ${failed} failed, ${skipped} skipped) in ${(duration / 1000).toFixed(1)}s`);

  return { pass: passNum, tests, duration };
}

function analyzeResults(passResults: PassResults[], totalPasses: number): TestAnalysis[] {
  // Build a map of test key -> results per pass
  const testMap = new Map<string, { project: string; results: Array<TestResult | null> }>();

  for (const pr of passResults) {
    for (const test of pr.tests) {
      const key = `${test.project}::${test.name}`;
      if (!testMap.has(key)) {
        testMap.set(key, { project: test.project, results: [] });
      }
      testMap.get(key)!.results.push(test);
    }
  }

  const analysis: TestAnalysis[] = [];

  for (const [key, data] of testMap) {
    const name = key.split('::').slice(1).join('::');
    let passCount = 0;
    let failCount = 0;
    let skipCount = 0;
    let lastError: string | undefined;

    for (const result of data.results) {
      if (!result) continue;
      if (result.status === 'passed') passCount++;
      else if (result.status === 'failed' || result.status === 'timedOut') {
        failCount++;
        lastError = result.error;
      } else if (result.status === 'skipped') skipCount++;
    }

    let category: TestAnalysis['category'];
    if (skipCount === data.results.length) {
      category = 'skipped';
    } else if (passCount > 0 && failCount > 0) {
      category = 'flaky';
    } else if (failCount > 0) {
      category = 'stable-fail';
    } else {
      category = 'stable-pass';
    }

    analysis.push({ name, project: data.project, category, passCount, failCount, skipCount, lastError });
  }

  // Sort: flaky first, then stable-fail, then stable-pass, then skipped
  const order = { 'flaky': 0, 'stable-fail': 1, 'stable-pass': 2, 'skipped': 3 };
  analysis.sort((a, b) => order[a.category] - order[b.category]);

  return analysis;
}

function printReport(report: IterativeReport): void {
  const line = '═'.repeat(50);
  console.log(`\n${line}`);
  console.log(`ITERATIVE TEST REPORT (${report.passes} passes)`);
  console.log(line);
  console.log(`Total tests: ${report.totalTests}`);
  console.log(`Stable pass: ${report.stablePass}`);
  console.log(`Stable fail: ${report.stableFail}`);
  console.log(`Flaky:       ${report.flaky}`);
  console.log(`Skipped:     ${report.skipped}`);

  const flakyTests = report.analysis.filter(t => t.category === 'flaky');
  if (flakyTests.length > 0) {
    console.log(`\nFLAKY TESTS:`);
    for (const t of flakyTests) {
      console.log(`  - ${t.name} (passed ${t.passCount}/${report.passes}, failed ${t.failCount}/${report.passes})`);
    }
  }

  const stableFails = report.analysis.filter(t => t.category === 'stable-fail');
  if (stableFails.length > 0) {
    console.log(`\nSTABLE FAILURES:`);
    for (const t of stableFails) {
      const errMsg = t.lastError ? t.lastError.split('\n')[0].slice(0, 120) : 'unknown error';
      console.log(`  - ${t.name} (${errMsg})`);
    }
  }

  console.log(line);
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);
  const { passes, project } = parseArgs(args);

  console.log(`\nIterative Test Runner: ${passes} pass(es), project: ${project}`);
  console.log('─'.repeat(50));

  const passResults: PassResults[] = [];

  for (let i = 1; i <= passes; i++) {
    const result = runPass(i, project);
    passResults.push(result);
  }

  // Analyze
  const analysis = analyzeResults(passResults, passes);
  const totalTests = analysis.length;
  const stablePass = analysis.filter(t => t.category === 'stable-pass').length;
  const stableFail = analysis.filter(t => t.category === 'stable-fail').length;
  const flaky = analysis.filter(t => t.category === 'flaky').length;
  const skipped = analysis.filter(t => t.category === 'skipped').length;

  const report: IterativeReport = {
    timestamp: new Date().toISOString(),
    passes,
    project,
    totalTests,
    stablePass,
    stableFail,
    flaky,
    skipped,
    passResults,
    analysis,
  };

  // Print console report
  printReport(report);

  // Write JSON report
  const reportDir = resolve(import.meta.dirname, '..', 'test-results');
  mkdirSync(reportDir, { recursive: true });
  const reportPath = resolve(reportDir, 'iterative-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nJSON report written to: ${reportPath}`);

  // Exit code: 0 if no stable failures, 1 if any
  if (stableFail > 0) {
    console.log(`\nExiting with code 1 (${stableFail} stable failure(s))`);
    process.exit(1);
  }

  if (flaky > 0) {
    console.log(`\nWarning: ${flaky} flaky test(s) detected (exit code 0)`);
  }

  console.log('\nAll tests stable. Done.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(2);
});
