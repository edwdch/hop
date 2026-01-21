package nginx

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// StreamRoute SNI 路由规则
type StreamRoute struct {
	ID      string `json:"id"`      // 唯一标识
	Name    string `json:"name"`    // 名称/备注
	Domain  string `json:"domain"`  // 域名（SNI 匹配）
	Backend string `json:"backend"` // 后端地址 (host:port)
	Enabled bool   `json:"enabled"` // 是否启用
}

// GetStreamDir 获取 stream 配置目录路径
func GetStreamDir() string {
	paths := GetNginxPaths()
	return filepath.Join(paths.BaseDir, "stream")
}

// EnsureStreamDir 确保 stream 目录存在
func EnsureStreamDir() error {
	streamDir := GetStreamDir()
	if err := os.MkdirAll(streamDir, 0755); err != nil {
		return fmt.Errorf("创建 stream 目录失败: %w", err)
	}
	return nil
}

// SaveStreamRoute 保存 SNI 路由规则
func SaveStreamRoute(route StreamRoute) error {
	// 验证必填字段
	if route.ID == "" {
		return fmt.Errorf("路由ID不能为空")
	}
	if route.Domain == "" {
		return fmt.Errorf("域名不能为空")
	}
	if route.Backend == "" {
		return fmt.Errorf("后端地址不能为空")
	}

	// 确保目录存在
	if err := EnsureStreamDir(); err != nil {
		return err
	}

	// 保存元数据文件
	streamDir := GetStreamDir()
	metaPath := filepath.Join(streamDir, "."+route.ID+".json")
	metaData, err := json.MarshalIndent(route, "", "  ")
	if err != nil {
		return fmt.Errorf("序列化元数据失败: %w", err)
	}

	if err := os.WriteFile(metaPath, metaData, 0644); err != nil {
		return fmt.Errorf("保存元数据失败: %w", err)
	}

	log.Info("SNI 路由已保存", map[string]interface{}{"id": route.ID, "domain": route.Domain})
	return nil
}

// GetStreamRoute 获取单个 SNI 路由规则
func GetStreamRoute(id string) (*StreamRoute, error) {
	streamDir := GetStreamDir()
	metaPath := filepath.Join(streamDir, "."+id+".json")

	data, err := os.ReadFile(metaPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("路由不存在")
		}
		return nil, fmt.Errorf("读取元数据失败: %w", err)
	}

	var route StreamRoute
	if err := json.Unmarshal(data, &route); err != nil {
		return nil, fmt.Errorf("解析元数据失败: %w", err)
	}

	return &route, nil
}

// ListStreamRoutes 列出所有 SNI 路由规则
func ListStreamRoutes() ([]StreamRoute, error) {
	streamDir := GetStreamDir()
	entries, err := os.ReadDir(streamDir)
	if err != nil {
		if os.IsNotExist(err) {
			return []StreamRoute{}, nil
		}
		return nil, fmt.Errorf("读取目录失败: %w", err)
	}

	var routes []StreamRoute
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		// 只处理隐藏的元数据文件
		if strings.HasPrefix(name, ".") && strings.HasSuffix(name, ".json") {
			id := strings.TrimPrefix(strings.TrimSuffix(name, ".json"), ".")
			route, err := GetStreamRoute(id)
			if err != nil {
				continue
			}
			routes = append(routes, *route)
		}
	}

	return routes, nil
}

// DeleteStreamRoute 删除 SNI 路由规则
func DeleteStreamRoute(id string) error {
	streamDir := GetStreamDir()
	metaPath := filepath.Join(streamDir, "."+id+".json")

	if err := os.Remove(metaPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("删除元数据失败: %w", err)
	}

	log.Info("SNI 路由已删除", map[string]interface{}{"id": id})
	return nil
}

// ToggleStreamRoute 切换 SNI 路由启用状态
func ToggleStreamRoute(id string) (*StreamRoute, error) {
	route, err := GetStreamRoute(id)
	if err != nil {
		return nil, err
	}

	route.Enabled = !route.Enabled

	if err := SaveStreamRoute(*route); err != nil {
		return nil, err
	}

	return route, nil
}

// ===== HTTP Handlers =====

// handleListStreamRoutes 列出所有 SNI 路由
func handleListStreamRoutes(w http.ResponseWriter, r *http.Request) {
	routes, err := ListStreamRoutes()
	if err != nil {
		jsonError(w, "获取路由列表失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]interface{}{
		"routes": routes,
	})
}

// handleGetStreamRoute 获取单个 SNI 路由
func handleGetStreamRoute(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		jsonError(w, "缺少路由ID", http.StatusBadRequest)
		return
	}

	route, err := GetStreamRoute(id)
	if err != nil {
		jsonError(w, err.Error(), http.StatusNotFound)
		return
	}

	jsonResponse(w, route)
}

// handleSaveStreamRoute 保存 SNI 路由
func handleSaveStreamRoute(w http.ResponseWriter, r *http.Request) {
	var route StreamRoute
	if err := json.NewDecoder(r.Body).Decode(&route); err != nil {
		jsonError(w, "无效的请求体", http.StatusBadRequest)
		return
	}

	if err := SaveStreamRoute(route); err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}

	// 保存后重新生成 nginx.conf
	if err := RegenerateNginxConf(); err != nil {
		log.Warn("重新生成 nginx.conf 失败", map[string]interface{}{"error": err.Error()})
	}

	jsonResponse(w, map[string]interface{}{
		"success": true,
		"id":      route.ID,
	})
}

// handleDeleteStreamRoute 删除 SNI 路由
func handleDeleteStreamRoute(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		jsonError(w, "缺少路由ID", http.StatusBadRequest)
		return
	}

	if err := DeleteStreamRoute(id); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 删除后重新生成 nginx.conf
	if err := RegenerateNginxConf(); err != nil {
		log.Warn("重新生成 nginx.conf 失败", map[string]interface{}{"error": err.Error()})
	}

	jsonResponse(w, map[string]bool{"success": true})
}

// handleToggleStreamRoute 切换 SNI 路由启用状态
func handleToggleStreamRoute(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		jsonError(w, "缺少路由ID", http.StatusBadRequest)
		return
	}

	route, err := ToggleStreamRoute(id)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 切换后重新生成 nginx.conf
	if err := RegenerateNginxConf(); err != nil {
		log.Warn("重新生成 nginx.conf 失败", map[string]interface{}{"error": err.Error()})
	}

	jsonResponse(w, map[string]interface{}{
		"success": true,
		"enabled": route.Enabled,
	})
}
