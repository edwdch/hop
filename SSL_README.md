# SSL 证书管理功能

Hop 现已集成 Let's Encrypt 自动化 SSL 证书管理功能，使用 `lego` 工具通过 DNS 验证方式申请和续期证书。

## 功能特性

- ✅ 使用 Let's Encrypt 免费申请 SSL 证书
- ✅ 仅支持 DNS 验证方式（安全可靠）
- ✅ 支持主流 DNS 提供商：
  - 阿里云 DNS
  - 腾讯云 DNSPod
  - Cloudflare
- ✅ 自动续期：证书在 30 天内过期时自动续期
- ✅ 定时检查：每 24 小时检查一次证书状态
- ✅ 页面管理：可视化界面管理证书和 DNS 配置

## 安装 lego

在使用 SSL 功能之前，需要先安装 `lego` 工具：

```bash
go install github.com/go-acme/lego/v4/cmd/lego@latest
```

确保 `lego` 已添加到 PATH 环境变量中。

## 使用流程

### 1. 配置 DNS 提供商

进入 **SSL 证书管理** -> **DNS 配置** 页面，添加 DNS 提供商配置。

#### 阿里云 DNS

需要提供：
- AccessKey ID
- AccessKey Secret
- Region ID（可选，默认 cn-hangzhou）

获取方式：登录阿里云控制台 -> AccessKey 管理

#### 腾讯云 DNSPod

需要提供：
- SecretId
- SecretKey

获取方式：登录腾讯云控制台 -> 访问管理 -> 访问密钥

#### Cloudflare

推荐使用 API Token（更安全）：
- API Token

或使用 Global API Key：
- Email
- Global API Key

获取方式：登录 Cloudflare -> 我的个人资料 -> API 令牌

### 2. 申请证书

1. 进入 **SSL 证书管理** 页面
2. 点击 **申请证书** 按钮
3. 填写以下信息：
   - 域名（支持多个域名，逗号分隔）
   - 选择 DNS 提供商
   - 邮箱地址（用于 Let's Encrypt 通知）
4. 点击 **申请证书**

申请过程需要几分钟时间，系统会：
1. 调用 lego 工具
2. 通过 DNS API 添加验证记录
3. Let's Encrypt 验证域名所有权
4. 下载证书并保存到 `/etc/nginx/ssl/` 目录

### 3. 在 Nginx 中使用证书

证书申请成功后，文件会保存在：
- 证书文件：`/etc/nginx/ssl/{domain}.crt`
- 私钥文件：`/etc/nginx/ssl/{domain}.key`

在 Nginx 配置中引用：

```nginx
server {
    listen 443 ssl;
    server_name example.com;
    
    ssl_certificate /etc/nginx/ssl/example.com.crt;
    ssl_certificate_key /etc/nginx/ssl/example.com.key;
    
    # 其他配置...
}
```

### 4. 自动续期

系统会自动处理证书续期：
- 每 24 小时检查一次证书状态
- 证书在 30 天内过期时自动续期
- 续期成功后会记录日志

也可以在页面上手动触发续期。

## API 接口

### DNS 提供商管理

```bash
# 列出所有 DNS 提供商
GET /api/ssl/dns-providers

# 创建 DNS 提供商
POST /api/ssl/dns-providers
{
  "name": "我的阿里云",
  "type": "alidns",
  "config": {
    "accessKeyId": "LTAI...",
    "accessKeySecret": "..."
  }
}

# 删除 DNS 提供商
DELETE /api/ssl/dns-providers/:id
```

### 证书管理

```bash
# 列出所有证书
GET /api/ssl/certificates

# 申请证书
POST /api/ssl/certificates
{
  "domains": ["example.com", "www.example.com"],
  "dnsProviderId": "provider-id",
  "email": "admin@example.com"
}

# 续期证书
POST /api/ssl/certificates/:id/renew
{
  "email": "admin@example.com"
}

# 删除证书
DELETE /api/ssl/certificates/:id

# 获取证书日志
GET /api/ssl/certificates/:id/logs
```

### 系统状态

```bash
# 检查 lego 安装状态
GET /api/ssl/status
```

## 数据库表结构

### dns_provider - DNS 提供商配置

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 主键 |
| name | TEXT | 显示名称 |
| type | TEXT | 类型：alidns/tencentcloud/cloudflare |
| config | TEXT | JSON 配置（加密存储） |
| createdAt | TEXT | 创建时间 |
| updatedAt | TEXT | 更新时间 |

### certificate - SSL 证书

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 主键 |
| domain | TEXT | 主域名（唯一） |
| domains | TEXT | 所有域名（JSON 数组） |
| dnsProviderId | TEXT | DNS 提供商 ID |
| certPath | TEXT | 证书文件路径 |
| keyPath | TEXT | 私钥文件路径 |
| issuer | TEXT | 颁发者 |
| notBefore | TEXT | 生效时间 |
| notAfter | TEXT | 过期时间 |
| autoRenew | INTEGER | 是否自动续期 |
| lastRenewAt | TEXT | 最后续期时间 |
| status | TEXT | 状态：pending/active/expired/error |
| error | TEXT | 错误信息 |
| createdAt | TEXT | 创建时间 |
| updatedAt | TEXT | 更新时间 |

### certificate_log - 证书操作日志

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 主键 |
| certificateId | TEXT | 证书 ID |
| action | TEXT | 操作：create/renew/error |
| message | TEXT | 日志消息 |
| createdAt | TEXT | 创建时间 |

## 安全注意事项

1. **DNS API 密钥安全**：
   - DNS API 密钥存储在数据库中（未加密）
   - 请确保数据库文件安全
   - 建议使用只读权限的 API 密钥（如果可用）

2. **Let's Encrypt 限制**：
   - 每个域名每周最多 50 个证书
   - 每个账户每 3 小时最多 300 个待处理授权
   - 详见：https://letsencrypt.org/docs/rate-limits/

3. **DNS 传播时间**：
   - DNS 记录更新需要时间传播
   - 如果申请失败，可能需要等待几分钟后重试

## 故障排查

### lego 未安装

错误信息：`lego 未安装`

解决方案：
```bash
go install github.com/go-acme/lego/v4/cmd/lego@latest
```

### DNS 记录冲突错误

错误信息：`DNS 验证记录已存在` 或 `already exists the same record` 或 `81058：已存在相同的记录`

这是由于上次申请失败后 DNS 验证记录没有清理干净导致的。

**解决方案**：

**方法 1：使用清理功能（推荐）**
1. 在证书列表中找到错误状态的证书
2. 点击黄色的警告图标（清理按钮）
3. 等待清理完成
4. 重新申请证书

**方法 2：手动清理 DNS 记录**
1. 登录您的 DNS 提供商控制台
2. 找到 `_acme-challenge.your-domain.com` 的 TXT 记录
3. 删除这些记录
4. 等待 DNS 传播（通常 1-5 分钟）
5. 重新申请证书

**方法 3：等待自动过期**
DNS 验证记录通常会在 24-48 小时后自动过期，之后可以重新申请。

### DNS 验证失败

可能原因：
1. DNS API 密钥错误或过期
2. DNS 提供商 API 限流
3. 域名不在该 DNS 提供商管理下
4. DNS 传播延迟

解决方案：
1. 检查 DNS 配置是否正确
2. 验证 API 密钥是否有效
3. 确认域名在正确的 DNS 提供商下
4. 查看证书日志了解详细错误信息
5. 等待一段时间后重试

### Cloudflare 特定问题

**问题 1：认证失败**
- 确保使用的是有效的 API Token
- API Token 需要有 `Zone:DNS:Edit` 权限
- 或使用 Global API Key + Email 组合

**问题 2：DNS 记录冲突**
Cloudflare 对重复记录检查严格，更容易出现此问题。
- 使用清理功能清除旧的 lego 数据
- 或在 Cloudflare 控制台手动删除 `_acme-challenge` 记录

### 证书续期失败

可能原因：
1. DNS API 密钥过期或被删除
2. 达到 Let's Encrypt 速率限制
3. 网络问题
4. DNS 记录冲突（同上）

解决方案：
1. 更新 DNS 提供商配置
2. 检查证书日志
3. 如果是 DNS 记录冲突，使用清理功能
4. 手动触发续期或等待下次自动续期

### 速率限制

Let's Encrypt 有以下限制：
- 每个域名每周最多 50 个证书
- 每个账户每 3 小时最多 300 个待处理授权
- 每个账户每天最多 5 次相同证书申请失败

如果触发限制：
1. 等待限制时间过去
2. 检查是否频繁申请相同域名
3. 考虑使用测试环境（需修改代码使用 staging 服务器）

### 查看详细日志

1. 在证书列表中点击证书
2. 查看证书日志获取详细错误信息
3. 后端日志也会记录详细的 lego 输出

### 紧急恢复

如果遇到无法解决的问题：

1. **删除证书记录**：
   ```bash
   # 在数据库中删除
   sqlite3 data/hop.db "DELETE FROM certificate WHERE domain='your-domain.com';"
   ```

2. **清理 lego 数据**：
   ```bash
   rm -rf data/lego/certificates/your-domain.com.*
   ```

3. **重新申请**：
   删除后在页面上重新申请证书

## 配置文件

配置文件（config.toml）中的相关配置：

```toml
[nginx]
# SSL 证书目录
ssl_dir = "/etc/nginx/ssl"

[data]
# 数据目录（包含数据库和 lego 工作目录）
dir = "./data"
```

## 技术架构

- **后端**：
  - Go 语言实现
  - 使用 `lego` CLI 工具申请证书
  - SQLite 存储证书信息
  - Goroutine 定时任务检查续期

- **前端**：
  - React + TypeScript
  - 证书列表和管理界面
  - DNS 提供商配置界面

- **证书存储**：
  - 证书文件：`{ssl_dir}/{domain}.crt`
  - 私钥文件：`{ssl_dir}/{domain}.key`
  - Lego 数据：`{data_dir}/lego/`
