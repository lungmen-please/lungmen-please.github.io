'use strict';
// 静态数据：种族、国家、规则、报纸、台词。

const RACES = {
  feline: { name: '菲林', desc: '三角形猫耳；细长的尾巴。' },
  cautus: { name: '卡特斯', desc: '长长的兔耳；看不到尾巴。' },
  perro: { name: '佩洛', desc: '两侧下垂的犬耳；短尾巴。' },
  lupo: { name: '鲁珀', desc: '大而尖的狼耳；蓬松的中等尾巴。' },
  vulpo: { name: '沃尔珀', desc: '特大狐耳；巨大的狐尾，尾尖是白色。' },
  ursus: { name: '乌萨斯', desc: '头顶一对圆圆的熊耳；没有尾巴。' },
  zalak: { name: '札拉克', desc: '尖尖的小耳朵带一撮毛；向上卷的大尾巴。' },
  sarkaz: { name: '萨卡兹', desc: '深色、向后弯的角；尖耳朵。' },
  vouivre: { name: '瓦伊凡', desc: '浅色的直角；人类的圆耳朵；粗壮的鳞尾。' },
  sankta: { name: '萨科塔', desc: '头顶光环；背后一对小翅膀。' },
  liberi: { name: '黎博利', desc: '头部两侧长着羽毛，没有兽耳。' },
};
const RACE_ORDER = ['feline', 'cautus', 'perro', 'lupo', 'vulpo', 'ursus', 'zalak', 'sarkaz', 'vouivre', 'sankta', 'liberi'];
// 伪造证件时最常冒充的种族
const CONFUSE = {
  feline: ['lupo', 'vulpo', 'zalak'], cautus: ['feline', 'perro'], perro: ['lupo', 'ursus'], lupo: ['vulpo', 'feline', 'perro'],
  vulpo: ['lupo', 'feline'], ursus: ['zalak', 'perro'], zalak: ['ursus', 'feline', 'vulpo'], sarkaz: ['vouivre', 'liberi'],
  vouivre: ['sarkaz'], sankta: ['liberi'], liberi: ['sankta', 'cautus'],
};

const NATIONS = {
  lungmen: { name: '龙门', code: 'LM', color: '#8c3b2e', cn: true,
    races: { feline: 3, lupo: 2, perro: 2, vulpo: 2, zalak: 1, cautus: 2, liberi: 1, vouivre: 1 },
    cities: ['上城区', '下城区', '码头区', '中环'],
    last: ['陈', '林', '黄', '李', '王', '周', '吴', '郑', '何', '梁', '罗', '谢', '叶', '唐'],
    first: ['子豪', '嘉欣', '伟明', '美玲', '家乐', '晓彤', '志强', '丽华', '俊杰', '雅婷', '国栋', '慧敏', '文轩', '思颖'] },
  victoria: { name: '维多利亚', code: 'VC', color: '#3a4f7a',
    races: { feline: 2, lupo: 1, perro: 2, cautus: 1, liberi: 2, sarkaz: 1, vouivre: 1 },
    cities: ['伦蒂尼姆', '格拉斯哥', '温德米尔'],
    first: ['艾伦', '爱丽丝', '亨利', '露西', '托马斯', '格蕾丝', '威廉', '艾玛'], last: ['布朗', '温特斯', '格林', '霍华德', '克拉克', '斯宾塞'] },
  ursus: { name: '乌萨斯', code: 'UR', color: '#5a5f66',
    races: { ursus: 5, lupo: 1, feline: 1, sarkaz: 1, zalak: 1 },
    cities: ['切尔诺伯格', '圣骏堡', '乌兰'],
    first: ['伊万', '娜塔莎', '米沙', '安娜', '列昂', '索菲亚', '鲍里斯', '薇拉'], last: ['彼得罗夫', '沃尔科夫', '索科洛夫', '波波娃', '伊万诺娃'] },
  kazimierz: { name: '卡西米尔', code: 'KZ', color: '#7a6230',
    races: { cautus: 2, perro: 2, lupo: 1, liberi: 1, vouivre: 1, feline: 1 },
    cities: ['大骑士领', '卡拉卡斯', '维斯瓦'],
    first: ['扬', '玛丽亚', '托马什', '卡夏', '彼得', '阿加塔'], last: ['科瓦尔', '诺瓦克', '卡明斯基', '维希涅'] },
  laterano: { name: '拉特兰', code: 'LT', color: '#b08a2a',
    races: { sankta: 6, liberi: 1, perro: 1 },
    cities: ['拉特兰城', '圣城外环'],
    first: ['卢卡', '朱莉娅', '马可', '基娅拉', '洛伦佐', '索菲娅'], last: ['罗西', '费拉里', '比安奇', '里奇', '马里诺'] },
  siracusa: { name: '叙拉古', code: 'SR', color: '#4a2f3a',
    races: { lupo: 5, vulpo: 1, feline: 1 },
    cities: ['卡塔尼亚', '巴勒莫', '墨西拿'],
    first: ['萨尔瓦', '罗莎', '文森佐', '卡梅拉', '朱塞佩', '安东尼'], last: ['贝内代托', '隆巴尔多', '加里波第', '费拉罗'] },
  leithanien: { name: '莱塔尼亚', code: 'LE', color: '#3d5a52',
    races: { liberi: 2, vulpo: 2, feline: 1, sankta: 1, zalak: 1 },
    cities: ['因斯布鲁克', '维也纳', '萨尔茨'],
    first: ['汉斯', '克拉拉', '弗里茨', '艾尔莎', '马克斯', '洛特'], last: ['施密特', '韦伯', '霍夫曼', '舒尔茨', '沃尔夫'] },
  columbia: { name: '哥伦比亚', code: 'CO', color: '#2f5f7a',
    races: { feline: 2, perro: 2, zalak: 2, vulpo: 1, lupo: 1 },
    cities: ['特里蒙', '大荒城', '莱茵城'],
    first: ['杰克', '艾米', '泰勒', '杰西', '布兰登', '梅根'], last: ['米勒', '戴维斯', '约翰逊', '卡特', '帕克'] },
  kazdel: { name: '卡兹戴尔', code: 'KD', color: '#3b2a33',
    races: { sarkaz: 1 },
    cities: ['卡兹戴尔城', '荒原营地'],
    first: ['卡兰', '伊瑟', '格里姆', '薇拉', '索恩', '莫甘'], last: ['黑石', '荆棘', '灰岩', '瓦尔加', '赫尔曼'] },
  kjerag: { name: '谢拉格', code: 'KJ', color: '#4f6f8a',
    races: { zalak: 2, vulpo: 2, lupo: 1, liberi: 1 },
    cities: ['喀兰', '雪山镇'],
    first: ['埃里克', '英格丽', '奥拉夫', '西格丽', '比约恩', '阿丝特'], last: ['约翰森', '汉森', '拉尔森', '奥尔森'] },
};
const NATION_W = { lungmen: 4, victoria: 2, ursus: 2, kazimierz: 1.5, laterano: 1.2, siracusa: 1.2, leithanien: 1, columbia: 1.5, kazdel: 0.4, kjerag: 0.8 };

const PURPOSES = ['旅游', '工作', '探亲', '经商', '求学', '过境'];
const COMPANIES = ['龙门码头搬运公司', '炎龙物流', '龙门建设集团', '下城区五金行', '鲤鱼大酒楼'];
const CODES = ['灰羽', '晨钟', '青萝', '铁砧', '远帆', '薄荷', '北辰', '松针', '橘灯'];
// 改姓名时的“形近/音近字”
const NAME_SWAP = { '万': '凡', '尔': '儿', '斯': '丝', '特': '德', '克': '可', '林': '琳', '伟': '韦', '明': '铭', '华': '桦', '安': '庵',
  '娜': '纳', '莉': '丽', '罗': '洛', '维': '韦', '亚': '雅', '德': '得', '森': '深', '马': '玛', '里': '利', '卡': '咖', '莎': '沙',
  '琳': '林', '杰': '捷', '彤': '桐', '强': '墙', '欣': '昕', '思': '斯', '文': '雯', '国': '果', '玲': '铃', '丽': '莉', '豪': '浩',
  '艾': '爱', '格': '戈', '朗': '郎', '伦': '仑', '拉': '啦', '索': '锁', '菲': '非', '娅': '亚', '萨': '撒', '尼': '妮', '托': '拓' };

// 规则：从第几天起生效
const RULES = [
  { key: 'rule.race', from: 1, text: '证件种族须与本人特征相符。' },
  // late：第 1 天要等星熊来过之后才生效
  { key: 'rule.photo', from: 1, late: true, text: '证件照片须与本人相符。' },
  { key: 'rule.id', from: 1, late: true, text: '所有证件须在有效期内。' },
  { key: 'rule.permit', from: 1, late: true, text: '非龙门籍须持入境许可。' },
  { key: 'rule.match', from: 1, late: true, text: '各证件姓名、证号、国籍须一致。' },
  { key: 'rule.health', from: 2, text: '非龙门籍须持体检报告。' },
  { key: 'rule.infected', from: 2, text: '感染者禁止入境。融合率>0%即为感染者。', text4: '感染者禁止入境（持罗德岛干员证者除外）。融合率>0%即为感染者。' },
  { key: 'rule.sarkaz', from: 3, text: '萨卡兹须持龙门企业担保函。' },
  { key: 'rule.smuggle', from: 3, text: '携带源石者：拘留。' },
  { key: 'rule.reunion', from: 4, text: '整合运动成员：拘留。' },
  { key: 'rule.rhodes', from: 4, text: '干员证姓名须与身份证件一致。' },
  { key: 'rule.ursus', from: 5, text: '乌萨斯籍一律禁止入境。' },
];

const NEWS = {
  1: { h1: '边境检查站今日重开', sub: '近卫局：午后起，非龙门籍旅客须持入境许可', h2: '新人审查员上岗：“我只看证件。”' },
  2: { h1: '切尔诺伯格传出感染者暴动', sub: '龙门即日起：感染者一律不得入境', h2: '边境医疗站开始签发体检报告' },
  3: { h1: '卡兹戴尔战火再起', sub: '萨卡兹旅客须持担保函；检查站启用源石探测仪', h2: '近卫局破获下城区源石走私案' },
  4: { h1: '切尔诺伯格沦陷！', sub: '整合运动逼近龙门；罗德岛与近卫局达成合作', h2: '持罗德岛干员证的感染者可以入境' },
  5: { h1: '乌萨斯军队陈兵边境', sub: '即日起，乌萨斯籍旅客一律禁止入境', h2: '市民提问：下一个被拦下的会是谁？' },
};

const TIPS = {
  1: '今天上午只查一样：证件上的种族，和旅客本人对不对得上。\n点左下【叫号】，请第一位上前。',
  2: '新规：非龙门籍旅客须出示体检报告；感染者禁止入境。\n留意体检报告上的“融合率”和“结论”是否矛盾。',
  3: '新工具：【源石探测】能看到旅客身上的源石。\n携带源石者，用【拘留】。萨卡兹旅客须持担保函。',
  4: '新规：整合运动成员予以拘留（探测仪下能看到面具）。\n持有效罗德岛干员证的感染者可以入境。',
  5: '新规：乌萨斯籍旅客一律禁止入境。\n这是最后一天。',
};

// 第 1 天星熊来过之后弹出的通知
const TIP_STAGE = '从现在起多查几样：\n· 证件照片要和本人是同一个人。\n· 证件要在有效期内：对比“期限”和左上角的日期。\n· 外地旅客要有入境许可，上面的姓名、证号、国籍要和证件一致。\n先用【检查】查出矛盾再拒绝，每位多拿 2 龙门币。';

const KLABEL = { name: '姓名', idno: '证件号', nation: '国籍' };
const DOCNAME = { id: '身份证件', permit: '入境许可', health: '体检报告', guar: '担保函', rhodes: '罗德岛干员证' };

const REASON = {
  id_expired: '身份证件已过期', race: '证件种族与本人不符', photo: '证件照片与本人不符',
  permit_missing: '缺少入境许可', permit_expired: '入境许可已过期', permit_name: '入境许可姓名不符', permit_idno: '入境许可证件号不符',
  permit_nation: '入境许可国籍不符', health_missing: '缺少体检报告', infected: '旅客是感染者', health_incons: '体检报告结论与融合率矛盾',
  health_name: '体检报告姓名不符', health_lie: '旅客隐瞒感染', sarkaz_noguar: '萨卡兹旅客缺少担保函', guar_expired: '担保函已过期',
  guar_name: '担保函姓名不符', smuggle: '旅客携带源石', reunion: '旅客是整合运动成员', rhodes_name: '罗德岛干员证姓名不符',
  rhodes_expired: '罗德岛干员证已过期', ursus: '乌萨斯籍旅客禁止入境',
};

// 质询时旅客的辩解
const ANSWERS = {
  expired: ['啊？过期了？我都没注意……', '就过期几天，通融一下吧。', '我正打算去换新的。'],
  race: ['我……我就是这个种族啊。', '这耳朵是天生的，你别乱看。', '登记的人写错了吧。'],
  photo: ['照片是好几年前拍的。', '我换了发型而已。', '……那是我哥。我是说，那就是我。'],
  name: ['印错了吧。', '那是我的曾用名。', '翻译的问题，翻译的问题。'],
  idno: ['号码？我背不下来。', '应该是办证的人抄错了。'],
  nation: ['我两边都住过。', '这个……说来话长。'],
  permit_missing: ['还要入境许可？没人告诉我啊。', '我、我放在行李里了。'],
  health_missing: ['体检？我身体好得很。', '医疗站排队太长了……'],
  infected: ['求求你……我没有别的地方可去了。', '我不会传染给任何人的！', '我只是想活下去。'],
  health_incons: ['医生说那点融合率不算什么。', '可能是仪器坏了。'],
  health_lie: ['那、那是装饰品！', '……你怎么看到的？'],
  sarkaz_noguar: ['担保函？谁会给萨卡兹做担保？', '我只是想找份工作。'],
  smuggle: ['这是我的护身符。', '一点小石头而已，留个纪念。'],
  reunion: ['……', '你会后悔的。', '感染者的怒火，你挡不住。'],
  ursus: ['我早就不是乌萨斯人了！', '我是逃出来的！'],
};

const HELLO = ['你好。', '早上好。', '请快一点，我赶时间。', '龙门真热闹啊。', '这是我的证件。', '排了好久的队。', '辛苦了。'];
const THANKS = ['谢谢。', '太好了！', '辛苦你了。', '龙门，我来了！', '祝你今天顺利。'];
const DENIED = ['……好吧。', '什么？！', '我还会回来的。', '你们龙门人就是这样。', '可恶。'];
const DETAINED = ['放开我！', '你们不能这样！', '……我认栽。'];
