# SSL DNS 记录冲突问题修复

## 问题描述

用户在申请 Cloudflare 管理的域名证书时遇到以下错误：

```
[*.edward-tech.com] acme：呈现令牌时出错：cloudflare：创建TXT记录失败：[状态码400]81058：已存在相同的记录。
```

这是由于上次申请失败后，DNS 验证记录（`_acme-challenge`）没有被清理干净，导致 lego 尝试创建新记录时与旧记录冲突。

## 根本原因

1. **DNS 记录残留**：当证书申请失败时，lego 创建的 DNS 验证记录可能没有被正确清理
2. **Cloudflare 严格检查**：Cloudflare 对重复 DNS 记录检查非常严格，不允许相同的 TXT 记录
3. **lego 数据缓存**：lego 在本地保存了域名的申请状态，重新申请时可能产生冲突

## 解决方案

### 1. 改进错误处理

在 `dom/internal/ssl/ssl.go` 中：

- ✅ 添加了更详细的错误识别和分类
- ✅ 对 "已存在记录" 错误提供明确的解决建议
- ✅ 区分 DNS 冲突、认证失败、速率限制等不同错误类型
- ✅ 在申请前检查并清理旧的 lego 数据

### 2. 添加清理功能

**后端** (`dom/internal/ssl/ssl.go`):
- 新增 `ForceCleanup()` 函数：强制清理域名的所有 lego 数据
- 新增 `CleanupDNSRecords()` 函数：尝试清理 DNS 验证记录

**API** (`dom/internal/ssl/handler.go`):
- 新增 `POST /api/ssl/certificates/:id/cleanup` 端点
- 清理后记录操作日志

**前端** (`ui/src/pages/ssl/SSLPage.tsx`):
- 在错误状态的证书旁显示清理按钮（黄色警告图标）
- 点击即可清理 lego 数据
- 提供友好的错误提示和操作指引

### 3. 优化证书申请流程

```go
// 申请前自动检查并清理旧数据
existingCert, _ := database.GetCertificateByDomain(mainDomain)
if existingCert != nil {
    log.Info("域名证书已存在，将先删除旧记录")
    // 删除旧的 lego 数据文件
    os.Remove(oldCertFile)
    os.Remove(oldKeyFile)
    os.Remove(oldJsonFile)
}
```

### 4. 改进续期错误处理

```go
// 区分不同类型的错误
if strings.Contains(errMsg, "already exists") {
    // DNS 冲突不标记为 error，允许下次重试
    return fmt.Errorf("DNS 验证记录已存在，请稍后自动重试")
}

if strings.Contains(errMsg, "authentication") {
    // 认证失败标记为 error，需要人工介入
    cert.Status = "error"
    // ...
}
```

### 5. 增强前端错误提示

```typescript
// 根据错误类型提供不同的解决建议
if (errorMsg.includes('已存在') || errorMsg.includes('already exists')) {
    toast.error('DNS 验证记录冲突', {
        description: '请在证书列表中点击"清理"按钮清除旧记录后重试',
        duration: 5000,
    });
}
```

## 使用方法

### 方法 1：使用清理功能（推荐）

1. 在 SSL 证书管理页面找到错误状态的证书
2. 点击黄色的警告图标（🔔 清理按钮）
3. 系统会清理该域名的所有 lego 缓存数据
4. 重新点击"申请证书"按钮

### 方法 2：手动清理 DNS 记录

1. 登录 Cloudflare Dashboard
2. 进入域名的 DNS 设置
3. 找到 `_acme-challenge.your-domain.com` 的 TXT 记录
4. 删除这些记录
5. 返回 Hop 重新申请证书

### 方法 3：删除并重新创建

1. 在证书列表中删除该证书记录
2. 清理后端数据：`rm -rf data/lego/certificates/your-domain.com.*`
3. 重新申请证书

## 预防措施

1. **申请前自动清理**：系统现在会在申请前检查并清理旧数据
2. **错误分类**：不同错误提供不同的处理建议
3. **操作指引**：前端提供明确的操作步骤
4. **日志记录**：所有清理操作都会记录日志

## 技术细节

### 清理的文件

```
data/lego/certificates/
├── domain.crt          # 证书文件
├── domain.key          # 私钥文件
├── domain.json         # lego 元数据
└── domain.issuer.crt   # 颁发者证书
```

### API 端点

```bash
# 清理证书的 lego 数据
POST /api/ssl/certificates/:id/cleanup

# 响应
{
  "success": true
}
```

### 前端显示

- ✅ 证书状态为 `error` 时显示清理按钮
- ✅ 错误信息直接显示在证书名称下方
- ✅ 提供详细的错误分类和解决建议
- ✅ Toast 提示包含具体的操作步骤

## 测试建议

1. **正常申请**：测试新域名的正常申请流程
2. **重复申请**：测试对同一域名重复申请（应该自动清理）
3. **DNS 冲突**：手动创建 `_acme-challenge` 记录，测试冲突处理
4. **清理功能**：测试清理按钮是否正确工作
5. **错误恢复**：测试从错误状态恢复到正常申请

## 相关文件

- `dom/internal/ssl/ssl.go` - 核心逻辑和错误处理
- `dom/internal/ssl/handler.go` - API 端点
- `ui/src/pages/ssl/SSLPage.tsx` - 前端界面
- `ui/src/api/ssl.ts` - API 客户端
- `SSL_README.md` - 用户文档

## 总结

通过以上改进：
- ✅ 自动清理旧数据，减少冲突
- ✅ 提供清理功能，快速解决问题
- ✅ 详细的错误分类和提示
- ✅ 完善的故障排查文档
- ✅ 更好的用户体验

现在用户遇到 DNS 记录冲突时，可以通过简单的点击操作快速解决问题！
