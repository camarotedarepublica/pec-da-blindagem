// Service Worker para proxy de imagens
const CACHE_NAME = 'images-proxy-v1';
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

self.addEventListener('install', event => {
    console.log('Service Worker instalado');
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('Service Worker ativado');
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    if (url.hostname === 'camara.leg.br' && url.pathname.includes('/deputado/bandep/')) {
        event.respondWith(handleImageRequest(event.request));
    }
});

async function handleImageRequest(request) {
    const cacheKey = request.url;
    
    try {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(cacheKey);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        try {
            const response = await fetch(request, {
                mode: 'cors',
                credentials: 'omit'
            });
            
            if (response.ok) {
                await cache.put(cacheKey, response.clone());
                return response;
            }
        } catch (error) {
            console.log('Requisição direta falhou, tentando proxy:', error);
        }
        
        const proxyUrl = CORS_PROXY + encodeURIComponent(request.url);
        const proxyResponse = await fetch(proxyUrl);
        
        if (proxyResponse.ok) {
            const responseHeaders = new Headers({
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'public, max-age=86400'
            });
            
            const newResponse = new Response(proxyResponse.body, {
                status: proxyResponse.status,
                statusText: proxyResponse.statusText,
                headers: responseHeaders
            });
            
            await cache.put(cacheKey, newResponse.clone());
            return newResponse;
        }
        
        return createPlaceholderResponse();
        
    } catch (error) {
        console.error('Erro ao carregar imagem:', error);
        return createPlaceholderResponse();
    }
}

function createPlaceholderResponse() {
    const placeholderSvg = `
        <svg width="150" height="200" xmlns="http://www.w3.org/2000/svg">
            <rect width="150" height="200" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2"/>
            <circle cx="75" cy="70" r="25" fill="#6c757d"/>
            <rect x="50" y="110" width="50" height="70" rx="25" fill="#6c757d"/>
            <text x="75" y="190" text-anchor="middle" font-family="Arial" font-size="12" fill="#6c757d">Sem foto</text>
        </svg>
    `;
    
    return new Response(placeholderSvg, {
        headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'public, max-age=3600'
        }
    });
}