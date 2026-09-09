/**
 * 词库批量导入 —— 基于 ECDICT 开源英汉词典数据集（77 万词，自带中文释义 / 音标 / 词性 / 词频）。
 *
 * 数据集：https://github.com/skywind3000/ECDICT  （文件：data/ecdict.csv）
 * CSV 列：word, phonetic, definition, translation, pos, collins, oxford, tag, bnc, frq, exchange, detail, audio
 *
 * 用法：
 *   DATABASE_URL="file:./dev.db" node prisma/import-ecdict.cjs --target=5000
 *
 * 说明：
 *   - --target  要导入的高频词数量（按 frq 词频升序取前 N 个，frq 越小越常用）
 *   - 幂等：已存在的 word 自动跳过，可反复执行持续扩容
 *   - 想扩到更多：直接把 --target 调大即可（数据集共 77 万词）
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const hit = argv.find((a) => a.startsWith('--' + k + '='));
  return hit ? Number(hit.split('=')[1]) : d;
};
const TARGET = arg('target', 5000);
/** 跳过词频排名最前的 N 个词（the/be/of/and 等功能词，不适合作为背诵词条） */
const SKIP = arg('skip', 150);
/** --relevel=1 时只按全局词频排名重算已有词的 level，不插入新词 */
const RELEVEL = argv.includes('--relevel');

const CSV = path.resolve(__dirname, '../data/ecdict.csv');

/** 极简 CSV 行解析：支持双引号包裹与转义引号 */
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const POS_MAP = {
  n: 'n.', v: 'v.', adj: 'adj.', adv: 'adv.', prep: 'prep.',
  conj: 'conj.', pron: 'pron.', int: 'int.', art: 'art.', num: 'num.',
};
/** "n:22/v:15/adj:3" -> "n."（取出现次数最多的词性） */
function pickPos(posRaw) {
  if (!posRaw) return null;
  const parts = String(posRaw).split('/').map((s) => s.trim()).filter(Boolean);
  let best = null, bestN = -1;
  for (const p of parts) {
    const [k, nRaw] = p.split(':');
    const n = parseInt(nRaw || '0', 10) || 0;
    if (n > bestN) { bestN = n; best = k; }
  }
  return POS_MAP[best] || (best ? best + '.' : null);
}

/** 词性前缀，如 "n." / "vt." / "adj." —— 用于识别正规释义行 */
const POS_RE = /^(n|v|vt|vi|adj|adv|prep|conj|pron|int|art|num|aux|pl|abbr)\.\s*/i;

/**
 * 从 ECDICT 的 translation 字段里提取「中文释义 + 词性」。
 * 该字段是多行文本（字面 \n 分隔），形如：
 *   "n. 罩；风帽\nv. 覆盖\n[网络] 胡德；兜帽"
 * 脏数据常见：整段是例句、或只有 [网络] 行。这类一律丢弃，保证入库质量。
 * @returns {{cn: string, pos: string|null} | null}
 */
function pickTranslation(raw) {
  if (!raw) return null;
  const lines = String(raw)
    .split(/\\n|\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    // 丢弃 [网络] / [计] 等标签行与纯英文行
    .filter((s) => !/^\[[^\]]+\]/.test(s))
    .filter((s) => /[一-龥]/.test(s));
  if (!lines.length) return null;

  // 只接受以词性前缀开头的行；没有则判定为脏数据
  const hit = lines.find((s) => POS_RE.test(s));
  if (!hit) return null;

  const pos = hit.match(POS_RE)[1].toLowerCase();
  let cn = hit.replace(POS_RE, '').trim();
  // 只保留前 3 个义项，避免释义过长
  const parts = cn.split(/[；;]/).map((s) => s.trim()).filter(Boolean);
  cn = parts.slice(0, 3).join('；');
  // 去掉夹在释义里的中英混排噪音（如 "在, 向, 对 [计] 地址转换器"）
  cn = cn.replace(/\s*\[[^\]]*\]\s*/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cn || cn.length > 80) return null;

  const POS_MAP2 = {
    n: 'n.', v: 'v.', vt: 'v.', vi: 'v.', adj: 'adj.', adv: 'adv.',
    prep: 'prep.', conj: 'conj.', pron: 'pron.', int: 'int.',
    art: 'art.', num: 'num.', aux: 'v.', pl: 'n.', abbr: 'abbr.',
  };
  return { cn, pos: POS_MAP2[pos] || null };
}

/**
 * 按「全局词频绝对排名」定级 —— 与导入批次无关，分多少次跑结果都一致。
 *   0    ~ 3000  基础高频    → basic
 *   3000 ~ 6000  四六级/雅思 → ielts
 *   6000+        考研/托福   → toefl
 */
function levelByRank(rank) {
  if (rank < 3000) return 'basic';
  if (rank < 6000) return 'ielts';
  return 'toefl';
}

async function main() {
  if (!fs.existsSync(CSV)) {
    console.error('缺少数据文件：' + CSV + '\n请先把 ecdict.csv 放到 backend/data/ 下');
    process.exit(1);
  }

  const existing = new Set(
    (await prisma.word.findMany({ select: { word: true } })).map((w) => w.word.toLowerCase())
  );
  console.log(`当前词库 ${existing.size} 词 | 目标新增 ${TARGET} 词`);

  const rl = readline.createInterface({
    input: fs.createReadStream(CSV, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  const cands = [];
  let scanned = 0;
  for await (const line of rl) {
    scanned++;
    if (!line || line[0] === 'w' && line.startsWith('word,')) continue; // 跳过可能的表头
    const f = parseCsvLine(line);
    if (f.length < 11) continue;
    const [word, phonetic, definition, translation, pos, , , , , frq] = f;
    const w = String(word || '').toLowerCase().trim();
    if (!/^[a-z]{2,20}$/.test(w)) continue;       // 只要纯字母单词，过滤短语/变形串
    const frqNum = parseInt(frq || '0', 10) || 0;
    if (frqNum <= 0) continue;                    // 无词频数据的低频/生僻词，跳过

    // 中文释义：只接受带词性前缀的正规释义行，例句 / [网络] 标签一律丢弃
    const tr = pickTranslation(translation);
    if (!tr) continue;
    const posOut = pickPos(pos) || tr.pos;
    if (!posOut) continue;                        // 词性未知的词不入库，保证前端展示完整

    cands.push({
      word: w,
      ipa: phonetic ? '/' + phonetic.trim() + '/' : null,
      cn: tr.cn,
      en: definition ? String(definition).replace(/\s+/g, ' ').trim().slice(0, 220) : null,
      pos: posOut,
      frq: frqNum,
    });
  }

  cands.sort((a, b) => a.frq - b.frq);

  // 排名在全量候选上计算（包含已存在的词），这样分多批导入时 level 也完全一致
  const picked = [];
  for (let i = SKIP; i < cands.length && picked.length < TARGET; i++) {
    if (existing.has(cands[i].word)) continue;
    picked.push({ ...cands[i], rank: i });
  }
  console.log(`扫描 ${scanned} 行 | 合格候选 ${cands.length} | 跳过功能词 ${SKIP} | 取词频 ${SKIP}~${SKIP + picked.length}`);

  // 分级重算模式：不插词，只把库里已有词的 level 对齐到全局词频排名
  if (RELEVEL) {
    const rankOf = new Map(cands.map((c, i) => [c.word, i]));
    const all = await prisma.word.findMany({
      select: { id: true, word: true, level: true, example: true },
    });

    // 先去重：@@unique([word, level]) 允许同一个词存在多个等级，
    // 但一个词只应有一条记录，否则改 level 会撞唯一键。
    const groups = new Map();
    for (const w of all) {
      const k = w.word.toLowerCase();
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(w);
    }
    let removed = 0;
    for (const [, g] of groups) {
      if (g.length < 2) continue;
      const r = rankOf.get(g[0].word.toLowerCase());
      const target = r != null ? levelByRank(r) : g[0].level;
      // 优先保留等级已正确的那条，其次保留内容最全（有例句/搭配）的那条
      const keep =
        g.find((x) => x.level === target && x.example) ||
        g.find((x) => x.level === target) ||
        g.find((x) => x.example) ||
        g[0];
      for (const x of g) {
        if (x.id === keep.id) continue;
        await prisma.word.delete({ where: { id: x.id } }).catch(() => {});
        removed++;
      }
    }
    console.log(`去重：删除重复词条 ${removed} 条`);

    // 去重后重新读取，避免更新已被删除的记录
    const alive = await prisma.word.findMany({ select: { id: true, word: true, level: true } });
    let changed = 0;
    for (const w of alive) {
      const r = rankOf.get(w.word.toLowerCase());
      if (r == null) continue;
      const lv = levelByRank(r);
      if (lv !== w.level) {
        await prisma.word.update({ where: { id: w.id }, data: { level: lv } });
        changed++;
      }
    }
    console.log(`\n=== RELEVEL DONE ===\n重算 ${all.length} 词，调整 ${changed} 词`);
    const bl = await prisma.word.groupBy({ by: ['level'], _count: { _all: true } });
    console.log('分级:', bl.map((b) => `${b.level}=${b._count._all}`).join(' '));
    await prisma.$disconnect();
    return;
  }

  const rows = picked.map((p) => ({
    word: p.word,
    ipa: p.ipa,
    pos: p.pos,
    cn: p.cn,
    en: p.en,
    level: levelByRank(p.rank),
  }));

  let inserted = 0;
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    try {
      const r = await prisma.word.createMany({ data: chunk, skipDuplicates: true });
      inserted += r.count || 0;
    } catch (e) {
      // 回退为逐条插入，定位并跳过问题行
      for (const row of chunk) {
        try { await prisma.word.create({ data: row }); inserted++; }
        catch { /* 重复或脏数据，跳过 */ }
      }
    }
    if ((i / CHUNK) % 5 === 0) console.log(`  已写入 ${inserted} / ${rows.length}`);
  }

  const total = await prisma.word.count();
  const byLevel = await prisma.word.groupBy({ by: ['level'], _count: { _all: true } });
  console.log('\n=== DONE ===');
  console.log({ inserted, totalInDb: total });
  console.log('分级:', byLevel.map((b) => `${b.level}=${b._count._all}`).join(' '));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('FATAL', e.message);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
