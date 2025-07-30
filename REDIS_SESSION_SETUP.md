# Redis Session 持久化配置

## 概述

现在系统已经配置为使用Redis进行真正的Session持久化，适用于Serverless场景。

## 配置详情

### 1. Redis适配器
- **文件**: `src/lib/redis-adapter.ts`
- **功能**: 完整的NextAuth适配器实现
- **存储**: 用户、会话、验证令牌

### 2. Session策略
- **策略**: `database` (数据库模式)
- **存储**: Redis
- **过期时间**: 30天

### 3. 存储的数据类型

#### 用户数据 (`nextauth:user:*`)
```json
{
  "id": "google_123456789",
  "email": "user@bu.edu",
  "name": "用户名",
  "image": "头像URL",
  "accounts": [
    {
      "provider": "google",
      "providerAccountId": "google_123",
      "type": "oauth",
      "access_token": "...",
      "refresh_token": "...",
      "expires_at": 1234567890,
      "scope": "openid email profile",
      "token_type": "Bearer",
      "id_token": "..."
    }
  ]
}
```

#### 会话数据 (`nextauth:session:*`)
```json
{
  "id": "session_456",
  "sessionToken": "session_token_456",
  "userId": "user_123",
  "expires": "2024-01-01T00:00:00.000Z"
}
```

#### 验证令牌 (`nextauth:verification_token:*`)
```json
{
  "id": "token_789",
  "token": "verification_token_789",
  "identifier": "user@bu.edu",
  "expires": "2024-01-01T00:00:00.000Z"
}
```

## 功能特性

- ✅ **真正的Session持久化**: 使用Redis存储会话数据
- ✅ **Serverless友好**: 支持无状态部署
- ✅ **高可用性**: Redis提供可靠的数据存储
- ✅ **自动过期**: 会话自动过期管理
- ✅ **多实例支持**: 支持多服务器部署

## 使用方法

### 1. 查看Session数据
```bash
# 查看所有会话
redis-cli keys "nextauth:session:*"

# 查看特定会话
redis-cli get "nextauth:session:session_token_xxx"
```

### 2. 查看用户数据
```bash
# 查看所有用户
redis-cli keys "nextauth:user:*"

# 查看特定用户
redis-cli get "nextauth:user:user_id_xxx"
```

### 3. 查看验证令牌
```bash
# 查看所有验证令牌
redis-cli keys "nextauth:verification_token:*"
```

## 工作流程

1. **用户登录**:
   - 用户通过Google OAuth登录
   - 系统验证邮箱域名
   - 创建用户记录存储到Redis
   - 创建会话记录存储到Redis

2. **会话验证**:
   - 用户访问受保护页面
   - NextAuth从Redis获取会话数据
   - 验证会话有效性
   - 返回用户信息

3. **会话管理**:
   - 自动处理会话过期
   - 支持会话更新和删除
   - 多实例间会话同步

## 优势

- 🚀 **高性能**: Redis提供快速的数据访问
- 🔒 **安全性**: 会话数据安全存储
- 📈 **可扩展**: 支持集群部署
- 🔄 **无状态**: 适合Serverless架构
- 📊 **可监控**: 完整的会话管理

## 部署建议

### 生产环境
1. 使用Redis集群提高可用性
2. 配置Redis持久化
3. 设置适当的过期时间
4. 监控Redis性能

### 开发环境
1. 使用本地Redis进行测试
2. 启用调试模式查看日志
3. 定期清理测试数据

## 故障排除

### 常见问题
1. **Redis连接失败**: 检查Redis服务状态
2. **会话丢失**: 检查Redis数据持久化
3. **性能问题**: 监控Redis内存使用

### 调试命令
```bash
# 检查Redis连接
redis-cli ping

# 查看所有NextAuth数据
redis-cli keys "nextauth:*"

# 监控Redis性能
redis-cli info
``` 