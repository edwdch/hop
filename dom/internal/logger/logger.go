package logger

import (
	"fmt"
	"log"
	"os"
	"time"
)

// Level 日志级别
type Level int

const (
	DEBUG Level = iota
	INFO
	WARN
	ERROR
)

// Logger 日志记录器
type Logger struct {
	tag    string
	level  Level
	logger *log.Logger
}

var defaultLogger *Logger

func init() {
	defaultLogger = New("hop")
}

// New 创建新的日志记录器
func New(tag string) *Logger {
	return &Logger{
		tag:    tag,
		level:  INFO,
		logger: log.New(os.Stdout, "", 0),
	}
}

// WithTag 创建带标签的子日志记录器
func WithTag(tag string) *Logger {
	return New(tag)
}

// Default 获取默认日志记录器
func Default() *Logger {
	return defaultLogger
}

// SetLevel 设置日志级别
func (l *Logger) SetLevel(level Level) {
	l.level = level
}

func (l *Logger) formatMessage(level string, msg string, fields map[string]interface{}) string {
	timestamp := time.Now().Format("2006-01-02 15:04:05")
	base := fmt.Sprintf("[%s] [%s] [%s] %s", timestamp, l.tag, level, msg)

	if len(fields) > 0 {
		base += " |"
		for k, v := range fields {
			base += fmt.Sprintf(" %s=%v", k, v)
		}
	}

	return base
}

// Debug 调试日志
func (l *Logger) Debug(msg string, fields ...map[string]interface{}) {
	if l.level <= DEBUG {
		f := mergeFields(fields)
		l.logger.Println(l.formatMessage("DEBUG", msg, f))
	}
}

// Info 信息日志
func (l *Logger) Info(msg string, fields ...map[string]interface{}) {
	if l.level <= INFO {
		f := mergeFields(fields)
		l.logger.Println(l.formatMessage("INFO", msg, f))
	}
}

// Warn 警告日志
func (l *Logger) Warn(msg string, fields ...map[string]interface{}) {
	if l.level <= WARN {
		f := mergeFields(fields)
		l.logger.Println(l.formatMessage("WARN", msg, f))
	}
}

// Error 错误日志
func (l *Logger) Error(msg string, fields ...map[string]interface{}) {
	if l.level <= ERROR {
		f := mergeFields(fields)
		l.logger.Println(l.formatMessage("ERROR", msg, f))
	}
}

func mergeFields(fields []map[string]interface{}) map[string]interface{} {
	if len(fields) == 0 {
		return nil
	}
	result := make(map[string]interface{})
	for _, f := range fields {
		for k, v := range f {
			result[k] = v
		}
	}
	return result
}

// 便捷函数
func Info(msg string, fields ...map[string]interface{}) {
	defaultLogger.Info(msg, fields...)
}

func Debug(msg string, fields ...map[string]interface{}) {
	defaultLogger.Debug(msg, fields...)
}

func Warn(msg string, fields ...map[string]interface{}) {
	defaultLogger.Warn(msg, fields...)
}

func Error(msg string, fields ...map[string]interface{}) {
	defaultLogger.Error(msg, fields...)
}
