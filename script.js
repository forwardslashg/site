const tabs = Array.from(document.querySelectorAll('.tab'));
const panels = Array.from(document.querySelectorAll('.panel'));
const quoteElement = document.querySelector('#name-quote .quote-text');

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

if (quoteElement) {
	const randomIndex = Math.floor(Math.random() * profileQuotes.length);
	quoteElement.textContent = profileQuotes[randomIndex];
}

function activateTab(targetId) {
	tabs.forEach((tab) => {
		const isActive = tab.id === targetId;
		tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
	});

	panels.forEach((panel) => {
		const shouldShow = panel.getAttribute('aria-labelledby') === targetId;
		panel.classList.toggle('active', shouldShow);
		if (shouldShow) panel.scrollTop = 0;
	});
}

tabs.forEach((tab) => {
	tab.addEventListener('click', () => activateTab(tab.id));
});

// Arrow key navigation keeps section switching quick without extra UI.
document.addEventListener('keydown', (event) => {
	if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;

	const currentIndex = tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');
	if (currentIndex < 0) return;

	const direction = event.key === 'ArrowRight' ? 1 : -1;
	const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
	const nextTab = tabs[nextIndex];
	activateTab(nextTab.id);
	nextTab.focus();
});
