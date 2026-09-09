/**
 * 语域阶梯种子脚本 —— 为 RegisterPhrase 表灌入「同一语义的四档语域表达」。
 *
 * 设计意图（见 .workbuddy/research/language-stratification.md）：
 *   语言分化阶层，不发生在「说得对不对」，而发生在「第几层被听见」。
 *   四档语法全对，但能进的房间不同。本表是「四档改写」训练的数据底座。
 *
 * 数据结构：
 *   cluster  语义簇 key        cheap / late / no ...
 *   tiers    固定四档，顺序即 order 0-3
 *            casual → neutral → professional → executive
 *   rooms    四档各自对应的典型场合
 *            factory 车间验厂 | expo 展会 | proposal 客户提案
 *            email 邮件往来 | board 董事会 | meeting 跨部门会议
 *
 * 用法：
 *   DATABASE_URL="file:./dev.db" node prisma/seed-register.cjs
 *
 * 幂等：按 [cluster, register, phrase] 唯一键预检，已存在的跳过，可重复执行。
 * 内容来源：手工编写，面向出海/职场高频场景，无外部版权依赖。
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const REGISTERS = ['casual', 'neutral', 'professional', 'executive'];
const ROOMS = ['factory', 'expo', 'proposal', 'email', 'board', 'meeting'];

// 每行: [phrase, phraseCn]
const CLUSTERS = [
  // ---------- 价格 / 成本 ----------
  { key: 'cheap', cn: '价格低', rooms: ['factory', 'email', 'proposal', 'board'], tiers: [
    ["It's cheap.", '很便宜'],
    ["It's affordable.", '价格可承受'],
    ["It's cost-effective.", '性价比高'],
    ['The unit economics are compelling.', '单位经济效益很有说服力'],
  ] },
  { key: 'expensive', cn: '价格高', rooms: ['factory', 'email', 'proposal', 'board'], tiers: [
    ["It's too expensive.", '太贵了'],
    ["It's a bit pricey.", '有点贵'],
    ["It's at the higher end of the range.", '处于价格区间上端'],
    ["It's a premium we haven't earned yet.", '这是个我们尚未支撑起来的溢价'],
  ] },
  { key: 'discount', cn: '要折扣', rooms: ['factory', 'email', 'proposal', 'board'], tiers: [
    ['Can you give a discount?', '能便宜点吗'],
    ['Is there any flexibility on price?', '价格上还有空间吗'],
    ["What's your best terms at this volume?", '这个量级下最优惠的条件是什么'],
    ['At what volume does the pricing step down?', '到什么量级价格会阶梯下调'],
  ] },
  { key: 'profit', cn: '盈利', rooms: ['factory', 'email', 'proposal', 'board'], tiers: [
    ['We make good money on this.', '这个我们赚得不错'],
    ["We're profitable on this line.", '这条产品线是盈利的'],
    ['The margin profile is healthy.', '毛利结构健康'],
    ['Gross margin is holding at 38%.', '毛利率维持在 38%'],
  ] },
  { key: 'loss', cn: '亏损', rooms: ['factory', 'email', 'proposal', 'board'], tiers: [
    ["We're losing money.", '我们在亏钱'],
    ["This line isn't covering costs.", '这条线收不回成本'],
    ["We're running below break-even.", '目前处于盈亏平衡点以下'],
    ['This SKU is dilutive to blended margin.', '这个 SKU 在稀释综合毛利'],
  ] },

  // ---------- 质量 / 产品 ----------
  { key: 'goodQuality', cn: '质量好', rooms: ['factory', 'email', 'proposal', 'board'], tiers: [
    ['The quality is really good.', '质量真不错'],
    ['The quality is consistent.', '质量稳定'],
    ['It meets spec on every batch.', '每批次都符合规格'],
    ['Our defect rate is under 0.3%.', '不良率低于 0.3%'],
  ] },
  { key: 'badQuality', cn: '质量差', rooms: ['factory', 'email', 'proposal', 'board'], tiers: [
    ['The quality is bad.', '质量不行'],
    ["The quality isn't up to standard.", '质量不达标'],
    ["We're seeing variance against spec.", '与规格存在偏差'],
    ['Batch-to-batch consistency is our binding constraint.', '批次一致性是我们的硬约束'],
  ] },
  { key: 'problem', cn: '出问题', rooms: ['factory', 'email', 'proposal', 'board'], tiers: [
    ['We have a problem.', '出问题了'],
    ["We've hit an issue.", '遇到个情况'],
    ["We've identified a risk to the timeline.", '发现一个影响进度的风险'],
    ["There's a structural issue in the supply chain.", '供应链存在结构性问题'],
  ] },
  { key: 'improve', cn: '改进', rooms: ['meeting', 'email', 'proposal', 'board'], tiers: [
    ["Let's make it better.", '改好一点'],
    ["Let's improve this.", '改进一下'],
    ["Let's optimize the process.", '优化一下流程'],
    ['We need to re-architect the workflow.', '需要重构工作流'],
  ] },
  { key: 'newProduct', cn: '新产品', rooms: ['factory', 'email', 'expo', 'board'], tiers: [
    ['We made a new thing.', '我们做了个新东西'],
    ["We've launched a new product.", '我们出了新品'],
    ["We're introducing a new line this quarter.", '本季度推出新系列'],
    ["We're extending the portfolio into an adjacent category.", '产品组合向相邻品类延伸'],
  ] },

  // ---------- 交付 / 供应 ----------
  { key: 'late', cn: '延期', rooms: ['factory', 'email', 'proposal', 'board'], tiers: [
    ["It's late.", '晚了'],
    ["We're behind schedule.", '进度落后了'],
    ["We're tracking two weeks behind the agreed date.", '比约定日期落后约两周'],
    ['The critical path has slipped by fourteen days.', '关键路径已滑移十四天'],
  ] },
  { key: 'fast', cn: '速度快', rooms: ['factory', 'email', 'proposal', 'board'], tiers: [
    ["We'll do it fast.", '我们快点做'],
    ["We'll do it quickly.", '我们会尽快'],
    ['We can turn this around in five business days.', '五个工作日内可以交付'],
    ['Lead time compresses to five days at scale.', '规模化后交付周期压缩至五天'],
  ] },
  { key: 'stock', cn: '有库存', rooms: ['factory', 'email', 'proposal', 'board'], tiers: [
    ['We have it in stock.', '有现货'],
    ["It's available now.", '目前有货'],
    ['We hold safety stock for this SKU.', '该 SKU 备有安全库存'],
    ['We carry forty-five days of cover.', '我们保持四十五天库存覆盖'],
  ] },
  { key: 'capacity', cn: '产能', rooms: ['factory', 'email', 'expo', 'board'], tiers: [
    ['We can make a lot.', '我们能做很多'],
    ['We have capacity.', '我们有产能'],
    ["We're running at seventy percent utilization.", '目前产能利用率七成'],
    ['We have headroom for three times current volume.', '现有产能可支撑三倍规模'],
  ] },
  { key: 'supplier', cn: '供应商', rooms: ['factory', 'email', 'proposal', 'board'], tiers: [
    ['The guy we buy from.', '我们进货的那家'],
    ['Our supplier.', '我们的供应商'],
    ['Our tier-one supplier.', '我们的一级供应商'],
    ['Our strategic sourcing partner.', '我们的战略采购伙伴'],
  ] },

  // ---------- 沟通 / 协商 ----------
  { key: 'sorry', cn: '道歉', rooms: ['factory', 'email', 'proposal', 'board'], tiers: [
    ['Sorry about that.', '不好意思'],
    ['Apologies for the delay.', '抱歉耽误了'],
    ['We regret the inconvenience this caused.', '对此造成的不便我们深表歉意'],
    ['We take full accountability for the shortfall.', '我们对这次缺口承担全部责任'],
  ] },
  { key: 'wait', cn: '稍等', rooms: ['factory', 'email', 'proposal', 'board'], tiers: [
    ['Wait a second.', '等一下'],
    ['Could you give me a moment?', '稍等一下好吗'],
    ['Let me confirm and come back to you.', '我确认后回复您'],
    ["I'll revert with a validated position.", '我会带着经过核实的立场回复'],
  ] },
  { key: 'no', cn: '拒绝', rooms: ['meeting', 'email', 'proposal', 'board'], tiers: [
    ["No, we can't.", '不行'],
    ["I'm afraid that's not possible.", '恐怕不行'],
    ["That's outside our current scope.", '这超出了我们当前的服务范围'],
    ["That doesn't align with our strategic priorities.", '这与我们的战略优先级不一致'],
  ] },
  { key: 'agree', cn: '同意', rooms: ['meeting', 'email', 'proposal', 'board'], tiers: [
    ['OK, sure.', '行，好的'],
    ['I agree.', '我同意'],
    ['That works for us.', '这个方案我们可以接受'],
    ["That's consistent with our thesis.", '这与我们的判断一致'],
  ] },
  { key: 'disagree', cn: '不同意', rooms: ['meeting', 'email', 'proposal', 'board'], tiers: [
    ["I don't think so.", '我不这么想'],
    ['I see it differently.', '我的看法不太一样'],
    ["I'd challenge that assumption.", '我想质疑一下这个假设'],
    ["The data doesn't support that conclusion.", '数据并不支持这个结论'],
  ] },
  { key: 'dontKnow', cn: '不知道', rooms: ['factory', 'email', 'proposal', 'board'], tiers: [
    ['I have no idea.', '我不知道'],
    ["I'm not sure.", '我不太确定'],
    ['Let me verify and get back to you.', '我核实后回复您'],
    ["I don't have the data to answer that yet.", '目前尚缺乏支撑该结论的数据'],
  ] },
  { key: 'askHelp', cn: '求助', rooms: ['factory', 'email', 'meeting', 'board'], tiers: [
    ['Can you help me?', '能帮个忙吗'],
    ['Could you help with this?', '能帮一下吗'],
    ["I'd appreciate your support on this.", '希望得到您的支持'],
    ["I'd like to bring you in on this.", '希望把您引入这件事'],
  ] },

  // ---------- 进度 / 执行 ----------
  { key: 'done', cn: '已完成', rooms: ['factory', 'email', 'meeting', 'board'], tiers: [
    ["It's done.", '做完了'],
    ["It's finished.", '完成了'],
    ["It's complete and ready for review.", '已完成，可交付评审'],
    ['The deliverable is signed off.', '交付物已签署确认'],
  ] },
  { key: 'notDone', cn: '未完成', rooms: ['factory', 'email', 'meeting', 'board'], tiers: [
    ['Not yet.', '还没'],
    ["It's still in progress.", '还在进行中'],
    ["We're at eighty percent completion.", '目前完成度八成'],
    ['The remaining scope is non-blocking.', '剩余范围不构成阻塞'],
  ] },
  { key: 'busy', cn: '忙碌', rooms: ['factory', 'email', 'meeting', 'board'], tiers: [
    ["I'm swamped.", '忙死了'],
    ["I'm pretty tied up right now.", '我现在比较忙'],
    ['My bandwidth is constrained this week.', '本周我的精力比较紧张'],
    ["I'm at capacity through Thursday.", '周四前我的排期已满'],
  ] },
  { key: 'start', cn: '启动', rooms: ['meeting', 'email', 'proposal', 'board'], tiers: [
    ["Let's start.", '开始吧'],
    ["Let's get started.", '我们开始吧'],
    ["Let's kick this off.", '我们正式启动'],
    ["Let's move this into execution.", '让这件事转入执行'],
  ] },
  { key: 'stop', cn: '中止', rooms: ['meeting', 'email', 'proposal', 'board'], tiers: [
    ['Stop it.', '停'],
    ["Let's pause here.", '先停一下'],
    ["Let's put this on hold.", '先搁置'],
    ["We're deprioritizing this initiative.", '我们正在下调该项目的优先级'],
  ] },
  { key: 'changePlan', cn: '改计划', rooms: ['meeting', 'email', 'proposal', 'board'], tiers: [
    ['We changed our minds.', '我们改主意了'],
    ["We've adjusted the plan.", '我们调整了计划'],
    ["We've revised the roadmap.", '我们修订了路线图'],
    ["We're reallocating to a higher-yield bet.", '我们把资源重新配置到回报更高的方向'],
  ] },

  // ---------- 观点 / 说服 ----------
  { key: 'iThink', cn: '表达观点', rooms: ['meeting', 'email', 'proposal', 'board'], tiers: [
    ['I think...', '我觉得'],
    ['In my view...', '我认为'],
    ["Based on what we're seeing...", '基于目前掌握的情况'],
    ['The evidence points to...', '证据指向'],
  ] },
  { key: 'important', cn: '重要', rooms: ['meeting', 'email', 'proposal', 'board'], tiers: [
    ['This is a big deal.', '这事挺大'],
    ['This is important.', '这很重要'],
    ['This is a priority.', '这是优先事项'],
    ['This is strategically material.', '这具有战略实质意义'],
  ] },
  { key: 'difficult', cn: '困难', rooms: ['meeting', 'email', 'proposal', 'board'], tiers: [
    ['This is hard.', '这挺难的'],
    ['This is tricky.', '这有点棘手'],
    ['This presents some complexity.', '这存在一定的复杂性'],
    ['This is a structurally hard problem.', '这是个结构性难题'],
  ] },
  { key: 'easy', cn: '容易', rooms: ['meeting', 'email', 'proposal', 'board'], tiers: [
    ["That's easy.", '那很简单'],
    ["That's straightforward.", '那个比较直接'],
    ["That's well within our capability.", '完全在我们能力范围内'],
    ["That's largely a solved problem for us.", '这对我们基本是已解决的问题'],
  ] },
  { key: 'risk', cn: '风险', rooms: ['meeting', 'email', 'proposal', 'board'], tiers: [
    ['Something might go wrong.', '可能会出事'],
    ["There's some risk.", '有一定风险'],
    ["We've identified three key risks.", '我们识别出三个关键风险'],
    ['This is our primary downside exposure.', '这是我们最主要的下行敞口'],
  ] },
  { key: 'opportunity', cn: '机会', rooms: ['meeting', 'email', 'proposal', 'board'], tiers: [
    ['Good chance for us.', '我们的机会'],
    ["There's an opportunity here.", '这里有机会'],
    ["There's a clear market gap.", '存在明确的市场空白'],
    ['This is a category-defining opportunity.', '这是个能定义品类的机会'],
  ] },
  { key: 'advantage', cn: '优势', rooms: ['expo', 'email', 'proposal', 'board'], tiers: [
    ["We're better at this.", '我们更擅长'],
    ['We have an edge.', '我们有优势'],
    ['This is our differentiation.', '这是我们的差异化所在'],
    ['This is our structural moat.', '这是我们的结构性护城河'],
  ] },
  { key: 'disadvantage', cn: '劣势', rooms: ['meeting', 'email', 'proposal', 'board'], tiers: [
    ["We're not good at this.", '我们不擅长'],
    ['This is a weak point.', '这是我们的弱项'],
    ['This is a capability gap.', '这是能力缺口'],
    ['This is a strategic vulnerability.', '这是战略上的脆弱点'],
  ] },

  // ---------- 结果 / 数据 ----------
  { key: 'increase', cn: '增长', rooms: ['factory', 'email', 'proposal', 'board'], tiers: [
    ["It's going up.", '在涨'],
    ["It's increasing.", '在增长'],
    ["We're seeing twenty percent growth quarter on quarter.", '环比增长两成'],
    ["We're compounding at twenty percent quarter over quarter.", '我们以两成的环比速度复利增长'],
  ] },
  { key: 'decrease', cn: '下降', rooms: ['factory', 'email', 'proposal', 'board'], tiers: [
    ["It's going down.", '在降'],
    ["It's declining.", '在下滑'],
    ["We're seeing a twelve percent contraction.", '出现一成二的收缩'],
    ['The category is in secular decline.', '该品类处于长期下行通道'],
  ] },
  { key: 'aLot', cn: '数量多', rooms: ['factory', 'email', 'proposal', 'board'], tiers: [
    ['A lot.', '很多'],
    ['A significant amount.', '相当多'],
    ['A substantial volume.', '相当可观的量'],
    ['Material scale.', '具备实质规模'],
  ] },
  { key: 'aLittle', cn: '数量少', rooms: ['factory', 'email', 'proposal', 'board'], tiers: [
    ['A little bit.', '一点点'],
    ['Slightly.', '略微'],
    ['Marginally.', '小幅'],
    ['Immaterial at this stage.', '现阶段影响不重大'],
  ] },
  { key: 'success', cn: '成功', rooms: ['meeting', 'email', 'proposal', 'board'], tiers: [
    ['It worked.', '成了'],
    ['It was successful.', '成功了'],
    ['We hit our targets.', '我们达成了目标'],
    ['We delivered against plan.', '我们按计划完成了交付'],
  ] },
  { key: 'failure', cn: '失败', rooms: ['meeting', 'email', 'proposal', 'board'], tiers: [
    ["It didn't work.", '没成'],
    ["It didn't succeed.", '没成功'],
    ['We missed the target.', '我们未达成目标'],
    ['We underperformed against plan.', '我们低于计划表现'],
  ] },

  // ---------- 关系 / 合作 ----------
  { key: 'thanks', cn: '致谢', rooms: ['factory', 'email', 'proposal', 'board'], tiers: [
    ['Thanks!', '谢谢'],
    ['Thank you.', '谢谢您'],
    ['I appreciate your help with this.', '感谢您的协助'],
    ["I'm grateful for your partnership on this.", '感谢您在其中的协作'],
  ] },
  { key: 'followUp', cn: '跟进', rooms: ['factory', 'email', 'meeting', 'board'], tiers: [
    ["I'll check later.", '我回头看看'],
    ["I'll follow up.", '我会跟进'],
    ["I'll follow up by Friday.", '我周五前跟进'],
    ["I'll close the loop by end of week.", '我会在周末前闭环'],
  ] },
  { key: 'meeting', cn: '开会', rooms: ['factory', 'email', 'meeting', 'board'], tiers: [
    ["Let's talk.", '我们聊聊'],
    ["Let's have a meeting.", '我们开个会'],
    ["Let's set up a working session.", '我们安排一次工作会'],
    ["Let's convene a decision meeting.", '我们召集一次决策会议'],
  ] },
  { key: 'contract', cn: '合同', rooms: ['factory', 'email', 'proposal', 'board'], tiers: [
    ['The paper we signed.', '我们签的那份文件'],
    ['The contract.', '合同'],
    ['The master agreement.', '主协议'],
    ['The commercial framework.', '商业框架协议'],
  ] },
  { key: 'trust', cn: '可靠', rooms: ['expo', 'email', 'proposal', 'board'], tiers: [
    ['You can trust us.', '放心吧'],
    ["We're reliable.", '我们靠得住'],
    ['We have a track record of delivery.', '我们有稳定的交付记录'],
    ["We've never missed a commitment in nine years.", '九年我们从未失约'],
  ] },
  { key: 'compete', cn: '竞争', rooms: ['expo', 'email', 'proposal', 'board'], tiers: [
    ["They're our rivals.", '他们是对手'],
    ["They're our competitors.", '他们是竞争对手'],
    ["They're the incumbent in this space.", '他们是这个领域的在位者'],
    ["They're the category leader we're displacing.", '他们是我们正在替代的品类领导者'],
  ] },
  { key: 'market', cn: '市场', rooms: ['expo', 'email', 'proposal', 'board'], tiers: [
    ['Where we sell.', '我们卖东西的地方'],
    ['The market.', '市场'],
    ['Our target segment.', '我们的目标细分市场'],
    ['The addressable market.', '可触达市场'],
  ] },
  { key: 'customer', cn: '客户', rooms: ['expo', 'email', 'proposal', 'board'], tiers: [
    ['The people who buy.', '买东西的人'],
    ['Our customers.', '我们的客户'],
    ['Our client base.', '我们的客户群体'],
    ['Our ideal customer profile.', '我们的理想客户画像'],
  ] },
];

function buildRows() {
  const rows = [];
  const problems = [];
  const seenCluster = new Set();

  for (const c of CLUSTERS) {
    if (seenCluster.has(c.key)) problems.push(`语义簇 key 重复: ${c.key}`);
    seenCluster.add(c.key);

    if (c.tiers.length !== REGISTERS.length) {
      problems.push(`语义簇 ${c.key} 档位数 ${c.tiers.length}，应为 ${REGISTERS.length}`);
    }
    if (c.rooms.length !== REGISTERS.length) {
      problems.push(`语义簇 ${c.key} 场合数 ${c.rooms.length}，应为 ${REGISTERS.length}`);
    }

    c.tiers.forEach((tier, i) => {
      const [phrase, phraseCn] = tier;
      const room = c.rooms[i];
      if (!phrase) problems.push(`语义簇 ${c.key} 第 ${i} 档英文为空`);
      if (!phraseCn) problems.push(`语义簇 ${c.key} 第 ${i} 档中文为空`);
      if (!ROOMS.includes(room)) problems.push(`语义簇 ${c.key} 第 ${i} 档场合非法: ${room}`);

      rows.push({
        cluster: c.key,
        clusterCn: c.cn,
        register: REGISTERS[i],
        phrase,
        phraseCn: phraseCn || null,
        room: room || null,
        order: i,
      });
    });
  }

  return { rows, problems };
}

async function main() {
  const { rows, problems } = buildRows();

  if (problems.length) {
    console.error('数据校验未通过，已中止：');
    problems.forEach((p) => console.error('  - ' + p));
    process.exit(1);
  }

  console.log(`语义簇 ${CLUSTERS.length} 个 | 待写入 ${rows.length} 条`);

  const existing = new Set(
    (await prisma.registerPhrase.findMany({ select: { cluster: true, register: true, phrase: true } })).map(
      (r) => `${r.cluster}|${r.register}|${r.phrase}`
    )
  );

  const fresh = rows.filter((r) => !existing.has(`${r.cluster}|${r.register}|${r.phrase}`));
  console.log(`库中已有 ${existing.size} 条 | 本次新增 ${fresh.length} 条 | 跳过 ${rows.length - fresh.length} 条`);

  if (fresh.length) {
    await prisma.registerPhrase.createMany({ data: fresh });
  }

  const total = await prisma.registerPhrase.count();
  const byRegister = await prisma.registerPhrase.groupBy({ by: ['register'], _count: { _all: true } });
  const byRoom = await prisma.registerPhrase.groupBy({ by: ['room'], _count: { _all: true } });
  const clusterCount = (await prisma.registerPhrase.groupBy({ by: ['cluster'], _count: { _all: true } })).length;

  console.log('\n=== 入库结果 ===');
  console.log({ inserted: fresh.length, totalInDb: total, clusters: clusterCount });
  console.log('按语域:', byRegister.map((r) => `${r.register}=${r._count._all}`).join(' · '));
  console.log('按场合:', byRoom.map((r) => `${r.room}=${r._count._all}`).join(' · '));

  const incomplete = (await prisma.registerPhrase.groupBy({ by: ['cluster'], _count: { _all: true } })).filter(
    (c) => c._count._all !== REGISTERS.length
  );
  if (incomplete.length) {
    console.warn(`\n警告：${incomplete.length} 个语义簇档位不全 ->`, incomplete.map((c) => c.cluster).join(', '));
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('FATAL', e.message);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
