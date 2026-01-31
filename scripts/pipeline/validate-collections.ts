/**
 * Collection Routing Validation Script (Phase 12, Task 3)
 *
 * Tests all collection resolution paths without creating real WIX products.
 * Run: npx tsx scripts/pipeline/validate-collections.ts
 */

import 'dotenv/config';
import { listCollections, getCollectionByName } from './wix-api.js';

async function validate(): Promise<void> {
  let passed = 0;
  let failed = 0;

  function pass(test: string): void {
    console.log(`  PASS: ${test}`);
    passed++;
  }

  function fail(test: string, reason: string): void {
    console.error(`  FAIL: ${test} -- ${reason}`);
    failed++;
  }

  console.log('\n=== Collection Routing Validation ===\n');

  // Test 1: listCollections returns collections from live API
  console.log('Test 1: listCollections() returns collections');
  try {
    const collections = await listCollections();
    if (collections.length > 0) {
      pass(`listCollections returned ${collections.length} collections`);
    } else {
      fail('listCollections', 'returned 0 collections');
    }

    // Verify each collection has id and name
    const allHaveIdAndName = collections.every((c) => c.id && c.name);
    if (allHaveIdAndName) {
      pass('all collections have id and name fields');
    } else {
      fail('collection fields', 'some collections missing id or name');
    }
  } catch (err) {
    fail('listCollections', err instanceof Error ? err.message : String(err));
  }

  // Test 2: getCollectionByName exact match
  console.log('\nTest 2: getCollectionByName() exact match');
  try {
    const collection = await getCollectionByName('Big Barn Crossfit');
    if (collection.id && collection.name === 'Big Barn Crossfit') {
      pass(`resolved "Big Barn Crossfit" -> ${collection.id}`);
    } else {
      fail('exact match', `unexpected result: ${JSON.stringify(collection)}`);
    }
  } catch (err) {
    fail('exact match', err instanceof Error ? err.message : String(err));
  }

  // Test 3: getCollectionByName case-insensitive match
  console.log('\nTest 3: getCollectionByName() case-insensitive match');
  try {
    const collection = await getCollectionByName('big barn crossfit');
    if (collection.id && collection.name === 'Big Barn Crossfit') {
      pass(`resolved "big barn crossfit" (lowercase) -> ${collection.id}`);
    } else {
      fail('case-insensitive', `unexpected result: ${JSON.stringify(collection)}`);
    }
  } catch (err) {
    fail('case-insensitive', err instanceof Error ? err.message : String(err));
  }

  // Test 4: getCollectionByName invalid name throws
  console.log('\nTest 4: getCollectionByName() invalid name throws descriptive error');
  try {
    await getCollectionByName('nonexistent-collection-xyz');
    fail('invalid name', 'did not throw');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('not found') && msg.includes('Available collections')) {
      pass('invalid name throws descriptive error with available collections list');
    } else {
      fail('invalid name', `unexpected error message: ${msg}`);
    }
  }

  // Test 5: Verify data/collections.json exists and is valid
  console.log('\nTest 5: data/collections.json exists and is valid');
  try {
    const { readFileSync } = await import('fs');
    const { resolve, dirname } = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const jsonPath = resolve(dirname(__filename), '../../data/collections.json');
    const raw = readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(raw);
    if (data.collections && Array.isArray(data.collections) && data.collections.length > 0) {
      pass(`data/collections.json has ${data.collections.length} collections`);
    } else {
      fail('collections.json', 'missing or empty collections array');
    }
    if (data.lastUpdated) {
      pass(`lastUpdated: ${data.lastUpdated}`);
    } else {
      fail('collections.json', 'missing lastUpdated field');
    }
  } catch (err) {
    fail('collections.json', err instanceof Error ? err.message : String(err));
  }

  // Summary
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

validate();
