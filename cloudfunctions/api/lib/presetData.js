/**
 * lib/presetData.js —— 预置数据的写入逻辑（initData 和 addMissingPresets 共用）
 *
 * 为什么抽出来：灌数据这件事有两个入口 ——
 *   1. 设置页的「灌入预置菜品」
 *   2. 云开发控制台直接调 initData
 *   两边逻辑必须一致，否则会出现"用哪个入口结果不一样"的坑。
 *
 * 三种模式：
 *   'missing' 只补菜单里没有的（**默认，安全** —— 不会碰你已有的菜）
 *   'replace' 先删掉全部菜品再灌（危险，会连你的修改一起删掉）
 *   'onlyIfEmpty' 只有菜单为空才灌（旧行为，留给控制台用）
 */

const { collections } = require('./db');
const { buildRecipe } = require('./dishUtil');
const presets = require('../actions/presets');

/**
 * 把预置菜品写进数据库
 * @param {object} db        云数据库实例
 * @param {string} mode      'missing' | 'replace' | 'onlyIfEmpty'
 * @returns {object} 统计结果
 */
async function seedPresets(db, mode) {
  const coll = db.collection(collections.dishes);
  const now = db.serverDate();

  // ---------- 现有数据 ----------
  const existingRes = await coll.limit(500).get();
  const existing = existingRes.data || [];
  const existingNames = {};
  existing.forEach((d) => {
    existingNames[String(d.name || '').trim()] = true;
  });

  // ---------- 旧行为：菜单非空就整体跳过 ----------
  if (mode === 'onlyIfEmpty' && existing.length > 0) {
    return {
      mode,
      inserted: 0,
      skipped: existing.length,
      reason: `菜单里已经有 ${existing.length} 道菜，跳过（这就是为什么你"没看到新菜"）`
    };
  }

  // ---------- 危险模式：先清空 ----------
  let removed = 0;
  if (mode === 'replace') {
    for (const d of existing) {
      try {
        await coll.doc(d._id).remove();
        removed++;
      } catch (e) {
        console.warn(`[presetData] 删除 ${d.name} 失败：`, e && e.message);
      }
    }
    // 清空"已存在"的名字表（replace 模式下所有旧菜都没了）
    Object.keys(existingNames).forEach((k) => {
      delete existingNames[k];
    });
  }

  // ---------- 逐个写入 ----------
  const insertedNames = [];
  const skippedNames = [];
  const errors = [];

  for (const p of presets) {
    const name = String(p.name || '').trim();

    // 'missing' 模式下同名菜已存在 → 跳过（不覆盖你的版本）
    if (mode === 'missing' && existingNames[name]) {
      skippedNames.push(name);
      continue;
    }

    try {
      await coll.add({
        data: {
          name,
          category: p.category,
          subCategory: p.subCategory || '',
          intro: p.intro || '',
          coverImage: '',
          tags: p.tags || [],
          herFavorite: !!p.herFavorite,
          avoid: p.avoid || [],
          spicy: Number(p.spicy) || 0,
          enabled: true,
          cookCount: 0,
          sortOrder: 100,
          recipe: buildRecipe(p.recipe || {}),
          createdAt: now,
          updatedAt: now
        }
      });
      insertedNames.push(name);
      existingNames[name] = true; // 防止同一批里重名
    } catch (e) {
      errors.push(`${name}: ${(e && e.message) || e}`);
    }
  }

  // 打个标记
  try {
    await db
      .collection(collections.config)
      .doc('app')
      .update({ data: { seeded: true, seededAt: now, updatedAt: now } });
  } catch (e) {
    console.warn('[presetData] 回写 seeded 标记失败（不影响菜品）：', e && e.message);
  }

  console.log(`[presetData] 模式=${mode} 新增 ${insertedNames.length} 道，跳过 ${skippedNames.length} 道`);

  return {
    mode,
    inserted: insertedNames.length,
    insertedNames,
    skipped: skippedNames.length,
    skippedNames,
    removed,
    totalPresets: presets.length,
    errors: errors.length ? errors : undefined,
    hint: '打开小程序点菜页下拉刷新就能看到。想改内容：连点「我的」标题 5 次进管理页。'
  };
}

module.exports = { seedPresets };
