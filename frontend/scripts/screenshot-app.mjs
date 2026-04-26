import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const url = 'http://localhost:5173/';
const outDir = path.join(root, 'tests', 'reports', 'v4-screens');
await mkdir(outDir, { recursive: true });

// Pull real shape mock data straight from src/mock/data.ts. Vite serves .ts via the dev server,
// but Node can't import it directly, so we read & lightly compile via dynamic import of a JS shim.
const mockUrl = pathToFileURL(path.join(root, 'src/mock/data.ts')).href;
async function loadMock() {
  // Minimal CommonJS-style transpile: strip type annotations not parseable by node ESM.
  // Easier: import via tsx if available; fall back to a hand-curated subset.
  return null;
}
await loadMock(); // placeholder for future expansion

// Hand-curated mock payloads. Aligned with src/api/types.ts contracts.
const teams = buildMockTeams();
const swissMatches = buildSwissMatches();
const eliminationMatches = [];
const matches = [...swissMatches, ...eliminationMatches];
const stream = {
  id: 'stream-1',
  title: '驴酱杯 S2 · 主舞台',
  url: 'https://www.douyu.com/138243',
  isLive: true,
};
const streamers = buildMockStreamers();
const videos = buildMockVideos();

const browser = await chromium.launch();

async function shoot(viewport, name) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  await page.route(/\/api\/(streams|teams|matches|videos|streamers)(\/|\?|$)/, route => {
    const u = new URL(route.request().url());
    const p = u.pathname.replace(/^.*?\/api\b/, '/api');
    return respond(route, p, u);
  });

  page.on('pageerror', err => console.error('[pageerror]', name, err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') console.error('[console.error]', name, msg.text());
  });

  await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
  await ctx.close();
}

function ok(data) {
  return JSON.stringify({ success: true, code: 0, data });
}

function respond(route, p, u) {
  if (p === '/api/streams/active') return route.fulfill({ status: 200, contentType: 'application/json', body: ok(stream) });
  if (p === '/api/streams') return route.fulfill({ status: 200, contentType: 'application/json', body: ok([stream]) });
  if (p === '/api/teams') return route.fulfill({ status: 200, contentType: 'application/json', body: ok(teams) });
  if (p === '/api/matches') return route.fulfill({ status: 200, contentType: 'application/json', body: ok(matches) });
  if (p === '/api/streamers') return route.fulfill({ status: 200, contentType: 'application/json', body: ok(streamers) });
  if (p === '/api/videos') {
    const pageSize = Number(u.searchParams.get('pageSize') ?? 100);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({ list: videos, total: videos.length, page: 1, pageSize }),
    });
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: ok(null) });
}

await shoot({ width: 1440, height: 900 }, 'desktop');
await shoot({ width: 390, height: 844 }, 'mobile');
await browser.close();
console.log('saved to', outDir);

// ---------- mock data builders ----------

function buildMockTeams() {
  const POS = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
  const teams = [
    { id: 't1', name: '驴酱队', urls: ['138243', '138243', '138243', '138243', '8981206'],
      ns: ['洞主', '凯哥', '啧啧', '伏羲', '小溪'], lvs: ['S','A','S','A','A'] },
    { id: 't2', name: 'IC 队', urls: Array(5).fill('1126960'),
      ns: ['余小C','阿亮','二泽','恶意','阿瓜'], lvs: ['A','B','A','S','A'] },
    { id: 't3', name: '小熊队', urls: Array(5).fill('251783'),
      ns: ['小达','老佳阳','银剑君','秃秃','皮皮核桃'], lvs: ['A','A','A','B','B'] },
    { id: 't4', name: '星辰队', urls: [null, null, null, null, null],
      ns: ['星河','闪烁','流星','彗星','夜空'], lvs: ['A','B','A','B','B'] },
    { id: 't5', name: '搓搓鸟队', urls: ['2057760','2057760','2057760','2057760','12619385'],
      ns: ['法环','大本猪','格局','xlbos','年年'], lvs: ['A','B','B','B','B'] },
    { id: 't6', name: 'PLG 队', urls: ['4452132','4452132','4452132','4452132','8690608'],
      ns: ['泰妍','查理','二抛','芬达','小唯'], lvs: ['B','B','B','B','C'] },
    { id: 't7', name: '雨酱队', urls: ['9779433','9779433','9779433','9779433','317422'],
      ns: ['想和哥俩玩','慧琳宝','辰林','暴龙战士','冯雨'], lvs: ['C','C','C','C','C'] },
    { id: 't8', name: '深海队', urls: [null,null,null,null,null],
      ns: ['海浪','潮汐','珊瑚','海龟','珍珠'], lvs: ['A','B','B','B','C'] },
    { id: 't9', name: '100J 队', urls: ['3863752','3863752','3863752','1580850','12661677'],
      ns: ['十六夜','小甜椒','温柔遍野','团子','柚柚子'], lvs: ['B','C','C','C','C'] },
    { id: 't10', name: '雷霆队', urls: [null,null,null,null,null],
      ns: ['闪电','雷鸣','电场','电荷','云端'], lvs: ['B','B','B','B','C'] },
    { id: 't11', name: '暗影队', urls: [null,null,null,null,null],
      ns: ['影子','幽灵','黑夜','暗夜','迷雾'], lvs: ['B','B','B','B','C'] },
    { id: 't12', name: '疾风队', urls: [null,null,null,null,null],
      ns: ['风暴','飓风','微风','狂风','清风'], lvs: ['A','B','B','B','C'] },
    { id: 't13', name: '寒冰队', urls: [null,null,null,null,null],
      ns: ['冰霜','雪花','寒流','冰川','极光'], lvs: ['B','C','B','B','B'] },
    { id: 't14', name: '69 队', urls: Array(5).fill('10902240'),
      ns: ['尊师HKL','大B脸','可乐','咬人鹅','阿松'], lvs: ['C','D','D','D','D'] },
    { id: 't15', name: '巨石队', urls: [null,null,null,null,null],
      ns: ['岩石','山岳','砂石','碎石','岩壁'], lvs: ['C','C','C','C','D'] },
    { id: 't16', name: '烈焰队', urls: [null,null,null,null,null],
      ns: ['火焰','燃烧','炽热','烈焰','灰烬'], lvs: ['A','B','B','B','C'] },
  ];
  return teams.map(t => ({
    id: t.id,
    name: t.name,
    logo: '',
    battleCry: '',
    players: t.ns.map((n, i) => ({
      id: `${t.id}-p${i}`,
      nickname: n,
      avatarUrl: '',
      position: POS[i],
      teamId: t.id,
      isCaptain: i === 0,
      level: t.lvs[i],
      liveUrl: t.urls[i] ? `https://www.douyu.com/${t.urls[i]}` : undefined,
    })),
  }));
}

function buildSwissMatches() {
  // Round 1: 8 finished. Round 2: 8 finished. Round 3: 1 finished + 1 ongoing + 6 upcoming.
  // Round 4 / 5: empty (待赛).
  const r1 = [
    ['t1','t2','t1'], ['t3','t4','t3'], ['t5','t6','t5'], ['t7','t8','t7'],
    ['t9','t10','t9'], ['t11','t12','t11'], ['t13','t14','t13'], ['t15','t16','t15'],
  ].map(([a,b,w], i) => mk(`r1-${i}`, a, b, w === a ? 1 : 0, w === b ? 1 : 0, w, 'finished', '0-0', 1));

  const r2_10 = [['t1','t3','t1'], ['t5','t7','t5'], ['t9','t11','t9'], ['t13','t15','t13']]
    .map(([a,b,w],i) => mk(`r2a-${i}`, a, b, 1, 0, w, 'finished', '1-0', 2));
  const r2_01 = [['t2','t4','t4'], ['t6','t8','t8'], ['t10','t12','t12'], ['t14','t16','t16']]
    .map(([a,b,w],i) => mk(`r2b-${i}`, a, b, 0, 1, w, 'finished', '0-1', 2));

  const r3_20 = [
    mk('r3-20-0', 't1','t5', 1, 0, 't1', 'finished', '2-0', 3),
    mk('r3-20-1', 't9','t13', 0, 0, undefined, 'ongoing', '2-0', 3),
  ];
  const r3_11 = [
    mk('r3-11-0','t3','t7',0,0,undefined,'upcoming','1-1',3),
    mk('r3-11-1','t2','t6',0,0,undefined,'upcoming','1-1',3),
    mk('r3-11-2','t11','t8',0,0,undefined,'upcoming','1-1',3),
    mk('r3-11-3','t12','t15',0,0,undefined,'upcoming','1-1',3),
  ];
  const r3_02 = [
    mk('r3-02-0','t9','t14',0,0,undefined,'upcoming','0-2',3),
    mk('r3-02-1','t16','t13',0,0,undefined,'upcoming','0-2',3),
  ];

  return [...r1, ...r2_10, ...r2_01, ...r3_20, ...r3_11, ...r3_02];
}

function mk(id, teamAId, teamBId, scoreA, scoreB, winnerId, status, swissRecord, swissRound) {
  return {
    id,
    teamAId,
    teamBId,
    scoreA,
    scoreB,
    winnerId,
    round: `Round ${swissRound}`,
    status,
    startTime: '2026-04-26T18:00:00Z',
    stage: 'swiss',
    swissRecord,
    swissRound,
    boFormat: 'BO1',
  };
}

function buildMockStreamers() {
  return [
    { id: 's1', nickname: '咬人鹅', bio: 'S1 荣誉选手', posterUrl: '', liveUrl: 'https://www.douyu.com/138243', streamerType: 'internal', sortOrder: 1 },
    { id: 's2', nickname: 'BBBB 脸', bio: 'S2 队长', posterUrl: '', liveUrl: 'https://www.douyu.com/10902240', streamerType: 'internal', sortOrder: 2 },
    { id: 's3', nickname: '年年酱牛肉', bio: 'S2 主持', posterUrl: '', liveUrl: 'https://www.douyu.com/12619385', streamerType: 'internal', sortOrder: 3 },
    { id: 's4', nickname: '驴酱·辰林', bio: 'S2 队长', posterUrl: '', liveUrl: 'https://www.douyu.com/9779433', streamerType: 'internal', sortOrder: 4 },
    { id: 's5', nickname: '澈心', bio: 'S2 嘉宾解说', posterUrl: '', liveUrl: 'https://www.douyu.com/8690608', streamerType: 'internal', sortOrder: 5 },
    { id: 's6', nickname: '余小C', bio: 'IC 队队长', posterUrl: '', liveUrl: 'https://www.douyu.com/1126960', streamerType: 'guest', sortOrder: 6 },
    { id: 's7', nickname: '银剑君', bio: '小熊队中单', posterUrl: '', liveUrl: 'https://www.douyu.com/251783', streamerType: 'guest', sortOrder: 7 },
    { id: 's8', nickname: '法环', bio: '搓搓鸟队队长', posterUrl: '', liveUrl: 'https://www.douyu.com/2057760', streamerType: 'guest', sortOrder: 8 },
  ];
}

function buildMockVideos() {
  return [
    { id: 'v1', bvid: 'BV1XX1', title: '驴酱杯 S2 战火重燃！16 位队长谁能加冕为王？', page: 1, coverUrl: '/assets/驴酱双人组.webp' },
    { id: 'v2', bvid: 'BV1XX2', title: '辰林队濒临解散，一众主播水友前来围观吃瓜！', page: 1, coverUrl: '' },
    { id: 'v3', bvid: 'BV1XX3', title: '余小C阿亮看《驴酱杯宣传片》：剑君 Faker 既视感', page: 1, coverUrl: '' },
    { id: 'v4', bvid: 'BV1XX4', title: '银剑君看《驴酱杯宣传片》：给鼻哥搞这么帅！', page: 1, coverUrl: '' },
    { id: 'v5', bvid: 'BV1XX5', title: '《YMCA驴酱版》：洞主凯哥驴酱杯皇帝应援曲', page: 1, coverUrl: '' },
  ];
}
