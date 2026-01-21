package nginx

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"text/template"

	"github.com/hop/backend/internal/database"
)

// ProxySite 代理站点配置
type ProxySite struct {
	ID         string `json:"id"`                   // 唯一标识（文件名，不含扩展名）
	ServerName string `json:"serverName"`           // 域名
	ListenPort int    `json:"listenPort,omitempty"` // 监听端口，默认80
	SSL        bool   `json:"ssl"`                  // 是否启用 SSL
	SSLCert    string `json:"sslCert,omitempty"`    // SSL 证书路径
	SSLKey     string `json:"sslKey,omitempty"`     // SSL 私钥路径

	// 证书选择（新增）
	CertificateID string `json:"certificateId,omitempty"` // 关联的证书 ID

	// 上游配置
	UpstreamScheme string `json:"upstreamScheme"` // http 或 https
	UpstreamHost   string `json:"upstreamHost"`   // 上游主机名/IP
	UpstreamPort   int    `json:"upstreamPort"`   // 上游端口

	// 功能选项
	WebSocket bool `json:"websocket"` // 是否支持 WebSocket
}

// proxyTemplate 代理站点配置模板
const proxyTemplate = `# 由 Hop 自动生成，请勿手动修改
# 站点: {{.ServerName}}

server {
    listen {{if .SSL}}443 ssl{{else}}{{.ListenPort}}{{end}};
    server_name {{.ServerName}};
{{if .SSL}}
    ssl_certificate {{.SSLCert}};
    ssl_certificate_key {{.SSLKey}};
{{end}}
    location / {
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
{{if .SSL}}
# HTTP 重定向到 HTTPS
server {
    listen {{.ListenPort}};
    server_name {{.ServerName}};
    return 301 https://$server_name$request_uri;
}
{{end}}
`

// RenderProxySiteConfig 渲染代理站点配置
func RenderProxySiteConfig(site ProxySite) (string, error) {
	// 设置默认值
	if site.ListenPort == 0 {
		site.ListenPort = 80
	}

	tmpl, err := template.New("proxy").Parse(proxyTemplate)
	if err != nil {
		return "", fmt.Errorf("解析模板失败: %w", err)
	}

	var buf strings.Builder
	if err := tmpl.Execute(&buf, site); err != nil {
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

	// 渲染配置
	content, err := RenderProxySiteConfig(site)
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
