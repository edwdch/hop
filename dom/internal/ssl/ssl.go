package ssl

import (
	"bytes"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/hop/backend/internal/config"
	"github.com/hop/backend/internal/database"
	"github.com/hop/backend/internal/logger"
	"github.com/hop/backend/internal/nginx"
)

var log = logger.WithTag("ssl")
var renewMutex sync.Mutex

// DNSProviderType DNS 提供商类型
type DNSProviderType string

const (
	DNSProviderAliDNS       DNSProviderType = "alidns"
	DNSProviderTencentCloud DNSProviderType = "tencentcloud"
	DNSProviderCloudflare   DNSProviderType = "cloudflare"
)

// DNSProviderConfig DNS 提供商配置接口
type DNSProviderConfig interface {
	GetEnvVars() map[string]string
	GetProviderName() string
}

// AliDNSConfig 阿里云 DNS 配置
type AliDNSConfig struct {
	AccessKeyID     string `json:"accessKeyId"`
	AccessKeySecret string `json:"accessKeySecret"`
	RegionID        string `json:"regionId,omitempty"` // 可选，默认 cn-hangzhou
}

func (c *AliDNSConfig) GetEnvVars() map[string]string {
	env := map[string]string{
		"ALICLOUD_ACCESS_KEY": c.AccessKeyID,
		"ALICLOUD_SECRET_KEY": c.AccessKeySecret,
	}
	if c.RegionID != "" {
		env["ALICLOUD_REGION_ID"] = c.RegionID
	}
	return env
}

func (c *AliDNSConfig) GetProviderName() string {
	return "alidns"
}

// TencentCloudConfig 腾讯云 DNS 配置
type TencentCloudConfig struct {
	SecretID  string `json:"secretId"`
	SecretKey string `json:"secretKey"`
}

func (c *TencentCloudConfig) GetEnvVars() map[string]string {
	return map[string]string{
		"TENCENTCLOUD_SECRET_ID":  c.SecretID,
		"TENCENTCLOUD_SECRET_KEY": c.SecretKey,
	}
}

func (c *TencentCloudConfig) GetProviderName() string {
	return "tencentcloud"
}

// CloudflareConfig Cloudflare DNS 配置
type CloudflareConfig struct {
	APIToken string `json:"apiToken,omitempty"` // 推荐使用 API Token
	Email    string `json:"email,omitempty"`    // 可选，使用 Global API Key 时需要
	APIKey   string `json:"apiKey,omitempty"`   // Global API Key (不推荐)
}

func (c *CloudflareConfig) GetEnvVars() map[string]string {
	env := map[string]string{}
	if c.APIToken != "" {
		env["CF_DNS_API_TOKEN"] = c.APIToken
	} else if c.APIKey != "" && c.Email != "" {
		env["CF_API_EMAIL"] = c.Email
		env["CF_API_KEY"] = c.APIKey
	}
	return env
}

func (c *CloudflareConfig) GetProviderName() string {
	return "cloudflare"
}

// ParseDNSProviderConfig 解析 DNS 提供商配置
func ParseDNSProviderConfig(providerType string, configJSON string) (DNSProviderConfig, error) {
	switch DNSProviderType(providerType) {
	case DNSProviderAliDNS:
		var cfg AliDNSConfig
		if err := json.Unmarshal([]byte(configJSON), &cfg); err != nil {
			return nil, fmt.Errorf("解析阿里云配置失败: %w", err)
		}
		return &cfg, nil
	case DNSProviderTencentCloud:
		var cfg TencentCloudConfig
		if err := json.Unmarshal([]byte(configJSON), &cfg); err != nil {
			return nil, fmt.Errorf("解析腾讯云配置失败: %w", err)
		}
		return &cfg, nil
	case DNSProviderCloudflare:
		var cfg CloudflareConfig
		if err := json.Unmarshal([]byte(configJSON), &cfg); err != nil {
			return nil, fmt.Errorf("解析 Cloudflare 配置失败: %w", err)
		}
		return &cfg, nil
	default:
		return nil, fmt.Errorf("不支持的 DNS 提供商类型: %s", providerType)
	}
}

// IssueCertificate 申请新证书
func IssueCertificate(domains []string, dnsProviderID string, email string) (*database.Certificate, error) {
	renewMutex.Lock()
	defer renewMutex.Unlock()

	if len(domains) == 0 {
		return nil, fmt.Errorf("至少需要一个域名")
	}

	// 获取 DNS 提供商配置
	provider, err := database.GetDNSProvider(dnsProviderID)
	if err != nil {
		return nil, fmt.Errorf("获取 DNS 提供商失败: %w", err)
	}

	providerConfig, err := ParseDNSProviderConfig(provider.Type, provider.Config)
	if err != nil {
		return nil, err
	}

	cfg := config.Get()
	paths := nginx.GetNginxPaths()
	sslDir := paths.SSLDir

	// 确保 SSL 目录存在
	if err := os.MkdirAll(sslDir, 0755); err != nil {
		return nil, fmt.Errorf("创建 SSL 目录失败: %w", err)
	}

	// 创建 lego 工作目录
	legoPath := filepath.Join(cfg.Data.Dir, "lego")
	if err := os.MkdirAll(legoPath, 0755); err != nil {
		return nil, fmt.Errorf("创建 lego 目录失败: %w", err)
	}

	// 主域名
	mainDomain := domains[0]

	// 构建 lego 命令
	args := []string{
		"--accept-tos",
		"--email", email,
		"--dns", providerConfig.GetProviderName(),
		"--path", legoPath,
		"--dns.disable-cp", // 禁用证书传播检查，避免 DNS 传播延迟问题
	}

	// 添加所有域名
	for _, domain := range domains {
		args = append(args, "--domains", domain)
	}

	args = append(args, "run")

	// 设置环境变量
	env := os.Environ()
	for k, v := range providerConfig.GetEnvVars() {
		env = append(env, fmt.Sprintf("%s=%s", k, v))
	}

	log.Info("开始申请证书", map[string]interface{}{
		"domains":  domains,
		"provider": provider.Type,
	})

	// 检查是否已存在该域名的证书（避免重复申请）
	existingCert, _ := database.GetCertificateByDomain(mainDomain)
	if existingCert != nil {
		log.Info("域名证书已存在，将先删除旧记录", map[string]interface{}{
			"domain": mainDomain,
		})
		// 删除数据库中的旧证书记录
		database.DeleteCertificate(existingCert.ID)

		// 删除旧的 lego 数据
		// 注意：通配符域名 *.example.com 在文件名中会变成 _.example.com
		certDomain := strings.Replace(mainDomain, "*", "_", -1)
		oldCertDir := filepath.Join(legoPath, "certificates")
		oldCertFile := filepath.Join(oldCertDir, certDomain+".crt")
		oldKeyFile := filepath.Join(oldCertDir, certDomain+".key")
		oldJsonFile := filepath.Join(oldCertDir, certDomain+".json")
		oldIssuerFile := filepath.Join(oldCertDir, certDomain+".issuer.crt")
		os.Remove(oldCertFile)
		os.Remove(oldKeyFile)
		os.Remove(oldJsonFile)
		os.Remove(oldIssuerFile)
	}

	// 执行 lego 命令
	cmd := exec.Command("lego", args...)
	cmd.Env = env

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		errMsg := stderr.String()
		if errMsg == "" {
			errMsg = stdout.String()
		}
		log.Error("申请证书失败", map[string]interface{}{
			"error":  err.Error(),
			"stderr": errMsg,
			"stdout": stdout.String(),
		})

		// 检查是否是 DNS 记录已存在的错误
		if strings.Contains(errMsg, "already exists") || strings.Contains(errMsg, "已存在") {
			return nil, fmt.Errorf("DNS 验证记录已存在，请稍后重试或手动清理 DNS 记录后再试")
		}

		// 检查是否是权限问题
		if strings.Contains(errMsg, "authentication") || strings.Contains(errMsg, "unauthorized") {
			return nil, fmt.Errorf("DNS API 认证失败，请检查 API 密钥是否正确")
		}

		// 检查是否是速率限制
		if strings.Contains(errMsg, "rate limit") || strings.Contains(errMsg, "too many") {
			return nil, fmt.Errorf("触发 Let's Encrypt 速率限制，请稍后再试")
		}

		return nil, fmt.Errorf("申请证书失败: %s", errMsg)
	}

	log.Info("证书申请成功", map[string]interface{}{
		"domains": domains,
		"output":  stdout.String(),
	})

	// 查找生成的证书文件
	// 注意：通配符域名 *.example.com 在文件名中会变成 _.example.com
	certDomain := strings.Replace(mainDomain, "*", "_", -1)
	certDir := filepath.Join(legoPath, "certificates")
	certFile := filepath.Join(certDir, certDomain+".crt")
	keyFile := filepath.Join(certDir, certDomain+".key")

	log.Info("查找证书文件", map[string]interface{}{
		"certFile": certFile,
		"keyFile":  keyFile,
	})

	// 检查文件是否存在
	if _, err := os.Stat(certFile); os.IsNotExist(err) {
		return nil, fmt.Errorf("证书文件未生成: %s", certFile)
	}
	if _, err := os.Stat(keyFile); os.IsNotExist(err) {
		return nil, fmt.Errorf("私钥文件未生成: %s", keyFile)
	}

	// 复制证书到 SSL 目录
	destCertFile := filepath.Join(sslDir, certDomain+".crt")
	destKeyFile := filepath.Join(sslDir, certDomain+".key")

	log.Info("复制证书到 SSL 目录", map[string]interface{}{
		"destCertFile": destCertFile,
		"destKeyFile":  destKeyFile,
	})

	if err := copyFile(certFile, destCertFile); err != nil {
		return nil, fmt.Errorf("复制证书文件失败: %w", err)
	}
	if err := copyFile(keyFile, destKeyFile); err != nil {
		return nil, fmt.Errorf("复制私钥文件失败: %w", err)
	}

	// 解析证书信息
	certInfo, err := ParseCertificate(destCertFile)
	if err != nil {
		return nil, fmt.Errorf("解析证书失败: %w", err)
	}

	// 计算相对于 data 目录的路径
	// 例如: /path/to/data/nginx/ssl/example.com.crt -> nginx/ssl/example.com.crt
	relCertPath, err := filepath.Rel(cfg.Data.Dir, destCertFile)
	if err != nil {
		relCertPath = destCertFile // 如果失败，回退使用绝对路径
	}
	relKeyPath, err := filepath.Rel(cfg.Data.Dir, destKeyFile)
	if err != nil {
		relKeyPath = destKeyFile
	}

	// 创建证书记录
	domainsJSON, _ := json.Marshal(domains)
	now := time.Now()

	cert := &database.Certificate{
		ID:            uuid.New().String(),
		Domain:        mainDomain,
		Domains:       string(domainsJSON),
		DNSProviderID: dnsProviderID,
		CertPath:      relCertPath,
		KeyPath:       relKeyPath,
		Issuer:        certInfo.Issuer,
		NotBefore:     certInfo.NotBefore,
		NotAfter:      certInfo.NotAfter,
		AutoRenew:     true,
		LastRenewAt:   &now,
		Status:        "active",
	}

	if err := database.CreateCertificate(cert); err != nil {
		return nil, fmt.Errorf("保存证书记录失败: %w", err)
	}

	// 记录日志
	logEntry := &database.CertificateLog{
		ID:            uuid.New().String(),
		CertificateID: cert.ID,
		Action:        "create",
		Message:       fmt.Sprintf("成功申请证书，有效期至 %s", cert.NotAfter.Format("2006-01-02")),
	}
	database.CreateCertificateLog(logEntry)

	return cert, nil
}

// RenewCertificate 续期证书
func RenewCertificate(certID string, email string) error {
	renewMutex.Lock()
	defer renewMutex.Unlock()

	cert, err := database.GetCertificate(certID)
	if err != nil {
		return fmt.Errorf("获取证书失败: %w", err)
	}

	provider, err := database.GetDNSProvider(cert.DNSProviderID)
	if err != nil {
		return fmt.Errorf("获取 DNS 提供商失败: %w", err)
	}

	providerConfig, err := ParseDNSProviderConfig(provider.Type, provider.Config)
	if err != nil {
		return err
	}

	cfg := config.Get()
	legoPath := filepath.Join(cfg.Data.Dir, "lego")

	// 解析域名列表
	var domains []string
	if err := json.Unmarshal([]byte(cert.Domains), &domains); err != nil {
		domains = []string{cert.Domain}
	}

	// 构建 lego 命令
	args := []string{
		"--accept-tos",
		"--email", email,
		"--dns", providerConfig.GetProviderName(),
		"--path", legoPath,
	}

	for _, domain := range domains {
		args = append(args, "--domains", domain)
	}

	args = append(args, "renew", "--days", "30", "--renew-hook", "echo 'Certificate renewed'")

	// 设置环境变量
	env := os.Environ()
	for k, v := range providerConfig.GetEnvVars() {
		env = append(env, fmt.Sprintf("%s=%s", k, v))
	}

	log.Info("开始续期证书", map[string]interface{}{
		"domain":   cert.Domain,
		"provider": provider.Type,
	})

	// 执行 lego 命令
	cmd := exec.Command("lego", args...)
	cmd.Env = env

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		errMsg := stderr.String()
		if errMsg == "" {
			errMsg = stdout.String()
		}

		// 检查是否是 "no renewal needed" 的情况
		if strings.Contains(errMsg, "no renewal") || strings.Contains(stdout.String(), "no renewal") {
			log.Info("证书无需续期", map[string]interface{}{
				"domain": cert.Domain,
			})
			return nil
		}

		log.Error("续期证书失败", map[string]interface{}{
			"error":  err.Error(),
			"stderr": errMsg,
			"stdout": stdout.String(),
		})

		// 检查是否是 DNS 记录已存在的错误
		if strings.Contains(errMsg, "already exists") || strings.Contains(errMsg, "已存在") {
			// 更新证书状态但不标记为 error（可以稍后重试）
			log.Warn("DNS 验证记录已存在，将在下次定时任务时重试", map[string]interface{}{
				"domain": cert.Domain,
			})
			return fmt.Errorf("DNS 验证记录已存在，请稍后自动重试")
		}

		// 检查是否是权限问题
		if strings.Contains(errMsg, "authentication") || strings.Contains(errMsg, "unauthorized") {
			errMsgPtr := "DNS API 认证失败"
			cert.Status = "error"
			cert.Error = &errMsgPtr
			database.UpdateCertificate(cert)

			logEntry := &database.CertificateLog{
				ID:            uuid.New().String(),
				CertificateID: cert.ID,
				Action:        "error",
				Message:       errMsgPtr,
			}
			database.CreateCertificateLog(logEntry)

			return fmt.Errorf("DNS API 认证失败，请检查 DNS 提供商配置")
		}

		// 更新证书状态
		errMsgPtr := errMsg
		cert.Status = "error"
		cert.Error = &errMsgPtr
		database.UpdateCertificate(cert)

		// 记录日志
		logEntry := &database.CertificateLog{
			ID:            uuid.New().String(),
			CertificateID: cert.ID,
			Action:        "error",
			Message:       fmt.Sprintf("续期失败: %s", errMsg),
		}
		database.CreateCertificateLog(logEntry)

		return fmt.Errorf("续期证书失败: %s", errMsg)
	}

	// 复制新证书到 SSL 目录
	// 通配符域名 *.example.com 在文件名中会变成 _.example.com
	certDomain := strings.Replace(cert.Domain, "*", "_", -1)
	certDir := filepath.Join(legoPath, "certificates")
	srcCertFile := filepath.Join(certDir, certDomain+".crt")
	srcKeyFile := filepath.Join(certDir, certDomain+".key")

	// 将相对路径转换为绝对路径
	destCertPath := filepath.Join(cfg.Data.Dir, cert.CertPath)
	destKeyPath := filepath.Join(cfg.Data.Dir, cert.KeyPath)

	if err := copyFile(srcCertFile, destCertPath); err != nil {
		return fmt.Errorf("复制证书文件失败: %w", err)
	}
	if err := copyFile(srcKeyFile, destKeyPath); err != nil {
		return fmt.Errorf("复制私钥文件失败: %w", err)
	}

	// 解析新证书信息
	certInfo, err := ParseCertificate(destCertPath)
	if err != nil {
		return fmt.Errorf("解析证书失败: %w", err)
	}

	// 更新证书记录
	now := time.Now()
	cert.NotBefore = certInfo.NotBefore
	cert.NotAfter = certInfo.NotAfter
	cert.Issuer = certInfo.Issuer
	cert.LastRenewAt = &now
	cert.Status = "active"
	cert.Error = nil

	if err := database.UpdateCertificate(cert); err != nil {
		return fmt.Errorf("更新证书记录失败: %w", err)
	}

	// 记录日志
	logEntry := &database.CertificateLog{
		ID:            uuid.New().String(),
		CertificateID: cert.ID,
		Action:        "renew",
		Message:       fmt.Sprintf("成功续期证书，有效期至 %s", cert.NotAfter.Format("2006-01-02")),
	}
	database.CreateCertificateLog(logEntry)

	log.Info("证书续期成功", map[string]interface{}{
		"domain":   cert.Domain,
		"notAfter": cert.NotAfter.Format("2006-01-02"),
	})

	return nil
}

// CertificateInfo 证书信息
type CertificateInfo struct {
	Subject   string
	Issuer    string
	NotBefore time.Time
	NotAfter  time.Time
	DNSNames  []string
}

// ParseCertificate 解析证书文件
func ParseCertificate(certPath string) (*CertificateInfo, error) {
	data, err := os.ReadFile(certPath)
	if err != nil {
		return nil, err
	}

	block, _ := pem.Decode(data)
	if block == nil {
		return nil, fmt.Errorf("无法解析 PEM 格式")
	}

	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return nil, err
	}

	return &CertificateInfo{
		Subject:   cert.Subject.CommonName,
		Issuer:    cert.Issuer.CommonName,
		NotBefore: cert.NotBefore,
		NotAfter:  cert.NotAfter,
		DNSNames:  cert.DNSNames,
	}, nil
}

// CheckAndRenewCertificates 检查并续期即将过期的证书
func CheckAndRenewCertificates(email string, days int) {
	certs, err := database.ListCertificatesExpiringSoon(days)
	if err != nil {
		log.Error("获取即将过期的证书失败", map[string]interface{}{
			"error": err.Error(),
		})
		return
	}

	if len(certs) == 0 {
		log.Info("没有需要续期的证书")
		return
	}

	log.Info("发现需要续期的证书", map[string]interface{}{
		"count": len(certs),
	})

	for _, cert := range certs {
		if err := RenewCertificate(cert.ID, email); err != nil {
			log.Error("证书续期失败", map[string]interface{}{
				"domain": cert.Domain,
				"error":  err.Error(),
			})
		}
	}
}

// copyFile 复制文件
func copyFile(src, dst string) error {
	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	return os.WriteFile(dst, data, 0600)
}

// CheckLegoInstalled 检查 lego 是否已安装
func CheckLegoInstalled() bool {
	_, err := exec.LookPath("lego")
	return err == nil
}

// GetLegoVersion 获取 lego 版本
func GetLegoVersion() string {
	cmd := exec.Command("lego", "--version")
	output, err := cmd.Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(output))
}

// CleanupDNSRecords 清理可能残留的 DNS 验证记录
// 注意：这个函数仅用于清理 _acme-challenge 记录，需要谨慎使用
func CleanupDNSRecords(domains []string, dnsProviderID string) error {
	provider, err := database.GetDNSProvider(dnsProviderID)
	if err != nil {
		return fmt.Errorf("获取 DNS 提供商失败: %w", err)
	}

	providerConfig, err := ParseDNSProviderConfig(provider.Type, provider.Config)
	if err != nil {
		return err
	}

	cfg := config.Get()
	legoPath := filepath.Join(cfg.Data.Dir, "lego")

	// 使用 lego 的 revoke 命令来清理（如果有旧证书的话）
	// 这会触发 DNS 记录的清理
	for _, domain := range domains {
		certFile := filepath.Join(legoPath, "certificates", domain+".crt")
		if _, err := os.Stat(certFile); err == nil {
			// 有旧证书，尝试撤销（这会清理 DNS 记录）
			args := []string{
				"--email", "cleanup@example.com",
				"--dns", providerConfig.GetProviderName(),
				"--path", legoPath,
				"revoke",
				"--cert", certFile,
			}

			env := os.Environ()
			for k, v := range providerConfig.GetEnvVars() {
				env = append(env, fmt.Sprintf("%s=%s", k, v))
			}

			cmd := exec.Command("lego", args...)
			cmd.Env = env

			// 忽略错误，因为证书可能已经过期或被撤销
			cmd.Run()
		}
	}

	return nil
}

// ForceCleanup 强制清理域名的所有 lego 数据
func ForceCleanup(domain string) error {
	cfg := config.Get()
	legoPath := filepath.Join(cfg.Data.Dir, "lego")
	certDir := filepath.Join(legoPath, "certificates")

	// 通配符域名 *.example.com 在文件名中会变成 _.example.com
	certDomain := strings.Replace(domain, "*", "_", -1)

	files := []string{
		filepath.Join(certDir, certDomain+".crt"),
		filepath.Join(certDir, certDomain+".key"),
		filepath.Join(certDir, certDomain+".json"),
		filepath.Join(certDir, certDomain+".issuer.crt"),
	}

	for _, file := range files {
		if err := os.Remove(file); err != nil && !os.IsNotExist(err) {
			log.Warn("删除文件失败", map[string]interface{}{
				"file":  file,
				"error": err.Error(),
			})
		}
	}

	log.Info("已清理域名的 lego 数据", map[string]interface{}{
		"domain":     domain,
		"certDomain": certDomain,
	})

	return nil
}
