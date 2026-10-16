# 不要提交这些（公开仓库前的检查清单）

> **每次 `git push` 之前花 30 秒扫一眼这份清单。**
> 这份文件本身是要提交的 —— 它是给未来的你（和给 AI）看的提醒。

---

## 分类：什么能公开，什么不能

### ✅ 可以公开（无害）

| 项 | 为什么没事 |
|---|---|
| **AppID**（`wx6058ddb9d60b119e`） | 小程序 AppID 本身是公开信息（任何人查看你小程序的详情都能看到）。它不能用来调你的云资源 |
| 代码、文档、预置菜谱 | 就是开源出去的东西 |
| 界面文案、分类名 | 无敏感信息 |

### ⚠️ 建议不要在公开仓库里长留（不致命，但没必要）

| 项 | 风险 | 处理 |
|---|---|---|
| **云开发环境 ID**（`cloud1-...`） | 光有环境 ID 调不动你的云函数（还需要合法的小程序身份），但它是不必要的暴露面 | 文档里可以脱敏成 `cloud1-xxxxxxxx`，需要时自己查控制台 |
| **你的 openid / 她的 openid** | 明文 openid 属于个人信息 | **绝对不要**写进代码或文档。代码里已经全部走 `config` 集合，不要破坏这个约定 |

### 🔴 绝不提交

| 项 | 后果 | 现在在哪 |
|---|---|---|
| **企业微信机器人 webhook**（含 `key=`） | **任何人拿到它都能往你俩的群里发消息**（伪装成"今晚吃鱼"之类）。这是本项目唯一的真密钥 | 只存在**云数据库的 `config` 文档**里。代码里没有硬编码，也不要写进去 |
| 小程序的 AppSecret | 能冒充你的小程序调用微信接口 | 只在微信公众平台后台，代码里不需要它 |
| 你的 GitHub / 微信账号凭据 | — | 不要在文档里贴 token |

---

## 提交前自检（复制这段跑）

```powershell
Set-Location '点菜小程序'

# 1) 代码里有没有真实的企微 webhook（占位符 abcdef12-... 不算）
Get-ChildItem -Recurse -File -Include *.js,*.json,*.wxml,*.md |
  Where-Object { $_.FullName -notmatch '_versions|\.git\\' } |
  Select-String -Pattern 'qyapi\.weixin\.qq\.com' |
  Where-Object { $_.Line -notmatch 'abcdef12-3456-7890' }

# 2) 有没有明文 openid（形如 o + 27 位）
Get-ChildItem -Recurse -File -Include *.js,*.json,*.md |
  Where-Object { $_.FullName -notmatch '_versions|\.git\\' } |
  Select-String -Pattern '\bo[A-Za-z0-9_-]{27}\b'

# 3) 有没有本机绝对路径
Get-ChildItem -Recurse -File -Include *.js,*.json,*.md |
  Where-Object { $_.FullName -notmatch '_versions|\.git\\' } |
  Select-String -Pattern '[A-Z]:\\Users\\[^\\]+'

# 4) 确认这些文件没被 git 跟踪
git ls-files | Select-String -Pattern 'private\.config|_versions|node_modules'
```

**期望结果**：1、2、3、4 都**没有输出**。有输出就说明有东西要清理。

---

## 如果密钥泄露了怎么办

### 企微 webhook 泄露（最可能发生的情况）

**不用慌，也不能拖。** 处理方式：

1. 企业微信里**删掉那个群机器人**
2. 重新添加一个 → 拿到**新的 webhook 地址**
3. 把新地址填进云数据库：`config` 集合 → `app` 文档 → `notify.wecomWebhook`
   （或者小程序里：连点「我的」标题 5 次 → 设置 → 点菜通知 → 粘贴 → 发条测试消息）
4. 如果旧地址已经被 git 提交过：**改地址就够了**，不用重写 git 历史（重写历史很麻烦，而旧的 key 已经失效了）

### 已经 push 上去了才发现

```powershell
# 从仓库里删掉那个文件，但保留在工作区（如果它是本地才需要的）
git rm --cached 那个文件
git commit -m "chore: 移除不该提交的文件"
git push
```

⚠️ 注意：**从最新提交里删掉 ≠ 从历史里删掉**。git 历史里还能翻出来。
所以如果泄露的是真密钥，**核心动作永远是"去把那个密钥作废/重置"**，而不是折腾 git 历史。

---

## 本仓库的现状（v1.0.0 提交时）

- ✅ 代码里**没有**任何硬编码的密钥、openid、绝对路径
- ✅ webhook 只在云数据库里，代码零痕迹
- ⚠️ `HANDOFF.md` / `README.md` 里写了**真实 AppID** 和**真实云环境 ID**
  - 想彻底干净：把 `HANDOFF.md` §2 里的值改成 `wx...`（脱敏）和 `cloud1-xxxxxxxx`，需要时自己查控制台
  - 不想麻烦也可以保留：AppID 是公开信息，环境 ID 单独用不了
