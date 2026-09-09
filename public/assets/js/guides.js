// assets/js/guides.js — Phase E：微学习指南（原创改写，CC BY-NC 合规）
//
// 设计说明（务必阅读）：
//  - 本仓库方法论受 byoungd/up《AI 时代终身学习指南》启发，但**全部用户可见文案均为
//    平台自有语气原创重写**，未照搬上游正文（上游正文为 CC BY-NC 4.0，禁止商用搬运）。
//  - 每张卡片底部保留「方法参考」署名 + 仓库链接，符合 CC BY 署名精神（见 GUIDE_SOURCE）。
//  - 渲染函数 guideCard() 供 learn.js（科目页方法锦囊）与 bank.js（计划弹窗推荐）复用。

import { icon } from './ui.js';

// CC BY 署名：方法来源 + 仓库链接（卡片底部统一展示）
export const GUIDE_SOURCE = {
  text: '方法参考：byoungd/up《AI 时代终身学习指南》',
  url: 'https://github.com/byoungd/up',
};

// 七篇原创短指南。accent 用现有降饱和技能色，icon 取自 ui.js 图标集。
// 字段：subject(键) / accent(左侧色) / icon / title / intro / points[{h,b}]
export const GUIDES = {
  cognition: {
    subject: 'cognition',
    accent: 'var(--brand)',
    icon: 'bulb',
    title: '先搞清「为什么学」再开始',
    intro: '每天刷题前，先用一句话写下今天要补的能力缺口。带着目标练，比闷头刷 50 题更见效。',
    points: [
      { h: '用证据代替感觉', b: '把「我听懂了」换成「我能复述大意、写出三个细节」。能独立产出，才算真会。' },
      { h: '低谷日就做最小剂量', b: '状态差的那天只做 5 分钟，也比停一天好。连续比强度重要，断一天容易断一周。' },
      { h: '区分波动和模式', b: '某一项连续三周都弱，才值得改计划；只差一周，先按原计划来。' },
    ],
  },
  vocabulary: {
    subject: 'vocabulary',
    accent: 'var(--c-vocab)',
    icon: 'book',
    title: '在句子里记词，不在列表里背',
    intro: '孤立的单词过一夜大半会忘；放进你自己的例句，记忆会牢固很多。',
    points: [
      { h: '一次只精学少量', b: '每天 10 到 30 个，配例句、搭配、发音。量大不等于记得住。' },
      { h: '用复习曲线对抗遗忘', b: '答错的词当天回看，之后按 1 天、6 天、渐增天间隔复习，比考前突击有效。' },
      { h: '主动用出来', b: '今天新学的词，试着在口语或写作里用一次。用过的词，才真正变成你的。' },
    ],
  },
  listening: {
    subject: 'listening',
    accent: 'var(--c-listen)',
    icon: 'headphones',
    title: '精听一句，胜过泛听十篇',
    intro: '听不懂往往不是词汇量，而是连读、弱读和语速。逐句拆开听，进步才明显。',
    points: [
      { h: '听一句写一句', b: '选 30 秒材料，听写后对照原文，标出没听出的地方，再跟读两遍。' },
      { h: '慢速到常速', b: '先 0.7 倍速听清，再回到原速。直接冲原速，容易陷入自我怀疑。' },
      { h: '抓主干不看全', b: '第一遍抓「谁、做了什么」，细节第二遍补。别试图字字听懂。' },
    ],
  },
  reading: {
    subject: 'reading',
    accent: 'var(--c-read)',
    icon: 'doc',
    title: '先定位，再理解',
    intro: '考试阅读考的是「在原文找到依据」，不是通篇精读。学会定位句，速度立刻上来。',
    points: [
      { h: '题干回原文', b: '拿题干关键词回原文扫读定位句，答案九成在定位句附近。' },
      { h: 'Not Given 是「没提」', b: '原文既不支持也不反对，就是 Not Given，别脑补成 False。' },
      { h: '长难句拆主干', b: '先找主谓宾，从句和修饰先跳过，看懂骨架再补血肉。' },
    ],
  },
  speaking: {
    subject: 'speaking',
    accent: 'var(--c-speak)',
    icon: 'mic',
    title: '说满比说对更重要',
    intro: '口语卡壳，多半是因为想完美而开不了口。先连续说满两分钟，流利度会自己上来。',
    points: [
      { h: '用结构撑住思路', b: 'Part 2 用「观点—原因—例子—总结」四步，没词也不冷场。' },
      { h: '录下来自己听', b: '回放找填充词（um、you know）和卡顿，下次刻意少说，比找外教便宜。' },
      { h: '同义替换', b: '同一意思换种说法（good → beneficial、preferable），词汇分立刻好看。' },
    ],
  },
  writing: {
    subject: 'writing',
    accent: 'var(--c-write)',
    icon: 'edit',
    title: '结构清晰，胜过华丽词藻',
    intro: '考官先看逻辑和任务完成度。先把段落结构立住，再打磨高级表达。',
    points: [
      { h: '一段一个中心', b: '每段开头一句亮明观点，后面用解释加例子支撑，别一段塞三个想法。' },
      { h: '连接词用准', b: '然而、此外、换言之，用对位置才加分；堆连接词反而乱。' },
      { h: '写完必自查', b: '检查字数、时态一致、主谓一致。这三项错得最多，也最容易改。' },
    ],
  },
  ai: {
    subject: 'ai',
    accent: 'var(--accent)',
    icon: 'sparkles',
    title: '让 AI 当陪练，别当答案机',
    intro: 'AI 直接给答案，你记住的是它的思路；AI 只引导、你亲手做，你才长本事。',
    points: [
      { h: '先写边界再动手', b: '把目标、受众、验收标准说清，AI 才不会跑偏，你也更清楚要什么。' },
      { h: '一次一个切片', b: '别让 AI 一口气写完。每次只要一个可检查的小步，做完再要下一步。' },
      { h: '留证据', b: '把你的产出和 AI 的反馈存下来，比存一段聊天记录有用。下次直接看进步。' },
    ],
  },
};

// 渲染一张指南卡片。opts.hot=true 时加「本周占比偏低」高亮（与动态配比联动）。
export function guideCard(key, opts = {}) {
  const g = GUIDES[key];
  if (!g) return '';
  const hot = !!opts.hot;
  const pts = (g.points || []).map((p) => `<div class="guide-pt">
      <span class="dot dot-success"></span>
      <div><b>${p.h}</b><div class="muted mt-1">${p.b}</div></div>
    </div>`).join('');
  return `<div class="guide ${hot ? 'hot' : ''}" style="--accent-c:${g.accent}">
    <div class="guide-head">
      <span class="guide-ic">${icon(g.icon, { size: 20 })}</span>
      <div class="guide-title">${g.title}</div>
      ${hot ? '<span class="chip chip-warn" style="margin-left:auto">本周占比偏低 · 建议重点看</span>' : ''}
    </div>
    <div class="guide-intro mt-2">${g.intro}</div>
    <div class="guide-list">${pts}</div>
    <div class="guide-source"><a href="${GUIDE_SOURCE.url}" target="_blank" rel="noopener">${GUIDE_SOURCE.text} ↗</a></div>
  </div>`;
}

// 低占比阈值：某科目在当日计划中的权重占比低于此值即视为「偏低」，高亮推荐。
export const LOW_SHARE_THRESHOLD = 0.18;
