package assets

import (
	"embed"
	"io/fs"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/hop/backend/internal/logger"
)

var log = logger.WithTag("assets")

//go:embed all:dist
var embeddedFS embed.FS

// MIME 类型映射
var mimeTypes = map[string]string{
	".html":  "text/html",
	".css":   "text/css",
	".js":    "application/javascript",
	".json":  "application/json",
	".png":   "image/png",
	".jpg":   "image/jpeg",
	".jpeg":  "image/jpeg",
	".gif":   "image/gif",
	".svg":   "image/svg+xml",
	".ico":   "image/x-icon",
	".woff":  "font/woff",
	".woff2": "font/woff2",
	".ttf":   "font/ttf",
	".eot":   "application/vnd.ms-fontobject",
}

// Handler 静态文件处理器
type Handler struct {
	useEmbedded bool
	distDir     string
	fsHandler   http.Handler
}

// NewHandler 创建静态文件处理器
func NewHandler(distDir string) *Handler {
	h := &Handler{
		distDir: distDir,
	}

	// 检查是否有嵌入的资源
	entries, err := embeddedFS.ReadDir("dist")
	if err == nil && len(entries) > 0 {
		h.useEmbedded = true
		subFS, _ := fs.Sub(embeddedFS, "dist")
		h.fsHandler = http.FileServer(http.FS(subFS))
		log.Info("使用嵌入式静态资源")
	} else {
		// 开发模式：从文件系统读取
		h.useEmbedded = false
		h.fsHandler = http.FileServer(http.Dir(distDir))
		log.Info("使用文件系统静态资源", map[string]interface{}{"dir": distDir})
	}

	return h
}

// ServeHTTP 实现 http.Handler
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	urlPath := r.URL.Path

	// 跳过 API 请求
	if strings.HasPrefix(urlPath, "/api/") {
		http.NotFound(w, r)
		return
	}

	// 尝试作为静态文件提供
	filePath := strings.TrimPrefix(urlPath, "/")
	if filePath == "" {
		filePath = "index.html"
	}

	// 检查文件是否存在
	var exists bool
	if h.useEmbedded {
		_, err := embeddedFS.Open("dist/" + filePath)
		exists = err == nil
	} else {
		_, err := os.Stat(filepath.Join(h.distDir, filePath))
		exists = err == nil
	}

	// 如果文件存在且不是目录
	if exists && path.Ext(filePath) != "" {
		// 设置正确的 Content-Type
		if mimeType, ok := mimeTypes[path.Ext(filePath)]; ok {
			w.Header().Set("Content-Type", mimeType)
		}
		h.fsHandler.ServeHTTP(w, r)
		return
	}

	// SPA fallback: 返回 index.html
	h.serveIndex(w, r)
}

// serveIndex 返回 index.html
func (h *Handler) serveIndex(w http.ResponseWriter, r *http.Request) {
	var content []byte
	var err error

	if h.useEmbedded {
		content, err = embeddedFS.ReadFile("dist/index.html")
	} else {
		content, err = os.ReadFile(filepath.Join(h.distDir, "index.html"))
	}

	if err != nil {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", "text/html")
	w.Write(content)
}

// HasEmbeddedAssets 是否有嵌入资源
func (h *Handler) HasEmbeddedAssets() bool {
	return h.useEmbedded
}
