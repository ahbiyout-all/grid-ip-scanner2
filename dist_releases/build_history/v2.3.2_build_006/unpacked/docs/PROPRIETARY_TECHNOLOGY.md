# Grid IP Scanner2 독자 개발 기술 및 고유 엔진 설명서 (Proprietary Technology & Core Engines)

본 문서는 **Grid IP Scanner2 (v2.3.2)** 개발 과정에서 독자적으로 설계 및 구축된 핵심 독점 기술, 고유 알고리즘, 백엔드 스타트업 동기화 파이프라인, 5단계 적응형 런처, Zero-Browser 네이티브 긴급 스캔 엔진, IEEE 봇 차단 우회 이중 미러링 OUI 동기화 엔진, 스냅샷 Diff 비교 엔진, 심층 포트 감사 및 A4 리포트 생성기, 비대칭 암호키 오프라인 라이선싱, 어댑터 전수 탐색 및 다차원 필터, 스마트 엣지-투-엣지 아이콘 및 PE 리소스 직접 패칭 엔진, 실시간 자동 업데이트 센터에 대한 상세한 설계 명세와 법적 기술 자산 고지를 담고 있습니다. 본 고유 기술들은 타 오픈소스와 차별화되는 핵심 상용화 자산입니다.

---

## 🚀 1. 고성능 병렬 네트워크 탐색 엔진 (High-Performance Go Scanning Engine)
* **파일 위치**: `main.go`, `engine.go`, `utils_windows.go`, `utils_other.go`
* **기술 설명**: Go 언어로 구현된 초고속 병렬 탐색 엔진입니다. 수백 개의 고루틴(Goroutine)과 조율된 고유 **워커 풀(Worker Pool) 모델**을 작동시킵니다.
* **주요 핵심 기술**:
  - **멀티 프로토콜 하이브리드 탐색**: ICMP Ping, ARP 탐색, NetBIOS(UDP 137), mDNS(UDP 5353), UPnP, SNMP, 주요 HTTP/HTTPS/WSD 포트 스캔을 동시 병렬 수행합니다.
  - **UAC 권한 고도화 연동 커널 소켓**: 관리자 권한 승인 시, Windows NDIS 드라이버 및 이더넷 계층 커널 소켓에 직접 접근하여 로컬 캐시를 거치지 않고 실시간 ARP 프레임을 송수신해 정확한 MAC 주소와 이웃 테이블을 고속 추출합니다.
  - **초경량 하드웨어 제조사(OUI) 파서**: `/master_oui.txt` 파일의 90,000건 이상 대용량 제조사 식별 레코드와 Wireshark 다중 비트 마스크(/28 MA-M, /36 MA-S, 24비트 MA-L)를 메모리에 계층적 해시 구조로 적재하여, 1ms 미만의 시간에 MAC 주소를 매핑하고 제조사명을 정밀 추적합니다.

---

## 🧭 2. 5단계 스마트 적응형 런처 파이프라인 (Adaptive 5-Tier Launcher Pipeline)
* **파일 위치**: `utils_windows.go`, `utils_other.go`, `main.go`
* **기술 설명**: 구형 OS(Win 7/8.1) 및 WebView2/Edge 미설치 환경에서도 화면이 뜨지 않는 현상을 100% 방지하는 지능형 환경 진단 및 다단계 런처 파이프라인입니다.
* **주요 핵심 기술**:
  - **1단계 Edge App Mode**: `msedge --app=http://localhost:3031` (독립 샌드박스 프로필 창)
  - **2단계 Chrome App Mode**: `chrome --app=http://localhost:3031` (구형 Win7/8.1 Chrome 109 완벽 호환)
  - **3단계 Whale/Brave App Mode**: `whale --app=...` / `brave --app=...`
  - **4단계 Universal Default Browser**: `cmd /c start http://localhost:3031` 및 `rundll32 url.dll,FileProtocolHandler`
  - **5단계 Pure Win32 Native MessageBox (`user32.dll`)**: 시스템 브라우저가 완전히 차단된 경우 운영체제 고유 API를 직접 호출하여 최상단 안내 및 비상 스캔 모드로 자동 전환.

---

## 🛡️ 3. Zero-Browser Windows 네이티브 비상 스캔 & 메모장 보고서 엔진 (Emergency Scan Engine)
* **파일 위치**: `main.go` (`runEmergencyScanAndReport`), `utils_windows.go`
* **기술 설명**: 웹 브라우저가 아예 없거나 보안 정책으로 브라우저 실행이 차단된 폐쇄망 특수 환경에서도 단독으로 네트워크 탐색을 완수하고 텍스트 리포트를 생성하는 네이티브 엔진입니다.
* **주요 핵심 기술**:
  - **64 워커 풀 초고속 백그라운드 스캔**: 1~254개 IP를 1~2초 내에 탐색하고 MAC, 호스트명, 제조사를 자동 분석.
  - **구조화된 텍스트 보고서 자동 생성**: 바탕화면에 `Grid_IP_Scan_Result.txt`를 생성하고 `notepad.exe`를 즉시 연동.
  - **하트비트 워치독 연동 면제 (`emergencyMode`)**: 비상 대화상자 및 스캔 진행 중 타임아웃 종료를 방지하여 영속적인 작업 완수 보장.

---

## ⚡ 4. Express-Go 백엔드 스타트업 동기화 및 SSE 스트리밍 (Express-Go Backend Synchronization & SSE)
* **파일 위치**: `server.ts` (Dev & Proxy Server), `main.go` (Backend), `App.tsx` (Frontend)
* **기술 설명**: 백엔드 포트 바인딩 이전 요청으로 인한 `ECONNREFUSED` 503 프록시 초기 연결 장애를 해결하는 스타트업 동기화 기법 및 실시간 데이터 스트리밍 브리지입니다.
* **주요 핵심 기술**:
  - **비동기 헬스 체크 대기 로직 (`waitForGoBackend`)**: Express 프록시 가동 시 Go 백엔드가 바인딩되어 `/api/info` 응답을 줄 때까지 비동기 헬스 체크를 수행함으로써 초기 프록시 503 접속 거부 오류를 완전 소멸시켰습니다.
  - **Server-Sent Events (SSE) 단방향 스트리밍**: 웹소켓 대비 오버헤드가 극히 적은 SSE 프로토콜로 스캔 응답을 실시간 전송합니다.
  - **렌더링 배칭 버퍼 필터(Batching Buffer)**: 프론트엔드 내에 **250ms 시간 지연 수집 및 일괄 업데이트(State Batching) 파이프라인**을 구현하여 UI 쓰레드 락을 예방합니다.

---

## 🎨 5. 16x16 동적 그리드 맵 상태 제어 파이프라인 (16x16 Grid-Map State Engine)
* **파일 위치**: `App.tsx`, `/components/IPCell.tsx`
* **기술 설명**: `/24` 서브넷 대역의 254개 전체 호스트 주소를 16행 16열 격자판에 고해상도로 정렬 매핑 및 제어하는 UI 상태 엔진입니다.
* **주요 핵심 기술**:
  - **공간 효율화 레이아웃 변환**: IP 주소의 옥텟 값을 좌표 매핑하여 노드 상태를 시각 표현합니다.
  - **어댑터 영속 고정 제어(Selected Interface Retention)**: `selectedInterfaceIpRef` 상태 래퍼를 통해 폴링 동기화 시 수동 지정한 어댑터가 초기화되지 않도록 영속 유지합니다.

---

## 📊 6. 엑셀 2행 분할 정비 레이아웃 변환기 (Excel 2-Row Layout Exporter)
* **파일 위치**: `App.tsx`
* **기술 설명**: 그리드 맵 레이아웃을 엑셀(.xls) 문서 내에 1:1 바둑판 비율로 전사해 주는 독자적인 리포팅 라이브러리입니다.
* **주요 핵심 기술**:
  - **2행 상하 대조 그리드 셀 정렬**: 한 그리드 블록을 상하 2개의 독립 행으로 설계하여 IP와 호스트명을 구분 표시하고 90px x 45px 바둑판 비율을 유지합니다.

---

## 📦 7. 윈도우 바이너리 리소스 오케스트레이터 및 영문 오토 빌더 (`build.bat` & `build-win.js`)
* **파일 위치**: `build.bat`, `build-win.js`, `generate-assets.js`, `winres.json`
* **기술 설명**: 포터블 버전화 바이너리를 제작해 내는 자동화 빌드 오케스트레이션 시스템입니다.
* **주요 핵심 기술**:
  - **패치노트 버전 연동 컴파일**: `docs/PATCH_NOTE.md` 및 `package.json`의 버전 메타데이터를 정규식으로 자동 수집하여 동적 바이너리로 빌드합니다.
  - **영문 자동 배치 스크립트 (`build.bat`)**: 모든 빌드 절차를 영문 콘솔 인터페이스 및 단일 명령어로 스무스하게 처리합니다.
  - **중립 로케일 매니페스트(Neutral Locale Manifest)**: Side-by-Side 실행 구성 파일 에러를 차단하기 위해 Neutral `0000` 표준 매니페스트를 병합 적용합니다.

---

## 🔒 8. 독자적인 자가 소켓 포트 회수 및 관리자 재구동 엔진 (Safe Relaunch Engine)
* **파일 위치**: `main.go` (`/api/relaunch-admin` API 엔드포인트), `App.tsx`
* **기술 설명**: UAC 권한 상승 시 소켓 충돌 및 이전 브라우저 애플리케이션 창을 안전하게 정리/종료하는 고유 제어 엔진입니다.
* **주요 핵심 기술**:
  - **선제적 응답 플러시(Flush Delivery Guarantee)**: 클라이언트 응답 버퍼를 먼저 Flush 송신하여 UI 연결 끊김 없이 성공 연출을 수행합니다.
  - **프로필 기반 웹 애플리케이션 창 선택적 종료**: 이더넷 스캐너 전용 프로필 창(`msedge.exe ... CisnetGridScan`)만 선별 종료하여 사용자의 일반 웹 브라우저 탭을 안전히 보호합니다.

---

## 🌐 9. IEEE 봇 차단 우회 및 이중 미러링 OUI 실시간 동기화 엔진 (Tiered Fallback OUI Engine)
* **파일 위치**: `main.go` (`/api/oui/auto-update`, `parseOUIData`), `App.tsx`, `docs/OUI_DATABASE_SPEC.md`
* **기술 설명**: IEEE 레지스트리의 스크래퍼 차단 정책을 표준 브라우저 User-Agent 헤더로 우회하고, Wireshark Automated Manuf 미러와 교차 동기화하여 안정성을 극대화한 실시간 하드웨어 제조사 갱신 엔진입니다.
* **주요 핵심 기술**:
  - **User-Agent 헤더 스푸핑**: IEEE 서버의 기본 Go 클라이언트 거부(HTTP 418)를 회피하기 위해 정밀 브라우저 헤더를 주입.
  - **계층적 미러 교차 수집(Tiered Fallback)**: Wireshark 58,000건 및 IEEE MA-L/M/S 4대 소스를 순차 병합하여 누락 없는 완전체 레코드 구축.
  - **로컬 영구 캐시 및 무결성 자가 복구(Self-Healing)**: `%USERPROFILE%\.cisnet_grid\master_oui.txt`에 실시간 캐시를 저장하며, 비정상 수신 시 9만 건 내장 OUI DB로 자동 롤백.

---

## 📸 10. 스냅샷 비교(Diff) 엔진 및 실시간 변동 시각화 (Snapshot Diff Engine)
* **파일 위치**: `services/diffEngine.ts`, `components/IPCell.tsx`, `App.tsx`
* **기술 설명**: 네트워크 내 호스트 장비의 동적 변화(신규 접속, 이탈, 변조)를 기준 스냅샷과 실시간으로 비교하여 직관적으로 감지 및 시각화하는 고유 엔진입니다.
* **주요 핵심 기술**:
  - **로컬 스냅샷 타임라인 저장**: 브라우저 `localStorage`를 활용하여 서브넷별 과거 스캔 결과를 안전하게 직렬화 보관.
  - **4상태 델타(Delta) 연산 알고리즘**: 이전 스캔 대비 `신규 등장(+NEW)`, `오프라인 전환(-OFF)`, `IP 충돌/MAC 변경(!CHG)`, `변화없음(UNCHANGED)`을 16x16 그리드 상에 동적 뱃지로 렌더링.
  - **서브넷 요약 진단 바**: 상단에 총 장치 수 증감 및 신규/오프라인 장비의 실시간 카운트를 집계하여 보안 침해 노드를 즉각 식별.

---

## 🔍 11. 심층 포트 정밀 보안 감사 및 A4 리포트 생성기 (Deep Port Audit & A4 Report Generator)
* **파일 위치**: `services/portScanner.ts`, `services/reportGenerator.ts`, `main.go`
* **기술 설명**: 25개 주요 서비스 포트를 고속 병렬 스캔하여 네트워크 취약점을 진단하고, 기업 제출용 표준 A4 인쇄 규격의 감사 보고서를 자동 조립하는 기술입니다.
* **주요 핵심 기술**:
  - **25대 주요 포트 비동기 프로빙**: FTP(21), SSH(22), Telnet(23), SMTP(25), DNS(53), HTTP(80), SMB(445), MSSQL(1433), MySQL(3306), RDP(3389), PostgreSQL(5432), Redis(6379) 등 주요 포트를 마이크로초 단위로 점검.
  - **위험도(Risk Level) 자동 판정**: 개방된 포트별로 HIGH(Telnet, SMB, Redis), MEDIUM(FTP, RDP, DB), SAFE(HTTP, HTTPS) 등급을 자동 판정.
  - **A4 규격 무손실 리포트 렌더러**: 서브넷 통계, 제조사 점유율 파이 차트/테이블, 보안 취약점 요약, 전체 인벤토리를 A4 용지 1~2장에 맞춤형 인쇄/PDF 저장할 수 있는 순수 HTML/CSS 구조체 생성.

---

## 🔑 12. 비대칭 암호키 오프라인 라이선스 및 기능 플래그 매니저 (Ed25519 Offline Licensing)
* **파일 위치**: `services/licenseManager.ts`, `types.ts`
* **기술 설명**: 인터넷 연결이 차단된 폐쇄망에서도 안전하게 유료 라이선스를 인증하고 기능을 단계별로 해금하는 암호학적 기능 제어 엔진입니다.
* **주요 핵심 기술**:
  - **비대칭 암호학 서명 검증**: 공개키 기반 Ed25519 서명 검증 알고리즘을 프론트엔드/백엔드에 탑재하여 변조 불가능한 오프라인 라이선스 키 체계 확립.
  - **단일 바이너리 기능 플래그(Feature Gate)**: Free Community, Pro, Enterprise 3단계 티어에 맞춰 포트 정밀 감사, Diff 비교, 다중 서브넷 확장 등의 기능을 유연하게 개방.

---

## 🎛️ 13. 모든 네트워크 어댑터 전수 탐색 및 다차원 필터 엔진 (Universal Multi-Adapter Discovery)
* **파일 위치**: `main.go` (`getAllInterfaces`), `types.ts`, `App.tsx`
* **기술 설명**: 시스템 내 모든 물리/가상/VPN/비활성 랜카드를 탐색하고 세부 메타데이터를 수집하여 원하는 대역으로 즉각 전환하는 네트워크 관리 기술입니다.
* **주요 핵심 기술**:
  - **전수 어댑터 메타데이터 추출**: 이더넷, Wi-Fi뿐만 아니라 WSL, Hyper-V, VMware, Docker, Tailscale, WireGuard, 루프백 어댑터의 UP/DOWN 상태, IPv4/CIDR, IPv6, MAC, MTU, 시스템 플래그 전수 수집.
  - **6종 다차원 필터 탭**: `전체`, `활성 UP`, `물리`, `가상`, `VPN`, `IPv4 보유` 탭 및 실시간 텍스트 검색 모듈로 원하는 서브넷을 1초 만에 색출.

---

## 🎨 14. 스마트 엣지-투-엣지 아이콘 자동 크롭 & PE 리소스 직접 패칭 엔진 (Smart Icon Auto-Cropping & PE Binary Patcher)
* **파일 위치**: `generate-assets.js`, `build-win.js`, `winres.json`
* **기술 설명**: 소스 이미지 내부의 빈 여백을 픽셀 단위로 자동 분석하여 꽉 찬 화면(Full-Bleed) 아이콘을 생성하고, Windows PE 실행 바이너리에 직접 주입하는 독점 패키징 파이프라인입니다.
* **주요 핵심 기술**:
  - **알파 채널 바운딩 박스 크롭 알고리즘**: `pngjs`로 원본 PNG의 투명 여백을 분석하여 비어있는 패딩 영역을 0px 오차로 완벽 크롭하고 1:1 정방형 캔버스에 중앙 정렬 리사이징.
  - **소켓 누수 자가 회수(`process._getActiveHandles`)**: `png-to-ico` 비동기 변환 시 잔류하는 네트워크 핸들을 감지하여 안전하게 종료함으로써 빌드 멈춤(Hang) 방지.
  - **2단계 PE 리소스 직접 패칭**: `winres.json` 숫자 리소스 ID(`"#1"`) 및 `"APP"`을 등록하고, Go 컴파일 후 `go-winres patch`를 직접 실행하여 탐색기 및 작업표시줄에서 대형 고화질 아이콘이 100% 노출되도록 보증.

---

## 🚀 15. GitHub Releases 기반 무중단 실시간 자동 업데이트 센터 (Live Update Center)
* **파일 위치**: `services/updateChecker.ts`, `components/UpdateModal.tsx`, `scripts/auto-update.bat`
* **기술 설명**: 별도의 중앙 서버 비용 없이 GitHub Releases API를 연동하여 전 세계 사용자에게 실시간 업데이트를 알리고 원클릭으로 패키지를 교체하는 풀스택 업데이트 아키텍처입니다.
* **주요 핵심 기술**:
  - **Semantic Versioning 자동 비교**: 로컬 앱 버전과 원격 릴리즈 태그(`vX.Y.Z`)의 SemVer 비교를 통한 펄스 알림 뱃지 가동.
  - **플랫폼별 3대 바이너리 원클릭 다운로드**: Windows 포터블(.exe), 정식 인스톨러(Setup.exe), Android 스마트폰 전용(APK) 다운로드 직결.

---

### ⚖️ 상용화 가치 및 이중 라이선스 법적 보호 사항
본 문서에 정의된 고유 기술 목록들은 **이중 라이선스(Dual Licensing)** 정책 하에서 보호받습니다. 무상 배포본(GPL v3) 이외에 상업적 이윤 창출이나 기업 독점 솔루션 납품 목적을 지닌 유료 판매용 에디션으로 패키징할 경우, 당사(제작자)의 정식 **상용 라이선스(Commercial License)**가 적용되므로 저작권 분쟁의 여지 없이 안전하고 완벽한 독점 비즈니스 자산으로 취급됩니다. 상세 규정은 `docs/LICENSE.md`를 참고하십시오.

* **기술 업데이트 일자**: 2026년 10월 4일 (v2.3.2 최신화)
* **기술 개발 및 저작권자**: AhBiYout ([ahbiyoutvibe.blogspot.com](https://ahbiyoutvibe.blogspot.com/))
* **저작권**: Copyright (c) 2025-2026 AhBiYout. All rights reserved.
