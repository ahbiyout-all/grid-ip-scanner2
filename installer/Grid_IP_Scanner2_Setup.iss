; =====================================================================
; Grid IP Scanner2 - Inno Setup 6 Official Multi-File Installer Script
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
; App Identity & Windows Add/Remove Programs (제어판 프로그램 추가/제거 공식 등록)
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

; Process Management & Applications Closing during Install/Uninstall
CloseApplications=yes
CloseApplicationsFilter=*.exe
RestartApplications=no

; Installation Paths (64-bit Native Program Files)
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableWelcomePage=no
DisableDirPage=no
DisableProgramGroupPage=no
DisableReadyPage=no
SetupIconFile=..\icon.ico
WizardImageFile=wizard_large.bmp
WizardSmallImageFile=wizard_small.bmp
LicenseFile=..\docs\LICENSE.md
InfoBeforeFile=NOTICE_BEFORE_INSTALL.txt
OutputDir=..\dist_installer
OutputBaseFilename=Grid_IP_Scanner2_v{#MyAppVersion}_Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin

; Version Information Stored in Setup.exe
VersionInfoVersion={#MyAppVersion}.0
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription={#MyAppName} Official Multi-File Installer (v{#MyAppVersion})
VersionInfoCopyright=Copyright (C) 2025-2026 {#MyAppPublisher}
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#MyAppVersion}

[Languages]
Name: "korean"; MessagesFile: "compiler:Languages\Korean.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "startmenuicon"; Description: "시작 메뉴에 바로가기 생성"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce
Name: "autostart"; Description: "Windows 부팅 시 백그라운드 자동 실행 (상시 모니터링)"; GroupDescription: "시스템 연동:"; Flags: unchecked

[InstallDelete]
; 기존 설치 폴더에 잔존할 수 있는 구버전 포터블 바이너리(Grid IP Scanner2 v*.exe) 완전 자동 정리
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
; 1. Core Executable (표준 단일 설치 실행 파일)
Source: "..\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\{#MyAppSourceExe}"; DestDir: "{app}"; DestName: "{#MyAppExeName}"; Flags: ignoreversion skipifsourcedoesntexist

; 2. Core Databases & Configuration Metadata
Source: "..\master_oui.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\winres.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion

; 3. Native Acceleration DLL Modules
Source: "..\grid_probe_engine.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\grid_port_iocp.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\grid_discovery.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\grid_oui_trie.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\grid_banner_grabber.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

; 4. Branding & Icon Assets
Source: "..\icon.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\icon.png"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\public\logo.png"; DestDir: "{app}"; Flags: ignoreversion

; 5. Web UI & Frontend Distribution Bundle (Unpacked Web Production Assets)
Source: "..\dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs

; 6. Public Static Assets & Manifests
Source: "..\public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs

; 7. Legal License
Source: "..\docs\LICENSE.md"; DestDir: "{app}"; DestName: "LICENSE.md"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName} v{#MyAppVersion}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppExeName}"
Name: "{group}\홈페이지 방문 ({#MyAppPublisher})"; Filename: "{#MyAppURL}"; IconFilename: "{app}\{#MyAppExeName}"
Name: "{group}\언인스톨 {#MyAppName}"; Filename: "{uninstallexe}"; IconFilename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName} v{#MyAppVersion}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userprograms}\{#MyAppName} v{#MyAppVersion}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppExeName}"; Tasks: startmenuicon

[Registry]
; Enterprise Software Asset Management Compliance
Root: HKLM; Subkey: "Software\{#MyAppName}"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\{#MyAppName}"; ValueType: string; ValueName: "Version"; ValueData: "{#MyAppVersion}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\{#MyAppName}"; ValueType: string; ValueName: "Publisher"; ValueData: "{#MyAppPublisher}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\{#MyAppName}"; ValueType: string; ValueName: "Executable"; ValueData: "{app}\{#MyAppExeName}"; Flags: uninsdeletekey

; Auto-start on Windows Boot (if task checked)
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "{#MyAppName}"; ValueData: """{app}\{#MyAppExeName}"" --tray"; Flags: uninsdeletevalue; Tasks: autostart
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "{#MyAppName}"; ValueData: """{app}\{#MyAppExeName}"" --tray"; Flags: uninsdeletevalue; Tasks: autostart

[Run]
; 1. 기본 방화벽 규칙 등록
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""{#MyAppName}"" dir=in action=allow program=""{app}\{#MyAppExeName}"" enable=yes profile=any"; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""{#MyAppName} (Inbound)"" dir=in action=allow program=""{app}\{#MyAppExeName}"" enable=yes profile=any"; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""{#MyAppName} (Outbound)"" dir=out action=allow program=""{app}\{#MyAppExeName}"" enable=yes profile=any"; Flags: runhidden waituntilterminated

; Launch Application after Setup Completion (Skip if Silent / Unattended)
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; [제거 단계] 등록된 모든 방화벽 규칙 조용히 삭제
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName}"""; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName} (Inbound)"""; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName} (Outbound)"""; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppExeName}"""; Flags: runhidden waituntilterminated

[Code]
// =====================================================================
// 언인스톨 단계 실행 중 프로세스 강제 종료 (파일 잠금 해제 및 완벽 삭제 보장)
// =====================================================================
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  ResultCode: Integer;
begin
  if CurUninstallStep = usUninstall then
  begin
    // 1. 언인스톨 시작 즉시 실행 중인 모든 관련 앱 프로세스 강제 종료
    Exec('taskkill.exe', '/F /IM Grid_IP_Scanner2.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Exec('taskkill.exe', '/F /IM "Grid IP Scanner2.exe"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Exec('taskkill.exe', '/F /IM "Grid IP Scanner2*.exe"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Sleep(500);
  end;
end;

var
  ExistingInstallPath: String;
  ExistingUninstaller: String;
  ExistingVersion: String;

function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
  Response: Integer;
  UninstallKey: String;
  HasExisting: Boolean;
  PromptMsg: String;
begin
  Result := True;
  UninstallKey := 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#SetupSetting("AppId")}_is1';
  ExistingInstallPath := '';
  ExistingUninstaller := '';
  ExistingVersion := '';
  HasExisting := False;

  // 1. 레지스트리에서 기존 설치 위치, 버전 및 언인스톨러 조회 (64비트 및 32비트 검사)
  if RegQueryStringValue(HKLM64, UninstallKey, 'InstallLocation', ExistingInstallPath) then
    HasExisting := True
  else if RegQueryStringValue(HKLM32, UninstallKey, 'InstallLocation', ExistingInstallPath) then
    HasExisting := True
  else if RegQueryStringValue(HKLM64, 'Software\{#MyAppName}', 'InstallPath', ExistingInstallPath) then
    HasExisting := True
  else if RegQueryStringValue(HKLM32, 'Software\{#MyAppName}', 'InstallPath', ExistingInstallPath) then
    HasExisting := True;

  // 기존 버전 번호 조회
  if not RegQueryStringValue(HKLM64, UninstallKey, 'DisplayVersion', ExistingVersion) then
    if not RegQueryStringValue(HKLM32, UninstallKey, 'DisplayVersion', ExistingVersion) then
      RegQueryStringValue(HKLM64, 'Software\{#MyAppName}', 'Version', ExistingVersion);

  // 언인스톨러 실행 명령줄 확인
  if not RegQueryStringValue(HKLM64, UninstallKey, 'QuietUninstallString', ExistingUninstaller) then
    if not RegQueryStringValue(HKLM64, UninstallKey, 'UninstallString', ExistingUninstaller) then
      if not RegQueryStringValue(HKLM32, UninstallKey, 'QuietUninstallString', ExistingUninstaller) then
        RegQueryStringValue(HKLM32, UninstallKey, 'UninstallString', ExistingUninstaller);

  // 2. 파일 시스템 기반 직접 감지
  if not HasExisting then
  begin
    if FileExists(ExpandConstant('{autopf}\{#MyAppName}\{#MyAppExeName}')) or
       DirExists(ExpandConstant('{autopf}\{#MyAppName}')) then
    begin
      HasExisting := True;
      ExistingInstallPath := ExpandConstant('{autopf}\{#MyAppName}');
    end;
  end;

  // 기존 설치가 감지된 경우 분기 처리
  if HasExisting then
  begin
    // [무인 설치 모드]: /SILENT 또는 /VERYSILENT 명령줄 옵션 시 대화 상자 없이 기존 버전 자동 완전 삭제 후 설치 진행
    if WizardSilent() then
    begin
      Exec('taskkill.exe', '/F /IM Grid_IP_Scanner2.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      Exec('taskkill.exe', '/F /IM "Grid IP Scanner2.exe"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      if FileExists(ExistingInstallPath + '\unins000.exe') then
        Exec(ExistingInstallPath + '\unins000.exe', '/SILENT /NORESTART /SUPPRESSMSGBOXES', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      Result := True;
      Exit;
    end;

    // [대화형 일반 설치]: 사용자에게 기존 버전 완전 제거 후 최신 버전 설치 진행 여부 질의
    PromptMsg := '시스템에 기존 ' + '{#MyAppName}';
    if ExistingVersion <> '' then
      PromptMsg := PromptMsg + ' (v' + ExistingVersion + ')';
    PromptMsg := PromptMsg + ' 버전이 이미 설치되어 있습니다.' + #13#10#13#10 +
      '안정적인 설치를 위해 기존 버전을 제거하고 최신 v{#MyAppVersion}(으)로 업그레이드하시겠습니까?';

    Response := MsgBox(PromptMsg, mbConfirmation, MB_YESNO);

    if Response = IDYES then
    begin
      // 1. 기존 실행 프로세스 강제 종료
      Exec('taskkill.exe', '/F /IM Grid_IP_Scanner2.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      Exec('taskkill.exe', '/F /IM "Grid IP Scanner2.exe"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

      // 2. 기존 언인스톨러 조용히 실행 (구버전 완전 삭제)
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
