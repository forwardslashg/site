/* ---------------------------------------------------------------
   Anti-Canada service worker
   - Activated by geo-block.js when the visitor's IP is in Canada
   - Intercepts every request from this origin and returns the
     block payload instead of the real network response
   - The page itself is also served from this SW so the block
     message replaces the rendered site
--------------------------------------------------------------- */

const BLOCK_FLAG = new URL(self.location.href).searchParams.get('block') === '1';

self.addEventListener('install', (event) => {
	if (BLOCK_FLAG) {
		// Become active immediately so the first page load is intercepted
		event.waitUntil(self.skipWaiting());
	} else {
		// Unregister if someone hits sw.js without the flag
		event.waitUntil(self.registration.unregister());
	}
});

self.addEventListener('activate', (event) => {
	if (BLOCK_FLAG) {
		event.waitUntil(self.clients.claim());
	}
});

const BLOCK_HTML = `<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>access denied | slash.gay</title>
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="robots" content="noindex">
	<style>
		:root { color-scheme: light dark; }
		html, body { margin: 0; height: 100%; }
		body {
			font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
			background: #130d1b;
			color: #e6dff0;
			display: grid;
			place-items: center;
			padding: 1.5rem;
		}
		.card {
			max-width: 30rem;
			text-align: center;
			background: rgba(255,255,255,0.04);
			border: 1px solid rgba(183,148,246,0.25);
			border-radius: 20px;
			padding: 2rem 1.5rem;
			box-shadow: 0 8px 30px rgba(80,50,130,0.25);
		}
		h1 { margin: 0 0 0.5rem; font-size: 1.6rem; color: #b794f6; }
		p { margin: 0 0 0.8rem; line-height: 1.5; }
		small { color: #b3a7c4; }
	</style>
</head>
<body>
	<main class="card">
		<h1>🍁 nice try, eh?</h1>
		<p>This site is not available in Canada.</p>
		<p><small>If this is wrong, your IP is misclassified. Try a VPN to access the site.</small></p>
	</main>
</body>
</html>`;

function blockResponse(request) {
	const url = new URL(request.url);
	// For navigations, return full HTML
	if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
		return new Response(BLOCK_HTML, {
			status: 451,
			headers: {
				'Content-Type': 'text/html; charset=utf-8',
				'Cache-Control': 'no-store'
			}
		});
	}
	// For everything else (CSS/JS/images/fetch) return an empty 403
	return new Response('', {
		status: 403,
		statusText: 'Unavailable in Canada',
		headers: { 'Cache-Control': 'no-store' }
	});
}

self.addEventListener('fetch', (event) => {
	if (!BLOCK_FLAG) return;
	const url = new URL(event.request.url);
	// Only intercept same-origin requests
	if (url.origin !== self.location.origin) return;
	event.respondWith(blockResponse(event.request));
});
