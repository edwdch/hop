package nginx

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/hop/backend/internal/config"
	"github.com/hop/backend/internal/logger"
)

var log = logger.WithTag("nginx")

// FileInfo 文件信息
type FileInfo struct {
	Name       string `json:"name"`
	Path       string `json:"path"`
	Type       string `json:"type"` // "file" or "directory"
	Size       int64  `json:"size,omitempty"`
	ModifiedAt string `json:"modifiedAt,omitempty"`
}

// SiteInfo 站点信息
type SiteInfo struct {
	FileInfo
	ServerNames []string `json:"serverNames"`
}

// Router 创建 Nginx 路由
func Router() chi.Router {
	r := chi.NewRouter()

	r.Get("/config", handleGetConfig)
	r.Get("/sites", handleGetSites)
	r.Get("/browse", handleBrowse)
	r.Get("/file", handleGetFile)
	r.Get("/main-config", handleGetMainConfig)
	r.Get("/template-params", handleGetTemplateParams)
	r.Post("/file", handleSaveFile)
	r.Post("/create", handleCreateFile)
	r.Post("/test", handleTest)
	r.Post("/reload", handleReload)
	r.Post("/regenerate", handleRegenerate)
	r.Post("/template-params", handleSaveTemplateParams)
	r.Delete("/file", handleDeleteFile)

	// 代理站点管理 API
	r.Get("/proxy/list", handleListProxySites)
	r.Get("/proxy/get", handleGetProxySite)
	r.Post("/proxy/save", handleSaveProxySite)
	r.Post("/proxy/preview", handlePreviewProxySite)
	r.Delete("/proxy/delete", handleDeleteProxySite)

	// SNI 路由管理 API
	r.Get("/stream/list", handleListStreamRoutes)
	r.Get("/stream/get", handleGetStreamRoute)
	r.Post("/stream/save", handleSaveStreamRoute)
	r.Post("/stream/toggle", handleToggleStreamRoute)
	r.Delete("/stream/delete", handleDeleteStreamRoute)

	return r
}

// handleGetConfig 获取环境配置
func handleGetConfig(w http.ResponseWriter, r *http.Request) {
	paths := GetNginxPaths()
	jsonResponse(w, map[string]string{
		"configPath": paths.ConfigPath,
		"configsDir": paths.ConfigsDir,
		"sslDir":     paths.SSLDir,
	})
}

// handleGetSites 获取网站列表
func handleGetSites(w http.ResponseWriter, r *http.Request) {
	paths := GetNginxPaths()
	files, err := listFiles(paths.ConfigsDir)
	if err != nil {
		jsonResponse(w, map[string]interface{}{
			"sites":     []SiteInfo{},
			"directory": paths.ConfigsDir,
		})
		return
	}

	var sites []SiteInfo
	for _, f := range files {
		// 仅筛选 .conf 结尾的配置文件
		if f.Type == "file" && strings.HasSuffix(f.Name, ".conf") {
			serverNames := []string{}
			content, err := os.ReadFile(f.Path)
			if err == nil {
				serverNames = extractServerNames(string(content))
			}
			sites = append(sites, SiteInfo{
				FileInfo:    f,
				ServerNames: serverNames,
			})
		}
	}

	jsonResponse(w, map[string]interface{}{
		"sites":     sites,
		"directory": paths.ConfigsDir,
	})
}

// handleBrowse 浏览目录
func handleBrowse(w http.ResponseWriter, r *http.Request) {
	dirType := r.URL.Query().Get("dir")
	paths := GetNginxPaths()

	var targetDir string
	switch dirType {
	case "configs":
		targetDir = paths.ConfigsDir
	case "ssl":
		targetDir = paths.SSLDir
	default:
		jsonError(w, "Invalid directory type", http.StatusBadRequest)
		return
	}

	files, err := listFiles(targetDir)
	if err != nil {
		files = []FileInfo{}
	}

	jsonResponse(w, map[string]interface{}{
		"files":     files,
		"directory": targetDir,
		"type":      dirType,
	})
}

// handleGetFile 读取文件内容
func handleGetFile(w http.ResponseWriter, r *http.Request) {
	filePath := r.URL.Query().Get("path")

	if !isPathAllowed(filePath) {
		jsonError(w, "Access denied", http.StatusForbidden)
		return
	}

	content, err := os.ReadFile(filePath)
	if err != nil {
		jsonError(w, "Failed to read file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]interface{}{
		"content": string(content),
		"path":    filePath,
		"name":    filepath.Base(filePath),
	})
}

// handleGetMainConfig 读取主配置文件（只读，由模板生成）
func handleGetMainConfig(w http.ResponseWriter, r *http.Request) {
	paths := GetNginxPaths()

	content, err := os.ReadFile(paths.ConfigPath)
	if err != nil {
		// 如果文件不存在，尝试初始化
		if os.IsNotExist(err) {
			if initErr := InitNginxConfig(); initErr != nil {
				jsonError(w, "Failed to initialize nginx config: "+initErr.Error(), http.StatusInternalServerError)
				return
			}
			content, err = os.ReadFile(paths.ConfigPath)
			if err != nil {
				jsonError(w, "Failed to read main config: "+err.Error(), http.StatusInternalServerError)
				return
			}
		} else {
			jsonError(w, "Failed to read main config: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	jsonResponse(w, map[string]interface{}{
		"content":  string(content),
		"path":     paths.ConfigPath,
		"name":     filepath.Base(paths.ConfigPath),
		"readonly": true, // 标记为只读
	})
}

// handleSaveFile 保存文件
func handleSaveFile(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Path    string `json:"path"`
		Content string `json:"content"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if !isPathAllowed(req.Path) {
		jsonError(w, "Access denied", http.StatusForbidden)
		return
	}

	if err := os.WriteFile(req.Path, []byte(req.Content), 0644); err != nil {
		jsonError(w, "Failed to save file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	log.Info("文件已保存", map[string]interface{}{"path": req.Path})
	jsonResponse(w, map[string]bool{"success": true})
}

// handleCreateFile 创建新文件
func handleCreateFile(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Dir     string `json:"dir"`
		Name    string `json:"name"`
		Content string `json:"content"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	paths := GetNginxPaths()
	var targetDir string
	switch req.Dir {
	case "configs":
		targetDir = paths.ConfigsDir
	default:
		jsonError(w, "Invalid directory type", http.StatusBadRequest)
		return
	}

	// 验证文件名
	if req.Name == "" || strings.Contains(req.Name, "/") || strings.Contains(req.Name, "..") {
		jsonError(w, "Invalid file name", http.StatusBadRequest)
		return
	}

	// 确保有 .conf 扩展名
	fileName := req.Name
	if !strings.HasSuffix(fileName, ".conf") {
		fileName += ".conf"
	}

	filePath := filepath.Join(targetDir, fileName)

	// 检查文件是否已存在
	if _, err := os.Stat(filePath); err == nil {
		jsonError(w, "File already exists", http.StatusConflict)
		return
	}

	// 确保目录存在
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		jsonError(w, "Failed to create directory: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 创建文件
	if err := os.WriteFile(filePath, []byte(req.Content), 0644); err != nil {
		jsonError(w, "Failed to create file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	log.Info("文件已创建", map[string]interface{}{"path": filePath})
	jsonResponse(w, map[string]interface{}{
		"success": true,
		"path":    filePath,
		"name":    fileName,
	})
}

// handleTest 测试 Nginx 配置
func handleTest(w http.ResponseWriter, r *http.Request) {
	result := execCommand("nginx", []string{"-t"})
	jsonResponse(w, result)
}

// handleReload 重载 Nginx
func handleReload(w http.ResponseWriter, r *http.Request) {
	result := execCommand("nginx", []string{"-s", "reload"})
	if result["success"] == true && result["output"] == "" {
		result["output"] = "Nginx reloaded successfully"
	}
	jsonResponse(w, result)
}

// handleDeleteFile 删除文件
func handleDeleteFile(w http.ResponseWriter, r *http.Request) {
	filePath := r.URL.Query().Get("path")
	paths := GetNginxPaths()

	// 安全检查：只允许删除 configs 目录下的文件
	normalizedPath := filepath.Clean(filePath)

	if !strings.HasPrefix(normalizedPath, paths.ConfigsDir) {
		jsonError(w, "Access denied: Cannot delete files outside configs directory", http.StatusForbidden)
		return
	}

	// 不允许删除主配置文件
	if normalizedPath == paths.ConfigPath {
		jsonError(w, "Cannot delete main configuration file", http.StatusForbidden)
		return
	}

	// 检查文件是否存在
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		jsonError(w, "File not found", http.StatusNotFound)
		return
	}

	// 删除文件
	if err := os.Remove(filePath); err != nil {
		jsonError(w, "Failed to delete file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	log.Info("文件已删除", map[string]interface{}{"path": filePath})
	jsonResponse(w, map[string]bool{"success": true})
}

// extractServerNames 从配置文件提取 server_name
func extractServerNames(content string) []string {
	var serverNames []string
	re := regexp.MustCompile(`server_name\s+([^;]+);`)
	matches := re.FindAllStringSubmatch(content, -1)

	for _, match := range matches {
		if len(match) > 1 {
			names := strings.Fields(match[1])
			for _, name := range names {
				if name != "" && name != "_" && !contains(serverNames, name) {
					serverNames = append(serverNames, name)
				}
			}
		}
	}

	return serverNames
}

// execCommand 执行命令
func execCommand(command string, args []string) map[string]interface{} {
	cmd := exec.Command(command, args...)
	output, err := cmd.CombinedOutput()

	if err != nil {
		return map[string]interface{}{
			"success": false,
			"output":  string(output),
			"error":   err.Error(),
		}
	}

	return map[string]interface{}{
		"success": true,
		"output":  string(output),
	}
}

// listFiles 列出目录下的文件
func listFiles(dirPath string) ([]FileInfo, error) {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, err
	}

	var files []FileInfo
	for _, entry := range entries {
		fullPath := filepath.Join(dirPath, entry.Name())
		info, err := entry.Info()
		if err != nil {
			continue
		}

		fileType := "file"
		if entry.IsDir() {
			fileType = "directory"
		}

		files = append(files, FileInfo{
			Name:       entry.Name(),
			Path:       fullPath,
			Type:       fileType,
			Size:       info.Size(),
			ModifiedAt: info.ModTime().Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	// 排序：目录优先，然后按名称
	sort.Slice(files, func(i, j int) bool {
		if files[i].Type != files[j].Type {
			return files[i].Type == "directory"
		}
		return files[i].Name < files[j].Name
	})

	return files, nil
}

// isPathAllowed 检查路径是否允许访问
func isPathAllowed(filePath string) bool {
	paths := GetNginxPaths()
	allowedDirs := []string{paths.ConfigsDir, paths.SSLDir}
	normalizedPath := filepath.Clean(filePath)

	// 检查是否是主配置文件（只读）
	if normalizedPath == paths.ConfigPath {
		return true
	}

	// 检查是否在允许的目录内
	for _, dir := range allowedDirs {
		if strings.HasPrefix(normalizedPath, dir) {
			return true
		}
	}

	return false
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func jsonResponse(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func jsonError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"error":   message,
		"content": nil,
	})
}

// 确保 body 被读取完毕
func drainBody(r *http.Request) {
	io.Copy(io.Discard, r.Body)
	r.Body.Close()
}

// handleGetTemplateParams 获取当前模板参数
func handleGetTemplateParams(w http.ResponseWriter, r *http.Request) {
	cfg := config.Get()
	jsonResponse(w, TemplateParams{
		WorkerProcesses:   cfg.Nginx.WorkerProcesses,
		WorkerConnections: cfg.Nginx.WorkerConnections,
		Keepalive:         cfg.Nginx.Keepalive,
		ClientMaxBodySize: cfg.Nginx.ClientMaxBodySize,
		Gzip:              cfg.Nginx.Gzip,
		ServerTokens:      cfg.Nginx.ServerTokens,
	})
}

// handleSaveTemplateParams 保存模板参数并重新生成配置
func handleSaveTemplateParams(w http.ResponseWriter, r *http.Request) {
	var params TemplateParams
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// 读取 stream 路由
	streamRoutes, err := ListStreamRoutes()
	if err != nil {
		log.Warn("读取 stream 路由失败", map[string]interface{}{"error": err.Error()})
		streamRoutes = []StreamRoute{}
	}

	// 组合完整参数
	fullParams := FullTemplateParams{
		TemplateParams: params,
		StreamRoutes:   streamRoutes,
	}

	// 生成并保存新的 nginx.conf
	if err := GenerateAndSaveNginxConf(fullParams); err != nil {
		jsonError(w, "Failed to generate config: "+err.Error(), http.StatusInternalServerError)
		return
	}

	log.Info("模板参数已更新，nginx.conf 已重新生成", nil)
	jsonResponse(w, map[string]bool{"success": true})
}

// handleRegenerate 使用当前参数重新生成 nginx.conf
func handleRegenerate(w http.ResponseWriter, r *http.Request) {
	if err := RegenerateNginxConf(); err != nil {
		jsonError(w, "Failed to regenerate config: "+err.Error(), http.StatusInternalServerError)
		return
	}

	log.Info("nginx.conf 已重新生成", nil)
	jsonResponse(w, map[string]bool{"success": true})
}
