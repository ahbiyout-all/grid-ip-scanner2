; =====================================================================
; Grid IP Scanner2 - Inno Setup 6 Official Multi-File Installer Script
; Copyright (c) 2025-2026 AhBiYout (Cisnet). All rights reserved.
; =====================================================================

#define MyAppName "Grid IP Scanner2"
#define MyAppVersion "2.3.2"
#define MyAppPublisher "AhBiYout (Cisnet)"
#define MyAppURL "http://www.cisnet.co.kr"
#define MyAppBlogURL "https://ahbiyoutvibe.blogspot.com/"
#define MyAppExeName "Grid IP Scanner2 v2.3.2.exe"
#define MyAppAssocName MyAppName + " Session File"
#define MyAppAssocExt ".gscan"
#define MyAppAssocKey StringChange(MyAppAssocName, " ", "") + MyAppAssocExt

[Setup]
; App Identity
AppId={{9C2116BA-10DD-4E5F-8DC5-4279D64B8DF3}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} v{#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppBlogURL}
AppUpdatesURL={#MyAppBlogURL}

; Installation Paths (64-bit Native Program Files)
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
LicenseFile=..\docs\LICENSE.md
OutputDir=..\dist_installer
OutputBaseFilename=Grid_IP_Scanner2_v{#MyAppVersion}_Setup
SetupIconFile=..\icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog

; Unattended / Silent Installation Capabilities (무인 설치 옵션 완전 지원)
CloseApplications=yes
RestartApplications=no

; Version Information Stored in Setup.exe
VersionInfoVersion={#MyAppVersion}.0
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription={#MyAppName} Official Installer (v{#MyAppVersion})
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

[Files]
; 1. Core Windows Native Executable (단일 바이너리)
Source: "..\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion

; 2. Unpacked Multi-File Assets & Frontend Web Distribution (폴더 풀림 개별 파일 설치 구조)
Source: "..\master_oui.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\icon.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\icon.png"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\docs\*"; DestDir: "{app}\docs"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName} v{#MyAppVersion}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\icon.ico"
Name: "{group}\홈페이지 방문 ({#MyAppPublisher})"; Filename: "{#MyAppURL}"
Name: "{group}\언인스톨 {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName} v{#MyAppVersion}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon

[Registry]
; Enterprise Software Asset Management Compliance
Root: HKLM; Subkey: "Software\{#MyAppName}"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\{#MyAppName}"; ValueType: string; ValueName: "Version"; ValueData: "{#MyAppVersion}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\{#MyAppName}"; ValueType: string; ValueName: "Publisher"; ValueData: "{#MyAppPublisher}"; Flags: uninsdeletekey

; Auto-start on Windows Boot (if task checked)
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "{#MyAppName} v{#MyAppVersion}"; ValueData: """{app}\{#MyAppExeName}"" --tray"; Flags: uninsdeletevalue; Tasks: autostart

[Run]
; [배포/설치 단계] 설치 프로그램(Installer)에서 방화벽 규칙을 사전에 조용히 등록 (버전 정보 포함 이름 및 기본 이름 동시 등록)
; 1. 버전 정보가 포함된 앱 이름 방화벽 규칙 등록
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""{#MyAppName} v{#MyAppVersion}"" dir=in action=allow program=""{app}\{#MyAppExeName}"" enable=yes profile=any"; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""{#MyAppName} v{#MyAppVersion} (Inbound)"" dir=in action=allow program=""{app}\{#MyAppExeName}"" enable=yes profile=any"; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""{#MyAppName} v{#MyAppVersion} (Outbound)"" dir=out action=allow program=""{app}\{#MyAppExeName}"" enable=yes profile=any"; Flags: runhidden waituntilterminated

; 2. 기본 앱 이름(Grid IP Scanner2) 방화벽 규칙 등록
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""{#MyAppName}"" dir=in action=allow program=""{app}\{#MyAppExeName}"" enable=yes profile=any"; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""{#MyAppName} (Inbound)"" dir=in action=allow program=""{app}\{#MyAppExeName}"" enable=yes profile=any"; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""{#MyAppName} (Outbound)"" dir=out action=allow program=""{app}\{#MyAppExeName}"" enable=yes profile=any"; Flags: runhidden waituntilterminated

; Launch Application after Setup Completion (Skip if Silent / Unattended)
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; [제거 단계] 사전에 등록된 방화벽 규칙을 조용히 제거 (버전 정보 포함 규칙 및 기본 이름 규칙)
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName} v{#MyAppVersion} (Inbound)"""; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName} v{#MyAppVersion} (Outbound)"""; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName} v{#MyAppVersion}"""; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName} (Inbound)"""; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName} (Outbound)"""; Flags: runhidden waituntilterminated
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName}"""; Flags: runhidden waituntilterminated

[Code]
// =====================================================================
// 기존 설치 감지, 삭제/덮어쓰기 질의, 무인 설치(Silent) 지원 로직
// =====================================================================

var
  ExistingInstallPath: String;
  ExistingUninstaller: String;

function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
  Response: Integer;
  UninstallKey: String;
  HasExisting: Boolean;
begin
  Result := True;
  UninstallKey := 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#SetupSetting("AppId")}_is1';
  ExistingInstallPath := '';
  ExistingUninstaller := '';
  HasExisting := False;

  // 1. 레지스트리에서 기존 설치 위치 및 언인스톨러 조회 (64비트 및 32비트 검사)
  if RegQueryStringValue(HKLM64, UninstallKey, 'InstallLocation', ExistingInstallPath) then
    HasExisting := True
  else if RegQueryStringValue(HKLM32, UninstallKey, 'InstallLocation', ExistingInstallPath) then
    HasExisting := True
  else if RegQueryStringValue(HKLM64, 'Software\{#MyAppName}', 'InstallPath', ExistingInstallPath) then
    HasExisting := True
  else if RegQueryStringValue(HKLM32, 'Software\{#MyAppName}', 'InstallPath', ExistingInstallPath) then
    HasExisting := True;

  // 언인스톨러 실행 명령줄 확인
  if not RegQueryStringValue(HKLM64, UninstallKey, 'QuietUninstallString', ExistingUninstaller) then
    if not RegQueryStringValue(HKLM64, UninstallKey, 'UninstallString', ExistingUninstaller) then
      if not RegQueryStringValue(HKLM32, UninstallKey, 'QuietUninstallString', ExistingUninstaller) then
        RegQueryStringValue(HKLM32, UninstallKey, 'UninstallString', ExistingUninstaller);

  // 2. 파일 시스템 기반 직접 감지 (Program Files 내 기존 실행 파일 존재 여부)
  if not HasExisting then
  begin
    if FileExists(ExpandConstant('{autopf}\{#MyAppName}\{#MyAppExeName}')) or
       FileExists(ExpandConstant('{pf}\{#MyAppName}\{#MyAppExeName}')) then
    begin
      HasExisting := True;
      ExistingInstallPath := ExpandConstant('{autopf}\{#MyAppName}');
    end;
  end;

  // 기존 설치가 감지된 경우 분기 처리
  if HasExisting then
  begin
    // [무인 설치 모드]: /SILENT 또는 /VERYSILENT 시 질문 없이 자동으로 기존 버전 덮어쓰기(업그레이드) 진행
    if WizardSilent() then
    begin
      Result := True;
      Exit;
    end;

    // [대화형 일반 설치]: 사용자에게 삭제 후 설치할지, 덮어쓰기(업그레이드)할지 선택지 제공
    Response := MsgBox(
      '기존 버전의 {#MyAppName} 프로그램이 시스템에 이미 설치되어 있습니다.' + #13#10 + #13#10 +
      '• [예 (Yes)] : 기존 버전을 완전히 삭제(제거)한 후 깨끗하게 새로 설치합니다.' + #13#10 +
      '• [아니오 (No)] : 기존 설치 폴더에 최신 파일로 덮어쓰기(업그레이드) 설치합니다.' + #13#10 +
      '• [취소 (Cancel)] : 설치 작업을 중단하고 마법사를 종료합니다.',
      mbConfirmation, MB_YESNOCANCEL
    );

    if Response = IDYES then
    begin
      // 사용자가 기존 버전 완전 삭제를 선택한 경우
      if ExistingUninstaller <> '' then
      begin
        ExistingUninstaller := RemoveQuotes(ExistingUninstaller);
        Exec(ExistingUninstaller, '/SILENT /NORESTART /SUPPRESSMSGBOXES', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      end;
      Result := True;
    end
    else if Response = IDNO then
    begin
      // 사용자가 덮어쓰기(업그레이드) 설치를 선택한 경우
      Result := True;
    end
    else
    begin
      // 취소 선택 시 설치 종료
      Result := False;
    end;
  end;
end;
