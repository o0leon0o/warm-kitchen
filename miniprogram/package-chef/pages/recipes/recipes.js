// package-chef/pages/recipes/recipes.js —— 我的菜谱（菜谱库）
//
// 跟点菜页的区别：这里不是"选菜"，而是"翻菜谱"。
// 排序默认按做过次数（常做的一定是好吃的），也可以切成按分类。
// 每道菜两个动作：看做法（进做菜模式）、编辑。

const api = require('../../../utils/api');

Page({
  data: {
    loading: true,
    errMsg: '',
    dishes: [],
    filtered: [],
    keyword: '',
    sort: 'cookCount', // 'cookCount' 做过多的在前 | 'recent' 最近更新的在前 | 'name' 按名字
    stats: { total: 0, withRecipe: 0, everCooked: 0 }
  },

  onLoad() {
    this.load();
  },

  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh());
  },

  load() {
    this.setData({ loading: true, errMsg: '' });
    return api
      .call('dish.list', {})
      .then((res) => {
        // dish.list 返回的是按分类分组的结构，这里摊平
        const dishes = [];
        (res.categories || []).forEach((c) => {
          c.dishes.forEach((d) => {
            dishes.push(Object.assign({}, d, { categoryName: c.name, categoryIcon: c.icon }));
          });
        });

        const stats = {
          total: dishes.length,
          withRecipe: dishes.filter((d) => d.hasRecipe).length,
          everCooked: dishes.filter((d) => d.cookCount > 0).length
        };

        this.setData({ loading: false, dishes, stats });
        this.applyFilter();
      })
      .catch((err) => this.setData({ loading: false, errMsg: (err && err.message) || '加载失败' }));
  },

  applyFilter() {
    const kw = (this.data.keyword || '').trim();
    let list = this.data.dishes.slice();

    if (kw) {
      list = list.filter((d) => (d.name || '').indexOf(kw) > -1 || (d.intro || '').indexOf(kw) > -1);
    }

    const sort = this.data.sort;
    list.sort((a, b) => {
      if (sort === 'name') return (a.name || '').localeCompare(b.name || '', 'zh');
      if (sort === 'recent') return (b.updatedAt || 0) - (a.updatedAt || 0);
      // 默认：做过次数多的在前，其次她爱吃的
      if (a.cookCount !== b.cookCount) return b.cookCount - a.cookCount;
      if (a.herFavorite !== b.herFavorite) return a.herFavorite ? -1 : 1;
      return 0;
    });

    this.setData({ filtered: list });
  },

  onSearch(e) {
    this.setData({ keyword: e.detail.value });
    this.applyFilter();
  },

  onSort(e) {
    this.setData({ sort: e.currentTarget.dataset.sort });
    this.applyFilter();
  },

  onOpen(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/package-chef/pages/cook/cook?dishId=${id}` });
  },

  onEdit(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/package-chef/pages/dish-edit/dish-edit?dishId=${id}` });
  },

  onAdd() {
    wx.navigateTo({ url: '/package-chef/pages/dish-edit/dish-edit' });
  }
});
