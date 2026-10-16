/**
 * actions/dish.detail.js —— 单道菜详情（含菜谱）
 *
 * 入参：{ dishId }
 * 出参：完整的菜品对象；菜谱是否含复盘笔记取决于身份：
 *        你（me）   → 含 note（你自己的复盘笔记）
 *        她（her）  → note 被清空
 *        访客       → note 被清空
 */

const { collections } = require('../lib/db');
const { normalizeDish, stripForRole } = require('../lib/dishUtil');
const { badRequest, bizError } = require('../lib/res');

module.exports = async function dishDetail(ctx) {
  const { db, payload, role } = ctx;
  const dishId = payload && payload.dishId;

  if (!dishId) throw badRequest('没有指定要看哪道菜');

  let doc = null;
  try {
    const res = await db.collection(collections.dishes).doc(dishId).get();
    doc = res.data;
  } catch (e) {
    throw bizError('这道菜找不到了，可能已经被删掉', 'DISH_NOT_FOUND');
  }

  const dish = normalizeDish(doc);

  // 下架的菜只有你能看到（她要是在旧购物车里留着它，也需要能打开看）
  if (!dish.enabled && role !== 'me') {
    throw bizError('这道菜暂时下架了', 'DISH_OFFLINE');
  }

  return stripForRole(dish, role);
};
