package auth

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/hop/backend/internal/database"
	"github.com/hop/backend/internal/logger"
)

var log = logger.WithTag("auth")

const (
	sessionCookieName = "hop_session"
	sessionDuration   = 7 * 24 * time.Hour // 7 天
	updateAge         = 24 * time.Hour     // 每天更新一次
)

// SignUpRequest 注册请求
type SignUpRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

// SignInRequest 登录请求
type SignInRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// UserResponse 用户响应
type UserResponse struct {
	ID            string  `json:"id"`
	Email         string  `json:"email"`
	Name          string  `json:"name"`
	Image         *string `json:"image"`
	EmailVerified bool    `json:"emailVerified"`
}

// SessionResponse 会话响应
type SessionResponse struct {
	User      *UserResponse `json:"user"`
	Session   *SessionInfo  `json:"session"`
	ExpiresAt string        `json:"expiresAt"`
}

// SessionInfo 会话信息
type SessionInfo struct {
	ID        string `json:"id"`
	UserID    string `json:"userId"`
	ExpiresAt string `json:"expiresAt"`
}

// Router 创建认证路由
func Router() chi.Router {
	r := chi.NewRouter()

	r.Get("/need-init", handleNeedInit)
	r.Post("/sign-up/email", handleSignUp)
	r.Post("/sign-in/email", handleSignIn)
	r.Post("/sign-out", handleSignOut)
	r.Get("/get-session", handleGetSession)
	r.Get("/nginx", handleNginxAuthValidate)

	return r
}

// handleNeedInit 检查是否需要初始化
func handleNeedInit(w http.ResponseWriter, r *http.Request) {
	hasUsers, err := database.HasUsers()
	if err != nil {
		jsonError(w, "数据库错误", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]bool{"needInit": !hasUsers})
}

// handleSignUp 处理注册
func handleSignUp(w http.ResponseWriter, r *http.Request) {
	var req SignUpRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "无效的请求体", http.StatusBadRequest)
		return
	}

	// 验证
	if req.Email == "" || req.Password == "" {
		jsonError(w, "邮箱和密码不能为空", http.StatusBadRequest)
		return
	}

	// 检查邮箱是否已存在
	existingUser, err := database.GetUserByEmail(req.Email)
	if err != nil {
		jsonError(w, "数据库错误", http.StatusInternalServerError)
		return
	}
	if existingUser != nil {
		jsonError(w, "邮箱已被注册", http.StatusConflict)
		return
	}

	// 生成密码哈希
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		jsonError(w, "密码处理失败", http.StatusInternalServerError)
		return
	}

	// 创建用户
	userID := uuid.New().String()
	user := &database.User{
		ID:            userID,
		Email:         req.Email,
		Name:          req.Name,
		EmailVerified: false,
	}

	if err := database.CreateUser(user); err != nil {
		jsonError(w, "创建用户失败", http.StatusInternalServerError)
		return
	}

	// 创建账户（存储密码）
	account := &database.Account{
		ID:         uuid.New().String(),
		UserID:     userID,
		AccountID:  userID,
		ProviderID: "credential",
		Password:   stringPtr(string(hashedPassword)),
	}

	if err := database.CreateAccount(account); err != nil {
		jsonError(w, "创建账户失败", http.StatusInternalServerError)
		return
	}

	// 创建会话
	session, err := createSession(userID, r)
	if err != nil {
		jsonError(w, "创建会话失败", http.StatusInternalServerError)
		return
	}

	// 设置 cookie
	setSessionCookie(w, session.Token, session.ExpiresAt)

	log.Info("用户注册成功", map[string]interface{}{
		"userId": userID,
		"email":  req.Email,
	})

	jsonResponse(w, map[string]interface{}{
		"user": UserResponse{
			ID:            user.ID,
			Email:         user.Email,
			Name:          user.Name,
			EmailVerified: user.EmailVerified,
		},
	})
}

// handleSignIn 处理登录
func handleSignIn(w http.ResponseWriter, r *http.Request) {
	var req SignInRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "无效的请求体", http.StatusBadRequest)
		return
	}

	// 验证
	if req.Email == "" || req.Password == "" {
		jsonError(w, "邮箱和密码不能为空", http.StatusBadRequest)
		return
	}

	// 获取用户
	user, err := database.GetUserByEmail(req.Email)
	if err != nil {
		jsonError(w, "数据库错误", http.StatusInternalServerError)
		return
	}
	if user == nil {
		jsonError(w, "邮箱或密码错误", http.StatusUnauthorized)
		return
	}

	// 获取账户（密码）
	account, err := database.GetAccountByUserID(user.ID, "credential")
	if err != nil {
		jsonError(w, "数据库错误", http.StatusInternalServerError)
		return
	}
	if account == nil || account.Password == nil {
		jsonError(w, "邮箱或密码错误", http.StatusUnauthorized)
		return
	}

	// 验证密码
	if err := bcrypt.CompareHashAndPassword([]byte(*account.Password), []byte(req.Password)); err != nil {
		jsonError(w, "邮箱或密码错误", http.StatusUnauthorized)
		return
	}

	// 创建会话
	session, err := createSession(user.ID, r)
	if err != nil {
		jsonError(w, "创建会话失败", http.StatusInternalServerError)
		return
	}

	// 获取跨域 Cookie 域名参数（用于反向代理认证场景）
	cookieDomain := r.URL.Query().Get("cookie_domain")

	// 设置 cookie（支持跨域）
	setSessionCookieWithDomain(w, session.Token, session.ExpiresAt, cookieDomain)

	log.Info("用户登录成功", map[string]interface{}{
		"userId":       user.ID,
		"email":        user.Email,
		"cookieDomain": cookieDomain,
	})

	jsonResponse(w, map[string]interface{}{
		"user": UserResponse{
			ID:            user.ID,
			Email:         user.Email,
			Name:          user.Name,
			Image:         user.Image,
			EmailVerified: user.EmailVerified,
		},
		"session": SessionInfo{
			ID:        session.ID,
			UserID:    session.UserID,
			ExpiresAt: session.ExpiresAt.Format(time.RFC3339),
		},
	})
}

// handleSignOut 处理登出
func handleSignOut(w http.ResponseWriter, r *http.Request) {
	token := getSessionToken(r)
	if token != "" {
		_ = database.DeleteSession(token)
	}

	// 清除 cookie
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	jsonResponse(w, map[string]bool{"success": true})
}

// handleGetSession 获取当前会话
func handleGetSession(w http.ResponseWriter, r *http.Request) {
	token := getSessionToken(r)
	if token == "" {
		jsonResponse(w, map[string]interface{}{"session": nil})
		return
	}

	session, err := database.GetSessionByToken(token)
	if err != nil {
		jsonResponse(w, map[string]interface{}{"session": nil})
		return
	}

	// 检查会话是否过期
	if time.Now().After(session.ExpiresAt) {
		_ = database.DeleteSession(token)
		jsonResponse(w, map[string]interface{}{"session": nil})
		return
	}

	// 获取用户
	user, err := database.GetUserByID(session.UserID)
	if err != nil || user == nil {
		jsonResponse(w, map[string]interface{}{"session": nil})
		return
	}

	// 更新会话过期时间（如果需要）
	if time.Until(session.ExpiresAt) < sessionDuration-updateAge {
		newExpiry := time.Now().Add(sessionDuration)
		_ = database.UpdateSessionExpiry(token, newExpiry)
		setSessionCookie(w, token, newExpiry)
		session.ExpiresAt = newExpiry
	}

	jsonResponse(w, map[string]interface{}{
		"user": UserResponse{
			ID:            user.ID,
			Email:         user.Email,
			Name:          user.Name,
			Image:         user.Image,
			EmailVerified: user.EmailVerified,
		},
		"session": SessionInfo{
			ID:        session.ID,
			UserID:    session.UserID,
			ExpiresAt: session.ExpiresAt.Format(time.RFC3339),
		},
	})
}

// handleNginxAuthValidate 处理 Nginx auth_request 验证
// 用于反向代理的身份验证，Nginx 通过 auth_request 指令调用此端点
func handleNginxAuthValidate(w http.ResponseWriter, r *http.Request) {
	token := getSessionToken(r)
	if token == "" {
		// 未提供 token：返回 401
		w.Header().Set("X-Auth-Err", "no_token")
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	session, err := database.GetSessionByToken(token)
	if err != nil {
		// 无效 token：返回 401
		w.Header().Set("X-Auth-Err", "invalid_token")
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	// 检查会话是否过期
	if time.Now().After(session.ExpiresAt) {
		_ = database.DeleteSession(token)
		w.Header().Set("X-Auth-Err", "token_expired")
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	// 获取用户
	user, err := database.GetUserByID(session.UserID)
	if err != nil || user == nil {
		w.Header().Set("X-Auth-Err", "user_not_found")
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	// 已登录：返回 200，并在 header 中传递用户信息
	w.Header().Set("X-Auth-User", user.Email)
	w.Header().Set("X-Auth-UserID", user.ID)
	w.Header().Set("X-Auth-UserName", user.Name)
	w.WriteHeader(http.StatusOK)
}

// GetCurrentUser 获取当前用户（用于中间件）
func GetCurrentUser(r *http.Request) (*database.User, error) {
	token := getSessionToken(r)
	if token == "" {
		return nil, nil
	}

	session, err := database.GetSessionByToken(token)
	if err != nil {
		return nil, err
	}

	if time.Now().After(session.ExpiresAt) {
		return nil, nil
	}

	return database.GetUserByID(session.UserID)
}

// createSession 创建会话
func createSession(userID string, r *http.Request) (*database.Session, error) {
	token, err := generateToken(32)
	if err != nil {
		return nil, err
	}

	session := &database.Session{
		ID:        uuid.New().String(),
		UserID:    userID,
		Token:     token,
		ExpiresAt: time.Now().Add(sessionDuration),
		IPAddress: stringPtr(getClientIP(r)),
		UserAgent: stringPtr(r.UserAgent()),
	}

	if err := database.CreateSession(session); err != nil {
		return nil, err
	}

	return session, nil
}

// setSessionCookie 设置会话 cookie
func setSessionCookie(w http.ResponseWriter, token string, expiresAt time.Time) {
	setSessionCookieWithDomain(w, token, expiresAt, "")
}

// setSessionCookieWithDomain 设置会话 cookie（支持指定域名）
// domain 为空时使用当前域名，非空时设置为指定域名（用于跨子域名共享）
func setSessionCookieWithDomain(w http.ResponseWriter, token string, expiresAt time.Time, domain string) {
	cookie := &http.Cookie{
		Name:     sessionCookieName,
		Value:    token,
		Path:     "/",
		Expires:  expiresAt,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   false, // 生产环境应设为 true
	}
	// 如果指定了域名，设置 Domain 属性以支持跨子域名
	if domain != "" {
		cookie.Domain = domain
	}
	http.SetCookie(w, cookie)
}

// getSessionToken 获取会话 token
func getSessionToken(r *http.Request) string {
	// 优先从 cookie 获取
	if cookie, err := r.Cookie(sessionCookieName); err == nil {
		return cookie.Value
	}

	// 从 Authorization header 获取
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimPrefix(auth, "Bearer ")
	}

	return ""
}

// generateToken 生成随机 token
func generateToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// getClientIP 获取客户端 IP
func getClientIP(r *http.Request) string {
	// 优先检查代理头
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}
	// 从 RemoteAddr 提取
	parts := strings.Split(r.RemoteAddr, ":")
	if len(parts) > 0 {
		return parts[0]
	}
	return r.RemoteAddr
}

// Helper functions
func stringPtr(s string) *string {
	return &s
}

func jsonResponse(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func jsonError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
