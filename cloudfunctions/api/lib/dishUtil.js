/**
 * lib/dishUtil.js —— 菜品与菜谱的结构工具
 *
 * 只做两件事：
 *   normalizeDish()  把数据库里的记录补全成"字段一定存在"的形状（页面不用到处判空）
 *   stripForRole()   按身份裁剪菜谱内容（她的界面看不到你的复盘笔记）
 */

const EMPTY_RECIPE = { ingredients: [], steps: [], tips: [], sourceUrl: '', sourceTitle: '', note: '', updatedAt: '' };

/** 补全读出来的菜品记录，保证前端拿到的字段一个不少 */
function normalizeDish(doc) {
  const recipe = Object.assign({}, EMPTY_RECIPE, (doc && doc.recipe) || {});
  recipe.ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.map((x) => ({ name: String((x && x.name) || ''), amount: String((x && x.amount) || '') }))
    : [];
  recipe.steps = Array.isArray(recipe.steps)
    ? recipe.steps
        .map((s, i) => ({
          order: Number(s && s.order) || i + 1,
          text: String((s && s.text) || ''),
          image: String((s && s.image) || ''),
          done: !!(s && s.done),
          doneAt: (s && s.doneAt) || null
        }))
        .sort((a, b) => a.order - b.order)
    : [];
  recipe.tips = Array.isArray(recipe.tips) ? recipe.tips.map(String) : [];

  return {
    _id: doc._id,
    name: String(doc.name || ''),
    category: String(doc.category || 'main'),
    // 二级分类：只有主菜用（pork/beef/chicken/fish/other），其他分类留空
    subCategory: String(doc.subCategory || ''),
    intro: String(doc.intro || ''),
    coverImage: String(doc.coverImage || ''),
    tags: Array.isArray(doc.tags) ? doc.tags.map(String) : [],
    herFavorite: !!doc.herFavorite,
    avoid: Array.isArray(doc.avoid) ? doc.avoid.map(String) : [],
    spicy: Number(doc.spicy) || 0,
    enabled: doc.enabled !== false,
    cookCount: Number(doc.cookCount) || 0,
    sortOrder: Number(doc.sortOrder) || 100,
    recipe,
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null
  };
}

/**
 * 按身份裁剪。
 * 她说"菜谱给我们俩一起看"，但你的复盘笔记（note）是你的私人记录，不下发给她。
 * 访客看到的是最精简的版本。
 */
function stripForRole(dish, role, options) {
  const opts = options || {};
  const out = Object.assign({}, dish);

  if (opts.brief) {
    // 列表页只需要这些，别把整个菜谱传到手机上
    return {
      _id: dish._id,
      name: dish.name,
      category: dish.category,
      subCategory: dish.subCategory,
      intro: dish.intro,
      coverImage: dish.coverImage,
      tags: dish.tags,
      herFavorite: dish.herFavorite,
      avoid: dish.avoid,
      spicy: dish.spicy,
      cookCount: dish.cookCount,
      stepCount: dish.recipe.steps.length,
      hasRecipe: dish.recipe.steps.length > 0
    };
  }

  if (role !== 'me') {
    out.recipe = Object.assign({}, dish.recipe, { note: '' });
  }
  return out;
}

/** 生成写入数据库时的菜谱结构（把前端传上来的东西洗一遍，防止脏数据） */
function buildRecipe(input) {
  const src = input || {};
  const ingredients = (Array.isArray(src.ingredients) ? src.ingredients : [])
    .map((x) => ({ name: String((x && x.name) || '').trim(), amount: String((x && x.amount) || '').trim() }))
    .filter((x) => x.name);

  const steps = (Array.isArray(src.steps) ? src.steps : [])
    .map((s, i) => ({
      order: i + 1,
      text: String((s && (s.text !== undefined ? s.text : s)) || '').trim(),
      image: String((s && s.image) || ''),
      done: !!(s && s.done),
      doneAt: (s && s.doneAt) || null
    }))
    .filter((s) => s.text);

  return {
    ingredients,
    steps,
    tips: (Array.isArray(src.tips) ? src.tips : []).map((t) => String(t).trim()).filter(Boolean),
    sourceUrl: String(src.sourceUrl || '').trim(),
    sourceTitle: String(src.sourceTitle || '').trim(),
    note: String(src.note || '').trim(),
    updatedAt: new Date()
  };
}

module.exports = { normalizeDish, stripForRole, buildRecipe };
