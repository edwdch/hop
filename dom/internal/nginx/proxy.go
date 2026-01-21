package nginx

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"text/template"

	"github.com/hop/backend/internal/config"
	"github.com/hop/backend/internal/database"
)

// ProxySite 代理站点配置
type ProxySite struct {
	ID         string `json:"id"`                // 唯一标识（文件名，不含扩展名）
	ServerName string `json:"serverName"`        // 域名
	SSL        bool   `json:"ssl"`               // 是否启用 SSL
	SSLCert    string `json:"sslCert,omitempty"` // SSL 证书路径
	SSLKey     string `json:"sslKey,omitempty"`  // SSL 私钥路径

	// 证书选择（新增）
	CertificateID string `json:"certificateId,omitempty"` // 关联的证书 ID

	// 上游配置
	UpstreamScheme string `json:"upstreamScheme"` // http 或 https
	UpstreamHost   string `json:"upstreamHost"`   // 上游主机名/IP
	UpstreamPort   int    `json:"upstreamPort"`   // 上游端口

	// 功能选项
	WebSocket bool `json:"websocket"` // 是否支持 WebSocket

	// 认证配置（登录 URL 和 Cookie 域名从全局配置读取）
	AuthEnabled bool `json:"authEnabled"` // 是否启用访问认证
}

// proxyTemplateData 用于模板渲染的数据结构
type proxyTemplateData struct {
	ProxySite
	AuthLoginURL     string // 从全局配置读取
	AuthCookieDomain string // 从全局配置读取，如果为空则自动从站点域名提取
}

// proxyTemplate 代理站点配置模板
const proxyTemplate = `# 由 Hop 自动生成，请勿手动修改
# 站点: {{.ServerName}}
{{if .AuthEnabled}}
# 认证配置
location = /auth-validate {
    internal;
    proxy_pass http://127.0.0.1:3000/api/auth/nginx;
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $http_host;
    proxy_set_header X-Forwarded-URI $request_uri;
}

error_page 401 = @error401;
location @error401 {
    return 302 {{.AuthLoginURL}}?redirect_uri=$scheme://$http_host$request_uri;
}
{{end}}
server {
    listen 444{{if .SSL}} ssl{{end}};
    server_name {{.ServerName}};
{{if .SSL}}
    ssl_certificate {{.SSLCert}};
    ssl_certificate_key {{.SSLKey}};
{{end}}
    location / {
{{if .AuthEnabled}}
        auth_request /auth-validate;
{{end}}
        proxy_pass {{.UpstreamScheme}}://{{.UpstreamHost}}:{{.UpstreamPort}};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
{{if .WebSocket}}
        # WebSocket 支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
{{end}}
    }
}
`

// extractParentDomain 从域名提取父域名
// 例如: app.example.com -> .example.com
//
//	sub.app.example.com -> .example.com
//	localhost -> "" (本地开发不需要 Domain)
func extractParentDomain(serverName string) string {
	// localhost 或 IP 地址不设置 Domain
	if serverName == "localhost" || net.ParseIP(serverName) != nil {
		return ""
	}

	parts := strings.Split(serverName, ".")
	if len(parts) <= 2 {
		// 顶级域名，如 example.com，返回带点的形式
		return "." + serverName
	}

	// 提取后两段作为父域名: .example.com
	return "." + strings.Join(parts[len(parts)-2:], ".")
}

// RenderProxySiteConfig 渲染代理站点配置
func RenderProxySiteConfig(site ProxySite) (string, error) {
	return renderProxySiteConfigWithAuth(site, "", "")
}

// renderProxySiteConfigWithAuth 渲染代理站点配置（带认证信息）
func renderProxySiteConfigWithAuth(site ProxySite, authLoginURL, authCookieDomain string) (string, error) {
	tmpl, err := template.New("proxy").Parse(proxyTemplate)
	if err != nil {
		return "", fmt.Errorf("解析模板失败: %w", err)
	}

	// 构建模板数据
	data := proxyTemplateData{
		ProxySite:        site,
		AuthLoginURL:     authLoginURL,
		AuthCookieDomain: authCookieDomain,
	}

	var buf strings.Builder
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("渲染模板失败: %w", err)
	}

	return buf.String(), nil
}

// SaveProxySite 保存代理站点配置
func SaveProxySite(site ProxySite) error {
	// 验证必填字段
	if site.ID == "" {
		return fmt.Errorf("站点ID不能为空")
	}
	if site.ServerName == "" {
		return fmt.Errorf("域名不能为空")
	}
	if site.UpstreamHost == "" {
		return fmt.Errorf("上游主机不能为空")
	}
	if site.UpstreamPort == 0 {
		return fmt.Errorf("上游端口不能为空")
	}
	if site.UpstreamScheme == "" {
		site.UpstreamScheme = "http"
	}

	// 获取认证相关的全局配置
	var authLoginURL, authCookieDomain string
	if site.AuthEnabled {
		cfg := config.Get()
		authLoginURL = cfg.Auth.ProxyLoginURL
		authCookieDomain = cfg.Auth.ProxyCookieDomain

		// 验证登录 URL 必填
		if authLoginURL == "" {
			return fmt.Errorf("启用认证时必须在系统设置中配置登录页 URL")
		}
		// 自动提取 Cookie 域名（如果全局配置未指定）
		if authCookieDomain == "" {
			authCookieDomain = extractParentDomain(site.ServerName)
		}
	}

	// 如果启用 SSL 且指定了证书 ID，从数据库获取证书路径
	if site.SSL && site.CertificateID != "" {
		cert, err := database.GetCertificate(site.CertificateID)
		if err != nil {
			return fmt.Errorf("获取证书失败: %w", err)
		}
		// 验证证书状态
		if cert.Status != "active" {
			return fmt.Errorf("证书状态无效: %s，请选择有效的证书", cert.Status)
		}
		// 数据库中存储的路径是相对于 data 目录的，例如: nginx/ssl/example.com.crt
		// Nginx 配置中需要相对于 nginx 目录的路径，例如: ssl/example.com.crt
		// 所以需要去掉 "nginx/" 前缀
		site.SSLCert = strings.TrimPrefix(cert.CertPath, "nginx/")
		site.SSLKey = strings.TrimPrefix(cert.KeyPath, "nginx/")
	}

	// 渲染配置（使用认证信息）
	content, err := renderProxySiteConfigWithAuth(site, authLoginURL, authCookieDomain)
	if err != nil {
		return err
	}

	// 保存配置文件
	paths := GetNginxPaths()
	filePath := filepath.Join(paths.ConfigsDir, site.ID+".conf")

	// 同时保存元数据（用于读取时恢复配置）
	metaPath := filepath.Join(paths.ConfigsDir, "."+site.ID+".json")
	metaData, err := json.MarshalIndent(site, "", "  ")
	if err != nil {
		return fmt.Errorf("序列化元数据失败: %w", err)
	}

	// 确保目录存在
	if err := os.MkdirAll(paths.ConfigsDir, 0755); err != nil {
		return fmt.Errorf("创建目录失败: %w", err)
	}

	// 写入配置文件
	if err := os.WriteFile(filePath, []byte(content), 0644); err != nil {
		return fmt.Errorf("保存配置文件失败: %w", err)
	}

	// 写入元数据文件
	if err := os.WriteFile(metaPath, metaData, 0644); err != nil {
		return fmt.Errorf("保存元数据失败: %w", err)
	}

	log.Info("代理站点已保存", map[string]interface{}{"id": site.ID, "serverName": site.ServerName})
	return nil
}

// GetProxySite 获取代理站点配置
func GetProxySite(id string) (*ProxySite, error) {
	paths := GetNginxPaths()
	metaPath := filepath.Join(paths.ConfigsDir, "."+id+".json")

	data, err := os.ReadFile(metaPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("站点不存在")
		}
		return nil, fmt.Errorf("读取元数据失败: %w", err)
	}

	var site ProxySite
	if err := json.Unmarshal(data, &site); err != nil {
		return nil, fmt.Errorf("解析元数据失败: %w", err)
	}

	return &site, nil
}

// ListProxySites 列出所有代理站点
func ListProxySites() ([]ProxySite, error) {
	paths := GetNginxPaths()
	entries, err := os.ReadDir(paths.ConfigsDir)
	if err != nil {
		if os.IsNotExist(err) {
			return []ProxySite{}, nil
		}
		return nil, fmt.Errorf("读取目录失败: %w", err)
	}

	var sites []ProxySite
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		// 只处理隐藏的元数据文件
		if strings.HasPrefix(name, ".") && strings.HasSuffix(name, ".json") {
			id := strings.TrimPrefix(strings.TrimSuffix(name, ".json"), ".")
			site, err := GetProxySite(id)
			if err != nil {
				continue
			}
			sites = append(sites, *site)
		}
	}

	return sites, nil
}

// DeleteProxySite 删除代理站点
func DeleteProxySite(id string) error {
	paths := GetNginxPaths()
	confPath := filepath.Join(paths.ConfigsDir, id+".conf")
	metaPath := filepath.Join(paths.ConfigsDir, "."+id+".json")

	// 删除配置文件
	if err := os.Remove(confPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("删除配置文件失败: %w", err)
	}

	// 删除元数据文件
	if err := os.Remove(metaPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("删除元数据失败: %w", err)
	}

	log.Info("代理站点已删除", map[string]interface{}{"id": id})
	return nil
}

// ===== HTTP Handlers =====

// handleListProxySites 列出所有代理站点
func handleListProxySites(w http.ResponseWriter, r *http.Request) {
	sites, err := ListProxySites()
	if err != nil {
		jsonError(w, "获取站点列表失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]interface{}{
		"sites": sites,
	})
}

// handleGetProxySite 获取单个代理站点
func handleGetProxySite(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		jsonError(w, "缺少站点ID", http.StatusBadRequest)
		return
	}

	site, err := GetProxySite(id)
	if err != nil {
		jsonError(w, err.Error(), http.StatusNotFound)
		return
	}

	jsonResponse(w, site)
}

// handleSaveProxySite 保存代理站点
func handleSaveProxySite(w http.ResponseWriter, r *http.Request) {
	var site ProxySite
	if err := json.NewDecoder(r.Body).Decode(&site); err != nil {
		jsonError(w, "无效的请求体", http.StatusBadRequest)
		return
	}

	if err := SaveProxySite(site); err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}

	jsonResponse(w, map[string]interface{}{
		"success": true,
		"id":      site.ID,
	})
}

// handleDeleteProxySite 删除代理站点
func handleDeleteProxySite(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		jsonError(w, "缺少站点ID", http.StatusBadRequest)
		return
	}

	if err := DeleteProxySite(id); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]bool{"success": true})
}

// handlePreviewProxySite 预览代理站点配置
func handlePreviewProxySite(w http.ResponseWriter, r *http.Request) {
	var site ProxySite
	if err := json.NewDecoder(r.Body).Decode(&site); err != nil {
		jsonError(w, "无效的请求体", http.StatusBadRequest)
		return
	}

	content, err := RenderProxySiteConfig(site)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}

	jsonResponse(w, map[string]string{
		"content": content,
	})
}
