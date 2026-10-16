/**
 * actions/dish.toggle.js —— 快捷开关（只有你能调）
 *
 * 管理页列表上那几个滑动开关都走这里，不用为了改一个布尔值去调 dish.save
 * （那样会把整个菜谱一起写回去，既慢又危险）。
 *
 * 入参：{ dishId, field: 'enabled' | 'herFavorite', value: true|false }
 * 出参：{ dishId, field, value }
 */

const { collections } = require('../lib/db');
const { badRequest } = require('../lib/res');

const ALLOWED_FIELDS = ['enabled', 'herFavorite'];

module.exports = async function dishToggle(ctx) {
  const { db, payload } = ctx;
  const dishId = payload && payload.dishId;
  const field = payload && payload.field;
  const value = !!(payload && payload.value);

  if (!dishId) throw badRequest('没有指定是哪道菜');
  if (ALLOWED_FIELDS.indexOf(field) === -1) {
    throw badRequest(`不支持改这个字段：${field}（只允许 ${ALLOWED_FIELDS.join(' / ')}）`, 'BAD_FIELD');
  }

  await db
    .collection(collections.dishes)
    .doc(dishId)
    .update({ data: { [field]: value, updatedAt: db.serverDate() } });

  return { dishId, field, value };
};
