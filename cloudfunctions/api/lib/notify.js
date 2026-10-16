/**
 * lib/notify.js —— 企业微信群机器人推送
 *
 * 为什么要单独一个文件：
 *   通知是最容易出问题、也最容易被替换的一环（以后你也许想换成订阅消息、
 *   或者 Server 酱）。把它抽出来，换方案时只改这一个文件，
 *   业务代码（order.create）完全不用动。
 *
 * 设计原则（很重要）：
 *   推送失败**绝不允许**影响下单成功。
 *   流程永远是：订单先落库 → 再尝试推送 → 推送结果只记录在订单的 notifyStatus 字段里。
 */

const https = require('https');
const { URL } = require('url');

const TIMEOUT_MS = 5000;
const RETRY = 1; // 失败重试次数（企业微信偶尔会抖一下）

/**
 * 发一条点菜通知
 * @param {object} notifyConfig config.notify
 * @param {object} order        刚创建的订单
 * @param {object} config       完整配置（取昵称用）
 * @returns {Promise<{status:'sent'|'failed'|'skipped', error?:string}>}
 *          ⚠️ 这个 Promise 永远 resolve，不会 reject —— 调用方不需要 try/catch
 */
async function sendOrderNotify(notifyConfig, order, config) {
  const webhook = (notifyConfig && notifyConfig.wecomWebhook) || '';

  if (!notifyConfig || notifyConfig.enabled !== true) {
    return { status: 'skipped', error: '未启用通知（config.notify.enabled 为 false）' };
  }
  if (!webhook) {
    return { status: 'skipped', error: '还没填 webhook 地址（config.notify.wecomWebhook）' };
  }
  if (!/^https:\/\/qyapi\.weixin\.qq\.com\/cgi-bin\/webhook\/send\?key=/.test(webhook)) {
    return { status: 'failed', error: 'webhook 地址格式不对，应该以 https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key= 开头' };
  }

  const body = buildWecomBody(order, config);

  let lastErr = '';
  for (let attempt = 0; attempt <= RETRY; attempt++) {
    try {
      const res = await postJson(webhook, body);
      if (res && res.errcode === 0) {
        return { status: 'sent' };
      }
      lastErr = `企业微信返回 errcode=${res && res.errcode} errmsg=${res && res.errmsg}`;
      // 机器人被删/地址失效这类错误重试也没用，直接退出
      if (res && (res.errcode === 93000 || res.errcode === 40001)) break;
    } catch (e) {
      lastErr = (e && e.message) || String(e);
    }
  }

  console.error('[notify] 推送失败：', lastErr);
  return { status: 'failed', error: lastErr };
}

/** 拼企业微信 markdown 消息 */
function buildWecomBody(order, config) {
  const ui = (config && config.ui) || {};
  const couple = (config && config.couple) || {};

  // 是谁点的菜就显示谁的名字：
  //   order.userRole 是 order.create 按提交人的身份写进去的（'me' / 'her' / 'guest'）
  //   自己下单却显示"她 点了…"或者反过来，都很怪，所以这里按角色取名。
  let who = couple.herName || '她';
  if (order.userRole === 'me') {
    who = couple.meName || '大厨';
  } else if (order.userRole === 'guest') {
    who = '有人';
  }

  const dishLines = (order.items || []).map((it) => `> · ${it.name}`).join('\n');
  const remark = order.remark ? `\n💬 **她说**：${order.remark}\n` : '';

  const content = [
    `## ${ui.successTitle || '今晚有口福啦 ❤'}`,
    `${who} 点了 **${(order.items || []).length}** 道菜：`,
    dishLines,
    remark,
    `<font color="comment">${order.mealDate} · 一起做饭 🍳</font>`
  ]
    .filter(Boolean)
    .join('\n');

  return {
    msgtype: 'markdown',
    markdown: { content }
  };
}

/** 发一个 HTTPS POST JSON 请求（用内置模块，避免为了一行代码引 axios） */
function postJson(urlStr, body) {
  return new Promise((resolve, reject) => {
    let u;
    try {
      u = new URL(urlStr);
    } catch (e) {
      reject(new Error('webhook 地址不是合法 URL'));
      return;
    }

    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        },
        timeout: TIMEOUT_MS
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(new Error('企业微信返回了非 JSON 内容：' + raw.slice(0, 200)));
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error(`请求超时（${TIMEOUT_MS}ms），检查云函数是否配置了外网访问`));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

module.exports = { sendOrderNotify, buildWecomBody };
