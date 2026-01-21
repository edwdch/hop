package server

import (
	"fmt"
	"net"
	"net/http"
	"path/filepath"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/hop/backend/internal/assets"
	"github.com/hop/backend/internal/auth"
	"github.com/hop/backend/internal/config"
	"github.com/hop/backend/internal/logger"
	"github.com/hop/backend/internal/nginx"
	"github.com/hop/backend/internal/ssl"
)

var log = logger.WithTag("server")

// Server HTTP 服务器
type Server struct {
	router *chi.Mux
	cfg    *config.Config
}

// New 创建服务器
func New(cfg *config.Config) *Server {
	r := chi.NewRouter()

	// 初始化 Nginx 配置目录和文件
	if err := nginx.InitNginxConfig(); err != nil {
		log.Info("初始化 Nginx 配置失败", map[string]interface{}{"error": err.Error()})
	} else {
		paths := nginx.GetNginxPaths()
		log.Info("Nginx 配置目录已就绪", map[string]interface{}{
			"baseDir": paths.BaseDir,
		})
	}

	// 中间件
	r.Use(middleware.RealIP)
	r.Use(middleware.RequestID)
	r.Use(requestLogger)
	r.Use(middleware.Recoverer)

	// CORS 配置
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Requested-With"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	s := &Server{
		router: r,
		cfg:    cfg,
	}

	s.setupRoutes()

	return s
}

// setupRoutes 设置路由
func (s *Server) setupRoutes() {
	// API 路由
	s.router.Route("/api", func(r chi.Router) {
		// 认证路由
		r.Mount("/auth", auth.Router())

		// Nginx 管理路由
		r.Mount("/nginx", nginx.Router())

		// SSL 证书管理路由
		r.Mount("/ssl", ssl.Router())
	})

	// 静态文件服务 (SPA)
	distDir := filepath.Join(s.cfg.Data.Dir, "../dist")
	assetsHandler := assets.NewHandler(distDir)
	s.router.Handle("/*", assetsHandler)
}

// Run 启动服务器
func (s *Server) Run() error {
	addr := s.cfg.Address()

	log.Info("服务器启动中...", map[string]interface{}{
		"host": s.cfg.Server.Host,
		"port": s.cfg.Server.Port,
	})

	// 获取局域网 IP
	localIP := getLocalIP()

	log.Info("后端已启动:")
	log.Info(fmt.Sprintf("  ➜ 本地:   http://localhost:%d", s.cfg.Server.Port))
	log.Info(fmt.Sprintf("  ➜ 局域网: http://%s:%d", localIP, s.cfg.Server.Port))

	server := &http.Server{
		Addr:         addr,
		Handler:      s.router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	return server.ListenAndServe()
}

// requestLogger 请求日志中间件
func requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// 包装 ResponseWriter 以获取状态码
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)

		log.Info("incoming request", map[string]interface{}{
			"method": r.Method,
			"path":   r.URL.Path,
		})

		next.ServeHTTP(ww, r)

		log.Info("response sent", map[string]interface{}{
			"method":   r.Method,
			"path":     r.URL.Path,
			"status":   ww.Status(),
			"duration": time.Since(start).String(),
		})
	})
}

// getLocalIP 获取局域网 IP
func getLocalIP() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "localhost"
	}

	for _, addr := range addrs {
		if ipNet, ok := addr.(*net.IPNet); ok && !ipNet.IP.IsLoopback() {
			if ipNet.IP.To4() != nil {
				return ipNet.IP.String()
			}
		}
	}

	return "localhost"
}
