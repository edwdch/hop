package ssl

import (
	"time"
)

// Scheduler 定时任务调度器
type Scheduler struct {
	email    string
	days     int
	interval time.Duration
	stop     chan struct{}
}

// NewScheduler 创建调度器
func NewScheduler(email string, days int, interval time.Duration) *Scheduler {
	return &Scheduler{
		email:    email,
		days:     days,
		interval: interval,
		stop:     make(chan struct{}),
	}
}

// Start 启动定时任务
func (s *Scheduler) Start() {
	log.Info("启动证书自动续期检查", map[string]interface{}{
		"days":     s.days,
		"interval": s.interval.String(),
	})

	// 立即执行一次检查
	go s.check()

	// 定时执行
	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			go s.check()
		case <-s.stop:
			log.Info("停止证书自动续期检查")
			return
		}
	}
}

// Stop 停止定时任务
func (s *Scheduler) Stop() {
	close(s.stop)
}

// check 执行检查
func (s *Scheduler) check() {
	log.Info("执行证书过期检查...")
	CheckAndRenewCertificates(s.email, s.days)
}

// SetEmail 更新邮箱
func (s *Scheduler) SetEmail(email string) {
	s.email = email
}
