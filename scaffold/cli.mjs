#!/usr/bin/env node
/**
 * Caspian Share scaffolder. Generates a Next.js 14 App Router boilerplate
 * wired to <CaspianShareProvider>, optionally with Firebase Hosting or Vercel
 * deploy targets.
 *
 * Usage:
 *   npx @caspian-explorer/script-caspian-share init my-app
 *   npx @caspian-explorer/script-caspian-share init my-app --minimal
 *   npx @caspian-explorer/script-caspian-share init my-app --hosting=vercel
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, 'templates');

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  printUsage();
  process.exit(0);
}

if (command === 'init') {
  await runInit(args.slice(1));
} else {
  console.error(`Unknown command: ${command}`);
  printUsage();
  process.exit(1);
}

function printUsage() {
  console.log(`
Caspian Share scaffolder

Commands:
  init [name]              Scaffold a new Next.js project wired to CaspianShareProvider

Options for init:
  --minimal                Stateless setup (no Firebase, no OG handler)
  --hosting=<vercel|firebase|both>  Default: both
  --yes, -y                Skip prompts, accept defaults
`);
}

async function runInit(initArgs) {
  const flags = parseFlags(initArgs);
  const positional = initArgs.filter((a) => !a.startsWith('-'));

  let projectName = positional[0];
  let hosting = flags.hosting ?? 'both';
  const minimal = Boolean(flags.minimal);
  const yes = Boolean(flags.yes || flags.y);

  const rl = createInterface({ input, output });
  try {
    if (!projectName && !yes) {
      projectName = await rl.question('Project directory name: ');
    }
    projectName = (projectName || 'my-share-app').trim();

    if (!flags.hosting && !yes) {
      const answer = (
        await rl.question('Hosting target (vercel | firebase | both) [both]: ')
      ).trim();
      if (answer) hosting = answer;
    }
    if (!['vercel', 'firebase', 'both'].includes(hosting)) {
      console.error(`Invalid hosting target: ${hosting}`);
      process.exit(1);
    }

    let brandColor = '#7c3aed';
    if (!yes) {
      const c = (await rl.question(`Brand primary color [${brandColor}]: `)).trim();
      if (c) brandColor = c;
    }

    let locale = 'en';
    if (!yes) {
      const l = (await rl.question(`Default locale (BCP-47) [${locale}]: `)).trim();
      if (l) locale = l;
    }

    const projectDir = resolve(process.cwd(), projectName);
    if (existsSync(projectDir)) {
      console.error(`Directory ${projectDir} already exists. Aborting.`);
      process.exit(1);
    }

    console.log(`\nScaffolding ${projectName} (${hosting}, ${minimal ? 'minimal' : 'full'})…`);

    const ctx = { projectName, projectDir, hosting, minimal, brandColor, locale };
    writeProject(ctx);

    console.log(`\n✓ Created ${projectName}/`);
    console.log(`\nNext steps:`);
    console.log(`  cd ${projectName}`);
    console.log(`  npm install`);
    console.log(`  npm run dev`);
    if (hosting !== 'vercel' && !minimal) {
      console.log(`\nFor Firebase Hosting:`);
      console.log(`  firebase init hosting`);
      console.log(`  firebase deploy --only hosting`);
    }
    if (hosting !== 'firebase') {
      console.log(`\nFor Vercel:`);
      console.log(`  vercel deploy`);
    }
  } finally {
    rl.close();
  }
}

function parseFlags(args) {
  const flags = {};
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [k, v] = arg.slice(2).split('=');
      flags[k] = v ?? true;
    } else if (arg.startsWith('-')) {
      flags[arg.slice(1)] = true;
    }
  }
  return flags;
}

function writeProject({ projectName, projectDir, hosting, minimal, brandColor, locale }) {
  // Determine template files to write
  const files = templateFiles({ projectName, hosting, minimal, brandColor, locale });
  for (const [relativePath, contents] of Object.entries(files)) {
    const absPath = join(projectDir, relativePath);
    mkdirSync(dirname(absPath), { recursive: true });
    writeFileSync(absPath, contents);
  }
}

function templateFiles({ projectName, hosting, minimal, brandColor, locale }) {
  const useFirebase = hosting !== 'vercel' && !minimal;
  const useVercelOg = hosting !== 'firebase' && !minimal;

  const dependencies = {
    '@caspian-explorer/script-caspian-share': '^0.2.0',
    next: '^14.2.0',
    react: '^18.3.1',
    'react-dom': '^18.3.1',
  };
  if (useFirebase) dependencies.firebase = '^11.0.0';
  if (useVercelOg) dependencies['@vercel/og'] = '^0.6.0';

  const files = {};

  files['package.json'] = JSON.stringify(
    {
      name: projectName,
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
      },
      dependencies,
      devDependencies: {
        '@types/node': '^20.0.0',
        '@types/react': '^18.3.12',
        '@types/react-dom': '^18.3.1',
        typescript: '^5.6.3',
      },
    },
    null,
    2,
  ) + '\n';

  files['tsconfig.json'] = JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2020',
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'preserve',
        incremental: true,
        plugins: [{ name: 'next' }],
        paths: { '@/*': ['./*'] },
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules'],
    },
    null,
    2,
  ) + '\n';

  files['next.config.mjs'] = `/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
`;

  files['next-env.d.ts'] = `/// <reference types="next" />
/// <reference types="next/image-types/global" />
`;

  files['.gitignore'] = `node_modules
.next
.env*.local
.DS_Store
*.log
`;

  files['app/layout.tsx'] = `import type { Metadata } from 'next';
import { ShareAdapter } from './_components/share-adapter';
import '@caspian-explorer/script-caspian-share/styles.css';

export const metadata: Metadata = {
  title: '${projectName}',
  description: 'A Next.js app powered by Caspian Share',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="${locale}">
      <body>
        <ShareAdapter>{children}</ShareAdapter>
      </body>
    </html>
  );
}
`;

  files['app/_components/share-adapter.tsx'] = `'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { CaspianShareProvider, THEME_PRESETS } from '@caspian-explorer/script-caspian-share';

${useFirebase ? `const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
` : ''}
export function ShareAdapter({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <CaspianShareProvider
      locale="${locale}"
      utm={{ campaign: '${projectName}-share' }}
      theme={{ ...THEME_PRESETS.light, primary: '${brandColor}' }}${useFirebase ? `
      firebaseConfig={firebaseConfig.projectId ? firebaseConfig : undefined}` : ''}
      adapters={{
        Link: ({ href, children, ...rest }) => <Link href={href} {...rest}>{children}</Link>,
        Image: (props) => <Image {...(props as any)} />,
        useNavigation: () => ({
          pathname,
          push: (href: string) => router.push(href),
          replace: (href: string) => router.replace(href),
          back: () => router.back(),
        }),
      }}
    >
      {children}
    </CaspianShareProvider>
  );
}
`;

  files['app/page.tsx'] = `import { ShareBar, ShareMenu } from '@caspian-explorer/script-caspian-share';

export default function HomePage() {
  return (
    <main style={{ maxWidth: 720, margin: '64px auto', padding: 24, fontFamily: 'system-ui' }}>
      <h1>Welcome to ${projectName}</h1>
      <p>This page is wired to <code>@caspian-explorer/script-caspian-share</code>.</p>

      <h2 style={{ marginTop: 32 }}>Inline share bar</h2>
      <ShareBar
        title="${projectName} — home"
        platforms={['twitter', 'linkedin', 'whatsapp', 'reddit', 'email']}
        includeNative
      />

      <h2 style={{ marginTop: 32 }}>Share menu (native + dropdown)</h2>
      <ShareMenu title="${projectName} — home" showLabel />
    </main>
  );
}
`;

  if (useVercelOg) {
    files['app/api/og/route.tsx'] = `import { createOgHandler } from '@caspian-explorer/script-caspian-share/og';

export const runtime = 'edge';

export const GET = createOgHandler({
  defaultTitle: '${projectName}',
  defaultBrand: '${projectName}',
  defaultAccent: '${brandColor}',
});
`;
  }

  if (useFirebase && hosting !== 'firebase') {
    // Vercel-friendly Next.js short-link route. Runs on Node (not Edge) because
    // the Firebase web SDK pulls in WebSocket polyfills that don't work on Edge.
    files['app/s/[slug]/route.ts'] = `import { createShortLinkResolverHandler } from '@caspian-explorer/script-caspian-share/firebase';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

export const runtime = 'nodejs';

export const GET = createShortLinkResolverHandler({ config: firebaseConfig });
`;
  }

  if (useFirebase) {
    files['firebase.json'] = JSON.stringify(
      {
        firestore: {
          rules: 'firestore.rules',
          indexes: 'firestore.indexes.json',
        },
        functions: [{ source: 'functions', codebase: 'default' }],
        hosting: {
          public: 'out',
          ignore: ['firebase.json', '**/.*', '**/node_modules/**'],
          rewrites: [
            // Short links: /s/<slug> → caspianShareResolveShortLink Cloud Function.
            { source: '/s/**', function: 'caspianShareResolveShortLink' },
            { source: '**', destination: '/index.html' },
          ],
        },
      },
      null,
      2,
    ) + '\n';
    files['.firebaserc.example'] = JSON.stringify({ projects: { default: 'YOUR_FIREBASE_PROJECT_ID' } }, null, 2) + '\n';
    files['.env.local.example'] = `# Firebase web config — replace with your project values
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
`;
    files['firestore.rules'] = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // === Caspian Share v0.4 ===
    match /shareCounts/{urlHash} {
      allow read: if true;
      allow write: if false;
      match /shards/{shardId} {
        allow read: if true;
        allow write: if false;
      }
    }
    // === end Caspian Share ===

  }
}
`;
    files['firestore.indexes.json'] = JSON.stringify({ indexes: [], fieldOverrides: [] }, null, 2) + '\n';
    files['functions/package.json'] = JSON.stringify({
      name: `${projectName}-functions`,
      private: true,
      version: '0.1.0',
      main: 'lib/index.js',
      type: 'module',
      scripts: {
        build: 'tsc',
        deploy: 'firebase deploy --only functions',
      },
      engines: { node: '20' },
      dependencies: {
        'firebase-admin': '^12.0.0',
        'firebase-functions': '^6.0.0',
      },
      devDependencies: { typescript: '^5.6.3' },
    }, null, 2) + '\n';
    files['functions/tsconfig.json'] = JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        outDir: 'lib',
        rootDir: 'src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
      },
      include: ['src'],
    }, null, 2) + '\n';
    // Re-export the same Cloud Function logic used in the @caspian-explorer/script-caspian-share repo.
    files['functions/src/index.ts'] = `// Caspian Share v0.4 Cloud Function — see source at:
// https://github.com/Caspian-Explorer/script-caspian-share/blob/main/firebase/functions/src/index.ts
//
// Replace this stub by copying that file into this location.
export const placeholder = true;
`;
  }

  if (hosting !== 'firebase') {
    files['vercel.json'] = JSON.stringify({ framework: 'nextjs' }, null, 2) + '\n';
  }

  files['README.md'] = `# ${projectName}

Generated by \`@caspian-explorer/script-caspian-share\`.

## Develop

\`\`\`bash
npm install
npm run dev
\`\`\`

Open http://localhost:3000.

## Deploy

${hosting === 'vercel' ? '- **Vercel:** `vercel deploy`' : ''}
${hosting === 'firebase' ? '- **Firebase Hosting:** `firebase init hosting && firebase deploy`' : ''}
${hosting === 'both' ? '- **Vercel:** `vercel deploy`\n- **Firebase Hosting:** `firebase init hosting && firebase deploy`' : ''}

## Customize the share UI

Edit \`app/_components/share-adapter.tsx\` to change theme tokens, locale, or platforms.
See [@caspian-explorer/script-caspian-share](https://github.com/Caspian-Explorer/script-caspian-share) docs.
`;

  // Reference templates dir to avoid lint warning about unused param.
  void TEMPLATES_DIR;
  return files;
}
