// ai.js — local rule-based "AI" engine (placeholder for real LLM API later)
// Produces content-aware, structured feedback so features work without a backend.

// 统一调用链：服务端代理（密钥不出后端）→ 本机自带的密钥 → 本地规则。
// 每一级失败都往下退，但会把「实际生效的引擎」如实返回，界面据此显示徽标，
// 不再出现「用户以为在用 AI、其实拿到的是套话」的静默降级。
import { api, isAuthed } from './api.js';

// 最近一次实际生效的引擎。界面据此显示徽标，避免「以为在用 AI」的静默降级。
let lastEngine = null;
export function lastAiEngine() { return lastEngine; }

// 最近一次失败的错误码（INSUFFICIENT_CREDITS / AI_UPSTREAM_* 等），供引导练习
// 这类「没有返回值」的场景区分「没积分」与「服务故障」；成功调用后会被置空。
let lastErrorCode = null;
export function lastAiErrorCode() { return lastErrorCode; }

/**
 * @param {Array<{role:'user'|'assistant'|'system', content:string}>} messages
 * @param {{scene?:'casual'|'ielts'|'toefl'|'coach', system?:string, temperature?:number}} opts
 * @returns {Promise<{text:string|null, engine:'server'|'byo'|'local'|'error', model?:string, error?:string}>}
 */
export async function aiChat(messages, opts = {}) {
  lastErrorCode = null;
  const payload = {
    messages,
    scene: opts.scene || 'casual',
    temperature: opts.temperature,
  };
  let upstreamError = null;
  let upstreamCode = null;   // INSUFFICIENT_CREDITS / AI_UPSTREAM_* 等，供界面区分提示

  // 1) 服务端代理：需要登录，未配置/故障时返回约定的错误码，往下退
  if (isAuthed()) {
    try {
      const res = await api('/ai/chat', { method: 'POST', body: JSON.stringify(payload) });
      const d = res && res.data;
      if (d && d.text) { lastEngine = 'server'; return { text: d.text, engine: 'server', model: d.model }; }
      upstreamError = '服务端未返回内容';
    } catch (err) {
      // 后端没起、登录过期、AI_UPSTREAM_* 走这里 → 视为真实故障，提示并给重试。
      // AI_NOT_CONFIGURED = 后端压根没配上游，属「server 级未启用」，不应报故障，
      // 按 local 正常兜底即可（徽标显示「本地规则」，不出现「AI 不可用」重试条）。
      if (err && err.code === 'AI_NOT_CONFIGURED') {
        upstreamError = null;
      } else {
        upstreamError = (err && err.message) || 'AI 服务不可用';
        upstreamCode = (err && err.code) || null;
        lastErrorCode = upstreamCode;
      }
    }
  }

  // 2) 用户本机填的密钥（浏览器直连服务商，可能受 CORS 限制）
  const cfg = opts.cfg || readLlmCfg();
  if (cfg) {
    const text = await llmChat(messages, { system: opts.system, temperature: opts.temperature, cfg });
    if (text) { lastEngine = 'byo'; return { text, engine: 'byo', model: cfg.model, error: upstreamError }; }
  }

  // 3) 本地规则：只在没拿到任何模型结果时兜底
  //    有上游真实故障（非未配置）→ error（界面提示并给重试）；server 级未启用/未登录 → local（正常兜底）
  lastEngine = (upstreamError && !cfg) ? 'error' : 'local';
  return { text: null, engine: lastEngine, error: upstreamError, code: upstreamCode };
}

const LINKERS = ['although', 'however', 'therefore', 'furthermore', 'moreover', 'because', 'so', 'whereas', 'nevertheless', 'in addition', 'for example'];
const SIMPLE_WORDS = { good: 'beneficial / effective', bad: 'detrimental / harmful', big: 'significant / substantial', small: 'minor / negligible', thing: 'factor / aspect', 'a lot': 'a great deal / considerably', important: 'crucial / vital', many: 'numerous / a wide range of', show: 'demonstrate / illustrate', use: 'utilise / employ' };
const FILLERS = ['um', 'uh', 'er', 'ah', 'like', 'you know', 'well'];

function words(text) { return (text || '').trim().split(/\s+/).filter(Boolean); }
function sentences(text) { return (text || '').split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0); }

// ---------------- AI Tutor (chat) ----------------
export function tutor(q, ctx = {}) {
  const Q = (q || '').toLowerCase();
  const name = ctx.name || '你';
  if (Q.includes('have') && (Q.includes('为什么') || Q.includes('why') || Q.includes('用'))) {
    return `好问题。${name}，这里用 have 通常有两种情况：\n\n1) 表示「拥有 / 经历」：I have a book. / She has finished.（第三人称单数用 has）\n2) 现在完成时 have + 过去分词：I have studied for 3 years. 强调动作与现在的联系。\n\n判断方法：如果句子里有表示「到现在为止」的时间（already, just, for, since），多半用 have done。要我出几道练习题帮你巩固吗？`;
  }
  if (Q.includes('记') && (Q.includes('单词') || Q.includes('词') || Q.includes('vocab'))) {
    return `记单词我推荐「语境记忆法」，比死背效率高很多：\n\n• 把单词放进例句里记，而不是单独背拼写；\n• 用「听音 → 拼写 → 造句」三步循环；\n• 利用错词本，只对记错的词重点复习；\n• 每天 15–20 个新词 + 复习旧词效果最好。\n\n你现在要去词汇模块练一组吗？我可以帮你挑今天该复习的词。`;
  }
  if (Q.includes('5.5') || Q.includes('分数') || Q.includes('band') || Q.includes('为什么只有')) {
    return `你作文 5.5 通常卡在这几处：\n\n• 任务回应不充分——观点展开太浅，缺少具体例子；\n• 词伙单一，反复用 good / big 这类基础词；\n• 语法以简单句为主，复杂句少且偶有错误。\n\n想上 6.5，先把「每个论点配一个真实例子」练熟，再积累 20 个高频话题的高级替换词。要不要我针对你最近的错题帮你定制训练？`;
  }
  if (Q.includes('口语') || Q.includes('speaking') || Q.includes('练一下')) {
    return `好，我们练一段口语。先告诉我你今天想练哪个场景：\n\nA. 日常闲聊（Casual）\nB. IELTS Speaking 模拟（Part 1–3）\nC. TOEFL Speaking 任务\n\n选一个，我马上开始。记得用麦克风直接说，我会分析你的流利度、词汇、语法和发音。`;
  }
  if (Q.includes('计划') || Q.includes('plan') || Q.includes('学什么') || Q.includes('从哪')) {
    return `我可以帮你生成专属学习计划。告诉我：你现在的水平、目标是 IELTS 还是 TOEFL、目标分数、考试日期、每天能学多久。我会拆成「基础 → 词汇语法 → 听读 → 专项 → 真题 → 模考 → 冲刺」的路线，并告诉你今天该学什么。`;
  }
  if (Q.includes('你好') || Q.includes('hi') || Q.includes('hello') || Q.includes('在吗')) {
    return `Hi ${name}！我是你的 AI English Partner。我可以陪你练口语、讲语法、改作文、定制计划。今天想先做什么？`;
  }
  return `这是个好问题。基于你目前的学习数据，我的建议是：先把基础打牢，再用真题检验。你可以去「词汇」做每日单词、去「写作」用计时器写一篇让我批改，或直接在「AI 伙伴」里和我聊。\n\n如果你能说得更具体一点（比如某道题、某个语法点、或某篇作文），我可以给出更针对性的分析。`;
}

// ---------------- Writing Critique ----------------
export function writingCritique(text, prompt) {
  const w = words(text);
  const wc = w.length;
  const sents = sentences(text);
  const minWords = prompt?.task === 'Task 1' ? 150 : (prompt?.exam === 'TOEFL' ? 200 : 250);
  const meets = wc >= minWords;

  // grammar issues
  const issues = [];
  let grammarErr = 0;
  if (/\bi\s/.test(text) || /\bi\b(?=[,.!?])/.test(text)) {
    issues.push({ tag: 'Grammar', why: '英文中第一人称 "I" 必须永远大写。', fix: '把 "i" 改为 "I"。', advanced: '大写 I 是英语书写的基本规范，写作评分的 Grammatical Accuracy 会因此扣分。', example: 'i think → I think' });
    grammarErr++;
  }
  if (/  +/.test(text)) {
    issues.push({ tag: 'Format', why: '出现了连续空格，影响排版整洁度。', fix: '删除多余空格，每个词之间只保留一个空格。', advanced: '正式写作的 Presentation 维度也看格式，整洁很重要。', example: 'the  book → the book' });
    grammarErr++;
  }
  // simple-word overuse
  const simpleHits = [];
  for (const sw in SIMPLE_WORDS) {
    const re = new RegExp('\\b' + sw + '\\b', 'gi');
    const m = text.match(re);
    if (m && m.length >= 2) simpleHits.push({ w: sw, rep: SIMPLE_WORDS[sw] });
  }
  if (simpleHits.length) {
    issues.push({ tag: 'Lexical', why: `你多次使用了基础词（如 ${simpleHits.map(s => s.w).join('、')}），词汇多样性不足。`, fix: `尝试用更精确的高级词替换，例如：${simpleHits.slice(0, 3).map(s => s.w + ' → ' + s.rep).join('；')}。`, advanced: 'Lexical Resource 高分关键在于「在合适语境用准确的高级词」，而非堆砌生僻词。', example: 'good → beneficial' });
  }
  // coherence
  const lower = text.toLowerCase();
  const hasLinker = LINKERS.some(l => lower.includes(l));
  if (!hasLinker) {
    issues.push({ tag: 'Coherence', why: '段落之间缺少连接词，逻辑跳跃。', fix: '加入 however / therefore / furthermore 等连接词。', advanced: 'Coherence & Cohesion 要求观点「黏合」，连接词让考官清晰看到你的逻辑线。', example: 'Add: "Furthermore, ..."' });
  }
  // sentence length balance
  const avg = sents.length ? wc / sents.length : 0;
  if (avg > 28) issues.push({ tag: 'Grammar', why: '平均句长偏长，容易出现从句嵌套错误。', fix: '适当拆分长句，混合使用短句增强节奏。', advanced: '高分作文讲究「句式节奏」，长短句交错更自然。', example: '' });

  // scores
  let taskResponse = meets ? 6 : 4.5;
  let coherence = hasLinker ? 6 : 4.5;
  let lexical = simpleHits.length ? Math.max(4, 6 - simpleHits.length * 0.5) : 6;
  let grammar = Math.max(4, 6 - grammarErr * 0.8);
  if (wc >= minWords + 60 && sents.length >= 4) { taskResponse += 0.5; coherence += 0.5; lexical += 0.5; grammar += 0.5; }
  const round = (x) => Math.round(x * 2) / 2;
  taskResponse = Math.min(9, round(taskResponse)); coherence = Math.min(9, round(coherence)); lexical = Math.min(9, round(lexical)); grammar = Math.min(9, round(grammar));
  const overall = Math.round(((taskResponse + coherence + lexical + grammar) / 4) * 2) / 2;

  // advanced version sample
  const adv = "For instance, although technology has transformed communication, it has not necessarily weakened our social bonds; rather, it has redefined how we maintain them.";

  const suggestions = [
    meets ? '字数达标，保持。' : `当前 ${wc} 词，建议写到至少 ${minWords} 词。`,
    '每个论点都配一个具体例子，能直接提升 Task Response。',
    '积累并正确使用 3–5 个话题高级词替换基础词。',
    '用连接词把段落串成清晰逻辑线。',
  ];

  return { wordCount: wc, minWords, meets, scores: { taskResponse, coherence, lexical, grammar }, overall, issues, advancedVersion: adv, suggestions };
}

// ---------------- Speaking Analysis ----------------
export function speakingAnalyze(transcript, prompt) {
  const t = (transcript || '').trim();
  const w = words(t);
  const wc = w.length;
  const sents = sentences(t);
  const lower = t.toLowerCase();
  let fillerCount = 0;
  FILLERS.forEach(f => { const m = lower.match(new RegExp('\\b' + f + '\\b', 'g')); if (m) fillerCount += m.length; });
  const unique = new Set(w.map(x => x.toLowerCase().replace(/[^a-z']/g, '')));
  const diversity = wc ? unique.size / wc : 0;
  const longPauses = (t.match(/\.\.\.|—+| {3,}/g) || []).length;

  const fluency = clamp(9 - fillerCount * 0.6 - longPauses * 0.5 - (wc < 30 ? 2 : 0));
  const vocabulary = clamp(4 + diversity * 6 + (wc > 60 ? 1 : 0));
  const grammar = clamp(wc > 20 ? 5.5 : 4);
  const pronunciation = clamp(6 + (fillerCount === 0 ? 1 : 0));
  const content = clamp(sents.length >= 3 ? 6 : 4);
  const band = Math.round(((fluency + vocabulary + grammar + pronunciation) / 4) * 2) / 2;

  const issues = [];
  if (fillerCount >= 3) issues.push({ label: '填充词偏多', detail: `检测到 ${fillerCount} 处 um/uh/like 等，会拉低流利度。试着在思考时安静停顿，而不是用 filler 填补。` });
  if (diversity < 0.45) issues.push({ label: '词汇重复', detail: '用词重复度较高，建议同一意思换种表达，展示词汇量。' });
  if (wc < 30) issues.push({ label: '内容偏短', detail: '回答过短，尽量展开 2–3 句话并举例。' });
  if (longPauses >= 2) issues.push({ label: '停顿较长', detail: '出现多次长停顿，可用连接词过渡，保持语流。' });

  const suggestions = [
    '回答前用 3 秒想好「观点 + 理由 + 例子」结构。',
    '用 however / because / for example 串起句子。',
    'filler 多时改为安静停顿，反而更显流利。',
  ].slice(0, 3);

  return { wordCount: wc, fillerCount, diversity: Math.round(diversity * 100), scores: { fluency, vocabulary, grammar, pronunciation, content }, band, issues, suggestions };
}
function clamp(x) { return Math.max(1, Math.min(9, Math.round(x * 2) / 2)); }

// ---------------- Weakness analysis (Error Book) ----------------
export function weaknesses(errors) {
  const byTag = {};
  errors.forEach(e => { const k = e.tag || e.type || '其他'; byTag[k] = (byTag[k] || 0) + 1; });
  const top = Object.entries(byTag).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => ({ name: k, count: n }));
  const advice = {
    '长难句': '每天做 1 篇长难句拆解，标主干与修饰。',
    'Reading 判断': '练习 True / False / Not Given 的「原文未提及 = Not Given」规则。',
    '时态': '用时间轴法复习 4 个基础时态，并做填空练习。',
    'Vocabulary': '把错词本加入每日复习，听音→拼写→造句三循环。',
    'Grammar': '回到对应语法课，做互动练习直到连续答对。',
    'Listening': '做精听：听一句写一句，对照原文改正。',
    'Writing': '用写作计时器限时写，再让 AI 批改形成闭环。',
    'Speaking': '每天 5 分钟跟读 + 1 个口语题库回答。',
  };
  return { top: top.length ? top : [{ name: '暂无明显薄弱点', count: 0 }], advice };
}

// ---------------- Study Plan generator ----------------
export function plan(input) {
  const phases = [
    { name: '英语基础', weeks: 2, focus: '字母、发音、核心 500 词、一般现在/过去/将来时。', daily: ['每日单词 15 个', '语法基础课 1 节', '跟读 5 分钟'] },
    { name: '词汇与语法强化', weeks: 3, focus: `按考试高频词表扩展，系统学从句、条件句与写作语法。`, daily: ['每日单词 20 个', '语法课 1 节 + 练习', '造 3 个复杂句'] },
    { name: '听读基础', weeks: 3, focus: '基础听力精听 + 基础阅读技巧（扫读、主旨、细节）。', daily: ['听力 1 篇精听', '阅读 1 篇 + 题', '积累同义替换'] },
    { name: `${input.exam.toUpperCase()} 入门`, weeks: 3, focus: `熟悉 ${input.exam.toUpperCase()} 四科结构与题型。`, daily: [`${input.exam} 单科专项 1 节`, '真题 1 组', '错题复盘'] },
    { name: '四科专项突破', weeks: 4, focus: '按薄弱项重点训练，AI 批改写作与口语。', daily: ['写作 1 篇 + AI 批改', '口语模拟 1 次', '听力/阅读各 1 组'] },
    { name: '真题与模考', weeks: 3, focus: '刷官方 sample / practice，每周 1 次完整模考。', daily: ['真题 1 套', '模考（周末）', '分数报告分析'] },
    { name: '冲刺', weeks: 2, focus: '查漏补缺，稳定节奏，调整心态。', daily: ['弱项专训', '限时模考', '错题本清空计划'] },
  ];
  const totalWeeks = phases.reduce((a, p) => a + p.weeks, 0);
  const today = new Date();
  const day1 = new Date(today.getTime() + 86400000);
  const examDay = input.examDate ? new Date(input.examDate) : new Date(today.getTime() + totalWeeks * 7 * 86400000);
  return {
    input, phases, totalWeeks,
    examDay: examDay.toISOString().slice(0, 10),
    startDay: day1.toISOString().slice(0, 10),
    todayTask: phases[0].daily,
  };
}

export const BAND_SCALE = {
  9: '专家级：完全掌握，极少错误。', 8: '非常好：偶有小错，表达自如。', 7: '好：能驾驭复杂语言，偶有不准确。',
  6: '胜任：整体有效，但有不准确处。', 5: '一般：部分掌握，错误较多。', 4: '有限：仅限熟悉场景。',
};

// ---------------- Guided Practice Coach（引导练习）----------------
// 结构：定边界 → 切小片 → 用户先产出 → 按标准反馈 → 收尾留证据。
// 原则：默认不代答。演示 ≠ 能力，进度只认用户独立完成的产出。

export const COACH_KINDS = [
  { key: 'speaking', label: '口语 · 独立输出' },
  { key: 'writing', label: '写作 · 段落产出' },
  { key: 'vocab', label: '词汇 · 语境运用' },
  { key: 'grammar', label: '语法 · 结构准确' },
  { key: 'listening', label: '听力 · 信息抓取' },
  { key: 'reading', label: '阅读 · 主旨与细节' },
];

// 最小会话协议：先对齐这六项再开始，避免 AI 与用户对「做好」的定义不一致
export const COACH_FIELDS = [
  { key: 'goal', label: '目标', ph: '如：3 分钟解释一个观点', req: true },
  { key: 'audience', label: '受众', ph: '如：雅思考官 / 外国同事', req: true },
  { key: 'bar', label: '验收标准', ph: '如：60–90 秒、无稿、含 3 个细节', req: true },
  { key: 'input', label: '输入材料', ph: '如：题目 / 文章标题（可选）', req: false },
  { key: 'limits', label: '限制', ph: '如：20 分钟、不查词（可选）', req: false },
  { key: 'unknown', label: '未知项', ph: '如：某个搭配不确定（可选）', req: false },
];

const COACH_SLICES = {
  speaking: [
    { t: '只说结论：用 1 句话给出你的核心观点（15–25 词）。', bar: '一句成句、立场明确、不超过 25 词。' },
    { t: '补一层支撑：加 1 个理由 + 1 个具体例子（2–3 句，30–50 词）。', bar: '有 because / for example，例子是具体事件而非泛泛而谈。' },
    { t: '连成完整回答：开头给结论，中间展开，结尾回扣（60–90 词）。', bar: '结构完整、有连接词、无明显 filler。' },
  ],
  writing: [
    { t: '写主题句：一句说明本段立场（≤ 25 词）。', bar: '立场可被反驳，不是事实陈述。' },
    { t: '展开：1 个论点 + 1 个具体例子（2–3 句，40–60 词）。', bar: '例子具体，含数据 / 场景 / 时间之一。' },
    { t: '收束：1 句总结并回扣立场，检查连接词与句式变化。', bar: '有 therefore / in short 之类收束词，长短句交错。' },
  ],
  vocab: [
    { t: '用目标词造 1 句，语境要能让读者猜出词义。', bar: '句子自带语境线索，不是词典式定义。' },
    { t: '换一个场景再造 1 句，避免与第一句结构重复。', bar: '场景不同、句型不同。' },
    { t: '把两句合并为 1 个复合句，用连接词体现关系。', bar: '连接词准确表达因果 / 转折 / 递进。' },
  ],
  grammar: [
    { t: '写 1 个简单句，时态与目标结构一致。', bar: '主谓一致、时态正确。' },
    { t: '改写为复合句，加入从句（定从 / 状从 / 名词性从句均可）。', bar: '从句引导词正确，主句完整。' },
    { t: '再写 1 句，并用中文 1 行说明你为什么用这个结构。', bar: '英文句正确 + 中文理由说到点上。' },
  ],
  listening: [
    { t: '第一遍：用 1 句写出主旨（不看文本）。', bar: '一句话概括，不含细节。' },
    { t: '第二遍：补 3 个细节（数字 / 人名地名 / 转折处）。', bar: '3 条各 ≤ 12 词，至少 1 条是数字或专名。' },
    { t: '第三遍：复述结构，并说明说话人态度。', bar: '说出信息组织方式 + 态度词（supportive / skeptical 等）。' },
  ],
  reading: [
    { t: '用 1 句写出全文主旨（≤ 25 词）。', bar: '覆盖全文而非只覆盖首段。' },
    { t: '列 3 个支撑细节（各 ≤ 12 词）。', bar: '细节来自不同段落。' },
    { t: '提 1 个质疑或推断，并给出原文依据。', bar: '有依据引用，区分「原文有」与「我推断」。' },
  ],
};

// 仅在用户显式请求时展示（默认不给完整答案）
const COACH_REF = {
  speaking: [
    'I think cities should put more money into public transport.',
    'For example, when my city added two bus lines last year, my commute dropped from 50 to 30 minutes.',
    'In short, better buses cut both traffic and pollution, so the extra spending pays off.',
  ],
  writing: [
    'Public transport deserves a larger share of the city budget.',
    'It moves far more people per hour than private cars, so it eases congestion at peak times.',
    'Therefore, while the upfront cost is high, the long-term gains in time and air quality justify the investment.',
  ],
  vocab: [
    'The new timetable had a beneficial effect on my commute.',
    'Remote work proved effective for focused tasks, though not for brainstorming.',
    'Although remote work suits focused tasks, brainstorming still works better in person.',
  ],
  grammar: [
    'She has lived in Chengdu for six years.',
    'She has lived in Chengdu for six years, which surprises everyone who hears her accent.',
    'If I had known the deadline, I would have started earlier. ——与过去事实相反，用第三条件句。',
  ],
  listening: [
    'The talk is about how urban noise affects sleep quality.',
    '1) 68% of respondents | 2) Dr. Helen Reyes, Leeds | 3) but rural areas differed',
    'The speaker moves problem, evidence, then solutions, and sounds cautiously optimistic about policy fixes.',
  ],
  reading: [
    'The article argues that sleep, not study time, drives language retention.',
    '1) night-shift group scored 18% lower | 2) REM linked to vocab recall | 3) effect held across ages',
    'The sample is all university students, so I doubt it generalises to older learners. ——样本是原文，泛化是我的推断。',
  ],
};

export const COACH_SYS = 'You are SUA English guided-practice coach. You never do the learner\'s work for them. Rules: (1) restate the task boundary before starting; (2) give ONE small checkable slice at a time; (3) wait for the learner\'s own output before commenting; (4) evaluate against the stated acceptance bar, say pass or not pass, then give at most ONE fix; (5) never produce a full model answer unless the learner explicitly asks; (6) end with four items: 完成 / 证据 / 错误 / 下一步. Reply in the learner\'s language (Chinese if they write Chinese), but keep English examples in English. Be concise.';

// 边界复述：先对齐「做好」的定义，再开始
export function coachBrief(b) {
  b = b || {};
  const L = ['边界确认（先对齐，再开始）：'];
  COACH_FIELDS.forEach(f => {
    const v = (b[f.key] || '').trim();
    L.push(`· ${f.label}：${v || '（未填）'}`);
  });
  const miss = COACH_FIELDS.filter(f => f.req && !(b[f.key] || '').trim()).map(f => f.label);
  if (miss.length) L.push(`· 待补：${miss.join('、')} —— 可以先开始，但补齐后反馈会更准。`);
  L.push('');
  L.push('规则：一次只推一个可检查的小片；你先产出，我按验收标准反馈；默认不直接给完整答案，需要范例请点「直接给范例」。');
  return L.join('\n');
}

export function coachSlices(b) {
  const kind = (b && b.kind) || 'speaking';
  return (COACH_SLICES[kind] || COACH_SLICES.speaking).map((s, i) => ({ i, t: s.t, bar: s.bar }));
}

export function coachReference(b, idx) {
  const kind = (b && b.kind) || 'speaking';
  const arr = COACH_REF[kind] || COACH_REF.speaking;
  return arr[Math.min(idx, arr.length - 1)];
}

// 按完成标准反馈：先判是否达标，再只给一条修改建议，不代答
export function coachFeedback(b, idx, ans) {
  const text = (ans || '').trim();
  const wc = words(text).length;
  const lower = text.toLowerCase();
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  const engRatio = text.length ? latin / text.length : 0;
  let fillers = 0;
  FILLERS.forEach(f => { const m = lower.match(new RegExp('\\b' + f + '\\b', 'g')); if (m) fillers += m.length; });
  const hasLinker = LINKERS.some(l => lower.includes(l));
  const concrete = /\d/.test(text) || /e\.g\.|for example|for instance/i.test(lower);

  const minW = [8, 25, 45][Math.min(idx, 2)];
  const checks = [];
  checks.push({
    label: `长度 ≥ ${minW} 词`,
    ok: wc >= minW,
    tip: wc ? `现在 ${wc} 词，还差 ${minW - wc} 词。补一个具体细节就够，不要为了凑字数重复。` : '还没有内容。先写出第一句，粗糙没关系，先有可改的东西。',
  });
  checks.push({
    label: '用英语产出',
    ok: engRatio >= 0.5,
    tip: '中文占比偏高。切片练习请用英文写，中文只用来备注理由。',
  });
  if (idx >= 1) checks.push({
    label: '连接词串逻辑',
    ok: hasLinker,
    tip: '加一个 because / however / for example，让两句之间的关系显出来。',
  });
  if (idx >= 2) checks.push({
    label: '有具体支撑',
    ok: concrete || wc >= minW + 15,
    tip: '这一片要有具体支撑：一个数字、一个专名，或一个可验证的场景。',
  });
  checks.push({
    label: 'filler 不多',
    ok: fillers <= 2,
    tip: `检测到 ${fillers} 处 um / uh / like。思考时安静停顿，比用 filler 填空更显流利。`,
  });

  const failed = checks.filter(x => !x.ok);
  return {
    pass: failed.length === 0,
    checks,
    verdict: failed.length ? '未通过。只改下面这一处，再交一次。' : '通过。这一片达到标准。',
    oneFix: failed.length ? failed[0].tip : '',
    bar: (b && b.bar) || '',
  };
}

// 收尾四项：完成 / 证据 / 错误 / 下一步
export function coachWrap(b, log) {
  const total = (log || []).length;
  const okN = (log || []).filter(x => x.pass).length;
  const passed = (log || []).filter(x => x.pass).map(x => String(x.ans || '').trim());
  const evidence = passed.sort((x, y) => y.length - x.length)[0]
    || (total ? String(log[total - 1].ans || '').trim() : '');
  const errors = (log || []).filter(x => !x.pass)
    .map(x => `切片 ${x.i + 1}：${(x.fb && x.fb.oneFix) || '未达标'}`);
  const lastPass = total ? !!log[total - 1].pass : false;
  const next = lastPass
    ? '把三片连成一次完整产出并保存成样本；下周同主题重做一遍，比较两次的差异。'
    : '只重做未通过的那一两片，不要推翻整套。同一处连续三次没过，才算需要换方法的模式。';
  return { done: `${okN}/${total} 个切片独立达标`, evidence, errors, next };
}

// 走真实模型；未配置或任何失败返回 null，调用方回退本地规则。
// 与自由对话共用同一条三级回退链，引导练习也能吃到服务端代理。
export async function coachLlm(messages, opts = {}) {
  const res = await aiChat(messages, { scene: 'coach', system: COACH_SYS, temperature: 0.4, ...opts });
  return res && res.text ? res.text : null;
}

// ---------------- Optional LLM hook (user-supplied OpenAI-compatible gateway) ----------------
// 生产环境应把密钥放后端代理；这里作为个人本地试用通道，密钥仅存于本机 localStorage。
// 未配置或任何失败都返回 null，调用方据此回退到本地规则引擎。
export const LLM_MODELS = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'claude-3-5-sonnet', 'deepseek-chat', 'qwen-plus', 'glm-4'];
const LLM_TIMEOUT = 15000;
const LLM_KEY = 'sua_llm';

export function readLlmCfg() {
  try {
    const c = JSON.parse(localStorage.getItem(LLM_KEY) || 'null');
    if (c && c.base && c.key) return c;
  } catch (e) { /* ignore */ }
  return null;
}

function chatUrl(base) {
  let u = String(base || '').trim();
  if (!/^https?:\/\//i.test(u)) return null;
  u = u.replace(/\/+$/, '');
  if (!/\/chat\/completions$/i.test(u)) u += '/chat/completions';
  return u;
}

// messages: [{role:'user'|'assistant'|'system', content}]
// opts: { system, temperature, cfg }
// 返回模型文本字符串；任何异常/非 2xx/解析失败均返回 null
export async function llmChat(messages, opts = {}) {
  const cfg = opts.cfg || readLlmCfg();
  if (!cfg) return null;
  const url = chatUrl(cfg.base);
  if (!url) return null;
  const body = {
    model: cfg.model || 'gpt-4o-mini',
    messages: opts.system ? [{ role: 'system', content: opts.system }, ...messages] : messages,
    temperature: opts.temperature != null ? opts.temperature : 0.7,
    stream: false,
  };
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), LLM_TIMEOUT);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.key },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const j = await res.json().catch(() => null);
    const c = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    return c ? String(c).trim() : null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(tid);
  }
}
