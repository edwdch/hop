package server

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/hop/backend/internal/config"
)

// PublicConfig 对外暴露的配置（不包含敏感信息如 secret）
type PublicConfig struct {
	Server ServerConfig `json:"server"`
	Auth   AuthConfig   `json:"auth"`
	Nginx  NginxConfig  `json:"nginx"`
}

// ServerConfig 服务器配置
type ServerConfig struct {
	Host string `json:"host"`
	Port int    `json:"port"`
}

// AuthConfig 认证配置（不包含 secret）
type AuthConfig struct {
	ProxyLoginURL     string `json:"proxyLoginURL"`
	ProxyCookieDomain string `json:"proxyCookieDomain"`
}

// NginxConfig Nginx 配置
type NginxConfig struct {
	WorkerProcesses   string `json:"workerProcesses"`
	WorkerConnections int    `json:"workerConnections"`
	Keepalive         int    `json:"keepalive"`
	ClientMaxBodySize string `json:"clientMaxBodySize"`
	Gzip              bool   `json:"gzip"`
	ServerTokens      bool   `json:"serverTokens"`
}

// UpdateAuthConfigRequest 更新认证配置请求
type UpdateAuthConfigRequest struct {
	ProxyLoginURL     string `json:"proxyLoginURL"`
	ProxyCookieDomain string `json:"proxyCookieDomain"`
}

// configRouter 配置路由
func configRouter() chi.Router {
	r := chi.NewRouter()

	r.Get("/", handleGetConfig)
	r.Put("/auth", handleUpdateAuthConfig)

	return r
}

// handleGetConfig 获取配置
func handleGetConfig(w http.ResponseWriter, r *http.Request) {
	cfg := config.Get()

	publicCfg := PublicConfig{
		Server: ServerConfig{
			Host: cfg.Server.Host,
			Port: cfg.Server.Port,
		},
		Auth: AuthConfig{
			ProxyLoginURL:     cfg.Auth.ProxyLoginURL,
			ProxyCookieDomain: cfg.Auth.ProxyCookieDomain,
		},
		Nginx: NginxConfig{
			WorkerProcesses:   cfg.Nginx.WorkerProcesses,
			WorkerConnections: cfg.Nginx.WorkerConnections,
			Keepalive:         cfg.Nginx.Keepalive,
			ClientMaxBodySize: cfg.Nginx.ClientMaxBodySize,
			Gzip:              cfg.Nginx.Gzip,
			ServerTokens:      cfg.Nginx.ServerTokens,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(publicCfg)
}

// handleUpdateAuthConfig 更新认证配置
func handleUpdateAuthConfig(w http.ResponseWriter, r *http.Request) {
	var req UpdateAuthConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "无效的请求体"})
		return
	}

	// 更新配置
	err := config.Update(func(cfg *config.Config) {
		cfg.Auth.ProxyLoginURL = req.ProxyLoginURL
		cfg.Auth.ProxyCookieDomain = req.ProxyCookieDomain
	})

	if err != nil {
		log.Info("更新配置失败", map[string]interface{}{"error": err.Error()})
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "保存配置失败: " + err.Error()})
		return
	}

	log.Info("认证配置已更新", map[string]interface{}{
		"proxyLoginURL":     req.ProxyLoginURL,
		"proxyCookieDomain": req.ProxyCookieDomain,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}
