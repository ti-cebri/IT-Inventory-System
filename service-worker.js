const CACHE_NAME = 'cebri-ti-v1';
const assets = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './favicon2.png'
];

// Instala o Service Worker e armazena os arquivos estruturais em cache
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

// Ativa o Service Worker e limpa caches antigos se houver mudança de versão
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// Estratégia de rede: Tenta buscar na internet, se falhar (offline), busca no cache estrutural
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});