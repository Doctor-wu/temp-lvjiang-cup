# 安全加固方案A — 开发设计文档

> **文档版本**: v1.0  
> **创建日期**: 2026-04-24  
> **关联文档**: [安全风险分析与解决方案.md](../安全风险分析与解决方案)  
> **状态**: 待审核  
> **优先级**: P0 (紧急)

---

## 📋 目录

1. [概述](#1-概述)
2. [技术方案](#2-技术方案)
3. [前端改动设计](#3-前端改动设计)
4. [后端改动设计](#4-后端改动设计)
5. [部署配置变更](#5-部署配置变更)
6. [测试策略](#6-测试策略)
7. [开发计划](#7-开发计划)
8. [验收标准](#8-验收标准)
9. [回滚方案](#9-回滚方案)

---

## 1. 概述

### 1.1 问题背景

当前驴酱杯赛事网站存在以下安全风险：

| 风险项 | 严重等级 | 说明 |
|--------|---------|------|
| 管理入口暴露 | 严重 | 主页面右上角有"管理"按钮，任何人可见 |
| Swagger 文档暴露 | 高危 | 生产环境可通过 `/api/docs` 查看完整 API |
| 管理端点无 IP 限制 | 中危 | 任何人可尝试访问管理 API |
| 管理路径可预测 | 中危 | `/admin/*` 路径规律明显 |

### 1.2 产品目标

在不改变现有架构的前提下，**快速降低安全风险**，为后续方案B（前后端分离）争取时间。

**核心原则：**
- 不影响游客的正常浏览体验
- 不影响管理员的现有操作习惯（路径可配置）
- 改动最小化，快速部署上线
- 向后兼容，支持回滚

### 1.3 关键设计决策

#### 决策 1：隐藏管理入口 ✅

**方案：** 移除主页面顶部的"管理"链接，管理员通过键盘快捷键或直接访问隐藏路径进入

**理由：**
- 实现简单，仅修改一个组件
- 不改变登录页本身的功能
- 管理员仍可通过快捷键进入

#### 决策 2：生产环境禁用 Swagger ✅

**方案：** 仅在 `NODE_ENV !== 'production'` 时启用 Swagger

**理由：**
- Swagger 文档是开发调试工具，不应暴露给生产环境
- 1 行代码改动，零风险

#### 决策 3：管理路径动态化 ✅

**方案：** 通过环境变量控制管理路由前缀，默认保持 `admin`

**理由：**
- 无需大规模重构
- 默认值保持兼容，不影响现有部署
- 需要隐藏时可配置为随机字符串

#### 决策 4：NPM 层 IP 白名单 ✅

**方案：** 移除后端 IP 白名单守卫，改为在 Nginx Proxy Manager 的 Advanced 配置中通过 `location` 块添加 `allow/deny` 指令

**理由：**
- NPM 原生支持自定义 location 块和 Nginx 指令
- 在网关层做访问控制更高效，无需经过应用层
- 避免 NestJS 在代理场景下获取真实 IP 的复杂性
- 后端代码更简洁，减少不必要的守卫逻辑
- NPM 修改后可立即生效，无需重新构建或重启后端容器

---

## 2. 技术方案

### 2.1 改动范围总览

| 层级 | 改动文件数 | 新增文件数 | 说明 |
|------|-----------|-----------|------|
| **前端** | 4 | 1 | 隐藏管理入口 + 路由前缀动态化 |
| **后端** | 1 | 0 | 禁用 Swagger |
| **NPM 配置** | 0 | 1 | NPM Advanced 配置文档 |
| **配置** | 2 | 0 | 环境变量更新 |
| **文档** | 1 | 1 | 本文档 |
| **合计** | **8** | **3** | |

### 2.2 环境变量清单

以下环境变量为本次新增，均为**可选**，不配置时保持现有行为：

| 变量名 | 类型 | 默认值 | 说明 | 适用环境 |
|--------|------|--------|------|---------|
| `ENABLE_SWAGGER` | boolean | `true` | 是否启用 Swagger 文档 | 后端 |
| `VITE_ADMIN_ROUTE_PREFIX` | string | `"admin"` | 前端管理路由前缀 | 前端 |

### 2.3 技术选型

| 技术点 | 方案 | 理由 |
|--------|------|------|
| **前端路由前缀** | Vite 环境变量 `import.meta.env` | 构建时注入，运行时零开销 |
| **NPM IP 白名单** | Nginx `allow/deny` 指令 | 在网关层拦截，高效且无需修改后端代码 |
| **快捷键方案** | `Ctrl+Shift+A` | 常见开发工具快捷键，不易误触 |

---

## 3. 前端改动设计

### 3.1 任务 A1: 隐藏管理入口

#### 3.1.1 修改文件

[Layout.tsx](file:///d:/File/workSpace/AI-test/lvjiang-cup-test/frontend/src/components/layout/Layout.tsx#L184-L197)

#### 3.1.2 改动方案

**修改前：**
```tsx
{/* 右侧管理入口 */}
<Link
  to="/admin/login"
  className="group flex items-center space-x-2 ..."
>
  <span>管理</span>
  <svg ... />
</Link>
```

**修改后：**
```tsx
{/* 右侧区域 - 已移除管理入口链接 */}
<div className="w-[120px]" /> {/* 占位，保持布局平衡 */}
```

#### 3.1.3 快捷键访问方案

在 `Layout.tsx` 中添加键盘快捷键监听：

```tsx
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Ctrl+Shift+A 打开管理后台登录页
    if (event.ctrlKey && event.shiftKey && event.key === 'A') {
      event.preventDefault();
      window.location.href = `/${adminPrefix}/login`;
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [adminPrefix]);
```

**快捷键说明：**
- 组合键：`Ctrl+Shift+A`（Admin）
- 仅在游客页面生效，管理后台页面不监听
- 按下后直接跳转到管理登录页

#### 3.1.4 影响范围

| 影响项 | 说明 |
|--------|------|
| 游客体验 | 无影响，游客看不到管理入口 |
| 管理员操作 | 需使用快捷键或直接输入 URL |
| 响应式布局 | PC 端右侧占位元素保持布局平衡，移动端不受影响 |

---

### 3.2 任务 A5: 前端路由混淆

#### 3.2.1 修改文件

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `.env.development` | 新增 | 添加 `VITE_ADMIN_ROUTE_PREFIX=admin` |
| `src/App.tsx` | 修改 | 路由路径改为动态前缀 |
| `src/router/index.tsx` | 修改 | 路由路径改为动态前缀 |
| `src/components/layout/Layout.tsx` | 修改 | 快捷键路径使用动态前缀 |

#### 3.2.2 环境变量配置

```env
# frontend/.env.development
VITE_ADMIN_ROUTE_PREFIX=admin

# frontend/.env.production
VITE_ADMIN_ROUTE_PREFIX=admin
# 生产环境可改为: VITE_ADMIN_ROUTE_PREFIX=system-console-8f3a
```

#### 3.2.3 App.tsx 改动

**修改前：**
```tsx
<Route path="/admin/login" element={<AdminLogin />} />
<Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
// ... 其他 /admin/* 路由
```

**修改后：**
```tsx
const ADMIN_PREFIX = import.meta.env.VITE_ADMIN_ROUTE_PREFIX || 'admin';

<Route path={`/${ADMIN_PREFIX}/login`} element={<AdminLogin />} />
<Route path={`/${ADMIN_PREFIX}/dashboard`} element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
// ... 其他路由同理
```

#### 3.2.4 router/index.tsx 改动

与 `App.tsx` 相同的改动模式，所有硬编码的 `/admin/` 路径替换为 `/${ADMIN_PREFIX}/`。

#### 3.2.5 路由前缀一致性校验

由于 `App.tsx` 和 `router/index.tsx` 都定义了路由，需要确保两者使用相同的前缀常量。

**方案：** 提取公共常量到独立文件：

```typescript
// src/constants/routes.ts
export const ADMIN_PREFIX = import.meta.env.VITE_ADMIN_ROUTE_PREFIX || 'admin';

/**
 * 构建管理路由路径
 */
export function adminPath(path: string): string {
  return `/${ADMIN_PREFIX}/${path}`;
}
```

然后在两个路由文件中引用：

```tsx
import { ADMIN_PREFIX, adminPath } from '../constants/routes';

<Route path={adminPath('login')} element={<AdminLogin />} />
<Route path={adminPath('dashboard')} element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
```

#### 3.2.6 需要注意的硬编码路径

除了路由定义外，还需检查以下文件中的 `/admin/` 硬编码引用：

| 文件 | 路径引用 | 是否需要修改 |
|------|---------|-------------|
| `src/components/layout/Layout.tsx` | 快捷键跳转 URL | ✅ 是 |
| `src/components/layout/AdminLayout.tsx` | `to="/"` (返回网站) | ❌ 否（指向首页） |
| `src/hooks/useAuth.ts` | `navigate('/admin/login')` | ✅ 是 |
| `src/hooks/useAuth.ts` | `navigate('/admin/dashboard')` | ✅ 是 |
| `src/api/auth.ts` | `window.location.href = '/admin/login'` | ✅ 是 |
| `src/pages/admin/Dashboard.tsx` | `navigate('/admin/matches')` | ✅ 是 |
| `src/pages/admin/Dashboard.tsx` | `window.location.href = '/admin/stream'` | ✅ 是 |
| 其他 admin 页面 | 各种 navigate/window.location 调用 | ✅ 是 |

---

### 3.3 前端改动文件清单

| # | 文件路径 | 操作 | 改动行数(估) |
|---|---------|------|-------------|
| 1 | `src/constants/routes.ts` | 新建 | ~15 |
| 2 | `src/components/layout/Layout.tsx` | 修改 | ~20 |
| 3 | `src/App.tsx` | 修改 | ~25 |
| 4 | `src/router/index.tsx` | 修改 | ~20 |
| 5 | `src/hooks/useAuth.ts` | 修改 | ~10 |
| 6 | `src/api/auth.ts` | 修改 | ~5 |
| 7 | `src/pages/admin/Dashboard.tsx` | 修改 | ~15 |
| 8 | `.env.development` | 修改 | +2 |
| 9 | `.env.production` (如存在) | 修改 | +2 |

**前端改动小计: ~114 行代码，8 个文件**

---

## 4. 后端改动设计

### 4.1 任务 A2: 禁用生产环境 Swagger

#### 4.1.1 修改文件

[main.ts](file:///d:/File/workSpace/AI-test/lvjiang-cup-test/backend/src/main.ts#L130-L137)

#### 4.1.2 改动方案

**修改前：**
```typescript
const config = new DocumentBuilder()
  .setTitle('驴酱杯赛事 API')
  .setDescription('驴酱杯LOL娱乐赛事网站后端 API 文档')
  .setVersion('1.0')
  .addBearerAuth()
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);

const port = parseInt(process.env.PORT!, 10);
await app.listen(port, '0.0.0.0');
logger.log(`应用启动于 http://0.0.0.0:${port}/api`);
logger.log(`Swagger 文档地址：http://0.0.0.0:${port}/api/docs`);
```

**修改后：**
```typescript
const enableSwagger = process.env.ENABLE_SWAGGER === 'true';

if (enableSwagger) {
  const config = new DocumentBuilder()
    .setTitle('驴酱杯赛事 API')
    .setDescription('驴酱杯LOL娱乐赛事网站后端 API 文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  logger.log(`Swagger 文档地址：http://0.0.0.0:${port}/api/docs`);
} else {
  logger.log('Swagger 文档已禁用 (默认关闭，设置 ENABLE_SWAGGER=true 启用)');
}
```

#### 4.1.3 环境变量行为

| `ENABLE_SWAGGER` | `NODE_ENV` | 结果 |
|-----------------|-----------|------|
| 未设置 | development | ❌ 禁用 (默认关闭) |
| 未设置 | production | ❌ 禁用 (默认关闭) |
| `"true"` | 任意 | ✅ 启用 |
| `"false"` | 任意 | ❌ 禁用 |

**推荐配置：**
```env
# backend/.env.development
ENABLE_SWAGGER=true

# backend/.env.production (不设置或设为 false)
# ENABLE_SWAGGER=false
```

#### 4.1.4 影响范围

| 影响项 | 说明 |
|--------|------|
| 开发环境 | 无影响，Swagger 继续可用 |
| 生产环境 | Swagger 文档不再可访问，但 API 功能完全不受影响 |
| 已有调用 | 无影响，所有 API 端点保持不变 |

---

### 4.2 任务 A4: NPM 层 IP 白名单

#### 4.2.1 方案概述

不修改后端代码，改为在 **Nginx Proxy Manager (NPM)** 中通过 Advanced 配置添加自定义 `location` 块，利用 Nginx 原生的 `allow/deny` 指令实现路径级别的 IP 白名单。

**优势：**
- 无需修改后端代码
- 修改后立即生效，无需重新构建或重启后端容器
- 在网关层拦截，效率更高（请求不经过后端即被拒绝）
- NPM 提供 Web UI，配置直观
- 兼容代理场景，Nginx 原生支持 `X-Real-IP` 和 `X-Forwarded-For`

#### 4.2.2 NPM 配置方案

登录 NPM Web UI (`http://服务器IP:8181`)，找到代理后端 API 的 Proxy Host，在 **Advanced** 选项卡中添加以下配置。

**重要：**
1. 需要与现有的 `/api` location 配置融合
2. **登录接口必须单独放行**，否则管理员无法登录（`/api/admin/auth/login` 位于 `/api/admin/` 路径下，会被 IP 白名单拦截）

```nginx
# ==========================================
# 管理端点 IP 白名单配置
# 注意：location 匹配顺序很重要，更具体的路径必须放在前面
# ==========================================

# 1. 登录接口 - 所有 IP 均可访问（必须在 /api/admin/ 之前）
location /api/admin/auth/login {
    proxy_pass http://lvjiang-backend:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# 2. 管理端点 - 仅白名单 IP 可访问
location /api/admin/ {
    # 允许的 IP 地址（根据实际情况修改）
    allow 192.168.1.100;    # 管理员 IP
    allow 10.0.0.5;         # 办公室 IP
    # allow 172.16.0.0/12; # 也可以配置 IP 段

    # 拒绝其他所有 IP
    deny all;

    # 将请求代理到后端服务
    proxy_pass http://lvjiang-backend:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# 3. 其他 API 路径 - 所有 IP 均可访问
location /api/ {
    proxy_pass http://lvjiang-backend:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

> **注意**：
> 1. `proxy_pass` 中必须使用容器名称 `lvjiang-backend`（而非 `backend` 或 `127.0.0.1`），因为服务运行在 Docker `npm-network` 网络中
> 2. `location /api/admin/auth/login` 必须放在 `location /api/admin/` 之前，Nginx 会优先匹配更具体的路径前缀

#### 4.2.3 NPM 操作步骤

| 步骤 | 操作 | 说明 |
|------|------|------|
| 1 | 登录 NPM Web UI | 访问 `http://服务器IP:8181`（或通过域名 `https://npm.your-domain.com`） |
| 2 | 找到 API 代理 | 进入 **Proxy Hosts**，点击后端 API 的 Proxy Host（通常是 `api.yourdomain.com` 或主域名下的 `/api` 路由） |
| 3 | 进入 Advanced | 点击 **Edit**，切换到 **Advanced** 选项卡 |
| 4 | 粘贴配置 | 在文本框中粘贴 [4.2.2](#422-npm-配置方案) 中的 `location` 配置 |
| 5 | 保存 | 点击 **Save**，NPM 会自动重载 Nginx 配置（无需重启容器） |
| 6 | 验证 | 使用非白名单 IP 访问 `/api/admin/*`，应返回 403 |

**注意事项：**
- NPM 配置保存后会立即生效，无需重启任何容器
- 如果已存在 `/api` 的 location 配置，需要将其拆分为 `/api/admin/` 和 `/api/` 两个 location 块
- 使用 CDN 场景时，需要将 CDN 节点的 IP 加入白名单（参考下方 4.2.5）

#### 4.2.4 配置说明

**核心 Nginx 指令：**

| 指令 | 作用 | 示例 |
|------|------|------|
| `allow` | 允许指定 IP 或 IP 段 | `allow 192.168.1.100;` |
| `deny all` | 拒绝其他所有 IP | `deny all;` |
| `proxy_pass` | 将请求转发到后端 | `proxy_pass http://backend:3000;` |

**IP 格式支持：**

| 格式 | 示例 | 说明 |
|------|------|------|
| 单个 IPv4 | `allow 192.168.1.100;` | 允许单个 IP |
| IPv4 网段 | `allow 192.168.1.0/24;` | 允许整个子网 |
| 单个 IPv6 | `allow 2001:db8::1;` | 允许单个 IPv6 |
| IPv6 网段 | `allow 2001:db8::/32;` | 允许 IPv6 网段 |

#### 4.2.5 配置注意事项

1. **规则顺序重要**：Nginx 按从上到下的顺序匹配 `allow/deny`，第一个匹配的规则生效。`location /api/admin/` 必须放在 `location /api/` 之前。

2. **代理头信息**：配置中的 `proxy_set_header` 确保后端能获取客户端真实 IP（如需要）。当前部署方案中 NPM 已自动处理。

3. **容器名称**：`proxy_pass` 中必须使用 `http://lvjiang-backend:3000`，因为服务运行在 Docker `npm-network` 网络中，需要通过容器名称通信。

4. **CDN 场景**：当前部署方案使用腾讯云 CDN（[部署文档 CDN 配置](../deploy/README.md#cdn-配置腾讯云)），需要将所有 CDN 回源节点 IP 加入白名单，否则管理 API 会被 CDN 回源请求拒绝。

   **腾讯云 CDN 回源 IP 段**（示例）：
   ```nginx
   # 腾讯云 CDN 回源 IP 段（需查询最新列表）
   allow 101.226.0.0/16;
   allow 101.227.0.0/16;
   allow 101.228.0.0/16;
   allow 101.229.0.0/16;
   ```

5. **Cloudflare 场景**：如果使用 Cloudflare CDN，需要将 Cloudflare IP 段加入白名单。完整列表见：[Cloudflare IP Ranges](https://www.cloudflare.com/ips/)

6. **动态 DNS 限制**：`allow/deny` 不支持域名，只能使用 IP 地址或 CIDR 网段。

7. **IPv6 环境**：如果服务器启用了 IPv6，需要同时配置 IPv6 白名单。

#### 4.2.6 测试验证

| 测试场景 | 操作 | 预期结果 |
|---------|------|---------|
| 白名单 IP 访问 | 使用白名单 IP 访问 `/api/admin/teams` | 正常返回数据 |
| 非白名单 IP 访问 | 使用非白名单 IP 访问 `/api/admin/teams` | 返回 `403 Forbidden` |
| 公开 API 不受影响 | 使用任何 IP 访问 `/api/teams` | 正常返回数据 |
| 登录接口不受影响 | 使用任何 IP 访问 `/api/admin/auth/login` | ⚠️ **注意**：如果整个 `/api/admin/` 都设置了 IP 白名单，登录接口也会被拦截！需要单独放行（见 4.2.2 配置） |

#### 4.2.7 不配置 IP 白名单的情况

如果管理员使用动态 IP 或移动网络访问，可以不配置 IP 白名单：

```nginx
# 不配置 IP 白名单，仅保留全局代理配置
location /api/ {
    proxy_pass http://lvjiang-backend:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

此时管理端点仅受 JWT Token 认证保护，行为与修改前完全一致。

---

### 4.3 任务 A3: 后端管理路径动态化

#### 4.3.1 分析

当前所有管理端点路径已使用 `/admin/*` 前缀，如：
- `POST /api/admin/auth/login`
- `POST /api/admin/teams`
- `POST /api/admin/init-slots`

**是否需要动态化：** 
- **NestJS 路由路径修改成本较高**，且路径混淆对安全的提升有限（攻击者可通过前端源码推断）
- **建议：** 仅修改前端路由前缀，后端 API 路径保持 `/admin/*`
- **理由：** 后端 API 已有 `JwtAuthGuard` 保护，即使路径暴露也无法被未授权访问

#### 4.3.2 结论

**任务 A3 仅实施前端部分，后端 API 路径保持 `/admin/*` 不变。**

这样既降低了前端代码中暴露管理路径的风险，又避免了后端大规模重构。

---

### 4.3 后端改动文件清单

| # | 文件路径 | 操作 | 改动行数(估) |
|---|---------|------|-------------|
| 1 | `src/main.ts` | 修改 (Swagger) | ~15 |
| 2 | `.env.example` | 修改 (新增变量) | +5 |

**后端改动小计: ~20 行代码，2 个文件**

---

## 5. 部署配置变更

### 5.1 当前部署架构说明

当前项目采用以下部署架构：

```
用户 → Cloudflare CDN → Nginx Proxy Manager (80/443)
                                │
                                ├─→ lvjiang-frontend (3001)  - 静态页面
                                └─→ lvjiang-backend (3000)   - API 服务
```

- **网络**：Docker 外部网络 `npm-network`，容器通过容器名通信
- **代理**：NPM 统一管理，前端和后端通过 Proxy Host 配置
- **API 路由**：NPM 的 Advanced 配置中通过 `location /api` 转发到后端
- **前端配置**：通过 `config.js` volume 挂载，无需重新构建

### 5.2 NPM IP 白名单配置

在 NPM Web UI 中为后端 API Proxy Host 添加 Advanced 配置，详见 [4.2.2 NPM 配置方案](#422-npm-配置方案)。

**配置后的验证步骤：**
```bash
# 1. 保存 NPM 配置后，无需重启任何容器

# 2. 测试白名单 IP 访问
curl http://your-domain.com/api/admin/teams -H "Authorization: Bearer <token>"
# 预期：正常返回数据

# 3. 测试非白名单 IP 访问
# 使用另一台机器或手机网络访问同一地址
# 预期：返回 403 Forbidden

# 4. 测试登录接口不受影响
curl -X POST http://your-domain.com/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
# 预期：返回 JWT token（不受 IP 限制）
```

### 5.3 Docker Compose 变更

[deploy/docker-compose.yml](file:///d:/File/workSpace/AI-test/lvjiang-cup-test/deploy/docker-compose.yml)

**后端服务新增环境变量：**
```yaml
backend:
  environment:
    # 现有变量...
    - NODE_ENV=production
    - ENABLE_SWAGGER=false              # 生产环境禁用 Swagger
```

### 5.4 前端环境变量注入

当前项目的前端使用 **Vite + Docker 构建**，通过 Docker build-args 注入环境变量：

**GitHub Actions CI/CD 中的注入方式：**
```yaml
# .github/workflows/build.yml
- name: Build frontend
  run: |
    docker build \
      --build-arg VITE_ADMIN_ROUTE_PREFIX=${{ secrets.ADMIN_ROUTE_PREFIX || 'admin' }} \
      -t frontend:latest \
      ./frontend
```

**本地构建方式：**
```bash
cd frontend
docker build \
  --build-arg VITE_ADMIN_ROUTE_PREFIX=admin \
  -t lvjiang-cup-frontend:latest .
```

或在 Dockerfile 中设置默认值：
```dockerfile
ARG VITE_ADMIN_ROUTE_PREFIX=admin
ENV VITE_ADMIN_ROUTE_PREFIX=$VITE_ADMIN_ROUTE_PREFIX
```

### 5.5 .env 配置更新

```env
# ==========================================
# 安全配置 (新增)
# ==========================================

# 是否启用 Swagger API 文档
# 默认: false (关闭)
# 开发环境: true (在 .env.development 中覆盖)
# 生产环境: false (不设置或设为 false)
ENABLE_SWAGGER=false

# IP 白名单配置说明：
# IP 白名单不再在后端配置，而是在 Nginx Proxy Manager (NPM) 中配置
# 操作步骤：
#   1. 登录 NPM Web UI (http://服务器IP:8181)
#   2. 进入后端 API 的 Proxy Host > Edit > Advanced
#   3. 添加 location 配置（登录接口单独放行）
# 参考文档：本文档 4.2.2 节
```

---

## 6. 测试策略

### 6.1 单元测试

#### 6.1.1 前端路由常量测试

```typescript
// frontend/tests/unit/constants/routes.test.ts
import { ADMIN_PREFIX, adminPath } from '../../../src/constants/routes';

describe('routes constants', () => {
  it('ADMIN_PREFIX 应有默认值', () => {
    expect(ADMIN_PREFIX).toBeDefined();
    expect(typeof ADMIN_PREFIX).toBe('string');
    expect(ADMIN_PREFIX.length).toBeGreaterThan(0);
  });

  it('adminPath 应生成正确的路径', () => {
    expect(adminPath('login')).toBe(`/${ADMIN_PREFIX}/login`);
    expect(adminPath('dashboard')).toBe(`/${ADMIN_PREFIX}/dashboard`);
  });
});
```

#### 6.1.2 NPM 配置测试

NPM 配置无法通过单元测试验证，需要通过手动测试和 E2E 测试验证。

### 6.2 E2E 测试更新

需要更新的 E2E 测试用例：

| 测试文件 | 需要更新的测试 | 说明 |
|---------|-------------|------|
| `P1-01-login.spec.ts` | 登录页面路径 | 确保使用 `/${ADMIN_PREFIX}/login` |
| `P1-02-dashboard.spec.ts` | Dashboard 页面路径 | 确保使用 `/${ADMIN_PREFIX}/dashboard` |
| `P0-01-home.spec.ts` | 管理入口检查 | 确认首页不显示管理入口 |

### 6.3 手动测试清单

| # | 测试项 | 测试步骤 | 预期结果 |
|---|--------|---------|---------|
| 1 | 管理入口隐藏 | 访问首页，查看顶部导航栏 | 右上角无"管理"按钮 |
| 2 | 快捷键访问 | 按 `Ctrl+Shift+A` | 跳转到管理登录页 |
| 3 | Swagger 禁用 | 访问 `/api/docs` (生产环境) | 返回 404 |
| 4 | Swagger 启用 | 访问 `/api/docs` (开发环境) | 正常显示 Swagger UI |
| 5 | NPM IP 白名单生效 | 使用非白名单 IP 访问 `/api/admin/*` | 返回 403 Forbidden |
| 6 | NPM IP 白名单未配置 | 不配置 NPM 白名单 + 访问管理 API | 正常响应 (仅验证 JWT) |
| 7 | NPM 配置后公开 API 正常 | 使用任何 IP 访问 `/api/teams` | 正常返回数据 |
| 8 | 管理路由前缀 | 直接访问 `/${ADMIN_PREFIX}/login` | 正常显示登录页 |
| 9 | 管理员功能 | 登录并操作所有管理功能 | 全部正常 |
| 10 | 游客功能 | 访问首页并浏览所有公开内容 | 全部正常 |

---

## 7. 开发计划

### 7.1 阶段划分

#### 阶段 1: 后端安全加固 (30 分钟)

| # | 任务 | 文件 | 预计时间 |
|---|------|------|---------|
| 1.1 | 禁用 Swagger | `main.ts` | 20分钟 |
| 1.2 | 更新环境变量文档 | `.env.example` | 10分钟 |

**阶段一交付物:** 后端 Swagger 生产环境禁用

#### 阶段 1.5: NPM IP 白名单配置 (可选, 30 分钟)

| # | 任务 | 预计时间 |
|---|------|---------|
| 1.5.1 | 编写 NPM Advanced 配置模板 | 15分钟 |
| 1.5.2 | NPM Web UI 中应用配置 | 10分钟 |
| 1.5.3 | 验证白名单效果 | 5分钟 |

**阶段1.5交付物:** NPM IP 白名单配置完成，管理端点受 IP 限制

#### 阶段 2: 前端安全加固 (2-3 小时)

| # | 任务 | 文件 | 预计时间 |
|---|------|------|---------|
| 2.1 | 创建路由常量文件 | `constants/routes.ts` | 20分钟 |
| 2.2 | 隐藏管理入口 | `Layout.tsx` | 20分钟 |
| 2.3 | 添加快捷键访问 | `Layout.tsx` | 20分钟 |
| 2.4 | 路由前缀动态化 | `App.tsx`, `router/index.tsx` | 45分钟 |
| 2.5 | 替换硬编码路径 | `useAuth.ts`, `auth.ts`, `Dashboard.tsx` 等 | 1小时 |
| 2.6 | 更新环境变量 | `.env.development` | 10分钟 |

**阶段二交付物:** 管理入口隐藏，路由前缀可配置

#### 阶段 3: 部署配置与测试 (1-2 小时)

| # | 任务 | 预计时间 |
|---|------|---------|
| 3.1 | 更新 docker-compose.yml | 20分钟 |
| 3.2 | 更新 Dockerfile | 20分钟 |
| 3.3 | 完整回归测试 | 45分钟 |
| 3.4 | 修复发现的问题 | 30分钟 |

**阶段三交付物:** 部署配置更新，测试通过

### 7.2 时间估算

| 阶段 | 预计工时 | 说明 |
|------|---------|------|
| 阶段 1: 后端安全加固 | 30分钟 | 仅禁用 Swagger |
| 阶段 1.5: NPM IP 白名单 | 30分钟 | 可选，NPM 配置 |
| 阶段 2: 前端安全加固 | 3小时 | 包含路径替换 |
| 阶段 3: 部署配置与测试 | 2小时 | 包含回归测试 |
| **合计** | **约 6 小时** | **不足 1 个工作日** |

### 7.3 任务依赖关系

```
阶段 1 (后端) ──────────┐
阶段 1.5 (NPM) ────────┤  可并行
                        ├──→ 阶段 3 (部署 & 测试)
阶段 2 (前端) ──────────┘

阶段 1、1.5、2 可并行开发
```

---

## 8. 验收标准

### 8.1 功能验收

- [ ] 首页导航栏不显示"管理"入口
- [ ] `Ctrl+Shift+A` 可打开管理登录页
- [ ] 管理后台所有页面路径使用环境变量配置的前缀
- [ ] 生产环境访问 `/api/docs` 返回 404
- [ ] 开发环境访问 `/api/docs` 正常显示 Swagger UI
- [ ] NPM IP 白名单配置生效后，非白名单 IP 访问管理 API 返回 403
- [ ] NPM IP 白名单未配置时，管理 API 行为与修改前一致
- [ ] 管理员登录后所有功能正常工作

### 8.2 兼容性验收

- [ ] 默认环境变量配置下，行为与修改前完全一致
- [ ] 现有部署无需修改 `.env` 文件即可正常运行
- [ ] 前端构建产物中不包含明文的管理路径（除非环境变量指定）
- [ ] Docker 部署流程不受影响

### 8.3 安全验收

- [ ] Swagger 文档在生产环境不可访问
- [ ] 管理入口不再在页面上公开暴露
- [ ] 管理端点仍受 JWT 认证保护
- [ ] IP 白名单可正常生效（可选功能）

### 8.4 代码质量验收

- [ ] TypeScript 类型定义完整
- [ ] 新增代码有对应的单元测试
- [ ] 无 ESLint 警告
- [ ] 无 Prettier 格式问题
- [ ] 代码注释清晰
- [ ] 无 console.log 调试代码

---

## 9. 回滚方案

### 9.1 回滚策略

所有改动均为**向后兼容**的配置化改动：

| 改动项 | 回滚方法 |
|--------|---------|
| 管理入口隐藏 | 恢复 `Layout.tsx` 中的 `<Link>` 组件 |
| 路由前缀动态化 | 将 `VITE_ADMIN_ROUTE_PREFIX` 改回 `admin` |
| Swagger 禁用 | 将 `ENABLE_SWAGGER` 改为 `true` 或删除该变量 |
| NPM IP 白名单 | 在 NPM Web UI 中删除 Advanced 配置的 `location` 块 |

### 9.2 回滚步骤

1. **前端回滚：**
   ```bash
   git revert <commit-hash>
   # 或手动还原修改的文件
   cd frontend && npm run build
   docker compose up -d frontend
   ```

2. **后端回滚：**
   ```bash
   git revert <commit-hash>
   # 或手动还原修改的文件
   docker compose restart backend
   ```

3. **NPM 回滚（如果配置了 IP 白名单）：**
   - 登录 NPM Web UI (`http://服务器IP:8181`)
   - 进入后端 API 的 Proxy Host > Edit > Advanced
   - 删除之前添加的 `location` 块
   - 点击 **Save**，NPM 自动重载配置（无需重启容器）

4. **验证：**
   - 访问首页，确认管理入口恢复
   - 访问 `/api/docs`，确认 Swagger 恢复（如果 `ENABLE_SWAGGER=true`）
   - 访问 `/admin/login`，确认登录页正常

### 9.3 回滚时间

预计回滚时间：**10分钟**（NPM 配置回滚仅需 2 分钟）

---

## 附录

### A. 文件改动清单

| # | 文件路径 | 操作类型 | 改动说明 |
|---|---------|---------|---------|
| 1 | `frontend/src/constants/routes.ts` | 新建 | 路由常量文件 |
| 2 | `frontend/src/components/layout/Layout.tsx` | 修改 | 隐藏管理入口 + 快捷键 |
| 3 | `frontend/src/App.tsx` | 修改 | 路由前缀动态化 |
| 4 | `frontend/src/router/index.tsx` | 修改 | 路由前缀动态化 |
| 5 | `frontend/src/hooks/useAuth.ts` | 修改 | 路径常量替换 |
| 6 | `frontend/src/api/auth.ts` | 修改 | 路径常量替换 |
| 7 | `frontend/src/pages/admin/Dashboard.tsx` | 修改 | 路径常量替换 |
| 8 | `frontend/.env.development` | 修改 | 新增环境变量 |
| 9 | `backend/src/main.ts` | 修改 | Swagger 条件启用（默认关闭） |
| 10 | `backend/.env.example` | 修改 | 新增安全配置 |
| 11 | `deploy/docker-compose.yml` | 修改 | 新增 ENABLE_SWAGGER 环境变量 |
| 12 | `frontend/Dockerfile` | 修改 | 新增构建参数 |
| N | NPM Web UI (Advanced) | 配置 | 登录接口放行 + IP 白名单 (无需修改文件) |

### B. 环境变量汇总

| 变量名 | 默认值 | 说明 | 必需 |
|--------|--------|------|------|
| `ENABLE_SWAGGER` | `false` | 是否启用 Swagger 文档（默认关闭） | 否 |
| `VITE_ADMIN_ROUTE_PREFIX` | `"admin"` | 前端管理路由前缀 | 否 |

### C. NPM 配置清单

| 配置项 | 位置 | 说明 |
|--------|------|------|
| 登录接口放行 | NPM Proxy Host > Advanced | `location /api/admin/auth/login` 允许所有 IP |
| 管理端点白名单 | NPM Proxy Host > Advanced | `location /api/admin/` 仅允许白名单 IP |
| 其他 API 路径 | NPM Proxy Host > Advanced | `location /api/` 允许所有 IP |

### D. 风险提示

| 风险项 | 概率 | 影响 | 缓解措施 |
|--------|------|------|---------|
| 快捷键与浏览器快捷键冲突 | 低 | 低 | `Ctrl+Shift+A` 一般不被浏览器占用 |
| NPM IP 白名单误配置导致无法访问 | 中 | 高 | 登录接口单独放行，默认不启用白名单 |
| 前端路由前缀修改遗漏 | 中 | 中 | 使用统一常量文件，全局搜索 `/admin/` 确认 |
| CDN 场景下白名单失效 | 中 | 中 | 需要将 CDN 回源节点 IP 加入白名单（见 4.2.5） |
| NPM 配置与现有 `/api` location 冲突 | 低 | 高 | 确保 location 顺序正确：`/api/admin/auth/login` → `/api/admin/` → `/api/` |

---

**文档结束**
