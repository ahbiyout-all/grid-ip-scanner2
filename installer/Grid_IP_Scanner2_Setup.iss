; =====================================================================
; Grid IP Scanner2 - Inno Setup 6 Official Enterprise Installer Script
; Copyright (c) 2025-2026 AhBiYout  All rights reserved.
; =====================================================================

#define MyAppName "Grid IP Scanner2"
#define MyAppVersion "2.4.23"
#define MyAppPublisher "AhBiYout"
#define MyAppURL "https://github.com/AhBiYout-all/grid-ip-scanner2"
#define MyAppBlogURL "https://ahbiyoutvibe.blogspot.com/"
#define MyAppExeName "Grid_IP_Scanner2.exe"
#define MyAppSourceExe "Grid IP Scanner2 v" + MyAppVersion + ".exe"

[Setup]
; ---------------------------------------------------------------------
; 1. App Identity & Windows Control Panel [Add/Remove Programs] Registration
; ---------------------------------------------------------------------
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
UninstallFilesDir={app}

; ---------------------------------------------------------------------
; 2. Installation Paths & Architecture (Native 64-Bit Program Files)
; ---------------------------------------------------------------------
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog

; ---------------------------------------------------------------------
; 3. Step-by-Step Installation Wizard Pages Configuration (설치 단계 개편)
; ---------------------------------------------------------------------
DisableWelcomePage=no
DisableDirPage=no
DisableProgramGroupPage=no
DisableReadyPage=no
WizardStyle=modern
WizardSizePercent=110
SetupIconFile=..\icon.ico
WizardImageFile=wizard_large.bmp
WizardSmallImageFile=wizard_small.bmp
LicenseFile=..\docs\LICENSE.md
InfoBeforeFile=NOTICE_BEFORE_INSTALL.txt

; ---------------------------------------------------------------------
; 4. Output & Compression Settings
; ---------------------------------------------------------------------
OutputDir=..\dist_installer
OutputBaseFilename=Grid_IP_Scanner2_v{#MyAppVersion}_Setup
Compression=lzma2/ultra64
SolidCompression=yes

; ---------------------------------------------------------------------
; 5. Process & Application Management during Install/Uninstall
; ---------------------------------------------------------------------
CloseApplications=yes
CloseApplicationsFilter=*.exe
RestartApplications=no

; ---------------------------------------------------------------------
; 6. Metadata Stored in Setup.exe Properties
; ---------------------------------------------------------------------
VersionInfoVersion={#MyAppVersion}.0
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription={#MyAppName} Official Enterprise Installer (v{#MyAppVersion})
VersionInfoCopyright=Copyright (C) 2025-2026 {#MyAppPublisher}
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#MyAppVersion}

[Languages]
Name: "korean"; MessagesFile: "compiler:Languages\Korean.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[CustomMessages]
korean.WelcomeLabel1=Grid IP Scanner2 v{#MyAppVersion} 설치 마법사에 오신 것을 환영합니다.
korean.WelcomeLabel2=본 설치 마법사는 사용자 시스템에 Grid IP Scanner2를 안전하고 신속하게 설치하도록 단계별로 안내합니다.%n%n• 초고속 C-Class 서브넷 IP/포트 스캔 유틸리티%n• IEEE 및 Wireshark 공식 9만 건 OUI 제조사 DB 내장%n• C/Win32 네이티브 가속 모듈 내장%n• Windows 방화벽 예외 자동 연동%n%n[다음] 버튼을 누르시면 설치 안내 및 라이선스 확인 단계로 이동합니다.
korean.WizardInfoBefore=📌 설치 전 안내 및 백신 오탐지 고지
korean.WizardInfoBeforeSub=네트워크 스캔을 위한 권장 설정 및 예외 처리 안내입니다.
korean.WizardSelectDir=설치 폴더 지정
korean.WizardSelectDirSub=Grid IP Scanner2를 설치할 폴더를 선택하십시오.
korean.WizardSelectTasks=추가 작업 선택
korean.WizardSelectTasksSub=Grid IP Scanner2 설치 시 수행할 추가 옵션을 선택하십시오.

[Tasks]
Name: "desktopicon"; Description: "바탕 화면에 바로가기 아이콘 생성"; GroupDescription: "바로가기 생성:"; Flags: checkedonce
Name: "startmenuicon"; Description: "시작 메뉴에 바로가기 폴더 생성"; GroupDescription: "바로가기 생성:"; Flags: checkedonce
Name: "autostart"; Description: "Windows 부팅 시 백그라운드 자동 실행 (상시 모니터링 모드)"; GroupDescription: "시스템 연동:"; Flags: unchecked

[InstallDelete]
; Clean up any legacy single-file binaries or temp files in install folder
Type: files; Name: "{app}\Grid IP Scanner2*.exe"
Type: files; Name: "{app}\*.tmp"

[UninstallDelete]
; 언인스톨 시 동적으로 생성된 모든 설정/캐시/임시 파일 및 잔여 폴더 완벽 정리
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
; 1. Core Executable
Source: "..\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\{#MyAppSourceExe}"; DestDir: "{app}"; DestName: "{#MyAppExeName}"; Flags: ignoreversion skipifsourcedoesntexist

; 2. Core Databases & Metadata
Source: "..\master_oui.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\winres.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion

; 3. Native Acceleration DLL Modules
Source: "..\grid_probe_engine.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\grid_port_iocp.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\grid_discovery.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\grid_oui_trie.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\grid_banner_grabber.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

; 4. Icons & Brand Assets
Source: "..\icon.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\icon.png"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\public\logo.png"; DestDir: "{app}"; Flags: ignoreversion

; 5. Web UI Production Assets
Source: "..\dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs

; 6. Legal License
Source: "..\docs\LICENSE.md"; DestDir: "{app}"; DestName: "LICENSE.md"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName} v{#MyAppVersion}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppExeName}"
Name: "{group}\공식 홈페이지 ({#MyAppPublisher})"; Filename: "{#MyAppURL}"; IconFilename: "{app}\{#MyAppExeName}"
Name: "{group}\언인스톨 {#MyAppName}"; Filename: "{uninstallexe}"; IconFilename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName} v{#MyAppVersion}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userprograms}\{#MyAppName} v{#MyAppVersion}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppExeName}"; Tasks: startmenuicon

[Registry]
; Enterprise Software Asset Management Registries
Root: HKLM; Subkey: "Software\{#MyAppName}"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\{#MyAppName}"; ValueType: string; ValueName: "Version"; ValueData: "{#MyAppVersion}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\{#MyAppName}"; ValueType: string; ValueName: "Publisher"; ValueData: "{#MyAppPublisher}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\{#MyAppName}"; ValueType: string; ValueName: "Executable"; ValueData: "{app}\{#MyAppExeName}"; Flags: uninsdeletekey

Root: HKCU; Subkey: "Software\{#MyAppName}"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\{#MyAppName}"; ValueType: string; ValueName: "Version"; ValueData: "{#MyAppVersion}"; Flags: uninsdeletekey

; Auto-start on Windows Boot
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "{#MyAppName}"; ValueData: """{app}\{#MyAppExeName}"" --tray"; Flags: uninsdeletevalue; Tasks: autostart
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "{#MyAppName}"; ValueData: """{app}\{#MyAppExeName}"" --tray"; Flags: uninsdeletevalue; Tasks: autostart

[Run]
; Firewall Rules Auto-Registration
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""{#MyAppName}"" dir=in action=allow program=""{app}\{#MyAppExeName}"" enable=yes profile=any"; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""{#MyAppName} (Inbound)"" dir=in action=allow program=""{app}\{#MyAppExeName}"" enable=yes profile=any"; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""{#MyAppName} (Outbound)"" dir=out action=allow program=""{app}\{#MyAppExeName}"" enable=yes profile=any"; Flags: runhidden waituntilterminated

; Launch Application post-install
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Clean up Firewall Rules on Uninstall
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName}"""; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName} (Inbound)"""; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName} (Outbound)"""; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppExeName}"""; Flags: runhidden waituntilterminated

[Code]
// =====================================================================
// 언인스톨 완벽 보장: 프로세스 강제 종료, 파일 잠금 해제, 잔재 완벽 전소
// =====================================================================

function InitializeUninstall(): Boolean;
var
  ResultCode: Integer;
begin
  Result := True;
  // 1. 제어판 언인스톨 버튼 클릭 즉시 실행 중인 모든 관련 앱 프로세스 강제 종료
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
    // 2. 파일 언인스톨 완료 후 잔여 설치 폴더 및 레지스트리 잔재 강제 완전 삭제
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
  Response: Integer;
  UninstallKey: String;
  ExistingInstallPath: String;
  ExistingVersion: String;
  HasExisting: Boolean;
  PromptMsg: String;
begin
  Result := True;
  UninstallKey := 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#SetupSetting("AppId")}_is1';
  ExistingInstallPath := '';
  ExistingVersion := '';
  HasExisting := False;

  // 1. 레지스트리에서 기존 설치 정보 조회
  if RegQueryStringValue(HKLM64, UninstallKey, 'InstallLocation', ExistingInstallPath) then
    HasExisting := True
  else if RegQueryStringValue(HKLM32, UninstallKey, 'InstallLocation', ExistingInstallPath) then
    HasExisting := True
  else if RegQueryStringValue(HKLM64, 'Software\{#MyAppName}', 'InstallPath', ExistingInstallPath) then
    HasExisting := True;

  if not RegQueryStringValue(HKLM64, UninstallKey, 'DisplayVersion', ExistingVersion) then
    RegQueryStringValue(HKLM32, UninstallKey, 'DisplayVersion', ExistingVersion);

  // 2. 디렉토리 직접 감지
  if not HasExisting then
  begin
    if DirExists(ExpandConstant('{autopf}\{#MyAppName}')) then
    begin
      HasExisting := True;
      ExistingInstallPath := ExpandConstant('{autopf}\{#MyAppName}');
    end;
  end;

  // 3. 기존 버전 설치 감지 시 무소음 완전 삭제 후 신규 설치 진행
  if HasExisting then
  begin
    if WizardSilent() then
    begin
      Exec('taskkill.exe', '/F /T /IM Grid_IP_Scanner2.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      Exec('taskkill.exe', '/F /T /IM "Grid IP Scanner2.exe"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      if (ExistingInstallPath <> '') and FileExists(ExistingInstallPath + '\unins000.exe') then
        Exec(ExistingInstallPath + '\unins000.exe', '/SILENT /NORESTART /SUPPRESSMSGBOXES', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      Result := True;
      Exit;
    end;

    PromptMsg := '시스템에 기존 ' + '{#MyAppName}';
    if ExistingVersion <> '' then
      PromptMsg := PromptMsg + ' (v' + ExistingVersion + ')';
    PromptMsg := PromptMsg + ' 버전이 이미 설치되어 있습니다.' + #13#10#13#10 +
      '안정적인 최신 v{#MyAppVersion} 설치를 위해 기존 버전을 깨끗하게 제거 후 진행하시겠습니까?';

    Response := MsgBox(PromptMsg, mbConfirmation, MB_YESNO);

    if Response = IDYES then
    begin
      // A. 실행 중인 프로세스 강제 종료 (파일 잠금 해제)
      Exec('taskkill.exe', '/F /T /IM Grid_IP_Scanner2.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      Exec('taskkill.exe', '/F /T /IM "Grid IP Scanner2.exe"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

      // B. 기존 언인스톨러 조용히 실행 (구버전 완전 삭제)
      if (ExistingInstallPath <> '') and FileExists(ExistingInstallPath + '\unins000.exe') then
      begin
        Exec(ExistingInstallPath + '\unins000.exe', '/SILENT /NORESTART /SUPPRESSMSGBOXES', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      end;

      Result := True;
    end
    else
    begin
      Result := False;
    end;
  end;
end;
