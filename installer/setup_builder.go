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
	"runtime"
	"strings"
	"syscall"
	"time"
	"unsafe"
)

//go:embed payload.zip
var embeddedPayload []byte

//go:embed icon.ico
var embeddedIcon []byte

const (
	AppVersion = "2.4.23"
	AppName    = "Grid IP Scanner2"
)

var (
	user32   = syscall.NewLazyDLL("user32.dll")
	kernel32 = syscall.NewLazyDLL("kernel32.dll")
	gdi32    = syscall.NewLazyDLL("gdi32.dll")
	comctl32 = syscall.NewLazyDLL("comctl32.dll")
	shell32  = syscall.NewLazyDLL("shell32.dll")
	advapi32 = syscall.NewLazyDLL("advapi32.dll")

	procRegisterClassExW     = user32.NewProc("RegisterClassExW")
	procCreateWindowExW      = user32.NewProc("CreateWindowExW")
	procDefWindowProcW       = user32.NewProc("DefWindowProcW")
	procShowWindow           = user32.NewProc("ShowWindow")
	procUpdateWindow         = user32.NewProc("UpdateWindow")
	procGetMessageW          = user32.NewProc("GetMessageW")
	procTranslateMessage     = user32.NewProc("TranslateMessage")
	procDispatchMessageW     = user32.NewProc("DispatchMessageW")
	procSendMessageW         = user32.NewProc("SendMessageW")
	procPostMessageW         = user32.NewProc("PostMessageW")
	procSetWindowTextW       = user32.NewProc("SetWindowTextW")
	procDestroyWindow        = user32.NewProc("DestroyWindow")
	procPostQuitMessage      = user32.NewProc("PostQuitMessage")
	procEnableWindow         = user32.NewProc("EnableWindow")
	procGetSystemMetrics     = user32.NewProc("GetSystemMetrics")
	procCreateFontW          = gdi32.NewProc("CreateFontW")
	procGetModuleHandleW     = kernel32.NewProc("GetModuleHandleW")
	procInitCommonControlsEx = comctl32.NewProc("InitCommonControlsEx")
	procShellExecuteW        = shell32.NewProc("ShellExecuteW")
	procLoadImageW           = user32.NewProc("LoadImageW")

	procRegCreateKeyExW = advapi32.NewProc("RegCreateKeyExW")
	procRegSetValueExW  = advapi32.NewProc("RegSetValueExW")
	procRegCloseKey     = advapi32.NewProc("RegCloseKey")
)

type WNDCLASSEXW struct {
	CbSize        uint32
	Style         uint32
	LpfnWndProc   uintptr
	CbClsExtra    int32
	CbWndExtra    int32
	HInstance     uintptr
	HIcon         uintptr
	HCursor       uintptr
	HbrBackground uintptr
	LpszMenuName  *uint16
	LpszClassName *uint16
	HIconSm       uintptr
}

type POINT struct {
	X int32
	Y int32
}

type MSG struct {
	Hwnd    uintptr
	Message uint32
	Wparam  uintptr
	Lparam  uintptr
	Time    uint32
	Pt      POINT
}

type INITCOMMONCONTROLSEX struct {
	DwSize uint32
	DwICC  uint32
}

const (
	WS_OVERLAPPED    = 0x00000000
	WS_CAPTION       = 0x00C00000
	WS_SYSMENU       = 0x00080000
	WS_MINIMIZEBOX   = 0x00020000
	WS_VISIBLE       = 0x10000000
	WS_CHILD         = 0x40000000
	WS_BORDER        = 0x00800000
	WS_EX_CLIENTEDGE = 0x00000200
	ES_MULTILINE     = 0x0004
	ES_READONLY      = 0x0800
	ES_AUTOVSCROLL   = 0x0040
	WS_VSCROLL       = 0x00200000
	BS_PUSHBUTTON    = 0x00000000

	PBM_SETRANGE32 = 0x0406
	PBM_SETPOS     = 0x0402
	WM_DESTROY     = 0x0002
	WM_COMMAND     = 0x0111
	WM_SETFONT     = 0x0030

	// Custom Thread-Safe UI Update Messages
	WM_APP_PROGRESS = 0x8001
	WM_APP_STATUS   = 0x8002
	WM_APP_FINISHED = 0x8003

	IDC_INSTALL_BTN = 101
	IDC_CANCEL_BTN  = 102
	IDC_PROGRESS    = 103
	IDC_STATUS_TXT  = 104
	IDC_HEADER_TXT  = 105
	IDC_NOTICE_TXT  = 106

	ICC_PROGRESS_CLASS = 0x00000020
	SM_CXSCREEN        = 0
	SM_CYSCREEN        = 1

	IMAGE_ICON      = 1
	LR_LOADFROMFILE = 0x00000010
	WM_SETICON      = 0x0080
	ICON_SMALL      = 0
	ICON_BIG        = 1
	SS_ICON         = 0x00000003
	STM_SETICON     = 0x0170

	HKEY_LOCAL_MACHINE = 0x80000002
	HKEY_CURRENT_USER  = 0x80000001
	KEY_WRITE          = 0x00020006
	REG_SZ             = 1
	REG_DWORD          = 4
)

var (
	hMainWnd     uintptr
	hInstallBtn  uintptr
	hCancelBtn   uintptr
	hProgressBar uintptr
	hStatusTxt   uintptr
	hNoticeTxt   uintptr
	hFont        uintptr
	hBoldFont    uintptr
	isInstalling bool
	isFinished   bool
	launchPath   string
)

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

func isRunningAsAdmin() bool {
	_, err := os.Open("\\\\.\\PHYSICALDRIVE0")
	return err == nil
}

func relaunchElevated() bool {
	exePath, err := os.Executable()
	if err != nil {
		return false
	}
	verbPtr, _ := syscall.UTF16PtrFromString("runas")
	exePtr, _ := syscall.UTF16PtrFromString(exePath)
	argsPtr, _ := syscall.UTF16PtrFromString(strings.Join(os.Args[1:], " "))
	dirPtr, _ := syscall.UTF16PtrFromString(filepath.Dir(exePath))

	ret, _, _ := procShellExecuteW.Call(
		0,
		uintptr(unsafe.Pointer(verbPtr)),
		uintptr(unsafe.Pointer(exePtr)),
		uintptr(unsafe.Pointer(argsPtr)),
		uintptr(unsafe.Pointer(dirPtr)),
		1, // SW_SHOWNORMAL
	)
	return ret > 32
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func execHidden(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return cmd.Run()
}

func killExistingProcesses() {
	currentExe, _ := os.Executable()
	currentName := filepath.Base(currentExe)
	if !strings.EqualFold(currentName, "Grid_IP_Scanner2.exe") {
		_ = execHidden("taskkill", "/F", "/IM", "Grid_IP_Scanner2.exe")
	}
}

func registerFirewallRule(ruleName, exePath string) {
	_ = execHidden("netsh", "advfirewall", "firewall", "add", "rule",
		fmt.Sprintf("name=%s", ruleName), "dir=in", "action=allow", fmt.Sprintf("program=%s", exePath), "enable=yes", "profile=any")

	_ = execHidden("netsh", "advfirewall", "firewall", "add", "rule",
		fmt.Sprintf("name=%s (Outbound)", ruleName), "dir=out", "action=allow", fmt.Sprintf("program=%s", exePath), "enable=yes", "profile=any")
}

func createShortcutFast(targetPath, shortcutPath, workingDir string) {
	vbs := fmt.Sprintf("Set ws = CreateObject(\"WScript.Shell\")\r\nSet s = ws.CreateShortcut(\"%s\")\r\ns.TargetPath = \"%s\"\r\ns.WorkingDirectory = \"%s\"\r\ns.Save\r\n",
		strings.ReplaceAll(shortcutPath, `\`, `\\`),
		strings.ReplaceAll(targetPath, `\`, `\\`),
		strings.ReplaceAll(workingDir, `\`, `\\`),
	)
	tmpVbs := filepath.Join(os.TempDir(), fmt.Sprintf("mklink_%d.vbs", time.Now().UnixNano()))
	if err := os.WriteFile(tmpVbs, []byte(vbs), 0644); err == nil {
		_ = execHidden("wscript.exe", "//nologo", tmpVbs)
		_ = os.Remove(tmpVbs)
	}
}

func createDesktopShortcut(exePath, targetName string) {
	desktop := os.Getenv("PUBLIC")
	if desktop != "" {
		desktop = filepath.Join(desktop, "Desktop")
	}
	if !fileExists(desktop) {
		userProfile := os.Getenv("USERPROFILE")
		if userProfile != "" {
			desktop = filepath.Join(userProfile, "Desktop")
		}
	}
	if desktop != "" {
		shortcutPath := filepath.Join(desktop, fmt.Sprintf("%s.lnk", targetName))
		createShortcutFast(exePath, shortcutPath, filepath.Dir(exePath))
	}
}

func createStartMenuShortcut(exePath, targetName string) {
	progData := os.Getenv("ALLUSERSPROFILE")
	var startMenu string
	if progData != "" {
		startMenu = filepath.Join(progData, "Microsoft", "Windows", "Start Menu", "Programs", targetName)
	} else {
		appData := os.Getenv("APPDATA")
		if appData != "" {
			startMenu = filepath.Join(appData, "Microsoft", "Windows", "Start Menu", "Programs", targetName)
		}
	}
	if startMenu != "" {
		_ = os.MkdirAll(startMenu, 0755)
		shortcutPath := filepath.Join(startMenu, fmt.Sprintf("%s.lnk", targetName))
		createShortcutFast(exePath, shortcutPath, filepath.Dir(exePath))
	}
}

func createUninstaller(targetDir string) {
	uninstallerScript := `@echo off
setlocal
chcp 65001 >nul
title Grid IP Scanner2 - 프로그램 제거 (Uninstall)

net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -NoProfile -WindowStyle Hidden -Command "Start-Process cmd.exe -ArgumentList '/c \"\"%~f0\" %*\"' -WindowStyle Hidden -Verb RunAs"
    exit /b
)

set "SILENT_MODE=0"
if /i "%1"=="/SILENT" set "SILENT_MODE=1"
if /i "%1"=="/VERYSILENT" set "SILENT_MODE=1"
if /i "%1"=="/quiet" set "SILENT_MODE=1"
if /i "%1"=="/s" set "SILENT_MODE=1"

if "%SILENT_MODE%"=="0" (
    powershell -NoProfile -WindowStyle Hidden -Command "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; $res = [System.Windows.Forms.MessageBox]::Show('Grid IP Scanner2를 시스템에서 완전히 제거하시겠습니까?', 'Grid IP Scanner2 제거 확인', [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Question); if ($res -ne [System.Windows.Forms.DialogResult]::Yes) { exit 1 }"
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
    powershell -NoProfile -WindowStyle Hidden -Command "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; [System.Windows.Forms.MessageBox]::Show('Grid IP Scanner2가 성공적으로 제거되었습니다.', '제거 완료', [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)" >nul 2>&1
)

start /b "" cmd.exe /c "timeout /t 1 /nobreak >nul & rd /s /q \"%APP_DIR%\""
exit /b 0
`
	uninstallerPath := filepath.Join(targetDir, "uninstall.bat")
	_ = os.WriteFile(uninstallerPath, []byte(uninstallerScript), 0755)
}

func setRegString(hKey uintptr, subKey, valueName, data string) {
	var key uintptr
	subKeyPtr, _ := syscall.UTF16PtrFromString(subKey)
	ret, _, _ := procRegCreateKeyExW.Call(
		hKey,
		uintptr(unsafe.Pointer(subKeyPtr)),
		0, 0, 0,
		KEY_WRITE,
		0,
		uintptr(unsafe.Pointer(&key)),
		0,
	)
	if ret != 0 {
		return
	}
	defer procRegCloseKey.Call(key)

	namePtr, _ := syscall.UTF16PtrFromString(valueName)
	dataPtr, _ := syscall.UTF16PtrFromString(data)
	byteLen := uintptr((len(syscall.StringToUTF16(data))) * 2)

	procRegSetValueExW.Call(
		key,
		uintptr(unsafe.Pointer(namePtr)),
		0,
		REG_SZ,
		uintptr(unsafe.Pointer(dataPtr)),
		byteLen,
	)
}

func setRegDWORD(hKey uintptr, subKey, valueName string, data uint32) {
	var key uintptr
	subKeyPtr, _ := syscall.UTF16PtrFromString(subKey)
	ret, _, _ := procRegCreateKeyExW.Call(
		hKey,
		uintptr(unsafe.Pointer(subKeyPtr)),
		0, 0, 0,
		KEY_WRITE,
		0,
		uintptr(unsafe.Pointer(&key)),
		0,
	)
	if ret != 0 {
		return
	}
	defer procRegCloseKey.Call(key)

	namePtr, _ := syscall.UTF16PtrFromString(valueName)
	procRegSetValueExW.Call(
		key,
		uintptr(unsafe.Pointer(namePtr)),
		0,
		REG_DWORD,
		uintptr(unsafe.Pointer(&data)),
		4,
	)
}

func registerAddRemovePrograms(targetDir, exePath, version string) {
	uninstallBat := filepath.Join(targetDir, "uninstall.bat")
	iconPath := filepath.Join(targetDir, "icon.ico")
	if !fileExists(iconPath) {
		iconPath = exePath
	}

	today := time.Now().Format("20060102")
	displayName := fmt.Sprintf("%s v%s", AppName, version)

	regRoots := []struct {
		hKey   uintptr
		subKey string
	}{
		{HKEY_LOCAL_MACHINE, `Software\Microsoft\Windows\CurrentVersion\Uninstall\Grid_IP_Scanner2`},
		{HKEY_CURRENT_USER, `Software\Microsoft\Windows\CurrentVersion\Uninstall\Grid_IP_Scanner2`},
		{HKEY_LOCAL_MACHINE, `Software\Grid IP Scanner2`},
		{HKEY_CURRENT_USER, `Software\Grid IP Scanner2`},
	}

	for _, item := range regRoots {
		setRegString(item.hKey, item.subKey, "DisplayName", displayName)
		setRegString(item.hKey, item.subKey, "DisplayVersion", version)
		setRegString(item.hKey, item.subKey, "Publisher", "AhBiYout")
		setRegString(item.hKey, item.subKey, "DisplayIcon", iconPath)
		setRegString(item.hKey, item.subKey, "InstallLocation", targetDir)
		setRegString(item.hKey, item.subKey, "UninstallString", fmt.Sprintf(`"%s"`, uninstallBat))
		setRegString(item.hKey, item.subKey, "QuietUninstallString", fmt.Sprintf(`"%s" /SILENT`, uninstallBat))
		setRegString(item.hKey, item.subKey, "InstallDate", today)
		setRegString(item.hKey, item.subKey, "URLInfoAbout", "https://github.com/AhBiYout-all/grid-ip-scanner2")
		setRegString(item.hKey, item.subKey, "HelpLink", "https://ahbiyoutvibe.blogspot.com/")
		setRegString(item.hKey, item.subKey, "URLUpdateInfo", "https://github.com/AhBiYout-all/grid-ip-scanner2/releases")
		setRegDWORD(item.hKey, item.subKey, "EstimatedSize", 125000)
		setRegDWORD(item.hKey, item.subKey, "NoModify", 1)
		setRegDWORD(item.hKey, item.subKey, "NoRepair", 1)

		setRegString(item.hKey, item.subKey, "InstallPath", targetDir)
		setRegString(item.hKey, item.subKey, "Version", version)
		setRegString(item.hKey, item.subKey, "Executable", exePath)
	}
}

// Thread-safe post methods for GUI updates
func postStatus(text string) {
	if hMainWnd != 0 {
		ptr, _ := syscall.UTF16PtrFromString(text)
		procPostMessageW.Call(hMainWnd, WM_APP_STATUS, uintptr(unsafe.Pointer(ptr)), 0)
	}
}

func postProgress(pos int) {
	if hMainWnd != 0 {
		procPostMessageW.Call(hMainWnd, WM_APP_PROGRESS, uintptr(pos), 0)
	}
}

func performInstallationSilent() {
	killExistingProcesses()

	progFiles := os.Getenv("ProgramFiles")
	if progFiles == "" {
		progFiles = `C:\Program Files`
	}
	targetDir := filepath.Join(progFiles, "Grid IP Scanner2")
	_ = os.MkdirAll(targetDir, 0755)

	zipReader, err := zip.NewReader(bytes.NewReader(embeddedPayload), int64(len(embeddedPayload)))
	if err != nil {
		os.Exit(1)
	}

	for _, file := range zipReader.File {
		outPath := filepath.Join(targetDir, file.Name)
		if file.FileInfo().IsDir() {
			os.MkdirAll(outPath, 0755)
			continue
		}
		os.MkdirAll(filepath.Dir(outPath), 0755)
		outFile, openErr := os.OpenFile(outPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, file.Mode())
		if openErr != nil {
			continue
		}
		rc, readErr := file.Open()
		if readErr == nil {
			_, _ = io.Copy(outFile, rc)
			rc.Close()
		}
		outFile.Close()
	}

	aliasExe := filepath.Join(targetDir, "Grid_IP_Scanner2.exe")
	if fileExists(aliasExe) {
		registerFirewallRule("Grid IP Scanner2", aliasExe)
		registerFirewallRule(fmt.Sprintf("%s v%s", AppName, AppVersion), aliasExe)
		registerFirewallRule(filepath.Base(aliasExe), aliasExe)
		createDesktopShortcut(aliasExe, fmt.Sprintf("%s v%s", AppName, AppVersion))
		createStartMenuShortcut(aliasExe, fmt.Sprintf("%s v%s", AppName, AppVersion))
		createUninstaller(targetDir)
		registerAddRemovePrograms(targetDir, aliasExe, AppVersion)
	}
}

func performInstallationGUI() {
	isInstalling = true

	postStatus("기존 실행 프로세스 확인 및 정리 중...")
	killExistingProcesses()

	progFiles := os.Getenv("ProgramFiles")
	if progFiles == "" {
		progFiles = `C:\Program Files`
	}
	targetDir := filepath.Join(progFiles, "Grid IP Scanner2")

	err := os.MkdirAll(targetDir, 0755)
	if err != nil {
		localAppData := os.Getenv("LOCALAPPDATA")
		if localAppData != "" {
			targetDir = filepath.Join(localAppData, "Programs", "Grid IP Scanner2")
			_ = os.MkdirAll(targetDir, 0755)
		}
	}

	zipReader, err := zip.NewReader(bytes.NewReader(embeddedPayload), int64(len(embeddedPayload)))
	if err != nil {
		postStatus("오류: 설치 파일 패키지 파싱 실패!")
		procPostMessageW.Call(hMainWnd, WM_APP_FINISHED, 0, 0)
		return
	}

	totalFiles := len(zipReader.File)
	if hProgressBar != 0 {
		procSendMessageW.Call(hProgressBar, PBM_SETRANGE32, 0, uintptr(totalFiles))
	}

	for i, file := range zipReader.File {
		outPath := filepath.Join(targetDir, file.Name)
		if i%2 == 0 || i == totalFiles-1 {
			postStatus(fmt.Sprintf("파일 복사 중 (%d/%d): %s", i+1, totalFiles, file.Name))
		}
		postProgress(i + 1)

		if file.FileInfo().IsDir() {
			os.MkdirAll(outPath, 0755)
			continue
		}

		os.MkdirAll(filepath.Dir(outPath), 0755)
		outFile, openErr := os.OpenFile(outPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, file.Mode())
		if openErr != nil {
			continue
		}

		rc, readErr := file.Open()
		if readErr == nil {
			_, _ = io.Copy(outFile, rc)
			rc.Close()
		}
		outFile.Close()
	}

	postStatus("방화벽 규칙 및 바로가기 등록 중...")

	aliasExe := filepath.Join(targetDir, "Grid_IP_Scanner2.exe")
	if !fileExists(aliasExe) {
		if entries, err := os.ReadDir(targetDir); err == nil {
			for _, entry := range entries {
				if !entry.IsDir() && strings.HasSuffix(strings.ToLower(entry.Name()), ".exe") {
					aliasExe = filepath.Join(targetDir, entry.Name())
					break
				}
			}
		}
	}

	launchPath = aliasExe
	if fileExists(launchPath) {
		createDesktopShortcut(launchPath, fmt.Sprintf("%s v%s", AppName, AppVersion))
		createStartMenuShortcut(launchPath, fmt.Sprintf("%s v%s", AppName, AppVersion))
		createUninstaller(targetDir)
		registerAddRemovePrograms(targetDir, launchPath, AppVersion)

		// Register firewall rules in background so it never holds up UI completion
		go func(exe string) {
			registerFirewallRule("Grid IP Scanner2", exe)
			registerFirewallRule(fmt.Sprintf("%s v%s", AppName, AppVersion), exe)
			registerFirewallRule(filepath.Base(exe), exe)
		}(launchPath)
	}

	postProgress(totalFiles)
	postStatus("🎉 설치가 성공적으로 완료되었습니다!")
	procPostMessageW.Call(hMainWnd, WM_APP_FINISHED, 1, 0)
}

var wizardStep int = 0 // 0: Notice -> 1: License -> 2: Installing -> 3: Finished

func updateWizardStepUI() {
	if hMainWnd == 0 {
		return
	}
	switch wizardStep {
	case 0:
		// Step 0: Notice & Disclaimer
		noticeText := "📌 Step 1/3 - [" + AppName + " v" + AppVersion + " 설치 및 백신 고지]\r\n\r\n" +
			"1. 백신 오탐 예외 안내: 초고속 서브넷 IP/포트 탐색 특성상 백신(Windows Defender, 안랩 V3)에서 오탐지될 수 있습니다. 실행 차단 시 '검사 예외 목록'에 추가해 주십시오.\r\n" +
			"2. 방화벽 자동 연동: 네트워크 통신을 위한 Windows 방화벽 예외 규칙이 설치 과정에서 자동 등록됩니다.\r\n" +
			"3. 제어판 정식 등록: Windows '프로그램 추가/제거' 및 시작 메뉴에 정식으로 등록됩니다.\r\n\r\n" +
			"아래 [다음 >] 버튼을 눌러 소프트웨어 라이선스 약관을 확인하세요."
		btnTextPtr, _ := syscall.UTF16PtrFromString("다음 (라이선스) >")
		statusTextPtr, _ := syscall.UTF16PtrFromString("단계 1/3: 설치 안내 및 백신 고지 사항을 확인 후 [다음]을 누르세요.")
		noticeTextPtr, _ := syscall.UTF16PtrFromString(noticeText)
		procSetWindowTextW.Call(hNoticeTxt, uintptr(unsafe.Pointer(noticeTextPtr)))
		procSetWindowTextW.Call(hStatusTxt, uintptr(unsafe.Pointer(statusTextPtr)))
		procSetWindowTextW.Call(hInstallBtn, uintptr(unsafe.Pointer(btnTextPtr)))

	case 1:
		// Step 1: License Agreement
		licenseText := "📜 Step 2/3 - [소프트웨어 이용 약관 및 이중 라이선스 고지]\r\n\r\n" +
			"1. 이중 라이선스 (Dual License): 본 소프트웨어는 GNU General Public License v3 (GPL v3) 및 상용 전용 라이선스(Commercial License) 정책에 따라 배포됩니다.\r\n" +
			"2. 자유로운 무상 사용: 개인 및 비영리 목적으로 무상 자유 사용이 보장됩니다.\r\n" +
			"3. 상업적 패키징 및 서브라이선스: 하부 라이브러리(React, Lucide, Go)는 MIT 허용형 라이선스를 준수하며 상업적 포장 및 재배포 권리를 전면 보장합니다.\r\n" +
			"4. 책임의 한계: 본 프로그램은 일체의 명시적 보증 없이 '있는 그대로(AS IS)' 제공됩니다.\r\n\r\n" +
			"위 이용 약관에 동의하시면 아래 [동의 및 설치 시작 >] 버튼을 눌러 설치를 진행하세요."
		btnTextPtr, _ := syscall.UTF16PtrFromString("동의 및 설치 시작 >")
		statusTextPtr, _ := syscall.UTF16PtrFromString("단계 2/3: 이용 약관 동의 후 [동의 및 설치 시작]을 누르세요.")
		noticeTextPtr, _ := syscall.UTF16PtrFromString(licenseText)
		procSetWindowTextW.Call(hNoticeTxt, uintptr(unsafe.Pointer(noticeTextPtr)))
		procSetWindowTextW.Call(hStatusTxt, uintptr(unsafe.Pointer(statusTextPtr)))
		procSetWindowTextW.Call(hInstallBtn, uintptr(unsafe.Pointer(btnTextPtr)))

	case 2:
		// Step 2: Installing
		installMsg := "⚙️ Step 3/3 - [파일 복사 및 시스템 연동 진행 중...]\r\n\r\n" +
			"• 설치 위치: C:\\Program Files\\Grid IP Scanner2\\\r\n" +
			"• 기존 설치 버전 자동 점검 및 프로세스 정돈\r\n" +
			"• 9만 건 IEEE/Wireshark OUI DB 및 C/Win32 네이티브 모듈 복사 중\r\n" +
			"• Windows 방화벽 인바운드/아웃바운드 규칙 등록 중\r\n\r\n" +
			"잠시만 기다려 주십시오..."
		btnTextPtr, _ := syscall.UTF16PtrFromString("설치 진행 중...")
		statusTextPtr, _ := syscall.UTF16PtrFromString("단계 3/3: 파일 복사 및 시스템 연동 진행 중입니다.")
		noticeTextPtr, _ := syscall.UTF16PtrFromString(installMsg)
		procSetWindowTextW.Call(hNoticeTxt, uintptr(unsafe.Pointer(noticeTextPtr)))
		procSetWindowTextW.Call(hStatusTxt, uintptr(unsafe.Pointer(statusTextPtr)))
		procSetWindowTextW.Call(hInstallBtn, uintptr(unsafe.Pointer(btnTextPtr)))
		procEnableWindow.Call(hInstallBtn, 0)
		procEnableWindow.Call(hCancelBtn, 0)

	case 3:
		// Step 3: Finished
		finishText := "🎉 [Grid IP Scanner2 v" + AppVersion + " 설치 완료!]\r\n\r\n" +
			"• 설치 위치: C:\\Program Files\\Grid IP Scanner2\\\r\n" +
			"• 바탕화면 및 시작 메뉴에 프로그램 바로가기 아이콘 등록 완료\r\n" +
			"• 제어판 '프로그램 추가/제거'에 정식 등록 완료\r\n" +
			"• Windows 방화벽 통신 규칙 등록 완료\r\n\r\n" +
			"아래 [완료 (앱 실행)] 버튼을 누르면 Grid IP Scanner2가 즉시 실행됩니다."
		btnTextPtr, _ := syscall.UTF16PtrFromString("완료 (앱 실행)")
		cancelTextPtr, _ := syscall.UTF16PtrFromString("닫기")
		statusTextPtr, _ := syscall.UTF16PtrFromString("🎉 설치가 성공적으로 완료되었습니다!")
		noticeTextPtr, _ := syscall.UTF16PtrFromString(finishText)
		procSetWindowTextW.Call(hNoticeTxt, uintptr(unsafe.Pointer(noticeTextPtr)))
		procSetWindowTextW.Call(hStatusTxt, uintptr(unsafe.Pointer(statusTextPtr)))
		procSetWindowTextW.Call(hInstallBtn, uintptr(unsafe.Pointer(btnTextPtr)))
		procSetWindowTextW.Call(hCancelBtn, uintptr(unsafe.Pointer(cancelTextPtr)))
		procEnableWindow.Call(hInstallBtn, 1)
		procEnableWindow.Call(hCancelBtn, 1)
	}
}

func wndProc(hwnd uintptr, msg uint32, wparam uintptr, lparam uintptr) uintptr {
	switch msg {
	case WM_APP_PROGRESS:
		if hProgressBar != 0 {
			procSendMessageW.Call(hProgressBar, PBM_SETPOS, wparam, 0)
		}
		return 0

	case WM_APP_STATUS:
		if hStatusTxt != 0 && wparam != 0 {
			procSetWindowTextW.Call(hStatusTxt, wparam)
			if hMainWnd != 0 {
				procUpdateWindow.Call(hMainWnd)
			}
		}
		return 0

	case WM_APP_FINISHED:
		isFinished = true
		wizardStep = 3
		updateWizardStepUI()
		return 0

	case WM_COMMAND:
		controlID := uint16(wparam & 0xffff)
		if controlID == IDC_INSTALL_BTN {
			if wizardStep == 0 {
				// Move to Step 1 (License)
				wizardStep = 1
				updateWizardStepUI()
			} else if wizardStep == 1 {
				// Move to Step 2 (Installing) and start background installation
				wizardStep = 2
				isInstalling = true
				updateWizardStepUI()
				go performInstallationGUI()
			} else if isFinished || wizardStep == 3 {
				// Move to Launch & Close
				if launchPath != "" && fileExists(launchPath) {
					cmd := exec.Command(launchPath)
					_ = cmd.Start()
				}
				procDestroyWindow.Call(hwnd)
			}
		} else if controlID == IDC_CANCEL_BTN {
			procDestroyWindow.Call(hwnd)
		}
		return 0

	case WM_DESTROY:
		procPostQuitMessage.Call(0)
		return 0
	}
	ret, _, _ := procDefWindowProcW.Call(hwnd, uintptr(msg), wparam, lparam)
	return ret
}

func runGUIInstaller() {
	// CRITICAL: Lock GUI goroutine to current OS thread to prevent Windows message pump freezing ("응답 없음")
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	var icc INITCOMMONCONTROLSEX
	icc.DwSize = uint32(unsafe.Sizeof(icc))
	icc.DwICC = ICC_PROGRESS_CLASS
	procInitCommonControlsEx.Call(uintptr(unsafe.Pointer(&icc)))

	hFontPtr, _, _ := procCreateFontW.Call(
		uintptr(15), 0, 0, 0, 400, 0, 0, 0, 129, 0, 0, 0, 0,
		uintptr(unsafe.Pointer(syscall.StringToUTF16Ptr("맑은 고딕"))),
	)
	hFont = hFontPtr

	hBoldFontPtr, _, _ := procCreateFontW.Call(
		uintptr(18), 0, 0, 0, 700, 0, 0, 0, 129, 0, 0, 0, 0,
		uintptr(unsafe.Pointer(syscall.StringToUTF16Ptr("맑은 고딕"))),
	)
	hBoldFont = hBoldFontPtr

	tmpIconPath := filepath.Join(os.TempDir(), "grid_setup_icon.ico")
	var hIconBig, hIconSm uintptr
	if len(embeddedIcon) > 0 {
		if err := os.WriteFile(tmpIconPath, embeddedIcon, 0644); err == nil {
			tmpIconPtr, _ := syscall.UTF16PtrFromString(tmpIconPath)
			hIconBig, _, _ = procLoadImageW.Call(
				0, uintptr(unsafe.Pointer(tmpIconPtr)),
				IMAGE_ICON, 48, 48, LR_LOADFROMFILE,
			)
			hIconSm, _, _ = procLoadImageW.Call(
				0, uintptr(unsafe.Pointer(tmpIconPtr)),
				IMAGE_ICON, 16, 16, LR_LOADFROMFILE,
			)
		}
	}

	hInstance, _, _ := procGetModuleHandleW.Call(0)
	classNamePtr, _ := syscall.UTF16PtrFromString("GridIPScannerSetupWndClass")

	var wc WNDCLASSEXW
	wc.CbSize = uint32(unsafe.Sizeof(wc))
	wc.Style = 0
	wc.LpfnWndProc = syscall.NewCallback(wndProc)
	wc.HInstance = hInstance
	wc.HIcon = hIconBig
	wc.HIconSm = hIconSm
	wc.HbrBackground = uintptr(16) // COLOR_BTNFACE + 1
	wc.LpszClassName = classNamePtr

	procRegisterClassExW.Call(uintptr(unsafe.Pointer(&wc)))

	winWidth := int32(540)
	winHeight := int32(380)

	scrW, _, _ := procGetSystemMetrics.Call(SM_CXSCREEN)
	scrH, _, _ := procGetSystemMetrics.Call(SM_CYSCREEN)
	x := (int32(scrW) - winWidth) / 2
	y := (int32(scrH) - winHeight) / 2

	titlePtr, _ := syscall.UTF16PtrFromString(fmt.Sprintf("%s v%s 설치 관리자", AppName, AppVersion))

	hWnd, _, _ := procCreateWindowExW.Call(
		0,
		uintptr(unsafe.Pointer(classNamePtr)),
		uintptr(unsafe.Pointer(titlePtr)),
		WS_OVERLAPPED|WS_CAPTION|WS_SYSMENU|WS_MINIMIZEBOX|WS_VISIBLE,
		uintptr(x), uintptr(y), uintptr(winWidth), uintptr(winHeight),
		0, 0, hInstance, 0,
	)
	hMainWnd = hWnd

	if hIconBig != 0 {
		procSendMessageW.Call(hMainWnd, WM_SETICON, ICON_BIG, hIconBig)
	}
	if hIconSm != 0 {
		procSendMessageW.Call(hMainWnd, WM_SETICON, ICON_SMALL, hIconSm)
	}

	staticClassPtr, _ := syscall.UTF16PtrFromString("STATIC")
	buttonClassPtr, _ := syscall.UTF16PtrFromString("BUTTON")
	progressClassPtr, _ := syscall.UTF16PtrFromString("msctls_progress32")
	editClassPtr, _ := syscall.UTF16PtrFromString("EDIT")

	// Header App Icon Display (48x48)
	if hIconBig != 0 {
		hIconCtl, _, _ := procCreateWindowExW.Call(
			0, uintptr(unsafe.Pointer(staticClassPtr)), 0,
			WS_CHILD|WS_VISIBLE|SS_ICON,
			20, 14, 48, 48,
			hMainWnd, 0, hInstance, 0,
		)
		if hIconCtl != 0 {
			procSendMessageW.Call(hIconCtl, STM_SETICON, hIconBig, 0)
		}
	}

	// Header Text
	headerTextPtr, _ := syscall.UTF16PtrFromString(fmt.Sprintf("%s v%s 공식 프로그램 설치", AppName, AppVersion))
	hHeader, _, _ := procCreateWindowExW.Call(
		0, uintptr(unsafe.Pointer(staticClassPtr)), uintptr(unsafe.Pointer(headerTextPtr)),
		WS_CHILD|WS_VISIBLE,
		78, 15, 440, 25,
		hMainWnd, IDC_HEADER_TXT, hInstance, 0,
	)
	procSendMessageW.Call(hHeader, WM_SETFONT, hBoldFont, 1)

	// Subtitle / Path
	subTextPtr, _ := syscall.UTF16PtrFromString("설치 위치: C:\\Program Files\\Grid IP Scanner2\\")
	hSub, _, _ := procCreateWindowExW.Call(
		0, uintptr(unsafe.Pointer(staticClassPtr)), uintptr(unsafe.Pointer(subTextPtr)),
		WS_CHILD|WS_VISIBLE,
		78, 42, 440, 20,
		hMainWnd, 0, hInstance, 0,
	)
	procSendMessageW.Call(hSub, WM_SETFONT, hFont, 1)

	// Notice / Disclaimer Text Box
	noticeText := "📌 Step 1/3 - [" + AppName + " v" + AppVersion + " 설치 및 백신 고지]\r\n\r\n" +
		"1. 백신 오탐 예외 안내: 초고속 서브넷 IP/포트 탐색 특성상 백신(Windows Defender, 안랩 V3)에서 오탐지될 수 있습니다. 실행 차단 시 '검사 예외 목록'에 추가해 주십시오.\r\n" +
		"2. 방화벽 자동 연동: 네트워크 통신을 위한 Windows 방화벽 예외 규칙이 설치 과정에서 자동 등록됩니다.\r\n" +
		"3. 제어판 정식 등록: Windows '프로그램 추가/제거' 및 시작 메뉴에 정식으로 등록됩니다.\r\n\r\n" +
		"아래 [다음 (라이선스) >] 버튼을 눌러 소프트웨어 라이선스 약관을 확인하세요."
	noticeTextPtr, _ := syscall.UTF16PtrFromString(noticeText)
	hNoticeTxt, _, _ = procCreateWindowExW.Call(
		WS_EX_CLIENTEDGE, uintptr(unsafe.Pointer(editClassPtr)), uintptr(unsafe.Pointer(noticeTextPtr)),
		WS_CHILD|WS_VISIBLE|ES_MULTILINE|ES_READONLY|ES_AUTOVSCROLL|WS_VSCROLL,
		20, 70, 485, 140,
		hMainWnd, IDC_NOTICE_TXT, hInstance, 0,
	)
	procSendMessageW.Call(hNoticeTxt, WM_SETFONT, hFont, 1)

	// Status Text Label
	statusTextPtr, _ := syscall.UTF16PtrFromString("준비 완료: [설치 시작] 버튼을 클릭하여 진행하세요.")
	hStatusTxt, _, _ = procCreateWindowExW.Call(
		0, uintptr(unsafe.Pointer(staticClassPtr)), uintptr(unsafe.Pointer(statusTextPtr)),
		WS_CHILD|WS_VISIBLE,
		20, 222, 485, 20,
		hMainWnd, IDC_STATUS_TXT, hInstance, 0,
	)
	procSendMessageW.Call(hStatusTxt, WM_SETFONT, hFont, 1)

	// Progress Bar
	hProgressBar, _, _ = procCreateWindowExW.Call(
		WS_EX_CLIENTEDGE, uintptr(unsafe.Pointer(progressClassPtr)), 0,
		WS_CHILD|WS_VISIBLE,
		20, 248, 485, 24,
		hMainWnd, IDC_PROGRESS, hInstance, 0,
	)

	// Install Button
	installTextPtr, _ := syscall.UTF16PtrFromString("다음 (라이선스) >")
	hInstallBtn, _, _ = procCreateWindowExW.Call(
		0, uintptr(unsafe.Pointer(buttonClassPtr)), uintptr(unsafe.Pointer(installTextPtr)),
		WS_CHILD|WS_VISIBLE|BS_PUSHBUTTON,
		260, 290, 130, 32,
		hMainWnd, IDC_INSTALL_BTN, hInstance, 0,
	)
	procSendMessageW.Call(hInstallBtn, WM_SETFONT, hFont, 1)

	// Cancel / Exit Button
	cancelTextPtr, _ := syscall.UTF16PtrFromString("취소")
	hCancelBtn, _, _ = procCreateWindowExW.Call(
		0, uintptr(unsafe.Pointer(buttonClassPtr)), uintptr(unsafe.Pointer(cancelTextPtr)),
		WS_CHILD|WS_VISIBLE|BS_PUSHBUTTON,
		400, 290, 105, 32,
		hMainWnd, IDC_CANCEL_BTN, hInstance, 0,
	)
	procSendMessageW.Call(hCancelBtn, WM_SETFONT, hFont, 1)

	// Set Step 0 Initial UI
	wizardStep = 0
	updateWizardStepUI()

	procShowWindow.Call(hMainWnd, 1)
	procUpdateWindow.Call(hMainWnd)

	var msg MSG
	for {
		ret, _, _ := procGetMessageW.Call(uintptr(unsafe.Pointer(&msg)), 0, 0, 0)
		if int32(ret) <= 0 {
			break
		}
		procTranslateMessage.Call(uintptr(unsafe.Pointer(&msg)))
		procDispatchMessageW.Call(uintptr(unsafe.Pointer(&msg)))
	}
}

func main() {
	if isSilent() {
		performInstallationSilent()
		return
	}

	if runtime.GOOS == "windows" {
		// Auto-elevate to Administrator privileges to guarantee full permission
		if !isRunningAsAdmin() {
			if relaunchElevated() {
				os.Exit(0)
			}
		}
		runGUIInstaller()
	} else {
		fmt.Printf("%s v%s Standalone Installer compiled for Windows target.\n", AppName, AppVersion)
	}
}
