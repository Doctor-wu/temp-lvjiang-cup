# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖（包含开发依赖）
RUN npm ci

# 复制源代码
COPY . .

# 声明构建参数（设置默认值为 admin）
ARG VITE_ADMIN_ROUTE_PREFIX=admin

# 设置环境变量，Vite 构建时会自动读取
ENV VITE_ADMIN_ROUTE_PREFIX=$VITE_ADMIN_ROUTE_PREFIX

# 构建应用
RUN npm run build

# 生产阶段 - 使用 static-web-server（高性能静态文件服务器）
FROM joseluisq/static-web-server:2-alpine AS production

WORKDIR /app

# 复制构建产物
COPY --from=builder /app/dist ./dist

# 设置环境变量
ENV SERVER_ROOT=/app/dist
ENV SERVER_PORT=3001
ENV SERVER_HOST=0.0.0.0
# SPA 支持：所有 404 回退到 index.html
ENV SERVER_FALLBACK_PAGE=/app/dist/index.html
# 启用压缩
ENV SERVER_COMPRESSION=true
# 启用 CORS
ENV SERVER_CORS_ALLOW_ORIGINS=*

# 暴露端口
EXPOSE 3001

# 使用非 root 用户运行（static-web-server 镜像已内置）
# 启动 static-web-server
CMD ["static-web-server"]
