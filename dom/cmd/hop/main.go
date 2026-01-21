package main

import (
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
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

var systemdCmd = &cobra.Command{
	Use:   "systemd",
	Short: "生成 systemd 服务配置",
	Long: `生成推荐的 systemd 服务配置文件。

示例:
  hop systemd                     # 输出到终端
  hop systemd -o hop.service      # 写入文件
  hop systemd --install           # 直接安装到系统 (需要 root 权限)`,
	Run: runSystemdCmd,
}

var (
	systemdOutput  string
	systemdInstall bool
)

func init() {
	rootCmd.PersistentFlags().StringVarP(&configFile, "config", "C", "", "配置文件路径")
	rootCmd.AddCommand(initCmd)
	rootCmd.AddCommand(versionCmd)
	rootCmd.AddCommand(systemdCmd)

	systemdCmd.Flags().StringVarP(&systemdOutput, "output", "o", "", "输出文件路径")
	systemdCmd.Flags().BoolVar(&systemdInstall, "install", false, "直接安装到 /etc/systemd/system/")
}

func runSystemdCmd(cmd *cobra.Command, args []string) {
	// 获取当前工作目录作为配置文件的父目录
	workDir, err := os.Getwd()
	if err != nil {
		fmt.Fprintf(os.Stderr, "错误: 无法获取工作目录: %v\n", err)
		os.Exit(1)
	}

	// 配置文件路径：使用当前目录下的 config.toml
	configPath := filepath.Join(workDir, "config.toml")
	if configFile != "" {
		// 如果指定了配置文件，转换为绝对路径
		if filepath.IsAbs(configFile) {
			configPath = configFile
		} else {
			configPath = filepath.Join(workDir, configFile)
		}
	}

	// 生成 systemd 配置
	serviceContent := generateSystemdService(configPath)

	// 根据选项处理输出
	if systemdInstall {
		// 直接安装到系统
		servicePath := "/etc/systemd/system/hop.service"
		if err := os.WriteFile(servicePath, []byte(serviceContent), 0644); err != nil {
			fmt.Fprintf(os.Stderr, "错误: 无法写入服务文件 (需要 root 权限): %v\n", err)
			os.Exit(1)
		}
		fmt.Printf("服务文件已安装: %s\n", servicePath)
		fmt.Println("\n后续步骤:")
		fmt.Println("  sudo systemctl daemon-reload")
		fmt.Println("  sudo systemctl enable hop")
		fmt.Println("  sudo systemctl start hop")
	} else if systemdOutput != "" {
		// 写入指定文件
		if _, err := os.Stat(systemdOutput); err == nil {
			fmt.Fprintf(os.Stderr, "错误: 文件 %s 已存在\n", systemdOutput)
			os.Exit(1)
		}
		if err := os.WriteFile(systemdOutput, []byte(serviceContent), 0644); err != nil {
			fmt.Fprintf(os.Stderr, "错误: 无法写入文件: %v\n", err)
			os.Exit(1)
		}
		fmt.Printf("服务文件已生成: %s\n", systemdOutput)
		fmt.Println("\n安装步骤:")
		fmt.Printf("  sudo cp %s /etc/systemd/system/\n", systemdOutput)
		fmt.Println("  sudo systemctl daemon-reload")
		fmt.Println("  sudo systemctl enable hop")
		fmt.Println("  sudo systemctl start hop")
	} else {
		// 输出到终端
		fmt.Println(serviceContent)
	}
}

func generateSystemdService(configPath string) string {
	return fmt.Sprintf(`[Unit]
Description=Hop - Nginx Configuration Manager
Documentation=https://github.com/hop/hop
After=network.target nginx.service
Wants=nginx.service

[Service]
Type=simple
User=root
Group=root
ExecStart=/usr/local/bin/hop -C %s
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

# 安全加固
NoNewPrivileges=false
ProtectSystem=full
ProtectHome=read-only
PrivateTmp=true

# 环境变量
Environment=GIN_MODE=release

[Install]
WantedBy=multi-user.target
`, configPath)
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
