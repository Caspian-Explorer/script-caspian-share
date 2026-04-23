#!/usr/bin/env node
/**
 * create-caspian-share — entry point for `npm create caspian-share@latest`.
 *
 * Works by cloning Caspian-Explorer/script-caspian-share from GitHub into a
 * temporary directory (shallow, main branch), invoking the cloned
 * scaffold/cli.mjs with `init <dir>` against the user's target directory,
 * then removing the clone. All extra user flags are forwarded through to the
 * scaffolder unchanged.
 *
 * We clone rather than depend on the main package because the scaffolder
 * reads the real firestore rules / Cloud Function source / OG handler
 * templates from the package's own firebase/ tree at scaffold time — those
 * files need to exist on disk next to the scaffolder when it runs.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const userArgs = process.argv.slice(2);
if (userArgs.length === 0 || userArgs[0].startsWith('-')) {
  console.error(
    'Usage: npm create caspian-share@latest <project-dir> [--minimal] [--hosting=<vercel|firebase|both>] [--yes]',
  );
  console.error('');
  console.error('See https://github.com/Caspian-Explorer/script-caspian-share for more.');
  process.exit(1);
}

// The scaffolder resolves the target dir relative to *its own* cwd, which
// will be the temp clone — that's wrong. Resolve it here against the user's
// original cwd and forward the absolute path.
const targetAbs = resolve(process.cwd(), userArgs[0]);
const forwardedArgs = ['init', targetAbs, ...userArgs.slice(1)];

const tempDir = mkdtempSync(join(tmpdir(), 'create-caspian-share-'));

let exitCode = 1;
try {
  const clone = spawnSync(
    'git',
    [
      'clone',
      '--depth',
      '1',
      'https://github.com/Caspian-Explorer/script-caspian-share.git',
      tempDir,
    ],
    { stdio: 'inherit' },
  );
  if (clone.status !== 0) {
    console.error('[create-caspian-share] git clone failed.');
    exitCode = clone.status ?? 1;
  } else {
    const scaffold = spawnSync(
      process.execPath,
      [join(tempDir, 'scaffold', 'cli.mjs'), ...forwardedArgs],
      { stdio: 'inherit' },
    );
    exitCode = scaffold.status ?? 1;
  }
} finally {
  if (existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

process.exit(exitCode);
