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
	AppVersion = "2.4.5"
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

		// 2. 버전 정보가 붙은 상태의 앱 이름 등록: "Grid IP Scanner2 v2.4.3"
		registerFirewallRule(fmt.Sprintf("%s v%s", AppName, AppVersion), launchExe)

		// 3. 실행 파일명 자체 (Grid_IP_Scanner2.exe) 등록
		registerFirewallRule(filepath.Base(launchExe), launchExe)

		createDesktopShortcut(launchExe, fmt.Sprintf("%s v%s", AppName, AppVersion))
	}

	// 6. Installation Finish Dialog (무인 설치 시에는 팝업 없이 종료)
	if !silent {
		res := showMsgBox("Grid IP Scanner2 설치 완료",
			fmt.Sprintf("Grid IP Scanner2 설치가 성공적으로 완료되었습니다!\n\n"+
				"• 설치 경로: %s\n"+
				"• 방화벽 규칙 사전 조용 등록 완료 (기본 이름 및 버전 포함 규칙)\n"+
				"• 바탕화면 바로가기 생성 완료\n\n"+
				"지금 Grid IP Scanner2를 실행하시겠습니까?", targetDir),
			MB_YESNOCANCEL|MB_ICONINFORMATION)

		if res == IDYES && launchExe != "" {
			cmd := exec.Command(launchExe)
			_ = cmd.Start()
		}
	}
}
