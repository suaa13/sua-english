// data.js — seed content (to be replaced with real/API data in later phases)

export const NAV = [
  { seg: 'home', label: '首页', icon: 'home' },
  { seg: 'learn', label: '学习', icon: 'book' },
  { seg: 'partner', label: 'AI 伙伴', icon: 'sparkles' },
  { seg: 'bank', label: '真题题库', icon: 'layers' },
  { seg: 'mock', label: '模拟考试', icon: 'target' },
  { seg: 'profile', label: '我的学习', icon: 'user' },
];

// ---------------- Vocabulary ----------------
export const VOCAB = [
  { id: 'v-apple', word: 'apple', ipa: '/ˈæp.əl/', pos: 'n.', cn: '苹果', en: 'a round fruit with red or green skin', example: 'She ate a red apple for breakfast.', exampleCn: '她早餐吃了一个红苹果。', collocation: 'apple pie, an apple a day', synonym: 'pome', level: 'basic', scenario: '日常基础词汇，用于描述食物与习惯。' },
  { id: 'v-book', word: 'book', ipa: '/bʊk/', pos: 'n.', cn: '书；预订', en: 'a written work / to reserve in advance', example: 'I booked a table for two.', exampleCn: '我预订了一张两人桌。', collocation: 'read a book, book a flight', synonym: 'reserve', level: 'basic', scenario: '既可作名词也可作动词，口语与旅行场景高频。' },
  { id: 'v-run', word: 'run', ipa: '/rʌn/', pos: 'v.', cn: '跑；经营', en: 'to move fast on foot / to manage', example: 'He runs a small cafe.', exampleCn: '他经营一家小咖啡馆。', collocation: 'run a business, run out of', synonym: 'operate', level: 'basic', scenario: '多义动词，基础到高阶都重要。' },
  { id: 'v-think', word: 'think', ipa: '/θɪŋk/', pos: 'v.', cn: '思考；认为', en: 'to have a thought / to believe', example: 'I think we should leave now.', exampleCn: '我想我们现在该走了。', collocation: 'think about, think over', synonym: 'consider', level: 'basic', scenario: '表达观点最核心的动词之一。' },
  { id: 'v-because', word: 'because', ipa: '/bɪˈkɔːz/', pos: 'conj.', cn: '因为', en: 'for the reason that', example: 'We stayed home because it rained.', exampleCn: '我们待在家里，因为下雨了。', collocation: 'because of', synonym: 'since', level: 'basic', scenario: '连接因果，写作与口语都必备。' },
  { id: 'v-important', word: 'important', ipa: '/ɪmˈpɔː.tənt/', pos: 'adj.', cn: '重要的', en: 'having great value or effect', example: 'Education is important for children.', exampleCn: '教育对孩子们很重要。', collocation: 'an important decision', synonym: 'crucial', level: 'basic', scenario: '描述事物重要性的高频形容词。' },
  { id: 'v-environment', word: 'environment', ipa: '/ɪnˈvaɪ.rən.mənt/', pos: 'n.', cn: '环境', en: 'the natural world and surroundings', example: 'We must protect the environment.', exampleCn: '我们必须保护环境。', collocation: 'protect the environment', synonym: 'surroundings', level: 'ielts', scenario: 'IELTS 写作与口语高频话题词。' },
  { id: 'v-significant', word: 'significant', ipa: '/sɪɡˈnɪf.ɪ.kənt/', pos: 'adj.', cn: '显著的；重要的', en: 'large or important enough to have an effect', example: 'There was a significant increase in sales.', exampleCn: '销售额有了显著增长。', collocation: 'a significant change', synonym: 'considerable', level: 'ielts', scenario: 'IELTS 图表题与议论文常用，替代 big。' },
  { id: 'v-ubiquitous', word: 'ubiquitous', ipa: '/juːˈbɪk.wɪ.təs/', pos: 'adj.', cn: '无处不在的', en: 'present everywhere at the same time', example: 'Smartphones are ubiquitous in modern life.', exampleCn: '智能手机在现代生活中无处不在。', collocation: 'ubiquitous technology', synonym: 'omnipresent', level: 'ielts', scenario: '高级词汇，用于展示词汇多样性。' },
  { id: 'v-mitigate', word: 'mitigate', ipa: '/ˈmɪt.ɪ.ɡeɪt/', pos: 'v.', cn: '减轻；缓解', en: 'to make something less severe', example: 'Trees help mitigate air pollution.', exampleCn: '树木有助于减轻空气污染。', collocation: 'mitigate the impact', synonym: 'alleviate', level: 'ielts', scenario: 'IELTS 问题解决型议论文高分动词。' },
  { id: 'v-comprehensive', word: 'comprehensive', ipa: '/ˌkɒm.prɪˈhen.sɪv/', pos: 'adj.', cn: '全面的；综合的', en: 'including everything that is needed', example: 'The report gives a comprehensive analysis.', exampleCn: '这份报告给出了全面的分析。', collocation: 'a comprehensive review', synonym: 'thorough', level: 'toefl', scenario: 'TOEFL 听力/阅读与写作常用。' },
  { id: 'v-hypothesis', word: 'hypothesis', ipa: '/haɪˈpɒθ.ə.sɪs/', pos: 'n.', cn: '假设', en: 'an idea suggested as a possible explanation', example: 'The hypothesis was later proven correct.', exampleCn: '这个假设后来被证明是正确的。', collocation: 'test a hypothesis', synonym: 'assumption', level: 'toefl', scenario: 'TOEFL 学术讲座高频学术词。' },
  { id: 'v-fluctuate', word: 'fluctuate', ipa: '/ˈflʌk.tʃu.eɪt/', pos: 'v.', cn: '波动', en: 'to change frequently in level or value', example: 'Prices fluctuated during the year.', exampleCn: '价格在一年内波动。', collocation: 'fluctuate wildly', synonym: 'vary', level: 'ielts', scenario: 'IELTS 动态图表题描述趋势。' },
  { id: 'v-facilitate', word: 'facilitate', ipa: '/fəˈsɪl.ɪ.teɪt/', pos: 'v.', cn: '促进；使便利', en: 'to make an action easier', example: 'The app facilitates language learning.', exampleCn: '这款应用促进了语言学习。', collocation: 'facilitate communication', synonym: 'ease', level: 'toefl', scenario: '学术写作与口语中替代 help。' },
  { id: 'v-sustainable', word: 'sustainable', ipa: '/səˈsteɪ.nə.bəl/', pos: 'adj.', cn: '可持续的', en: 'able to continue over time', example: 'We need sustainable energy sources.', exampleCn: '我们需要可持续的能源。', collocation: 'sustainable development', synonym: 'renewable', level: 'ielts', scenario: '环境与城市发展话题核心词。' },
  { id: 'v-analyze', word: 'analyze', ipa: '/ˈæn.əl.aɪz/', pos: 'v.', cn: '分析', en: 'to examine in detail', example: 'Scientists analyzed the data carefully.', exampleCn: '科学家仔细分析了数据。', collocation: 'analyze the results', synonym: 'examine', level: 'toefl', scenario: 'TOEFL 综合写作与听力核心动作。' },
  { id: 'v-contemporary', word: 'contemporary', ipa: '/kənˈtem.pər.ər.i/', pos: 'adj.', cn: '当代的；同时代的', en: 'belonging to the present time', example: 'The museum shows contemporary art.', exampleCn: '博物馆展出当代艺术。', collocation: 'contemporary society', synonym: 'modern', level: 'ielts', scenario: '文化类话题高分替换词。' },
  { id: 'v-pragmatic', word: 'pragmatic', ipa: '/præɡˈmæt.ɪk/', pos: 'adj.', cn: '务实的', en: 'dealing with things sensibly', example: 'We need a pragmatic solution.', exampleCn: '我们需要一个务实的解决方案。', collocation: 'a pragmatic approach', synonym: 'practical', level: 'toefl', scenario: '写作与口语中展示成熟度。' },
  { id: 'v-deteriorate', word: 'deteriorate', ipa: '/dɪˈtɪə.ri.ə.reɪt/', pos: 'v.', cn: '恶化', en: 'to become worse', example: 'Air quality deteriorated last winter.', exampleCn: '去年冬天空气质量恶化了。', collocation: 'deteriorate rapidly', synonym: 'worsen', level: 'ielts', scenario: '问题类话题动词，优于 become worse。' },
  { id: 'v-consequence', word: 'consequence', ipa: '/ˈkɒn.sɪ.kwəns/', pos: 'n.', cn: '后果', en: 'a result of an action', example: 'Climate change has serious consequences.', exampleCn: '气候变化有严重后果。', collocation: 'as a consequence', synonym: 'result', level: 'ielts', scenario: '议论文因果论证核心名词。' },
  { id: 'v-emphasize', word: 'emphasize', ipa: '/ˈem.fə.saɪz/', pos: 'v.', cn: '强调', en: 'to give special importance', example: 'The study emphasizes the risks.', exampleCn: '这项研究强调了风险。', collocation: 'emphasize the need', synonym: 'highlight', level: 'toefl', scenario: '写作与演讲中突出观点。' },
  { id: 'v-innovation', word: 'innovation', ipa: '/ˌɪn.əˈveɪ.ʃən/', pos: 'n.', cn: '创新', en: 'a new method or idea', example: 'Innovation drives economic growth.', exampleCn: '创新推动经济增长。', collocation: 'technological innovation', synonym: 'invention', level: 'toefl', scenario: '科技类话题万能高频词。' },
  { id: 'v-necessitate', word: 'necessitate', ipa: '/nəˈses.ɪ.teɪt/', pos: 'v.', cn: '使成为必要', en: 'to make something necessary', example: 'The change necessitates new training.', exampleCn: '这一变化使新的培训成为必要。', collocation: 'necessitate action', synonym: 'require', level: 'ielts', scenario: '高级书面语，展示语法复杂度。' },
  { id: 'v-prevalent', word: 'prevalent', ipa: '/ˈprev.əl.ənt/', pos: 'adj.', cn: '普遍的', en: 'widespread or common', example: 'Smartphones are prevalent among teens.', exampleCn: '智能手机在青少年中很普遍。', collocation: 'a prevalent belief', synonym: 'common', level: 'ielts', scenario: '替代 common 的书面高级词。' },
  { id: 'v-cohesive', word: 'cohesive', ipa: '/kəʊˈhiː.sɪv/', pos: 'adj.', cn: '连贯的；有凝聚力的', en: 'unified and logically connected', example: 'A cohesive essay flows naturally.', exampleCn: '连贯的文章读起来很自然。', collocation: 'a cohesive argument', synonym: 'unified', level: 'toefl', scenario: '写作评分的 coherence 维度关键词。' },
];

// ---------------- Grammar ----------------
export const GRAMMAR = [
  { id: 'g-alpha', title: '字母与单词', level: '0 基础', summary: '英语由 26 个字母组成，单词是句子的最小单位。', explain: '英语使用 26 个拉丁字母（A–Z）。单词由字母拼成，句子由单词组成。先认字母、再记单词，是 0 基础的第一步。', examples: ['A, B, C, D … Z', 'cat = c + a + t', 'I am Sue.'], exercise: { type: 'mc', q: '英语共有多少个字母？', options: ['24', '25', '26', '28'], answer: 2 } },
  { id: 'g-sentence', title: '句子基本结构', level: '0 基础', summary: '最基础的句子结构：主语 + 动词。', explain: '英语句子最核心的结构是「主语 + 谓语（动词）」。例如 "Birds fly."（鸟飞）。加上宾语可表达更完整："I drink water."（我喝水）。', examples: ['She smiles.', 'Tom eats an apple.', 'We study English.'], exercise: { type: 'mc', q: '“猫喝水。” 正确的英文结构是？', options: ['水 猫 喝', '猫 喝 水', '喝 猫 水', '猫 水 喝'], answer: 1 } },
  { id: 'g-be', title: 'be 动词', level: '基础', summary: 'am / is / are 表示「是 / 在」。', explain: 'be 动词随主语变化：I am, you/we/they are, he/she/it is。它用来说明身份、状态或位置。', examples: ['I am a student.', 'She is happy.', 'They are at home.'], exercise: { type: 'fill', q: '补全：He ___ a teacher.', answer: 'is', hint: '第三人称单数用 is' } },
  { id: 'g-present', title: '一般现在时', level: '基础', summary: '描述习惯、事实和常态。', explain: '一般现在时用于经常发生的动作或客观事实。第三人称单数动词加 -s/-es：He plays.', examples: ['I get up at 7.', 'The sun rises in the east.', 'She works hard.'], exercise: { type: 'mc', q: '“她每天看书。” 正确表达？', options: ['She read books daily.', 'She reads books daily.', 'She reading books daily.', 'She is read books.'], answer: 1 } },
  { id: 'g-past', title: '一般过去时', level: '基础', summary: '描述过去发生、已结束的动作。', explain: '规则动词加 -ed（played），不规则动词需单独记忆（go→went）。常与 yesterday / last week 连用。', examples: ['I visited Paris.', 'They went home.', 'He finished the test.'], exercise: { type: 'fill', q: '补全：We ___ (go) to the park yesterday.', answer: 'went', hint: 'go 的过去式是不规则变化' } },
  { id: 'g-future', title: '一般将来时', level: '基础', summary: 'will + 动词原形，表示将来。', explain: '用 will + 动词原形表达将来的动作或预测。口语中也常用 be going to 表示计划。', examples: ['I will call you.', 'It is going to rain.', 'They will arrive soon.'], exercise: { type: 'mc', q: '“我明天会帮你。” 正确表达？', options: ['I help you tomorrow.', 'I will help you tomorrow.', 'I helped you tomorrow.', 'I helping you tomorrow.'], answer: 1 } },
  { id: 'g-clause', title: '宾语从句', level: '中级', summary: '动词后接一个完整的句子作宾语。', explain: '当一个句子充当宾语时，就叫宾语从句。常见引导词：that, what, where。注意时态一致。', examples: ['I think that he is right.', 'She asked where I live.', 'I know what you mean.'], exercise: { type: 'mc', q: '宾语从句的引导词通常放在？', options: ['句首', '主语之后', '动词之后', '任意位置'], answer: 2 } },
  { id: 'g-cond', title: '条件句 If', level: '中级', summary: 'If + 条件，主句 + 结果。', explain: '第一类条件句：If + 一般现在时, 主句用 will。例如 If it rains, we will stay home.', examples: ['If you study, you will pass.', 'If I have time, I will call.', 'If he is late, we will start without him.'], exercise: { type: 'fill', q: '补全：If it ___ (rain), we will cancel.', answer: 'rains', hint: 'if 从句用一般现在时表将来' } },
  { id: 'g-writing', title: 'IELTS 写作语法：复杂句', level: 'IELTS / TOEFL', summary: '用连接词把简单句合并为复杂句，提升 Grammar 分数。', explain: '高分写作需要句式多样。用 although, whereas, nevertheless, furthermore 等连接词，把两个相关观点合并，展示语法复杂度与连贯性。', examples: ['Although it is costly, the plan is effective.', 'The city is crowded; nevertheless, it is lively.', 'Furthermore, education improves life quality.'], exercise: { type: 'mc', q: '哪一个是表示「让步」的连接词？', options: ['Furthermore', 'Although', 'Therefore', 'Meanwhile'], answer: 1 } },
];

// ---------------- Listening ----------------
export const LISTENING = [
  { id: 'l-1', title: 'A Travel Booking', level: '基础', exam: 'General', duration: '1:10', transcript: 'Hello, thank you for calling Sky Travel. How can I help you today? — Hi, I would like to book a flight to Tokyo next Monday. — Certainly. Do you prefer a morning or an evening departure? — Morning, please. And a window seat if possible. — Great, I have a seat available. Shall I confirm it? — Yes, please. Thank you.', questions: [
    { q: 'Where does the caller want to go?', options: ['Tokyo', 'Paris', 'London', 'New York'], answer: 0 },
    { q: 'What kind of seat does the caller request?', options: ['Aisle', 'Window', 'Middle', 'Any'], answer: 1 },
  ] },
  { id: 'l-2', title: 'IELTS Section 1 — Form Filling', level: 'IELTS', exam: 'IELTS', duration: '1:40', transcript: 'Good morning, this is the Riverside Sports Club. I’ll take your membership details. — Fine. My name is Emma Johnson. — Thank you, Emma. And your phone number? — It’s 0 7 7 0 0, double 4, 1 2 3. — Got it. Which membership type? — The annual one, please. — That’s one hundred and twenty pounds. When would you like to start? — The first of March.', questions: [
    { q: 'What is the member’s surname?', options: ['Johnson', 'Jackson', 'Johnston', 'Jones'], answer: 0 },
    { q: 'When does the membership start?', options: ['March 1st', 'March 11th', 'February 1st', 'April 1st'], answer: 0 },
    { q: 'How much is the annual fee?', options: ['£120', '£210', '£100', '£220'], answer: 0 },
  ] },
  { id: 'l-3', title: 'TOEFL Lecture — Renewable Energy', level: 'TOEFL', exam: 'TOEFL', duration: '2:05', transcript: 'Today we’ll look at why solar power has become so prevalent. First, the cost of panels has dropped sharply in the last decade. Second, governments facilitate adoption through subsidies. However, storage remains a challenge because sunlight is not constant. Researchers are analyzing new battery designs to mitigate this problem.', questions: [
    { q: 'According to the lecture, why has solar power grown?', options: ['Panels got cheaper', 'It is always available', 'Batteries are perfect', 'Governments banned coal'], answer: 0 },
    { q: 'What is described as still challenging?', options: ['Finding sunlight', 'Energy storage', 'Building panels', 'Hiring workers'], answer: 1 },
  ] },
];

// ---------------- Reading ----------------
export const READING = [
  { id: 'r-1', title: 'The History of Coffee', level: '基础', exam: 'General', text: 'Coffee originated in Ethiopia, where legend says a goat herder named Kaldi noticed his goats became energetic after eating certain red berries. By the 15th century, coffee was cultivated in Yemen and traded across the Arab world. In the 17th century it reached Europe, where coffee houses became centers of social and intellectual life. Today, coffee is one of the most traded commodities on Earth.\n\nDespite its popularity, coffee production faces challenges. Climate change has caused temperatures to rise in traditional growing regions, which deteriorates harvests. Sustainable farming methods are now necessary to protect both farmers and the environment.', questions: [
    { q: 'Where did coffee originally come from?', type: 'mc', options: ['Yemen', 'Ethiopia', 'Europe', 'Arabia'], answer: 1 },
    { q: 'Coffee houses in 17th-century Europe were…', type: 'mc', options: ['places to sleep', 'centers of social life', 'farms', 'factories'], answer: 1 },
    { q: 'Climate change has improved coffee harvests.', type: 'tf', options: ['True', 'False', 'Not Given'], answer: 1 },
  ] },
  { id: 'r-2', title: 'IELTS Reading — Urban Green Spaces', level: 'IELTS', exam: 'IELTS', text: 'Urban green spaces, such as parks and community gardens, provide significant benefits to city residents. A comprehensive study in 2021 found that people living near parks reported lower stress and better mental health. Furthermore, trees help mitigate air pollution by absorbing harmful particles.\n\nHowever, not all neighborhoods have equal access. Researchers emphasize that low-income areas often have fewer green spaces, which necessitates targeted investment. Cities that prioritize equitable park development tend to show measurable improvements in public health.', questions: [
    { q: 'The 2021 study found parks were linked to…', type: 'mc', options: ['higher crime', 'lower stress', 'less sleep', 'more traffic'], answer: 1 },
    { q: 'Low-income areas usually have more green spaces.', type: 'tf', options: ['True', 'False', 'Not Given'], answer: 1 },
    { q: 'The writer suggests investment should be…', type: 'mc', options: ['reduced', 'targeted at needy areas', 'stopped', 'given to rich areas'], answer: 1 },
  ] },
];

// ---------------- Writing Prompts ----------------
export const WRITING = [
  { id: 'w-ielts-t2-1', exam: 'IELTS', task: 'Task 2', title: '议论文：科技与人际', time: 40, type: 'essay', prompt: 'Some people believe that technology has made people less sociable. To what extent do you agree or disagree? Give reasons and include relevant examples.',
    structure: ['引言：改写题目 + 明确立场', '主体段 1：反方观点与让步', '主体段 2：己方论点与例证', '结论：重申立场，升华'] },
  { id: 'w-ielts-t1-1', exam: 'IELTS', task: 'Task 1', title: '图表：城市人口变化', time: 20, type: 'report', prompt: 'The chart below shows the population of three cities from 2000 to 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    chart: { type: 'line', labels: ['2000','2005','2010','2015','2020'], series: [ {name:'City A', data:[2,2.6,3.1,3.8,4.5]}, {name:'City B', data:[3,3.2,3.5,3.7,4.0]}, {name:'City C', data:[1.5,1.8,2.4,3.0,3.9]} ] } },
  { id: 'w-toefl-ind', exam: 'TOEFL', task: 'Independent', title: '独立写作', time: 29, type: 'essay', prompt: 'Do you agree or disagree with the following statement? "It is more important to study science and math than to study art and literature." Use reasons and examples to support your answer.',
    structure: ['引言：立场', '理由 1 + 例证', '理由 2 + 例证', '让步 + 结论'] },
  { id: 'w-toefl-int', exam: 'TOEFL', task: 'Integrated', title: '综合写作', time: 20, type: 'integrated', prompt: 'Read the passage and listen to the lecture, then write a response explaining how the lecture challenges the reading. (Reading + Listening + Writing)',
    structure: ['Reading 要点概括', 'Lecture 对应反驳', '对比组织成段', '注意用词准确'] },
];

// ---------------- Speaking ----------------
export const SPEAKING = {
  ielts: {
    part1: ['What is your name?', 'Do you work or study?', 'What do you usually do on weekends?', 'Do you like reading? Why or why not?', 'What kind of music do you enjoy?'],
    part2: [
      { cue: 'Describe a book that influenced you.', points: ['what the book was', 'when you read it', 'what it was about', 'why it influenced you'] },
      { cue: 'Describe a place you like to visit.', points: ['where it is', 'how often you go', 'what you do there', 'why you like it'] },
    ],
    part3: ['Why do people need to read more?', 'How does reading affect a child’s development?', 'Do you think books will be replaced by screens?'],
  },
  toefl: {
    tasks: [
      { n: 1, type: 'Independent', cue: 'Some students prefer to study alone. Others prefer to study in groups. Which do you prefer? Use reasons and examples.', prep: 15, speak: 45 },
      { n: 2, type: 'Integrated (Read/Listen/Speak)', cue: 'Read a campus announcement, then listen to a student’s opinion, and explain their attitude.', prep: 30, speak: 60 },
    ],
  },
};

// ---------------- IELTS / TOEFL structure ----------------
export const IELTS_INFO = {
  intro: 'IELTS（International English Language Testing System）是全球广泛认可的英语能力考试，分为 Academic（学术类）与 General Training（培训类）。',
  sections: [
    { key: 'listening', name: 'Listening', time: '30 分钟', detail: '4 个 Section，共 40 题。Academic 与 General Training 相同。' },
    { key: 'reading', name: 'Reading', time: '60 分钟', detail: '3 篇文章，40 题。A 类偏学术，G 类偏生活/工作。' },
    { key: 'writing', name: 'Writing', time: '60 分钟', detail: 'Task 1 + Task 2。A 类 Task 1 为图表，G 类 Task 1 为书信。' },
    { key: 'speaking', name: 'Speaking', time: '11–14 分钟', detail: 'Part 1–3 真人对话。A 类与 G 类相同。' },
  ],
  bands: [9,8,7,6,5,4],
  bandDesc: { 9:'专家', 8:'非常好', 7:'好', 6:'胜任', 5:'一般', 4:'有限' },
};

export const TOEFL_INFO = {
  intro: 'TOEFL iBT 自 2026 年 1 月 21 日起采用新版结构，整体时长约 2 小时。正式成绩采用 1–6 分制，过渡期同时提供可比的 0–120 分。',
  sections: [
    { key: 'reading', name: 'Reading', time: '约 36 分钟', detail: '约 2 篇文章，每篇 10 题，学术主题。' },
    { key: 'listening', name: 'Listening', time: '约 36 分钟', detail: '讲座与对话，综合理解。' },
    { key: 'speaking', name: 'Speaking', time: '约 16 分钟', detail: '学术讨论等任务，更贴近课堂。' },
    { key: 'writing', name: 'Writing', time: '约 29 分钟', detail: '学术讨论写作 + 综合写作。' },
  ],
  scoring: 'Reading / Listening / Speaking / Writing 各 1–6 分；Total 4–24（过渡期对应 0–120）。',
};

// ---------------- Real Test Bank ----------------
export const BANK = [
  { id: 'b-1', exam: 'IELTS', subject: 'Listening', type: 'Form Filling', year: 2023, difficulty: 'Medium', keyword: '住宿', title: 'Section 1 — 租房信息填空', desc: '根据对话填写租房申请表中的姓名、电话与租金。' },
  { id: 'b-2', exam: 'IELTS', subject: 'Reading', type: 'True/False/Not Given', year: 2022, difficulty: 'Hard', keyword: '环境', title: 'Passage — 塑料污染', desc: '判断关于海洋塑料的陈述是否为 True / False / Not Given。' },
  { id: 'b-3', exam: 'IELTS', subject: 'Writing', type: 'Task 1', year: 2024, difficulty: 'Medium', keyword: '图表', title: '柱状图 — 各年龄段运动习惯', desc: '描述并比较不同年龄段的运动频率。' },
  { id: 'b-4', exam: 'IELTS', subject: 'Speaking', type: 'Part 2', year: 2024, difficulty: 'Easy', keyword: '人物', title: 'Describe a polite person', desc: '口语 Part 2 话题卡，含四个提示点。' },
  { id: 'b-5', exam: 'IELTS', subject: 'Reading', type: 'Matching', year: 2023, difficulty: 'Medium', keyword: '历史', title: 'Passage — 古埃及贸易', desc: '信息匹配与段落主旨题。' },
  { id: 'b-6', exam: 'TOEFL', subject: 'Reading', type: 'Multiple Choice', year: 2024, difficulty: 'Hard', keyword: '生物', title: 'Passage — 蜜蜂舞蹈语言', desc: '学术阅读单选与插入句子题。' },
  { id: 'b-7', exam: 'TOEFL', subject: 'Listening', type: 'Lecture', year: 2023, difficulty: 'Medium', keyword: '地质', title: 'Lecture — 火山形成', desc: '听讲座后回答关于成因与影响的问题。' },
  { id: 'b-8', exam: 'TOEFL', subject: 'Speaking', type: 'Independent', year: 2024, difficulty: 'Medium', keyword: '教育', title: 'Independent — 小组 vs 独自学习', desc: '独立口语任务，准备 15 秒说 45 秒。' },
  { id: 'b-9', exam: 'TOEFL', subject: 'Writing', type: 'Integrated', year: 2024, difficulty: 'Hard', keyword: '科技', title: 'Integrated — 屏幕阅读', desc: '读文章 + 听讲座，写作回应。' },
  { id: 'b-10', exam: 'IELTS', subject: 'Listening', type: 'Multiple Choice', year: 2021, difficulty: 'Easy', keyword: '旅游', title: 'Section 2 — 博物馆导览', desc: '单选与地图题结合。' },
  { id: 'b-11', exam: 'TOEFL', subject: 'Reading', type: 'Multiple Choice', year: 2022, difficulty: 'Medium', keyword: '天文', title: 'Passage — 火星大气层', desc: '学术阅读细节与推断题。' },
  { id: 'b-12', exam: 'IELTS', subject: 'Writing', type: 'Task 2', year: 2024, difficulty: 'Hard', keyword: '社会', title: 'Essay — 远程办公的利弊', desc: '议论文，讨论远程办公的影响。' },
];

// ---------------- Mock Test templates ----------------
export const MOCK_TEMPLATE = {
  ielts: {
    name: 'IELTS 全真模拟',
    parts: [
      { key: 'listening', name: 'Listening', time: 30 * 60, questions: 10 },
      { key: 'reading', name: 'Reading', time: 60 * 60, questions: 10 },
      { key: 'writing', name: 'Writing', time: 60 * 60, questions: 2 },
      { key: 'speaking', name: 'Speaking', time: 14 * 60, questions: 3 },
    ],
  },
  toefl: {
    name: 'TOEFL iBT 模拟（2026 新版）',
    parts: [
      { key: 'reading', name: 'Reading', time: 36 * 60, questions: 10 },
      { key: 'listening', name: 'Listening', time: 36 * 60, questions: 10 },
      { key: 'speaking', name: 'Speaking', time: 16 * 60, questions: 4 },
      { key: 'writing', name: 'Writing', time: 29 * 60, questions: 2 },
    ],
  },
};

export function vocabById(id) { return VOCAB.find(v => v.id === id); }
export function byLevel(arr, level) { return arr.filter(x => x.level === level); }
