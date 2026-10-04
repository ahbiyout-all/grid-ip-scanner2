; =====================================================================
; Grid IP Scanner2 - Inno Setup 6 Official Installer Script
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

; Version Information Stored in Setup.exe
VersionInfoVersion={#MyAppVersion}.0
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription={#MyAppName} Official Installer
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
; Main Single Executable and Core Data Files
Source: "..\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\icon.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\master_oui.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\docs\LICENSE.md"; DestDir: "{app}\docs"; Flags: ignoreversion
Source: "..\docs\GRID_IP_SCANNER_2.md"; DestDir: "{app}\docs"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\icon.ico"
Name: "{group}\홈페이지 방문 ({#MyAppPublisher})"; Filename: "{#MyAppURL}"
Name: "{group}\언인스톨 {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon

[Registry]
; Enterprise Software Asset Management Compliance
Root: HKLM; Subkey: "Software\{#MyAppName}"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\{#MyAppName}"; ValueType: string; ValueName: "Version"; ValueData: "{#MyAppVersion}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\{#MyAppName}"; ValueType: string; ValueName: "Publisher"; ValueData: "{#MyAppPublisher}"; Flags: uninsdeletekey

; Auto-start on Windows Boot (if task checked)
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "{#MyAppName}"; ValueData: """{app}\{#MyAppExeName}"" --tray"; Flags: uninsdeletevalue; Tasks: autostart

[Run]
; Automatically register Windows Firewall inbound exception for high-speed ICMP & Port Scan
Filename: "netsh.exe"; Parameters: "advfirewall firewall add rule name=""{#MyAppName}"" dir=in action=allow program=""{app}\{#MyAppExeName}"" enable=yes"; Flags: runhidden

; Launch Application after Setup Completion
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Remove Windows Firewall exception rule upon uninstallation
Filename: "netsh.exe"; Parameters: "advfirewall firewall delete rule name=""{#MyAppName}"" program=""{app}\{#MyAppExeName}"""; Flags: runhidden
