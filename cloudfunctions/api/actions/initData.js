/**
 * actions/initData.js —— 灌入预置菜品（24 道家常菜 + 菜谱）
 *
 * 什么时候跑：云开发控制台手动调一次，或者小程序「设置」页点按钮。
 *
 * 三种模式（入参 mode）：
 *   'missing'     默认。只补菜单里**没有的**，同名的不动 —— 安全，随便跑
 *   'replace'     先删光再灌。⚠️ 会连你自己改过的菜一起删掉，需要额外传 confirm: true
 *   'onlyIfEmpty' 旧行为：菜单非空就整体跳过
 *
 * 为什么默认是 'missing'：
 *   以前默认是 onlyIfEmpty，结果用户灌过一次旧版数据后，
 *   再点"灌入预置菜品"什么都没发生（因为菜单非空），
 *   界面上完全看不出原因 —— 这是个很差的设计。现在改成只补缺的，
 *   既能拿到新菜，又不会覆盖你的修改。
 *
 * 入参：{ mode?: 'missing'|'replace'|'onlyIfEmpty', confirm?: boolean }
 * 出参：{ inserted, skipped, removed, insertedNames, skippedNames, ... }
 */

const { seedPresets } = require('../lib/presetData');

module.exports = async function initData(ctx) {
  const { payload, config, openid, role } = ctx;

  // ---- 保护：身份 ----
  const meOpenid = (config && config.couple && config.couple.meOpenid) || '';
  if (meOpenid && meOpenid !== openid && role !== 'me') {
    return { inserted: 0, skipped: 0, reason: '只有大厨（第一个打开小程序的微信号）可以灌数据' };
  }

  const mode = String((payload && payload.mode) || 'missing');

  // ---- 保护：危险模式必须显式确认 ----
  if (mode === 'replace' && !(payload && payload.confirm === true)) {
    return {
      inserted: 0,
      skipped: 0,
      reason:
        "replace 模式会删掉菜单里全部菜品（包括你自己改过的），需要传 { mode: 'replace', confirm: true } 才会执行"
    };
  }

  if (['missing', 'replace', 'onlyIfEmpty'].indexOf(mode) === -1) {
    return { inserted: 0, skipped: 0, reason: `不认识的 mode：${mode}` };
  }

  return seedPresets(ctx.db, mode);
};
