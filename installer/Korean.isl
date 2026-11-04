; *** Inno Setup 6 Standard Korean Messages File ***
; Translated by Inno Setup Korean Community & Enterprise Team
; Encoding: UTF-8 with BOM or UTF-8

[LangOptions]
LanguageName=한국어
LanguageID=$0412
LanguageCodePage=949
DialogFontName=맑은 고딕
DialogFontSize=9
WelcomeFontName=맑은 고딕
WelcomeFontSize=12
TitleFontName=맑은 고딕
TitleFontSize=29
CopyrightFontName=맑은 고딕
CopyrightFontSize=9

[Messages]
; *** Application titles
SetupAppTitle=설치
SetupWindowTitle=%1 설치
UninstallAppTitle=제거
UninstallAppFullTitle=%1 제거

; *** Misc. common
InformationTitle=안내
ConfirmTitle=확인
ErrorTitle=오류

; *** SetupLdr messages
SetupLdrStartupMessage=%1을(를) 설치하시겠습니까?
LdrCannotCreateTemp=임시 파일을 생성할 수 없습니다. 설치를 중단합니다.
LdrCannotExecTemp=임시 폴더의 파일을 실행할 수 없습니다. 설치를 중단합니다.

; *** Startup error messages
LastErrorMessage=%1.%n%n오류 %2: %3
SetupFileMissing=설치 디렉터리에서 %1 파일을 찾을 수 없습니다. 문제를 해결하거나 프로그램을 다시 구하십시오.
SetupFileCorrupt=설치 파일이 손상되었습니다. 프로그램을 다시 구하십시오.
SetupFileCorruptOrWrongVer=설치 파일이 손상되었거나 이 설치 프로그램 버전과 호환되지 않습니다. 문제를 해결하거나 프로그램을 다시 구하십시오.
InvalidParameter=명령줄 매개변수가 잘못되었습니다:%n%n%1
SetupAlreadyRunning=설치 프로그램이 이미 실행 중입니다.
WindowsVersionNotSupported=이 프로그램은 현재 컴퓨터에서 실행 중인 Windows 버전을 지원하지 않습니다.
WindowsServicePackRequired=이 프로그램에는 %1 서비스 팩 %2 이상이 필요합니다.
NotOnThisPlatform=이 프로그램은 %1에서 실행할 수 없습니다.
OnlyOnThisPlatform=이 프로그램은 %1에서만 실행할 수 있습니다.
OnlyOnCodepage=이 프로그램은 코드 페이지 %1에서만 실행할 수 있습니다.
WinVersionTooLowError=이 프로그램에는 %1 버전 %2 이상이 필요합니다.
WinVersionTooHighError=이 프로그램은 %1 버전 %2 이상에 설치할 수 없습니다.
AdminPrivilegesRequired=이 프로그램을 설치하려면 관리자로 로그온해야 합니다.
PowerUserAdminPrivilegesRequired=이 프로그램을 설치하려면 관리자 또는 고급 사용자 그룹의 구성원으로 로그온해야 합니다.
SetupAppRunningError=설치 프로그램이 %1이(가) 현재 실행 중임을 감지했습니다.%n%n실행 중인 모든 인스턴스를 닫은 후 [확인]을 클릭하여 계속하거나, [취소]를 클릭하여 종료하십시오.
UninstallAppRunningError=제거 프로그램이 %1이(가) 현재 실행 중임을 감지했습니다.%n%n실행 중인 모든 인스턴스를 닫은 후 [확인]을 클릭하여 계속하거나, [취소]를 클릭하여 종료하십시오.

; *** Startup questions
PrivilegesRequiredOverrideTitle=설치 모드 선택
PrivilegesRequiredOverrideInstruction=설치 모드를 선택하십시오.
PrivilegesRequiredOverrideText1=%1을(를) 모든 사용자용으로 설치합니다 (관리자 권한 필요).
PrivilegesRequiredOverrideText2=%1을(를) 현재 사용자 전용으로 설치합니다.

; *** Miscellaneous directions
ExitSetupTitle=설치 종료
ExitSetupMessage=설치가 완료되지 않았습니다. 지금 설치를 종료하면 프로그램이 설치되지 않습니다.%n%n나중에 다시 설치 프로그램을 실행하여 완료할 수 있습니다.%n%n설치를 종료하시겠습니까?
AboutSetupMenuItem=설치 정보(&A)...
AboutSetupTitle=설치 정보
AboutSetupMessage=%1 버전 %2%n%3%n%n%1 웹사이트:%n%4
AboutSetupNote=
TranslatorNote=

; *** Buttons
ButtonBack=< 뒤로(&B)
ButtonNext=다음(&N) >
ButtonInstall=설치(&I)
ButtonOK=확인
ButtonCancel=취소
ButtonYes=예(&Y)
ButtonYesToAll=모두 예(&A)
ButtonNo=아니요(&N)
ButtonNoToAll=모두 아니요(&O)
ButtonFinish=완료(&F)
ButtonBrowse=찾아보기(&B)...
ButtonWizardBrowse=찾아보기(&R)...
ButtonNewFolder=새 폴더 만들기(&M)

; *** "Select Language" dialog messages
SelectLanguageTitle=설치 언어 선택
SelectLanguageLabel=설치 중에 사용할 언어를 선택하십시오:

; *** Common Wizard text
ClickNext=계속하려면 [다음]을 클릭하고, 설치를 종료하려면 [취소]를 클릭하십시오.
BeveledLabel=
BrowseDialogTitle=폴더 찾아보기
BrowseDialogLabel=아래 목록에서 폴더를 선택한 다음 [확인]을 클릭하십시오.
NewFolderName=새 폴더

; *** "Welcome" wizard page
WelcomeLabel1=[name] 설치 마법사에 오신 것을 환영합니다
WelcomeLabel2=컴퓨터에 [name]을(를) 설치합니다.%n%n계속하기 전에 다른 모든 응용 프로그램을 종료하는 것이 좋습니다.

; *** "Password" wizard page
WizardPassword=암호
PasswordLabel1=이 설치는 암호로 보호되어 있습니다.
PasswordLabel3=암호를 입력한 다음 [다음]을 클릭하여 계속하십시오. 암호는 대소문자를 구분합니다.
PasswordEditLabel=암호(&P):
IncorrectPassword=입력한 암호가 올바르지 않습니다. 다시 시도하십시오.

; *** "License Agreement" wizard page
WizardLicense=사용권 계약
LicenseLabel=계속하기 전에 다음의 중요한 정보를 읽으십시오.
LicenseLabel3=다음 사용권 계약을 읽으십시오. 설치를 계속하려면 이 계약 조건에 동의해야 합니다.
LicenseAccepted=동의합니다(&A)
LicenseNotAccepted=동의하지 않습니다(&D)

; *** "Information" wizard pages
WizardInfoBefore=안내
InfoBeforeLabel=계속하기 전에 다음의 중요한 정보를 읽으십시오.
InfoBeforeClickLabel=설치를 계속할 준비가 되면 [다음]을 클릭하십시오.
WizardInfoAfter=안내
InfoAfterLabel=계속하기 전에 다음의 중요한 정보를 읽으십시오.
InfoAfterClickLabel=설치를 계속할 준비가 되면 [다음]을 클릭하십시오.

; *** "User Information" wizard page
WizardUserInfo=사용자 정보
UserInfoDesc=사용자 정보를 입력하십시오.
UserInfoName=사용자 이름(&U):
UserInfoOrg=회사 이름(&O):
UserInfoSerial=일련 번호(&S):
UserInfoNameRequired=이름을 입력해야 합니다.

; *** "Select Destination Location" wizard page
WizardSelectDir=설치 위치 선택
SelectDirDesc=[name]을(를) 어디에 설치하시겠습니까?
SelectDirLabel3=설치 프로그램이 [name]을(를) 다음 폴더에 설치합니다.
SelectDirBrowseLabel=계속하려면 [다음]을 클릭하십시오. 다른 폴더를 선택하려면 [찾아보기]를 클릭하십시오.
DiskSpaceGBLabel=최소 [gb] GB의 디스크 여유 공간이 필요합니다.
DiskSpaceMBLabel=최소 [mb] MB의 디스크 여유 공간이 필요합니다.
CannotInstallToAdministrativeInstallDirectory=관리 설치 디렉터리에는 설치할 수 없습니다.
YouMustEnterPath=경로를 입력해야 합니다.
PathTooLong=경로가 너무 깁니다.
InvalidPath=경로가 올바르지 않습니다.
InvalidDrive=선택한 드라이브 또는 UNC 공유가 존재하지 않거나 액세스할 수 없습니다. 다른 위치를 선택하십시오.
DiskSpaceWarningTitle=디스크 공간 부족
DiskSpaceWarning=설치하려면 최소 %1 KB의 사용 가능한 공간이 필요하지만 선택한 드라이브에는 %2 KB만 사용할 수 있습니다.%n%n그래도 계속하시겠습니까?
DirNameTooLong=폴더 이름 또는 경로가 너무 깁니다.
InvalidDirName=폴더 이름이 잘못되었습니다.
BadName="%1" 문자를 포함할 수 없습니다.
GetExceptionFatal=예외가 발생하여 설치를 계속할 수 없습니다:%n%n%1

; *** "Select Components" wizard page
WizardSelectComponents=구성 요소 선택
SelectComponentsDesc=어떤 구성 요소를 설치하시겠습니까?
SelectComponentsLabel2=설치할 구성 요소를 선택하고, 설치하지 않을 구성 요소는 선택을 취소하십시오. 준비가 되면 [다음]을 클릭하십시오.
FullInstallation=전체 설치
CompactInstallation=최소 설치
CustomInstallation=사용자 정의 설치
NoUninstallWarningTitle=구성 요소 존재
NoUninstallWarning=설치 프로그램이 다음 구성 요소가 컴퓨터에 이미 설치되어 있음을 감지했습니다:%n%n%1%n%n이 구성 요소를 선택 취소해도 제거되지 않습니다.%n%n그래도 계속하시겠습니까?
ComponentSize1=%1 KB
ComponentSize2=%1 MB
ComponentsDiskSpaceGBLabel=현재 선택 항목에는 최소 [gb] GB의 디스크 여유 공간이 필요합니다.
ComponentsDiskSpaceMBLabel=현재 선택 항목에는 최소 [mb] MB의 디스크 여유 공간이 필요합니다.

; *** "Select Additional Tasks" wizard page
WizardSelectTasks=추가 작업 선택
SelectTasksDesc=어떤 추가 작업을 수행하시겠습니까?
SelectTasksLabel2=[name]을(를) 설치하는 동안 수행할 추가 작업을 선택한 다음 [다음]을 클릭하십시오.

; *** "Select Start Menu Folder" wizard page
WizardSelectProgramGroup=시작 메뉴 폴더 선택
SelectProgramGroupDesc=프로그램의 바로 가기를 어디에 만드시겠습니까?
SelectProgramGroupLabel3=설치 프로그램이 다음 시작 메뉴 폴더에 프로그램 바로 가기를 만듭니다.
SelectProgramGroupBrowseLabel=계속하려면 [다음]을 클릭하십시오. 다른 폴더를 선택하려면 [찾아보기]를 클릭하십시오.
NoIconsCheck=바로 가기를 만들지 않음(&D)

; *** "Ready to Install" wizard page
WizardReady=설치 준비 완료
ReadyLabel1=컴퓨터에 [name]을(를) 설치할 준비가 완료되었습니다.
ReadyLabel2a=설치를 계속하려면 [설치]를 클릭하고, 설정을 검토하거나 변경하려면 [뒤로]를 클릭하십시오.
ReadyLabel2b=설치를 계속하려면 [설치]를 클릭하십시오.
ReadyMemoUserInfo=사용자 정보:
ReadyMemoDir=설치 위치:
ReadyMemoType=설치 유형:
ReadyMemoComponents=선택한 구성 요소:
ReadyMemoGroup=시작 메뉴 폴더:
ReadyMemoTasks=추가 작업:

; *** "Preparing to Install" wizard page
WizardPreparing=설치 준비 중
PreparingDesc=컴퓨터에 [name]을(를) 설치할 준비를 하고 있습니다.
PreviousInstallNotCompleted=이전 프로그램의 설치/제거가 완료되지 않았습니다. 설치를 완료하려면 컴퓨터를 다시 시작해야 합니다.%n%n컴퓨터를 다시 시작한 후 설치 프로그램을 다시 실행하여 [name] 설치를 완료하십시오.
CannotContinue=설치를 계속할 수 없습니다. 종료하려면 [취소]를 클릭하십시오.
ApplicationsFound=설치 프로그램이 업데이트해야 하는 파일을 다음 응용 프로그램이 사용 중입니다. 설치 프로그램이 이 응용 프로그램을 자동으로 닫도록 허용하는 것이 좋습니다.
ApplicationsFound2=설치 프로그램이 업데이트해야 하는 파일을 다음 응용 프로그램이 사용 중입니다. 설치 프로그램이 이 응용 프로그램을 자동으로 닫도록 허용하는 것이 좋습니다. 설치가 완료된 후 응용 프로그램을 다시 시작합니다.
CloseApplications=응용 프로그램을 자동으로 닫기(&A)
DontCloseApplications=응용 프로그램을 닫지 않음(&D)
ErrorCloseApplications=설치 프로그램이 일부 응용 프로그램을 자동으로 닫을 수 없습니다. 계속하기 전에 업데이트해야 하는 파일을 사용하는 모든 응용 프로그램을 닫는 것이 좋습니다.

; *** "Installing" wizard page
WizardInstalling=설치 중
InstallingLabel=컴퓨터에 [name]을(를) 설치하는 동안 잠시 기다려 주십시오.

; *** "Setup Completed" wizard page
FinishedHeadingLabel=[name] 설치 마법사 완료
FinishedLabelNoIcons=컴퓨터에 [name]이(가) 설치되었습니다.
FinishedLabel=컴퓨터에 [name]이(가) 설치되었습니다. 설치된 바로 가기를 선택하여 응용 프로그램을 실행할 수 있습니다.
ClickFinish=[설치]를 종료하려면 [완료]를 클릭하십시오.
FinishedRestartLabel=[name] 설치를 완료하려면 컴퓨터를 다시 시작해야 합니다. 지금 다시 시작하시겠습니까?
FinishedRestartMessage=[name] 설치를 완료하려면 컴퓨터를 다시 시작해야 합니다.%n%n지금 다시 시작하시겠습니까?
ShowReadmeCheck=예, 추가 정보 파일을 봅니다.
YesRadio=예, 지금 컴퓨터를 다시 시작합니다(&Y)
NoRadio=아니요, 나중에 컴퓨터를 다시 시작합니다(&N)
RunEntryExec=%1 실행
RunEntryShellExec=%1 보기

; *** "Uninstall Status" wizard page
ConfirmUninstall=%1 및 모든 구성 요소를 완전히 제거하시겠습니까?
UninstallingLabel=%1을(를) 제거하는 동안 잠시 기다려 주십시오.
UninstalledAll=%1이(가) 컴퓨터에서 성공적으로 제거되었습니다.
UninstalledMost=%1 제거가 완료되었습니다.%n%n일부 항목을 제거할 수 없습니다. 이 항목은 수동으로 제거할 수 있습니다.
UninstalledAndNeedsRestart=%1 제거를 완료하려면 컴퓨터를 다시 시작해야 합니다.%n%n지금 다시 시작하시겠습니까?
UninstallDataQuestion=저장된 데이터 파일도 함께 삭제하시겠습니까?

