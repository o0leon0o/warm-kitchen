// package-chef/pages/settings/settings.js —— 设置（文案 / 通知 / 分类 / 身份）
//
// 这个页面的存在意义：**改文案不用改代码，也不用重新上传云函数**。
// 界面上的每一句话都存在云数据库的 config 文档里，这里改完立刻生效。
// 你也可以完全不用这个页面，直接去云开发控制台改 config 文档 —— 效果一样。

const api = require('../../../utils/api');
const { toast } = require('../../../utils/format');

const CONFIG_ID = 'app';

const COPY_FIELDS = [
  { key: 'appTitle', label: '小程序标题', hint: '页面顶部的名字' },
  { key: 'successTitle', label: '点菜成功的标题', hint: '她提交后看到的第一句话' },
  { key: 'successSubtitle', label: '成功页的副标题', hint: '标题下面那句小字' },
  { key: 'orderButton', label: '提交按钮文字', hint: '比如「就吃这些」' },
  { key: 'emptyMenuText', label: '菜单为空时的提示', hint: '菜还没录进去时显示' },
  { key: 'remarkPlaceholder', label: '备注框的提示文字', hint: '输入框里的灰字' }
];

Page({
  data: {
    loading: true,
    saving: false,

    copyFields: COPY_FIELDS,
    ui: {},                 // 文案表单
    herName: '',
    meName: '',

    // 通知
    notifyEnabled: false,
    webhookMasked: '',
    webhookInput: '',
    testing: false,

    // 分类
    categories: [],
    newCategoryName: '',

    // 主菜二级筛选
    subCategories: [],
    newSubName: '',

    role: '',
    isAdmin: false
  },

  onLoad() {
    this.load();
  },

  load() {
    const apply = (user) => {
      if (!user) {
        this.setData({ loading: false });
        return;
      }
      const cfg = user.config || {};
      const couple = cfg.couple || {};
      this.setData({
        loading: false,
        role: user.role,
        isAdmin: !!user.isAdmin,
        ui: Object.assign({}, cfg.ui || {}),
        herName: couple.herName || '你',
        meName: couple.meName || '大厨',
        categories: (cfg.categories || []).map((c) => Object.assign({}, c)),
        subCategories: (cfg.subCategories || [
          { key: 'pork', name: '猪肉', icon: '🐷' },
          { key: 'beef', name: '牛肉', icon: '🐮' },
          { key: 'lamb', name: '羊肉', icon: '🐑' },
          { key: 'chicken', name: '鸡肉', icon: '🐔' },
          { key: 'fish', name: '鱼虾', icon: '🦐' },
          { key: 'egg', name: '蛋类', icon: '🥚' },
          { key: 'other', name: '其他', icon: '🍽' }
        ]).map((s) => Object.assign({ icon: '🍽' }, s))
      });
      this.loadNotifyStatus();
    };

    const cached = api.getUser();
    if (cached) apply(cached);
    else api.readyUser().then(apply);
  },

  loadNotifyStatus() {
    api
      .call('notify.test', {}, { silent: true })
      .then((res) =>
        this.setData({
          notifyEnabled: !!res.enabled,
          webhookMasked: res.webhookMasked || ''
        })
      )
      .catch(() => {});
  },

  // ============ 文案 ============
  onCopyInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ [`ui.${key}`]: e.detail.value });
  },

  onSaveCopy() {
    const patch = {};
    COPY_FIELDS.forEach((f) => {
      if (this.data.ui[f.key] !== undefined) patch[`ui.${f.key}`] = String(this.data.ui[f.key] || '');
    });
    if (!Object.keys(patch).length) {
      toast('没有改动');
      return;
    }
    this.save(patch, '文案已更新（她下拉刷新就能看到）');
  },

  // ============ 昵称 ============
  onHerNameInput(e) {
    this.setData({ herName: e.detail.value });
  },

  onSaveNames() {
    const herName = (this.data.herName || '').trim();
    if (!herName) {
      toast('昵称不能为空');
      return;
    }
    // couple.* 里只有名字在白名单里，openid 改不了（那个只能在控制台动）
    this.save({ 'couple.herName': herName }, '昵称改好了');
  },

  // ============ 通知 ============
  onWebhookInput(e) {
    this.setData({ webhookInput: e.detail.value });
  },

  onTestNotify() {
    if (this.data.testing) return;
    const url = (this.data.webhookInput || '').trim();
    if (!url) {
      toast('先把 webhook 地址粘进来');
      return;
    }

    this.setData({ testing: true });
    wx.showLoading({ title: '发送中…', mask: true });

    api
      .call('notify.test', { test: true, overrideWebhook: url }, { silent: true })
      .then((res) => {
        wx.hideLoading();
        this.setData({ testing: false, webhookMasked: res.webhookMasked || '' });
        if (res.status === 'sent') {
          wx.showModal({
            title: '通了 ✓',
            content: '去看一眼你们的群，应该收到一条测试消息。地址已经自动保存。',
            showCancel: false
          });
          this.setData({ notifyEnabled: true, webhookInput: '' });
        } else {
          wx.showModal({
            title: '没发出去',
            content: (res.error || '未知原因') + '\n\n（地址没有被保存）',
            showCancel: false
          });
        }
      })
      .catch((err) => {
        wx.hideLoading();
        this.setData({ testing: false });
        wx.showModal({ title: '测试失败', content: (err && err.message) || '', showCancel: false });
      });
  },

  onToggleNotifyEnabled(e) {
    const value = e.detail.value;
    api
      .call('config.save', { patch: { 'notify.enabled': value } })
      .then(() => {
        this.setData({ notifyEnabled: value });
        toast(value ? '通知已开启' : '通知已关闭（订单照常成立）');
      })
      .catch(() => {});
  },

  // ============ 分类 ============
  onCategoryNameInput(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ [`categories[${index}].name`]: e.detail.value });
  },

  onCategoryIconInput(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ [`categories[${index}].icon`]: e.detail.value });
  },

  onToggleCategoryEnabled(e) {
    const index = Number(e.currentTarget.dataset.index);
    const value = e.detail.value;
    this.setData({ [`categories[${index}].enabled`]: value });
  },

  onNewCategoryInput(e) {
    this.setData({ newCategoryName: e.detail.value });
  },

  onAddCategory() {
    const name = (this.data.newCategoryName || '').trim();
    if (!name) {
      toast('先写个分类名');
      return;
    }
    // key 用时间戳，保证唯一且是合法字段名
    const key = 'c' + Date.now().toString().slice(-6);
    const categories = this.data.categories.concat([{ key, name, icon: '🍽', enabled: true }]);
    this.setData({ categories, newCategoryName: '' });
  },

  onRemoveCategory(e) {
    const index = Number(e.currentTarget.dataset.index);
    const cat = this.data.categories[index];
    wx.showModal({
      title: `删掉分类「${cat.name}」？`,
      content: '这个分类下的菜不会删掉，但会变成"其他"分组。',
      success: (res) => {
        if (!res.confirm) return;
        const categories = this.data.categories.slice();
        categories.splice(index, 1);
        this.setData({ categories });
      }
    });
  },

  onSaveCategories() {
    const categories = this.data.categories.map((c) => ({
      key: c.key,
      name: String(c.name || '').trim() || c.key,
      icon: String(c.icon || '🍽'),
      enabled: c.enabled !== false
    }));
    const subCategories = this.data.subCategories.map((s) => ({
      key: s.key,
      name: String(s.name || '').trim() || s.key,
      icon: String(s.icon || '🍽')
    }));
    this.save({ categories, subCategories }, '分类已更新');
  },

  // ============ 主菜二级筛选 ============
  onSubNameInput(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ [`subCategories[${index}].name`]: e.detail.value });
  },

  onSubIconInput(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ [`subCategories[${index}].icon`]: e.detail.value });
  },

  onNewSubInput(e) {
    this.setData({ newSubName: e.detail.value });
  },

  onAddSub() {
    const name = (this.data.newSubName || '').trim();
    if (!name) {
      toast('先写个名字，比如「羊肉」');
      return;
    }
    const key = 's' + Date.now().toString().slice(-6);
    const subCategories = this.data.subCategories.concat([{ key, name, icon: '🍽' }]);
    this.setData({ subCategories, newSubName: '' });
  },

  onRemoveSub(e) {
    const index = Number(e.currentTarget.dataset.index);
    const sub = this.data.subCategories[index];
    wx.showModal({
      title: `删掉「${sub.name}」？`,
      content: '归在这一项下的主菜不会删掉，但会变成"没有细分"。',
      success: (res) => {
        if (!res.confirm) return;
        const subCategories = this.data.subCategories.slice();
        subCategories.splice(index, 1);
        this.setData({ subCategories });
      }
    });
  },

  // ============ 旧数据迁移 ============
  onMigrate() {
    wx.showModal({
      title: '修正分类数据？',
      content:
        '如果你之前灌过旧版预置菜品（分类是"家里做"），这个操作会把它们改到新分类（主菜/素菜/…），' +
        '并给主菜猜一个细分（猪肉/牛肉/…）。\n\n会先预览一遍再真的改。',
      confirmText: '先预览',
      success: (res) => {
        if (!res.confirm) return;

        wx.showLoading({ title: '正在检查…', mask: true });
        api
          .call('migrate', { dryRun: true }, { silent: true })
          .then((r) => {
            wx.hideLoading();
            if (!r.dishesUpdated && !r.changes.length && !r.categoriesUpdated) {
              wx.showModal({
                title: '不用改',
                content: `扫描了 ${r.dishesScanned} 道菜，分类已经是对的。`,
                showCancel: false
              });
              return;
            }

            const lines = r.changes
              .slice(0, 12)
              .map((c) => `${c.name}：${c.from} → ${c.to}${c.sub ? ' / ' + c.sub : ''}`)
              .join('\n');
            const more = r.changes.length > 12 ? `\n…还有 ${r.changes.length - 12} 道` : '';

            wx.showModal({
              title: `要改 ${r.changes.length} 道菜`,
              content: `${lines}${more}\n\n分类定义也会一起更新：${r.categoriesUpdated ? '是' : '不需要'}`,
              confirmText: '就这么改',
              success: (r2) => {
                if (!r2.confirm) return;
                wx.showLoading({ title: '正在修改…', mask: true });
                api
                  .call('migrate', { dryRun: false }, { silent: true })
                  .then((r3) => {
                    wx.hideLoading();
                    this.load();
                    wx.showModal({
                      title: '改完了',
                      content: `更新了 ${r3.dishesUpdated} 道菜。\n\n去「菜品管理」看一眼主菜的细分猜得对不对，不对的在编辑页改一下就好。`,
                      showCancel: false
                    });
                  })
                  .catch((err) => {
                    wx.hideLoading();
                    wx.showModal({ title: '没改成', content: (err && err.message) || '', showCancel: false });
                  });
              }
            });
          })
          .catch((err) => {
            wx.hideLoading();
            wx.showModal({ title: '检查失败', content: (err && err.message) || '', showCancel: false });
          });
      }
    });
  },

  // ============ 数据 ============
  onInitData() {
    wx.showModal({
      title: '补齐预置菜品？',
      content:
        '会检查这 24 道预置家常菜（含菜谱），只补菜单里还没有的。\n\n' +
        '同名菜不会被改动，你自己改过的内容也不会被覆盖。可以放心多点几次。',
      confirmText: '补齐',
      success: (res) => {
        if (!res.confirm) return;
        this.runSeed('missing');
      }
    });
  },

  /** 危险操作：清空菜单重新灌 */
  onResetSeed() {
    wx.showModal({
      title: '⚠️ 重新灌一遍？',
      content:
        '会把菜单里全部菜品删掉（包括你自己加的、改过的），然后重新灌入 24 道预置菜。\n\n' +
        '这个是找不回来的，确定吗？',
      confirmText: '继续',
      confirmColor: '#E45B5B',
      success: (res) => {
        if (!res.confirm) return;
        wx.showModal({
          title: '最后确认',
          content: '所有菜品和它们的菜谱都会被删除。历史订单不受影响。',
          confirmText: '清空并重灌',
          confirmColor: '#E45B5B',
          success: (r2) => {
            if (!r2.confirm) return;
            this.runSeed('replace');
          }
        });
      }
    });
  },

  runSeed(mode) {
    wx.showLoading({ title: '正在处理…', mask: true });
    api
      .call('initData', { mode: mode, confirm: true }, { silent: true })
      .then((r) => {
        wx.hideLoading();

        const lines = [];
        if (r.removed) lines.push(`删掉了 ${r.removed} 道旧菜`);
        lines.push(`新增 ${r.inserted} 道`);
        if (r.skipped) lines.push(`跳过 ${r.skipped} 道（已经有的）`);

        if (r.insertedNames && r.insertedNames.length) {
          lines.push('');
          lines.push(
            '新加的：' + r.insertedNames.slice(0, 8).join('、') + (r.insertedNames.length > 8 ? '…' : '')
          );
        }
        if (r.errors && r.errors.length) {
          lines.push('');
          lines.push('有失败的：' + r.errors.slice(0, 3).join('；'));
        }
        if (r.reason) lines.push('', r.reason);

        wx.showModal({
          title: r.inserted > 0 ? '补齐了' : '没有新增',
          content: lines.join('\n'),
          showCancel: false
        });

        this.load();
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showModal({ title: '没成功', content: (err && err.message) || '', showCancel: false });
      });
  },

  // ============ 身份 ============
  onSwapIdentity() {
    wx.showModal({
      title: '交换你俩的身份？',
      content:
        '如果她比你更早打开小程序，她会被认成"大厨"。这个操作把两个身份换回来。\n\n' +
        '换完之后，你俩都需要杀掉小程序重新进入才生效。',
      confirmText: '交换',
      success: (res) => {
        if (!res.confirm) return;
        api
          .call('auth.reassign', { swap: true }, { silent: true })
          .then(() => {
            wx.showModal({
              title: '换好了',
              content: '请各自杀掉小程序（从最近使用里划掉）重新打开。',
              showCancel: false
            });
          })
          .catch((err) => {
            wx.showModal({ title: '没换成', content: (err && err.message) || '', showCancel: false });
          });
      }
    });
  },

  // ============ 通用保存 ============
  save(patch, okMsg) {
    if (this.data.saving) return;
    this.setData({ saving: true });
    api
      .call('config.save', { patch }, { silent: true })
      .then(() => {
        this.setData({ saving: false });
        toast(okMsg || '已保存');
        // 让 app.js 下次启动重新拉配置（这里不强制刷新 present 的界面）
      })
      .catch((err) => {
        this.setData({ saving: false });
        wx.showModal({ title: '没保存上', content: (err && err.message) || '', showCancel: false });
      });
  }
});
