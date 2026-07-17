export type DemoAuthor = {
  name: string;
};

export type DemoComment = {
  key: string;
  author: string;
  content: string;
  parentKey?: string;
};

export type DemoPost = {
  author: string;
  game: string;
  tag: string;
  title: string;
  brief: string;
  content: string;
  viewCount: number;
  imageKey?: string;
  comments?: readonly DemoComment[];
  likes?: readonly string[];
};

export type DemoImageFixture = {
  key: string;
  fileName: string;
};

export const DEMO_AUTHORS: readonly DemoAuthor[] = [
  { name: '星海攻略组' },
  { name: '爱睡觉的旅人' },
  { name: '夜之城电台' },
  { name: '海拉鲁工坊' },
  { name: '提瓦特观察员' },
] as const;

export const DEMO_IMAGE_FIXTURES: readonly DemoImageFixture[] = [
  { key: 'black-myth-temple', fileName: 'black-myth-temple.jpg' },
  { key: 'black-myth-boss', fileName: 'black-myth-boss.jpg' },
  { key: 'genshin-fontaine', fileName: 'genshin-fontaine.jpg' },
  { key: 'genshin-event', fileName: 'genshin-event.jpg' },
  { key: 'elden-shadow', fileName: 'elden-shadow.jpg' },
  { key: 'elden-malenia', fileName: 'elden-malenia.jpg' },
  { key: 'zelda-ultrahand', fileName: 'zelda-ultrahand.jpg' },
  { key: 'zelda-sky-island', fileName: 'zelda-sky-island.jpg' },
  { key: 'cyberpunk-night-city', fileName: 'cyberpunk-night-city.jpg' },
  { key: 'cyberpunk-dogtown', fileName: 'cyberpunk-dogtown.jpg' },
] as const;

export const DEMO_POSTS: readonly DemoPost[] = [
  {
    author: '星海攻略组',
    game: '黑神话:悟空',
    tag: '攻略',
    title: '黑神话悟空：广智广谋速通打法与变身时机详解',
    brief: '拆解双狼组合的拉怪顺序、变身时机与定身术用法。',
    content:
      '前期最劝退的双狼组合，核心是拉开广谋、专注广智。变身「狼斗」后优先打断广谋的火刀起手，定身术留给广智的连斩。贴脸输出三套接重击翻滚，基本能稳定无伤。',
    viewCount: 1684,
    imageKey: 'black-myth-boss',
    comments: [
      {
        key: 'bmg-1',
        author: '爱睡觉的旅人',
        content: '定身术留到连斩确实稳定很多。',
      },
      {
        key: 'bmg-2',
        author: '夜之城电台',
        content: '低棍势也能照这个节奏打吗？',
        parentKey: 'bmg-1',
      },
    ],
    likes: ['爱睡觉的旅人', '海拉鲁工坊'],
  },
  {
    author: '爱睡觉的旅人',
    game: '黑神话:悟空',
    tag: '评测',
    title: '通关黑神话后聊聊：国产3A的里程碑与那些遗憾',
    brief: '从战斗、美术与地图引导回看完整一周目的得失。',
    content:
      '战斗手感和美术毫无疑问是国产天花板，棍法三系打起来酣畅淋漓。遗憾在于后期地图引导偏弱、部分土地庙之间跑图略累。瑕不掩瑜，值得一周目慢慢品。',
    viewCount: 2419,
    likes: ['星海攻略组', '提瓦特观察员'],
  },
  {
    author: '星海攻略组',
    game: '黑神话:悟空',
    tag: '资讯',
    title: '黑神话悟空全球销量破2500万，开发商透露DLC方向',
    brief: '整理销量节点与开发团队公开提及的后续内容方向。',
    content:
      '官方最新公布累计销量突破2500万份。制作人采访中提到，后续DLC会围绕未在正传展开的几位妖王，并补完部分影神图剧情，具体上线时间待定。',
    viewCount: 3188,
    imageKey: 'black-myth-temple',
    comments: [
      {
        key: 'bmn-1',
        author: '海拉鲁工坊',
        content: '希望后续地图引导也能一起优化。',
      },
    ],
  },
  {
    author: '夜之城电台',
    game: '黑神话:悟空',
    tag: '求助',
    title: '卡在虎先锋三小时，棍势和法术该怎么配？',
    brief: '求一套适合初见虎先锋的低容错配点与出招节奏。',
    content:
      '目前二十多级，劈棍点到三段，定身和聚形散气都有。虎先锋进入二阶段后总被连续拳压起身，想请教法力、气力和棍势怎么分配，以及哪些招必须提前闪。',
    viewCount: 936,
    comments: [
      {
        key: 'bmh-1',
        author: '星海攻略组',
        content: '先别贪三段蓄力，二阶段以识破和短连段为主。',
      },
    ],
    likes: ['爱睡觉的旅人'],
  },
  {
    author: '海拉鲁工坊',
    game: '黑神话:悟空',
    tag: '活动',
    title: '黑风山速通挑战周：限定法宝路线交流',
    brief: '社区挑战限定法宝与时间，交流稳定的黑风山路线。',
    content:
      '本周挑战从苍狼林出发到黑风洞结束，只允许使用定身术与初始法宝。帖子内按土地庙记录分段时间，完成玩家可分享路线和失误点，活动不涉及任何站外奖励。',
    viewCount: 702,
    likes: ['星海攻略组', '夜之城电台'],
  },
  {
    author: '星海攻略组',
    game: '黑神话:悟空',
    tag: '攻略',
    title: '盘丝岭迷路救星：土地庙与关键支线顺序',
    brief: '按土地庙拆分盘丝岭路线，避免遗漏关键支线。',
    content:
      '盘丝岭岔路多，建议先开花间桥，再沿右侧山壁处理符纸支线。到濯垢泉后先不要直奔主线，回头清理虫茧区域可以少跑一趟。文中按土地庙给出回环路线。',
    viewCount: 1296,
    likes: ['爱睡觉的旅人'],
  },
  {
    author: '爱睡觉的旅人',
    game: '黑神话:悟空',
    tag: '评测',
    title: '三套棍法实战体验：劈棍、立棍与戳棍怎么选',
    brief: '从上手成本、输出窗口和复杂地形比较三套棍法。',
    content:
      '劈棍泛用、立棍适合规避地面招式，戳棍则更看距离控制。日常探索建议劈棍为主，狭窄地形切立棍，熟悉boss后再用戳棍追求更稳定的安全输出。',
    viewCount: 1118,
  },
  {
    author: '爱睡觉的旅人',
    game: '原神',
    tag: '攻略',
    title: '原神枫丹水神boss机制拆解与低练度配队推荐',
    brief: '分阶段讲清水神战节奏与低练度双水配队。',
    content:
      '水神战核心是处理「圣俗弦歌」的节奏切换：蓝条阶段拉开走位、红条阶段贴脸打。低练度可用芙宁娜加那维莱特双水核心，再配钟离护盾，容错极高。',
    viewCount: 2081,
    imageKey: 'genshin-fontaine',
    comments: [
      {
        key: 'gng-1',
        author: '提瓦特观察员',
        content: '没有钟离也可以用莱依拉替代。',
      },
    ],
    likes: ['提瓦特观察员', '星海攻略组'],
  },
  {
    author: '星海攻略组',
    game: '原神',
    tag: '求助',
    title: '新手求助：原神前期抽卡资源优先给谁比较稳？',
    brief: '新玩家围绕主C与辅助优先级寻求稳健抽卡建议。',
    content:
      '刚入坑三天，目前40抽。看攻略说优先攒大保底，但又怕错过限定。主C到底是先抽输出还是先抽个好用的辅助？求老玩家给个不踩坑的思路。',
    viewCount: 1473,
    comments: [
      {
        key: 'gnh-1',
        author: '提瓦特观察员',
        content: '先围绕喜欢的角色组队，不必追每期强度。',
      },
    ],
  },
  {
    author: '爱睡觉的旅人',
    game: '原神',
    tag: '活动',
    title: '原神4.6版本限时活动「神腾月跃」奖励与玩法一览',
    brief: '汇总限时玩法、原石奖励与优先完成顺序。',
    content:
      '本期活动主打节奏小游戏加解谜，全清可拿800原石、若干天赋材料和一个限定头像。活动限时两周，建议优先做奖励档位高的前三关，后面偏收集向。',
    viewCount: 1895,
    imageKey: 'genshin-event',
    likes: ['星海攻略组', '提瓦特观察员'],
  },
  {
    author: '提瓦特观察员',
    game: '原神',
    tag: '资讯',
    title: '枫丹版本前瞻要点：新区域开放与角色复刻安排',
    brief: '按官方前瞻整理区域、任务和卡池信息。',
    content:
      '前瞻确认将开放枫丹北部新区域，并追加一段世界任务。卡池上半以新角色为主，下半安排两名老角色复刻。具体时间与奖励以游戏内公告为准。',
    viewCount: 2250,
    likes: ['爱睡觉的旅人'],
  },
  {
    author: '爱睡觉的旅人',
    game: '原神',
    tag: '评测',
    title: '回归玩家体验报告：任务堆积之外的枫丹优点',
    brief: '从探索、水下移动与任务节奏评价回归体验。',
    content:
      '回归最明显的压力来自任务列表，但枫丹的水下探索比预期轻松，移动和解谜反馈都很顺。建议先开传送点，再挑一条主线推进，不必一次清空地图。',
    viewCount: 984,
  },
  {
    author: '提瓦特观察员',
    game: '原神',
    tag: '攻略',
    title: '零命那维莱特培养路线：圣遗物、武器与循环',
    brief: '给出零命角色的材料、词条和输出循环优先级。',
    content:
      '圣遗物先保证暴击与生命，再补水伤。四星武器以稳定充能为优先，队伍循环从辅助增益开始，最后切那维莱特完成三轮重击，避免过早消耗水滴。',
    viewCount: 1762,
    likes: ['星海攻略组'],
  },
  {
    author: '提瓦特观察员',
    game: '原神',
    tag: '活动',
    title: '深境螺旋配队交流夜：四星角色也能满星',
    brief: '集中交流低成本深境阵容和站位细节。',
    content:
      '活动以本期深境为样本，欢迎贴出角色池和练度，由社区一起调整上下半阵容。重点讨论四星角色替代、聚怪位置和生存位选择，不以竞速为目标。',
    viewCount: 641,
  },
  {
    author: '星海攻略组',
    game: '艾尔登法环',
    tag: '攻略',
    title: '艾尔登法环：女武神玛莲妮亚无伤打法思路',
    brief: '拆解水鸟乱舞与二阶段腐败爆发的处理节奏。',
    content:
      '一阶段最难的是「水鸟乱舞」：第一段后摇翻滚、第二段贴着她转、第三段再翻三下。二阶段腐败爆发先拉距离吃药。盾反流和法师流两套思路都附在文末。',
    viewCount: 3560,
    imageKey: 'elden-malenia',
    comments: [
      {
        key: 'erg-1',
        author: '爱睡觉的旅人',
        content: '第二段贴身转向是关键，练会后稳定很多。',
      },
      {
        key: 'erg-2',
        author: '星海攻略组',
        content: '轻装翻滚容错会更高。',
        parentKey: 'erg-1',
      },
    ],
    likes: ['爱睡觉的旅人', '夜之城电台', '海拉鲁工坊'],
  },
  {
    author: '爱睡觉的旅人',
    game: '艾尔登法环',
    tag: '评测',
    title: '黄金树幽影DLC评测：难度与诚意并存的封神之作',
    brief: '评价幽影之地地图、成长系统与高强度boss设计。',
    content:
      'DLC的碎片地图设计依旧顶级，圣树碎片成长系统也缓解了等级焦虑。boss强度普遍偏高，但每一个都打得有理有据。140小时老玩家给满分。',
    viewCount: 2945,
    imageKey: 'elden-shadow',
    likes: ['星海攻略组', '海拉鲁工坊'],
  },
  {
    author: '爱睡觉的旅人',
    game: '艾尔登法环',
    tag: '活动',
    title: '艾尔登法环联机互助周：组队过boss免费送符文',
    brief: '为新人整理联机召唤点并发起社区互助活动。',
    content:
      '本周开启玩家互助活动，新人发起联机信号、老玩家协助击败指定boss即可双方获得符文奖励。文末附了召唤标志的常见刷新点，欢迎来交界地抱团。',
    viewCount: 1205,
    comments: [
      {
        key: 'era-1',
        author: '夜之城电台',
        content: '晚上十点后可以帮忙打蒙格。',
      },
    ],
  },
  {
    author: '夜之城电台',
    game: '艾尔登法环',
    tag: '资讯',
    title: '幽影之地平衡更新汇总：武器与祷告调整',
    brief: '整理本次平衡补丁对常用流派的主要影响。',
    content:
      '更新提高了部分轻武器削韧，同时调整数个祷告的前摇和耗蓝。大剑与出血流核心机制未被重做，已有配装不必全部推倒，先根据常用战技微调即可。',
    viewCount: 1547,
  },
  {
    author: '海拉鲁工坊',
    game: '艾尔登法环',
    tag: '求助',
    title: '刚进幽影之地总被秒，幽影树碎片该先去哪找？',
    brief: '低加护等级玩家寻求前期碎片路线与生存建议。',
    content:
      '角色一百五十级，但进入DLC后普通怪两下就倒。现在加护等级只有二，想先收集容易拿的碎片再推boss，求一条尽量少战斗的开图路线。',
    viewCount: 822,
    likes: ['星海攻略组'],
  },
  {
    author: '星海攻略组',
    game: '艾尔登法环',
    tag: '攻略',
    title: '幽影城探索路线：仓库区捷径与赐福点全开',
    brief: '按楼层说明仓库区捷径、机关和赐福位置。',
    content:
      '从正门广场进入后先开一层赐福，再沿标本仓库外墙上行。四层拉杆会改变中央结构，建议先开西侧电梯捷径，死亡后能省下大段跑图时间。',
    viewCount: 1369,
  },
  {
    author: '爱睡觉的旅人',
    game: '艾尔登法环',
    tag: '评测',
    title: '法环重玩观察：开放世界后半程为何容易疲劳',
    brief: '从重复地牢、成长曲线与路线自由度分析重玩感受。',
    content:
      '前半程探索奖励密集，后半程重复地牢和数值提升变慢，容易产生清单疲劳。重玩时放弃全收集、围绕角色扮演选路线，反而更能感受到开放世界的自由。',
    viewCount: 990,
  },
  {
    author: '星海攻略组',
    game: '塞尔达传说:王国之泪',
    tag: '攻略',
    title: '王国之泪「究极手」妙用：10个实用载具搭建思路',
    brief: '从飞行木筏到炮台车，整理低成本究极手造物。',
    content:
      '从最简单的飞行木筏到自动炮台车，本文整理了10个不肝材料的实用造物，重点讲了怎么用回收机制把一个风扇玩出花，新手也能照着搭。',
    viewCount: 3314,
    imageKey: 'zelda-ultrahand',
    comments: [
      {
        key: 'ztg-1',
        author: '海拉鲁工坊',
        content: '双风扇平衡车最适合前期开图。',
      },
    ],
    likes: ['海拉鲁工坊', '爱睡觉的旅人'],
  },
  {
    author: '爱睡觉的旅人',
    game: '塞尔达传说:王国之泪',
    tag: '资讯',
    title: '王国之泪斩获多项年度提名，开放世界再次封神',
    brief: '回顾年度提名与系列对自由度设计的持续探索。',
    content:
      '凭借究极手与天地三层地图的设计，本作在多个媒体年度评选中获得提名。任天堂表示「自由度」依然是塞尔达系列下一步探索的核心方向。',
    viewCount: 2670,
    imageKey: 'zelda-sky-island',
    likes: ['星海攻略组'],
  },
  {
    author: '海拉鲁工坊',
    game: '塞尔达传说:王国之泪',
    tag: '求助',
    title: '地下世界太暗总迷路，光亮花种子怎么规划？',
    brief: '寻求地下探索照明、标记与资源管理方法。',
    content:
      '每次进地下都把光亮花种子丢光，仍然找不到树根。想知道大型种子该留给哪些区域，小型种子怎么控制距离，以及有没有容易辨认方向的地表参照。',
    viewCount: 754,
    comments: [
      {
        key: 'zth-1',
        author: '星海攻略组',
        content: '先把地表神庙位置标到地下，通常正下方就是树根。',
      },
    ],
  },
  {
    author: '爱睡觉的旅人',
    game: '塞尔达传说:王国之泪',
    tag: '评测',
    title: '天地空三层地图真的更好吗？百小时后的体验',
    brief: '评价三层地图在探索密度、重复感与路线选择上的表现。',
    content:
      '天空岛带来清晰目标，地下则依靠黑暗制造未知感，地表负责串联任务。三层互相映射是亮点，但地下素材重复稍多。总体仍是少见的系统驱动开放世界。',
    viewCount: 1432,
    likes: ['海拉鲁工坊'],
  },
  {
    author: '海拉鲁工坊',
    game: '塞尔达传说:王国之泪',
    tag: '活动',
    title: '究极手创意工坊：只用六件左纳乌装置造车',
    brief: '限定零件数量的社区载具创作与交流活动。',
    content:
      '本周工坊限定最多六件左纳乌装置，目标是做出能跨越草地和浅水的载具。请附材料清单与搭建步骤，重点交流稳定性和能耗，不以速度为唯一标准。',
    viewCount: 613,
  },
  {
    author: '海拉鲁工坊',
    game: '塞尔达传说:王国之泪',
    tag: '攻略',
    title: '初始空岛最短路线：能力解锁与防寒准备',
    brief: '为新手整理能力解锁顺序和雪地区域防寒方案。',
    content:
      '先取究极手再走通天术路线，可以减少来回攀爬。进入雪地前准备暖暖草果料理，齿轮机关优先观察落点再使用倒转乾坤，整体路线会顺畅很多。',
    viewCount: 1106,
  },
  {
    author: '提瓦特观察员',
    game: '塞尔达传说:王国之泪',
    tag: '资讯',
    title: '王国之泪版本维护说明：复制漏洞与任务修正',
    brief: '概括维护更新对常见漏洞和任务阻塞的修正。',
    content:
      '本次维护修正了数个会导致主线任务无法继续的问题，并处理部分素材复制方式。已经触发异常任务的玩家更新后重新读取存档即可继续，正常探索不受影响。',
    viewCount: 1280,
  },
  {
    author: '星海攻略组',
    game: '赛博朋克2077',
    tag: '攻略',
    title: '赛博朋克2077往日之影：隐藏结局达成条件梳理',
    brief: '按时间线列出往日之影关键选择与隐藏结局条件。',
    content:
      '想拿「正确的人生」结局，关键在桥上对话不要催促、后续任务全程不掏枪。本文按时间线列出每个抉择点，避免一步错满盘皆输。剧透警告。',
    viewCount: 2842,
    imageKey: 'cyberpunk-dogtown',
    likes: ['夜之城电台', '爱睡觉的旅人'],
  },
  {
    author: '爱睡觉的旅人',
    game: '赛博朋克2077',
    tag: '评测',
    title: '2.0版本重做后的夜之城，值得老玩家回归吗',
    brief: '从技能树、警察系统与义体改造评价 2.0 回归价值。',
    content:
      '技能树推倒重做、警察系统终于能玩了，车战和义体改造的体验提升巨大。如果你是1.0弃坑的，2.0加往日之影绝对值得重开一周目。',
    viewCount: 2169,
    imageKey: 'cyberpunk-night-city',
    comments: [
      {
        key: 'cpr-1',
        author: '夜之城电台',
        content: '义体容量系统让配装取舍更有意思。',
      },
    ],
    likes: ['星海攻略组', '夜之城电台'],
  },
  {
    author: '星海攻略组',
    game: '赛博朋克2077',
    tag: '求助',
    title: '求助：赛博朋克2077义体怎么搭配输出最高？',
    brief: '潜行黑客流玩家寻求转刀战或枪械的泛用义体方案。',
    content:
      '玩潜行黑客流到中期有点乏力，想转刀战或者枪械，预算大概30万欧元。三明治反应、神经索这些哪个优先级更高？求一套泛用配装。',
    viewCount: 1324,
    comments: [
      {
        key: 'cph-1',
        author: '夜之城电台',
        content: '先确定主武器，刀战优先斯安威斯坦和近战增益。',
      },
    ],
  },
  {
    author: '夜之城电台',
    game: '赛博朋克2077',
    tag: '资讯',
    title: '夜之城电台周报：2.1更新交通与地铁功能汇总',
    brief: '整理地铁、随身电台和车辆系统的主要变化。',
    content:
      '2.1更新加入可乘坐地铁与随身电台，并调整摩托车操控和追逐战触发。已有存档可以直接体验，新功能不会重置技能树，建议更新前保留一份手动存档。',
    viewCount: 1711,
    likes: ['爱睡觉的旅人'],
  },
  {
    author: '夜之城电台',
    game: '赛博朋克2077',
    tag: '活动',
    title: '夜之城摄影夜：霓虹街区与车辆合影征集',
    brief: '以夜景和车辆为主题的站内截图交流活动。',
    content:
      '本周主题是雨夜霓虹，地点不限但需标注拍摄区域和游戏内时间。欢迎分享光追与非光追设置，活动只交流构图和画面参数，不要求使用外部滤镜。',
    viewCount: 587,
  },
  {
    author: '星海攻略组',
    game: '赛博朋克2077',
    tag: '攻略',
    title: '黑客流 2.0 入门：RAM 循环与快速破解队列',
    brief: '讲清 RAM 回收、破解队列和潜行开战顺序。',
    content:
      '黑客流先用低耗破解叠队列，再用高伤技能收尾。义体优先提升RAM恢复和队列长度，潜行时先关摄像头、标记敌人，避免开局就把资源打空。',
    viewCount: 1458,
  },
  {
    author: '爱睡觉的旅人',
    game: '赛博朋克2077',
    tag: '评测',
    title: '往日之影剧情回看：忠诚、自由与选择代价',
    brief: '不剧透评价资料片角色塑造与分支选择的重量。',
    content:
      '往日之影最出色的不是任务规模，而是每个角色都带着可信的动机。选择没有完美答案，结局会让前面的对话重新获得意义。建议首周目少看攻略，接受自己的决定。',
    viewCount: 1197,
    likes: ['夜之城电台', '提瓦特观察员'],
  },
] as const;
