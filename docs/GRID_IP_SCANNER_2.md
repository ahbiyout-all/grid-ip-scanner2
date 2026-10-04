# Grid IP Scanner2
## 📋 기술 설명서 및 개발 과정 백서 (Technical Documentation)

본 문서는 **Grid IP Scanner2 (v2.2.3)**의 시스템 아키텍처, 핵심 기능, 당면 과제 해결 과정, 5단계 적응형 런처 파이프라인, 네이티브 비상 스캔 모드, 그리고 최근 업데이트 내용에 대한 기술적 가이드를 제공합니다.

---

## 1. 프로젝트 개요 및 아키텍처
**Grid IP Scanner2**는 로컬 네트워크 대역(C클래스, `/24` 서브넷)의 모든 IP 주소(1~254)를 실시간으로 스캔하여 고해상도 **16x16 그리드 맵**으로 한눈에 파악할 수 있도록 설계된 고성능 네트워크 분석 도구입니다.

* **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons를 사용하여 직관적이고 미려한 어두운 테마(Slate Dark) 기반의 UI를 제공합니다. UI 쓰레드 락을 예방하기 위해 스캔 이벤트를 250ms 단위로 버퍼링 가공하는 상태 배치 파이프라인이 내장되어 있습니다. 또한 사용자의 수동 어댑터 지정을 유지해 주는 상태 보존 엔진이 장착되었습니다.
* **Backend**: Go(Golang) 언어로 작성된 경량 고성능 네트워킹 엔진입니다. 멀티 스레드 워커 풀(Worker Pool)을 가동해 ICMP Ping, NetBIOS 호스트 이름 확인, mDNS, UPnP, SNMP 프로토콜을 병렬 탐색하며, 결과를 **Server-Sent Events (SSE)** 형태로 프론트엔드에 실시간 스트리밍합니다.
* **Adaptive 5-Tier Launcher**: 최신 Windows 11/10의 Edge 앱 모드뿐만 아니라, 구형 Windows 7/8.1의 Chrome/Whale 앱 모드 및 기본 브라우저 연동, 나아가 브라우저가 전면 차단된 폐쇄망 환경에서의 **순수 Windows 시스템 네이티브 비상 스캔 모드(`user32.dll` + `notepad.exe` 보고서)**까지 5단계 자동 폴백 파이프라인을 지원합니다.
* **Express & Go Sync Proxy (`server.ts`)**: 개발 및 가상 실행 모드에서 Node Express 서버가 Go 백엔드를 기동할 때 `/api/info` 헬스체크 응답을 대기(`waitForGoBackend`)한 후 프록시 통로를 개방함으로써 `ECONNREFUSED` 503 프록시 초기 구동 연결 에러를 완벽히 소멸시켰습니다.
* **Standalone Packaging**: 사용자가 Go나 Node.js 환경을 개별 설치하지 않고도 즉시 사용할 수 있도록, 내장 웹서버와 프론트엔드 정적 파일들을 Go 바이너리에 임베딩하여 **단 하나의 가벼운 Windows 실행 파일(`Grid IP Scanner2 v2.2.3.exe`)**로 완벽하게 빌드해 제공합니다.

---

## 2. 주요 기능 및 최근 업데이트

### 📌 1. 5단계 스마트 적응형 런처 파이프라인 (Adaptive Launcher Pipeline)
* **개선 사항**: PC에 설치된 브라우저 엔진 환경(OS 버전, Edge/Chrome 유무)을 시작 시 자동 진단하여 최적의 모드로 실행합니다.
  - **1단계**: `Microsoft Edge` 단독 앱 창 (`--app=http://localhost:3031`)
  - **2단계**: `Google Chrome` 단독 앱 창 (구형 Win7/8.1의 Chrome 109 등 완벽 호환)
  - **3단계**: `Naver Whale` / `Brave Browser` 단독 앱 창
  - **4단계**: 시스템 기본 브라우저(Firefox, Opera 등) 새 탭 자동 실행
  - **5단계**: 브라우저 실행 불가 시 Windows 네이티브 대화상자(`user32.dll`) 출력

### 📌 2. 브라우저 부재 환경을 위한 "Windows 네이티브 비상 스캔 & 메모장 보고서"
* **개선 사항**: 브라우저가 전혀 없는 특수 PC나 정책상 브라우저가 차단된 환경에서도 네이티브 팝업창에서 `[예 (긴급 스캔)]`을 선택하면 64개 멀티스레드 워커가 C클래스 IP 대역을 고속 스캔하고, 분석 결과를 바탕화면에 `Grid_IP_Scan_Result.txt`로 저장 후 윈도우 기본 메모장(`notepad.exe`)으로 즉시 열람할 수 있도록 지원합니다.

### 📌 3. 원격 / 모바일 웹 UI 접속 지원
* **개선 사항**: 화면이 없거나 구형인 PC에서 스캐너를 켜두더라도, 현재 PC의 실제 로컬 IP(예: `http://192.168.0.15:3031`)를 자동 계산하여 안내창에 표시함으로써 스마트폰, 태블릿, 다른 노트북에서 16x16 그리드 맵을 원격 제어할 수 있습니다.

### 📌 4. 관리자 권한 재시작 시 기존 프로세스 및 앱 창 자동 종료 (Safe Relaunch Engine)
* **개선 사항**: 비관리자 모드에서 동작하다가 "관리자 권한 실행" 버튼을 누를 때, 기존 백엔드 프로세스뿐만 아니라 함께 띄워져 있던 독립 웹 애플리케이션 창(Edge 샌드박스 창)까지 완벽하고 정교하게 자동 종료 처리를 수행합니다.
* **가치**: 포트 점유 충돌로 인한 소켓 에러 및 기동 실패를 100% 예방하며, 이전 일반 모드로 구동되던 낙후된 웹 클라이언트 창을 자동으로 종료해주고 새롭게 부여된 높은 관리자 권한을 가진 어플리케이션 창 하나만 실행해 깔끔하고 완성도 높은 사용자 경험을 보장합니다.

### 📌 5. 자동 빌드 시 패치노트/버전 정보 자동 주입 (Automated Version-Tag Compilation)
* **개선 사항**: 빌드 스크립트(`build-win.js`, `build.bat`)가 `docs/PATCH_NOTE.md` 및 `package.json`에서 현재 버전 메타데이터를 직접 파싱 및 자동 동기화하여, 출력되는 단일 바이너리 이름을 정형화 및 동적 패키징되도록 빌드 파이프라인을 완전 구축했습니다.

### 📌 6. 백엔드 동기화 대기 로직 강화 (`waitForGoBackend`)
* **개선 사항**: Express 샌드박스 서버(`server.ts`) 초기 기동 시 Go 백엔드가 바인딩될 때까지 비동기 헬스 체크(`waitForGoBackend`)를 수행한 후 API 프록시 라우팅을 활성화하여 초기 연결 오류를 원천 차단합니다.

### 📌 7. 인터페이스 수동 선택 상태 유지 (React Interface Retention)
* **개선 사항**: 사용자가 여러 어댑터 중 특정 카드(예: Ethernet)를 수동으로 지정하면, 백엔드의 라우팅 우선순위에 따른 폴링 응답 정보가 이를 덮어쓰지 못하도록 React 내부 리퍼런스(`selectedInterfaceIpRef`)를 통해 선택 상태를 영구 동결 및 영속 유지시킵니다.

### 📌 8. 법적 이중 라이선스 및 상용 준수성 고지 명세서 강화 (`docs/LICENSE.md`)
* **개선 사항**: 무상 GPL v3 커뮤니티 에디션 및 소스코드 비공개 유료 독점 판매용 상용 라이선스(Proprietary Commercial License)의 이중 라이선스 체계를 명확히 수립하고, 하부 MIT 오픈소스 라이브러리 준수성 및 IEEE OUI DB 권리 명세를 `docs/LICENSE.md` 및 루트 `LICENSE.md`로 표준화하였습니다.

### 📌 9. IEEE 봇 차단 우회 및 이중 미러링 OUI 실시간 업데이트 엔진 (`v2.2.3`)
* **개선 사항**:
  - IEEE 공식 서버(`standards-oui.ieee.org`)의 봇 차단 정책(HTTP 418)을 데스크톱 표준 브라우저 User-Agent 헤더 탑재로 완벽 우회.
  - Wireshark Automated Manuf(58,000+건) 1차 미러 및 IEEE MA-L/M/S 2차 미러를 연계한 이중 미러링(Tiered Fallback) 체계 도입.
  - 4단계 UI 상태 배지(`준비됨(오프라인 내장)`, `최신 캐시 적용됨`, `동기화 중...`, `연결 끊김`) 및 세분화된 토스트 안내 제공.
  - 상세 사양은 `docs/OUI_DATABASE_SPEC.md`에 독립 문서로 상세 수록.

---

## 3. 세부 파일 및 스크립트 가이드

스캐너 루트 디렉토리에는 다양한 빌드 자동화 스크립트와 아티팩트 관리 파일들이 정리되어 있습니다.

* **`/docs/README.md`**: 문서 저장소 총괄 가이드 및 색인 목차입니다.
* **`/docs/VERSIONING_POLICY.md`**: 시맨틱 버저닝(SemVer 3단계) 관리 규정 및 패치노트 지침입니다.
* **`/docs/GRID_IP_SCANNER_2.md`**: 본 정식 기술 설명서 및 시스템 백서입니다.
* **`/docs/OUI_DATABASE_SPEC.md`**: OUI 계층형 매칭 및 이중 미러링 기술 명세서입니다.
* **`/docs/PATCH_NOTE.md`**: v2.2.3 최신 버전에 적용된 패치 이력 및 릴리즈 노트입니다.
* **`/docs/LICENSE.md`**: 이중 라이선스 규정 및 상업용 유료 패키징 준수 가이드문입니다.
* **`/docs/PROPRIETARY_TECHNOLOGY.md`**: 코어 엔진 및 독점 기술 자산 명세서입니다.
* **`/docs/FILE_STRUCTURE_GUIDE.md`**: 모듈 간 데이터 흐름 및 전체 디렉토리 명세서입니다.
* **`build.bat`**: Windows 환경용 영문 자동 빌드 배치 스크립트입니다.
* **`build-win.js`**: Go 포터블 샌드박스를 연동하고 버전 태그를 자동 수집하여 바이너리를 패키징하는 NodeJS 오케스트레이터입니다.

---

### 📋 Windows 실행 파일 속성 - 자세히 (File Properties Details)
Windows 탐색기에서 생성된 단일 실행 파일(`.exe`)을 마우스 우클릭하여 `[속성] -> [자세히]` 탭을 확인할 때 표시되는 메타데이터 규격입니다:

| 항목 (Field) | 설정 값 (Value) |
| :--- | :--- |
| **파일 설명 (FileDescription)** | `Grid IP Scanner2` |
| **파일 버전 (FileVersion)** | `2.2.3.0` |
| **제품 이름 (ProductName)** | `Grid IP Scanner2` |
| **제품 버전 (ProductVersion)** | `2.2.3.0` |
| **저작권 (LegalCopyright)** | `Copyright (C) 2025-2026 AhBiYout. All rights reserved.` |
| **원본 파일 이름 (OriginalFilename)** | `Grid IP Scanner2 v2.2.3.exe` |
| **내부 이름 (InternalName)** | `GridIPScanner2` |
| **회사 / 개발자 (CompanyName)** | `AhBiYout (Cisnet)` |
| **상표 (LegalTrademarks)** | `Cisnet / Grid IP Scanner2` |
| **설명 / 주석 (Comments)** | `Grid IP Scanner2 - Advanced C-Class Network Scanner with 90k+ OUI Engine (IEEE Bot-Protection Bypass & Tiered Fallback)` |
| **지원 언어 (Language)** | `한국어 (0412) / English (0409) / Neutral (0000)` |

---

### 👨‍💻 제작자 및 버전 정보
* **제작자 (Author)**: AhBiYout
* **버전 (Version)**: v2.2.3 (2026년 9월 IEEE Bot-Protection Bypass, Dual-Mirror OUI & Granular UI Messages)
* **공식 홈페이지**: [www.cisnet.co.kr](http://www.cisnet.co.kr)
* **공식 블로그**: [ahbiyoutvibe.blogspot.com](https://ahbiyoutvibe.blogspot.com/)  
*Copyright (c) 2025-2026 AhBiYout. All rights reserved.*
