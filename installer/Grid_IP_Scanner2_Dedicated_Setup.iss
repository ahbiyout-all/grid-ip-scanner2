; =====================================================================
; Grid IP Scanner2 v2.4.23 - Dedicated Isolated Inno Setup 6 Script
; Detailed Step-by-Step Installation Wizard & Guaranteed Isolated Environment
; Copyright (c) 2025-2026 AhBiYout  All rights reserved.
; =====================================================================

#define MyAppName "Grid IP Scanner2"
#define MyAppVersion "2.4.23"
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
UpdateUninstallRegKey=yes

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
PrivilegesRequiredOverridesAllowed=dialog

; Unattended / Silent Capabilities
CloseApplications=yes
RestartApplications=no

; Version Metadata
VersionInfoVersion={#MyAppVersion}.0
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription={#MyAppName} Detailed Step-by-Step Multi-File Installer (v{#MyAppVersion})
VersionInfoCopyright=Copyright (C) 2025-2026 {#MyAppPublisher}
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#MyAppVersion}

[Languages]
Name: "korean"; MessagesFile: "compiler:Languages\Korean.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[CustomMessages]
korean.WelcomeLabel1=Grid IP Scanner2 v{#MyAppVersion} 설치 마법사에 오신 것을 환영합니다.
korean.WelcomeLabel2=본 설치 마법사는 사용자 시스템에 Grid IP Scanner2를 안전하고 신속하게 설치하도록 상세 과정별로 안내합니다.%n%n• 초고속 IP/포트 스캔 네트워크 진단 유틸리티%n• IEEE 및 Wireshark 공식 9만 건 OUI 제조사 DB 내장%n• Windows 방화벽 예외 자동 연동%n%n[다음] 버튼을 누르시면 단계별 상세 설치가 진행됩니다.
korean.WizardInfoBefore=📌 설치 전 주요 안내 및 백신/방화벽 연동 고지
korean.WizardInfoBeforeSub=프로그램 실행 및 네트워크 스캔을 위한 권장 설정 안내입니다.
korean.WizardSelectDir=설치 위치 선택
korean.WizardSelectDirSub=Grid IP Scanner2를 설치할 폴더를 선택하십시오.
korean.WizardSelectTasks=추가 작업 선택
korean.WizardSelectTasksSub=Grid IP Scanner2 설치 시 수행할 추가 작업을 선택하십시오.

[Tasks]
Name: "desktopicon"; Description: "바탕 화면에 바로가기 아이콘 생성"; GroupDescription: "바로가기 생성:"; Flags: checkedonce
Name: "startmenuicon"; Description: "시작 메뉴에 프로그램 바로가기 등록"; GroupDescription: "바로가기 생성:"; Flags: checkedonce
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
Source: "..\winres.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion

; 3. Native Acceleration DLL Modules
Source: "..\grid_probe_engine.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\grid_port_iocp.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\grid_discovery.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\grid_oui_trie.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\grid_banner_grabber.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\grid_pcap_analyzer.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\grid_net_driver.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\grid_vault_driver.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

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

; Launch Application post-install
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Clean up firewall rules silently on uninstall
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName}"""; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName} (Inbound)"""; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName} (Outbound)"""; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName} v{#MyAppVersion}"""; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName} v{#MyAppVersion} (Inbound)"""; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName} v{#MyAppVersion} (Outbound)"""; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppExeName}"""; Flags: runhidden waituntilterminated

[Code]
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
  end;
end;

function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
  UninstallKey: String;
  ExistingInstallPath: String;
  ExistingVersion: String;
  HasExisting: Boolean;
begin
  Result := True;
  UninstallKey := 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#SetupSetting("AppId")}_is1';
  ExistingInstallPath := '';
  ExistingVersion := '';
  HasExisting := False;

  // 1. 기존 실행 중인 모든 앱 및 스케줄러 프로세스 무조건 자동 강제 종료 (파일 잠금 해제)
  Exec('taskkill.exe', '/F /T /IM Grid_IP_Scanner2.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Exec('taskkill.exe', '/F /T /IM "Grid IP Scanner2.exe"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Exec('taskkill.exe', '/F /T /IM "Grid IP Scanner2*.exe"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Sleep(300);

  // 2. 레지스트리 및 디렉토리에서 기존 설치 정보 자동 조회
  if RegQueryStringValue(HKLM64, UninstallKey, 'InstallLocation', ExistingInstallPath) then
    HasExisting := True
  else if RegQueryStringValue(HKLM32, UninstallKey, 'InstallLocation', ExistingInstallPath) then
    HasExisting := True
  else if RegQueryStringValue(HKLM64, 'Software\{#MyAppName}', 'InstallPath', ExistingInstallPath) then
    HasExisting := True;

  if not RegQueryStringValue(HKLM64, UninstallKey, 'DisplayVersion', ExistingVersion) then
    RegQueryStringValue(HKLM64, 'Software\{#MyAppName}', 'Version', ExistingVersion);

  if not HasExisting then
  begin
    if DirExists(ExpandConstant('{autopf}\{#MyAppName}')) then
    begin
      HasExisting := True;
      ExistingInstallPath := ExpandConstant('{autopf}\{#MyAppName}');
    end;
  end;

  // 3. 기존 버전 감지 시 별도 확인 팝업 없이 '자동 무소음 언인스톨' 수행
  if HasExisting then
  begin
    if (ExistingInstallPath <> '') and FileExists(ExistingInstallPath + '\unins000.exe') then
    begin
      Exec(ExistingInstallPath + '\unins000.exe', '/SILENT /NORESTART /SUPPRESSMSGBOXES', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      Sleep(500);
    end;
  end;
end;
