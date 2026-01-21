package nginx

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"text/template"

	"github.com/hop/backend/internal/config"
)

// TemplateParams nginx.conf 模板可自定义参数
type TemplateParams struct {
	WorkerProcesses   string `json:"workerProcesses" toml:"worker_processes"`       // auto 或具体数字
	WorkerConnections int    `json:"workerConnections" toml:"worker_connections"`   // 每个 worker 的最大连接数
	Keepalive         int    `json:"keepalive" toml:"keepalive"`                    // keepalive 超时秒数
	ClientMaxBodySize string `json:"clientMaxBodySize" toml:"client_max_body_size"` // 客户端最大请求体
	Gzip              bool   `json:"gzip" toml:"gzip"`                              // 是否启用 gzip
	ServerTokens      bool   `json:"serverTokens" toml:"server_tokens"`             // 是否显示 nginx 版本
}

// FullTemplateParams 完整模板参数（包含 stream 路由）
type FullTemplateParams struct {
	TemplateParams
	StreamRoutes []StreamRoute // SNI 路由规则列表
}

// DefaultTemplateParams 返回默认的模板参数
func DefaultTemplateParams() TemplateParams {
	return TemplateParams{
		WorkerProcesses:   "auto",
		WorkerConnections: 1024,
		Keepalive:         65,
		ClientMaxBodySize: "100m",
		Gzip:              true,
		ServerTokens:      false,
	}
}

// LoadTemplateParams 从配置中加载模板参数
func LoadTemplateParams() TemplateParams {
	cfg := config.Get()
	return TemplateParams{
		WorkerProcesses:   cfg.Nginx.WorkerProcesses,
		WorkerConnections: cfg.Nginx.WorkerConnections,
		Keepalive:         cfg.Nginx.Keepalive,
		ClientMaxBodySize: cfg.Nginx.ClientMaxBodySize,
		Gzip:              cfg.Nginx.Gzip,
		ServerTokens:      cfg.Nginx.ServerTokens,
	}
}

// NginxPaths 返回 nginx 相关的路径配置
type NginxPaths struct {
	// 根目录，所有其他路径都基于此
	BaseDir string
	// nginx.conf 输出路径
	ConfigPath string
	// 站点配置目录
	ConfigsDir string
	// SSL 证书目录
	SSLDir string
}

// GetNginxPaths 获取 nginx 相关路径
func GetNginxPaths() NginxPaths {
	cfg := config.Get()
	baseDir := filepath.Join(cfg.Data.Dir, "nginx")

	return NginxPaths{
		BaseDir:    baseDir,
		ConfigPath: filepath.Join(baseDir, "nginx.conf"),
		ConfigsDir: filepath.Join(baseDir, "conf.d"),
		SSLDir:     filepath.Join(baseDir, "ssl"),
	}
}

// EnsureNginxDirs 确保所有必要的目录存在
func EnsureNginxDirs() error {
	paths := GetNginxPaths()
	dirs := []string{
		paths.BaseDir,
		paths.ConfigsDir,
		paths.SSLDir,
	}

	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("创建目录 %s 失败: %w", dir, err)
		}
	}
	return nil
}

// nginxConfTemplate 预设的 nginx.conf 模板
const nginxConfTemplate = `# 由 Hop 自动生成，请勿手动修改此文件
# 修改请通过 Hop 管理界面进行

# user nginx;  # 注释掉，使用默认用户
worker_processes {{.WorkerProcesses}};

error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections {{.WorkerConnections}};
    multi_accept on;
    use epoll;
}

# Stream 块：基于 SNI 的端口复用
# 443 端口由 stream 块监听，根据 SNI 分发到不同后端
# 默认后端 127.0.0.1:444 由 http 块处理 SSL 站点
stream {
    map $ssl_preread_server_name $backend_name {
{{- range .StreamRoutes}}
{{- if .Enabled}}
        {{.Domain}}    backend_{{.ID}};
{{- end}}
{{- end}}
        default    default_backend;
    }

    # 默认后端：转发到 http 块的 SSL 站点（监听 444 端口）
    upstream default_backend {
        server 127.0.0.1:444;
    }
{{range .StreamRoutes}}
{{- if .Enabled}}

    # {{.Name}}
    upstream backend_{{.ID}} {
        server {{.Backend}};
    }
{{- end}}
{{- end}}

    server {
        listen 443;
        proxy_pass $backend_name;
        ssl_preread on;
    }
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;

    keepalive_timeout {{.Keepalive}};
    types_hash_max_size 2048;

    {{if not .ServerTokens}}server_tokens off;{{else}}server_tokens on;{{end}}

    client_max_body_size {{.ClientMaxBodySize}};

    {{if .Gzip}}
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript 
               application/xml application/xml+rss text/javascript application/x-font-ttf
               font/opentype image/svg+xml;
    gzip_min_length 1000;
    {{end}}

    # SSL 通用配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # 包含站点配置
    include conf.d/*.conf;
}
`

// RenderNginxConf 渲染 nginx.conf 模板
func RenderNginxConf(params FullTemplateParams) (string, error) {
	tmpl, err := template.New("nginx.conf").Parse(nginxConfTemplate)
	if err != nil {
		return "", fmt.Errorf("解析模板失败: %w", err)
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, params); err != nil {
		return "", fmt.Errorf("渲染模板失败: %w", err)
	}

	return buf.String(), nil
}

// GenerateAndSaveNginxConf 生成并保存 nginx.conf
func GenerateAndSaveNginxConf(params FullTemplateParams) error {
	// 确保目录存在
	if err := EnsureNginxDirs(); err != nil {
		return err
	}

	// 渲染配置
	content, err := RenderNginxConf(params)
	if err != nil {
		return err
	}

	// 保存文件
	paths := GetNginxPaths()
	if err := os.WriteFile(paths.ConfigPath, []byte(content), 0644); err != nil {
		return fmt.Errorf("保存 nginx.conf 失败: %w", err)
	}

	log.Info("nginx.conf 已生成", map[string]interface{}{"path": paths.ConfigPath})
	return nil
}

// RegenerateNginxConf 使用当前参数重新生成 nginx.conf
func RegenerateNginxConf() error {
	// 读取当前模板参数
	templateParams := LoadTemplateParams()

	// 读取 stream 路由
	streamRoutes, err := ListStreamRoutes()
	if err != nil {
		log.Warn("读取 stream 路由失败", map[string]interface{}{"error": err.Error()})
		streamRoutes = []StreamRoute{}
	}

	// 组合完整参数
	fullParams := FullTemplateParams{
		TemplateParams: templateParams,
		StreamRoutes:   streamRoutes,
	}

	return GenerateAndSaveNginxConf(fullParams)
}

// InitNginxConfig 初始化 nginx 配置（如果不存在则创建）
func InitNginxConfig() error {
	if err := EnsureNginxDirs(); err != nil {
		return err
	}

	// 确保 stream 目录也存在
	if err := EnsureStreamDir(); err != nil {
		return err
	}

	paths := GetNginxPaths()

	// 如果配置文件不存在，使用默认参数生成
	if _, err := os.Stat(paths.ConfigPath); os.IsNotExist(err) {
		fullParams := FullTemplateParams{
			TemplateParams: DefaultTemplateParams(),
			StreamRoutes:   []StreamRoute{},
		}
		return GenerateAndSaveNginxConf(fullParams)
	}

	return nil
}
