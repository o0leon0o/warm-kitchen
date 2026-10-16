/**
 * actions/dish.list.js —— 点菜页的菜品列表
 *
 * 返回的数据已经按"页面要渲染的样子"排好，页面不需要再做排序/分组逻辑：
 *   { categories: [ { key, name, icon, dishes: [...] } ], total }
 *
 * 排序规则（从重要到次要）：
 *   1. 「她爱吃 ♥」排前面          ← 她的菜优先
 *   2. sortOrder 小的排前面        ← 你手动调的权重
 *   3. 做过次数多的排前面           ← 常做的菜更可能再点
 *   4. 创建时间早的排前面
 *
 * 空分类不会返回（避免她看到一堆空标签）。
 */

const { collections } = require('../lib/db');
const { normalizeDish, stripForRole } = require('../lib/dishUtil');

module.exports = async function dishList(ctx) {
  const { db, config, role } = ctx;

  const res = await db
    .collection(collections.dishes)
    .where({ enabled: true })
    .limit(200) // 一个两人家庭的菜单不会超过 200 道，够用且避免分页复杂度
    .get();

  const all = (res.data || []).map(normalizeDish).sort(compareDish);

  // 按分类归组（分类顺序以 config.categories 为准）
  const order = (config.categories || []).map((c) => c.key);
  const buckets = {};
  all.forEach((d) => {
    if (!buckets[d.category]) buckets[d.category] = [];
    buckets[d.category].push(d);
  });

  const categories = (config.categories || [])
    .filter((c) => c && c.enabled !== false)
    .map((c) => {
      const dishes = buckets[c.key] || [];
      return {
        key: c.key,
        name: c.name,
        icon: c.icon || '',
        count: dishes.length,
        dishes: dishes.map((d) => stripForRole(d, role, { brief: true }))
      };
    })
    .filter((c) => c.count > 0);

  // 落在未定义分类里的菜，兜底放进一个"其他"分组，不让它们凭空消失
  const knownKeys = order.concat((config.categories || []).map((c) => c.key));
  const orphans = all.filter((d) => knownKeys.indexOf(d.category) === -1);
  if (orphans.length) {
    categories.push({
      key: '__other__',
      name: '其他',
      icon: '🍽',
      count: orphans.length,
      dishes: orphans.map((d) => stripForRole(d, role, { brief: true }))
    });
  }

  return { categories, total: all.length };
};

function compareDish(a, b) {
  if (a.herFavorite !== b.herFavorite) return a.herFavorite ? -1 : 1;
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  if (a.cookCount !== b.cookCount) return b.cookCount - a.cookCount;
  const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return at - bt;
}
