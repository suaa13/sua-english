// Phase 2 seed content — mirrors the shapes the frontend currently mocks in
// assets/js/data.js so the API serves the same learning material. examples /
// exercise / lessons are stored as JSON strings (see schema comments).

export interface SeedWord {
  word: string;
  ipa: string;
  pos: string;
  cn: string;
  en: string;
  example: string;
  exampleCn: string;
  collocation: string;
  synonym: string;
  level: string;
  scenario: string;
}

export interface SeedGrammar {
  title: string;
  level: string;
  summary: string;
  explain: string;
  examples: string[];
  exercise: { type: string; q: string; options?: string[]; answer: number | string; hint?: string };
}

const WORDS: SeedWord[] = [
  { word: 'apple', ipa: '/ˈæp.əl/', pos: 'n.', cn: '苹果', en: 'a round fruit with red or green skin', example: 'She ate a red apple for breakfast.', exampleCn: '她早餐吃了一个红苹果。', collocation: 'apple pie, an apple a day', synonym: 'pome', level: 'basic', scenario: '日常基础词汇，用于描述食物与习惯。' },
  { word: 'book', ipa: '/bʊk/', pos: 'n.', cn: '书；预订', en: 'a written work / to reserve in advance', example: 'I booked a table for two.', exampleCn: '我预订了一张两人桌。', collocation: 'read a book, book a flight', synonym: 'reserve', level: 'basic', scenario: '既可作名词也可作动词，口语与旅行场景高频。' },
  { word: 'run', ipa: '/rʌn/', pos: 'v.', cn: '跑；经营', en: 'to move fast on foot / to manage', example: 'He runs a small cafe.', exampleCn: '他经营一家小咖啡馆。', collocation: 'run a business, run out of', synonym: 'operate', level: 'basic', scenario: '多义动词，基础到高阶都重要。' },
  { word: 'think', ipa: '/θɪŋk/', pos: 'v.', cn: '思考；认为', en: 'to have a thought / to believe', example: 'I think we should leave now.', exampleCn: '我想我们现在该走了。', collocation: 'think about, think over', synonym: 'consider', level: 'basic', scenario: '表达观点最核心的动词之一。' },
  { word: 'because', ipa: '/bɪˈkɔːz/', pos: 'conj.', cn: '因为', en: 'for the reason that', example: 'We stayed home because it rained.', exampleCn: '我们待在家里，因为下雨了。', collocation: 'because of', synonym: 'since', level: 'basic', scenario: '连接因果，写作与口语都必备。' },
  { word: 'important', ipa: '/ɪmˈpɔː.tənt/', pos: 'adj.', cn: '重要的', en: 'having great value or effect', example: 'Education is important for children.', exampleCn: '教育对孩子们很重要。', collocation: 'an important decision', synonym: 'crucial', level: 'basic', scenario: '描述事物重要性的高频形容词。' },
  { word: 'environment', ipa: '/ɪnˈvaɪ.rən.mənt/', pos: 'n.', cn: '环境', en: 'the natural world and surroundings', example: 'We must protect the environment.', exampleCn: '我们必须保护环境。', collocation: 'protect the environment', synonym: 'surroundings', level: 'ielts', scenario: 'IELTS 写作与口语高频话题词。' },
  { word: 'significant', ipa: '/sɪɡˈnɪf.ɪ.kənt/', pos: 'adj.', cn: '显著的；重要的', en: 'large or important enough to have an effect', example: 'There was a significant increase in sales.', exampleCn: '销售额有了显著增长。', collocation: 'a significant change', synonym: 'considerable', level: 'ielts', scenario: 'IELTS 图表题与议论文常用，替代 big。' },
  { word: 'ubiquitous', ipa: '/juːˈbɪk.wɪ.təs/', pos: 'adj.', cn: '无处不在的', en: 'present everywhere at the same time', example: 'Smartphones are ubiquitous in modern life.', exampleCn: '智能手机在现代生活中无处不在。', collocation: 'ubiquitous technology', synonym: 'omnipresent', level: 'ielts', scenario: '高级词汇，用于展示词汇多样性。' },
  { word: 'mitigate', ipa: '/ˈmɪt.ɪ.ɡeɪt/', pos: 'v.', cn: '减轻；缓解', en: 'to make something less severe', example: 'Trees help mitigate air pollution.', exampleCn: '树木有助于减轻空气污染。', collocation: 'mitigate the impact', synonym: 'alleviate', level: 'ielts', scenario: 'IELTS 问题解决型议论文高分动词。' },
  { word: 'comprehensive', ipa: '/ˌkɒm.prɪˈhen.sɪv/', pos: 'adj.', cn: '全面的；综合的', en: 'including everything that is needed', example: 'The report gives a comprehensive analysis.', exampleCn: '这份报告给出了全面的分析。', collocation: 'a comprehensive review', synonym: 'thorough', level: 'toefl', scenario: 'TOEFL 听力/阅读与写作常用。' },
  { word: 'hypothesis', ipa: '/haɪˈpɒθ.ə.sɪs/', pos: 'n.', cn: '假设', en: 'an idea suggested as a possible explanation', example: 'The hypothesis was later proven correct.', exampleCn: '这个假设后来被证明是正确的。', collocation: 'test a hypothesis', synonym: 'assumption', level: 'toefl', scenario: 'TOEFL 学术讲座高频学术词。' },
  { word: 'fluctuate', ipa: '/ˈflʌk.tʃu.eɪt/', pos: 'v.', cn: '波动', en: 'to change frequently in level or value', example: 'Prices fluctuated during the year.', exampleCn: '价格在一年内波动。', collocation: 'fluctuate wildly', synonym: 'vary', level: 'ielts', scenario: 'IELTS 动态图表题描述趋势。' },
  { word: 'facilitate', ipa: '/fəˈsɪl.ɪ.teɪt/', pos: 'v.', cn: '促进；使便利', en: 'to make an action easier', example: 'The app facilitates language learning.', exampleCn: '这款应用促进了语言学习。', collocation: 'facilitate communication', synonym: 'ease', level: 'toefl', scenario: '学术写作与口语中替代 help。' },
  { word: 'sustainable', ipa: '/səˈsteɪ.nə.bəl/', pos: 'adj.', cn: '可持续的', en: 'able to continue over time', example: 'We need sustainable energy sources.', exampleCn: '我们需要可持续的能源。', collocation: 'sustainable development', synonym: 'renewable', level: 'ielts', scenario: '环境与城市发展话题核心词。' },
  { word: 'analyze', ipa: '/ˈæn.əl.aɪz/', pos: 'v.', cn: '分析', en: 'to examine in detail', example: 'Scientists analyzed the data carefully.', exampleCn: '科学家仔细分析了数据。', collocation: 'analyze the results', synonym: 'examine', level: 'toefl', scenario: 'TOEFL 综合写作与听力核心动作。' },
  { word: 'contemporary', ipa: '/kənˈtem.pər.ər.i/', pos: 'adj.', cn: '当代的；同时代的', en: 'belonging to the present time', example: 'The museum shows contemporary art.', exampleCn: '博物馆展出当代艺术。', collocation: 'contemporary society', synonym: 'modern', level: 'ielts', scenario: '文化类话题高分替换词。' },
  { word: 'pragmatic', ipa: '/præɡˈmæt.ɪk/', pos: 'adj.', cn: '务实的', en: 'dealing with things sensibly', example: 'We need a pragmatic solution.', exampleCn: '我们需要一个务实的解决方案。', collocation: 'a pragmatic approach', synonym: 'practical', level: 'toefl', scenario: '写作与口语中展示成熟度。' },
  { word: 'deteriorate', ipa: '/dɪˈtɪə.ri.ə.reɪt/', pos: 'v.', cn: '恶化', en: 'to become worse', example: 'Air quality deteriorated last winter.', exampleCn: '去年冬天空气质量恶化了。', collocation: 'deteriorate rapidly', synonym: 'worsen', level: 'ielts', scenario: '问题类话题动词，优于 become worse。' },
  { word: 'consequence', ipa: '/ˈkɒn.sɪ.kwəns/', pos: 'n.', cn: '后果', en: 'a result of an action', example: 'Climate change has serious consequences.', exampleCn: '气候变化有严重后果。', collocation: 'as a consequence', synonym: 'result', level: 'ielts', scenario: '议论文因果论证核心名词。' },
  { word: 'emphasize', ipa: '/ˈem.fə.saɪz/', pos: 'v.', cn: '强调', en: 'to give special importance', example: 'The study emphasizes the risks.', exampleCn: '这项研究强调了风险。', collocation: 'emphasize the need', synonym: 'highlight', level: 'toefl', scenario: '写作与演讲中突出观点。' },
  { word: 'innovation', ipa: '/ˌɪn.əˈveɪ.ʃən/', pos: 'n.', cn: '创新', en: 'a new method or idea', example: 'Innovation drives economic growth.', exampleCn: '创新推动经济增长。', collocation: 'technological innovation', synonym: 'invention', level: 'toefl', scenario: '科技类话题万能高频词。' },
  { word: 'necessitate', ipa: '/nəˈses.ɪ.teɪt/', pos: 'v.', cn: '使成为必要', en: 'to make something necessary', example: 'The change necessitates new training.', exampleCn: '这一变化使新的培训成为必要。', collocation: 'necessitate action', synonym: 'require', level: 'ielts', scenario: '高级书面语，展示语法复杂度。' },
  { word: 'prevalent', ipa: '/ˈprev.əl.ənt/', pos: 'adj.', cn: '普遍的', en: 'widespread or common', example: 'Smartphones are prevalent among teens.', exampleCn: '智能手机在青少年中很普遍。', collocation: 'a prevalent belief', synonym: 'common', level: 'ielts', scenario: '替代 common 的书面高级词。' },
  { word: 'cohesive', ipa: '/kəʊˈhiː.sɪv/', pos: 'adj.', cn: '连贯的；有凝聚力的', en: 'unified and logically connected', example: 'A cohesive essay flows naturally.', exampleCn: '连贯的文章读起来很自然。', collocation: 'a cohesive argument', synonym: 'unified', level: 'toefl', scenario: '写作评分的 coherence 维度关键词。' },
];

const GRAMMAR: SeedGrammar[] = [
  { title: '字母与单词', level: '0 基础', summary: '英语由 26 个字母组成，单词是句子的最小单位。', explain: '英语使用 26 个拉丁字母（A–Z）。单词由字母拼成，句子由单词组成。先认字母、再记单词，是 0 基础的第一步。', examples: ['A, B, C, D … Z', 'cat = c + a + t', 'I am Sue.'], exercise: { type: 'mc', q: '英语共有多少个字母？', options: ['24', '25', '26', '28'], answer: 2 } },
  { title: '句子基本结构', level: '0 基础', summary: '最基础的句子结构：主语 + 动词。', explain: '英语句子最核心的结构是「主语 + 谓语（动词）」。例如 "Birds fly."（鸟飞）。加上宾语可表达更完整："I drink water."（我喝水）。', examples: ['She smiles.', 'Tom eats an apple.', 'We study English.'], exercise: { type: 'mc', q: '“猫喝水。” 正确的英文结构是？', options: ['水 猫 喝', '猫 喝 水', '喝 猫 水', '猫 水 喝'], answer: 1 } },
  { title: 'be 动词', level: '基础', summary: 'am / is / are 表示「是 / 在」。', explain: 'be 动词随主语变化：I am, you/we/they are, he/she/it is。它用来说明身份、状态或位置。', examples: ['I am a student.', 'She is happy.', 'They are at home.'], exercise: { type: 'fill', q: '补全：He ___ a teacher.', answer: 'is', hint: '第三人称单数用 is' } },
  { title: '一般现在时', level: '基础', summary: '描述习惯、事实和常态。', explain: '一般现在时用于经常发生的动作或客观事实。第三人称单数动词加 -s/-es：He plays.', examples: ['I get up at 7.', 'The sun rises in the east.', 'She works hard.'], exercise: { type: 'mc', q: '“她每天看书。” 正确表达？', options: ['She read books daily.', 'She reads books daily.', 'She reading books daily.', 'She is read books.'], answer: 1 } },
  { title: '一般过去时', level: '基础', summary: '描述过去发生、已结束的动作。', explain: '规则动词加 -ed（played），不规则动词需单独记忆（go→went）。常与 yesterday / last week 连用。', examples: ['I visited Paris.', 'They went home.', 'He finished the test.'], exercise: { type: 'fill', q: '补全：We ___ (go) to the park yesterday.', answer: 'went', hint: 'go 的过去式是不规则变化' } },
  { title: '一般将来时', level: '基础', summary: 'will + 动词原形，表示将来。', explain: '用 will + 动词原形表达将来的动作或预测。口语中也常用 be going to 表示计划。', examples: ['I will call you.', 'It is going to rain.', 'They will arrive soon.'], exercise: { type: 'mc', q: '“我明天会帮你。” 正确表达？', options: ['I help you tomorrow.', 'I will help you tomorrow.', 'I helped you tomorrow.', 'I helping you tomorrow.'], answer: 1 } },
  { title: '宾语从句', level: '中级', summary: '动词后接一个完整的句子作宾语。', explain: '当一个句子充当宾语时，就叫宾语从句。常见引导词：that, what, where。注意时态一致。', examples: ['I think that he is right.', 'She asked where I live.', 'I know what you mean.'], exercise: { type: 'mc', q: '宾语从句的引导词通常放在？', options: ['句首', '主语之后', '动词之后', '任意位置'], answer: 2 } },
  { title: '条件句 If', level: '中级', summary: 'If + 条件，主句 + 结果。', explain: '第一类条件句：If + 一般现在时, 主句用 will。例如 If it rains, we will stay home.', examples: ['If you study, you will pass.', 'If I have time, I will call.', 'If he is late, we will start without him.'], exercise: { type: 'fill', q: '补全：If it ___ (rain), we will cancel.', answer: 'rains', hint: 'if 从句用一般现在时表将来' } },
  { title: 'IELTS 写作语法：复杂句', level: 'IELTS / TOEFL', summary: '用连接词把简单句合并为复杂句，提升 Grammar 分数。', explain: '高分写作需要句式多样。用 although, whereas, nevertheless, furthermore 等连接词，把两个相关观点合并，展示语法复杂度与连贯性。', examples: ['Although it is costly, the plan is effective.', 'The city is crowded; nevertheless, it is lively.', 'Furthermore, education improves life quality.'], exercise: { type: 'mc', q: '哪一个是表示「让步」的连接词？', options: ['Furthermore', 'Although', 'Therefore', 'Meanwhile'], answer: 1 } },
];

// Courses reference grammar/vocab by the ids assigned at seed time (g-1.., v-1..).
// Lessons use type: 'grammar' | 'vocab' | 'practice' and a refId that matches
// the seeded id prefix below. The seed script maps array index -> id.
export const COURSES = [
  {
    slug: 'ielts-writing-grammar',
    title: 'IELTS 写作高分语法',
    exam: 'IELTS',
    level: 'ielts',
    description: '用连接词与复杂句提升 Task 1 / Task 2 的 Grammar 分数。',
    grammarRefs: [8], // 宾语从句
    vocabRefs: [22, 23, 18, 19], // necessitate, prevalent, deteriorate, consequence
  },
  {
    slug: 'toefl-academic-vocab',
    title: 'TOEFL 学术词汇突破',
    exam: 'TOEFL',
    level: 'toefl',
    description: 'TOEFL 听力和阅读高频学术词，搭配例句与同义替换。',
    grammarRefs: [],
    vocabRefs: [10, 11, 12, 15, 13, 20, 9, 21], // hypothesis, comprehensive, fluctuate, facilitate, analyze, emphasize, ubiquitous, innovation
  },
];

export const SEED_WORDS = WORDS;
export const SEED_GRAMMAR = GRAMMAR;

export interface SeedQuestion {
  exam: 'IELTS' | 'TOEFL';
  subject: 'Listening' | 'Reading' | 'Writing' | 'Speaking';
  type: string;
  difficulty: 'easy' | 'medium' | 'hard';
  year?: string;
  source?: string;
  title: string;
  prompt: string;
  referenceAnswer?: string;
  keyword?: string;
  tags?: string[];
}

// Curated official-style sample material (no copyrighted passages reproduced in
// full). Each item carries a realistic prompt + reference points so the 真题题库
// and 模考 modules serve genuinely useful practice, not just stubs.
const QUESTIONS: SeedQuestion[] = [
  // ---------------- IELTS ----------------
  { exam: 'IELTS', subject: 'Listening', type: '填空题', difficulty: 'easy', year: 'Vol.17', source: 'Cambridge IELTS 17', title: '图书馆借书咨询', keyword: 'library booking', tags: ['Section 1', 'form completion'], prompt: '听一段学生与图书管理员的对话，完成填空：The library closes at ___ on Saturdays.（填写闭馆时间）', referenceAnswer: '参考要点：\n· 答案通常为 5 p.m. / 17:00；\n· 注意听清星期与 a.m./p.m. 的区别；\n· 数字后常跟 "sharp" 等强调词。' },
  { exam: 'IELTS', subject: 'Listening', type: '选择题', difficulty: 'medium', year: 'Vol.16', source: 'Cambridge IELTS 16', title: '城市规划讲座', keyword: 'urban planning park', tags: ['Section 4', 'multiple choice'], prompt: '听一段关于城市绿化的讲座，选择最佳答案：The city built the new park mainly to ___.\nA. attract tourists\nB. improve air quality\nC. reduce traffic\nD. create jobs', referenceAnswer: '参考要点：\n· 正确项通常对应讲座中明确给出的首要原因；\n· 排除只被顺带提及的干扰项；\n· 注意 "the main reason / primarily" 等限定词。' },
  { exam: 'IELTS', subject: 'Reading', type: '判断题', difficulty: 'medium', year: 'Vol.18', source: 'Cambridge IELTS 18', title: '气候变化判断', keyword: 'climate change true false', tags: ['TRUE/FALSE/NOT GIVEN'], prompt: '阅读关于气候变化的文章，判断下列表述：Global temperatures have risen in every single year since 1990.\nTRUE / FALSE / NOT GIVEN', referenceAnswer: '参考要点：\n· 若文章说 "整体上升但个别年份持平" → FALSE；\n· 若文章未提及逐年情况 → NOT GIVEN；\n· 切勿用常识代替原文。' },
  { exam: 'IELTS', subject: 'Reading', type: '段落匹配', difficulty: 'hard', year: 'Vol.15', source: 'Cambridge IELTS 15', title: '段落标题匹配', keyword: 'matching headings', tags: ['matching headings'], prompt: '为文章第 2–5 段从下列标题 A–F 中选择最贴切的小标题。注意：可多余选项。', referenceAnswer: '参考要点：\n· 先读标题再扫读段落首句与转折句；\n· 抓段落主旨而非细节；\n· 排除过于具体或与内容相反的标题。' },
  { exam: 'IELTS', subject: 'Writing', type: '图表题 (Task 1)', difficulty: 'medium', year: 'Sample', source: 'IELTS Official', title: '英国留学生柱状图', keyword: 'bar chart international students', tags: ['Task 1', 'bar chart'], prompt: 'The bar chart below shows the number of international students in the UK from 2010 to 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. (Write at least 150 words.)', referenceAnswer: '参考要点：\n· 开篇改写题目，说明图表类型与时间段；\n· 描述总体趋势（上升/峰值/低谷）；\n· 选取最高与最低年份做对比，用 approximate/roughly 等词；\n· 不写个人观点。' },
  { exam: 'IELTS', subject: 'Writing', type: '议论文 (Task 2)', difficulty: 'hard', year: 'Sample', source: 'IELTS Official', title: '大学应重实用还是重理论', keyword: 'university practical theoretical', tags: ['Task 2', 'discuss both views'], prompt: 'Some people think universities should provide graduates with the practical skills needed in the workplace. Others believe the true purpose of university is to give theoretical knowledge. Discuss both views and give your own opinion. (Write at least 250 words.)', referenceAnswer: '参考要点：\n· 两端都让步，再明确立场；\n· 实用派：就业竞争力、产学结合；\n· 理论派：批判思维、终身学习基础；\n· 用 mitigate / facilitate / cohesive 等词汇提升 Lexical Resource。' },
  { exam: 'IELTS', subject: 'Speaking', type: 'Part 1 问答', difficulty: 'easy', year: 'Sample', source: 'IELTS Speaking', title: '闲暇阅读', keyword: 'books free time', tags: ['Part 1'], prompt: 'What kind of books do you like to read in your free time? Why?', referenceAnswer: '参考要点：\n· 先给类型（小说/传记/科普），再给 1–2 个理由；\n· 用具体例子，如 "a biography of … because it shows …"；\n· 流利度优先，避免长难句卡顿。' },
  { exam: 'IELTS', subject: 'Speaking', type: 'Part 2 独白', difficulty: 'medium', year: 'Sample', source: 'IELTS Speaking', title: '引人思考的电影', keyword: 'film describe', tags: ['Part 2', 'cue card'], prompt: 'Describe a film that made you think. You should say:\n· what the film was\n· when you watched it\n· what it was about\n· and why it made you think.', referenceAnswer: '参考要点：\n· 用 1 分钟覆盖四个要点，每点约 15 秒；\n· 用连接词衔接（first, then, what struck me most）；\n· 结尾点明思考点，如 "it changed how I see …"。' },
  { exam: 'IELTS', subject: 'Listening', type: '地图题', difficulty: 'medium', year: 'Vol.14', source: 'Cambridge IELTS 14', title: '博物馆平面图标注', keyword: 'map labelling museum', tags: ['Section 2', 'map labelling'], prompt: '听一段博物馆导览，用列表 A–H 中的名称标注平面图上的 1–4 号位置。', referenceAnswer: '参考要点：\n· 先锁定方位词（opposite / next to / behind）；\n· 跟着录音顺序标，不要跳；\n· 注意同义替换，如 "gift shop" = "souvenir store"。' },
  { exam: 'IELTS', subject: 'Reading', type: '摘要填空', difficulty: 'easy', year: 'Vol.13', source: 'Cambridge IELTS 13', title: '茶的历史摘要', keyword: 'tea history summary', tags: ['summary completion'], prompt: '用文章中的词完成关于茶历史的摘要填空（每空一词）。', referenceAnswer: '参考要点：\n· 答案多为名词/动词原词；\n· 先定位段落再找同义替换；\n· 注意字数限制（ONE word）。' },

  // ---------------- TOEFL ----------------
  { exam: 'TOEFL', subject: 'Reading', type: '选择题', difficulty: 'medium', year: 'Sample', source: 'TOEFL Official', title: '腓尼基贸易', keyword: 'Phoenicians trade', tags: ['fact detail'], prompt: 'According to paragraph 3, why did the Phoenicians become successful traders?\nA. They had the largest army.\nB. They controlled key seaports.\nC. They invented paper.\nD. They taxed neighbors heavily.', referenceAnswer: '参考要点：\n· 正确项对应段落明确陈述；\n· 排除无依据或与段落矛盾的选项；\n· 注意 "according to paragraph 3" 限定范围。' },
  { exam: 'TOEFL', subject: 'Reading', type: '推断题', difficulty: 'hard', year: 'Sample', source: 'TOEFL Official', title: '作者态度推断', keyword: 'infer attitude', tags: ['inference'], prompt: 'What can be inferred about the author\'s attitude toward the new policy?\nA. Strongly supportive\nB. Mildly critical\nC. Neutral\nD. Uninformed', referenceAnswer: '参考要点：\n· 推断题答案不直接出现，需从用词（hedging / praise）判断；\n· 选最贴合语气的一项，避免过度推断；\n· 排除文中明确反对/支持的反向项。' },
  { exam: 'TOEFL', subject: 'Listening', type: '选择题', difficulty: 'medium', year: 'Sample', source: 'TOEFL Official', title: '光合作用讲座', keyword: 'photosynthesis lecture', tags: ['lecture', 'main idea'], prompt: 'What is the professor mainly discussing in the lecture on photosynthesis?\nA. How plants store water\nB. The role of chlorophyll in energy conversion\nC. Why leaves change color\nD. Plant reproduction', referenceAnswer: '参考要点：\n· 主旨题听开头 "Today we\'ll focus on …"；\n· 排除只被举例提及的细节；\n· 选覆盖全篇的核心概念。' },
  { exam: 'TOEFL', subject: 'Listening', type: '态度题', difficulty: 'hard', year: 'Sample', source: 'TOEFL Official', title: '小组项目态度', keyword: 'group project attitude', tags: ['attitude', 'conversation'], prompt: 'What does the student imply about the group project?\nA. It was well organized.\nB. He preferred working alone.\nC. The deadline was fair.\nD. The topic was too easy.', referenceAnswer: '参考要点：\n· 态度/暗示题听语气与转折（actually / to be honest）；\n· 选符合言外之意的项；\n· 排除字面相反项。' },
  { exam: 'TOEFL', subject: 'Writing', type: '综合写作', difficulty: 'hard', year: 'Sample', source: 'TOEFL Official', title: '斑马贻贝综合写作', keyword: 'zebra mussels integrated', tags: ['integrated writing'], prompt: 'Read the passage about zebra mussels. Then listen to the lecture. Summarize the points made in the lecture that cast doubt on the reading. (Write 150–225 words.)', referenceAnswer: '参考要点：\n· 结构：阅读主张 + 听力逐条反驳；\n· 用 "The lecturer challenges the claim that … by pointing out …"；\n· 不写自己观点，只对比两方；\n· 控制字数，抓三点反驳。' },
  { exam: 'TOEFL', subject: 'Writing', type: '独立写作', difficulty: 'medium', year: 'Sample', source: 'TOEFL Official', title: '社区志愿服务', keyword: 'volunteer community service', tags: ['independent writing'], prompt: 'Do you agree or disagree with the following statement: university students should be required to do volunteer work in their community. Use reasons and examples to support your answer. (Write at least 200 words.)', referenceAnswer: '参考要点：\n· 明确立场（agree/disagree）；\n· 两段理由 + 例证（如 "volunteering builds empathy"）；\n· 用具象例子而非空泛表态；\n· 结尾重申立场。' },
  { exam: 'TOEFL', subject: 'Speaking', type: '独立口语 (Task 1)', difficulty: 'easy', year: 'Sample', source: 'TOEFL Official', title: '晨读还是夜读', keyword: 'study morning evening', tags: ['independent speaking'], prompt: 'Some students prefer to study in the morning; others prefer the evening. Which do you prefer? Use reasons and examples.', referenceAnswer: '参考要点：\n· 45 秒内给偏好 + 1 个理由 + 例子；\n· 用 "I prefer … because … For instance …"；\n· 发音与流利度优先于词汇难度。' },
  { exam: 'TOEFL', subject: 'Speaking', type: '综合口语 (Task 2)', difficulty: 'medium', year: 'Sample', source: 'TOEFL Official', title: '新校车时刻表', keyword: 'bus schedule announcement', tags: ['integrated speaking'], prompt: 'The university announces a new bus schedule. Listen to the student\'s opinion. State whether you agree with the change and explain why. (Preparation 30s, speak 60s.)', referenceAnswer: '参考要点：\n· 先概括公告，再转述学生态度与理由；\n· 用 "The student opposes it because …"；\n· 结构清晰：态度 → 理由1 → 理由2。' },
  { exam: 'TOEFL', subject: 'Speaking', type: '独立口语 (Task 1)', difficulty: 'medium', year: 'Sample', source: 'TOEFL Official', title: '大城市还是小城镇', keyword: 'city town live', tags: ['independent speaking'], prompt: 'Do you prefer to live in a large city or a small town? Use reasons and examples to support your answer.', referenceAnswer: '参考要点：\n· 给明确偏好 + 对比优势；\n· 大城市：机会/便利；小城镇：安静/人情味；\n· 用具体生活例子支撑。' },
  { exam: 'TOEFL', subject: 'Writing', type: '独立写作', difficulty: 'hard', year: 'Sample', source: 'TOEFL Official', title: '体验式消费', keyword: 'experience possession spending', tags: ['independent writing'], prompt: 'Some people believe it is better to spend money on experiences (such as travel or concerts) than on material possessions. To what extent do you agree? Use reasons and examples.', referenceAnswer: '参考要点：\n· 立论：体验带来持久记忆与成长；\n· 对比：物品会贬值、边际效用递减；\n· 让步：必要物品仍有价值；\n· 结尾重申体验优先。' },
];

export const SEED_QUESTIONS = QUESTIONS;
