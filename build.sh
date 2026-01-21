#!/bin/bash
#
# Hop 构建脚本
# 用于构建生产版本的单二进制文件
#
# 使用方法:
#   ./build.sh          # 构建生产版本
#   ./build.sh --help   # 显示帮助
#

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 目录定义
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOM_DIR="$SCRIPT_DIR/dom"
UI_DIR="$SCRIPT_DIR/ui"
DIST_DIR="$DOM_DIR/dist"
ASSETS_FILE="$DOM_DIR/src/embedded-assets.ts"
OUTPUT_FILE="$DOM_DIR/hop"

# 帮助信息
show_help() {
    echo "Hop 构建脚本"
    echo ""
    echo "使用方法:"
    echo "  ./build.sh          构建生产版本（前端 + 后端单二进制）"
    echo "  ./build.sh --help   显示此帮助信息"
    echo ""
    echo "构建流程:"
    echo "  1. 构建前端 (ui/)"
    echo "  2. 生成嵌入资源文件"
    echo "  3. 编译后端为单二进制文件"
    echo ""
    echo "开发模式:"
    echo "  前端: cd ui && bun run dev"
    echo "  后端: cd dom && bun run dev"
}

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${YELLOW}[$1]${NC} $2"
}

# 生成嵌入资源文件
generate_embedded_assets() {
    log_info "扫描 dist 目录..."
    
    # 收集所有文件路径
    local files
    files=$(find "$DIST_DIR" -type f | sort)
    local count
    count=$(echo "$files" | wc -l)
    log_info "发现 $count 个文件"
    
    # 生成 TypeScript 代码
    {
        echo "// 自动生成的嵌入资源文件 - 请勿手动编辑"
        echo "// 生成时间: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
        echo ""
        
        # 生成 import 语句
        local i=0
        while IFS= read -r file; do
            local rel_path="${file#$DIST_DIR}"
            echo "import asset${i} from '../dist${rel_path}' with { type: 'file' };"
            i=$((i + 1))
        done <<< "$files"
        
        echo ""
        echo "export const embeddedAssets: Record<string, string> = {"
        
        # 生成映射
        i=0
        while IFS= read -r file; do
            local rel_path="${file#$DIST_DIR}"
            echo "    '${rel_path}': asset${i},"
            i=$((i + 1))
        done <<< "$files"
        
        echo "};"
        echo ""
        echo "export function getEmbeddedAsset(path: string): string | undefined {"
        echo "    return embeddedAssets[path];"
        echo "}"
        echo ""
    } > "$ASSETS_FILE"
    
    log_success "已生成 $count 个嵌入资源"
}

# 主构建流程
build() {
    echo -e "${GREEN}🚀 开始构建...${NC}\n"
    
    # Step 1: 构建前端
    log_step "1/4" "构建前端..."
    
    if [ -d "$DIST_DIR" ]; then
        rm -rf "$DIST_DIR"
        log_info "清理旧的 dist 目录"
    fi
    
    cd "$UI_DIR"
    bun run build > /dev/null 2>&1
    log_success "前端构建完成"
    
    # Step 2: 生成嵌入资源文件
    log_step "2/4" "生成嵌入资源..."
    generate_embedded_assets
    
    # Step 3: 编译后端
    log_step "3/4" "编译后端..."
    cd "$DOM_DIR"
    bun build ./src/index.ts --compile --minify --outfile "$OUTPUT_FILE" > /dev/null 2>&1
    log_success "后端编译完成"
    
    # Step 4: 验证输出
    log_step "4/4" "验证构建..."
    if [ -f "$OUTPUT_FILE" ]; then
        local size=$(du -h "$OUTPUT_FILE" | cut -f1)
        log_success "二进制文件已生成: $OUTPUT_FILE"
        log_info "文件大小: $size"
    else
        log_error "构建失败：二进制文件未生成"
        exit 1
    fi
    
    echo -e "\n${GREEN}🎉 构建完成！${NC}"
    echo -e "\n运行方式: ./dom/hop"
}

# 主入口
case "${1:-}" in
    --help|-h)
        show_help
        ;;
    *)
        build
        ;;
esac
