.PHONY: all build dev clean deps test

# 版本信息
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
COMMIT ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo "none")
DATE ?= $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

# 链接标志
LDFLAGS = -s -w \
	-X main.version=$(VERSION) \
	-X main.commit=$(COMMIT) \
	-X main.date=$(DATE)

# 默认目标
all: build

# 下载依赖
deps:
	go mod tidy
	go mod download

# 开发模式运行（需要配置文件）
dev: deps
	@if [ ! -f config.toml ]; then \
		echo "配置文件不存在，正在生成默认配置..."; \
		go run ./cmd/hop init config.toml; \
	fi
	go run ./cmd/hop -C config.toml

# 构建
build: deps
	CGO_ENABLED=1 go build -ldflags="$(LDFLAGS)" -o hop ./cmd/hop

# 构建（包含前端）
build-all:
	../build-go.sh

# 测试
test:
	go test -v ./...

# 清理
clean:
	rm -f hop hop.exe
	rm -rf internal/assets/dist/*
	touch internal/assets/dist/.gitkeep

# 生成默认配置
init:
	go run ./cmd/hop init

# 交叉编译 Linux
build-linux: deps
	CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -ldflags="$(LDFLAGS)" -o hop-linux-amd64 ./cmd/hop

# 交叉编译 macOS
build-darwin: deps
	CGO_ENABLED=1 GOOS=darwin GOARCH=amd64 go build -ldflags="$(LDFLAGS)" -o hop-darwin-amd64 ./cmd/hop
	CGO_ENABLED=1 GOOS=darwin GOARCH=arm64 go build -ldflags="$(LDFLAGS)" -o hop-darwin-arm64 ./cmd/hop

# 热重载开发（自动调用 air）
watch: deps
	@if [ ! -f config.toml ]; then \
		echo "配置文件不存在，正在生成默认配置..."; \
		go run ./cmd/hop init config.toml; \
	fi
	@if command -v air > /dev/null; then \
	    air; \
	else \
	    echo "Air 未安装，正在安装..."; \
	    go install github.com/air-verse/air@latest; \
	    air; \
	fi

# 帮助
help:
	@echo "可用命令:"
	@echo "  make build      - 构建二进制文件"
	@echo "  make dev        - 开发模式运行"
	@echo "  make watch      - 热重载开发模式 (使用 Air)"
	@echo "  make test       - 运行测试"
	@echo "  make clean      - 清理构建产物"
	@echo "  make init       - 生成默认配置文件"
	@echo "  make build-all  - 构建（包含前端）"
