# Grid IP Scanner2 - Patch Note (v2.4.3)

---

## 🚀 [v2.4.3] - 2026-10-14

### 🌟 주요 기능 추가 및 개선 (Major Improvements)

1. **낯선 기기 감시(Intruder Watch) Pro 에디션 기능 전환 및 라이선스 게이팅**
   - **Pro 라이선스 게이트웨이 연동**:
     - 상단 툴바의 [낯선 기기 감시] 토글 버튼에 그라데이션 `PRO` 뱃지가 적용되었습니다.
     - Free(커뮤니티) 사용자가 클릭할 경우 "낯선 기기 실시간 감시(Intruder Watch) 기능은 PRO 에디션 이상에서 제공됩니다." 안내 메시지와 함께 Pro 라이선스 인증 창이 자동 호출됩니다.
   - **백그라운드 무인 60초 주기 감시 및 알림 Pro 전용화**:
     - `intruderDetection` 라이선스 플래그를 검증하여 유효한 Pro/Enterprise 라이선스 활성화 상태에서만 백그라운드 60초 주기 자동 재스캔 및 OS 네이티브 데스크톱 알림/경보 비프음이 작동하도록 완벽 통제했습니다.
   - **낯선 기기 상세 패널 내 Pro 업그레이드 안내**:
     - 수동 스캔 결과에서 신규 미등록 단말기가 탐지되었을 때, 낯선 기기 상세 카드 하단에 백그라운드 실시간 감시 및 데스크톱 알림 해금을 위한 PRO 업그레이드 퀵 링크를 제공합니다.
   - **라이선스 관리 센터(모달) 현황 매트릭스 동기화**:
     - 라이선스 관리 모달 내 기능 테이블에 `낯선 기기 감시 (Soft Trust 침입 탐지)` 항목을 신설하여 현재 라이선스 해금 상태를 투명하게 표기합니다.

2. **낯선 기기 감지 Pro 제한 기준 및 특화 추천 기능 명세 수립 (`DISTRIBUTION_AND_TIER_STRATEGY.md`)**
   - **Pro 제한 4대 핵심 영역 공식화**:
     - 1) 24/7 60초 주기 무인 백그라운드 감시 (Periodic Scanning)
     - 2) 청각적 오디오 비프 & OS 네이티브 데스크톱 팝업 알림 (Desktop Notification)
     - 3) 사설 MAC/DHCP IP 변경 단말 지능형 Soft Trust 유예 평가 엔진
     - 4) 정상 단말 전체 일괄 화이트리스트 영구 보존
   - **고부가 Pro 특화 신규 추천 기능 로드맵**:
     - 1) 침입 단말 네트워크 자동 격리 (Rogue Device Auto Quarantine via ARP/SNMP)
     - 2) 실시간 웹훅(Webhook) & 사내 메신저(Slack/Discord/Telegram) 침입 경보 발송
     - 3) 미인가 단말 고위험 포트(445, 3389, 23) 즉각 자동 취약점 진단 및 위험도 채점
     - 4) 낯선 기기 침입 시계열 타임라인 감사 로그(Intruder Audit History) 및 리포트 내보내기

3. **테스트용 자가 서명(Self-Signed Digital Signature) 유틸리티 추가 (`scripts/sign-binary.ps1`)**
   - 무서명(Unsigned) 바이너리 특성으로 인해 발생하는 백신(Windows Defender 등)의 실행 후 자동 격리/삭제 현상을 완화하기 위해, 테스트용 자가 서명 인증서를 자동으로 생성하고 실행 파일(`.exe`)에 디지털 서명을 적용하는 PowerShell 스크립트를 도입했습니다.
   - 인증서 생성 및 트러스트 루트 등록 후 `signtool.exe` 또는 PowerShell `Set-AuthenticodeSignature`로 빌드 결과물에 안전하게 서명할 수 있습니다.

4. **내보내기 및 리포트 UI/UX 개편 (가독성 향상 & 자동 스크롤 연동)**
   - **버튼 텍스트 폰트 크기 확대**:
     - 메인 트리거 버튼 글자 크기를 `text-[13px] font-black`으로 확대하고, 내부 항목 버튼 텍스트를 `text-xs font-bold`로 확대하여 한눈에 쉽게 읽을 수 있도록 개선했습니다.
   - **버튼 내부 부가 설명 텍스트 제거 및 툴팁 전환**:
     - 버튼 면적을 차지하던 미세 폰트의 부가 설명 텍스트를 제거하여 시각적 군더더기를 없애고, 상세 설명(포트 정보, 서브넷 전수 범위, OUI 분석 등)은 마우스 호버 툴팁(`title`)으로 풍부하게 제공하도록 최적화했습니다.
   - **원클릭 자동 하단 스크롤 연동**:
     - "내보내기 및 리포트" 버튼 클릭 시 펼쳐지는 모든 리포트 및 내보내기 옵션들이 잘림 없이 한눈에 들어오도록 사이드바 뷰포트를 부드럽게 하단으로 자동 스크롤시키는 인터랙션을 적용했습니다.

5. **내보내기 및 리포트 항목 클릭 시 메뉴 자동 닫힘 및 즉각 실행 로직 개선**
   - **원클릭 자동 메뉴 닫힘 (`handleExportItemClick`)**:
     - 리포트 및 내보내기 메뉴 항목(PDF 4종, 모달 마법사, Excel XLS, CSV 2종, HTML 그리드, 보안 감사 HTML, 네트워크 스냅샷) 클릭 시 펼쳐진 메뉴가 지체 없이 즉시 자동으로 닫히도록 개선했습니다.
   - **선택 항목 동작 즉각 실행 & 안전 가드 피드백**:
     - 기존 `disabled` 속성으로 인해 클릭 이벤트가 브라우저에 의해 차단되거나 메뉴가 닫히지 않던 문제를 제거하고, 클릭 즉시 액션이 실행되도록 핸들러를 일원화했습니다.
     - 데이터가 없는 상태에서 항목을 클릭하더라도 메뉴가 깔끔하게 닫히면서 "내보낼 데이터가 없습니다. 먼저 스캔을 실행하세요" 등의 친절한 안내 토스트가 즉시 안내됩니다.

6. **설치 프로그램(Installer) 패키징 고도화: 개별파일 설치, 기존 설치 질의, 무인 설치 및 방화벽 이중 등록**
   - **폴더 풀림(Unpacked Multi-File) 개별파일 정밀 설치**:
     - 불필요한 내부 개발 문서(`PATCH_NOTE.md`, `WorkLog.md`, `DISTRIBUTION_AND_TIER_STRATEGY.md`), 빌드 스크립트, 포터블 바이너리가 인스톨 폴더에 혼입되는 것을 원천 차단하고 실행 파일, OUI DB, 웹 에셋, `LICENSE.md`만 정갈하게 구성되도록 필터링을 강화했습니다.
   - **기존 설치 감지 및 삭제/덮어쓰기 선택 다이얼로그**:
     - 이전 버전이 설치된 PC에서 설치 프로그램 실행 시 기존 설치를 자동 감지하여, `[예 (Yes)] 기존 버전 완전 삭제 후 클린 설치`, `[아니오 (No)] 기존 폴더에 최신 파일 덮어쓰기(업그레이드)`, `[취소 (Cancel)] 설치 중단`을 사용자가 선택할 수 있도록 구현했습니다.
   - **무인 설치(Silent / Unattended) 옵션 완전 지원**:
     - 엔터프라이즈 환경 및 자동 배포를 위해 `/SILENT`, `/VERYSILENT`, `/SUPPRESSMSGBOXES`, `/S`, `/QN` 옵션 실행 시 질의창 없이 백그라운드에서 안전하게 자동 업그레이드되도록 지원합니다.
   - **[배포/설치 단계] 방화벽 규칙 사전 조용 등록 (기본 이름 + 버전 명시 이름 동시 등록)**:
     - 설치 단계에서 Windows 방화벽 인바운드/아웃바운드 허용 규칙을 콘솔 창 깜빡임 없이 사전에 조용히 등록합니다.
     - 규칙 이름으로 기본 이름(`Grid IP Scanner2`), 버전 정보가 붙은 이름(`Grid IP Scanner2 v2.4.3`), 범용 런처(`Grid_IP_Scanner2.exe`)를 모두 등록하여 스캔 시 방화벽 차단 문제를 원천 해소했습니다.


7. **인스톨 파일 및 Unpacked 배포에서 포터블 바이너리(`Grid IP Scanner2 v2.4.3.exe`) 제외 및 표준 바이너리 단일화**
   - **설치 대상 바이너리 단일화 (`Grid_IP_Scanner2.exe`)**:
     - 설치형 멀티 파일(Unpacked Multi-File) 환경 및 인스톨러(`Grid_IP_Scanner2_Setup.exe`) 패키징 대상에서 버전 번호가 붙은 포터블 실행 파일(`Grid IP Scanner2 v2.4.3.exe`)을 완전히 제외했습니다.
     - 설치 폴더(`Program Files\Grid IP Scanner2\`)에는 오직 표준 실행 파일인 `Grid_IP_Scanner2.exe` 단 하나만 깔끔하게 설치되도록 구조를 개편하여 용량 중복(약 30MB 낭비) 및 버전 혼선을 해결했습니다.
   - **포터블 파일의 독립 격리**:
     - 버전명이 명시된 바이너리(`Grid IP Scanner2 v2.4.3.exe`)는 무설치 단일 실행 전용 폴더(`dist_releases\v2.4.3\portable\`)에만 배치됩니다.
   - **구버전 잔존 파일 자동 정리 (`[InstallDelete]`)**:
     - 이전 버전 설치로 인해 대상 폴더에 남아있을 수 있는 `Grid IP Scanner2*.exe` 파일을 설치 과정에서 자동으로 탐지하여 깨끗하게 정리합니다.


8. **대한민국 안랩 V3 백신 오탐지(`Trojan/Win.Generic.C*`) 정밀 분석 및 대응 체계 구축**
   - **오진 증상 정밀 분석**:
     - AhnLab V3 실시간 감시에서 크롬 브라우저 다운로드 캐시(`Cache_Data\f_00085a`)를 `Trojan/Win.Generic.C5651299`로 탐지하는 원인은, ASD 클라우드 평판에 등록되지 않은 신규 바이너리가 고속 네트워크 소켓 스캔 동작을 수행할 때 발생하는 휴리스틱(Heuristic) 가진단임을 규명했습니다.
   - **컴파일러 최적화 및 빌드 튜닝**:
     - Go 빌드 시 `-trimpath` 플래그를 기본 적용하여 개발자 로컬 디렉터리 경로 노출을 차단하고 백신의 임시 폴더 패턴 오탐을 방지했습니다.
     - `winres.json`의 UAC Manifest를 표준 `requireAdministrator`로 보정하여 정상 실행 프로필을 완비했습니다.
   - **V3 오진 대응 가이드 및 UI 안내 제공**:
     - `docs/V3_FALSE_POSITIVE_GUIDE.md` 가이드를 신설하여 V3 환경설정 내 검사 예외 등록, 격리소 복원, 안랩 공식 화이트리스트 신고 절차를 상문화했습니다.
     - 웹 UI 내 [보안 및 안전 공지] 모달을 보강하여 안랩 V3 오진 안내 및 해결 가이드를 명시했습니다.


9. **모바일 버전(Android APK & PWA) GitHub 자동 배포 및 독립 리포지토리 생성 파이프라인 구축**
   - **GitHub Actions 릴리스 통합 (PC + Mobile 동시 배포)**:
     - `.github/workflows/build-and-release.yml`을 고도화하여, 메인 브랜치 푸시 또는 버전 태그 발행 시 Windows 인스톨러뿐만 아니라 **안드로이드 APK(`Grid_IP_Scanner2_v2.4.3.apk`)** 및 **모바일 PWA 패키지(`Grid_IP_Scanner2_v2.4.3_Mobile_PWA.zip`)**가 GitHub Releases에 함께 자동 업로드되도록 구성했습니다.
   - **모바일 전용 워크플로우(`.github/workflows/mobile-release.yml`) 신설**:
     - 모바일 태그(`mobile-v*`) 푸시 또는 Actions 탭에서의 수동 1-클릭 실행 시 모바일 패키지만 독립적으로 빌드 및 릴리스할 수 있는 전용 CI/CD를 탑재했습니다.
   - **독립 모바일 리포지토리 생성기(`scripts/export-mobile-repo.js`) 구현**:
     - 모바일 전용 독립 저장소(`AhBiYout-all/grid-ip-scanner2-mobile`)를 개설하고자 할 때, `dist_releases/mobile_repository/`로 모바일 전용 코드/에셋/설명서/푸시 스크립트를 원터치로 추출할 수 있도록 구현했습니다.
   - **모바일 GitHub 배포 배치 스크립트(`scripts/github-mobile-sync.bat`) 제공**:
     - 메인 리포지토리 모바일 릴리스 태그 발행 또는 독립 모바일 리포지토리 푸시를 대화형으로 선택하여 실행할 수 있는 유틸리티를 제공합니다.


10. **GitHub 클린 소스 전용 .gitignore 제외 규칙 전면 개편 및 로컬 푸시 스크립트 격리**
   - **.gitignore 제외 규칙 전면 개편**:
     - GitHub 원격 저장소에는 오직 **핵심 소스코드(`src/`, `App.tsx`, `main.go` 등), 공식 문서(`docs/`), 설정 파일(`package.json`, `tsconfig.json`), 빌드 스크립트(`build.bat`, `build-win.js`, `scripts/build-distribution.js`)**만 업로드되도록 제외 규칙을 체계적으로 정비했습니다.
   - **로컬 푸시 스크립트 원격 업로드 완전 차단**:
     - `github-push.bat`, `scripts/github-sync.bat`, `scripts/github-mobile-sync.bat` 등 로컬 푸시 유틸리티를 `.gitignore`에 명시하여 GitHub에 업로드되지 않도록 완벽히 격리했습니다.
   - **자동 캐시 정화 및 스테이징 안전망 탑재**:
     - `scripts/github-sync.bat` 실행 시 이전에 인덱스에 캐싱되었을 수 있는 빌드 산출물과 푸시 스크립트를 자동으로 인덱스에서 제거(`git rm -r --cached .`)한 후 순수 소스만 스테이징(`git add .`)하도록 개선했습니다.

---

## 🚀 [v2.4.2] - 2026-10-14

### 🌟 주요 기능 추가 및 개선 (Major Improvements)

1. **원격 부팅(Wake-on-LAN) Pro 에디션 기능 전환 및 라이선스 게이트웨이 탑재**
   - **Pro 라이선스 게이팅 (License Gate)**:
     - 커뮤니티(Free) 티어 사용자가 상세 패널의 [⚡ WoL 매직 패킷 전송]을 시도할 경우, 부팅 패킷 오발송을 방지하고 Pro 전용 기능 안내 토스트와 함께 라이선스 인증 모달이 즉시 연계됩니다.
     - WoL 카드 헤더에 `PRO 전용` 식별 뱃지가 부착되며, 클릭 시 정품 또는 30일 체험권 활성화 다이얼로그로 안내합니다.
   - **Pro / Enterprise 정품 인증 시 원터치 활성화**:
     - 정품 Pro 라이선스 또는 30일 체험권(`GRID-PRO-TRIAL-2026` / `DEMO-PRO`) 입력 시 즉시 `remoteBoot` 권한이 해금되며 `PRO 활성` 뱃지와 함께 대상 장비 MAC으로 UDP 9/7 매직 패킷 브로드캐스트가 정상 작동합니다.
   - **라이선스 관리 모달 내 기능 해금 현황 매트릭스 반영**:
     - 라이선스 관리 센터 내 기능 목록에 `원격 부팅 (Wake-on-LAN)` 항목이 신설되어 현재 활성화 여부를 직관적으로 확인할 수 있습니다.

2. **Pro 기능 제한 기준 확립 및 고부가 신규 Pro 기능 추천 로드맵 수립 (`docs/DISTRIBUTION_AND_TIER_STRATEGY.md`)**
   - **Pro 기능 제한 매트릭스 공식화**:
     - 원격 부팅(WoL), 심층 포트 정밀 보안 감사, 스냅샷 4색 Diff 비교 분석, A4 보안 감사 리포트, 다중 서브넷 확장(최대 5개/무제한), 24/7 침입자 경보 및 자산 별칭 영구 동기화를 Pro/Enterprise 전용 가치로 확정.
   - **신규 Pro 추천 기능 6선 수립**:
     - 1) 다중 단말 일괄 원격 제어(Batch WoL & Remote Shutdown/Restart)
     - 2) 스케줄링 무인 백그라운드 스캔 & 실시간 웹훅(Slack/Discord/Email) 알림
     - 3) ARP 스푸핑 및 게이트웨이 사칭 실시간 감지(Anti-ARP Spoofing Guard)
     - 4) L2/L3 스위치 포트 매핑 및 물리 토폴로지 시각화(SNMP Switch Port Mapper)
     - 5) DHCP 풀 고갈 예측 및 서브넷 사용률 분석기
     - 6) 자산 변동 이력 타임라인 및 컴플라이언스 감사 로그

---

## 🚀 [v2.4.1] - 2026-10-14

### 🌟 주요 기능 추가 및 개선 (Major Improvements)

1. **내보내기 및 리포트 드롭다운 메뉴 전면 개편 (Export & Audit Report Dropdown Popover)**
   - **UI 공간 최적화**: 기존 상단 툴바에 개별 배치되어 있던 CSV, JSON 내보내기 및 A4 보안 감사 리포트 버튼을 하나의 정돈된 **통합 드롭다운 팝오버 메뉴**로 통합 개편했습니다.
   - **직관적인 포맷 선택**: 드롭다운 클릭 시 CSV 스프레드시트, JSON 구조화 데이터, A4 규격 정밀 보안 감사 리포트의 아이콘 및 설명이 명확하게 노출되며 원클릭으로 즉시 실행됩니다.
   - **외부 클릭 자동 닫힘 & 테마 최적화**: 팝오버 외부 영역 클릭 시 자연스러운 닫힘 처리 및 다크/베이지 테마에 맞춤화된 반투명 블러 스타일을 적용했습니다.

2. **스냅샷 비교(Diff) 4색 명확한 색상 차이 및 대화형 분석 체계 구축 (Distinct 4-Color Snapshot Diff)**
   - **상태별 4대 색상 체계 확립**:
     - 🟢 **신규 접속 (`+NEW`)**: 네온 에메랄드 그린 배경 + 발광 링 효과 (`bg-emerald-500/25 border-emerald-400 text-emerald-400`)
     - 🔴 **이탈 / 오프라인 (`-OFF`)**: 고대비 로즈 레드 배경 + 대각선 해치 패턴 (`bg-rose-500/25 border-rose-500 text-rose-400`)
     - 🟠 **식별자 변동 (`!CHG`)**: 선명한 앰버 오렌지 테두리 + 경고 뱃지 (`bg-amber-500/25 border-amber-400 text-amber-400`)
     - 🔵 **기준점 유지 (`=SAME` / `=BASE`)**: 기존 회색에서 선명한 **하늘색(Sky Blue 🔵)**으로 기본 개편되어 정상 기준 노드가 비활성 회색 셀과 뚜렷이 구별됨 (상단 범례에서 보라/청록/회색 원클릭 전환 팔레트 지원)
   - **대화형 카테고리 필터 바 & 기준 색상 변경 팔레트**: 상단 Diff 패널에 `[+ 신규: N]`, `[- 이탈: N]`, `[! 변동: N]`, `[= 유지: N]` 원클릭 필터 버튼과 함께 `[기준 색상: 🔵 하늘색 | 🟣 보라 | 🟢 청록 | ⚪ 회색]` 선택기를 탑재하여 기준점 색상을 원하는 색상으로 즉시 전환할 수 있습니다.
   - **우측 상세 진단 비교 카드 & 오프라인 WoL 연동**:
     - 변동 노드 선택 시: 기준점과 현재의 MAC/호스트명 전후 2단 대조 표 제공.
     - 오프라인 노드 선택 시: 기준점 당시의 MAC/제조사 정보를 유지하여 즉각적인 **WoL (Wake-on-LAN) 원격 부팅** 신호 전송 지원.

3. **데모 Pro 라이선스 30일 체험 사용권 도입 (30-Day Pro Trial License System)**
   - **동적 30일 만료일 계산**: 데모 키(`GRID-PRO-TRIAL-2026`, `GRID-PRO-DEMO`, `PRO-DEMO` 등) 활성화 시 고정 날짜가 아닌 **활성화 시점부터 정확히 30일간 유효한 체험 사용권**(`expiresAt`)을 동적으로 발급합니다.
   - **UI 라이선스 상태 안내**: 모달 및 앱 내에서 `Registered Pro Trial User (30-Day Demo)` 명칭과 남은 만료 일시를 실시간 안내합니다.
   - **Pro 핵심 기능 30일간 전면 해금**: 스냅샷 비교(Diff) 무제한 분석, 25개 포트 심층 보안 감사, A4 고품질 감사 리포트, 최대 5개 서브넷 관리 권한을 30일 동안 제한 없이 사용할 수 있습니다.

---

## 🚀 [v2.4.0] - 2026-10-08

### 🌟 주요 기능 추가 및 개선 (Major Improvements)

1. **지능형 낯선 기기 감지 및 Soft Trust 유예 시스템 (Soft Trust Grace Period)**
   - **문제 해결**: 이전에 탐색되었던 친숙 기기가 IP 재할당(DHCP), MAC 주소 무작위화(Randomized/Private MAC), 또는 네트워크 재연결 시 낯선 기기로 오진되는 현상을 개선했습니다.
   - **Fingerprint 유사도 계산 엔진**: MAC 주소 OUI(제조사 코드), 호스트명(Hostname), mDNS 이름, 오픈 포트 프로필을 종합 분석하여 0~100% 식별 유사도를 산출합니다.
   - **Soft Trust 상태 도입**:
     - 이전 탐색 이력이 있거나 동일 제조사/호스트명을 가진 기기는 무조건적인 경고 대신 `Soft Trust (유예 중)` 상태로 분류됩니다.
     - 사용자 UI에 황색 보호 실드 아이콘과 유예 사유(예: "동일 제조사/호스트명 일치 기기") 및 유사도 점수가 투명하게 표시됩니다.
     - 사용자는 원클릭으로 정식 신뢰 기기로 승격하거나 즉시 차단 등록할 수 있습니다.

2. **Secure Vault C++/Go 네이티브 DLL 암호화 모듈 구현**
   - **고성능 AES-256-GCM 엔진**: 기기 별칭(Alias) 및 네트워크 스냅샷 파일의 보안 강화를 위해 C++ 및 Go 기반 Native DLL 모듈(`SecureVault.dll`)을 통합했습니다.
   - **FFI C-Style 내보내기 인터페이스**: Electron Main 프로세스 및 백엔드 서비스에서 `encryptData`, `decryptData`를 유연하게 호출할 수 있는 표준 C ABI FFI 인터페이스를 구축했습니다.
   - **인증 디코딩 검증**: GCM(Galois/Counter Mode) 인증 태그를 통해 데이터 위변조를 100% 감지하고 안전하게 복호화합니다.

3. **단일 진실 원천(SSOT) 파이프라인 자동 동기화**
   - 버전 파이프라인 `scripts/sync-version.js`를 강화하여 `package.json`, `winres.json`, `Grid_IP_Scanner2_Setup.iss`, `App.tsx`, `updateChecker.ts`, `docs/PATCH_NOTE.md`, `docs/README.md`, `docs/WorkLog.md` 등 총 8개 대상을 한 번의 명령어로 자동 동기화합니다.

4. **Edge-to-Edge 다중 해상도 ICO 자동 생성기 통합**
   - transparent 여백 자르기(Trim) 및 256, 128, 64, 48, 32, 16 픽셀 다중 레이어 ICO 윈도우 리소스 자동 생성기(`generate-assets.js`)를 빌드 파이프라인에 통합했습니다.

---

## 🛠️ [v2.3.2] - 2026-10-05

### 🔧 버그 수정 및 안정화
- Windows 환경에서 Go 백엔드 컴파일 시 `syscall.ByteSliceToString` 및 `net` 패키지 참조 모듈을 `utils_windows.go`에서 교체하여 크로스 컴파일 안정성 확보.
- 포터블 실행 파일 실행 시 지정 포트(기본 3031) 자동 바인딩 및 웹 서버 정상 구동 확인.

---

## 📜 [v2.3.0] - 2026-09-28

### ✨ 기능 추가
- IP/MAC 충돌 실시간 탐지 알고리즘 적용.
- 네이티브 OUI 검증 모듈(`OuiValidator.dll`) 추가.
- 다크/베이지/그레이 멀티 테마 가독성 자동 보정 적용.
