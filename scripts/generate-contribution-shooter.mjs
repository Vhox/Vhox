import { mkdir, writeFile } from 'node:fs/promises';

const login = 'Vhox';
const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}`;
let weeks = [];

if (process.env.GITHUB_TOKEN) {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `bearer ${process.env.GITHUB_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables: { login } }),
  });
  const body = await response.json();
  if (!response.ok || body.errors) throw new Error(body.errors?.[0]?.message || `GitHub API ${response.status}`);
  weeks = body.data.user.contributionsCollection.contributionCalendar.weeks;
}

// A deterministic empty calendar keeps local builds usable; Actions replaces it with live public data.
if (!weeks.length) weeks = Array.from({ length: 53 }, (_, week) => ({ contributionDays: Array.from({ length: 7 }, (_, day) => ({ date: `week-${week}-day-${day}`, contributionCount: 0 })) }));

const max = Math.max(1, ...weeks.flatMap(w => w.contributionDays.map(d => d.contributionCount)));
const color = count => count === 0 ? '#151e29' : count / max < .25 ? '#1f493c' : count / max < .55 ? '#28775a' : count / max < .8 ? '#2eaa73' : '#56d68a';
const cells = weeks.flatMap((week, x) => week.contributionDays.map((day, y) => {
  const hit = (x === 25 && y === 2) || (x === 38 && y === 4);
  return `<rect x="${38 + x * 18}" y="${104 + y * 18}" width="12" height="12" rx="2" fill="${color(day.contributionCount)}" data-date="${day.date}">${hit ? '<animate attributeName="opacity" values="1;.35;1" dur="6s" begin="1.4s" repeatCount="indefinite"/>' : ''}</rect>`;
})).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1060" height="385" viewBox="0 0 1060 385" role="img" aria-labelledby="title desc">
<title id="title">Contribution Shooter</title><desc id="desc">Live GitHub contribution calendar with a small animated blue spaceship firing subtle pulses.</desc>
<defs><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#121e31"/><stop offset=".48" stop-color="#090e16"/><stop offset="1" stop-color="#0c1b20"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="4"/></filter><style>.t{fill:#54a7ff;font:700 14px monospace;letter-spacing:3px}.m{fill:#77869c;font:12px monospace}.l{stroke:#438dde;stroke-opacity:.68}</style></defs>
<rect width="1060" height="385" rx="26" fill="url(#bg)" stroke="#3988df" stroke-opacity=".7"/><text x="34" y="48" class="t">CONTRIBUTION.SHOOTER</text><text x="725" y="48" class="m">./mission --live-calendar</text><path class="l" d="M34 65h992"/><rect x="34" y="88" width="992" height="258" rx="16" fill="#070c13" fill-opacity=".52" stroke="#438dde" stroke-opacity=".22"/>
${cells}
<g><animateTransform attributeName="transform" type="translate" values="0 0;220 0;220 0;0 0" keyTimes="0;.35;.58;1" dur="12s" repeatCount="indefinite"/><path d="M482 325l16-38 16 38-16-11z" fill="#55a7ff" stroke="#a5d6ff" stroke-width="1.3" filter="url(#glow)"/><path d="M498 289v-118" stroke="#4be1f2" stroke-width="1.4" stroke-opacity="0"><animate attributeName="stroke-opacity" values="0;0;.9;.9;0;0" keyTimes="0;.34;.36;.43;.45;1" dur="12s" repeatCount="indefinite"/></path><circle cx="498" cy="166" r="4" fill="#73effa" opacity="0"><animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;.37;.39;.43;1" dur="12s" repeatCount="indefinite"/></circle><path d="M494 329l4 13 4-13" fill="#f0a04d"/></g>
<g transform="translate(490 151)" opacity="0"><circle r="5" fill="none" stroke="#7ce9fa" stroke-width="1.5"><animate attributeName="r" values="4;18;25" dur=".6s" begin="4.65s" repeatCount="indefinite"/></circle><animate attributeName="opacity" values="0;1;0" dur=".6s" begin="4.65s" repeatCount="indefinite"/></g><text x="38" y="368" class="m">LIVE PUBLIC CONTRIBUTIONS · REFRESHES DAILY</text></svg>`;

await mkdir('assets', { recursive: true });
await writeFile('assets/contribution-shooter.svg', svg);
