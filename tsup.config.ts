import { defineConfig, type Options } from 'tsup';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const rootPkgVersion = JSON.parse(readFileSync('package.json', 'utf8')).version as string;
const versionFile = join('src', 'version.ts');
const versionContents =
  `// Auto-generated from package.json by tsup.config.ts. Do not edit.\n` +
  `export const CASPIAN_SHARE_VERSION = '${rootPkgVersion}';\n`;
const existing = existsSync(versionFile) ? readFileSync(versionFile, 'utf8') : '';
if (existing !== versionContents) writeFileSync(versionFile, versionContents);

const shared = {
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: false,
  splitting: false,
  treeshake: true,
  target: 'es2020',
  external: [
    'react',
    'react-dom',
    'firebase',
    'firebase/app',
    'firebase/auth',
    'firebase/firestore',
    'firebase/functions',
    '@vercel/og',
    'qrcode',
    'undici',
    'node:dns/promises',
    'node:dns',
  ],
} satisfies Partial<Options>;

function prependUseClient(file: string) {
  if (!existsSync(file)) return;
  const contents = readFileSync(file, 'utf8');
  if (!contents.startsWith("'use client'") && !contents.startsWith('"use client"')) {
    writeFileSync(file, `'use client';\n${contents}`);
  }
}

export default defineConfig([
  {
    ...shared,
    entry: { index: 'src/index.ts' },
    clean: true,
    async onSuccess() {
      prependUseClient(join('dist', 'index.mjs'));
      prependUseClient(join('dist', 'index.js'));
    },
  },
  {
    ...shared,
    entry: { 'server/index': 'src/server/index.ts' },
  },
  {
    ...shared,
    entry: { 'firebase/index': 'src/firebase/index.ts' },
  },
  {
    ...shared,
    entry: { 'og/index': 'src/og/index.ts' },
  },
]);
