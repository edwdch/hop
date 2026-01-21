package database

import (
	"database/sql"
	"time"

	_ "github.com/mattn/go-sqlite3"

	"github.com/hop/backend/internal/config"
	"github.com/hop/backend/internal/logger"
)

var db *sql.DB
var log = logger.WithTag("database")

// User 用户模型（兼容 Better Auth schema）
type User struct {
	ID            string    `json:"id"`
	Email         string    `json:"email"`
	EmailVerified bool      `json:"emailVerified"`
	Name          string    `json:"name"`
	Image         *string   `json:"image"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// Session 会话模型（兼容 Better Auth schema）
type Session struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expiresAt"`
	IPAddress *string   `json:"ipAddress"`
	UserAgent *string   `json:"userAgent"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Account 账户模型（兼容 Better Auth schema）
type Account struct {
	ID                    string     `json:"id"`
	UserID                string     `json:"userId"`
	AccountID             string     `json:"accountId"`
	ProviderID            string     `json:"providerId"`
	AccessToken           *string    `json:"accessToken"`
	RefreshToken          *string    `json:"refreshToken"`
	AccessTokenExpiresAt  *time.Time `json:"accessTokenExpiresAt"`
	RefreshTokenExpiresAt *time.Time `json:"refreshTokenExpiresAt"`
	Scope                 *string    `json:"scope"`
	IDToken               *string    `json:"idToken"`
	Password              *string    `json:"password"`
	CreatedAt             time.Time  `json:"createdAt"`
	UpdatedAt             time.Time  `json:"updatedAt"`
}

// Verification 验证模型
type Verification struct {
	ID         string    `json:"id"`
	Identifier string    `json:"identifier"`
	Value      string    `json:"value"`
	ExpiresAt  time.Time `json:"expiresAt"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

// Init 初始化数据库
func Init(cfg *config.Config) error {
	var err error
	db, err = sql.Open("sqlite3", cfg.DBPath())
	if err != nil {
		return err
	}

	// 设置连接池
	db.SetMaxOpenConns(1) // SQLite 单连接
	db.SetMaxIdleConns(1)

	// 运行迁移
	if err := runMigrations(); err != nil {
		return err
	}

	log.Info("数据库初始化完成", map[string]interface{}{"path": cfg.DBPath()})
	return nil
}

// GetDB 获取数据库连接
func GetDB() *sql.DB {
	return db
}

// Close 关闭数据库
func Close() error {
	if db != nil {
		return db.Close()
	}
	return nil
}

// runMigrations 运行数据库迁移（兼容 Better Auth schema）
func runMigrations() error {
	migrations := []string{
		// User 表
		`CREATE TABLE IF NOT EXISTS user (
			id TEXT PRIMARY KEY,
			email TEXT UNIQUE NOT NULL,
			emailVerified INTEGER DEFAULT 0,
			name TEXT,
			image TEXT,
			createdAt TEXT NOT NULL,
			updatedAt TEXT NOT NULL
		)`,

		// Session 表
		`CREATE TABLE IF NOT EXISTS session (
			id TEXT PRIMARY KEY,
			userId TEXT NOT NULL,
			token TEXT UNIQUE NOT NULL,
			expiresAt TEXT NOT NULL,
			ipAddress TEXT,
			userAgent TEXT,
			createdAt TEXT NOT NULL,
			updatedAt TEXT NOT NULL,
			FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
		)`,

		// Account 表
		`CREATE TABLE IF NOT EXISTS account (
			id TEXT PRIMARY KEY,
			userId TEXT NOT NULL,
			accountId TEXT NOT NULL,
			providerId TEXT NOT NULL,
			accessToken TEXT,
			refreshToken TEXT,
			accessTokenExpiresAt TEXT,
			refreshTokenExpiresAt TEXT,
			scope TEXT,
			idToken TEXT,
			password TEXT,
			createdAt TEXT NOT NULL,
			updatedAt TEXT NOT NULL,
			FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
		)`,

		// Verification 表
		`CREATE TABLE IF NOT EXISTS verification (
			id TEXT PRIMARY KEY,
			identifier TEXT NOT NULL,
			value TEXT NOT NULL,
			expiresAt TEXT NOT NULL,
			createdAt TEXT NOT NULL,
			updatedAt TEXT NOT NULL
		)`,

		// 索引
		`CREATE INDEX IF NOT EXISTS idx_session_userId ON session(userId)`,
		`CREATE INDEX IF NOT EXISTS idx_session_token ON session(token)`,
		`CREATE INDEX IF NOT EXISTS idx_account_userId ON account(userId)`,
		`CREATE INDEX IF NOT EXISTS idx_user_email ON user(email)`,
	}

	for _, migration := range migrations {
		if _, err := db.Exec(migration); err != nil {
			return err
		}
	}

	log.Info("数据库迁移完成")
	return nil
}
