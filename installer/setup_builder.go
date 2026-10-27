package main

import (
	"archive/zip"
	"bytes"
	_ "embed"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
	"unsafe"
)

//go:embed payload.zip
var embeddedPayload []byte

var (
	user32          = syscall.NewLazyDLL("user32.dll")
	procMessageBoxW = user32.NewProc("MessageBoxW")
)

const (
	MB_OK              = 0x00000000
	MB_OKCANCEL        = 0x00000001
	MB_YESNOCANCEL     = 0x00000003
	MB_ICONQUESTION    = 0x00000020
	MB_ICONINFORMATION = 0x00000040
	MB_ICONWARNING     = 0x00000030
	MB_ICONERROR       = 0x00000010
	IDOK               = 1
	IDCANCEL           = 2
	IDYES              = 6
	IDNO               = 7
)

const (
	AppVersion = "2.4.7"
	AppName    = "Grid IP Scanner2"
)

func showMsgBox(title, text string, style uint32) int {
	tPtr, _ := syscall.UTF16PtrFromString(title)
	mPtr, _ := syscall.UTF16PtrFromString(text)
	ret, _, _ := procMessageBoxW.Call(0, uintptr(unsafe.Pointer(mPtr)), uintptr(unsafe.Pointer(tPtr)), uintptr(style))
	return int(ret)
}

func isSilent() bool {
	for _, arg := range os.Args[1:] {
		upper := strings.ToUpper(strings.TrimSpace(arg))
		if upper == "/SILENT" || upper == "/VERYSILENT" || upper == "/SUPPRESSMSGBOXES" ||
			upper == "/S" || upper == "-S" || upper == "--SILENT" || upper == "/QN" || upper == "-Q" || upper == "/QUIET" {
			return true
		}
	}
	return false
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func killExistingProcesses() {
	// Terminate any currently running instances of Grid IP Scanner2 before overwriting
	cmd1 := exec.Command("taskkill", "/F", "/IM", "Grid IP Scanner2*.exe")
	cmd1.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	_ = cmd1.Run()

	cmd2 := exec.Command("taskkill", "/F", "/IM", "Grid_IP_Scanner2.exe")
	cmd2.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	_ = cmd2.Run()
}

func registerFirewallRule(ruleName, exePath string) {
	// 1. Inbound rule (인바운드 허용 사전 조용 등록)
	cmdIn := exec.Command("netsh", "advfirewall", "firewall", "add", "rule",
		fmt.Sprintf("name=%s", ruleName), "dir=in", "action=allow", fmt.Sprintf("program=%s", exePath), "enable=yes", "profile=any")
	cmdIn.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	_ = cmdIn.Run()

	// 2. Outbound rule (아웃바운드 허용 사전 조용 등록)
	cmdOut := exec.Command("netsh", "advfirewall", "firewall", "add", "rule",
		fmt.Sprintf("name=%s (Outbound)", ruleName), "dir=out", "action=allow", fmt.Sprintf("program=%s", exePath), "enable=yes", "profile=any")
	cmdOut.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	_ = cmdOut.Run()
}

func createDesktopShortcut(exePath, targetName string) {
	psCmd := fmt.Sprintf(`$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), '%s.lnk')); $s.TargetPath = '%s'; $s.WorkingDirectory = [System.IO.Path]::GetDirectoryName('%s'); $s.Save()`, targetName, exePath, exePath)
	cmd := exec.Command("powershell", "-NoProfile", "-Command", psCmd)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	_ = cmd.Run()
}

func createStartMenuShortcut(exePath, targetName string) {
	psCmd := fmt.Sprintf(`$ws = New-Object -ComObject WScript.Shell; $programs = [Environment]::GetFolderPath('CommonPrograms'); if (-not (Test-Path $programs)) { $programs = [Environment]::GetFolderPath('Programs') }; $s = $ws.CreateShortcut([System.IO.Path]::Combine($programs, '%s.lnk')); $s.TargetPath = '%s'; $s.WorkingDirectory = [System.IO.Path]::GetDirectoryName('%s'); $s.Save()`, targetName, exePath, exePath)
	cmd := exec.Command("powershell", "-NoProfile", "-Command", psCmd)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	_ = cmd.Run()
}

func createUninstaller(targetDir string) {
	uninstallerScript := `@echo off
setlocal
chcp 65001 >nul
title Grid IP Scanner2 - 프로그램 제거 (Uninstall)

net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/c \"\"%~f0\" %*\"' -Verb RunAs"
    exit /b
)

set "SILENT_MODE=0"
if /i "%1"=="/SILENT" set "SILENT_MODE=1"
if /i "%1"=="/VERYSILENT" set "SILENT_MODE=1"
if /i "%1"=="/quiet" set "SILENT_MODE=1"
if /i "%1"=="/s" set "SILENT_MODE=1"

if "%SILENT_MODE%"=="0" (
    powershell -NoProfile -Command "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; $res = [System.Windows.Forms.MessageBox]::Show('Grid IP Scanner2를 시스템에서 완전히 제거하시겠습니까?', 'Grid IP Scanner2 제거 확인', [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Question); if ($res -ne [System.Windows.Forms.DialogResult]::Yes) { exit 1 }"
    if errorlevel 1 exit /b 0
)

taskkill /F /IM "Grid_IP_Scanner2.exe" >nul 2>&1
taskkill /F /IM "Grid IP Scanner2*.exe" >nul 2>&1

netsh advfirewall firewall delete rule name="Grid IP Scanner2" >nul 2>&1
netsh advfirewall firewall delete rule name="Grid IP Scanner2 (Inbound)" >nul 2>&1
netsh advfirewall firewall delete rule name="Grid IP Scanner2 (Outbound)" >nul 2>&1
netsh advfirewall firewall delete rule name="Grid_IP_Scanner2.exe" >nul 2>&1
netsh advfirewall firewall delete rule name="Grid_IP_Scanner2.exe (Inbound)" >nul 2>&1
netsh advfirewall firewall delete rule name="Grid_IP_Scanner2.exe (Outbound)" >nul 2>&1

del /f /q "%PUBLIC%\Desktop\Grid IP Scanner2*.lnk" >nul 2>&1
del /f /q "%USERPROFILE%\Desktop\Grid IP Scanner2*.lnk" >nul 2>&1
del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Grid IP Scanner2*.lnk" >nul 2>&1
del /f /q "%ALLUSERSPROFILE%\Microsoft\Windows\Start Menu\Programs\Grid IP Scanner2*.lnk" >nul 2>&1

reg delete "HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\Grid_IP_Scanner2" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Grid_IP_Scanner2" /f >nul 2>&1
reg delete "HKLM\Software\Grid IP Scanner2" /f >nul 2>&1
reg delete "HKCU\Software\Grid IP Scanner2" /f >nul 2>&1

set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"

if "%SILENT_MODE%"=="0" (
    powershell -NoProfile -Command "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; [System.Windows.Forms.MessageBox]::Show('Grid IP Scanner2가 성공적으로 제거되었습니다.', '제거 완료', [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)" >nul 2>&1
)

start /b "" cmd.exe /c "timeout /t 1 /nobreak >nul & rd /s /q \"%APP_DIR%\""
exit /b 0
`
	uninstallerPath := filepath.Join(targetDir, "uninstall.bat")
	_ = os.WriteFile(uninstallerPath, []byte(uninstallerScript), 0755)
}

func registerAddRemovePrograms(targetDir, exePath, version string) {
	uninstallBat := filepath.Join(targetDir, "uninstall.bat")
	iconPath := filepath.Join(targetDir, "icon.ico")
	if !fileExists(iconPath) {
		iconPath = exePath
	}

	today := time.Now().Format("20060102")
	displayName := fmt.Sprintf("%s v%s", AppName, version)

	regRoots := []string{
		`HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\Grid_IP_Scanner2`,
		`HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Grid_IP_Scanner2`,
	}

	for _, regKey := range regRoots {
		cmdName := exec.Command("reg", "add", regKey, "/v", "DisplayName", "/t", "REG_SZ", "/d", displayName, "/f")
		cmdName.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		if err := cmdName.Run(); err != nil && strings.HasPrefix(regKey, "HKLM") {
			continue
		}

		_ = exec.Command("reg", "add", regKey, "/v", "DisplayVersion", "/t", "REG_SZ", "/d", version, "/f").Run()
		_ = exec.Command("reg", "add", regKey, "/v", "Publisher", "/t", "REG_SZ", "/d", "AhBiYout", "/f").Run()
		_ = exec.Command("reg", "add", regKey, "/v", "DisplayIcon", "/t", "REG_SZ", "/d", iconPath, "/f").Run()
		_ = exec.Command("reg", "add", regKey, "/v", "InstallLocation", "/t", "REG_SZ", "/d", targetDir, "/f").Run()
		_ = exec.Command("reg", "add", regKey, "/v", "UninstallString", "/t", "REG_SZ", "/d", fmt.Sprintf(`"%s"`, uninstallBat), "/f").Run()
		_ = exec.Command("reg", "add", regKey, "/v", "QuietUninstallString", "/t", "REG_SZ", "/d", fmt.Sprintf(`"%s" /SILENT`, uninstallBat), "/f").Run()
		_ = exec.Command("reg", "add", regKey, "/v", "InstallDate", "/t", "REG_SZ", "/d", today, "/f").Run()
		_ = exec.Command("reg", "add", regKey, "/v", "URLInfoAbout", "/t", "REG_SZ", "/d", "https://github.com/AhBiYout-all/grid-ip-scanner2", "/f").Run()
		_ = exec.Command("reg", "add", regKey, "/v", "HelpLink", "/t", "REG_SZ", "/d", "https://ahbiyoutvibe.blogspot.com/", "/f").Run()
		_ = exec.Command("reg", "add", regKey, "/v", "URLUpdateInfo", "/t", "REG_SZ", "/d", "https://github.com/AhBiYout-all/grid-ip-scanner2/releases", "/f").Run()
		_ = exec.Command("reg", "add", regKey, "/v", "EstimatedSize", "/t", "REG_DWORD", "/d", "125000", "/f").Run()
		_ = exec.Command("reg", "add", regKey, "/v", "NoModify", "/t", "REG_DWORD", "/d", "1", "/f").Run()
		_ = exec.Command("reg", "add", regKey, "/v", "NoRepair", "/t", "REG_DWORD", "/d", "1", "/f").Run()

		// Also register Software\Grid IP Scanner2 for quick reference
		appKey := strings.Replace(regKey, `CurrentVersion\Uninstall\Grid_IP_Scanner2`, `Grid IP Scanner2`, 1)
		_ = exec.Command("reg", "add", appKey, "/v", "InstallPath", "/t", "REG_SZ", "/d", targetDir, "/f").Run()
		_ = exec.Command("reg", "add", appKey, "/v", "Version", "/t", "REG_SZ", "/d", version, "/f").Run()
		_ = exec.Command("reg", "add", appKey, "/v", "Executable", "/t", "REG_SZ", "/d", exePath, "/f").Run()

		if strings.HasPrefix(regKey, "HKLM") {
			break
		}
	}
}

func main() {
	silent := isSilent()

	// 1. Interactive Welcome & Detailed Install Disclosure Dialog
	if !silent {
		welcomeMsg := fmt.Sprintf("%s v%s 공식 설치를 시작합니다.\n\n"+
			"[ 📌 설치 및 주요 이용 고지 사항 ]\n\n"+
			"1. 백신 오탐지 안내 (False Positive Notice)\n"+
			"   • 본 도구는 빠른 IP/포트 스캔을 수행하는 네트워크 진단 유틸리티입니다.\n"+
			"   • 무서명 스캐너 특성상 백신(Windows Defender, V3, 알약 등)에서 오탐지로 차단할 수 있으나,\n"+
			"     개인정보 탈취나 악성 기능이 100%% 없는 안전한 프로그램입니다.\n"+
			"   • 백신 차단 시 백신 설정의 '검사 예외(허용)' 목록에 추가 후 사용하십시오.\n\n"+
			"2. 이중 라이선스 및 이용 약관 (Dual Licensing Notice)\n"+
			"   • GPL v3 커뮤니티 무상 사용 및 기업 상용 독점 라이선스 정책을 준수합니다.\n"+
			"   • IEEE & Wireshark 공식 9만 건 OUI 데이터베이스가 내장되어 있습니다.\n\n"+
			"3. 시스템 및 방화벽 자동 연동\n"+
			"   • 기본 설치 경로: Program Files\\Grid IP Scanner2\n"+
			"   • 원활한 스캔을 위해 Windows 방화벽 예외 규칙이 사전 조용히 등록됩니다.\n\n"+
			"상기 고지 사항을 확인하였으며, 설치를 진행하시겠습니까?", AppName, AppVersion)

		welcomeChoice := showMsgBox("Grid IP Scanner2 설치 및 주요 이용 고지 안내", welcomeMsg, MB_OKCANCEL|MB_ICONINFORMATION)
		if welcomeChoice != IDOK {
			os.Exit(0)
		}
	}

	// 2. Resolve Installation Target Directory
	progFiles := os.Getenv("ProgramFiles")
	if progFiles == "" {
		progFiles = `C:\Program Files`
	}
	targetDir := filepath.Join(progFiles, "Grid IP Scanner2")

	// 3. Handle Existing Installation (기존 설치 감지 및 삭제/덮어쓰기 질의, 무인 설치 모드 자동 처리)
	hasExisting := false
	if entries, err := os.ReadDir(targetDir); err == nil && len(entries) > 0 {
		for _, e := range entries {
			if strings.HasSuffix(strings.ToLower(e.Name()), ".exe") {
				hasExisting = true
				break
			}
		}
	}

	if hasExisting {
		if !silent {
			choice := showMsgBox("기존 설치 감지 안내",
				fmt.Sprintf("기존 %s 프로그램이 시스템에 감지되었습니다.\n\n"+
					"어떻게 설치를 진행하시겠습니까?\n\n"+
					"• [예 (Yes)] : 기존 버전을 완전히 삭제(제거)한 후 클린 설치\n"+
					"• [아니오 (No)] : 기존 폴더에 최신 파일로 덮어쓰기 (업그레이드)\n"+
					"• [취소 (Cancel)] : 설치 작업을 중단하고 종료", AppName),
				MB_YESNOCANCEL|MB_ICONQUESTION)

			if choice == IDCANCEL {
				os.Exit(0)
			} else if choice == IDYES {
				killExistingProcesses()
				_ = os.RemoveAll(targetDir)
			} else {
				// IDNO: 덮어쓰기 진행 전 기존 프로세스 종료
				killExistingProcesses()
			}
		} else {
			// 무인(Silent) 설치 모드: 기존 프로세스 조용히 종료 후 덮어쓰기 업그레이드 진행
			killExistingProcesses()
		}
	}

	// Ensure running processes are closed to prevent file lock
	killExistingProcesses()

	// Try target directory creation, with user local AppData fallback if permission fails
	err := os.MkdirAll(targetDir, 0755)
	if err != nil {
		localAppData := os.Getenv("LOCALAPPDATA")
		if localAppData != "" {
			targetDir = filepath.Join(localAppData, "Programs", "Grid IP Scanner2")
			_ = os.MkdirAll(targetDir, 0755)
		}
	}

	// 4. Extract Embedded Payload ZIP
	zipReader, err := zip.NewReader(bytes.NewReader(embeddedPayload), int64(len(embeddedPayload)))
	if err != nil {
		if !silent {
			showMsgBox("설치 오류", fmt.Sprintf("설치 압축 패키지 파싱에 실패했습니다: %v", err), MB_ICONERROR)
		}
		os.Exit(1)
	}

	extractedCount := 0
	errorCount := 0

	for _, file := range zipReader.File {
		outPath := filepath.Join(targetDir, file.Name)
		if file.FileInfo().IsDir() {
			os.MkdirAll(outPath, 0755)
			continue
		}

		os.MkdirAll(filepath.Dir(outPath), 0755)
		outFile, openErr := os.OpenFile(outPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, file.Mode())
		if openErr != nil {
			errorCount++
			continue
		}

		rc, readErr := file.Open()
		if readErr == nil {
			_, copyErr := io.Copy(outFile, rc)
			if copyErr == nil {
				extractedCount++
			} else {
				errorCount++
			}
			rc.Close()
		} else {
			errorCount++
		}
		outFile.Close()
	}

	if extractedCount == 0 && errorCount > 0 {
		if !silent {
			showMsgBox("설치 실패",
				fmt.Sprintf("설치 폴더(%s)에 파일을 기록할 수 없습니다.\n\n"+
					"프로그램이 현재 실행 중이거나 쓰기 권한이 제한되어 있을 수 있습니다.\n"+
					"관리자 권한으로 설치 파일을 다시 실행해주세요.", targetDir),
				MB_ICONERROR)
		}
		os.Exit(1)
	}

	// 5. Clean up any legacy versioned portable executables and set Grid_IP_Scanner2.exe as primary executable
	if entries, err := os.ReadDir(targetDir); err == nil {
		for _, entry := range entries {
			lowerName := strings.ToLower(entry.Name())
			if strings.HasPrefix(lowerName, "grid ip scanner2 v") && strings.HasSuffix(lowerName, ".exe") {
				_ = os.Remove(filepath.Join(targetDir, entry.Name()))
			}
		}
	}

	aliasExe := filepath.Join(targetDir, "Grid_IP_Scanner2.exe")
	var launchExe string = aliasExe

	if !fileExists(launchExe) {
		// Fallback to any remaining .exe in targetDir
		if entries, err := os.ReadDir(targetDir); err == nil {
			for _, entry := range entries {
				if !entry.IsDir() && strings.HasSuffix(strings.ToLower(entry.Name()), ".exe") {
					launchExe = filepath.Join(targetDir, entry.Name())
					break
				}
			}
		}
	}

	if launchExe != "" {
		// [방화벽 규칙 사전 조용 등록]
		// 1. 기본 이름 등록: "Grid IP Scanner2"
		registerFirewallRule("Grid IP Scanner2", launchExe)

		// 2. 버전 정보가 붙은 상태의 앱 이름 등록: "Grid IP Scanner2 v2.4.6"
		registerFirewallRule(fmt.Sprintf("%s v%s", AppName, AppVersion), launchExe)

		// 3. 실행 파일명 자체 (Grid_IP_Scanner2.exe) 등록
		registerFirewallRule(filepath.Base(launchExe), launchExe)

		// 4. 바로가기 등록 (바탕화면 및 시작 메뉴)
		createDesktopShortcut(launchExe, fmt.Sprintf("%s v%s", AppName, AppVersion))
		createStartMenuShortcut(launchExe, fmt.Sprintf("%s v%s", AppName, AppVersion))

		// 5. 공식 언인스톨러 생성 및 Windows 프로그램 추가/제거(제어판) 공식 등록
		createUninstaller(targetDir)
		registerAddRemovePrograms(targetDir, launchExe, AppVersion)
	}

	// 6. Installation Finish Dialog (무인 설치 시에는 팝업 없이 종료)
	if !silent {
		res := showMsgBox("Grid IP Scanner2 설치 완료",
			fmt.Sprintf("Grid IP Scanner2 설치가 성공적으로 완료되었습니다!\n\n"+
				"• 설치 경로: %s\n"+
				"• Windows 프로그램 추가/제거(제어판) 정식 등록 완료\n"+
				"• 바탕화면 및 시작 메뉴 바로가기 생성 완료\n"+
				"• 방화벽 통신 규칙 사전 조용 등록 완료\n\n"+
				"지금 Grid IP Scanner2를 실행하시겠습니까?", targetDir),
			MB_YESNOCANCEL|MB_ICONINFORMATION)

		if res == IDYES && launchExe != "" {
			cmd := exec.Command(launchExe)
			_ = cmd.Start()
		}
	}
}
