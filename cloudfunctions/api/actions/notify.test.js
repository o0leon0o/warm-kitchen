/**
 * actions/notify.test.js —— 测试推送 + 查询通知配置（只有你能调）
 *
 * 为什么需要它：
 *   企微 webhook 填错、机器人被移除、群解散 —— 这些都会让"她点了菜但群里不响"。
 *   这个接口让你在设置页点一下就知道通不通，不用真去点一单来试。
 *
 * ⚠️ 安全考虑：webhook 地址（含 key）**绝不下发给前端**，
 *    前端只能看到"填了没 / 启用没"。测试时把配置覆盖写进去即可。
 *
 * 入参：{ test?: true, overrideWebhook?: 'https://...' }
 *   - 不传 test：只返回当前配置概况
 *   - test: true：发一条测试消息
 * 出参：{ configured, enabled, webhookMasked, status, error }
 */

const { collections } = require('../lib/db');
const notify = require('../lib/notify');

module.exports = async function notifyTest(ctx) {
  const { db, payload, config } = ctx;

  const overridden = String((payload && payload.overrideWebhook) || '').trim();
  const notifyConfig = Object.assign({}, config.notify || {});

  if (overridden) notifyConfig.wecomWebhook = overridden;
  // 测试时强制打开开关，否则永远返回 skipped
  notifyConfig.enabled = true;

  const webhook = notifyConfig.wecomWebhook || '';
  const masked = maskWebhook(webhook);

  if (!(payload && payload.test === true)) {
    return {
      configured: !!webhook,
      enabled: !!(config.notify && config.notify.enabled),
      webhookMasked: masked
    };
  }

  // 造一条假订单来渲染消息
  const fakeOrder = {
    items: [{ name: '测试菜（番茄炒蛋）' }, { name: '测试汤（紫菜蛋花汤）' }],
    remark: '这是一条测试消息，看到它说明推送通了 ✅',
    mealDate: new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10),
    createdAt: new Date()
  };

  const result = await notify.sendOrderNotify(notifyConfig, fakeOrder, config);

  // 测试成功后，如果用的是页面里填的地址，顺手存进数据库（省一次手动保存）
  if (result.status === 'sent' && overridden) {
    try {
      await db.collection(collections.config).doc('app').update({
        data: {
          'notify.wecomWebhook': overridden,
          'notify.enabled': true,
          updatedAt: db.serverDate()
        }
      });
    } catch (e) {
      console.warn('[notify.test] 保存 webhook 失败：', e && e.message);
    }
  }

  return {
    configured: !!webhook,
    enabled: true,
    webhookMasked: maskWebhook(notifyConfig.wecomWebhook),
    status: result.status,
    error: result.error || ''
  };
};

/** 只显示头尾，中间打码 —— 你一眼能认出是哪个机器人，但截图外发也不泄密 */
function maskWebhook(url) {
  if (!url) return '';
  const m = String(url).match(/key=([-\w]+)/);
  if (!m) return String(url).slice(0, 24) + '...';
  const key = m[1];
  const head = key.slice(0, 8);
  const tail = key.slice(-4);
  return `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${head}****${tail}`;
}
