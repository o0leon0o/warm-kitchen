# 交接文档（HANDOFF）

> **这份文档是写给你未来的 AI 助手看的。**
>
> 下次你想改这个项目，**把这份文件的全文粘给 AI**，然后说你想改什么。它看完这份文档就能直接动手，不用再问你一堆背景问题。
>
> 人类读者：你只需要维护最后一节的「怎么跟 AI 提需求」。

---

## 1. 这是什么项目

一个**双人自用**的微信小程序，给女朋友点菜用。

**核心闭环**：她点菜 → 企业微信群秒收到通知（你俩一起做饭，所以知道今晚吃什么）→ 照着菜谱做 → 做过的菜留下做法和你的复盘笔记。

**它不是外卖系统**：没有价格、没有支付、没有库存、没有配送、没有订单状态。

**用户只有两个人**（你 + 她），不做多用户、不做注册、不做社交。

---

## 2. 环境信息（改动时要用）

| 项 | 值 | 在哪 |
|---|---|---|
| 小程序 AppID | `wx6058ddb9d60b119e` | `project.config.json` → `appid` |
| 云开发环境 ID | `cloud1-d4gbr8gkwecbf15ab` | `miniprogram/app.js` → `CLOUD_ENV` |
| 云开发 env 命名 | 新版是 `cloud1-` 前缀（**不是**旧文档里的 `xcf-`） | — |
| 项目根目录 | `点菜小程序/` | 微信开发者工具导入的是**这一层**（不是 `miniprogram/`） |
| 云函数 | 只有 `login` 和 `api` 两个 | 上传时必须选**「云端安装依赖（不上传 node_modules）」** |
| 数据库集合 | `config` / `dishes` / `orders`，权限都设**「仅创建者可读写」** | 云开发控制台 |
| 通知 | 企业微信**群机器人** webhook | `config` 文档的 `notify.wecomWebhook` |

**身份绑定**（重要）：`config` 文档 `_id: 'app'` 的 `couple.meOpenid` / `couple.herOpenid`。
- 谁**先**打开小程序就被绑成 `me`（大厨，有管理权限），第二个人绑成 `her`，其他是 `guest`
- 绑定逻辑在 `cloudfunctions/api/actions/auth.whoami.js`（**不在** `login` 云函数里，见 §8 的坑 3）
- 两个人反了可以在设置页点「交换你俩的身份」

---

## 3. 文件清单（每个文件干什么）

```
点菜小程序/
├── HANDOFF.md              ← 本文件
├── CHANGELOG.md            版本记录（改完要追加一条）
├── SETUP.md                人类操作手册（注册→部署→发体验版，9 步）
├── README.md               项目说明与设计取舍
├── project.config.json     开发者工具配置（★ 含 AppID）
├── project.private.config.json  ← 开发者工具自动生成，见 §8 的坑 8
├── .gitignore
├── _versions/              版本封存快照（git 和打包都排除它）
│
├── cloudfunctions/
│   ├── login/index.js      首次打开时创建 config 文档 + 认领大厨（保留兜底，主流程已经不走它）
│   └── api/
│       ├── index.js        ★ 唯一入口：路由表 ROUTES + 鉴权 + 统一错误翻译
│       ├── lib/
│       │   ├── res.js          返回信封 ok()/fail()/badRequest()/bizError()
│       │   ├── db.js           集合名常量（**集合名只在这里写一次**）
│       │   ├── defaultConfig.js 默认配置 + normalizeConfig（缺字段不崩）
│       │   ├── dishUtil.js     菜品结构补全 / 按身份裁剪菜谱 / 洗菜谱入参
│       │   ├── presetData.js   ★ 预置数据的三种写入模式（missing/replace/onlyIfEmpty）
│       │   └── notify.js       企业微信推送（**换通知方式只改这一个文件**）
│       └── actions/         一个 action 一个文件，共 17 个（见 §5）
│
└── miniprogram/
    ├── app.js              ★ 云开发初始化 + 身份识别（CLOUD_ENV 在这里）
    ├── app.json            页面注册 / tabBar / 分包
    ├── app.wxss            全局 CSS 变量 + 原子类（.card .btn .tag .state .row…）
    ├── utils/
    │   ├── api.js          ★ 所有网络调用的唯一出口（页面禁止直接碰 wx.cloud）
    │   ├── cart.js         购物车（本地存储，12 小时自动作废）
    │   ├── theme.js        配色 + 文案兜底 + 二级分类兜底 + 分类滚动阈值
    │   └── format.js       日期、辣度标签、文案占位符替换
    │
    ├── pages/              【主包】她的高频路径，5 页
    │   ├── order/          点菜首页（搜索 + 分类 + 二级筛选 + 购物车浮条）
    │   ├── dish-detail/    菜品详情 + 菜谱精简版
    │   ├── order-success/  提交成功 + 庆祝动画
    │   ├── orders/         历史订单 + 再来一次
    │   └── profile/        我的（★ 连点标题 5 次解锁管理入口）
    │
    └── package-chef/       【分包】你 / 厨房用，6 页
        └── pages/
            ├── cook/         做菜模式（一屏清单 ⇄ 一步一屏 + 屏幕常亮）
            ├── recipes/      我的菜谱库
            ├── dish-edit/    菜品 + 菜谱编辑
            ├── dish-manage/  菜品管理（上下架/♥/删除）
            ├── order-manage/ 所有订单 + 通知状态
            └── settings/     文案/昵称/通知/分类/预置数据/换身份
```

---

## 4. 数据模型（字段名必须一字不差）

### 4.1 `config`（单文档，`_id: 'app'`）

```jsonc
{
  "_id": "app",
  "couple": {
    "meOpenid": "oXXXX",      // 大厨的 openid（有管理权限）
    "meName": "大厨",
    "herOpenid": "oYYYY",     // 她的 openid
    "herName": "宝宝",         // ★ 界面和通知里显示她的名字
    "anniversary": ""
  },
  "ui": {                      // 界面文案，改了不用重传代码
    "appTitle": "小厨房",
    "emptyMenuText": "菜单还在准备中～",
    "successTitle": "今晚有口福啦 ❤",
    "successSubtitle": "我们马上开火 🔥",
    "orderButton": "就吃这些",
    "cartBarCount": "已选 {n} 道菜",
    "remarkPlaceholder": "想说的话（可不写）：比如少放辣～"
  },
  "notify": {
    "wecomWebhook": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...",
    "enabled": true,
    "atMobiles": []
  },
  "categories": [              // 一级分类，5 个
    { "key": "main",    "name": "主菜", "icon": "🍗", "enabled": true },
    { "key": "veg",     "name": "素菜", "icon": "🥗", "enabled": true },
    { "key": "soup",    "name": "汤",   "icon": "🍲", "enabled": true },
    { "key": "staple",  "name": "主食", "icon": "🍜", "enabled": true },
    { "key": "dessert", "name": "甜品", "icon": "🍰", "enabled": true }
  ],
  "subCategories": [           // 主菜的二级筛选，7 个
    { "key": "pork",    "name": "猪肉", "icon": "🐷" },
    { "key": "beef",    "name": "牛肉", "icon": "🐮" },
    { "key": "lamb",    "name": "羊肉", "icon": "🐑" },
    { "key": "chicken", "name": "鸡肉", "icon": "🐔" },
    { "key": "fish",    "name": "鱼虾", "icon": "🦐" },
    { "key": "egg",     "name": "蛋类", "icon": "🥚" },
    { "key": "other",   "name": "其他", "icon": "🍽" }
  ],
  "seeded": true, "seededAt": "<Date>",
  "createdAt": "<Date>", "updatedAt": "<Date>"
}
```

**关键约定**：
- 一级分类的 `key` 是**自由字符串**，菜品用 `category` 引用它；引用了不存在的分类会进"其他"兜底分组
- 二级分类**只对 `category === 'main'` 有效**，其他分类的菜 `subCategory` 一律空字符串
- 图标是 emoji 字符串，**挑主流 emoji**（生僻的在某些机型会渲染成方块，项目早期 `🥣` 就踩过）
- `subCategories` 的顺序 = 界面按钮顺序，**故意不按菜品数量动态排序**（否则点一下按钮就跳位置）
- **`couple.*` 只有 `herName` / `meName` 允许通过 `config.save` 改，openid 绝对不能开放**（改了会毁掉权限绑定）

### 4.2 `dishes`

```jsonc
{
  "_id": "auto",
  "name": "可乐鸡翅",
  "category": "main",           // 对应 config.categories[].key
  "subCategory": "chicken",     // 只有主菜有值，其余为空字符串
  "intro": "甜口的，比红烧省事",  // 卡片上的那句话
  "coverImage": "",             // 预留，目前没有上传入口也没展示
  "tags": ["甜口", "30分钟"],
  "herFavorite": true,          // 「她爱吃♥」→ 列表置顶 + 心形标记
  "avoid": ["花生"],            // 忌口提醒
  "spicy": 0,                   // 0不辣 1微辣 2中辣 3重辣
  "enabled": true,              // 上架/下架；dish.list 只返回 true 的
  "cookCount": 0,               // 下单时 +1（"做过几次"）
  "lastCookedAt": "<Date>",
  "sortOrder": 100,             // 手动权重，越小越靠前
  "recipe": {
    "ingredients": [{ "name": "鸡中翅", "amount": "8 只" }],
    "steps": [
      { "text": "...", "image": "", "done": false, "doneAt": null }
      //                          ↑ 做菜模式的勾选状态，两人共享
    ],
    "tips": ["要收汁到浓稠"],
    "sourceUrl": "",            // 你抄的攻略链接
    "sourceTitle": "",
    "note": "",                 // ★ 复盘笔记：只有 me 能看到（stripForRole 会清空）
    "updatedAt": "<Date>"
  },
  "createdAt": "<Date>", "updatedAt": "<Date>"
}
```

**排序规则**（`actions/dish.list.js`）：`herFavorite` 降序 → `sortOrder` 升序 → `cookCount` 降序 → `createdAt` 升序。

### 4.3 `orders`

```jsonc
{
  "_id": "auto",
  "openid": "oXXXX",
  "userRole": "girlfriend",   // ★ 'girlfriend' | 'me' | 'guest'，通知里按它取名字
  "items": [{ "dishId": "abc", "name": "可乐鸡翅", "category": "main", "coverImage": "" }],
  "remark": "少放辣～",
  "mealDate": "2026-10-16",   // 北京时间（代码里手动 +8 小时算的）
  "createdAt": "<Date>",
  "notifyStatus": "sent",     // pending | sent | failed | skipped
  "notifyError": ""
}
```

**两个刻意的设计**：
- **没有 `status` 字段** —— 不做订单状态（你俩一起做饭，不需要"接单/已完成"）
- **`items` 存菜名快照** —— 以后删了下架的菜，历史订单依然完整可读

### 4.4 本地存储（不是集合）

| key | 内容 |
|---|---|
| `cart` | `{ items: [{dishId, name, category, coverImage}], remarkDraft, savedAt }`，**超过 12 小时自动清空**，提交成功后清空 |
| `adminUnlocked` | 管理入口是否已解锁（连点标题 5 次写入） |

---

## 5. 云函数接口清单（17 个 action）

全部通过 `wx.cloud.callFunction({ name: 'api', data: { action, payload } })` 调用。
**返回信封**：成功 `{ ok: true, data }`，失败 `{ ok: false, code, msg }`。

| action | scope | 作用 | 入参 → 出参要点 |
|---|---|---|---|
| `auth.whoami` | `bind` | 我是谁 + 界面配置；**首次会顺带绑定 openid** | `{}` → `{openid, role, isAdmin, roleLabel, meName, herName, config}` |
| `dish.list` | `read` | 菜单（按分类分组、排序、只返回上架的） | `{}` → `{categories:[{key,name,icon,count,dishes[]}], total}` |
| `dish.detail` | `read` | 单道菜；**她看不到 `recipe.note`** | `{dishId}` → 完整菜品 |
| `order.create` | `user` | 下单：校验菜品 → 落库 → cookCount+1 → 推送 | `{items:[{dishId}], remark}` → `{orderId, items, skipped, notify}` |
| `order.mine` | `user` | 自己点过的单 | `{limit}` → `{orders}` |
| `recipe.step.done` | `user` | 勾选/取消某一步（做菜模式） | `{dishId, stepOrder, done}` → `{progress}` |
| `recipe.note.save` | `user` | 存复盘笔记 | `{dishId, note}` |
| `dish.save` | `admin` | 新增/编辑菜品与菜谱 | 见 `dishUtil.buildRecipe`；**不传 `recipe` 就不动菜谱** |
| `dish.toggle` | `admin` | 快捷开关 | `{dishId, field:'enabled'\|'herFavorite', value}` |
| `dish.remove` | `admin` | 删除菜品（被点过的要 `force:true`） | `{dishId, force}` |
| `order.listAll` | `admin` | **所有**订单 + 通知状态（含 `who` 字段） | `{limit}` |
| `order.remove` | `admin` | 删订单记录 | `{orderId}` |
| `config.save` | `admin` | 改文案/通知/分类/细分/昵称 | `{patch: {'ui.successTitle':'...'}}` 点号路径 |
| `notify.test` | `admin` | 测推送（**webhook 不下发前端**） | `{test:true, overrideWebhook}` |
| `auth.reassign` | `admin` | 交换你俩身份 | `{swap:true}`（必须显式传） |
| `migrate` | `admin` | 旧分类→新分类 + 补缺失细分 | `{dryRun:true}` 先预览 |
| `initData` | `any`（handler 内部再校验） | 灌预置菜品 | `{mode:'missing'\|'replace'\|'onlyIfEmpty', confirm}` |

**scope 含义**（在 `api/index.js` 的 `ROUTES` 里）：
`read` 谁都能调 / `bind` 同 read 但允许补写自己的 openid / `user` 需要是 me 或 her / `admin` 只有 me / `any` 不校验（handler 自己管）

**加新 action 的步骤**（3 步，别漏第 2 步）：
1. 在 `actions/` 新建 `xxx.yyy.js`，导出 `async function(ctx)`，返回要下发的数据（或 throw `badRequest()` / `bizError()`）
2. **在 `api/index.js` 的 `ROUTES` 里加一行**（漏了就会报"不认识的 action"）
3. 前端在 `utils/api.js` 里 `api.call('xxx.yyy', {...})` 调用；**页面禁止直接 `wx.cloud`**

---

## 6. 前端约定

### 页面结构
每个页面 4 个文件：`.js` / `.wxml` / `.wxss` / `.json`。新增页面要**同时**加到 `app.json` 的 `pages` 或 `subPackages`。

### 分包归属
- `pages/` 主包 = **她**的高频路径（点菜、详情、庆祝、历史、我的）
- `package-chef/` 分包 = **你 / 厨房**用（做菜、菜谱、编辑、管理、订单、设置）

### 数据流（重要）
```
页面 → utils/api.js 的 call() → wx.cloud.callFunction('api') → 云函数路由 → action → 数据库
```
- **页面里不允许出现 `wx.cloud.callFunction` 或 `wx.cloud.database()`**
- 「云是否就绪」的状态存在 `api.js` 的**模块变量**里，由 `app.js` 调 `api.init(env)` 写入（**不要改成 `getApp()` 判断，见 §8 坑 2**）
- 身份缓存：`app.js` 启动时拿到后调 `api.setUser(user)`，页面用 `api.getUser()` 读

### 样式
- 颜色统一走 `app.wxss` 的 CSS 变量（`var(--c-primary)` 等），主题值在 `utils/theme.js`
- 通用类：`.card` `.btn` `.btn-primary` `.btn-ghost` `.tag` `.state` `.row` `.col` `.flex-1` `.ellipsis` `.hairline`
- **不引入任何第三方组件库**（Vant 等一律没有）；`miniprogram_npm` 是空的，也不需要「构建 npm」

### 文案
界面文案**优先从云端读** `config.ui.*`（`applyIdentity()` 里合并），代码里的值是兜底。
想加一句可配置文案：`defaultConfig.js` 的 `ui` 里加字段 → 相关页面 `copy` 兜底里也加一份 → 页面用 `{{copy.xxx}}`。

---

## 7. 代码里的硬性约定（改代码必须遵守）

这些不是风格偏好，是**踩过坑之后定的规矩**：

1. **WXML 表达式里禁止调用方法**
   不支持 `.indexOf()` `.find()` `.map()` 等，会被静默当成 `undefined`（不报错！）。
   需要判断就**在 JS 里预计算成布尔字段**，WXML 只读字段。
   → 现有例子：`item.selected`（点菜页）、`item.on`（编辑页标签）、`item.have`（二级筛选）

2. **集合名只在 `lib/db.js` 写一次**，其他地方引用 `collections.xxx`

3. **云函数返回必须用信封**：`ok(data)` / `fail(code,msg)`；
   参数错误用 `throw badRequest('人话')`，业务错误用 `throw bizError('人话', 'CODE')`

4. **通知失败绝不能影响下单**
   `order.create` 的顺序是：校验 → **订单落库** → `cookCount+1` → 推送 → 回写 `notifyStatus`。
   推送失败只记录状态，订单照常成功。

5. **`notify.js` 是唯一碰"怎么发通知"的文件**
   换通道（Server酱/Bark/订阅消息）只改这一个文件，`order.create` 不用动。

6. **环境 ID / AppID 只出现一处**
   `app.js` 的 `CLOUD_ENV`、`project.config.json` 的 `appid`。其他任何地方都不许再写死。

7. **不硬编码 openid**，一律走 `config.couple.*` + 自动绑定

8. **菜谱的 `note`（复盘笔记）不能下发给她**
   在 `lib/dishUtil.js` 的 `stripForRole()` 里按身份清空。新增下发菜谱的接口时记得也过一遍这个函数。

9. **改共享函数前先看调用方**
   `seedPresets` / `buildRecipe` / `normalizeDish` / `stripForRole` 都有多个调用方，改返回值结构要同步改前端。

---

## 8. 已知的坑与"绝对不要踩"的清单

| # | 坑 | 后果 | 正确做法 |
|---|---|---|---|
| 1 | WXML 里写方法调用 | 静默失效，不报错 | 见 §7.1 |
| 2 | 用 `getApp()` 判断云是否就绪 | `onLaunch` 阶段 `getApp()` 可能返回 undefined → 所有云调用被拦死 | 用 `api.js` 的模块变量 + `api.init(env)` |
| 3 | 把身份绑定写在没被调用的函数里 | 绑定永远不生效，所有人都显示"访客" | 绑定必须在**启动时真会被调用的那个 action** 里（现在是 `auth.whoami`） |
| 4 | 前端 action 名和 `ROUTES` 不一致 | 报"不认识的 action" | 加 action 时两边一起写，改完跑一遍 §10 的自检脚本 |
| 5 | 数据初始化"非空就整体跳过" | 用户点按钮什么都没发生，且看不出原因 | 用 `missing` 模式（只补缺的）；**让用户能看见"为什么没变化"** |
| 6 | 只在 `onLoad` 拉数据 | 从别的页面回来数据是旧的 | 列表页在 `onShow` 也刷新 |
| 7 | `.gitignore` 漏了 `project.private.config.json` | 每台机器的本地配置混进版本库 | 已忽略（见 `.gitignore`） |
| 8 | 用 `wx.cloud.init({env})` 后忘了兜底 | 环境 ID 写错时整机全挂 | `app.js` 里已有 try/catch + 不带 env 的兜底 init |
| 9 | 生僻 emoji 做图标 | 某些机型渲染成方块 | 只用主流 emoji |
| 10 | 手写 JSON 改数据库数组字段 | 少个引号整条记录废掉 | 一律用小程序里的管理页改；批量改动写成云函数（参考 `migrate.js`）。**这条是因为用户明确要求"用 AI 帮我录入"而定的** |
| 11 | PowerShell 读 UTF-8 文件 | 中文被按 GBK 解码，会误报 JSON 语法错误 | 校验脚本用 Node 跑（见 §10），别信 PowerShell 的 JSON 校验结果 |
| 12 | 云函数改了不重传 | 云端跑的还是旧代码，现象诡异 | 见 §9 部署清单 |

---

## 9. 改完之后要做什么（部署清单）

**改了云函数**（`cloudfunctions/**`）：
```
微信开发者工具 → 右键 cloudfunctions/api
  → 「上传并部署：云端安装依赖（不上传 node_modules）」
```
⚠️ **必须选带「云端安装依赖」的那一项**，选"所有文件"会报 `Cannot find module 'wx-server-sdk'`。

**只改了小程序**（`miniprogram/**`）：
```
点工具栏「编译」（或 Ctrl+B）
```

**改了 `config` 的数据结构 / 增加了新字段**：
需要写一个迁移动作（参考 `actions/migrate.js` 的 `missingSubs` 那段）**或者**在设置页加个按钮。
⚠️ 不要指望 `initData` 帮你改已有数据 —— 它默认只补**缺失的整条菜**。

**改了 `app.js` 的 `CLOUD_ENV`**：必须重新「编译」才生效（热更新不会重跑 `onLaunch` 的初始化）。

**发新版给她**：
```
开发者工具右上角「上传」→ 填版本号 → mp.weixin.qq.com → 版本管理 → 选为体验版
（她已经加过体验成员，不用再加）
```

---

## 10. 验证自检脚本（改完代码跑一遍）

项目里没有测试框架，用这三个 Node 脚本代替（**不要用 PowerShell 校验 JSON，中文会误报**）：

```powershell
# 1) 全项目 JS 语法 + JSON 语法（UTF-8）
node -e "
const fs=require('fs'),path=require('path'),vm=require('vm');
let bad=0,n=0;
for(const f of fs.readdirSync('点菜小程序',{recursive:true}).filter(f=>f.endsWith('.js'))){
  n++; try{ new vm.Script(fs.readFileSync(path.join('点菜小程序',f),'utf8'),{filename:f}); }
  catch(e){ bad++; console.log('SYNTAX '+f+' -> '+e.message); }
}
console.log('JS '+n+' 个, 语法错误 '+bad);
let jb=0,jn=0;
for(const f of fs.readdirSync('点菜小程序',{recursive:true}).filter(f=>f.endsWith('.json'))){
  jn++; try{ JSON.parse(fs.readFileSync(path.join('点菜小程序',f),'utf8')); }
  catch(e){ jb++; console.log('JSON '+f+' -> '+e.message); }
}
console.log('JSON '+jn+' 个, 错误 '+jb);
"
```

```powershell
# 2) WXML 里有没有方法调用（坑 1，必须恒为 0）
node -e "
const fs=require('fs'),path=require('path');
const root='点菜小程序/miniprogram'; let n=0;
for(const f of fs.readdirSync(root,{recursive:true}).filter(f=>f.endsWith('.wxml'))){
  fs.readFileSync(path.join(root,f),'utf8').split(/\r?\n/).forEach((l,i)=>{
    if(/\{\{[^}]*\.\s*(indexOf|find|filter|map|some|every|includes|reduce|join|slice|concat|sort|trim|split|replace|toFixed|push)\s*\(/.test(l)){
      n++; console.log('  '+f+':'+(i+1)+'  '+l.trim());
    }
  });
}
console.log('WXML 方法调用: '+n+' 处（必须为 0）');
"
```

```powershell
# 3) 前端调用的 action 是否都有路由
node -e "
const fs=require('fs'),path=require('path');
const idx=fs.readFileSync('点菜小程序/cloudfunctions/api/index.js','utf8');
const declared=new Set([...idx.matchAll(/^\s*'([\w.]+)':\s*\{/gm)].map(m=>m[1]));
const root='点菜小程序/miniprogram'; const used=new Set();
for(const f of fs.readdirSync(root,{recursive:true}).filter(f=>f.endsWith('.js'))){
  for(const m of fs.readFileSync(path.join(root,f),'utf8').matchAll(/\.call\(\s*'([\w.]+)'/g)) used.add(m[1]);
}
let miss=0;
for(const a of [...used].sort()){ if(!declared.has(a)){ miss++; console.log('  缺路由: '+a); } }
console.log('前端用 '+used.size+' 个 action, 缺路由 '+miss);
"
```

**还有两件运行时验证（脚本查不出来）**：
- 在模拟器里**点一遍**：选菜（圆圈变色）→ 展开购物车 → 删一个 → 提交
- 看**企业微信群有没有收到消息**

---

## 11. 用户的使用习惯（改东西前先知道这些）

- 用户**没写过前端**，所以：代码要**注释写清楚**、改动要**小步**、每一步告诉他"现在去点什么按钮能看到效果"
- 用户**很在意成本**，云开发每月约 20 元他提过异议（当前选择继续用）。**如果有零成本替代方案值得提，但要先核实真实价格，不要凭记忆**
- 用户**嫌手动改数据库麻烦**，明确说过"让 AI 帮我录入" —— 所以**批量数据改动优先写成云函数 + 小程序按钮**，不要让他手写 JSON
- 用户会**仔细看界面**（他自己发现了"圆圈不变色""分类不够好""来一份羊肉"），所以界面改动要**考虑视觉细节**，并且**别留静默失效的东西**
- 用户是**和女朋友一起做饭的两个人**，所以：不要做"接单/配送/支付"这类单人商家的功能

---

## 12. 已知限制 / 没做的功能

**设计上故意不做**（别当 bug 修）：
- 订单状态、接单、完成标记 —— 你俩一起做饭，不需要
- 份量（×2 ×3）—— 点一份，两人份靠手感
- 价格、支付、库存、配送

**确实还没做（可以提议）**：
- 「今天吃什么」随机推荐（转盘/翻牌）—— 原计划 M2 的亮点
- 成品图和每步配图 —— 字段 `coverImage` / `step.image` 已预留，但**没有上传入口，界面也没展示**
- 订阅消息（作为企业微信的备选通知通道）
- 积分 / 纪念日 / 心情打卡 / 心愿单
- 多天菜单规划（"这周的菜"）
- 食材清单汇总（点完菜生成"要买什么"）

---

## 13. 版本管理怎么用

```
每改完一版：
1. CHANGELOG.md 追加一条（含"要做什么才能生效"）
2. 打一个快照包：
   New-Item -ItemType Directory -Force -Path _versions\1.0.1
   Copy-Item 项目文件 → _versions\1.0.1\（排除 _versions 和 node_modules）
   Compress-Archive → _versions\xiaochufang-1.0.1.zip
   Get-FileHash -Algorithm SHA256 → 写进同名 .sha256 文件
3. （可选）git add -A; git commit -m "v1.0.1: ..."   —— 仓库已初始化，本地提交不需要联网
```

**当前快照**：`_versions/xiaochufang-1.0.0.zip`（130 KB）
SHA256：`A4C7B3BEC2090B93F085E5ACC1724C700EBA2E9046FEEB5BF67C6DECE6EBB056`

**回滚方法**：解压对应的 zip → 用微信开发者工具重新导入 → **重传云函数 + 重编译**。
⚠️ 回滚**代码**不会回滚**数据库**（菜、订单、config 都还在）。如果新版改过数据结构，回滚代码前要先确认旧代码能读新数据（不能的话也要回滚数据，或者在 CHANGELOG 里写清楚）。

---

## 14. 人类：怎么跟 AI 提需求（这一节是给你看的）

**最省事的方式**：把这份 `HANDOFF.md` **全文**粘进对话，然后加一句你想改的东西。

```
【粘贴 HANDOFF.md 全文】

我想改：点菜页加一个"今天吃什么"的随机按钮，点一下从全部菜单里
随机转出一个菜，她可以选"就这个"或者"换一个"。

要求：按文档里的约定来，改完告诉我需要重传哪些东西。
```

**为什么必须粘全文**：AI 没有记忆。不粘的话它会：
- 自己在 WXML 里写 `indexOf`（坑 1，静默失效）
- 用 `getApp()` 判断云就绪（坑 2，整机全挂）
- 加 action 但忘了改 `ROUTES`（坑 4）
- 改完不告诉你"要重传云函数"

§7 / §8 / §9 就是为了堵这些。**粘全文的成本是几千 token，省掉的是你半天的排查。**

**更省 token 的替代方案**（如果你已经熟悉这个项目）：
只粘 §2（环境）+ §7（硬性约定）+ §8（坑清单）+ §9（部署清单）+ §5（接口清单）这几节。

**提需求时最好带上这三件事**：
1. **改哪里**（哪个页面 / 哪个功能）
2. **想要什么效果**（越具体越好，最好说说"她看到什么、我看到什么"）
3. **要不要保留旧数据**（涉及数据结构的改动必须说，不然可能把菜改乱）

**改完之后你自己要做的**（AI 应该在回答里明确告诉你，但你可以主动确认）：
- [ ] 要不要重传云函数？
- [ ] 要不要重编译？
- [ ] 要不要在设置页点某个按钮（迁移 / 补齐数据）？
- [ ] 要不要改数据库里的某个字段？

---

*文档版本：v1.0.0（2026-10-16）· 与代码同版本*
