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
const days = weeks.flatMap((week, x) => week.contributionDays.map((day, y) => ({ ...day, x: 44 + x * 18, y: 110 + y * 18 })));
const candidates = days.filter(day => day.contributionCount > 0);
const fallback = [days[72], days[150], days[240], days[324]].filter(Boolean);
const source = candidates.length ? candidates : fallback;
const targets = [0, .3, .62, .9].map((position, index) => source[Math.min(source.length - 1, Math.floor(position * (source.length - 1)))])
  .filter(Boolean).map((day, index) => ({ ...day, index, start: .08 + index * .22 }));
const targetDates = new Set(targets.map(target => target.date));
const cells = days.map(day => `<rect x="${day.x - 6}" y="${day.y - 6}" width="12" height="12" rx="2" fill="${color(day.contributionCount)}" data-date="${day.date}">${targetDates.has(day.date) ? '<animate attributeName="fill" values="#56d68a;#d9ffff;#56d68a" dur="6s" repeatCount="indefinite"/>' : ''}</rect>`).join('');
const particles = Array.from({ length: 28 }, (_, index) => {
  const x = 48 + (index * 137) % 950, y = 95 + (index * 47) % 225, duration = 3.2 + (index % 5) * .6;
  return `<circle cx="${x}" cy="${y}" r="${index % 3 === 0 ? 1.4 : .8}" fill="${index % 4 === 0 ? '#62b8ff' : '#38d8c8'}" opacity=".12"><animate attributeName="cy" values="${y};${y - 16};${y}" dur="${duration}s" repeatCount="indefinite"/><animate attributeName="opacity" values=".04;.36;.04" dur="${duration}s" repeatCount="indefinite"/></circle>`;
}).join('');
const track = [...targets, targets[0]].map(target => `${target.x - 498} 0`).join(';');
const keyTimes = targets.map((_, index) => (index / targets.length).toFixed(2)).concat('1').join(';');
const beams = targets.map(target => {
  const a = target.start.toFixed(2), b = (target.start + .025).toFixed(3), c = (target.start + .09).toFixed(2);
  return `<path d="M498 286V${target.y}" stroke="#6ff7ff" stroke-width="1.4" opacity="0"><animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;${a};${b};${c};1" dur="6s" repeatCount="indefinite"/></path><circle cx="498" cy="${target.y}" r="3" fill="#d8ffff" opacity="0"><animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;${a};${b};${c};1" dur="6s" repeatCount="indefinite"/></circle>`;
}).join('');
const impacts = targets.map(target => {
  const a = (target.start + .025).toFixed(3), b = (target.start + .06).toFixed(3), c = (target.start + .105).toFixed(3);
  return `<circle cx="${target.x}" cy="${target.y}" r="2" fill="none" stroke="#8af7ff" stroke-width="1.2" opacity="0"><animate attributeName="r" values="2;2;16;23;23" keyTimes="0;${a};${b};${c};1" dur="6s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0;.9;0;0" keyTimes="0;${a};${b};${c};1" dur="6s" repeatCount="indefinite"/></circle>`;
}).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1060" height="385" viewBox="0 0 1060 385" role="img" aria-labelledby="title desc">
<title id="title">Contribution Shooter</title><desc id="desc">Live GitHub contribution calendar with a small animated blue spaceship firing subtle pulses.</desc>
<defs><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#121e31"/><stop offset=".48" stop-color="#090e16"/><stop offset="1" stop-color="#0c1b20"/></linearGradient><radialGradient id="halo"><stop stop-color="#286dd0" stop-opacity=".22"/><stop offset="1" stop-color="#286dd0" stop-opacity="0"/></radialGradient><style>.t{fill:#54a7ff;font:700 14px monospace;letter-spacing:3px}.m{fill:#77869c;font:12px monospace}.l{stroke:#438dde;stroke-opacity:.68}</style></defs>
<rect width="1060" height="385" rx="26" fill="url(#bg)" stroke="#3988df" stroke-opacity=".7"/><text x="34" y="48" class="t">CONTRIBUTION.SHOOTER</text><text x="725" y="48" class="m">./mission --live-calendar</text><path class="l" d="M34 65h992"/><rect x="34" y="88" width="992" height="258" rx="16" fill="#070c13" fill-opacity=".52" stroke="#438dde" stroke-opacity=".22"/>
<ellipse cx="530" cy="218" rx="470" ry="145" fill="url(#halo)"><animate attributeName="opacity" values=".35;.75;.35" dur="4s" repeatCount="indefinite"/></ellipse>${particles}${cells}
<g><animateTransform attributeName="transform" type="translate" values="${track}" keyTimes="${keyTimes}" dur="6s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/>${beams}<path d="M484 326l14-36 14 36-14-10z" fill="#55a7ff" stroke="#c3e4ff" stroke-width="1.5"/><path d="M493 329l5 13 5-13" fill="#f0a04d"/></g>${impacts}<text x="38" y="368" class="m">LIVE PUBLIC CONTRIBUTIONS · SHOOTER ONLINE · REFRESHES DAILY</text></svg>`;

await mkdir('assets', { recursive: true });
await writeFile('assets/contribution-shooter.svg', svg);
