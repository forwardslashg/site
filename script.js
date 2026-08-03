/* ---------------------------------------------------------------
   Random profile quote
--------------------------------------------------------------- */
const profileQuotes = [
	'But nobody came.',
	'i use arch btw',
	'watamote is ass',
	'he has a hairy shaft',
	'1000% opsec',
	'When Diddy\'s become bluds, they turn into mud.',
	'please watch Bocchi The Rock!',
	'god bless TorBox',
	'ftg smp when?',
	'ily millx',
	'I suppose.',
	'i larp Re:ZERO',
	'Rasenjou ni ochite yuku matenrou ni',
	'You only have one shot.',
	'hi',
	'nah bro is using const 💀'
];

(function initQuote() {
	const quoteElement = document.querySelector('#name-quote .quote-text');
	if (!quoteElement) return;
	const randomIndex = Math.floor(Math.random() * profileQuotes.length);
	quoteElement.textContent = profileQuotes[randomIndex];
})();

/* ---------------------------------------------------------------
   Theme toggle (System <-> pinned opposite, persisted)
--------------------------------------------------------------- */
const SCHEME_KEY = 'color-scheme';
const metaScheme = document.querySelector('meta[name="color-scheme"]');
const themeToggle = document.getElementById('theme-toggle');
const darkMedia = window.matchMedia('(prefers-color-scheme: dark)');

function systemIsDark() {
	return darkMedia.matches;
}

function applyScheme(pinned) {
	// pinned: 'light' | 'dark' | null (system)
	document.documentElement.classList.toggle('theme-light', pinned === 'light');
	document.documentElement.classList.toggle('theme-dark', pinned === 'dark');
	if (metaScheme) metaScheme.content = pinned || 'light dark';

	if (themeToggle) {
		const icon = themeToggle.querySelector('.toggle-icon');
		const text = themeToggle.querySelector('.toggle-text');
		const resolvedDark = pinned ? pinned === 'dark' : systemIsDark();
		themeToggle.setAttribute('aria-pressed', pinned ? 'true' : 'false');
		if (icon) {
			icon.classList.toggle('bi-moon-stars-fill', resolvedDark);
			icon.classList.toggle('bi-sun-fill', !resolvedDark);
		}
		if (text) {
			text.textContent = pinned ? (pinned === 'dark' ? 'Dark' : 'Light') : 'System';
		}
	}
}

function currentPinned() {
	const v = localStorage.getItem(SCHEME_KEY);
	return v === 'light' || v === 'dark' ? v : null;
}

if (themeToggle) {
	themeToggle.addEventListener('click', () => {
		const pinned = currentPinned();
		if (pinned === null) {
			// system -> pin the opposite of current system setting
			const next = systemIsDark() ? 'light' : 'dark';
			localStorage.setItem(SCHEME_KEY, next);
			applyScheme(next);
		} else {
			// pinned -> back to system
			localStorage.removeItem(SCHEME_KEY);
			applyScheme(null);
		}
	});
}

darkMedia.addEventListener('change', () => {
	// keep icon/label honest when on system mode
	if (currentPinned() === null) applyScheme(null);
});

applyScheme(currentPinned());

/* ---------------------------------------------------------------
   Projects — live GitHub fetch with cache + static fallback
--------------------------------------------------------------- */
const GITHUB_USER = 'forwardslashg';
const CACHE_KEY = 'gh-repos-cache-v1';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_PROJECTS = 6;

function readCache() {
	try {
		const raw = localStorage.getItem(CACHE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!parsed || !Array.isArray(parsed.repos) || typeof parsed.time !== 'number') return null;
		if (Date.now() - parsed.time > CACHE_TTL_MS) return null;
		return parsed.repos;
	} catch {
		return null;
	}
}

function writeCache(repos) {
	try {
		localStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), repos }));
	} catch {
		/* storage full/blocked — ignore */
	}
}

function readCacheIgnoringAge() {
	try {
		const raw = localStorage.getItem(CACHE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		return parsed && Array.isArray(parsed.repos) ? parsed.repos : null;
	} catch {
		return null;
	}
}

function escapeHTML(str) {
	return String(str)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function renderProjects(projects) {
	const grid = document.getElementById('projects-grid');
	if (!grid) return;

	grid.textContent = '';
	for (const p of projects) {
		const card = document.createElement('a');
		card.className = 'project-card';
		card.href = p.url;
		card.target = '_blank';
		card.rel = 'noreferrer';

		const owner = document.createElement('span');
		owner.className = 'project-owner';
		owner.textContent = p.owner;

		const title = document.createElement('span');
		title.className = 'project-title';
		title.textContent = p.name;

		const desc = document.createElement('span');
		desc.className = 'project-desc';
		desc.textContent = p.description || 'No description provided.';

		const meta = document.createElement('span');
		meta.className = 'project-meta';

		if (typeof p.stars === 'number') {
			const stars = document.createElement('span');
			stars.className = 'project-stars';
			stars.innerHTML = '<i class="bi bi-star-fill" aria-hidden="true"></i>' +
				'<span>' + escapeHTML(p.stars) + '</span>';
			meta.appendChild(stars);
		}

		if (p.language) {
			const lang = document.createElement('span');
			lang.className = 'project-lang';
			lang.textContent = p.language;
			meta.appendChild(lang);
		}

		card.appendChild(owner);
		card.appendChild(title);
		card.appendChild(desc);
		card.appendChild(meta);
		grid.appendChild(card);
	}
}

function normalizeRepos(repos) {
	return repos
		.filter((r) => r && !r.fork && !r.private)
		.sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
		.slice(0, MAX_PROJECTS)
		.map((r) => ({
			owner: r.owner && r.owner.login ? r.owner.login : GITHUB_USER,
			name: r.name,
			description: r.description,
			stars: typeof r.stargazers_count === 'number' ? r.stargazers_count : 0,
			language: r.language,
			url: r.html_url
		}));
}

function renderProjectsError(message) {
	const grid = document.getElementById('projects-grid');
	if (!grid) return;
	grid.textContent = '';
	const p = document.createElement('p');
	p.className = 'projects-error';
	p.textContent = message;
	grid.appendChild(p);
}

async function loadProjects() {
	const grid = document.getElementById('projects-grid');
	if (!grid) return;

	const cached = readCache();
	if (cached) {
		const normalized = normalizeRepos(cached);
		if (normalized.length) renderProjects(normalized);
		else renderProjectsError('No public projects found.');
		return;
	}

	// lightweight loading state
	const loading = document.createElement('p');
	loading.className = 'projects-loading';
	loading.textContent = 'Loading projects…';
	grid.appendChild(loading);

	try {
		const response = await fetch(
			'https://api.github.com/users/' + encodeURIComponent(GITHUB_USER) + '/repos?sort=updated&per_page=100',
			{ headers: { Accept: 'application/vnd.github+json' } }
		);
		if (!response.ok) throw new Error('GitHub API returned ' + response.status);
		const repos = await response.json();
		if (!Array.isArray(repos)) throw new Error('Unexpected GitHub response');
		writeCache(repos);
		const normalized = normalizeRepos(repos);
		if (normalized.length) renderProjects(normalized);
		else renderProjectsError('No public projects found.');
	} catch (error) {
		console.warn('GitHub fetch failed:', error);
		const stale = readCacheIgnoringAge();
		const normalized = stale ? normalizeRepos(stale) : [];
		if (normalized.length) renderProjects(normalized);
		else renderProjectsError('Could not load projects right now. Try again later.');
	}
}

loadProjects();
