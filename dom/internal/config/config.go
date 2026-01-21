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

// NginxConfig Nginx 配置路径
type NginxConfig struct {
	ConfigPath  string `toml:"config_path"`
	ConfigsDir  string `toml:"configs_dir"`
	SnippetsDir string `toml:"snippets_dir"`
	SSLDir      string `toml:"ssl_dir"`
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
			ConfigPath:  "/etc/nginx/nginx.conf",
			ConfigsDir:  "/etc/nginx/conf.d",
			SnippetsDir: "/etc/nginx/snippets",
			SSLDir:      "/etc/nginx/ssl",
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
# Nginx 主配置文件路径
config_path = "/etc/nginx/nginx.conf"
# 站点配置目录
configs_dir = "/etc/nginx/conf.d"
# 片段配置目录
snippets_dir = "/etc/nginx/snippets"
# SSL 证书目录
ssl_dir = "/etc/nginx/ssl"

[data]
# 数据目录（相对路径基于配置文件位置）
dir = "./data"
`
}
