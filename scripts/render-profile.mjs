import { mkdir, writeFile } from 'node:fs/promises';

const login = process.env.GITHUB_REPOSITORY_OWNER || 'Vhox';
const token = process.env.PROFILE_TOKEN || process.env.GITHUB_TOKEN;

const query = `query($login: String!) {
  user(login: $login) {
    followers { totalCount }
    repositories(first: 100, privacy: PUBLIC) { totalCount nodes { stargazerCount } }
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { contributionCount date color } }
      }
    }
  }
}`;

async function profile() {
  if (!token) return null;
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables: { login } }),
  });
  const body = await response.json();
  if (!response.ok || body.errors) throw new Error(body.errors?.[0]?.message || `GitHub API: ${response.status}`);
  return body.data.user;
}

const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
const level = (count) => count === 0 ? '#172334' : count < 3 ? '#126c59' : count < 7 ? '#10a36d' : count < 12 ? '#18d77e' : '#7dff9a';

function shooter(user) {
  const calendar = user?.contributionsCollection?.contributionCalendar;
  const weeks = calendar?.weeks ?? [];
  const days = weeks.flatMap((week) => week.contributionDays);
  const cells = Array.from({ length: 53 * 7 }, (_, index) => days[index] ?? { contributionCount: 0 });
  const targets = cells.map((day, index) => day.contributionCount ? index : -1).filter((index) => index >= 0);
  const beamTargets = (targets.length ? targets : [301, 261, 218, 177, 134]).slice(-5);
  const grid = cells.map((day, index) => {
    const col = Math.floor(index / 7), row = index % 7;
    return `<rect x="${50 + col * 14.25}" y="${86 + row * 19}" width="10" height="10" rx="2" fill="${level(day.contributionCount)}" opacity="${day.contributionCount ? '.95' : '.72'}"/>`;
  }).join('');
  const beams = beamTargets.map((index, n) => {
    const col = Math.floor(index / 7), row = index % 7, x = 55 + col * 14.25, y = 91 + row * 19;
    const begin = `${n * 1.15}s`;
    return `<g opacity="0"><path d="M430 294 L${x} ${y}" stroke="#55f7ff" stroke-width="2" filter="url(#glow)"/><circle cx="${x}" cy="${y}" r="5" fill="#baffff" filter="url(#glow)"/><animate attributeName="opacity" values="0;0;1;1;0" dur="5.75s" begin="${begin}" repeatCount="indefinite"/></g>`;
  }).join('');
  const total = calendar?.totalContributions ?? 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="860" height="365" viewBox="0 0 860 365" role="img" aria-label="Contribution shooter: ${total} contributions">
<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#0c1525"/><stop offset=".55" stop-color="#0a1020"/><stop offset="1" stop-color="#101a26"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><radialGradient id="aura"><stop stop-color="#1a9cff" stop-opacity=".23"/><stop offset="1" stop-color="#1a9cff" stop-opacity="0"/></radialGradient></defs>
<rect width="860" height="365" rx="24" fill="url(#bg)" stroke="#2878c9" stroke-width="1.5"/><rect x="31" y="49" width="798" height="262" rx="17" fill="#07111e" stroke="#16446d"/>
<text x="31" y="30" fill="#4ba3ff" font-family="monospace" font-size="14" font-weight="700" letter-spacing="3">CONTRIBUTION.SHOOTER</text><text x="829" y="30" text-anchor="end" fill="#7a91ad" font-family="monospace" font-size="12">./mission --live-calendar</text><path d="M31 39H829" stroke="#2878c9"/>
<circle cx="430" cy="260" r="105" fill="url(#aura)"><animate attributeName="r" values="95;115;95" dur="3s" repeatCount="indefinite"/></circle>${grid}${beams}
<g transform="translate(410 274)"><animateTransform attributeName="transform" type="translate" values="410 274;445 274;410 274" dur="5.75s" repeatCount="indefinite"/><path d="M20 0L38 39 20 32 2 39Z" fill="#4a9cff" stroke="#a9e7ff" stroke-width="2" filter="url(#glow)"/><path d="M20 9L27 28 20 24 13 28Z" fill="#d9fbff"/><path d="M16 35L20 48 24 35Z" fill="#ff9d36"><animate attributeName="opacity" values=".4;1;.4" dur=".35s" repeatCount="indefinite"/></path></g>
<text x="35" y="341" fill="#7890ad" font-family="monospace" font-size="12">LIVE CONTRIBUTIONS · ${total} IN THE LAST YEAR</text><text x="825" y="341" text-anchor="end" fill="#4be7ff" font-family="monospace" font-size="12">TARGETS LOCKED</text></svg>`;
}

function signal(user) {
  const repos = user?.repositories?.totalCount ?? 0;
  const stars = user?.repositories?.nodes?.reduce((sum, repo) => sum + repo.stargazerCount, 0) ?? 0;
  const followers = user?.followers?.totalCount ?? 0;
  const contributions = user?.contributionsCollection?.contributionCalendar?.totalContributions ?? 0;
  const card = (x, label, value, color, width) => `<rect x="${x}" y="74" width="166" height="110" rx="16" fill="#0a1020" stroke="#2878c9"/><text x="${x + 18}" y="102" fill="#9ba9bd" font-family="monospace" font-size="12" font-weight="700" letter-spacing="1.5">${label}</text><text x="${x + 18}" y="145" fill="${color}" font-family="Arial,sans-serif" font-size="39" font-weight="800">${escape(value)}</text><rect x="${x + 18}" y="162" width="130" height="7" rx="4" fill="#252c3a"/><rect x="${x + 18}" y="162" width="${width}" height="7" rx="4" fill="${color}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="860" height="215" viewBox="0 0 860 215" role="img" aria-label="Profile signal"><defs><linearGradient id="s" x2="1" y2="1"><stop stop-color="#10223b"/><stop offset="1" stop-color="#11251f"/></linearGradient></defs><rect width="860" height="215" rx="24" fill="url(#s)" stroke="#2878c9" stroke-width="1.5"/><text x="31" y="34" fill="#4ba3ff" font-family="monospace" font-size="14" font-weight="700" letter-spacing="3">PROFILE.SIGNAL</text><text x="829" y="34" text-anchor="end" fill="#7a91ad" font-family="monospace" font-size="12">github://${login} — public</text><path d="M31 45H829" stroke="#2878c9"/>${card(31, 'STARS', stars, '#55a8ff', Math.min(130, 14 + stars * 8))}${card(218, 'CONTRIBUTIONS', contributions, '#2fe6ff', Math.min(130, 20 + contributions / 8))}${card(405, 'REPOS', repos, '#ad70ff', Math.min(130, 20 + repos * 7))}${card(592, 'FOLLOWERS', followers, '#3cdb70', Math.min(130, 20 + followers * 9))}</svg>`;
}

let user;
try { user = await profile(); } catch (error) { console.warn(`Profile API unavailable: ${error.message}`); }
await mkdir('assets', { recursive: true });
await Promise.all([
  writeFile('assets/contribution-shooter.svg', shooter(user)),
  writeFile('assets/profile-signal.svg', signal(user)),
]);
console.log(`Rendered profile signal for ${login}${user ? '' : ' using the offline fallback'}.`);
