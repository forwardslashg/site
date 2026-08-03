/* ---------------------------------------------------------------
   Anti-Canada protection
   - Checks if visitor is in Canada via ipwho.is
   - Persists the block flag in localStorage, IndexedDB, and cookies
   - Registers a service worker that blocks all network access
     from this site when the flag is set
   - Re-checks IP on every visit; if a previously-blocked user
     has moved out of CA, the flag is cleared and the SW unregisters
--------------------------------------------------------------- */

(() => {
	const STORAGE_KEY = 'geo-block-ca';
	const COOKIE_NAME = 'geo_block_ca';
	const SW_URL = 'sw.js';
	const GEO_URL = 'https://ipwho.is/';
	const GEO_TIMEOUT_MS = 4000;
	const MAX_AGE_DAYS = 365;

	// ---------------------------------------------------------------
	// Storage helpers
	// ---------------------------------------------------------------
	function setLocalStorage(blocked) {
		try {
			localStorage.setItem(STORAGE_KEY, blocked ? '1' : '0');
		} catch { /* storage full/blocked */ }
	}

	function getLocalStorage() {
		try {
			const v = localStorage.getItem(STORAGE_KEY);
			return v === '1' ? true : v === '0' ? false : null;
		} catch {
			return null;
		}
	}

	function setCookie(blocked) {
		const value = blocked ? '1' : '0';
		const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
		const secure = location.protocol === 'https:' ? '; Secure' : '';
		document.cookie = `${COOKIE_NAME}=${value}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
	}

	function getCookie() {
		return document.cookie.split('; ').some((c) => c === `${COOKIE_NAME}=1`);
	}

	function openIDB() {
		return new Promise((resolve, reject) => {
			const req = indexedDB.open('slash-gay-geo', 1);
			req.onupgradeneeded = () => {
				req.result.createObjectStore('flags');
			};
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
	}

	async function setIDB(blocked) {
		try {
			const db = await openIDB();
			await new Promise((resolve, reject) => {
				const tx = db.transaction('flags', 'readwrite');
				tx.objectStore('flags').put(blocked ? 1 : 0, 'blocked');
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
			});
			db.close();
		} catch { /* IDB unavailable */ }
	}

	async function getIDB() {
		try {
			const db = await openIDB();
			const v = await new Promise((resolve, reject) => {
				const tx = db.transaction('flags', 'readonly');
				const req = tx.objectStore('flags').get('blocked');
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});
			db.close();
			return v === 1 ? true : v === 0 ? false : null;
		} catch {
			return null;
		}
	}

	function persistAll(blocked) {
		setLocalStorage(blocked);
		setCookie(blocked);
		setIDB(blocked);
	}

	// ---------------------------------------------------------------
	// Service worker registration
	// ---------------------------------------------------------------
	async function registerBlockingSW() {
		if (!('serviceWorker' in navigator)) return;
		try {
			await navigator.serviceWorker.register(SW_URL + '?block=1', { scope: '/' });
		} catch (err) {
			console.warn('SW registration failed:', err);
		}
	}

	async function unregisterBlockingSW() {
		if (!('serviceWorker' in navigator)) return;
		try {
			const regs = await navigator.serviceWorker.getRegistrations();
			await Promise.all(regs.map((r) => r.unregister()));
			// Also clear caches this SW may have created
			if (window.caches && caches.keys) {
				const keys = await caches.keys();
				await Promise.all(keys.map((k) => caches.delete(k)));
			}
		} catch (err) {
			console.warn('SW unregister failed:', err);
		}
	}

	// ---------------------------------------------------------------
	// IP geolocation
	// ---------------------------------------------------------------
	async function fetchCountry() {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);
		try {
			const res = await fetch(GEO_URL, { signal: controller.signal, cache: 'no-store' });
			if (!res.ok) return null;
			const data = await res.json();
			return (data && typeof data.country_code === 'string') ? data.country_code.toUpperCase() : null;
		} catch {
			return null;
		} finally {
			clearTimeout(timer);
		}
	}

	// ---------------------------------------------------------------
	// Overlay UI
	// ---------------------------------------------------------------
	function showBlockOverlay() {
		const overlay = document.getElementById('geo-block-overlay');
		if (overlay) {
			overlay.removeAttribute('hidden');
		}
		// Hide the main site content visually
		const site = document.querySelector('.site');
		const footer = document.querySelector('.site-footer');
		if (site) site.setAttribute('hidden', '');
		if (footer) footer.setAttribute('hidden', '');
		document.title = 'access denied | slash.gay';
	}

	// ---------------------------------------------------------------
	// Flow
	// ---------------------------------------------------------------
	async function checkAndApply() {
		// Read any previously persisted state (any of the 3 sources counts)
		const [prevLS, prevCookie, prevIDB] = await Promise.all([
			Promise.resolve(getLocalStorage()),
			Promise.resolve(getCookie()),
			getIDB()
		]);
		const wasBlocked = [prevLS, prevCookie, prevIDB].some((v) => v === true);

		// Always re-check the current IP
		const country = await fetchCountry();

		if (country === 'CA') {
			persistAll(true);
			await registerBlockingSW();
			showBlockOverlay();
			return;
		}

		// Not in Canada right now. If we previously blocked, clear everything
		// so a future IP change back into CA re-triggers the flow correctly.
		if (wasBlocked) {
			persistAll(false);
			await unregisterBlockingSW();
		} else {
			// First visit and not in CA — record "0" so we know we have a recent check
			setLocalStorage(false);
			setCookie(false);
			setIDB(false);
		}
	}

	// Start the check on load. We use queueMicrotask so the overlay (if
	// the HTML already injected one) is ready when we show it.
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => queueMicrotask(checkAndApply));
	} else {
		queueMicrotask(checkAndApply);
	}
})();
