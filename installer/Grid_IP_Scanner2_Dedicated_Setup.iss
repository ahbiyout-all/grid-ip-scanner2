; =====================================================================
; Grid IP Scanner2 v2.4.23 - Dedicated Isolated Inno Setup 6 Script
; Detailed Step-by-Step Installation Wizard & Guaranteed Isolated Environment
; Copyright (c) 2025-2026 AhBiYout  All rights reserved.
; =====================================================================

#define MyAppName "Grid IP Scanner2"
#define MyAppVersion "2.4.45"
#define MyAppPublisher "AhBiYout"
#define MyAppURL "https://github.com/AhBiYout-all/grid-ip-scanner2"
#define MyAppBlogURL "https://ahbiyoutvibe.blogspot.com/"
#define MyAppExeName "Grid_IP_Scanner2.exe"
#define MyAppSourceExe "Grid IP Scanner2 v" + MyAppVersion + ".exe"
#define MyAppAssocName MyAppName + " Session File"
#define MyAppAssocExt ".gscan"
#define MyAppAssocKey StringChange(MyAppAssocName, " ", "") + MyAppAssocExt

[Setup]
; =====================================================================
; [1] Unique Application ID & Isolated Registration Entry
; =====================================================================
AppId={{9C2116BA-10DD-4E5F-8DC5-4279D64B8DF3}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} v{#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppBlogURL}
AppUpdatesURL={#MyAppBlogURL}
UninstallDisplayName={#MyAppName} v{#MyAppVersion}
UninstallDisplayIcon={app}\{#MyAppExeName}
CreateUninstallRegKey=yes
; Note: 'UpdateUninstallRegKey' was removed because it is an unrecognized directive in Inno Setup 6

; =====================================================================
; [2] Detailed Step-by-Step Installation Wizard Configuration (자세한 설치 단계 설정)
; - 단계 1: 환영 인사 (Welcome Page)
; - 단계 2: 이용 고지 및 백신/방화벽 안내 (Notice Page)
; - 단계 3: 소프트웨어 라이선스 동의 (License Agreement)
; - 단계 4: 설치 폴더 선택 (Select Destination Location)
; - 단계 5: 시작 메뉴 폴더 지정 (Select Program Group)
; - 단계 6: 바로가기 및 부팅 자동 실행 선택 (Select Additional Tasks)
; - 단계 7: 설치 준비 완료 요약 (Ready to Install Summary)
; - 단계 8: 파일 복사 및 설치 진행률 (Installing Progress Bar)
; - 단계 9: 설치 완료 및 앱 즉시 실행 (Finished Page)
; =====================================================================
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableWelcomePage=no
DisableDirPage=no
DisableProgramGroupPage=no
DisableReadyPage=no
LicenseFile=..\docs\LICENSE.md
InfoBeforeFile=NOTICE_BEFORE_INSTALL.txt
OutputDir=..\dist_installer
OutputBaseFilename=Grid_IP_Scanner2_v{#MyAppVersion}_Setup
SetupIconFile=..\icon.ico
WizardImageFile=wizard_large.bmp
WizardSmallImageFile=wizard_small.bmp
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
WizardSizePercent=110
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
; PrivilegesRequiredOverridesAllowed omitted (defaults to none in Inno Setup, strictly enforcing admin privileges)

; Unattended / Silent Capabilities
CloseApplications=yes
RestartApplications=no

; Version Metadata
VersionInfoVersion={#MyAppVersion}.0
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription={#MyAppName} Detailed Step-by-Step Multi-File Installer (v{#MyAppVersion})
VersionInfoCopyright=Copyright (C) 2025-2026 {#MyAppPublisher}
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#MyAppVersion}.0
VersionInfoProductTextVersion={#MyAppVersion}

[Languages]
Name: "korean"; MessagesFile: "Korean.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[CustomMessages]
korean.WelcomeLabel1=Grid IP Scanner2 v{#MyAppVersion} 설치 마법사에 오신 것을 환영합니다.
korean.WelcomeLabel2=본 설치 마법사는 사용자 시스템에 Grid IP Scanner2를 안전하고 신속하게 설치하도록 상세 과정별로 안내합니다.%n%n• 초고속 IP/포트 스캔 네트워크 진단 유틸리티%n• IEEE 및 Wireshark 공식 9만 건 OUI 제조사 DB 내장%n• Windows 방화벽 및 Windows Defender 검사 예외 연동 지원%n%n[다음] 버튼을 누르시면 단계별 상세 설치가 진행됩니다.
english.WelcomeLabel1=Welcome to the Grid IP Scanner2 v{#MyAppVersion} Setup Wizard
english.WelcomeLabel2=This will install Grid IP Scanner2 on your computer.%n%n• High-speed C-Class IP/Port diagnostic scanner%n• 90k+ IEEE & Wireshark official OUI database%n• Windows Firewall & Defender auto-configuration%n%nClick Next to continue.
korean.WizardInfoBefore=📌 설치 전 주요 안내 및 백신/방화벽 연동 고지
english.WizardInfoBefore=📌 Pre-installation Notice & Security Exemption Guide
korean.WizardInfoBeforeSub=프로그램 실행 및 네트워크 스캔을 위한 권장 설정 안내입니다.
english.WizardInfoBeforeSub=Recommended configurations for network scanning and diagnostics.
korean.WizardSelectDir=설치 위치 선택
english.WizardSelectDir=Select Destination Location
korean.WizardSelectDirSub=Grid IP Scanner2를 설치할 폴더를 선택하십시오.
english.WizardSelectDirSub=Select the folder where Grid IP Scanner2 will be installed.
korean.WizardSelectTasks=추가 작업 선택
english.WizardSelectTasks=Select Additional Tasks
korean.WizardSelectTasksSub=Grid IP Scanner2 설치 시 수행할 추가 작업을 선택하십시오.
english.WizardSelectTasksSub=Select additional actions to perform during installation.
korean.TaskDefenderExclusion=Windows Defender 검사 예외 목록에 설치 폴더 자동 등록 (오탐지 및 실행 차단 방지 권장)
english.TaskDefenderExclusion=Automatically add installation folder to Windows Defender exclusions (recommended to prevent false positives)
korean.TaskGroupSecurity=보안 및 백신 연동 (권장):
english.TaskGroupSecurity=Security & Antivirus Integration (Recommended):
korean.ExistingAppTerminatedMsg=【기존 앱 종료 알림】%n%n현재 실행 중인 기존 Grid IP Scanner2 애플리케이션을 감지하여 안전하게 종료하였습니다.%n(원활한 설치 및 파일 잠금 해제를 위해 프로세스를 종료했습니다.)
english.ExistingAppTerminatedMsg=[Existing App Terminated]%n%nAn existing running instance of Grid IP Scanner2 was detected and safely closed to unlock files and ensure a smooth installation.
korean.ExistingAppRemovalMsg=【기존 앱 삭제(제거) 알림】%n%n시스템에 설치된 기존 Grid IP Scanner2%1 버전이 감지되었습니다.%n%n새로운 버전(v{#MyAppVersion})의 안정적이고 깨끗한 설치를 위해 기존 설치 파일을 안전하게 삭제(제거)한 후 최신 버전 설치를 진행합니다.
english.ExistingAppRemovalMsg=[Existing App Removal Notice]%n%nAn existing installation of Grid IP Scanner2%1 was detected on your system.%n%nTo ensure a clean and reliable upgrade to v{#MyAppVersion}, the existing installation will be automatically removed before installing the new version.

[Tasks]
Name: "desktopicon"; Description: "바탕 화면에 바로가기 아이콘 생성"; GroupDescription: "바로가기 생성:"; Flags: checkedonce
Name: "startmenuicon"; Description: "시작 메뉴에 프로그램 바로가기 등록"; GroupDescription: "바로가기 생성:"; Flags: checkedonce
Name: "defenderexclusion"; Description: "{cm:TaskDefenderExclusion}"; GroupDescription: "{cm:TaskGroupSecurity}"; Flags: checkedonce
Name: "autostart"; Description: "Windows 부팅 시 백그라운드 자동 실행 (상시 모니터링 모드)"; GroupDescription: "시스템 연동:"; Flags: unchecked

[InstallDelete]
; Clean up any legacy single-file binaries in installation folder
Type: files; Name: "{app}\Grid IP Scanner2*.exe"

[UninstallDelete]
; 언인스톨 시 동적으로 생성된 설정/캐시/임시 파일 및 잔여 폴더 완벽 삭제
Type: filesandordirs; Name: "{app}\dist"
Type: filesandordirs; Name: "{app}\public"
Type: filesandordirs; Name: "{app}\native_dll"
Type: files; Name: "{app}\*.log"
Type: files; Name: "{app}\*.json"
Type: files; Name: "{app}\*.txt"
Type: files; Name: "{app}\*.dat"
Type: files; Name: "{app}\*.bak"
Type: files; Name: "{app}\*.tmp"
Type: files; Name: "{app}\*.ico"
Type: files; Name: "{app}\*.png"
Type: files; Name: "{app}\*.exe"
Type: filesandordirs; Name: "{app}"

[Files]
; =====================================================================
; [3] Unpacked Multi-File Folder Structure (개별 파일 구조 설치)
; =====================================================================
; 1. Primary Core Executable
Source: "..\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\{#MyAppSourceExe}"; DestDir: "{app}"; DestName: "{#MyAppExeName}"; Flags: ignoreversion skipifsourcedoesntexist

; 2. OUI Database & Runtime Metadata
Source: "..\master_oui.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion

; 3. Native Acceleration DLL Modules (Multi-location source detection: root, native_dll, and unpacked)
Source: "..\grid_probe_engine.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\native_dll\grid_probe_engine.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\grid_port_iocp.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\native_dll\grid_port_iocp.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\grid_discovery.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\native_dll\grid_discovery.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\grid_oui_trie.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\native_dll\grid_oui_trie.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\grid_banner_grabber.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\native_dll\grid_banner_grabber.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\grid_pcap_analyzer.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\native_dll\grid_pcap_analyzer.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\grid_fingerprint_engine.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\native_dll\grid_fingerprint_engine.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\grid_net_driver.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\native_dll\grid_net_driver.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\grid_vault_driver.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\native_dll\grid_vault_driver.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\oui_validator.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\native_dll\oui_validator.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\secure_vault.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\native_dll\secure_vault.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\dist_releases\v{#MyAppVersion}\unpacked\*.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

; 4. Icons & Brand Assets
Source: "..\icon.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\icon.png"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\public\logo.png"; DestDir: "{app}"; Flags: ignoreversion

; 5. Web UI Production Assets (Unpacked Bundle)
Source: "..\dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs

; 6. Legal License
Source: "..\docs\LICENSE.md"; DestDir: "{app}"; DestName: "LICENSE.md"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName} v{#MyAppVersion}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\icon.ico"
Name: "{group}\공식 홈페이지 ({#MyAppPublisher})"; Filename: "{#MyAppURL}"; IconFilename: "{app}\icon.ico"
Name: "{group}\언인스톨 {#MyAppName}"; Filename: "{uninstallexe}"; IconFilename: "{app}\icon.ico"
Name: "{autodesktop}\{#MyAppName} v{#MyAppVersion}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon
Name: "{userprograms}\{#MyAppName} v{#MyAppVersion}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\icon.ico"; Tasks: startmenuicon

[Registry]
; Enterprise Software Asset Management Compliance
Root: HKLM; Subkey: "Software\{#MyAppName}"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\{#MyAppName}"; ValueType: string; ValueName: "Version"; ValueData: "{#MyAppVersion}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\{#MyAppName}"; ValueType: string; ValueName: "Publisher"; ValueData: "{#MyAppPublisher}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\{#MyAppName}"; ValueType: string; ValueName: "Executable"; ValueData: "{app}\{#MyAppExeName}"; Flags: uninsdeletekey

; Auto-start on Windows Boot
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "{#MyAppName} v{#MyAppVersion}"; ValueData: """{app}\{#MyAppExeName}"" --tray"; Flags: uninsdeletevalue; Tasks: autostart
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "{#MyAppName}"; ValueData: """{app}\{#MyAppExeName}"" --tray"; Flags: uninsdeletevalue

[Run]
; =====================================================================
; [4] Firewall Rule Pre-Registration (Silently Without Flashing CMD)
; =====================================================================
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""{#MyAppName}"" dir=in action=allow program=""{app}\{#MyAppExeName}"" enable=yes profile=any"; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""{#MyAppName} (Inbound)"" dir=in action=allow program=""{app}\{#MyAppExeName}"" enable=yes profile=any"; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""{#MyAppName} (Outbound)"" dir=out action=allow program=""{app}\{#MyAppExeName}"" enable=yes profile=any"; Flags: runhidden waituntilterminated

Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""{#MyAppName} v{#MyAppVersion}"" dir=in action=allow program=""{app}\{#MyAppExeName}"" enable=yes profile=any"; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""{#MyAppName} v{#MyAppVersion} (Inbound)"" dir=in action=allow program=""{app}\{#MyAppExeName}"" enable=yes profile=any"; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""{#MyAppName} v{#MyAppVersion} (Outbound)"" dir=out action=allow program=""{app}\{#MyAppExeName}"" enable=yes profile=any"; Flags: runhidden waituntilterminated

Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""{#MyAppExeName}"" dir=in action=allow program=""{app}\{#MyAppExeName}"" enable=yes profile=any"; Flags: runhidden waituntilterminated

; =====================================================================
; [4.1] Windows Defender Exclusion Pre-Registration (PowerShell MpPreference)
; Automatically registers installation folder and process in Windows Defender exclusion list
; =====================================================================
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -Command ""Add-MpPreference -ExclusionPath '{app}' -ErrorAction SilentlyContinue"""; Flags: runhidden waituntilterminated; Tasks: defenderexclusion; StatusMsg: "Windows Defender 검사 예외 목록에 설치 폴더 등록 중..."
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -Command ""Add-MpPreference -ExclusionProcess '{#MyAppExeName}' -ErrorAction SilentlyContinue"""; Flags: runhidden waituntilterminated; Tasks: defenderexclusion

; Launch Application post-install in Tray Mode (runascurrentuser executes elevated with --tray)
Filename: "{app}\{#MyAppExeName}"; Parameters: "--tray"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent runascurrentuser

[UninstallRun]
; Clean up firewall rules silently on uninstall
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName}"""; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName} (Inbound)"""; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName} (Outbound)"""; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName} v{#MyAppVersion}"""; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName} v{#MyAppVersion} (Inbound)"""; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName} v{#MyAppVersion} (Outbound)"""; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppExeName}"""; Flags: runhidden waituntilterminated

; Clean up Windows Defender exclusions silently on uninstall
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -Command ""Remove-MpPreference -ExclusionPath '{app}' -ErrorAction SilentlyContinue"""; Flags: runhidden waituntilterminated
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -Command ""Remove-MpPreference -ExclusionProcess '{#MyAppExeName}' -ErrorAction SilentlyContinue"""; Flags: runhidden waituntilterminated

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
begin
  if CurStep = ssPostInstall then
  begin
    // Double-ensure Windows Defender exclusion is applied if task is selected
    if WizardIsTaskSelected('defenderexclusion') then
    begin
      Exec('powershell.exe',
        '-NoProfile -ExecutionPolicy Bypass -Command "Add-MpPreference -ExclusionPath ''' + ExpandConstant('{app}') + ''' -ErrorAction SilentlyContinue"',
        '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      Exec('powershell.exe',
        '-NoProfile -ExecutionPolicy Bypass -Command "Add-MpPreference -ExclusionProcess ''{#MyAppExeName}'' -ErrorAction SilentlyContinue"',
        '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    end;
  end;
end;

function InitializeUninstall(): Boolean;
var
  ResultCode: Integer;
begin
  Result := True;
  // 기존앱 종료: 언인스톨 시작 즉시 모든 관련 실행 프로세스 강제 종료
  Exec('taskkill.exe', '/F /T /IM Grid_IP_Scanner2.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Exec('taskkill.exe', '/F /T /IM "Grid IP Scanner2.exe"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Exec('taskkill.exe', '/F /T /IM "Grid IP Scanner2*.exe"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Sleep(500);
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  ResultCode: Integer;
begin
  if CurUninstallStep = usUninstall then
  begin
    Exec('taskkill.exe', '/F /T /IM Grid_IP_Scanner2.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Exec('taskkill.exe', '/F /T /IM "Grid IP Scanner2.exe"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Sleep(300);
  end
  else if CurUninstallStep = usPostUninstall then
  begin
    // 언인스톨 완료 후 잔여 디렉토리 및 레지스트리 완벽 삭제
    DelTree(ExpandConstant('{app}'), True, True, True);
    RegDeleteKeyIncludingSubkeys(HKLM, 'Software\{#MyAppName}');
    RegDeleteKeyIncludingSubkeys(HKCU, 'Software\{#MyAppName}');
    RegDeleteValue(HKLM, 'Software\Microsoft\Windows\CurrentVersion\Run', '{#MyAppName}');
    RegDeleteValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Run', '{#MyAppName}');

    // Windows Defender 예외 목록 정리
    Exec('powershell.exe',
      '-NoProfile -ExecutionPolicy Bypass -Command "Remove-MpPreference -ExclusionPath ''' + ExpandConstant('{app}') + ''' -ErrorAction SilentlyContinue"',
      '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Exec('powershell.exe',
      '-NoProfile -ExecutionPolicy Bypass -Command "Remove-MpPreference -ExclusionProcess ''{#MyAppExeName}'' -ErrorAction SilentlyContinue"',
      '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;
end;

function GetExistingUninstallExe(): String;
var
  S: String;
  CleanGuid: String;
begin
  Result := '';
  CleanGuid := '{9C2116BA-10DD-4E5F-8DC5-4279D64B8DF3}_is1';

  // 1. 레지스트리 64비트 및 32비트 UninstallString 조회
  if RegQueryStringValue(HKLM64, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\' + CleanGuid, 'UninstallString', S) then
    Result := RemoveQuotes(S)
  else if RegQueryStringValue(HKLM32, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\' + CleanGuid, 'UninstallString', S) then
    Result := RemoveQuotes(S)
  else if RegQueryStringValue(HKCU64, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\' + CleanGuid, 'UninstallString', S) then
    Result := RemoveQuotes(S)
  else if RegQueryStringValue(HKCU32, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\' + CleanGuid, 'UninstallString', S) then
    Result := RemoveQuotes(S);

  // 2. 레지스트리 InstallPath 경로 기반 unins000.exe 확인
  if (Result = '') or (not FileExists(Result)) then
  begin
    if RegQueryStringValue(HKLM64, 'Software\{#MyAppName}', 'InstallPath', S) or
       RegQueryStringValue(HKLM32, 'Software\{#MyAppName}', 'InstallPath', S) or
       RegQueryStringValue(HKLM, 'Software\{#MyAppName}', 'InstallPath', S) or
       RegQueryStringValue(HKCU, 'Software\{#MyAppName}', 'InstallPath', S) then
    begin
      S := RemoveQuotes(S);
      if FileExists(S + '\unins000.exe') then
        Result := S + '\unins000.exe'
      else if FileExists(S + '\unins001.exe') then
        Result := S + '\unins001.exe';
    end;
  end;

  // 3. 기본 Program Files 설치 경로 내 언인스톨러 탐색
  if (Result = '') or (not FileExists(Result)) then
  begin
    if FileExists(ExpandConstant('{autopf}\{#MyAppName}\unins000.exe')) then
      Result := ExpandConstant('{autopf}\{#MyAppName}\unins000.exe')
    else if FileExists(ExpandConstant('{autopf}\{#MyAppName}\unins001.exe')) then
      Result := ExpandConstant('{autopf}\{#MyAppName}\unins001.exe');
  end;
end;

function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
  KillResult1, KillResult2, KillResult3: Integer;
  UninstallExe: String;
begin
  Result := True;

  // 1. 기존 실행 중인 앱 감지 및 무소음 강제 종료 (파일 잠금 해제)
  Exec('taskkill.exe', '/F /T /IM Grid_IP_Scanner2.exe', '', SW_HIDE, ewWaitUntilTerminated, KillResult1);
  Exec('taskkill.exe', '/F /T /IM "Grid IP Scanner2.exe"', '', SW_HIDE, ewWaitUntilTerminated, KillResult2);
  Exec('taskkill.exe', '/F /T /IM "Grid IP Scanner2*.exe"', '', SW_HIDE, ewWaitUntilTerminated, KillResult3);
  Sleep(400);

  // 2. 기존 설치 버전 감지 시 사용자의 수동 [확인] 클릭 요구 없이 '포그라운드 100% 자동 언인스톨' 수행
  // (/SILENT /NORESTART /SUPPRESSMSGBOXES 및 SW_SHOWNORMAL로 포그라운드에서 진행률 창이 자동 표출되어 수동 클릭 없이 완료 후 설치 진입)
  UninstallExe := GetExistingUninstallExe();
  if (UninstallExe <> '') and FileExists(UninstallExe) then
  begin
    Log('Existing Grid IP Scanner2 uninstaller detected: ' + UninstallExe);
    Log('Executing 100% automatic foreground uninstallation...');
    // /SILENT /NORESTART /SUPPRESSMSGBOXES 및 SW_SHOWNORMAL로 포그라운드에서 팝업 클릭 없이 자동 언인스톨
    Exec(UninstallExe, '/SILENT /NORESTART /SUPPRESSMSGBOXES', '', SW_SHOWNORMAL, ewWaitUntilTerminated, ResultCode);
    Sleep(800);
  end;
end;
