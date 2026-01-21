package database

import (
	"database/sql"
	"time"

	"github.com/hop/backend/internal/logger"
)

var userLog = logger.WithTag("database:user")

// CreateUser 创建用户
func CreateUser(user *User) error {
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := db.Exec(`
		INSERT INTO user (id, email, emailVerified, name, image, createdAt, updatedAt)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, user.ID, user.Email, user.EmailVerified, user.Name, user.Image, now, now)

	if err != nil {
		return err
	}

	userLog.Info("用户创建成功", map[string]interface{}{
		"userId": user.ID,
		"email":  user.Email,
	})
	return nil
}

// GetUserByEmail 通过邮箱获取用户
func GetUserByEmail(email string) (*User, error) {
	row := db.QueryRow(`
		SELECT id, email, emailVerified, name, image, createdAt, updatedAt
		FROM user WHERE email = ?
	`, email)

	var user User
	var createdAt, updatedAt string
	var emailVerified int

	err := row.Scan(&user.ID, &user.Email, &emailVerified, &user.Name, &user.Image, &createdAt, &updatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	user.EmailVerified = emailVerified == 1
	user.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	user.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)

	return &user, nil
}

// GetUserByID 通过ID获取用户
func GetUserByID(id string) (*User, error) {
	row := db.QueryRow(`
		SELECT id, email, emailVerified, name, image, createdAt, updatedAt
		FROM user WHERE id = ?
	`, id)

	var user User
	var createdAt, updatedAt string
	var emailVerified int

	err := row.Scan(&user.ID, &user.Email, &emailVerified, &user.Name, &user.Image, &createdAt, &updatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	user.EmailVerified = emailVerified == 1
	user.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	user.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)

	return &user, nil
}

// HasUsers 检查是否有用户
func HasUsers() (bool, error) {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM user").Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// GetAccountByUserID 通过用户ID获取账户（用于密码验证）
func GetAccountByUserID(userID string, providerID string) (*Account, error) {
	row := db.QueryRow(`
		SELECT id, userId, accountId, providerId, password, createdAt, updatedAt
		FROM account WHERE userId = ? AND providerId = ?
	`, userID, providerID)

	var account Account
	var createdAt, updatedAt string

	err := row.Scan(&account.ID, &account.UserID, &account.AccountID, &account.ProviderID,
		&account.Password, &createdAt, &updatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	account.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	account.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)

	return &account, nil
}

// CreateAccount 创建账户
func CreateAccount(account *Account) error {
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := db.Exec(`
		INSERT INTO account (id, userId, accountId, providerId, password, createdAt, updatedAt)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, account.ID, account.UserID, account.AccountID, account.ProviderID, account.Password, now, now)

	return err
}
