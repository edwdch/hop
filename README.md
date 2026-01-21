# Hop

Hop 是一个现代化的 Nginx 配置管理工具，提供 Web 界面来管理 Nginx 站点配置、SSL 证书等。

## 安装

### 从 Release 下载

```bash
# 下载最新版本
curl -L https://github.com/edwdch/hop/releases/latest/download/hop-linux-amd64 -o hop
chmod +x hop
sudo mv hop /usr/local/bin/
```

### 从源码构建

需要: Go 1.25+, Bun (或 npm)

```bash
git clone https://github.com/edwdch/hop.git
cd hop
./build-go.sh
```

## 快速开始

```bash
# 生成默认配置文件
hop init

# 编辑配置文件 (修改 secret 等)
vim config.toml

# 启动服务
hop -C config.toml
```

服务启动后访问 `http://localhost:3000`

## 配置说明

```toml
[server]
host = "0.0.0.0"
port = 3000

[auth]
secret = "your-secret-key"

[nginx]
config_path = "/etc/nginx/nginx.conf"
configs_dir = "/etc/nginx/conf.d"
snippets_dir = "/etc/nginx/snippets"
ssl_dir = "/etc/nginx/ssl"

[data]
dir = "./data"
```

## Systemd 服务

```bash
# 生成 systemd 服务文件
hop systemd -o hop.service

# 或直接安装 (需要 root)
sudo hop systemd --install

# 启用并启动服务
sudo systemctl daemon-reload
sudo systemctl enable hop
sudo systemctl start hop
```

## 命令行

```
hop                     # 显示帮助
hop -C config.toml      # 启动服务
hop init                # 生成配置文件
hop version             # 显示版本
hop systemd             # 生成 systemd 配置
```

## License

MIT
