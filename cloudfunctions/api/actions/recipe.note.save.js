/**
 * actions/recipe.note.save.js —— 保存你的复盘笔记（只有你能调）
 *
 * 这是"一边查攻略一边学做菜"真正沉淀下来的东西：
 *   这次火大了 / 盐放少了 / 下次焯水多煮两分钟。
 *
 * 入参：{ dishId, note: '这次糖放多了，下次减半' }
 * 出参：{ dishId, note }
 *
 * 注意：note 字段不会下发给她（见 lib/dishUtil.js 的 stripForRole）——
 * 这是你的私人记录，但她能看到菜谱本体。
 */

const { collections } = require('../lib/db');
const { badRequest } = require('../lib/res');

const NOTE_MAX = 500;

module.exports = async function recipeNoteSave(ctx) {
  const { db, payload } = ctx;
  const dishId = payload && payload.dishId;

  if (!dishId) throw badRequest('没有指定是哪道菜');

  const note = String((payload && payload.note) || '').slice(0, NOTE_MAX).trim();

  await db
    .collection(collections.dishes)
    .doc(dishId)
    .update({ data: { 'recipe.note': note, 'recipe.updatedAt': new Date(), updatedAt: db.serverDate() } });

  return { dishId, note };
};
