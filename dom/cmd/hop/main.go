package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/spf13/cobra"

	"github.com/hop/backend/internal/config"
	"github.com/hop/backend/internal/database"
	"github.com/hop/backend/internal/logger"
	"github.com/hop/backend/internal/server"
)

var (
	// 版本信息（构建时注入）
	version = "dev"
	commit  = "none"
	date    = "unknown"
)

var configFile string

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

var rootCmd = &cobra.Command{
	Use:   "hop",
	Short: "Hop - Nginx 配置管理工具",
	Long: `Hop 是一个现代化的 Nginx 配置管理工具。

使用 -C 参数指定配置文件来启动服务器：
  hop -C config.toml

使用 'hop init' 生成默认配置文件。`,
	Run: func(cmd *cobra.Command, args []string) {
		// 如果没有指定 -C，显示帮助
		if configFile == "" {
			cmd.Help()
			return
		}

		// 启动服务器
		runServer()
	},
}

var initCmd = &cobra.Command{
	Use:   "init [filename]",
	Short: "生成默认配置文件",
	Long:  `生成默认配置文件。如果不指定文件名，默认生成 config.toml`,
	Args:  cobra.MaximumNArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		filename := "config.toml"
		if len(args) > 0 {
			filename = args[0]
		}

		// 检查文件是否已存在
		if _, err := os.Stat(filename); err == nil {
			fmt.Printf("错误: 文件 %s 已存在\n", filename)
			os.Exit(1)
		}

		// 写入默认配置
		content := config.GenerateDefault()
		if err := os.WriteFile(filename, []byte(content), 0644); err != nil {
			fmt.Printf("错误: 无法写入配置文件: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("配置文件已生成: %s\n", filename)
		fmt.Println("\n使用以下命令启动服务器:")
		fmt.Printf("  hop -C %s\n", filename)
	},
}

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "显示版本信息",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Printf("Hop %s\n", version)
		fmt.Printf("  Commit: %s\n", commit)
		fmt.Printf("  Built:  %s\n", date)
	},
}

func init() {
	rootCmd.PersistentFlags().StringVarP(&configFile, "config", "C", "", "配置文件路径")
	rootCmd.AddCommand(initCmd)
	rootCmd.AddCommand(versionCmd)
}

func runServer() {
	// 加载配置
	cfg, err := config.Load(configFile)
	if err != nil {
		fmt.Fprintf(os.Stderr, "错误: %v\n", err)
		os.Exit(1)
	}

	logger.Info("配置已加载", map[string]interface{}{
		"config": configFile,
	})

	// 初始化数据库
	if err := database.Init(cfg); err != nil {
		fmt.Fprintf(os.Stderr, "初始化数据库失败: %v\n", err)
		os.Exit(1)
	}
	defer database.Close()

	// 创建服务器
	srv := server.New(cfg)

	// 优雅关闭
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		logger.Info("正在关闭服务器...")
		database.Close()
		os.Exit(0)
	}()

	// 启动服务器
	if err := srv.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "服务器启动失败: %v\n", err)
		os.Exit(1)
	}
}
