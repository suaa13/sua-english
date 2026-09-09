// assets/js/register-data.js — 语域阶梯前端数据
//
// 与 backend/prisma/seed-register.cjs 同源（由脚本从种子转译，保持一致）。手工编写，无版权依赖。
// 产品化核心（见 .workbuddy/research/language-stratification.md）：
//   语言分化阶层，不在"说得对不对"，而在"第几层被听见"。同一意思四档语法全对，但能进的房间不同。
// 数据形态：每个语义簇四档，档位 order = casual(0) → neutral(1) → professional(2) → executive(3)，
//   每档各落一个典型房间（room），房间即该档能进的"门"。训练时按房间筛选，返回完整四档。

export const REGISTER_ORDER = ["casual","neutral","professional","executive"];

// 四档语域的中文层名 + 解释
export const REGISTERS = [
  {
    "key": "casual",
    "cn": "生存层",
    "en": "Casual",
    "desc": "车间、朋友、最放松的场合。语法没错，但进不了正式房间。"
  },
  {
    "key": "neutral",
    "cn": "通用层",
    "en": "Neutral",
    "desc": "邮件、日常沟通。大多数职场人默认使用的档位。"
  },
  {
    "key": "professional",
    "cn": "专业层",
    "en": "Professional",
    "desc": "客户提案、跨部门会议。开始体现专业度与分寸。"
  },
  {
    "key": "executive",
    "cn": "决策层",
    "en": "Executive",
    "desc": "董事会、战略汇报。用数据说话，克制而有分量。"
  }
];

// 六个典型房间（场合）的中文标签 + 场景说明
export const ROOMS = {
  "factory": {
    "cn": "车间 / 验厂",
    "desc": "产线、验厂、和一线同事的对话"
  },
  "expo": {
    "cn": "展会",
    "desc": "展台、初次接触买家的场景"
  },
  "proposal": {
    "cn": "客户提案",
    "desc": "面对客户的正式提案场合"
  },
  "email": {
    "cn": "邮件往来",
    "desc": "日常商务邮件沟通"
  },
  "board": {
    "cn": "董事会",
    "desc": "高层、战略决策场合"
  },
  "meeting": {
    "cn": "跨部门会议",
    "desc": "内部协作会议"
  }
};

// 50 个语义簇 × 四档语域
export const REGISTER_CLUSTERS = [
  { key: 'cheap', cn: '价格低', tiers: [
    { register: 'casual', phrase: 'It\'s cheap.', phraseCn: '很便宜', room: 'factory' },
    { register: 'neutral', phrase: 'It\'s affordable.', phraseCn: '价格可承受', room: 'email' },
    { register: 'professional', phrase: 'It\'s cost-effective.', phraseCn: '性价比高', room: 'proposal' },
    { register: 'executive', phrase: 'The unit economics are compelling.', phraseCn: '单位经济效益很有说服力', room: 'board' },
  ] },
  { key: 'expensive', cn: '价格高', tiers: [
    { register: 'casual', phrase: 'It\'s too expensive.', phraseCn: '太贵了', room: 'factory' },
    { register: 'neutral', phrase: 'It\'s a bit pricey.', phraseCn: '有点贵', room: 'email' },
    { register: 'professional', phrase: 'It\'s at the higher end of the range.', phraseCn: '处于价格区间上端', room: 'proposal' },
    { register: 'executive', phrase: 'It\'s a premium we haven\'t earned yet.', phraseCn: '这是个我们尚未支撑起来的溢价', room: 'board' },
  ] },
  { key: 'discount', cn: '要折扣', tiers: [
    { register: 'casual', phrase: 'Can you give a discount?', phraseCn: '能便宜点吗', room: 'factory' },
    { register: 'neutral', phrase: 'Is there any flexibility on price?', phraseCn: '价格上还有空间吗', room: 'email' },
    { register: 'professional', phrase: 'What\'s your best terms at this volume?', phraseCn: '这个量级下最优惠的条件是什么', room: 'proposal' },
    { register: 'executive', phrase: 'At what volume does the pricing step down?', phraseCn: '到什么量级价格会阶梯下调', room: 'board' },
  ] },
  { key: 'profit', cn: '盈利', tiers: [
    { register: 'casual', phrase: 'We make good money on this.', phraseCn: '这个我们赚得不错', room: 'factory' },
    { register: 'neutral', phrase: 'We\'re profitable on this line.', phraseCn: '这条产品线是盈利的', room: 'email' },
    { register: 'professional', phrase: 'The margin profile is healthy.', phraseCn: '毛利结构健康', room: 'proposal' },
    { register: 'executive', phrase: 'Gross margin is holding at 38%.', phraseCn: '毛利率维持在 38%', room: 'board' },
  ] },
  { key: 'loss', cn: '亏损', tiers: [
    { register: 'casual', phrase: 'We\'re losing money.', phraseCn: '我们在亏钱', room: 'factory' },
    { register: 'neutral', phrase: 'This line isn\'t covering costs.', phraseCn: '这条线收不回成本', room: 'email' },
    { register: 'professional', phrase: 'We\'re running below break-even.', phraseCn: '目前处于盈亏平衡点以下', room: 'proposal' },
    { register: 'executive', phrase: 'This SKU is dilutive to blended margin.', phraseCn: '这个 SKU 在稀释综合毛利', room: 'board' },
  ] },
  { key: 'goodQuality', cn: '质量好', tiers: [
    { register: 'casual', phrase: 'The quality is really good.', phraseCn: '质量真不错', room: 'factory' },
    { register: 'neutral', phrase: 'The quality is consistent.', phraseCn: '质量稳定', room: 'email' },
    { register: 'professional', phrase: 'It meets spec on every batch.', phraseCn: '每批次都符合规格', room: 'proposal' },
    { register: 'executive', phrase: 'Our defect rate is under 0.3%.', phraseCn: '不良率低于 0.3%', room: 'board' },
  ] },
  { key: 'badQuality', cn: '质量差', tiers: [
    { register: 'casual', phrase: 'The quality is bad.', phraseCn: '质量不行', room: 'factory' },
    { register: 'neutral', phrase: 'The quality isn\'t up to standard.', phraseCn: '质量不达标', room: 'email' },
    { register: 'professional', phrase: 'We\'re seeing variance against spec.', phraseCn: '与规格存在偏差', room: 'proposal' },
    { register: 'executive', phrase: 'Batch-to-batch consistency is our binding constraint.', phraseCn: '批次一致性是我们的硬约束', room: 'board' },
  ] },
  { key: 'problem', cn: '出问题', tiers: [
    { register: 'casual', phrase: 'We have a problem.', phraseCn: '出问题了', room: 'factory' },
    { register: 'neutral', phrase: 'We\'ve hit an issue.', phraseCn: '遇到个情况', room: 'email' },
    { register: 'professional', phrase: 'We\'ve identified a risk to the timeline.', phraseCn: '发现一个影响进度的风险', room: 'proposal' },
    { register: 'executive', phrase: 'There\'s a structural issue in the supply chain.', phraseCn: '供应链存在结构性问题', room: 'board' },
  ] },
  { key: 'improve', cn: '改进', tiers: [
    { register: 'casual', phrase: 'Let\'s make it better.', phraseCn: '改好一点', room: 'meeting' },
    { register: 'neutral', phrase: 'Let\'s improve this.', phraseCn: '改进一下', room: 'email' },
    { register: 'professional', phrase: 'Let\'s optimize the process.', phraseCn: '优化一下流程', room: 'proposal' },
    { register: 'executive', phrase: 'We need to re-architect the workflow.', phraseCn: '需要重构工作流', room: 'board' },
  ] },
  { key: 'newProduct', cn: '新产品', tiers: [
    { register: 'casual', phrase: 'We made a new thing.', phraseCn: '我们做了个新东西', room: 'factory' },
    { register: 'neutral', phrase: 'We\'ve launched a new product.', phraseCn: '我们出了新品', room: 'email' },
    { register: 'professional', phrase: 'We\'re introducing a new line this quarter.', phraseCn: '本季度推出新系列', room: 'expo' },
    { register: 'executive', phrase: 'We\'re extending the portfolio into an adjacent category.', phraseCn: '产品组合向相邻品类延伸', room: 'board' },
  ] },
  { key: 'late', cn: '延期', tiers: [
    { register: 'casual', phrase: 'It\'s late.', phraseCn: '晚了', room: 'factory' },
    { register: 'neutral', phrase: 'We\'re behind schedule.', phraseCn: '进度落后了', room: 'email' },
    { register: 'professional', phrase: 'We\'re tracking two weeks behind the agreed date.', phraseCn: '比约定日期落后约两周', room: 'proposal' },
    { register: 'executive', phrase: 'The critical path has slipped by fourteen days.', phraseCn: '关键路径已滑移十四天', room: 'board' },
  ] },
  { key: 'fast', cn: '速度快', tiers: [
    { register: 'casual', phrase: 'We\'ll do it fast.', phraseCn: '我们快点做', room: 'factory' },
    { register: 'neutral', phrase: 'We\'ll do it quickly.', phraseCn: '我们会尽快', room: 'email' },
    { register: 'professional', phrase: 'We can turn this around in five business days.', phraseCn: '五个工作日内可以交付', room: 'proposal' },
    { register: 'executive', phrase: 'Lead time compresses to five days at scale.', phraseCn: '规模化后交付周期压缩至五天', room: 'board' },
  ] },
  { key: 'stock', cn: '有库存', tiers: [
    { register: 'casual', phrase: 'We have it in stock.', phraseCn: '有现货', room: 'factory' },
    { register: 'neutral', phrase: 'It\'s available now.', phraseCn: '目前有货', room: 'email' },
    { register: 'professional', phrase: 'We hold safety stock for this SKU.', phraseCn: '该 SKU 备有安全库存', room: 'proposal' },
    { register: 'executive', phrase: 'We carry forty-five days of cover.', phraseCn: '我们保持四十五天库存覆盖', room: 'board' },
  ] },
  { key: 'capacity', cn: '产能', tiers: [
    { register: 'casual', phrase: 'We can make a lot.', phraseCn: '我们能做很多', room: 'factory' },
    { register: 'neutral', phrase: 'We have capacity.', phraseCn: '我们有产能', room: 'email' },
    { register: 'professional', phrase: 'We\'re running at seventy percent utilization.', phraseCn: '目前产能利用率七成', room: 'expo' },
    { register: 'executive', phrase: 'We have headroom for three times current volume.', phraseCn: '现有产能可支撑三倍规模', room: 'board' },
  ] },
  { key: 'supplier', cn: '供应商', tiers: [
    { register: 'casual', phrase: 'The guy we buy from.', phraseCn: '我们进货的那家', room: 'factory' },
    { register: 'neutral', phrase: 'Our supplier.', phraseCn: '我们的供应商', room: 'email' },
    { register: 'professional', phrase: 'Our tier-one supplier.', phraseCn: '我们的一级供应商', room: 'proposal' },
    { register: 'executive', phrase: 'Our strategic sourcing partner.', phraseCn: '我们的战略采购伙伴', room: 'board' },
  ] },
  { key: 'sorry', cn: '道歉', tiers: [
    { register: 'casual', phrase: 'Sorry about that.', phraseCn: '不好意思', room: 'factory' },
    { register: 'neutral', phrase: 'Apologies for the delay.', phraseCn: '抱歉耽误了', room: 'email' },
    { register: 'professional', phrase: 'We regret the inconvenience this caused.', phraseCn: '对此造成的不便我们深表歉意', room: 'proposal' },
    { register: 'executive', phrase: 'We take full accountability for the shortfall.', phraseCn: '我们对这次缺口承担全部责任', room: 'board' },
  ] },
  { key: 'wait', cn: '稍等', tiers: [
    { register: 'casual', phrase: 'Wait a second.', phraseCn: '等一下', room: 'factory' },
    { register: 'neutral', phrase: 'Could you give me a moment?', phraseCn: '稍等一下好吗', room: 'email' },
    { register: 'professional', phrase: 'Let me confirm and come back to you.', phraseCn: '我确认后回复您', room: 'proposal' },
    { register: 'executive', phrase: 'I\'ll revert with a validated position.', phraseCn: '我会带着经过核实的立场回复', room: 'board' },
  ] },
  { key: 'no', cn: '拒绝', tiers: [
    { register: 'casual', phrase: 'No, we can\'t.', phraseCn: '不行', room: 'meeting' },
    { register: 'neutral', phrase: 'I\'m afraid that\'s not possible.', phraseCn: '恐怕不行', room: 'email' },
    { register: 'professional', phrase: 'That\'s outside our current scope.', phraseCn: '这超出了我们当前的服务范围', room: 'proposal' },
    { register: 'executive', phrase: 'That doesn\'t align with our strategic priorities.', phraseCn: '这与我们的战略优先级不一致', room: 'board' },
  ] },
  { key: 'agree', cn: '同意', tiers: [
    { register: 'casual', phrase: 'OK, sure.', phraseCn: '行，好的', room: 'meeting' },
    { register: 'neutral', phrase: 'I agree.', phraseCn: '我同意', room: 'email' },
    { register: 'professional', phrase: 'That works for us.', phraseCn: '这个方案我们可以接受', room: 'proposal' },
    { register: 'executive', phrase: 'That\'s consistent with our thesis.', phraseCn: '这与我们的判断一致', room: 'board' },
  ] },
  { key: 'disagree', cn: '不同意', tiers: [
    { register: 'casual', phrase: 'I don\'t think so.', phraseCn: '我不这么想', room: 'meeting' },
    { register: 'neutral', phrase: 'I see it differently.', phraseCn: '我的看法不太一样', room: 'email' },
    { register: 'professional', phrase: 'I\'d challenge that assumption.', phraseCn: '我想质疑一下这个假设', room: 'proposal' },
    { register: 'executive', phrase: 'The data doesn\'t support that conclusion.', phraseCn: '数据并不支持这个结论', room: 'board' },
  ] },
  { key: 'dontKnow', cn: '不知道', tiers: [
    { register: 'casual', phrase: 'I have no idea.', phraseCn: '我不知道', room: 'factory' },
    { register: 'neutral', phrase: 'I\'m not sure.', phraseCn: '我不太确定', room: 'email' },
    { register: 'professional', phrase: 'Let me verify and get back to you.', phraseCn: '我核实后回复您', room: 'proposal' },
    { register: 'executive', phrase: 'I don\'t have the data to answer that yet.', phraseCn: '目前尚缺乏支撑该结论的数据', room: 'board' },
  ] },
  { key: 'askHelp', cn: '求助', tiers: [
    { register: 'casual', phrase: 'Can you help me?', phraseCn: '能帮个忙吗', room: 'factory' },
    { register: 'neutral', phrase: 'Could you help with this?', phraseCn: '能帮一下吗', room: 'email' },
    { register: 'professional', phrase: 'I\'d appreciate your support on this.', phraseCn: '希望得到您的支持', room: 'meeting' },
    { register: 'executive', phrase: 'I\'d like to bring you in on this.', phraseCn: '希望把您引入这件事', room: 'board' },
  ] },
  { key: 'done', cn: '已完成', tiers: [
    { register: 'casual', phrase: 'It\'s done.', phraseCn: '做完了', room: 'factory' },
    { register: 'neutral', phrase: 'It\'s finished.', phraseCn: '完成了', room: 'email' },
    { register: 'professional', phrase: 'It\'s complete and ready for review.', phraseCn: '已完成，可交付评审', room: 'meeting' },
    { register: 'executive', phrase: 'The deliverable is signed off.', phraseCn: '交付物已签署确认', room: 'board' },
  ] },
  { key: 'notDone', cn: '未完成', tiers: [
    { register: 'casual', phrase: 'Not yet.', phraseCn: '还没', room: 'factory' },
    { register: 'neutral', phrase: 'It\'s still in progress.', phraseCn: '还在进行中', room: 'email' },
    { register: 'professional', phrase: 'We\'re at eighty percent completion.', phraseCn: '目前完成度八成', room: 'meeting' },
    { register: 'executive', phrase: 'The remaining scope is non-blocking.', phraseCn: '剩余范围不构成阻塞', room: 'board' },
  ] },
  { key: 'busy', cn: '忙碌', tiers: [
    { register: 'casual', phrase: 'I\'m swamped.', phraseCn: '忙死了', room: 'factory' },
    { register: 'neutral', phrase: 'I\'m pretty tied up right now.', phraseCn: '我现在比较忙', room: 'email' },
    { register: 'professional', phrase: 'My bandwidth is constrained this week.', phraseCn: '本周我的精力比较紧张', room: 'meeting' },
    { register: 'executive', phrase: 'I\'m at capacity through Thursday.', phraseCn: '周四前我的排期已满', room: 'board' },
  ] },
  { key: 'start', cn: '启动', tiers: [
    { register: 'casual', phrase: 'Let\'s start.', phraseCn: '开始吧', room: 'meeting' },
    { register: 'neutral', phrase: 'Let\'s get started.', phraseCn: '我们开始吧', room: 'email' },
    { register: 'professional', phrase: 'Let\'s kick this off.', phraseCn: '我们正式启动', room: 'proposal' },
    { register: 'executive', phrase: 'Let\'s move this into execution.', phraseCn: '让这件事转入执行', room: 'board' },
  ] },
  { key: 'stop', cn: '中止', tiers: [
    { register: 'casual', phrase: 'Stop it.', phraseCn: '停', room: 'meeting' },
    { register: 'neutral', phrase: 'Let\'s pause here.', phraseCn: '先停一下', room: 'email' },
    { register: 'professional', phrase: 'Let\'s put this on hold.', phraseCn: '先搁置', room: 'proposal' },
    { register: 'executive', phrase: 'We\'re deprioritizing this initiative.', phraseCn: '我们正在下调该项目的优先级', room: 'board' },
  ] },
  { key: 'changePlan', cn: '改计划', tiers: [
    { register: 'casual', phrase: 'We changed our minds.', phraseCn: '我们改主意了', room: 'meeting' },
    { register: 'neutral', phrase: 'We\'ve adjusted the plan.', phraseCn: '我们调整了计划', room: 'email' },
    { register: 'professional', phrase: 'We\'ve revised the roadmap.', phraseCn: '我们修订了路线图', room: 'proposal' },
    { register: 'executive', phrase: 'We\'re reallocating to a higher-yield bet.', phraseCn: '我们把资源重新配置到回报更高的方向', room: 'board' },
  ] },
  { key: 'iThink', cn: '表达观点', tiers: [
    { register: 'casual', phrase: 'I think...', phraseCn: '我觉得', room: 'meeting' },
    { register: 'neutral', phrase: 'In my view...', phraseCn: '我认为', room: 'email' },
    { register: 'professional', phrase: 'Based on what we\'re seeing...', phraseCn: '基于目前掌握的情况', room: 'proposal' },
    { register: 'executive', phrase: 'The evidence points to...', phraseCn: '证据指向', room: 'board' },
  ] },
  { key: 'important', cn: '重要', tiers: [
    { register: 'casual', phrase: 'This is a big deal.', phraseCn: '这事挺大', room: 'meeting' },
    { register: 'neutral', phrase: 'This is important.', phraseCn: '这很重要', room: 'email' },
    { register: 'professional', phrase: 'This is a priority.', phraseCn: '这是优先事项', room: 'proposal' },
    { register: 'executive', phrase: 'This is strategically material.', phraseCn: '这具有战略实质意义', room: 'board' },
  ] },
  { key: 'difficult', cn: '困难', tiers: [
    { register: 'casual', phrase: 'This is hard.', phraseCn: '这挺难的', room: 'meeting' },
    { register: 'neutral', phrase: 'This is tricky.', phraseCn: '这有点棘手', room: 'email' },
    { register: 'professional', phrase: 'This presents some complexity.', phraseCn: '这存在一定的复杂性', room: 'proposal' },
    { register: 'executive', phrase: 'This is a structurally hard problem.', phraseCn: '这是个结构性难题', room: 'board' },
  ] },
  { key: 'easy', cn: '容易', tiers: [
    { register: 'casual', phrase: 'That\'s easy.', phraseCn: '那很简单', room: 'meeting' },
    { register: 'neutral', phrase: 'That\'s straightforward.', phraseCn: '那个比较直接', room: 'email' },
    { register: 'professional', phrase: 'That\'s well within our capability.', phraseCn: '完全在我们能力范围内', room: 'proposal' },
    { register: 'executive', phrase: 'That\'s largely a solved problem for us.', phraseCn: '这对我们基本是已解决的问题', room: 'board' },
  ] },
  { key: 'risk', cn: '风险', tiers: [
    { register: 'casual', phrase: 'Something might go wrong.', phraseCn: '可能会出事', room: 'meeting' },
    { register: 'neutral', phrase: 'There\'s some risk.', phraseCn: '有一定风险', room: 'email' },
    { register: 'professional', phrase: 'We\'ve identified three key risks.', phraseCn: '我们识别出三个关键风险', room: 'proposal' },
    { register: 'executive', phrase: 'This is our primary downside exposure.', phraseCn: '这是我们最主要的下行敞口', room: 'board' },
  ] },
  { key: 'opportunity', cn: '机会', tiers: [
    { register: 'casual', phrase: 'Good chance for us.', phraseCn: '我们的机会', room: 'meeting' },
    { register: 'neutral', phrase: 'There\'s an opportunity here.', phraseCn: '这里有机会', room: 'email' },
    { register: 'professional', phrase: 'There\'s a clear market gap.', phraseCn: '存在明确的市场空白', room: 'proposal' },
    { register: 'executive', phrase: 'This is a category-defining opportunity.', phraseCn: '这是个能定义品类的机会', room: 'board' },
  ] },
  { key: 'advantage', cn: '优势', tiers: [
    { register: 'casual', phrase: 'We\'re better at this.', phraseCn: '我们更擅长', room: 'expo' },
    { register: 'neutral', phrase: 'We have an edge.', phraseCn: '我们有优势', room: 'email' },
    { register: 'professional', phrase: 'This is our differentiation.', phraseCn: '这是我们的差异化所在', room: 'proposal' },
    { register: 'executive', phrase: 'This is our structural moat.', phraseCn: '这是我们的结构性护城河', room: 'board' },
  ] },
  { key: 'disadvantage', cn: '劣势', tiers: [
    { register: 'casual', phrase: 'We\'re not good at this.', phraseCn: '我们不擅长', room: 'meeting' },
    { register: 'neutral', phrase: 'This is a weak point.', phraseCn: '这是我们的弱项', room: 'email' },
    { register: 'professional', phrase: 'This is a capability gap.', phraseCn: '这是能力缺口', room: 'proposal' },
    { register: 'executive', phrase: 'This is a strategic vulnerability.', phraseCn: '这是战略上的脆弱点', room: 'board' },
  ] },
  { key: 'increase', cn: '增长', tiers: [
    { register: 'casual', phrase: 'It\'s going up.', phraseCn: '在涨', room: 'factory' },
    { register: 'neutral', phrase: 'It\'s increasing.', phraseCn: '在增长', room: 'email' },
    { register: 'professional', phrase: 'We\'re seeing twenty percent growth quarter on quarter.', phraseCn: '环比增长两成', room: 'proposal' },
    { register: 'executive', phrase: 'We\'re compounding at twenty percent quarter over quarter.', phraseCn: '我们以两成的环比速度复利增长', room: 'board' },
  ] },
  { key: 'decrease', cn: '下降', tiers: [
    { register: 'casual', phrase: 'It\'s going down.', phraseCn: '在降', room: 'factory' },
    { register: 'neutral', phrase: 'It\'s declining.', phraseCn: '在下滑', room: 'email' },
    { register: 'professional', phrase: 'We\'re seeing a twelve percent contraction.', phraseCn: '出现一成二的收缩', room: 'proposal' },
    { register: 'executive', phrase: 'The category is in secular decline.', phraseCn: '该品类处于长期下行通道', room: 'board' },
  ] },
  { key: 'aLot', cn: '数量多', tiers: [
    { register: 'casual', phrase: 'A lot.', phraseCn: '很多', room: 'factory' },
    { register: 'neutral', phrase: 'A significant amount.', phraseCn: '相当多', room: 'email' },
    { register: 'professional', phrase: 'A substantial volume.', phraseCn: '相当可观的量', room: 'proposal' },
    { register: 'executive', phrase: 'Material scale.', phraseCn: '具备实质规模', room: 'board' },
  ] },
  { key: 'aLittle', cn: '数量少', tiers: [
    { register: 'casual', phrase: 'A little bit.', phraseCn: '一点点', room: 'factory' },
    { register: 'neutral', phrase: 'Slightly.', phraseCn: '略微', room: 'email' },
    { register: 'professional', phrase: 'Marginally.', phraseCn: '小幅', room: 'proposal' },
    { register: 'executive', phrase: 'Immaterial at this stage.', phraseCn: '现阶段影响不重大', room: 'board' },
  ] },
  { key: 'success', cn: '成功', tiers: [
    { register: 'casual', phrase: 'It worked.', phraseCn: '成了', room: 'meeting' },
    { register: 'neutral', phrase: 'It was successful.', phraseCn: '成功了', room: 'email' },
    { register: 'professional', phrase: 'We hit our targets.', phraseCn: '我们达成了目标', room: 'proposal' },
    { register: 'executive', phrase: 'We delivered against plan.', phraseCn: '我们按计划完成了交付', room: 'board' },
  ] },
  { key: 'failure', cn: '失败', tiers: [
    { register: 'casual', phrase: 'It didn\'t work.', phraseCn: '没成', room: 'meeting' },
    { register: 'neutral', phrase: 'It didn\'t succeed.', phraseCn: '没成功', room: 'email' },
    { register: 'professional', phrase: 'We missed the target.', phraseCn: '我们未达成目标', room: 'proposal' },
    { register: 'executive', phrase: 'We underperformed against plan.', phraseCn: '我们低于计划表现', room: 'board' },
  ] },
  { key: 'thanks', cn: '致谢', tiers: [
    { register: 'casual', phrase: 'Thanks!', phraseCn: '谢谢', room: 'factory' },
    { register: 'neutral', phrase: 'Thank you.', phraseCn: '谢谢您', room: 'email' },
    { register: 'professional', phrase: 'I appreciate your help with this.', phraseCn: '感谢您的协助', room: 'proposal' },
    { register: 'executive', phrase: 'I\'m grateful for your partnership on this.', phraseCn: '感谢您在其中的协作', room: 'board' },
  ] },
  { key: 'followUp', cn: '跟进', tiers: [
    { register: 'casual', phrase: 'I\'ll check later.', phraseCn: '我回头看看', room: 'factory' },
    { register: 'neutral', phrase: 'I\'ll follow up.', phraseCn: '我会跟进', room: 'email' },
    { register: 'professional', phrase: 'I\'ll follow up by Friday.', phraseCn: '我周五前跟进', room: 'meeting' },
    { register: 'executive', phrase: 'I\'ll close the loop by end of week.', phraseCn: '我会在周末前闭环', room: 'board' },
  ] },
  { key: 'meeting', cn: '开会', tiers: [
    { register: 'casual', phrase: 'Let\'s talk.', phraseCn: '我们聊聊', room: 'factory' },
    { register: 'neutral', phrase: 'Let\'s have a meeting.', phraseCn: '我们开个会', room: 'email' },
    { register: 'professional', phrase: 'Let\'s set up a working session.', phraseCn: '我们安排一次工作会', room: 'meeting' },
    { register: 'executive', phrase: 'Let\'s convene a decision meeting.', phraseCn: '我们召集一次决策会议', room: 'board' },
  ] },
  { key: 'contract', cn: '合同', tiers: [
    { register: 'casual', phrase: 'The paper we signed.', phraseCn: '我们签的那份文件', room: 'factory' },
    { register: 'neutral', phrase: 'The contract.', phraseCn: '合同', room: 'email' },
    { register: 'professional', phrase: 'The master agreement.', phraseCn: '主协议', room: 'proposal' },
    { register: 'executive', phrase: 'The commercial framework.', phraseCn: '商业框架协议', room: 'board' },
  ] },
  { key: 'trust', cn: '可靠', tiers: [
    { register: 'casual', phrase: 'You can trust us.', phraseCn: '放心吧', room: 'expo' },
    { register: 'neutral', phrase: 'We\'re reliable.', phraseCn: '我们靠得住', room: 'email' },
    { register: 'professional', phrase: 'We have a track record of delivery.', phraseCn: '我们有稳定的交付记录', room: 'proposal' },
    { register: 'executive', phrase: 'We\'ve never missed a commitment in nine years.', phraseCn: '九年我们从未失约', room: 'board' },
  ] },
  { key: 'compete', cn: '竞争', tiers: [
    { register: 'casual', phrase: 'They\'re our rivals.', phraseCn: '他们是对手', room: 'expo' },
    { register: 'neutral', phrase: 'They\'re our competitors.', phraseCn: '他们是竞争对手', room: 'email' },
    { register: 'professional', phrase: 'They\'re the incumbent in this space.', phraseCn: '他们是这个领域的在位者', room: 'proposal' },
    { register: 'executive', phrase: 'They\'re the category leader we\'re displacing.', phraseCn: '他们是我们正在替代的品类领导者', room: 'board' },
  ] },
  { key: 'market', cn: '市场', tiers: [
    { register: 'casual', phrase: 'Where we sell.', phraseCn: '我们卖东西的地方', room: 'expo' },
    { register: 'neutral', phrase: 'The market.', phraseCn: '市场', room: 'email' },
    { register: 'professional', phrase: 'Our target segment.', phraseCn: '我们的目标细分市场', room: 'proposal' },
    { register: 'executive', phrase: 'The addressable market.', phraseCn: '可触达市场', room: 'board' },
  ] },
  { key: 'customer', cn: '客户', tiers: [
    { register: 'casual', phrase: 'The people who buy.', phraseCn: '买东西的人', room: 'expo' },
    { register: 'neutral', phrase: 'Our customers.', phraseCn: '我们的客户', room: 'email' },
    { register: 'professional', phrase: 'Our client base.', phraseCn: '我们的客户群体', room: 'proposal' },
    { register: 'executive', phrase: 'Our ideal customer profile.', phraseCn: '我们的理想客户画像', room: 'board' },
  ] },
];

// 便捷查询
export function registerByKey(key) {
  return REGISTER_CLUSTERS.find((c) => c.key === key) || null;
}
export function roomLabel(room) {
  return (ROOMS[room] && ROOMS[room].cn) || room || '';
}
export function registerMeta(key) {
  return REGISTERS.find((r) => r.key === key) || null;
}
