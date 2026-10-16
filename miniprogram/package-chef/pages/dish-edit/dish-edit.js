// package-chef/pages/dish-edit/dish-edit.js —— 新增 / 编辑菜品（含菜谱）
//
// 这个页面就是"你一边查攻略一边学做菜"的录入入口：
//   · 菜名 / 分类 / 一句话简介 / 标签 / 她爱吃 / 辣度 / 上架
//   · 配料（一行一样，可增删）
//   · 步骤（可增删、可上下调序）—— 这是最常用的部分
//   · 小贴士 / 攻略链接 / 复盘笔记
//
// 表单数据用 setData 的 "字段路径" 语法就地更新（如 'form.ingredients[0].name'），
// 这样不用每次改动都重设整个对象，输入框不会卡。

const api = require('../../../utils/api');
const { toast } = require('../../../utils/format');

const TAG_BASE = ['快手', '下饭', '清淡', '甜口', '硬菜', '新手友好', '15分钟', '30分钟', '1小时'];
const AVOID_BASE = ['辣', '香菜', '葱', '蒜', '花生', '海鲜', '牛肉', '牛奶'];

/**
 * 把"选中状态"预先算成布尔字段。
 *
 * ⚠️ 为什么不在 WXML 里写 `form.tags.indexOf(item) > -1`：
 *    微信 WXML 的表达式解析器不支持数组方法调用，写 indexOf 会被静默当成
 *    undefined，标签永远不会变成选中态（这个 bug 我们踩过一次）。
 *    所以这里的 chips 是 [{ name, on }]，WXML 只读 item.on。
 */
function buildChips(base, selected) {
  const sel = selected || [];
  return base.map((name) => ({ name, on: sel.indexOf(name) > -1 }));
}

Page({
  data: {
    dishId: '',
    isNew: true,
    loading: false,
    saving: false,

    categories: [],
    categoryIndex: 0,

    // 主菜二级分类（只有选了「主菜」才显示这个选项）
    subOptions: [],
    subIndex: 0,
    showSub: false,

    form: {
      name: '',
      category: 'main',
      subCategory: '',
      intro: '',
      tags: [],
      avoid: [],
      herFavorite: false,
      spicy: 0,
      enabled: true,
      sortOrder: 100,
      recipe: {
        ingredients: [],
        steps: [],
        tips: [],
        sourceUrl: '',
        sourceTitle: '',
        note: ''
      }
    },

    tagSuggestions: buildChips(TAG_BASE, []),
    avoidSuggestions: buildChips(AVOID_BASE, []),
    spicyOptions: ['不辣', '微辣', '中辣', '重辣'],
    newTip: '',
    focusField: ''
  },

  onLoad(options) {
    const dishId = (options && options.dishId) || '';
    const focusField = (options && options.focus) || '';

    this.setData({ dishId, isNew: !dishId, focusField });

    this.loadCategories().then(() => {
      if (dishId) {
        this.loadDish();
      } else {
        // 新菜默认给一个空白配料行和步骤行，省得你还要先点"添加"
        this.setData({
          'form.recipe.ingredients': [{ name: '', amount: '' }],
          'form.recipe.steps': [{ text: '' }]
        });
        this.refreshChips();
        wx.setNavigationBarTitle({ title: '加一道新菜' });
      }
    });
  },

  /** 重算标签/忌口的选中态（WXML 不支持 indexOf，只能在这里预先算好） */
  refreshChips() {
    this.setData({
      tagSuggestions: buildChips(TAG_BASE, this.data.form.tags),
      avoidSuggestions: buildChips(AVOID_BASE, this.data.form.avoid)
    });
  },

  loadCategories() {
    const user = api.getUser();
    const cfg = (user && user.config) || {};
    const cats = cfg.categories || [];
    const categories = cats.length
      ? cats
      : [
          { key: 'main', name: '主菜', icon: '🍖' },
          { key: 'veg', name: '素菜', icon: '🥬' },
          { key: 'soup', name: '汤', icon: '🥣' },
          { key: 'staple', name: '主食', icon: '🍚' },
          { key: 'dessert', name: '甜品', icon: '🍮' }
        ];

    const subOptions = (cfg.subCategories && cfg.subCategories.length
      ? cfg.subCategories
      : [
          { key: 'pork', name: '猪肉', icon: '🐷' },
          { key: 'beef', name: '牛肉', icon: '🐮' },
          { key: 'lamb', name: '羊肉', icon: '🐑' },
          { key: 'chicken', name: '鸡肉', icon: '🐔' },
          { key: 'fish', name: '鱼虾', icon: '🦐' },
          { key: 'egg', name: '蛋类', icon: '🥚' },
          { key: 'other', name: '其他', icon: '🍽' }
        ]
    ).map((s) => ({ key: s.key, name: (s.icon ? s.icon + ' ' : '') + s.name }));

    this.setData({ categories, subOptions });
    return Promise.resolve();
  },

  loadDish() {
    this.setData({ loading: true });
    return api
      .call('dish.detail', { dishId: this.data.dishId })
      .then((dish) => {
        const recipe = dish.recipe || {};
        const form = {
          name: dish.name || '',
          category: dish.category || 'main',
          subCategory: dish.subCategory || '',
          intro: dish.intro || '',
          tags: dish.tags || [],
          avoid: dish.avoid || [],
          herFavorite: !!dish.herFavorite,
          spicy: Number(dish.spicy) || 0,
          enabled: dish.enabled !== false,
          sortOrder: Number(dish.sortOrder) || 100,
          recipe: {
            ingredients: (recipe.ingredients || []).length ? recipe.ingredients : [{ name: '', amount: '' }],
            steps: (recipe.steps || []).length ? recipe.steps.map((s) => ({ text: s.text, image: s.image })) : [{ text: '' }],
            tips: recipe.tips || [],
            sourceUrl: recipe.sourceUrl || '',
            sourceTitle: recipe.sourceTitle || '',
            note: recipe.note || ''
          }
        };

        const idx = Math.max(0, this.data.categories.findIndex((c) => c.key === form.category));
        const subIdx = Math.max(0, this.data.subOptions.findIndex((s) => s.key === form.subCategory));

        this.setData(
          {
            loading: false,
            form,
            categoryIndex: idx,
            subIndex: subIdx,
            showSub: form.category === 'main'
          },
          () => this.refreshChips()
        );
        wx.setNavigationBarTitle({ title: `编辑 · ${dish.name}` });
      })
      .catch((err) => {
        this.setData({ loading: false });
        toast((err && err.message) || '打不开这道菜');
      });
  },

  // ============ 基础字段 ============
  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  onRecipeInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.recipe.${field}`]: e.detail.value });
  },

  onCategoryChange(e) {
    const index = Number(e.detail.value);
    const cat = this.data.categories[index];
    const key = cat ? cat.key : 'main';
    this.setData({
      categoryIndex: index,
      'form.category': key,
      // 切到主菜时，如果还没选二级分类，默认给第一个，省得漏填
      'form.subCategory': key === 'main' ? this.data.form.subCategory || (this.data.subOptions[0] || {}).key || '' : '',
      subIndex: key === 'main' ? this.data.subIndex : 0,
      showSub: key === 'main'
    });
  },

  onSubChange(e) {
    const index = Number(e.detail.value);
    const sub = this.data.subOptions[index];
    this.setData({ subIndex: index, 'form.subCategory': sub ? sub.key : '' });
  },

  onSpicyChange(e) {
    this.setData({ 'form.spicy': Number(e.detail.value) });
  },

  onSwitch(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  // ============ 标签 ============
  onTapTag(e) {
    const tag = e.currentTarget.dataset.tag;
    const tags = this.data.form.tags.slice();
    const i = tags.indexOf(tag);
    if (i > -1) tags.splice(i, 1);
    else tags.push(tag);
    this.setData({ 'form.tags': tags }, () => this.refreshChips());
  },

  onTapAvoid(e) {
    const item = e.currentTarget.dataset.tag;
    const avoid = this.data.form.avoid.slice();
    const i = avoid.indexOf(item);
    if (i > -1) avoid.splice(i, 1);
    else avoid.push(item);
    this.setData({ 'form.avoid': avoid }, () => this.refreshChips());
  },

  // ============ 配料 ============
  addIngredient() {
    const list = this.data.form.recipe.ingredients.concat([{ name: '', amount: '' }]);
    this.setData({ 'form.recipe.ingredients': list });
  },

  removeIngredient(e) {
    const index = Number(e.currentTarget.dataset.index);
    const list = this.data.form.recipe.ingredients.slice();
    list.splice(index, 1);
    if (list.length === 0) list.push({ name: '', amount: '' });
    this.setData({ 'form.recipe.ingredients': list });
  },

  onIngredientInput(e) {
    const index = Number(e.currentTarget.dataset.index);
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.recipe.ingredients[${index}].${field}`]: e.detail.value });
  },

  // ============ 步骤 ============
  addStep() {
    const list = this.data.form.recipe.steps.concat([{ text: '', image: '' }]);
    this.setData({ 'form.recipe.steps': list });
    // 新增后滚到底部（简单用页面滚动 API，避免引入额外逻辑）
    wx.pageScrollTo({ scrollTop: 100000, duration: 220 });
  },

  removeStep(e) {
    const index = Number(e.currentTarget.dataset.index);
    const list = this.data.form.recipe.steps.slice();
    list.splice(index, 1);
    if (list.length === 0) list.push({ text: '', image: '' });
    this.setData({ 'form.recipe.steps': list });
  },

  onStepInput(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ [`form.recipe.steps[${index}].text`]: e.detail.value });
  },

  moveStep(e) {
    const index = Number(e.currentTarget.dataset.index);
    const dir = e.currentTarget.dataset.dir; // 'up' | 'down'
    const list = this.data.form.recipe.steps.slice();
    const target = dir === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= list.length) return;
    const tmp = list[index];
    list[index] = list[target];
    list[target] = tmp;
    this.setData({ 'form.recipe.steps': list });
  },

  /** 粘贴一整段做法，自动按行拆成步骤（从攻略里复制的实用功能） */
  onPasteSteps() {
    wx.showModal({
      title: '粘贴整段做法',
      editable: true,
      placeholderText: '把攻略里的步骤整段粘进来，按行自动拆成步骤',
      success: (res) => {
        if (!res.confirm || !res.content) return;
        const lines = String(res.content)
          .split(/[\n\r]+/)
          .map((s) => s.replace(/^\s*\d+[.、)]\s*/, '').trim())
          .filter(Boolean);
        if (!lines.length) {
          toast('没识别出内容');
          return;
        }
        const steps = lines.map((t) => ({ text: t, image: '' }));
        this.setData({ 'form.recipe.steps': steps });
        toast(`已拆成 ${steps.length} 步`);
      }
    });
  },

  // ============ 小贴士 / 复盘 ============
  onNewTipInput(e) {
    this.setData({ newTip: e.detail.value });
  },

  addTip() {
    const t = (this.data.newTip || '').trim();
    if (!t) return;
    const tips = this.data.form.recipe.tips.concat([t]);
    this.setData({ 'form.recipe.tips': tips, newTip: '' });
  },

  removeTip(e) {
    const index = Number(e.currentTarget.dataset.index);
    const tips = this.data.form.recipe.tips.slice();
    tips.splice(index, 1);
    this.setData({ 'form.recipe.tips': tips });
  },

  // ============ 保存 ============
  onSave() {
    if (this.data.saving) return;

    const form = this.data.form;
    const name = (form.name || '').trim();

    if (!name) {
      toast('菜名不能为空');
      return;
    }

    const steps = form.recipe.steps
      .map((s) => ({ text: (s.text || '').trim(), image: s.image || '' }))
      .filter((s) => s.text);

    const ingredients = form.recipe.ingredients
      .map((x) => ({ name: (x.name || '').trim(), amount: (x.amount || '').trim() }))
      .filter((x) => x.name);

    const payload = {
      dishId: this.data.dishId || undefined,
      name,
      category: form.category,
      // 二级分类只对主菜有意义（云函数也会再强制清一次，这里先清掉避免脏数据）
      subCategory: form.category === 'main' ? form.subCategory : '',
      intro: (form.intro || '').trim(),
      tags: form.tags,
      avoid: form.avoid,
      herFavorite: form.herFavorite,
      spicy: form.spicy,
      enabled: form.enabled,
      sortOrder: form.sortOrder,
      recipe: {
        ingredients,
        steps,
        tips: form.recipe.tips,
        sourceUrl: (form.recipe.sourceUrl || '').trim(),
        sourceTitle: (form.recipe.sourceTitle || '').trim(),
        note: (form.recipe.note || '').trim()
      }
    };

    // 诚实提醒：没写步骤 = 这道菜没有做法可看
    if (steps.length === 0 && !this._warnedNoSteps) {
      wx.showModal({
        title: '还没有写步骤',
        content: '现在保存的话，这道菜在"做菜模式"里是空的。确定要这样保存吗？',
        confirmText: '还是保存',
        cancelText: '回去补',
        success: (res) => {
          if (res.confirm) {
            this._warnedNoSteps = true;
            this.doSave(payload);
          }
        }
      });
      return;
    }

    this.doSave(payload);
  },

  doSave(payload) {
    this.setData({ saving: true });
    wx.showLoading({ title: '保存中…', mask: true });

    api
      .call('dish.save', payload, { silent: true })
      .then((res) => {
        wx.hideLoading();
        this.setData({ saving: false, dishId: res.dishId, isNew: false });
        toast(res.created ? '已经加进菜单了' : '改好了');
        setTimeout(() => wx.navigateBack({ delta: 1 }), 700);
      })
      .catch((err) => {
        wx.hideLoading();
        this.setData({ saving: false });
        wx.showModal({
          title: '没保存上',
          content: (err && err.message) || '再试一次',
          showCancel: false
        });
      });
  },

  /** 上架/下架（编辑已有菜品时才有意义） */
  onToggleEnabled() {
    const dishId = this.data.dishId;
    if (!dishId) return;
    const next = !this.data.form.enabled;
    api
      .call('dish.toggle', { dishId, field: 'enabled', value: next })
      .then(() => {
        this.setData({ 'form.enabled': next });
        toast(next ? '已上架' : '已下架（她看不到了）');
      })
      .catch(() => {});
  }
});
