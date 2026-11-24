const fs = require('fs');
const path = require('path');

const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const BASE_PATH = '/fittrack-70';

if (!fs.existsSync(DIST_DIR)) {
  console.error('dist/ directory not found. Run expo export --platform web first.');
  process.exit(1);
}

// Copy app icon for iOS Home Screen & PWA manifest
const iconSrc = path.resolve(__dirname, '..', 'assets', 'icon.png');
fs.copyFileSync(iconSrc, path.join(DIST_DIR, 'apple-touch-icon.png'));
fs.copyFileSync(iconSrc, path.join(DIST_DIR, 'icon-512.png'));

// Write Web App Manifest
const manifest = {
  name: 'FitTrack 70 — Zero-Starch',
  short_name: 'FitTrack 70',
  description: 'Lộ trình giảm cân 88.0 -> 70.0 kg, Zero-Starch 1.450 kcal & AI Quét Calo',
  start_url: `${BASE_PATH}/`,
  scope: `${BASE_PATH}/`,
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#090B0E',
  theme_color: '#090B0E',
  icons: [
    {
      src: `${BASE_PATH}/icon-512.png`,
      sizes: '1024x1024',
      type: 'image/png',
      purpose: 'any maskable',
    },
  ],
};
fs.writeFileSync(path.join(DIST_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Write lightweight offline-friendly Service Worker
const sw = `
const CACHE_NAME = 'fittrack70-v1';
self.addEventListener('install', (event) => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
`.trim();
fs.writeFileSync(path.join(DIST_DIR, 'sw.js'), sw);

// Add .nojekyll so GitHub Pages serves _expo/ directory cleanly
fs.writeFileSync(path.join(DIST_DIR, '.nojekyll'), '');

// Enhance dist/index.html with iOS Safari PWA tags & safe-area styling
const indexPath = path.join(DIST_DIR, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const pwaHead = `
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black" />
    <meta name="apple-mobile-web-app-title" content="FitTrack 70" />
    <meta name="theme-color" content="#090B0E" />
    <link rel="apple-touch-icon" href="${BASE_PATH}/apple-touch-icon.png" />
    <link rel="manifest" href="${BASE_PATH}/manifest.json" />
    <style>
      *, *::before, *::after {
        box-sizing: border-box;
      }
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        height: 100dvh;
        overflow: hidden;
        background-color: #090B0E;
        overscroll-behavior: none;
        -webkit-tap-highlight-color: transparent;
      }
      #root {
        width: 100%;
        height: 100%;
        height: 100dvh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background-color: #090B0E;
      }
    </style>
`;

html = html.replace(
  /<meta name="viewport"[^>]*>/i,
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />'
);

if (!html.includes('apple-mobile-web-app-capable')) {
  html = html.replace('</head>', `${pwaHead}\n  </head>`);
}

const swRegister = `
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('${BASE_PATH}/sw.js').catch(function () {});
        });
      }
    </script>
`;
if (!html.includes('serviceWorker.register')) {
  html = html.replace('</body>', `${swRegister}\n  </body>`);
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Injected iOS PWA manifest, apple-touch-icon, safe-area styles, and .nojekyll into dist/');
