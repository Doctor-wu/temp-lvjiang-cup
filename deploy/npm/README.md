# Nginx Proxy Manager 部署指南

## 快速部署

### 第 1 步：部署 Nginx Proxy Manager

```bash
# 创建部署目录
mkdir -p /opt/nginx-proxy-manager
cd /opt/nginx-proxy-manager

# 下载配置文件
curl -fsSL https://raw.githubusercontent.com/forzenfox/lvjiang-cup/main/deploy/npm/docker-compose.yml -o docker-compose.yml

# 启动 NPM
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 第 2 步：访问管理界面

1. 访问：`http://服务器 IP:8181`
2. 默认登录凭证：
   - 邮箱：`admin@example.com`
   - 密码：`changeme`
3. 首次登录会要求修改密码

### 第 3 步：配置代理主机

#### 3.1 添加驴酱杯前端代理

1. 点击 **Hosts** → **Add Proxy Host**
2. 填写配置：
   - **Domain Names**: `cup.example.com`
   - **Scheme**: `http`
   - **Forward IP / Hostname**: `lvjiang-frontend`
   - **Forward Port**: `3001`
   - **Cache Assets**: ✓ 勾选（注意：config.js 文件不应缓存）
   - **Block Common Exploits**: ✓ 勾选
3. 点击 **Save**

> **注意**：
> - 使用容器名称 `lvjiang-frontend` 而不是 `127.0.0.1`，因为服务运行在 Docker 网络中
> - 对于 `config.js` 配置文件，建议不要缓存，可以通过 NPM 的 Custom Location 配置实现

#### 3.2 配置 SSL 证书

1. 点击刚创建的代理主机，选择 **Edit**
2. 切换到 **SSL** 标签页
3. 配置：
   - **SSL Certificate**: `Request a new SSL certificate`
   - **Force SSL**: ✓ 勾选
   - **HTTP/2 Support**: ✓ 勾选
   - **I agree to the Terms of Service**: ✓ 勾选
4. 点击 **Save**

#### 3.3 添加 API 路由（高级配置）

1. 切换到 **Advanced** 标签页
2. 添加自定义位置：
   ```
   Location: /api
   Scheme: http
   Forward IP / Hostname: lvjiang-backend
   Forward Port: 3000
   ```
3. 点击 **Save**

> **注意**：使用容器名称 `lvjiang-backend` 而不是 `127.0.0.1`，因为服务运行在 Docker 网络中

#### 3.4 配置 config.js 不缓存（重要）

为防止 `config.js` 配置文件被缓存，建议添加自定义位置规则：

1. 切换到 **Advanced** 标签页
2. 添加自定义位置：
   ```
   Location: /config.js
   Scheme: http
   Forward IP / Hostname: lvjiang-frontend
   Forward Port: 3001
   Cache Assets: ✗ 不勾选
   ```
3. 点击 **Save**

> **说明**：这样可以确保用户始终获取最新的配置文件，而不会被 NPM 或浏览器缓存

---

## 已有 NPM 环境（添加新应用）

如果服务器上已有 Nginx Proxy Manager，只需添加新的代理主机：

### 方式 1：通过 Web 界面（推荐）

1. 登录 NPM 管理界面
2. 添加代理主机，配置域名和转发端口
3. 申请 SSL 证书

### 方式 2：通过 Docker Compose 网络

确保应用容器加入 `npm-network` 网络：

```yaml
networks:
  npm-network:
    driver: bridge
    external: true  # 使用已存在的网络
```

**注意**：如果网络不存在，请先运行网络初始化脚本：
```bash
curl -fsSL https://raw.githubusercontent.com/forzenfox/lvjiang-cup/main/deploy/init-network.sh -o init-network.sh
chmod +x init-network.sh
./init-network.sh
```

---

## 多应用管理示例

假设服务器上有 3 个应用：

| 应用 | 域名 | 前端端口 | 后端端口 |
|------|------|---------|---------|
| 驴酱杯 | cup.example.com | 3001 | 3000 |
| 博客 | blog.example.com | 3002 | - |
| API 服务 | api.example.com | - | 3003 |

### NPM 配置

在 NPM 管理界面添加 3 个代理主机：

1. **cup.example.com** → `lvjiang-frontend:3001`
   - 高级配置：`/api` → `lvjiang-backend:3000`
2. **blog.example.com** → `blog-container:3002`
3. **api.example.com** → `api-container:3003`

> **注意**：使用容器名称（如 `lvjiang-frontend`）而不是 `127.0.0.1`，因为服务运行在 Docker 网络中，NPM 需要通过容器名称进行服务发现

---

## 常用命令

```bash
# 切换到 NPM 目录
cd /opt/nginx-proxy-manager

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启 NPM
docker-compose restart

# 停止 NPM
docker-compose down

# 更新 NPM
docker-compose pull
docker-compose up -d
```

---

## 数据备份

### 备份数据

```bash
# 创建备份目录
mkdir -p /opt/backup/npm

# 备份数据
tar -czf /opt/backup/npm/npm-data-$(date +%Y%m%d).tar.gz /opt/nginx-proxy-manager/npm-data
tar -czf /opt/backup/npm/npm-letsencrypt-$(date +%Y%m%d).tar.gz /opt/nginx-proxy-manager/npm-letsencrypt
```

### 恢复数据

```bash
# 停止 NPM
docker-compose down

# 恢复数据
tar -xzf /opt/backup/npm/npm-data-YYYYMMDD.tar.gz -C /opt/nginx-proxy-manager/
tar -xzf /opt/backup/npm/npm-letsencrypt-YYYYMMDD.tar.gz -C /opt/nginx-proxy-manager/

# 重启 NPM
docker-compose up -d
```

---

## 故障排查

### 问题 1：无法访问管理界面

```bash
# 检查容器状态
docker-compose ps

# 查看日志
docker-compose logs nginx-proxy-manager

# 检查端口占用
netstat -tlnp | grep :8181
```

### 问题 2：SSL 证书申请失败

1. 检查域名 DNS 解析是否正确
2. 检查 80 端口是否开放
3. 查看 Let's Encrypt 日志：
   ```bash
   docker-compose logs | grep "letsencrypt"
   ```

### 问题 3：代理主机无法访问

1. 检查后端容器是否运行
   ```bash
   docker-compose ps
   ```
2. 检查网络连通性
   ```bash
   docker exec nginx-proxy-manager ping 127.0.0.1
   ```
3. 检查端口是否正确
   ```bash
   docker exec nginx-proxy-manager wget -q -O - http://127.0.0.1:3001
   ```

---

## 安全建议

1. **修改默认密码**：首次登录后立即修改
2. **限制管理界面访问**：
   ```bash
   # 使用防火墙限制 8181 端口访问
   ufw allow from 你的 IP to any port 8181
   ```
3. **定期更新**：保持 NPM 镜像为最新版本
4. **备份数据**：定期备份 `npm-data` 和 `npm-letsencrypt` 目录

---

**文档版本**: v1.2  
**更新日期**: 2026-04-24  
**适用场景**: 多应用服务器环境  
**更新日志**:
- v1.2: 添加管理端点 IP 白名单配置说明
- v1.1: 添加 config.js 配置文件缓存配置说明

---

## 安全加固配置

### 管理端点 IP 白名单

在 NPM 中为后端 API 代理配置 IP 白名单，限制管理端点的访问来源。

**操作步骤**：

1. 登录 NPM Web UI (`http://服务器IP:8181`)
2. 找到代理后端 API 的 Proxy Host（通常是 `/api` 路由或域名代理）
3. 点击 **Edit**，切换到 **Advanced** 选项卡
4. 在文本框中粘贴以下配置

**Nginx 配置**：

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

**重要注意事项**：

1. `proxy_pass` 中必须使用容器名称 `lvjiang-backend`（而非 `127.0.0.1`），因为服务运行在 Docker `npm-network` 网络中
2. `location /api/admin/auth/login` 必须放在 `location /api/admin/` 之前，Nginx 会优先匹配更具体的路径前缀
3. 如果已存在 `/api` 的 location 配置，需要将其拆分为上面的三个 location 块

**测试验证**：

```bash
# 测试白名单 IP 访问（应正常返回数据）
curl http://your-domain.com/api/admin/teams -H "Authorization: Bearer <token>"

# 测试登录接口不受影响（应返回 JWT token）
curl -X POST http://your-domain.com/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'

# 测试非白名单 IP 访问（应返回 403 Forbidden）
# 使用另一台机器或手机网络访问同一地址
```

**IP 白名单配置说明**：

| 格式 | 示例 | 说明 |
|------|------|------|
| 单个 IPv4 | `allow 192.168.1.100;` | 允许单个 IP |
| IPv4 网段 | `allow 192.168.1.0/24;` | 允许整个子网 |
| 单个 IPv6 | `allow 2001:db8::1;` | 允许单个 IPv6 |
| IPv6 网段 | `allow 2001:db8::/32;` | 允许 IPv6 网段 |

**CDN 场景注意事项**：

如果使用了 CDN（如腾讯云 CDN、Cloudflare），需要将 CDN 回源节点 IP 加入白名单，否则管理 API 会被 CDN 回源请求拒绝。

腾讯云 CDN 回源 IP 段示例：
```nginx
allow 101.226.0.0/16;
allow 101.227.0.0/16;
allow 101.228.0.0/16;
allow 101.229.0.0/16;
```

Cloudflare IP 段列表：[https://www.cloudflare.com/ips/](https://www.cloudflare.com/ips/)

**不配置 IP 白名单的情况**：

如果管理员使用动态 IP 或移动网络访问，可以不配置 IP 白名单，仅保留全局代理配置：

```nginx
location /api/ {
    proxy_pass http://lvjiang-backend:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

此时管理端点仅受 JWT Token 认证保护，行为与修改前完全一致。

