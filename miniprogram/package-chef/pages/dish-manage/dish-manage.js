// package-chef/pages/dish-manage/dish-manage.js —— 菜品管理
//
// 这里是"改菜单"日常操作的地方：上架/下架、标她爱吃、删除、改。
// 注意：dish.list 只返回**上架中**的菜，所以"全部（含下架）"这个筛选
// 是拉不到数据的 —— 这里用一个小技巧：下架的菜只能通过编辑页重新上架。
// 为了避免你困惑，界面里明确写清楚这一点。

const api = require('../../../utils/api');
const { toast } = require('../../../utils/format');

Page({
  data: {
    loading: true,
    errMsg: '',
    dishes: [],
    filtered: [],
    filter: 'all',   // all | favorite | noRecipe
    counts: { all: 0, favorite: 0, noRecipe: 0 }
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
        const dishes = [];
        (res.categories || []).forEach((c) => {
          c.dishes.forEach((d) => dishes.push(Object.assign({}, d, { categoryName: c.name, categoryIcon: c.icon })));
        });

        this.setData({
          loading: false,
          dishes,
          counts: {
            all: dishes.length,
            favorite: dishes.filter((d) => d.herFavorite).length,
            noRecipe: dishes.filter((d) => !d.hasRecipe).length
          }
        });
        this.applyFilter();
      })
      .catch((err) => this.setData({ loading: false, errMsg: (err && err.message) || '加载失败' }));
  },

  applyFilter() {
    const f = this.data.filter;
    let list = this.data.dishes.slice();
    if (f === 'favorite') list = list.filter((d) => d.herFavorite);
    if (f === 'noRecipe') list = list.filter((d) => !d.hasRecipe);
    this.setData({ filtered: list });
  },

  onFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.filter });
    this.applyFilter();
  },

  /** 切换「她爱吃」 */
  onToggleFavorite(e) {
    const id = e.currentTarget.dataset.id;
    const dish = this.data.dishes.find((d) => d._id === id);
    if (!dish) return;
    const next = !dish.herFavorite;

    // 先本地变，界面立刻响应
    this.patchDish(id, { herFavorite: next });

    api
      .call('dish.toggle', { dishId: id, field: 'herFavorite', value: next })
      .then(() => toast(next ? '已标成她爱吃 ♥' : '取消标记'))
      .catch(() => this.patchDish(id, { herFavorite: !next }));
  },

  /** 下架（从菜单隐藏，但数据还在） */
  onOffline(e) {
    const id = e.currentTarget.dataset.id;
    const dish = this.data.dishes.find((d) => d._id === id);
    if (!dish) return;

    wx.showModal({
      title: `下架「${dish.name}」？`,
      content: '她看不到这道菜了，但菜谱和历史订单都还在。以后想恢复：在编辑页把"上架"打开。',
      confirmText: '下架',
      success: (res) => {
        if (!res.confirm) return;
        api
          .call('dish.toggle', { dishId: id, field: 'enabled', value: false })
          .then(() => {
            toast('已下架');
            this.load();
          })
          .catch(() => {});
      }
    });
  },

  /** 彻底删除 */
  onDelete(e) {
    const id = e.currentTarget.dataset.id;
    const dish = this.data.dishes.find((d) => d._id === id);
    if (!dish) return;

    const warn = dish.cookCount > 0 ? `\n\n⚠️ 这道菜已经被点过 ${dish.cookCount} 次。` : '';

    wx.showModal({
      title: `彻底删掉「${dish.name}」？`,
      content: `删了就找不回来了。${warn}\n\n如果只是想让它从菜单消失，建议用「下架」。`,
      confirmText: '真的删',
      confirmColor: '#E45B5B',
      success: (res) => {
        if (!res.confirm) return;
        api
          .call('dish.remove', { dishId: id, force: true })
          .then(() => {
            toast('已删除');
            this.load();
          })
          .catch((err) => toast((err && err.message) || '删除失败'));
      }
    });
  },

  onEdit(e) {
    wx.navigateTo({ url: `/package-chef/pages/dish-edit/dish-edit?dishId=${e.currentTarget.dataset.id}` });
  },

  onCook(e) {
    wx.navigateTo({ url: `/package-chef/pages/cook/cook?dishId=${e.currentTarget.dataset.id}` });
  },

  onAdd() {
    wx.navigateTo({ url: '/package-chef/pages/dish-edit/dish-edit' });
  },

  patchDish(id, patch) {
    const dishes = this.data.dishes.map((d) => (d._id === id ? Object.assign({}, d, patch) : d));
    this.setData({ dishes });
    this.applyFilter();
  }
});
