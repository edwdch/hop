package database

import (
	"time"
)

// DNSProvider DNS 提供商配置
type DNSProvider struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`   // 显示名称
	Type      string    `json:"type"`   // alidns, tencentcloud, cloudflare
	Config    string    `json:"config"` // JSON 配置 (加密存储)
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Certificate SSL 证书
type Certificate struct {
	ID            string     `json:"id"`
	Domain        string     `json:"domain"`        // 主域名
	Domains       string     `json:"domains"`       // 所有域名 (JSON 数组)
	DNSProviderID string     `json:"dnsProviderId"` // DNS 提供商 ID
	CertPath      string     `json:"certPath"`      // 证书文件路径
	KeyPath       string     `json:"keyPath"`       // 私钥文件路径
	Issuer        string     `json:"issuer"`        // 颁发者
	NotBefore     time.Time  `json:"notBefore"`     // 生效时间
	NotAfter      time.Time  `json:"notAfter"`      // 过期时间
	AutoRenew     bool       `json:"autoRenew"`     // 是否自动续期
	LastRenewAt   *time.Time `json:"lastRenewAt"`   // 最后续期时间
	Status        string     `json:"status"`        // pending, active, expired, error
	Error         *string    `json:"error"`         // 错误信息
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
}

// CertificateLog 证书操作日志
type CertificateLog struct {
	ID            string    `json:"id"`
	CertificateID string    `json:"certificateId"`
	Action        string    `json:"action"` // create, renew, error
	Message       string    `json:"message"`
	CreatedAt     time.Time `json:"createdAt"`
}

// CreateDNSProvider 创建 DNS 提供商
func CreateDNSProvider(provider *DNSProvider) error {
	now := time.Now()
	provider.CreatedAt = now
	provider.UpdatedAt = now

	_, err := db.Exec(`
		INSERT INTO dns_provider (id, name, type, config, createdAt, updatedAt)
		VALUES (?, ?, ?, ?, ?, ?)
	`, provider.ID, provider.Name, provider.Type, provider.Config, now.Format(time.RFC3339), now.Format(time.RFC3339))
	return err
}

// UpdateDNSProvider 更新 DNS 提供商
func UpdateDNSProvider(provider *DNSProvider) error {
	now := time.Now()
	provider.UpdatedAt = now

	_, err := db.Exec(`
		UPDATE dns_provider SET name = ?, type = ?, config = ?, updatedAt = ?
		WHERE id = ?
	`, provider.Name, provider.Type, provider.Config, now.Format(time.RFC3339), provider.ID)
	return err
}

// GetDNSProvider 获取 DNS 提供商
func GetDNSProvider(id string) (*DNSProvider, error) {
	var provider DNSProvider
	var createdAt, updatedAt string

	err := db.QueryRow(`
		SELECT id, name, type, config, createdAt, updatedAt
		FROM dns_provider WHERE id = ?
	`, id).Scan(&provider.ID, &provider.Name, &provider.Type, &provider.Config, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}

	provider.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	provider.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
	return &provider, nil
}

// ListDNSProviders 获取所有 DNS 提供商
func ListDNSProviders() ([]DNSProvider, error) {
	rows, err := db.Query(`
		SELECT id, name, type, config, createdAt, updatedAt
		FROM dns_provider ORDER BY createdAt DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var providers []DNSProvider
	for rows.Next() {
		var provider DNSProvider
		var createdAt, updatedAt string

		if err := rows.Scan(&provider.ID, &provider.Name, &provider.Type, &provider.Config, &createdAt, &updatedAt); err != nil {
			continue
		}

		provider.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
		provider.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
		providers = append(providers, provider)
	}

	return providers, nil
}

// DeleteDNSProvider 删除 DNS 提供商
func DeleteDNSProvider(id string) error {
	_, err := db.Exec(`DELETE FROM dns_provider WHERE id = ?`, id)
	return err
}

// CreateCertificate 创建证书记录
func CreateCertificate(cert *Certificate) error {
	now := time.Now()
	cert.CreatedAt = now
	cert.UpdatedAt = now

	var lastRenewAt *string
	if cert.LastRenewAt != nil {
		t := cert.LastRenewAt.Format(time.RFC3339)
		lastRenewAt = &t
	}

	_, err := db.Exec(`
		INSERT INTO certificate (id, domain, domains, dnsProviderId, certPath, keyPath, issuer, notBefore, notAfter, autoRenew, lastRenewAt, status, error, createdAt, updatedAt)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, cert.ID, cert.Domain, cert.Domains, cert.DNSProviderID, cert.CertPath, cert.KeyPath, cert.Issuer,
		cert.NotBefore.Format(time.RFC3339), cert.NotAfter.Format(time.RFC3339),
		cert.AutoRenew, lastRenewAt, cert.Status, cert.Error,
		now.Format(time.RFC3339), now.Format(time.RFC3339))
	return err
}

// UpdateCertificate 更新证书记录
func UpdateCertificate(cert *Certificate) error {
	now := time.Now()
	cert.UpdatedAt = now

	var lastRenewAt *string
	if cert.LastRenewAt != nil {
		t := cert.LastRenewAt.Format(time.RFC3339)
		lastRenewAt = &t
	}

	_, err := db.Exec(`
		UPDATE certificate SET domain = ?, domains = ?, dnsProviderId = ?, certPath = ?, keyPath = ?, issuer = ?, notBefore = ?, notAfter = ?, autoRenew = ?, lastRenewAt = ?, status = ?, error = ?, updatedAt = ?
		WHERE id = ?
	`, cert.Domain, cert.Domains, cert.DNSProviderID, cert.CertPath, cert.KeyPath, cert.Issuer,
		cert.NotBefore.Format(time.RFC3339), cert.NotAfter.Format(time.RFC3339),
		cert.AutoRenew, lastRenewAt, cert.Status, cert.Error,
		now.Format(time.RFC3339), cert.ID)
	return err
}

// GetCertificate 获取证书
func GetCertificate(id string) (*Certificate, error) {
	var cert Certificate
	var notBefore, notAfter, createdAt, updatedAt string
	var lastRenewAt *string

	err := db.QueryRow(`
		SELECT id, domain, domains, dnsProviderId, certPath, keyPath, issuer, notBefore, notAfter, autoRenew, lastRenewAt, status, error, createdAt, updatedAt
		FROM certificate WHERE id = ?
	`, id).Scan(&cert.ID, &cert.Domain, &cert.Domains, &cert.DNSProviderID, &cert.CertPath, &cert.KeyPath, &cert.Issuer,
		&notBefore, &notAfter, &cert.AutoRenew, &lastRenewAt, &cert.Status, &cert.Error, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}

	cert.NotBefore, _ = time.Parse(time.RFC3339, notBefore)
	cert.NotAfter, _ = time.Parse(time.RFC3339, notAfter)
	cert.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	cert.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
	if lastRenewAt != nil {
		t, _ := time.Parse(time.RFC3339, *lastRenewAt)
		cert.LastRenewAt = &t
	}

	return &cert, nil
}

// GetCertificateByDomain 根据域名获取证书
func GetCertificateByDomain(domain string) (*Certificate, error) {
	var cert Certificate
	var notBefore, notAfter, createdAt, updatedAt string
	var lastRenewAt *string

	err := db.QueryRow(`
		SELECT id, domain, domains, dnsProviderId, certPath, keyPath, issuer, notBefore, notAfter, autoRenew, lastRenewAt, status, error, createdAt, updatedAt
		FROM certificate WHERE domain = ?
	`, domain).Scan(&cert.ID, &cert.Domain, &cert.Domains, &cert.DNSProviderID, &cert.CertPath, &cert.KeyPath, &cert.Issuer,
		&notBefore, &notAfter, &cert.AutoRenew, &lastRenewAt, &cert.Status, &cert.Error, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}

	cert.NotBefore, _ = time.Parse(time.RFC3339, notBefore)
	cert.NotAfter, _ = time.Parse(time.RFC3339, notAfter)
	cert.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	cert.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
	if lastRenewAt != nil {
		t, _ := time.Parse(time.RFC3339, *lastRenewAt)
		cert.LastRenewAt = &t
	}

	return &cert, nil
}

// ListCertificates 获取所有证书
func ListCertificates() ([]Certificate, error) {
	rows, err := db.Query(`
		SELECT id, domain, domains, dnsProviderId, certPath, keyPath, issuer, notBefore, notAfter, autoRenew, lastRenewAt, status, error, createdAt, updatedAt
		FROM certificate ORDER BY createdAt DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var certs []Certificate
	for rows.Next() {
		var cert Certificate
		var notBefore, notAfter, createdAt, updatedAt string
		var lastRenewAt *string

		if err := rows.Scan(&cert.ID, &cert.Domain, &cert.Domains, &cert.DNSProviderID, &cert.CertPath, &cert.KeyPath, &cert.Issuer,
			&notBefore, &notAfter, &cert.AutoRenew, &lastRenewAt, &cert.Status, &cert.Error, &createdAt, &updatedAt); err != nil {
			continue
		}

		cert.NotBefore, _ = time.Parse(time.RFC3339, notBefore)
		cert.NotAfter, _ = time.Parse(time.RFC3339, notAfter)
		cert.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
		cert.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
		if lastRenewAt != nil {
			t, _ := time.Parse(time.RFC3339, *lastRenewAt)
			cert.LastRenewAt = &t
		}

		certs = append(certs, cert)
	}

	return certs, nil
}

// ListCertificatesExpiringSoon 获取即将过期的证书
func ListCertificatesExpiringSoon(days int) ([]Certificate, error) {
	threshold := time.Now().AddDate(0, 0, days)

	rows, err := db.Query(`
		SELECT id, domain, domains, dnsProviderId, certPath, keyPath, issuer, notBefore, notAfter, autoRenew, lastRenewAt, status, error, createdAt, updatedAt
		FROM certificate 
		WHERE status = 'active' AND autoRenew = 1 AND notAfter <= ?
		ORDER BY notAfter ASC
	`, threshold.Format(time.RFC3339))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var certs []Certificate
	for rows.Next() {
		var cert Certificate
		var notBefore, notAfter, createdAt, updatedAt string
		var lastRenewAt *string

		if err := rows.Scan(&cert.ID, &cert.Domain, &cert.Domains, &cert.DNSProviderID, &cert.CertPath, &cert.KeyPath, &cert.Issuer,
			&notBefore, &notAfter, &cert.AutoRenew, &lastRenewAt, &cert.Status, &cert.Error, &createdAt, &updatedAt); err != nil {
			continue
		}

		cert.NotBefore, _ = time.Parse(time.RFC3339, notBefore)
		cert.NotAfter, _ = time.Parse(time.RFC3339, notAfter)
		cert.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
		cert.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
		if lastRenewAt != nil {
			t, _ := time.Parse(time.RFC3339, *lastRenewAt)
			cert.LastRenewAt = &t
		}

		certs = append(certs, cert)
	}

	return certs, nil
}

// DeleteCertificate 删除证书
func DeleteCertificate(id string) error {
	_, err := db.Exec(`DELETE FROM certificate WHERE id = ?`, id)
	return err
}

// CreateCertificateLog 创建证书日志
func CreateCertificateLog(logEntry *CertificateLog) error {
	now := time.Now()
	logEntry.CreatedAt = now

	_, err := db.Exec(`
		INSERT INTO certificate_log (id, certificateId, action, message, createdAt)
		VALUES (?, ?, ?, ?, ?)
	`, logEntry.ID, logEntry.CertificateID, logEntry.Action, logEntry.Message, now.Format(time.RFC3339))
	return err
}

// GetCertificateLogs 获取证书日志
func GetCertificateLogs(certificateID string, limit int) ([]CertificateLog, error) {
	rows, err := db.Query(`
		SELECT id, certificateId, action, message, createdAt
		FROM certificate_log 
		WHERE certificateId = ?
		ORDER BY createdAt DESC
		LIMIT ?
	`, certificateID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []CertificateLog
	for rows.Next() {
		var logEntry CertificateLog
		var createdAt string

		if err := rows.Scan(&logEntry.ID, &logEntry.CertificateID, &logEntry.Action, &logEntry.Message, &createdAt); err != nil {
			continue
		}

		logEntry.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
		logs = append(logs, logEntry)
	}

	return logs, nil
}
