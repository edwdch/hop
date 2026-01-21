package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/BurntSushi/toml"
)

// Config 应用配置
type Config struct {
	Server ServerConfig `toml:"server"`
	Auth   AuthConfig   `toml:"auth"`
	Nginx  NginxConfig  `toml:"nginx"`
	Data   DataConfig   `toml:"data"`
}

// ServerConfig 服务器配置
type ServerConfig struct {
	Host string `toml:"host"`
	Port int    `toml:"port"`
}

// AuthConfig 认证配置
type AuthConfig struct {
	Secret string `toml:"secret"`
}

// NginxConfig Nginx 配置
type NginxConfig struct {
	// 模板参数
	WorkerProcesses   string `toml:"worker_processes"`     // auto 或具体数字
	WorkerConnections int    `toml:"worker_connections"`   // 每个 worker 的最大连接数
	Keepalive         int    `toml:"keepalive"`            // keepalive 超时秒数
	ClientMaxBodySize string `toml:"client_max_body_size"` // 客户端最大请求体
	Gzip              bool   `toml:"gzip"`                 // 是否启用 gzip
	ServerTokens      bool   `toml:"server_tokens"`        // 是否显示 nginx 版本
}

// DataConfig 数据目录配置
type DataConfig struct {
	Dir string `toml:"dir"`
}

var cfg *Config

// DefaultConfig 返回默认配置
func DefaultConfig() *Config {
	return &Config{
		Server: ServerConfig{
			Host: "0.0.0.0",
			Port: 3000,
		},
		Auth: AuthConfig{
			Secret: "hop-default-secret-please-change-me",
		},
		Nginx: NginxConfig{
			WorkerProcesses:   "auto",
			WorkerConnections: 1024,
			Keepalive:         65,
			ClientMaxBodySize: "100m",
			Gzip:              true,
			ServerTokens:      false,
		},
		Data: DataConfig{
			Dir: "./data",
		},
	}
}

// Load 从 TOML 文件加载配置
func Load(configPath string) (*Config, error) {
	// 从默认配置开始
	cfg = DefaultConfig()

	// 读取配置文件
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("无法读取配置文件: %w", err)
	}

	// 解析 TOML
	if _, err := toml.Decode(string(data), cfg); err != nil {
		return nil, fmt.Errorf("解析配置文件失败: %w", err)
	}

	// 处理相对路径
	if !filepath.IsAbs(cfg.Data.Dir) {
		// 相对于配置文件目录
		configDir := filepath.Dir(configPath)
		cfg.Data.Dir = filepath.Join(configDir, cfg.Data.Dir)
	}

	// 确保数据目录存在
	if err := os.MkdirAll(cfg.Data.Dir, 0755); err != nil {
		return nil, fmt.Errorf("创建数据目录失败: %w", err)
	}

	return cfg, nil
}

// Get 获取当前配置
func Get() *Config {
	if cfg == nil {
		cfg = DefaultConfig()
	}
	return cfg
}

// DBPath 获取数据库路径
func (c *Config) DBPath() string {
	return filepath.Join(c.Data.Dir, "hop.db")
}

// Address 获取服务器监听地址
func (c *Config) Address() string {
	return fmt.Sprintf("%s:%d", c.Server.Host, c.Server.Port)
}

// GenerateDefault 生成默认配置文件内容
func GenerateDefault() string {
	return `# Hop 配置文件

[server]
# 服务器监听地址
host = "0.0.0.0"
# 服务器端口
port = 3000

[auth]
# 认证密钥（生产环境请修改为随机字符串）
secret = "hop-default-secret-please-change-me"

[nginx]
# Nginx 模板参数配置
# worker 进程数，auto 表示自动检测 CPU 核心数
worker_processes = "auto"
# 每个 worker 的最大连接数
worker_connections = 1024
# keepalive 超时秒数
keepalive = 65
# 客户端最大请求体大小
client_max_body_size = "100m"
# 是否启用 gzip 压缩
gzip = true
# 是否显示 nginx 版本号（建议关闭以提高安全性）
server_tokens = false

[data]
# 数据目录（相对路径基于配置文件位置）
# 存储数据库、nginx 配置、lego 工作目录等
dir = "./data"

# 说明：
# - Nginx 配置文件会自动生成到 data/nginx/ 目录
# - 站点配置存储在 data/nginx/conf.d/
# - SSL 证书存储在 data/nginx/ssl/
# - 系统会每 24 小时检查一次证书过期时间
# - 如果证书在 30 天内过期且开启了自动续期，系统会自动续期
`
}
