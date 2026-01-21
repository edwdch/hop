package ssl

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/hop/backend/internal/database"
)

// Router 创建 SSL 路由
func Router() chi.Router {
	r := chi.NewRouter()

	// DNS 提供商管理
	r.Get("/dns-providers", handleListDNSProviders)
	r.Post("/dns-providers", handleCreateDNSProvider)
	r.Get("/dns-providers/{id}", handleGetDNSProvider)
	r.Put("/dns-providers/{id}", handleUpdateDNSProvider)
	r.Delete("/dns-providers/{id}", handleDeleteDNSProvider)

	// 证书管理
	r.Get("/certificates", handleListCertificates)
	r.Post("/certificates", handleIssueCertificate)
	r.Get("/certificates/{id}", handleGetCertificate)
	r.Post("/certificates/{id}/renew", handleRenewCertificate)
	r.Post("/certificates/{id}/cleanup", handleCleanupCertificate)
	r.Delete("/certificates/{id}", handleDeleteCertificate)
	r.Get("/certificates/{id}/logs", handleGetCertificateLogs)

	// 系统信息
	r.Get("/status", handleGetStatus)

	return r
}

// === DNS 提供商 API ===

// DNSProviderRequest DNS 提供商请求
type DNSProviderRequest struct {
	Name   string          `json:"name"`
	Type   string          `json:"type"`
	Config json.RawMessage `json:"config"`
}

// DNSProviderResponse DNS 提供商响应
type DNSProviderResponse struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Type      string `json:"type"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

func handleListDNSProviders(w http.ResponseWriter, r *http.Request) {
	providers, err := database.ListDNSProviders()
	if err != nil {
		jsonError(w, "获取 DNS 提供商列表失败", http.StatusInternalServerError)
		return
	}

	// 不返回配置信息（安全考虑）
	response := make([]DNSProviderResponse, 0, len(providers))
	for _, p := range providers {
		response = append(response, DNSProviderResponse{
			ID:        p.ID,
			Name:      p.Name,
			Type:      p.Type,
			CreatedAt: p.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt: p.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	jsonResponse(w, map[string]interface{}{
		"providers": response,
	})
}

func handleCreateDNSProvider(w http.ResponseWriter, r *http.Request) {
	var req DNSProviderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "无效的请求格式", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		jsonError(w, "名称不能为空", http.StatusBadRequest)
		return
	}

	if req.Type == "" {
		jsonError(w, "类型不能为空", http.StatusBadRequest)
		return
	}

	// 验证提供商类型
	validTypes := []string{"alidns", "tencentcloud", "cloudflare"}
	isValid := false
	for _, t := range validTypes {
		if req.Type == t {
			isValid = true
			break
		}
	}
	if !isValid {
		jsonError(w, "不支持的 DNS 提供商类型", http.StatusBadRequest)
		return
	}

	// 验证配置格式
	if _, err := ParseDNSProviderConfig(req.Type, string(req.Config)); err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}

	provider := &database.DNSProvider{
		ID:     uuid.New().String(),
		Name:   req.Name,
		Type:   req.Type,
		Config: string(req.Config),
	}

	if err := database.CreateDNSProvider(provider); err != nil {
		jsonError(w, "创建 DNS 提供商失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]interface{}{
		"success": true,
		"id":      provider.ID,
	})
}

func handleGetDNSProvider(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	provider, err := database.GetDNSProvider(id)
	if err != nil {
		jsonError(w, "DNS 提供商不存在", http.StatusNotFound)
		return
	}

	// 不返回完整配置（安全考虑）
	jsonResponse(w, DNSProviderResponse{
		ID:        provider.ID,
		Name:      provider.Name,
		Type:      provider.Type,
		CreatedAt: provider.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt: provider.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	})
}

func handleUpdateDNSProvider(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req DNSProviderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "无效的请求格式", http.StatusBadRequest)
		return
	}

	provider, err := database.GetDNSProvider(id)
	if err != nil {
		jsonError(w, "DNS 提供商不存在", http.StatusNotFound)
		return
	}

	if req.Name != "" {
		provider.Name = req.Name
	}

	if req.Type != "" {
		provider.Type = req.Type
	}

	if len(req.Config) > 0 {
		// 验证配置格式
		if _, err := ParseDNSProviderConfig(provider.Type, string(req.Config)); err != nil {
			jsonError(w, err.Error(), http.StatusBadRequest)
			return
		}
		provider.Config = string(req.Config)
	}

	if err := database.UpdateDNSProvider(provider); err != nil {
		jsonError(w, "更新 DNS 提供商失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]bool{"success": true})
}

func handleDeleteDNSProvider(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	if err := database.DeleteDNSProvider(id); err != nil {
		jsonError(w, "删除 DNS 提供商失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]bool{"success": true})
}

// === 证书 API ===

// IssueCertificateRequest 申请证书请求
type IssueCertificateRequest struct {
	Domains       []string `json:"domains"`
	DNSProviderID string   `json:"dnsProviderId"`
	Email         string   `json:"email"`
}

// CertificateResponse 证书响应
type CertificateResponse struct {
	ID            string   `json:"id"`
	Domain        string   `json:"domain"`
	Domains       []string `json:"domains"`
	DNSProviderID string   `json:"dnsProviderId"`
	CertPath      string   `json:"certPath"`
	KeyPath       string   `json:"keyPath"`
	Issuer        string   `json:"issuer"`
	NotBefore     string   `json:"notBefore"`
	NotAfter      string   `json:"notAfter"`
	AutoRenew     bool     `json:"autoRenew"`
	LastRenewAt   *string  `json:"lastRenewAt"`
	Status        string   `json:"status"`
	Error         *string  `json:"error"`
	DaysRemaining int      `json:"daysRemaining"`
	CreatedAt     string   `json:"createdAt"`
	UpdatedAt     string   `json:"updatedAt"`
}

func handleListCertificates(w http.ResponseWriter, r *http.Request) {
	certs, err := database.ListCertificates()
	if err != nil {
		jsonError(w, "获取证书列表失败", http.StatusInternalServerError)
		return
	}

	response := make([]CertificateResponse, 0, len(certs))
	for _, c := range certs {
		response = append(response, certToResponse(&c))
	}

	jsonResponse(w, map[string]interface{}{
		"certificates": response,
	})
}

func handleIssueCertificate(w http.ResponseWriter, r *http.Request) {
	var req IssueCertificateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "无效的请求格式", http.StatusBadRequest)
		return
	}

	if len(req.Domains) == 0 {
		jsonError(w, "至少需要一个域名", http.StatusBadRequest)
		return
	}

	if req.DNSProviderID == "" {
		jsonError(w, "DNS 提供商不能为空", http.StatusBadRequest)
		return
	}

	if req.Email == "" {
		jsonError(w, "邮箱不能为空", http.StatusBadRequest)
		return
	}

	// 检查 lego 是否已安装
	if !CheckLegoInstalled() {
		jsonError(w, "lego 未安装，请先运行: go install github.com/go-acme/lego/v4/cmd/lego@latest", http.StatusInternalServerError)
		return
	}

	cert, err := IssueCertificate(req.Domains, req.DNSProviderID, req.Email)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]interface{}{
		"success":     true,
		"certificate": certToResponse(cert),
	})
}

func handleGetCertificate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	cert, err := database.GetCertificate(id)
	if err != nil {
		jsonError(w, "证书不存在", http.StatusNotFound)
		return
	}

	jsonResponse(w, certToResponse(cert))
}

// RenewCertificateRequest 续期证书请求
type RenewCertificateRequest struct {
	Email string `json:"email"`
}

func handleRenewCertificate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req RenewCertificateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "无效的请求格式", http.StatusBadRequest)
		return
	}

	if req.Email == "" {
		jsonError(w, "邮箱不能为空", http.StatusBadRequest)
		return
	}

	// 检查 lego 是否已安装
	if !CheckLegoInstalled() {
		jsonError(w, "lego 未安装，请先运行: go install github.com/go-acme/lego/v4/cmd/lego@latest", http.StatusInternalServerError)
		return
	}

	if err := RenewCertificate(id, req.Email); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 获取更新后的证书信息
	cert, _ := database.GetCertificate(id)

	jsonResponse(w, map[string]interface{}{
		"success":     true,
		"certificate": certToResponse(cert),
	})
}

func handleCleanupCertificate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	cert, err := database.GetCertificate(id)
	if err != nil {
		jsonError(w, "证书不存在", http.StatusNotFound)
		return
	}

	// 强制清理 lego 数据
	if err := ForceCleanup(cert.Domain); err != nil {
		jsonError(w, "清理失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 记录日志
	logEntry := &database.CertificateLog{
		ID:            uuid.New().String(),
		CertificateID: cert.ID,
		Action:        "cleanup",
		Message:       "已清理 lego 数据，可以重新申请证书",
	}
	database.CreateCertificateLog(logEntry)

	jsonResponse(w, map[string]bool{"success": true})
}

func handleDeleteCertificate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	if err := database.DeleteCertificate(id); err != nil {
		jsonError(w, "删除证书失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]bool{"success": true})
}

// CertificateLogResponse 证书日志响应
type CertificateLogResponse struct {
	ID        string `json:"id"`
	Action    string `json:"action"`
	Message   string `json:"message"`
	CreatedAt string `json:"createdAt"`
}

func handleGetCertificateLogs(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	logs, err := database.GetCertificateLogs(id, 50)
	if err != nil {
		jsonError(w, "获取日志失败", http.StatusInternalServerError)
		return
	}

	response := make([]CertificateLogResponse, 0, len(logs))
	for _, l := range logs {
		response = append(response, CertificateLogResponse{
			ID:        l.ID,
			Action:    l.Action,
			Message:   l.Message,
			CreatedAt: l.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	jsonResponse(w, map[string]interface{}{
		"logs": response,
	})
}

// === 系统状态 API ===

// StatusResponse 系统状态响应
type StatusResponse struct {
	LegoInstalled bool   `json:"legoInstalled"`
	LegoVersion   string `json:"legoVersion"`
}

func handleGetStatus(w http.ResponseWriter, r *http.Request) {
	installed := CheckLegoInstalled()
	version := ""
	if installed {
		version = GetLegoVersion()
	}

	jsonResponse(w, StatusResponse{
		LegoInstalled: installed,
		LegoVersion:   version,
	})
}

// === 辅助函数 ===

func certToResponse(c *database.Certificate) CertificateResponse {
	var domains []string
	json.Unmarshal([]byte(c.Domains), &domains)

	var lastRenewAt *string
	if c.LastRenewAt != nil {
		t := c.LastRenewAt.Format("2006-01-02T15:04:05Z07:00")
		lastRenewAt = &t
	}

	// 计算剩余天数
	daysRemaining := int(c.NotAfter.Sub(time.Now()).Hours() / 24)
	if daysRemaining < 0 {
		daysRemaining = 0
	}

	return CertificateResponse{
		ID:            c.ID,
		Domain:        c.Domain,
		Domains:       domains,
		DNSProviderID: c.DNSProviderID,
		CertPath:      c.CertPath,
		KeyPath:       c.KeyPath,
		Issuer:        c.Issuer,
		NotBefore:     c.NotBefore.Format("2006-01-02T15:04:05Z07:00"),
		NotAfter:      c.NotAfter.Format("2006-01-02T15:04:05Z07:00"),
		AutoRenew:     c.AutoRenew,
		LastRenewAt:   lastRenewAt,
		Status:        c.Status,
		Error:         c.Error,
		DaysRemaining: daysRemaining,
		CreatedAt:     c.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:     c.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

func jsonResponse(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func jsonError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"error":   message,
		"success": false,
	})
}
