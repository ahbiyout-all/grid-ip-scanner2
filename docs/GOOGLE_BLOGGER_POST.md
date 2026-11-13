# 📝 [구글 블로거 포스팅 완벽 가이드] Grid IP Scanner2 공식 소개 및 배포 (v2.5.0)
> **공식 블로그**: [https://ahbiyoutvibe.blogspot.com/](https://ahbiyoutvibe.blogspot.com/)  
> **공식 깃허브**: [https://github.com/AhBiYout-all/grid-ip-scanner2](https://github.com/AhBiYout-all/grid-ip-scanner2)  
> **공식 배포사**: [https://ahbiyoutvibe.blogspot.com](https://ahbiyoutvibe.blogspot.com)  
> **최신 버전**: v2.5.0 | **작성일자**: 2026-11-13

---

## 📌 블로거(Blogger) 기본 설정 요약 (메타데이터)
* **맞춤 퍼머링크 (Permalink)**: `grid-ip-scanner2-visual-network-scanner`
* **검색 설명 (Search Description)**:
  > 16x16 시각화 그리드 맵, OUI 시맨틱 다중 신호 기기 분류 및 LAA 랜덤 MAC 역추적, 학교·캠퍼스 게이트웨이 Proxy-ARP 비알림 분리('Proxy-ARP' 뱃지), 순수 창작 grid_topology_guard.dll과 IOCP/Async ICMP 고속 배치를 탑재한 12대 네이티브 C/C++ DLL 엔진, UPnP/mDNS 실제 브랜드 판별, Close-to-Tray 24시간 감시를 지원하는 차세대 네트워크 스캐너 Grid IP Scanner2 (v2.5.0)를 소개합니다.

---

# 📝 [작성 모드 (서식 있는 텍스트)] 전용 본문

> **사용 방법**: 구글 블로거 글쓰기 화면 좌측 상단 연필 아이콘에서 **[작성 모드]**를 선택한 후, 아래 영역(`1. 제목`부터 `10. 추천 태그`)의 내용을 그대로 복사하여 붙여넣으세요.  
> *(HTML 태그가 직접 필요한 경우에는 동일 폴더의 `docs/GOOGLE_BLOGGER_POST.html` 파일을 사용하세요.)*  
> 규정 순서: **1. 제목 ➔ 2. 본문 ➔ 3. 업데이트 ➔ 4. 앱 그림 ➔ 5. 다운로드 ➔ 6. 버전 정보 ➔ 7. 시스템 요구 사항 ➔ 8. 제작자 및 공식 채널 안내 ➔ 9. 전체 업데이트 ➔ 10. 추천 태그**

---

### 1. 제목
**[무료/초고속] 16x16 시각화 그리드 맵 · OUI 시맨틱 LAA 역추적 · 게이트웨이 Proxy-ARP 분리 · 12대 네이티브 DLL 엔진을 탑재한 차세대 네트워크 스캐너: Grid IP Scanner2 (v2.5.0)**

---

### 2. 본문
안녕하세요, **AhBiYout**입니다.

네트워크 관리자, 시스템 엔지니어, 학교·사내 전산 담당자라면 한 번쯤 **Advanced IP Scanner**나 **Angry IP Scanner** 같은 진단 도구를 사용해 보셨을 것입니다. 하지만 기존 도구들은 수백 개의 IP 주소를 단순한 텍스트 행(Row) 리스트로만 나열하여 전체 네트워크의 유휴 공간과 밀도를 직관적으로 파악하기 어려웠습니다. 또한 **학교·캠퍼스 네트워크에서 게이트웨이(.254)와 다른 IP(.251)가 동일한 L3 스위치 MAC으로 응답할 때 무조건 IP 충돌 경보로 오인**하거나, 최근 스마트폰의 **사설 랜덤 MAC(LAA)** 기능으로 인해 장비 제조사조차 식별하지 못하는 한계가 있었습니다.

이러한 현장의 실질적인 문제를 해결하기 위해 탄생한 **『Grid IP Scanner2』 (v2.5.0)**는 C클래스(/24) 전체 254개 IP를 **16x16 매트릭스 그리드 맵**으로 실시간 시각화하며, **OUI 시맨틱 다중 신호 기기 분류 & LAA 랜덤 MAC 역추적**, **게이트웨이 Proxy-ARP 정상 판별 및 `Proxy-ARP` 인디케이터 뱃지 분리**, **순수 창작 `grid_topology_guard.dll` (`v2.6.1`)과 IOCP·비동기 ICMP 고속 배치 스위프를 포함한 12대 네이티브 C/C++ DLL 엔진**, UPnP/mDNS 실제 완제품 제조사 정밀 판별, Close-to-Tray 24/7 무인 침입 감시, 4색 스냅샷 Diff 비교, 원클릭 A4 규격 보안감사 PDF 출력을 제공하는 차세대 올인원 네트워크 스캐너입니다.

#### 🚀 Grid IP Scanner2 핵심 기능
* **16x16 시각화 그리드 맵**: 전체 254개 노드의 활성/비활성/충돌/Proxy-ARP/Diff 상태를 신호등처럼 1초 만에 직관적으로 조망.
* **🧠 OUI 시맨틱 다중 신호 분류 & LAA 랜덤 MAC 역추적**: MAC OUI뿐만 아니라 개방 포트, mDNS, UPnP XML을 복합 점수화하여 IoT, CCTV, 가상머신(QEMU/Docker/VirtualBox/Hyper-V), 스마트 TV, 라우터를 자동 분류하고 신뢰도와 판별 근거를 표기.
* **🟦 게이트웨이 Proxy-ARP 비알림 분리 (`Proxy-ARP` 뱃지)**: 학교·기업망 L3 스위치 Proxy-ARP 또는 HSRP/VRRP 가상 게이트웨이(VIP)의 동일 MAC 다중 IP 응답은 붉은 충돌 경보(`⚠️`)가 아닌 스카이블루 `Proxy-ARP` 정보 뱃지로 깔끔히 분리해 오경보를 차단.
* **⚡ 12대 순수 C/C++ 네이티브 DLL 엔진 & 보안 하드닝**: 순수 창작 `grid_topology_guard.dll`(`v2.6.1`, O(N) FNV-1a 토폴로지 해시), 비동기 ICMP/ARP 배치 스위프(`Probe_SweepCidrAsyncBatch`), Win32 IOCP 다중 호스트 포트 스위프(`PortScan_IocpMultiHostSweep`), `GVAULT11` 16B 솔트 + PBKDF2-HMAC-SHA256 AES-256-GCM 암호화 및 DLL 경로 고정(`LOAD_LIBRARY_SEARCH_APPLICATION_DIR`) 탑재.
* **📡 UPnP/SSDP XML & mDNS 실제 제조사 병기**: 단순 칩셋 브랜드(Murata, Realtek 등) 대신 실제 완제품 브랜드(Samsung, LG, Apple, Synology 등)와 칩셋 OUI를 나란히 병기.
* **🛡️ Close-to-Tray & 24/7 Windows 무인 백그라운드 서비스**: 상단 닫기(`[X]`) 버튼 클릭 시 창만 트레이로 숨기고 24시간 침입 감시와 정기 자동 스캔 스케줄러를 무중단 가동, 레거시 OS 긴급 스캔·DNS 플러시·방화벽 복원 서브메뉴 지원.
* **과거 vs 현재 4색 스냅샷 Diff & 1:1 대조 스튜디오**: 신규 접속(`+NEW`), 오프라인(`-OFF`), 식별자/포트 변동(`!CHG`), 정상 유지(`=SAME`) 실시간 추적.
* **경영진 제출용 A4 보안감사 PDF 리포트**: Zero Row-Chopping 스마트 페이지네이션과 실제 브랜드/칩셋 OUI 분리 인벤토리 내보내기 지원.

---

### 3. 업데이트 (v2.5.0 최신 릴리즈 하이라이트)
* **🧠 OUI 시맨틱 다중 신호 분류 & LAA 랜덤 MAC 역추적 엔진 탑재 (`ouiClassifier.ts`)**:
  - 단일 OUI 문자열 일치를 넘어 포트·mDNS·UPnP 복합 점수로 기기 유형(IoT/CCTV/VM/스마트 TV/라우터)을 정밀 분류.
  - 랜덤 MAC(`LAA`) 장비도 mDNS/호스트명/포트 지문으로 교차 역추적하며 상세 패널에 **신뢰도 점수(Confidence)와 판별 근거(Evidence)**를 표시.
* **🟦 게이트웨이/인프라 Proxy-ARP 비알림 분리 및 UI 전용 `Proxy-ARP` 뱃지 신설 (`conflictDetector.ts`, `IPCell.tsx`, `App.tsx`)**:
  - 학교·캠퍼스 환경의 `.251`/`.254` 동일 MAC 다중 IP 등 게이트웨이 L3 Proxy-ARP 응답을 `isGatewayProxyArp` / 비알림 Info(`isAlert = false`)로 하향 판별하고 스카이블루 `Proxy-ARP` 뱃지로 시각화.
  - 일반 소비자 공유기·NAS 브랜드(`asus`, `synology`, `qnap`)는 화이트리스트에서 제외하여 실제 악성 MAC 복제 경보는 100% 포착.
* **⚙️ 순수 창작 `grid_topology_guard.dll` (`v2.6.1`) 및 IOCP / Async ICMP 배치·Vault 보안 하드닝**:
  - O(N) FNV-1a 해시 서브넷 델타·Proxy-ARP 판별 API(`Guard_AnalyzeSubnetTopologyEx`, `GUARD_ANOMALY_INFRA_PROXY_ARP`)와 `POST /api/topology-guard` 연동.
  - `Probe_SweepCidrAsyncBatch` (단일 공유 ICMP 핸들 64-이벤트 윈도우 + 8스레드 ARP), `PortScan_IocpMultiHostSweep` (`CreateIoCompletionPort` + `ConnectEx`) 신설.
  - 12대 DLL 경로 고정(`LOAD_LIBRARY_SEARCH_APPLICATION_DIR`), `GVAULT11` PBKDF2-HMAC-SHA256 256B 스택 고속 경로, 중첩·음수 포트 방어 JSON 파서 및 Deep Audit 동시성 결함 10종 일괄 수정.
* **📌 Close-to-Tray 하이브리드 수명주기 정상화 (v2.4.47 포함)**:
  - Go 단독 실행 파일 하트비트 단절 시 프로세스가 종료되던 결함 및 Electron `before-quit` 이벤트 가로채기 버그를 해결해 창 닫기 시 완벽하게 트레이로 최소화.

---

### 4. 앱 그림 (UI 프리뷰 및 화면 구성)

```text
+---------------------------------------------------------------------------------------+
|  [Grid IP Scanner2 v2.5.0]  [ 192.168.0.1 - 254 ]   [▶ 고속 스캔]   [📌 트레이]       |
+------------------------------------------------------+--------------------------------+
|  [ 16x16 실시간 시각화 매트릭스 그리드 맵 ]            |  [ 장치 상세 프로필 패널 ]       |
|                                                      |  [가 100%] [가⁺ 115%]          |
|  [001] [002] [003] ... [251 Proxy-ARP] [254 Proxy-ARP]|  IP: 192.168.0.254 [복사 📋]   |
|  [017] [018 ⚠️] [019] ...                            |  [ℹ️ Gateway Proxy-ARP 정상]   |
|                                                      |  유형: 라우터/L3 스위치 (95%)   |
|  * 254개 전체 C클래스 노드 상태 및 충돌/Proxy-ARP 분리 |  실제 제조사: Cisco [UPnP]      |
|  * [🟢 +신규] [🔴 -오프라인] [🟠 !변동] [🟦 Proxy-ARP] |  칩셋 OUI: Cisco Systems [OUI]  |
+------------------------------------------------------+--------------------------------+
|  [📄 A4 보안감사 PDF]  [📊 1:1 대조 스튜디오]  [📡 12-DLL 네이티브 가속 엔진 활성]       |
+---------------------------------------------------------------------------------------+
```

* **화면 1: 16x16 매트릭스 시각화 그리드**: 254개 전체 IP 노드 상태와 스카이블루 `Proxy-ARP` 뱃지 vs 붉은 `⚠️` 충돌 경보를 1초 만에 구분.
* **화면 2: OUI 시맨틱 분류 & 실제 제조사 병기 프로필**: LAA 랜덤 MAC 역추적 결과, 신뢰도 점수, 근거 뱃지 및 원클릭 IP 복사 지원.
* **화면 3: 4색 스냅샷 Diff & 1:1 대조 스튜디오**: 과거 기준점과 현재 상태 정밀 대조 및 A4 스마트 페이지네이션 PDF 출력.

---

### 5. 다운로드
필요하신 운영체제 환경에 맞춰 최신 `v2.5.0` 빌드를 다운로드하세요:

* 📦 **Windows 정식 인스톨러 (권장 / 12대 DLL 분리 설치)**: `Grid_IP_Scanner2_v2.5.0_Setup.exe`  
  *(Windows 제어판 정식 등록, 12개 네이티브 DLL 분리 배치로 백신 오탐 예방, 포그라운드 무클릭 자동 업그레이드, UAC 권한 승계)*
* 🚀 **Windows 무설치 포터블**: `Grid_IP_Scanner2.exe` / `Grid_IP_Scanner2_v2.5.0_Portable.exe`  
  *(설치 과정 없이 USB에서 즉시 실행 가능한 단일 실행 바이너리)*
* 📱 **Android 스마트폰 설치 APK**: `Grid_IP_Scanner2_v2.5.0.apk`  
  *(안드로이드 스마트폰/태블릿 직접 설치용 고성능 패키지)*
* 🌐 **모바일 웹 & iOS PWA 패키지**: `Grid_IP_Scanner2_v2.5.0_Mobile_PWA.zip`
* 🔗 **GitHub 공식 릴리즈 다운로드**: [https://github.com/AhBiYout-all/grid-ip-scanner2/releases](https://github.com/AhBiYout-all/grid-ip-scanner2/releases)

> 🛡️ **백신 오탐지 안내**: 본 소프트웨어는 순수 네트워크 진단 도구입니다. 12대 네이티브 DLL이 설치 폴더에 투명하게 분리 설치되는 **정식 인스톨러(`Setup.exe`)** 사용 시 안티바이러스 머신러닝 오탐지를 효과적으로 방지할 수 있습니다.

---

### 6. 버전 정보
* **프로그램 명칭**: Grid IP Scanner2
* **현재 릴리즈 버전**: v2.5.0 (Semantic Versioning 2.0.0 — MINOR Feature & Hardening Release)
* **빌드 일자**: 2026-11-13
* **핵심 엔진**: Go Core Kernel + 12 Native C/C++ DLL Suite (`grid_topology_guard.dll v2.6.1`, IOCP/Async ICMP/Vault v2.6.0) + React 19 & Tailwind CSS v4

---

### 7. 시스템 요구 사항
* **Windows PC**: Windows 7 / 8 / 10 / 11 (32bit & 64bit 지원, 관리자 권한 권장)
* **Android**: Android 7.0 (Nougat, API 24) 이상 (스마트폰 / 태블릿)
* **Web / PWA**: Chromium 기반 브라우저 (Chrome, Edge, Whale, Brave 등)

---

### 8. 제작자 및 공식 채널 안내
* **개발자 및 배포사**: AhBiYout (아비웃)
* **공식 티스토리 / 구글 블로그**: [https://ahbiyoutvibe.blogspot.com/](https://ahbiyoutvibe.blogspot.com/)
* **공식 GitHub 리포지토리**: [https://github.com/AhBiYout-all/grid-ip-scanner2](https://github.com/AhBiYout-all/grid-ip-scanner2)
* **공식 문의 및 지원**: [공식 GitHub 이슈](https://github.com/AhBiYout-all/grid-ip-scanner2/issues)

---

### 9. 전체 업데이트 (기능 개선 히스토리)
패치노트에 기록된 핵심 기능 개선 및 업데이트 전체 히스토리입니다:

* **v2.5.0 (2026-11-13)**:
  - OUI + 포트/mDNS/UPnP 복합 점수 시맨틱 기기 분류 및 IEEE LAA 사설 랜덤 MAC 역추적 엔진(`ouiClassifier.ts`) 탑재.
  - 순수 창작 8번째 네이티브 엔진 `grid_topology_guard.dll`(`v2.6.1`) 및 `Probe_SweepCidrAsyncBatch` / `PortScan_IocpMultiHostSweep` 고속 배치 함수 구축.
  - 12대 네이티브 DLL 경로 고정(`LOAD_LIBRARY_SEARCH_APPLICATION_DIR`), `GVAULT11` PBKDF2-HMAC-SHA256 스택 고속 경로, JSON 음수 포트 방어 및 Deep Audit 결함 10종 일괄 수정.
  - 학교·캠퍼스 게이트웨이 Proxy-ARP 다중 IP 정상 판별(`isGatewayProxyArp`, 비알림 Info) 및 UI 스카이블루 `Proxy-ARP` 인디케이터 뱃지 분리.
* **v2.4.47 (2026-11-11)**:
  - Go 단독 실행 파일 하트비트 단절 시 프로세스 종료 결함 및 Electron `before-quit` 가로채기 버그 수정으로 창 닫기 트레이 최소화(`Close-to-Tray`) 완전 정상화.
  - `/api/close-to-tray`, `/api/window-closed`, `/api/tray-minimize` API 및 헤더 원클릭 `[📌 트레이 최소화]` 버튼 신설.
* **v2.4.46 (2026-11-10)**:
  - Win32 시스템 트레이 계층형 레거시 대응 서브메뉴(긴급 IP 스캔 & 메모장 보고서, `flushdns`, `ncpa.cpl`, 방화벽 기본 복원) 및 `NIF_INFO` 풍선 도움말 연동.
  - 통합 환경설정/시스템 트레이 대화상자 KO/EN 다국어화, 24/7 무인 서비스 시각 레이더 애니메이션, DLL 모듈 아코디언 UI 적용.
* **v2.4.45 (2026-11-09)**:
  - UPnP/SSDP XML 디바이스 디스크립션 심층 파싱 & mDNS 휴리스틱 기반 실제 완제품 제조사 정밀 판별 및 칩셋 OUI 2-Tier 병기 표기.
* **v2.4.44 (2026-11-09)**:
  - MSYS2 GCC 16.1.0 완벽 호환 정적 링크 및 인스톨러 3중 탐색으로 네이티브 DLL 분리 설치 100% 보장.
* **v2.4.41 ~ v2.4.42 (2026-11-09)**:
  - 인스톨러 기존 버전 감지 시 팝업 클릭 없는 포그라운드 100% 무클릭 자동 언인스톨 파이프라인 개편.
* **v2.4.24 ~ v2.4.26 (2026-11-07)**:
  - 장치 프로필 원클릭 IP 주소 복사, 24/7 시스템 트레이 연동, Inno Setup 6 UAC 권한 승계(`runascurrentuser`), 2D 그리드 스크롤 및 640x480 저해상도 지원.
* **v2.4.10 ~ v2.4.15 (2026-11-01)**:
  - Android/모바일 Wi-Fi 소켓 라우팅 보정, 노치 조절 옵션 및 APK 빌드 파이프라인 안정화.
* **v2.4.0 (2026-10-25)**:
  - 다중 프로토콜 출처 뱃지 원클릭 이름 적용, 한글(2byte) 깨짐 방지 디코더, 정기 자동 스캔 스케줄러, A4 PDF 보안감사 리포트, 4색 스냅샷 Diff 1:1 대조 스튜디오 구현.

---

### 10. 추천 태그
Grid IP Scanner2, IP 스캐너, 네트워크 스캐너, IP 탐색기, Proxy-ARP, 게이트웨이 IP 충돌, LAA 랜덤 MAC, OUI 시맨틱 분류, 네이티브 DLL, IOCP 포트 스캔, ICMP 배치 스캔, 스냅샷 비교, A4 보안감사 PDF, AhBiYout, 네트워크 진단
