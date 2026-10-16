/**
 * actions/migrate.js —— 旧数据迁移（只有你能调）
 *
 * 为什么需要它：
 *   项目第一版的分类是「家里做 / 汤 / 主食 / 甜点」，后来改成了
 *   「主菜 / 素菜 / 汤 / 主食 / 甜品」，并给主菜加了二级筛选（猪肉/牛肉/…）。
 *   你数据库里已经有按旧分类存好的菜，不迁移的话它们会掉进"其他"分组。
 *
 * 它做两件事：
 *   1. 把 config 里的 categories / subCategories 换成新的
 *   2. 按下面的规则把每道菜的 category 改过来；主菜会顺便猜一个二级分类
 *
 * ⚠️ 猜二级分类是根据菜名里的关键词猜的，**不保证全对**。
 *    跑完之后去「菜品管理」看一眼，不对的在编辑页改一下就行。
 *
 * 入参：{ dryRun?: true }  只报告要改什么，不真的写
 * 出参：{ categoriesUpdated, dishesScanned, dishesUpdated, changes: [...] }
 */

const { collections } = require('../lib/db');
const { defaultConfig } = require('../lib/defaultConfig');

/** 旧分类 → 新分类（主菜那一项要再看菜名决定是主菜还是素菜） */
const CATEGORY_MAP = {
  home: 'main', // 会按下面的关键词进一步判成 main / veg
  soup: 'soup',
  staple: 'staple',
  dessert: 'dessert',
  main: 'main', // 已经是新分类的，原样保留
  veg: 'veg'
};

/** 判定"这道菜其实是素菜"的关键词（先判素，再猜肉） */
const VEG_WORDS = ['西兰花', '包菜', '黄瓜', '白菜', '菠菜', '茄子', '豆腐', '土豆丝', '豆角', '藕', '番茄炒蛋', '西红柿炒蛋', '生菜', '青菜', '蘑菇', '金针菇', '凉拌'];

/** 猜主菜二级分类的关键词（顺序即优先级） */
const SUB_RULES = [
  { key: 'lamb', words: ['羊'] },
  { key: 'pork', words: ['排骨', '里脊', '五花', '猪', '肉丝', '肉末', '肘', '蹄', '回锅', '丸子'] },
  { key: 'beef', words: ['牛'] },
  { key: 'chicken', words: ['鸡', '翅', '鸭', '鹌鹑'] },
  { key: 'fish', words: ['鱼', '虾', '蟹', '鱿', '贝', '蛤', '蛏'] },
  // 蛋类放在最后：像"蛋炒饭"这种虽然带"蛋"，但它是主食不是主菜，
  // 所以先让前面的规则和其它判断过一遍，剩下的才落到蛋类。
  { key: 'egg', words: ['蛋', '蒸水蛋', '煎蛋', '蛋羹'] }
];

/** 判断某道菜应该归到哪个主菜细分（导出的原因：以后要在别处复用同一套规则） */
function guessSubCategory(name) {
  const hit = SUB_RULES.find((r) => r.words.some((w) => name.indexOf(w) > -1));
  return hit ? hit.key : 'other';
}

module.exports = async function migrate(ctx) {
  const { db, payload, config } = ctx;
  const dryRun = !!(payload && payload.dryRun);
  const now = db.serverDate();

  // ---------- 1. 修正 config 里的分类定义 ----------
  const fresh = defaultConfig();
  const currentCats = (config.categories || []).map((c) => c.key);
  const currentSubs = (config.subCategories || []).map((s) => s.key);
  const freshSubs = fresh.subCategories.map((s) => s.key);

  // 判断是不是"旧结构"：旧的有 home，或者有 takeout/outing，或者缺 main
  const catsNeedFix =
    currentCats.indexOf('home') > -1 ||
    currentCats.indexOf('takeout') > -1 ||
    currentCats.indexOf('outing') > -1 ||
    currentCats.indexOf('main') === -1;

  // 二级细分缺项（典型情况：新加了「羊肉」，你数据库里还没有这一项）
  const missingSubs = freshSubs.filter((k) => currentSubs.indexOf(k) === -1);
  const subsNeedFix = currentSubs.length > 0 && missingSubs.length > 0;

  const categoriesUpdated = catsNeedFix || subsNeedFix;

  if (categoriesUpdated && !dryRun) {
    // 保留你自己改过的名字/图标：key 还在的就沿用你的，缺的用默认补上
    const mergedCats = fresh.categories.map((freshCat) => {
      const mine = (config.categories || []).find((c) => c.key === freshCat.key);
      return mine
        ? {
            key: freshCat.key,
            name: mine.name || freshCat.name,
            icon: mine.icon || freshCat.icon,
            enabled: mine.enabled !== false
          }
        : freshCat;
    });

    // 二级细分：以"你现有的"为主体，按默认顺序排，缺的按默认顺序插进去
    const mySubs = config.subCategories || [];
    const mergedSubs = fresh.subCategories
      .map((def) => {
        const mine = mySubs.find((s) => s.key === def.key);
        return mine ? { key: def.key, name: mine.name || def.name, icon: mine.icon || def.icon } : def;
      })
      .concat(
        // 你自己加的、默认里没有的，追加在后面（不丢）
        mySubs
          .filter((s) => freshSubs.indexOf(s.key) === -1)
          .map((s) => ({ key: s.key, name: s.name, icon: s.icon || '🍽' }))
      );

    await db.collection(collections.config).doc('app').update({
      data: { categories: mergedCats, subCategories: mergedSubs, updatedAt: now }
    });
  }

  // ---------- 2. 迁移菜品分类 ----------
  const res = await db.collection(collections.dishes).limit(500).get();
  const dishes = res.data || [];

  const changes = [];
  const updates = [];

  for (const d of dishes) {
    const oldCat = String(d.category || '');
    let newCat = CATEGORY_MAP[oldCat] || '';
    const name = String(d.name || '');

    // 旧的 home 要拆成 主菜 / 素菜
    if (oldCat === 'home' || !newCat) {
      const isVeg = VEG_WORDS.some((w) => name.indexOf(w) > -1);
      newCat = isVeg ? 'veg' : 'main';
    }

    // 猜二级分类（只对主菜）。
    // 判据是"当前 subCategory 不在合法列表里"，而不是"是否为空"——
    // 因为可能出现"有值但那个细分已经被删掉了"的情况。
    let newSub = String(d.subCategory || '');
    if (newCat === 'main' && freshSubs.indexOf(newSub) === -1) {
      newSub = guessSubCategory(name);
    }
    if (newCat !== 'main') newSub = '';

    if (newCat !== oldCat || newSub !== String(d.subCategory || '')) {
      changes.push({ name, from: oldCat, to: newCat, sub: newSub });
      updates.push({ id: d._id, category: newCat, subCategory: newSub });
    }
  }

  if (!dryRun) {
    await Promise.all(
      updates.map((u) =>
        db
          .collection(collections.dishes)
          .doc(u.id)
          .update({ data: { category: u.category, subCategory: u.subCategory, updatedAt: now } })
          .catch((e) => console.warn(`[migrate] 更新 ${u.id} 失败：`, e && e.message))
      )
    );
  }

  console.log(`[migrate] 扫描 ${dishes.length} 道菜，需要改 ${changes.length} 道（dryRun=${dryRun}）`);

  return {
    dryRun,
    categoriesUpdated,
    dishesScanned: dishes.length,
    dishesUpdated: dryRun ? 0 : updates.length,
    changes,
    hint: dryRun
      ? '这是预览。确认没问题后重新调用并传 { "dryRun": false } 就会真的改。'
      : '改完了。去「菜品管理」看一眼主菜的二级分类猜得对不对，不对的在编辑页改。'
  };
};
