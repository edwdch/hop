#!/bin/bash
set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Hop 构建脚本 (Go 版本) ===${NC}"

# 项目根目录
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
UI_DIR="$ROOT_DIR/ui"
BACKEND_DIR="$ROOT_DIR/backend"
ASSETS_DIR="$BACKEND_DIR/internal/assets/dist"

# 版本信息
VERSION="${VERSION:-$(git describe --tags --always --dirty 2>/dev/null || echo "dev")}"
COMMIT="${COMMIT:-$(git rev-parse --short HEAD 2>/dev/null || echo "none")}"
DATE="${DATE:-$(date -u +"%Y-%m-%dT%H:%M:%SZ")}"

LDFLAGS="-s -w -X main.version=${VERSION} -X main.commit=${COMMIT} -X main.date=${DATE}"

# Step 1: 构建前端
echo -e "${YELLOW}[1/4] 构建前端...${NC}"
cd "$UI_DIR"
if [ -f "package.json" ]; then
    if command -v bun &> /dev/null; then
        bun install
        bun run build
    elif command -v npm &> /dev/null; then
        npm install
        npm run build
    else
        echo -e "${RED}错误: 需要 bun 或 npm${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}警告: 未找到前端项目，跳过前端构建${NC}"
fi

# Step 2: 复制前端构建产物到 assets 目录
echo -e "${YELLOW}[2/4] 复制前端资源...${NC}"
rm -rf "$ASSETS_DIR"
mkdir -p "$ASSETS_DIR"

if [ -d "$UI_DIR/dist" ]; then
    cp -r "$UI_DIR/dist/"* "$ASSETS_DIR/"
    echo -e "${GREEN}前端资源已复制到 $ASSETS_DIR${NC}"
else
    echo -e "${YELLOW}警告: 前端构建目录不存在，创建空占位${NC}"
    touch "$ASSETS_DIR/.gitkeep"
fi

# Step 3: 下载 Go 依赖
echo -e "${YELLOW}[3/4] 下载 Go 依赖...${NC}"
cd "$BACKEND_DIR"
go mod tidy
go mod download

# Step 4: 构建 Go 二进制
echo -e "${YELLOW}[4/4] 构建 Go 二进制...${NC}"
OUTPUT_NAME="hop"
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    OUTPUT_NAME="hop.exe"
fi

# 使用 CGO 编译（SQLite 需要）
CGO_ENABLED=1 go build \
    -ldflags="$LDFLAGS" \
    -o "$ROOT_DIR/$OUTPUT_NAME" \
    ./cmd/hop

# 复制默认配置文件
if [ -f "$BACKEND_DIR/config.example.toml" ]; then
    cp "$BACKEND_DIR/config.example.toml" "$ROOT_DIR/config.example.toml"
fi

# 显示结果
if [ -f "$ROOT_DIR/$OUTPUT_NAME" ]; then
    SIZE=$(du -h "$ROOT_DIR/$OUTPUT_NAME" | cut -f1)
    echo -e "${GREEN}=== 构建完成 ===${NC}"
    echo -e "输出文件: ${GREEN}$ROOT_DIR/$OUTPUT_NAME${NC}"
    echo -e "文件大小: ${GREEN}$SIZE${NC}"
    echo -e "版本信息: ${GREEN}$VERSION${NC}"
    echo ""
    echo -e "使用方式:"
    echo -e "  ${YELLOW}# 生成配置文件${NC}"
    echo -e "  ./$OUTPUT_NAME init"
    echo ""
    echo -e "  ${YELLOW}# 启动服务器${NC}"
    echo -e "  ./$OUTPUT_NAME -C config.toml"
else
    echo -e "${RED}构建失败${NC}"
    exit 1
fi
