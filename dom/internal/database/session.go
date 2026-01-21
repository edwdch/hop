package database

import (
	"time"

	"github.com/hop/backend/internal/logger"
)

var sessionLog = logger.WithTag("database:session")

// CreateSession 创建会话
func CreateSession(session *Session) error {
	now := time.Now().UTC().Format(time.RFC3339)
	expiresAt := session.ExpiresAt.UTC().Format(time.RFC3339)

	_, err := db.Exec(`
		INSERT INTO session (id, userId, token, expiresAt, ipAddress, userAgent, createdAt, updatedAt)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, session.ID, session.UserID, session.Token, expiresAt, session.IPAddress, session.UserAgent, now, now)

	if err != nil {
		return err
	}

	sessionLog.Info("会话创建成功", map[string]interface{}{
		"sessionId": session.ID,
		"userId":    session.UserID,
	})
	return nil
}

// GetSessionByToken 通过token获取会话
func GetSessionByToken(token string) (*Session, error) {
	row := db.QueryRow(`
		SELECT id, userId, token, expiresAt, ipAddress, userAgent, createdAt, updatedAt
		FROM session WHERE token = ?
	`, token)

	var session Session
	var expiresAt, createdAt, updatedAt string

	err := row.Scan(&session.ID, &session.UserID, &session.Token, &expiresAt,
		&session.IPAddress, &session.UserAgent, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}

	session.ExpiresAt, _ = time.Parse(time.RFC3339, expiresAt)
	session.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	session.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)

	return &session, nil
}

// DeleteSession 删除会话
func DeleteSession(token string) error {
	_, err := db.Exec("DELETE FROM session WHERE token = ?", token)
	return err
}

// DeleteExpiredSessions 删除过期会话
func DeleteExpiredSessions() error {
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := db.Exec("DELETE FROM session WHERE expiresAt < ?", now)
	return err
}

// UpdateSessionExpiry 更新会话过期时间
func UpdateSessionExpiry(token string, expiresAt time.Time) error {
	now := time.Now().UTC().Format(time.RFC3339)
	expires := expiresAt.UTC().Format(time.RFC3339)
	_, err := db.Exec(`
		UPDATE session SET expiresAt = ?, updatedAt = ? WHERE token = ?
	`, expires, now, token)
	return err
}
