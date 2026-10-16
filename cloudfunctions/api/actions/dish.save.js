/**
 * actions/dish.save.js —— 新增 / 编辑一道菜（含菜谱，只有你能调）
 *
 * 入参：
 *   {
 *     dishId?: '已有的菜品 id（不传 = 新增）',
 *     name: '可乐鸡翅',
 *     category: 'home',
 *     intro: '甜口的，比红烧省事',
 *     coverImage: 'cloud://...',          // 可空
 *     tags: ['甜口', '30分钟'],
 *     herFavorite: true,
 *     avoid: ['花生'],
 *     spicy: 0,
 *     enabled: true,
 *     sortOrder: 100,
 *     recipe: { ingredients:[{name,amount}], steps:[{text,image}], tips:[], sourceUrl, sourceTitle, note }
 *   }
 *
 * 出参：{ dishId, created: true|false }
 *
 * 关于并发：两人同时编辑同一道菜的可能性很低（菜谱是你维护的），
 * 所以不做版本号冲突检测 —— 后保存的覆盖先保存的，符合直觉。
 */

const { collections } = require('../lib/db');
const { buildRecipe } = require('../lib/dishUtil');
const { badRequest } = require('../lib/res');

const NAME_MAX = 20;
const INTRO_MAX = 60;

module.exports = async function dishSave(ctx) {
  const { db, payload } = ctx;

  const name = String((payload && payload.name) || '').trim().slice(0, NAME_MAX);
  if (!name) throw badRequest('菜名不能为空', 'NO_NAME');

  const data = {
    name,
    category: String((payload && payload.category) || 'main'),
    // 二级分类只对主菜有意义，其他分类强制清空（避免以后筛选时出现幽灵分组）
    subCategory:
      String((payload && payload.category) || 'main') === 'main' ? String((payload && payload.subCategory) || '') : '',
    intro: String((payload && payload.intro) || '').trim().slice(0, INTRO_MAX),
    coverImage: String((payload && payload.coverImage) || ''),
    tags: (Array.isArray(payload && payload.tags) ? payload.tags : []).map((t) => String(t).trim()).filter(Boolean),
    herFavorite: !!(payload && payload.herFavorite),
    avoid: (Array.isArray(payload && payload.avoid) ? payload.avoid : []).map((t) => String(t).trim()).filter(Boolean),
    spicy: Math.max(0, Math.min(3, Number(payload && payload.spicy) || 0)),
    enabled: !(payload && payload.enabled === false),
    sortOrder: Number(payload && payload.sortOrder) || 100,
    updatedAt: db.serverDate()
  };

  // 只有传了 recipe 才动菜谱，避免"只改菜名"时把菜谱清空
  if (payload && payload.recipe !== undefined) {
    data.recipe = buildRecipe(payload.recipe);
  }

  const dishId = payload && payload.dishId;

  if (dishId) {
    // ---- 编辑 ----
    try {
      await db.collection(collections.dishes).doc(dishId).update({ data });
    } catch (e) {
      throw badRequest('这道菜可能已经被删掉了，刷新一下再试', 'DISH_NOT_FOUND');
    }
    return { dishId, created: false };
  }

  // ---- 新增 ----
  const addRes = await db.collection(collections.dishes).add({
    data: Object.assign({}, data, {
      recipe: data.recipe || buildRecipe({}),
      cookCount: 0,
      createdAt: db.serverDate()
    })
  });

  return { dishId: addRes._id, created: true };
};
