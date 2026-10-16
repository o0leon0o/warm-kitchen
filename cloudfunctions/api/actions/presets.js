/**
 * presets.js —— 预置菜品数据（initData 用）
 *
 * 这里的数据是**通用家常菜**的骨架，目的是让你第一次打开小程序就看到一个
 * 填满的界面，而不是空白页。菜谱步骤写的是通用做法，跟你的版本肯定有出入。
 *
 * 分类规则（跟 config.categories / config.subCategories 对应）：
 *   category:    main 主菜 | veg 素菜 | soup 汤 | staple 主食 | dessert 甜品
 *   subCategory: 只有 main 需要填 ——
 *                pork 猪肉 | beef 牛肉 | lamb 羊肉 | chicken 鸡肉
 *                fish 鱼虾 | egg 蛋类 | other 其他
 *
 * 每个细分都配了 2 道，主菜刚好 14 道。
 * 想改内容：直接在小程序里改（连点「我的」标题 5 次 → 菜品管理 / 加一道新菜），
 * 比改这个文件快得多。
 *
 * ⚠️ initData 只在 dishes 集合为空时才灌数据（重复跑不会灌重），
 *    所以改了这份数据不会影响你已有的菜——那是"迁移"该干的事。
 */

const presets = [

  // ==================== 主菜 · 猪肉 🐷 ====================
  {
    name: '红烧排骨',
    category: 'main',
    subCategory: 'pork',
    intro: '想吃肉的时候就做这个',
    tags: ['硬菜', '1小时'],
    herFavorite: true,
    spicy: 0,
    recipe: {
      ingredients: [
        { name: '肋排', amount: '500g' },
        { name: '冰糖', amount: '8 颗' },
        { name: '生抽 / 老抽', amount: '2 勺 / 半勺' },
        { name: '姜、八角、桂皮', amount: '适量' }
      ],
      steps: [
        { text: '排骨冷水下锅焯水，撇去浮沫后捞出' },
        { text: '锅中放油和冰糖，小火熬到枣红色冒小泡' },
        { text: '下排骨快速翻炒上色' },
        { text: '加姜片、八角、桂皮，倒生抽老抽' },
        { text: '加开水没过排骨，大火烧开转小火炖 40 分钟' },
        { text: '大火收汁，出锅撒葱花' }
      ],
      tips: ['炒糖色是难点：颜色变枣红就要立刻下排骨，再晚就苦了', '一定要加开水，冷水会让肉变柴'],
      sourceUrl: '',
      sourceTitle: '',
      note: ''
    }
  },
  {
    name: '糖醋里脊',
    category: 'main',
    subCategory: 'pork',
    intro: '酸甜口，炸得脆脆的',
    tags: ['酸甜', '40分钟'],
    herFavorite: true,
    spicy: 0,
    recipe: {
      ingredients: [
        { name: '猪里脊', amount: '300g' },
        { name: '鸡蛋', amount: '1 个' },
        { name: '淀粉 / 面粉', amount: '各 3 勺' },
        { name: '番茄酱、糖、白醋', amount: '1 : 1 : 1' }
      ],
      steps: [
        { text: '里脊切条，加盐、料酒腌 15 分钟' },
        { text: '加鸡蛋、淀粉、面粉抓成糊，每条都裹上' },
        { text: '油温六成热下锅炸到微黄，捞出' },
        { text: '油温升高复炸 30 秒，捞出沥油' },
        { text: '另起锅放番茄酱、糖、白醋，小火熬到冒泡' },
        { text: '倒入炸好的里脊快速翻匀，让每条都挂上汁' }
      ],
      tips: ['复炸那一步别省，脆不脆就看它', '汁要收到能挂住，太稀就变成泡着的了'],
      sourceUrl: '',
      sourceTitle: '',
      note: ''
    }
  },

  // ==================== 主菜 · 牛肉 🐮 ====================
  {
    name: '黑椒牛柳',
    category: 'main',
    subCategory: 'beef',
    intro: '黑胡椒够重的下饭菜',
    tags: ['快手', '20分钟'],
    herFavorite: true,
    spicy: 1,
    recipe: {
      ingredients: [
        { name: '牛里脊', amount: '300g' },
        { name: '洋葱', amount: '半个' },
        { name: '黑胡椒碎', amount: '1 勺' },
        { name: '蚝油 / 生抽 / 淀粉', amount: '各 1 勺' }
      ],
      steps: [
        { text: '牛柳逆着纹路切条，加生抽、淀粉、油抓匀腌 15 分钟' },
        { text: '洋葱切条' },
        { text: '大火热锅，牛柳下锅快速炒到变色就盛出' },
        { text: '下洋葱炒香，加黑胡椒碎' },
        { text: '倒回牛柳，加蚝油炒匀，关火' }
      ],
      tips: ['牛肉一定要逆纹切，否则嚼不动', '全程大火快炒，超过 2 分钟就老了'],
      sourceUrl: '',
      sourceTitle: '',
      note: ''
    }
  },
  {
    name: '土豆炖牛肉',
    category: 'main',
    subCategory: 'beef',
    intro: '炖一大锅，第二天泡饭也香',
    tags: ['炖菜', '1.5小时'],
    herFavorite: false,
    spicy: 0,
    recipe: {
      ingredients: [
        { name: '牛腩', amount: '500g' },
        { name: '土豆', amount: '2 个' },
        { name: '胡萝卜', amount: '1 根' },
        { name: '姜、八角、生抽', amount: '适量' }
      ],
      steps: [
        { text: '牛腩切块，冷水下锅加姜片焯水，洗净' },
        { text: '锅中少油，下牛腩块煸炒到表面微焦' },
        { text: '加生抽、八角、姜片，倒开水没过' },
        { text: '小火炖 1 小时' },
        { text: '加土豆和胡萝卜块，再炖 20 分钟' },
        { text: '最后加盐，大火略收汁' }
      ],
      tips: ['土豆晚点放，不然会炖成泥'],
      sourceUrl: '',
      sourceTitle: '',
      note: ''
    }
  },

  // ==================== 主菜 · 羊肉 🐑 ====================
  {
    name: '萝卜炖羊肉',
    category: 'main',
    subCategory: 'lamb',
    intro: '萝卜吸了羊汤，比肉还好吃',
    tags: ['炖菜', '1.5小时'],
    herFavorite: false,
    spicy: 0,
    recipe: {
      ingredients: [
        { name: '羊腿肉', amount: '500g' },
        { name: '白萝卜', amount: '1 根' },
        { name: '姜、葱段', amount: '适量' },
        { name: '白胡椒', amount: '一小勺' }
      ],
      steps: [
        { text: '羊肉切块，冷水下锅加姜片焯水，撇净浮沫后捞出' },
        { text: '锅中放油，下姜片和葱段炒香' },
        { text: '下羊肉块翻炒到表面微黄' },
        { text: '加开水没过羊肉，大火烧开转小火炖 50 分钟' },
        { text: '加白萝卜块再炖 20 分钟' },
        { text: '加盐和白胡椒调味，撒葱花出锅' }
      ],
      tips: ['白胡椒是去膻的关键，别省', '萝卜一定后放，早放会炖化', '想更香可以加一小块陈皮'],
      sourceUrl: '',
      sourceTitle: '',
      note: ''
    }
  },
  {
    name: '孜然羊肉',
    category: 'main',
    subCategory: 'lamb',
    intro: '像烧烤的味道，配米饭绝了',
    tags: ['重口', '20分钟'],
    herFavorite: true,
    spicy: 2,
    recipe: {
      ingredients: [
        { name: '羊腿肉', amount: '300g' },
        { name: '洋葱', amount: '半个' },
        { name: '孜然粒 / 孜然粉', amount: '各 1 勺' },
        { name: '干辣椒', amount: '3 个' }
      ],
      steps: [
        { text: '羊肉逆纹切薄片，加料酒、生抽、淀粉腌 15 分钟' },
        { text: '洋葱切条，干辣椒切段' },
        { text: '大火热锅多油，羊肉下锅快速滑炒到变色盛出' },
        { text: '下洋葱、干辣椒炒香' },
        { text: '倒回羊肉，撒孜然粒和孜然粉，大火炒匀' },
        { text: '出锅前加盐和一点香菜' }
      ],
      tips: ['孜然要最后放，早放香味就跑光了', '怕膻可以先焯水再炒'],
      sourceUrl: '',
      sourceTitle: '',
      note: ''
    }
  },

  // ==================== 主菜 · 鸡肉 🐔 ====================
  {
    name: '可乐鸡翅',
    category: 'main',
    subCategory: 'chicken',
    intro: '甜口的，比红烧省事',
    tags: ['甜口', '30分钟'],
    herFavorite: true,
    spicy: 0,
    recipe: {
      ingredients: [
        { name: '鸡中翅', amount: '8 只' },
        { name: '可乐', amount: '1 罐' },
        { name: '姜片', amount: '3 片' },
        { name: '生抽', amount: '2 勺' },
        { name: '老抽', amount: '半勺' }
      ],
      steps: [
        { text: '鸡翅两面各划两刀，方便入味' },
        { text: '冷水下锅，加姜片焯 2 分钟，捞出冲净沥干' },
        { text: '锅里少油，鸡翅煎到两面微黄' },
        { text: '倒入可乐没过鸡翅，加生抽、老抽、姜片' },
        { text: '大火烧开转中小火焖 15 分钟' },
        { text: '大火收汁，汤汁挂在鸡翅上就关火' }
      ],
      tips: ['一定要收汁到浓稠，不然味道会淡', '用无糖可乐会不甜，建议普通可乐'],
      sourceUrl: '',
      sourceTitle: '',
      note: ''
    }
  },
  {
    name: '宫保鸡丁',
    category: 'main',
    subCategory: 'chicken',
    intro: '花生要最后放才脆',
    tags: ['微辣', '25分钟'],
    herFavorite: false,
    spicy: 2,
    recipe: {
      ingredients: [
        { name: '鸡腿肉', amount: '300g' },
        { name: '熟花生米', amount: '一小把' },
        { name: '干辣椒 / 花椒', amount: '适量' },
        { name: '生抽、醋、糖、淀粉', amount: '各 1 勺' }
      ],
      steps: [
        { text: '鸡腿肉切丁，加生抽、淀粉腌 15 分钟' },
        { text: '调碗汁：生抽、醋、糖、淀粉、水各一勺搅匀' },
        { text: '热锅下油，鸡丁炒到变白盛出' },
        { text: '下干辣椒和花椒小火焙香' },
        { text: '倒回鸡丁，淋入碗汁快速翻炒到浓稠' },
        { text: '关火后倒入花生米拌匀' }
      ],
      tips: ['花生米一定关火后放，否则会软'],
      sourceUrl: '',
      sourceTitle: '',
      note: ''
    }
  },

  // ==================== 主菜 · 鱼虾 🦐 ====================
  {
    name: '蒜蓉粉丝蒸虾',
    category: 'main',
    subCategory: 'fish',
    intro: '看着很厉害，其实很好做',
    tags: ['蒸菜', '25分钟'],
    herFavorite: true,
    spicy: 0,
    recipe: {
      ingredients: [
        { name: '基围虾', amount: '10 只' },
        { name: '龙口粉丝', amount: '1 把' },
        { name: '蒜', amount: '1 整头' },
        { name: '蒸鱼豉油', amount: '2 勺' }
      ],
      steps: [
        { text: '粉丝温水泡软，铺在盘底' },
        { text: '虾开背去虾线，摆在粉丝上' },
        { text: '蒜切末，一半用油炒香，和另一半生蒜末混在一起' },
        { text: '蒜蓉铺在虾背上' },
        { text: '水开后上锅大火蒸 6 分钟' },
        { text: '出锅淋蒸鱼豉油，浇一勺热油' }
      ],
      tips: ['蒸过头虾就柴了，6 分钟是上限', '蒜蓉一半生一半熟，香味才有层次'],
      sourceUrl: '',
      sourceTitle: '',
      note: ''
    }
  },
  {
    name: '清蒸鲈鱼',
    category: 'main',
    subCategory: 'fish',
    intro: '清淡，适合不想吃油的时候',
    tags: ['清淡', '20分钟'],
    herFavorite: false,
    spicy: 0,
    recipe: {
      ingredients: [
        { name: '鲈鱼', amount: '1 条' },
        { name: '姜、葱', amount: '适量' },
        { name: '蒸鱼豉油', amount: '3 勺' }
      ],
      steps: [
        { text: '鱼洗净，两面各划三刀，塞姜片' },
        { text: '水开后上锅蒸 8 分钟' },
        { text: '倒掉盘里的腥水（这一步很关键）' },
        { text: '铺上葱丝姜丝，淋蒸鱼豉油' },
        { text: '浇一勺烧到冒烟的热油' }
      ],
      tips: ['蒸出来的水一定要倒掉，不然整条鱼都是腥的'],
      sourceUrl: '',
      sourceTitle: '',
      note: ''
    }
  },

  // ==================== 主菜 · 蛋类 🥚 ====================
  // 说明：蛋类菜严格说是素的，但它承担"一餐里的蛋白担当"，
  //      跟纯青菜的定位不一样，所以放在主菜下面。
  {
    name: '番茄炒蛋',
    category: 'main',
    subCategory: 'egg',
    intro: '永远不会出错的第一道菜',
    tags: ['酸甜', '10分钟', '新手友好'],
    herFavorite: true,
    spicy: 0,
    recipe: {
      ingredients: [
        { name: '番茄', amount: '2 个' },
        { name: '鸡蛋', amount: '3 个' },
        { name: '糖', amount: '1 小勺' },
        { name: '盐', amount: '适量' }
      ],
      steps: [
        { text: '鸡蛋打散，加一小撮盐搅匀' },
        { text: '番茄顶部划十字，开水烫 30 秒后去皮，切块' },
        { text: '热锅凉油，倒入蛋液，刚凝固就盛出备用' },
        { text: '锅里留底油，下番茄中火炒出汁，加糖和盐' },
        { text: '倒回鸡蛋，翻炒均匀，出锅' }
      ],
      tips: ['蛋要嫩就别炒老，第一次凝固就盛出来', '番茄去皮口感会好很多'],
      sourceUrl: '',
      sourceTitle: '',
      note: ''
    }
  },
  {
    name: '蒸水蛋',
    category: 'main',
    subCategory: 'egg',
    intro: '嫩得像布丁，浇点生抽就能吃',
    tags: ['清淡', '15分钟', '新手友好'],
    herFavorite: false,
    spicy: 0,
    recipe: {
      ingredients: [
        { name: '鸡蛋', amount: '2 个' },
        { name: '温水', amount: '蛋液的 1.5 倍' },
        { name: '生抽 / 香油', amount: '各几滴' }
      ],
      steps: [
        { text: '鸡蛋打散，尽量打匀不要留蛋筋' },
        { text: '加 1.5 倍的温水（不烫手为准），搅匀' },
        { text: '过一遍筛，滤掉泡沫（这步决定嫩不嫩）' },
        { text: '盖上盘子或保鲜膜，防止水汽滴进去' },
        { text: '水开后中小火蒸 10 分钟' },
        { text: '出锅淋几滴生抽和香油' }
      ],
      tips: ['水温不烫手就行，太热会变成蛋花汤', '一定要过筛 + 盖盖子，表面才平整', '火别太大，大火蒸出来会有蜂窝'],
      sourceUrl: '',
      sourceTitle: '',
      note: ''
    }
  },

  // ==================== 主菜 · 其他 🍽 ====================
  // 说明：豆腐类菜不属于任何肉类，所以放在「其他」里。
  //      如果没有这几道，「其他」这个细分按钮永远不会出现在界面上。
  {
    name: '麻婆豆腐',
    category: 'main',
    subCategory: 'other',
    intro: '麻辣鲜香，拌饭神器',
    tags: ['下饭', '20分钟'],
    herFavorite: true,
    spicy: 2,
    recipe: {
      ingredients: [
        { name: '嫩豆腐', amount: '1 盒' },
        { name: '肉末', amount: '50g' },
        { name: '豆瓣酱', amount: '1 大勺' },
        { name: '花椒粉 / 蒜末 / 葱花', amount: '适量' },
        { name: '水淀粉', amount: '2 勺' }
      ],
      steps: [
        { text: '豆腐切小方块，放淡盐水里泡 5 分钟（不容易碎）' },
        { text: '锅中放油，下肉末炒散到变色' },
        { text: '加豆瓣酱和蒜末，小火炒出红油' },
        { text: '加一碗水烧开，轻轻推入豆腐块' },
        { text: '中小火煮 3 分钟，全程用铲子背推，别翻' },
        { text: '淋水淀粉勾芡，出锅撒花椒粉和葱花' }
      ],
      tips: ['豆腐别用铲子翻炒，用推的才不会碎', '花椒粉一定最后撒，早放就没麻味了', '豆瓣酱很咸，一般不用再加盐'],
      sourceUrl: '',
      sourceTitle: '',
      note: ''
    }
  },
  {
    name: '家常豆腐',
    category: 'main',
    subCategory: 'other',
    intro: '豆腐煎到两面金黄，比肉还香',
    tags: ['家常', '25分钟'],
    herFavorite: false,
    spicy: 1,
    recipe: {
      ingredients: [
        { name: '老豆腐', amount: '1 块' },
        { name: '青椒 / 胡萝卜', amount: '各半个' },
        { name: '蒜片', amount: '3 瓣' },
        { name: '生抽 / 蚝油', amount: '各 1 勺' }
      ],
      steps: [
        { text: '豆腐切厚片，用厨房纸吸干表面水分' },
        { text: '平底锅少油，豆腐煎到两面金黄盛出' },
        { text: '锅里下蒜片炒香，加青椒胡萝卜片炒断生' },
        { text: '倒回豆腐，加生抽和蚝油，小半碗水' },
        { text: '中火收汁，让豆腐吸满汤汁' }
      ],
      tips: ['豆腐一定要吸干水，不然下锅会溅油', '用老豆腐，嫩豆腐一煎就散'],
      sourceUrl: '',
      sourceTitle: '',
      note: ''
    }
  },

  // ==================== 素菜 🥗 ====================
  {
    name: '蒜蓉西兰花',
    category: 'veg',
    subCategory: '',
    intro: '清爽解腻的绿色',
    tags: ['清淡', '10分钟'],
    herFavorite: false,
    spicy: 0,
    recipe: {
      ingredients: [
        { name: '西兰花', amount: '1 颗' },
        { name: '蒜', amount: '4 瓣' },
        { name: '盐 / 蚝油', amount: '适量' }
      ],
      steps: [
        { text: '西兰花掰小朵，盐水泡 10 分钟后冲净' },
        { text: '水开加一点盐和油，西兰花焯 1 分钟捞出' },
        { text: '蒜切末，热锅下油小火炒香蒜末' },
        { text: '倒入西兰花大火快炒，加盐和一点蚝油' }
      ],
      tips: ['焯水时加油，颜色会更翠绿', '别炒太久，软了就没口感'],
      sourceUrl: '',
      sourceTitle: '',
      note: ''
    }
  },
  {
    name: '手撕包菜',
    category: 'veg',
    subCategory: '',
    intro: '比切的好吃，手撕的断面更入味',
    tags: ['快炒', '10分钟'],
    herFavorite: false,
    spicy: 1,
    recipe: {
      ingredients: [
        { name: '包菜', amount: '半颗' },
        { name: '蒜片 / 干辣椒', amount: '适量' },
        { name: '生抽 / 香醋', amount: '各 1 勺' }
      ],
      steps: [
        { text: '包菜用手撕成小块，洗净沥干（一定要沥干）' },
        { text: '热锅下油，爆香蒜片和干辣椒' },
        { text: '倒入包菜大火爆炒 1 分钟' },
        { text: '沿锅边淋生抽和香醋，加盐炒匀出锅' }
      ],
      tips: ['菜上有水会变成"煮"而不是"炒"，一定沥干', '醋沿锅边淋才香'],
      sourceUrl: '',
      sourceTitle: '',
      note: ''
    }
  },
  {
    name: '凉拌黄瓜',
    category: 'veg',
    subCategory: '',
    intro: '五分钟能上桌的爽口菜',
    tags: ['凉菜', '5分钟'],
    herFavorite: false,
    spicy: 1,
    recipe: {
      ingredients: [
        { name: '黄瓜', amount: '2 根' },
        { name: '蒜末', amount: '3 瓣' },
        { name: '生抽、香醋、香油', amount: '2 : 1 : 1' }
      ],
      steps: [
        { text: '黄瓜拍裂再切段（拍过的更容易入味）' },
        { text: '加盐腌 5 分钟，倒掉渗出的水' },
        { text: '加蒜末、生抽、香醋、香油' },
        { text: '拌匀，撒一点熟芝麻' }
      ],
      tips: ['腌出来的水一定倒掉，不然会寡淡'],
      sourceUrl: '',
      sourceTitle: '',
      note: ''
    }
  },

  // ==================== 汤 🍲 ====================
  {
    name: '紫菜蛋花汤',
    category: 'soup',
    subCategory: '',
    intro: '五分钟能端上桌的汤',
    tags: ['快手', '5分钟'],
    herFavorite: false,
    spicy: 0,
    recipe: {
      ingredients: [
        { name: '紫菜', amount: '一小把' },
        { name: '鸡蛋', amount: '1 个' },
        { name: '虾皮', amount: '一撮' },
        { name: '香油 / 盐', amount: '适量' }
      ],
      steps: [
        { text: '紫菜撕小块放碗里，加虾皮' },
        { text: '锅里水烧开，加盐调味' },
        { text: '蛋液打散，细细淋入锅中，一边淋一边轻轻搅' },
        { text: '把汤冲进紫菜碗里，滴几滴香油' }
      ],
      tips: ['蛋花要嫩就在水微沸时淋，别大滚'],
      sourceUrl: '',
      sourceTitle: '',
      note: ''
    }
  },
  {
    name: '番茄牛腩汤',
    category: 'soup',
    subCategory: '',
    intro: '炖得越久越好喝',
    tags: ['炖汤', '1.5小时'],
    herFavorite: true,
    spicy: 0,
    recipe: {
      ingredients: [
        { name: '牛腩', amount: '500g' },
        { name: '番茄', amount: '3 个' },
        { name: '洋葱', amount: '半个' },
        { name: '姜、料酒', amount: '适量' }
      ],
      steps: [
        { text: '牛腩切块，冷水下锅加姜和料酒焯水，洗净' },
        { text: '番茄去皮切块，洋葱切丝' },
        { text: '锅里少油炒洋葱和番茄，炒到番茄出沙' },
        { text: '下牛腩翻炒，加足量开水' },
        { text: '小火炖 1 小时以上，最后加盐' }
      ],
      tips: ['盐一定要最后放，早放肉不容易烂'],
      sourceUrl: '',
      sourceTitle: '',
      note: ''
    }
  },
  {
    name: '冬瓜排骨汤',
    category: 'soup',
    subCategory: '',
    intro: '夏天喝最舒服',
    tags: ['清汤', '1小时'],
    herFavorite: false,
    spicy: 0,
    recipe: {
      ingredients: [
        { name: '排骨', amount: '400g' },
        { name: '冬瓜', amount: '300g' },
        { name: '姜片', amount: '3 片' }
      ],
      steps: [
        { text: '排骨冷水下锅焯水，洗净浮沫' },
        { text: '排骨加姜片和足量水，大火烧开转小火炖 40 分钟' },
        { text: '冬瓜去皮切块，下锅再炖 15 分钟' },
        { text: '最后加盐调味' }
      ],
      tips: ['冬瓜最后放，久炖会化'],
      sourceUrl: '',
      sourceTitle: '',
      note: ''
    }
  },

  // ==================== 主食 🍜 ====================
  {
    name: '蛋炒饭',
    category: 'staple',
    subCategory: '',
    intro: '剩饭的归宿',
    tags: ['主食', '10分钟'],
    herFavorite: false,
    spicy: 0,
    recipe: {
      ingredients: [
        { name: '隔夜米饭', amount: '2 碗' },
        { name: '鸡蛋', amount: '2 个' },
        { name: '葱', amount: '2 根' },
        { name: '火腿 / 豌豆', amount: '随意' }
      ],
      steps: [
        { text: '米饭提前用手抓散，别结块' },
        { text: '鸡蛋打散，热锅多油炒成蛋块盛出' },
        { text: '下米饭中大火翻炒，把水分炒掉' },
        { text: '倒回鸡蛋，加盐、葱花，炒匀出锅' }
      ],
      tips: ['一定要隔夜饭，新饭太湿会炒成糊'],
      sourceUrl: '',
      sourceTitle: '',
      note: ''
    }
  },
  {
    name: '西红柿打卤面',
    category: 'staple',
    subCategory: '',
    intro: '不想吃米饭的时候就它',
    tags: ['主食', '20分钟'],
    herFavorite: false,
    spicy: 0,
    recipe: {
      ingredients: [
        { name: '面条', amount: '2 人份' },
        { name: '番茄', amount: '2 个' },
        { name: '鸡蛋', amount: '2 个' },
        { name: '蒜末', amount: '适量' }
      ],
      steps: [
        { text: '番茄切块，鸡蛋炒熟盛出' },
        { text: '锅里炒番茄到出汁，加一碗水烧开' },
        { text: '倒回鸡蛋，加盐，略收汁成卤' },
        { text: '另起锅煮面，捞出过一下凉水更筋道' },
        { text: '浇上卤，拌匀' }
      ],
      tips: ['卤要比想象中咸一点，拌面才够味'],
      sourceUrl: '',
      sourceTitle: '',
      note: ''
    }
  },

  // ==================== 甜品 🍰 ====================
  {
    name: '酒酿圆子',
    category: 'dessert',
    subCategory: '',
    intro: '冬天饭后的一碗甜',
    tags: ['甜点', '15分钟'],
    herFavorite: true,
    spicy: 0,
    recipe: {
      ingredients: [
        { name: '小圆子', amount: '1 碗' },
        { name: '酒酿', amount: '3 勺' },
        { name: '枸杞', amount: '一小把' },
        { name: '冰糖', amount: '适量' }
      ],
      steps: [
        { text: '水烧开下小圆子，浮起来就熟了' },
        { text: '加冰糖和枸杞' },
        { text: '关火后再加酒酿，搅匀' }
      ],
      tips: ['酒酿不要煮，煮久了酒味会跑掉'],
      sourceUrl: '',
      sourceTitle: '',
      note: ''
    }
  },
  {
    name: '银耳雪梨羹',
    category: 'dessert',
    subCategory: '',
    intro: '熬一锅慢慢喝',
    tags: ['甜点', '1小时'],
    herFavorite: false,
    spicy: 0,
    recipe: {
      ingredients: [
        { name: '银耳', amount: '半朵' },
        { name: '雪梨', amount: '1 个' },
        { name: '冰糖', amount: '适量' },
        { name: '红枣', amount: '5 颗' }
      ],
      steps: [
        { text: '银耳提前泡 2 小时，撕小朵，去掉根部' },
        { text: '银耳加足量水，大火烧开转小火炖 40 分钟' },
        { text: '加雪梨块和红枣再炖 20 分钟' },
        { text: '最后加冰糖，搅到化开' }
      ],
      tips: ['银耳要炖到出胶，汤才会稠', '冰糖最后放，早放不容易出胶'],
      sourceUrl: '',
      sourceTitle: '',
      note: ''
    }
  }
];

module.exports = presets;
