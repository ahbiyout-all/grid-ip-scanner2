# 📝 [구글 블로거 포스팅 완벽 가이드] Grid IP Scanner2 공식 소개 및 배포 (v2.5.0 · 2026-11-18 최신 개편판)
> **공식 블로그**: [https://ahbiyoutvibe.blogspot.com/](https://ahbiyoutvibe.blogspot.com/)  
> **공식 깃허브**: [https://github.com/AhBiYout-all/grid-ip-scanner2](https://github.com/AhBiYout-all/grid-ip-scanner2)  
> **공식 배포사**: [https://ahbiyoutvibe.blogspot.com](https://ahbiyoutvibe.blogspot.com)  
> **현재 버전**: v2.5.0 | **최신 업데이트**: 2026-11-18

---

## 📌 블로거(Blogger) 기본 설정 요약 (메타데이터)
* **맞춤 퍼머링크 (Permalink)**: `grid-ip-scanner2-visual-network-scanner`
* **검색 설명 (Search Description)**:
  > 16x16 시각화 그리드 맵, OUI 시맨틱 LAA 랜덤 MAC 역추적, 게이트웨이 Proxy-ARP 비알림 분리('Proxy-ARP' 뱃지), Go 자율 시스템 트레이(동적 4색 배지 아이콘·--tray 조용한 부팅·Windows SCM 서비스·방해금지/쿨다운 이벤트 알림·스케줄러 일시정지/즉시실행), 통합 보고서 센터 및 12대 네이티브 C/C++ DLL 엔진을 탑재한 차세대 네트워크 스캐너 Grid IP Scanner2 (v2.5.0)를 소개합니다.

---

# 📝 [작성 모드 (서식 있는 텍스트)] 전용 본문

> **사용 방법**: 구글 블로거 글쓰기 화면 좌측 상단 연필 아이콘에서 **[작성 모드]**를 선택한 후, 아래 영역(`1. 제목`부터 `10. 추천 태그`)의 내용을 그대로 복사하여 붙여넣으세요.  
> *(HTML 태그가 직접 필요한 경우에는 동일 폴더의 `docs/GOOGLE_BLOGGER_POST.html` 파일을 사용하세요.)*  
> 규정 순서: **1. 제목 ➔ 2. 본문 ➔ 3. 업데이트 ➔ 4. 앱 그림 ➔ 5. 다운로드 ➔ 6. 버전 정보 ➔ 7. 시스템 요구 사항 ➔ 8. 제작자 및 공식 채널 안내 ➔ 9. 전체 업데이트 ➔ 10. 추천 태그**

---

### 1. 제목
**[무료/초고속] 16x16 시각화 그리드 · 자율 시스템 트레이(동적 배지/방해금지/SCM 서비스) · Proxy-ARP 분리 · 12대 네이티브 DLL 엔진을 탑재한 차세대 네트워크 스캐너: Grid IP Scanner2 (v2.5.0)**

---

### 2. 본문
안녕하세요, **AhBiYout**입니다.

네트워크 관리자, 시스템 엔지니어, 학교·사내 전산 담당자라면 한 번쯤 **Advanced IP Scanner**나 **Angry IP Scanner** 같은 진단 도구를 사용해 보셨을 것입니다. 하지만 기존 도구들은 수백 개의 IP 주소를 단순한 텍스트 행(Row) 리스트로만 나열하여 전체 네트워크의 유휴 공간과 밀도를 직관적으로 파악하기 어려웠습니다. 또한 **학교·캠퍼스 네트워크에서 게이트웨이(.254)와 다른 IP(.251)가 동일한 L3 스위치 MAC으로 응답할 때 무조건 IP 충돌 경보로 오인**하거나, 창을 닫으면 24시간 감시와 예약 스캔이 멈춰버리고 불필요한 알림 폭탄이 쏟아지는 불편함이 있었습니다.

이러한 현장의 실질적인 문제를 해결하기 위해 한층 더 진화한 **『Grid IP Scanner2』 (v2.5.0 최신 개편판)**는 C클래스(/24) 전체 254개 IP를 **16x16 매트릭스 그리드 맵**으로 실시간 시각화할 뿐만 아니라, **Go 자율 시스템 트레이 & Windows SCM 네이티브 서비스**, **OUI 시맨틱 다중 신호 기기 분류 & LAA 랜덤 MAC 역추적**, **게이트웨이 Proxy-ARP 정상 판별 및 `Proxy-ARP` 인디케이터 뱃지 분리**, **순수 창작 `grid_topology_guard.dll`과 IOCP·비동기 ICMP 고속 배치 스위프를 포함한 12대 네이티브 C/C++ DLL 엔진**, 그리고 **통합 보고서 센터(PDF·Excel·CSV·JSON·Markdown·HTML)**까지 모두 갖춘 차세대 올인원 네트워크 스캐너입니다.

#### 🚀 Grid IP Scanner2 핵심 기능
* **16x16 시각화 그리드 맵**: 전체 254개 노드의 활성/비활성/충돌/Proxy-ARP/Diff 상태를 신호등처럼 1초 만에 직관적으로 조망.
* **📌 Go 자율 시스템 트레이 & Windows SCM 서비스 (`--tray` / `--service`)**:
  - **동적 4색 배지 트레이 아이콘**: 대기(회색), 24/7 감시(에메랄드), 스캔 중(호박색), 침입·충돌 경보(적색) 상태에 따라 작업표시줄 아이콘 배지가 실시간 전환.
  - **부팅 시 창 없이 조용히 시작 (`--tray`) & 무인 백그라운드 감시**: 브라우저 창을 열지 않거나 닫은 뒤에도 Go 자율 엔진이 10초 주기로 감시·만기 스케줄 스캔을 계속 수행하며, Windows 서비스(`GridIPScannerService`, `--service`) 제어까지 완벽 연동.
  - **트레이 빠른 제어**: 트레이 우클릭 메뉴에서 **빠른 스캔**, **24/7 침입 감시 토글**, **정기 스케줄러 일시정지/재개 및 즉시 실행**을 1초 만에 제어.
  - **스마트 이벤트 OS 알림 (중복 억제 · 방해금지 DND)**: **신규 침입**, **IP/MAC 충돌**, **대량 호스트 오프라인 급감** 발생 시에만 OS 풍선 알림을 전송하며, 동일 이벤트 쿨다운 중복 억제와 상시/30분 일시 해제/야간 조용한 시간(DND)을 지원.
* **🧠 OUI 시맨틱 다중 신호 분류 & LAA 랜덤 MAC 역추적**: MAC OUI뿐만 아니라 개방 포트, mDNS, UPnP XML을 복합 점수화하여 IoT, CCTV, 가상머신(QEMU/Docker/VirtualBox/Hyper-V), 스마트 TV, 라우터를 자동 분류하고 신뢰도와 판별 근거를 표기.
* **🟦 게이트웨이 Proxy-ARP 비알림 분리 (`Proxy-ARP` 뱃지)**: 학교·기업망 L3 스위치 Proxy-ARP 또는 HSRP/VRRP 가상 게이트웨이(VIP)의 동일 MAC 다중 IP 응답은 붉은 충돌 경보(`⚠️`)가 아닌 스카이블루 `Proxy-ARP` 정보 뱃지로 깔끔히 분리해 오경보를 차단.
* **⚡ 12대 순수 C/C++ 네이티브 DLL 엔진 & 보안 하드닝**: 순수 창작 `grid_topology_guard.dll`(`v2.6.1`, O(N) FNV-1a 토폴로지 해시), 비동기 ICMP/ARP 배치 스위프(`Probe_SweepCidrAsyncBatch`), Win32 IOCP 다중 호스트 포트 스위프(`PortScan_IocpMultiHostSweep`), `GVAULT11` 16B 솔트 + PBKDF2-HMAC-SHA256 AES-256-GCM 암호화 및 DLL 경로 고정(`LOAD_LIBRARY_SEARCH_APPLICATION_DIR`) 탑재.
* **📄 통합 보고서 센터 & 4색 스냅샷 Diff 스튜디오**: PDF 보안 감사 보고서(Zero Row-Chopping), 다중 시트 Excel, CSV, JSON, Markdown, 인쇄 HTML과 1:1 스냅샷 비교를 전용 모달에서 한 번에 처리.

---

### 3. 업데이트 (v2.5.0 · 2026-11-18 최신 고도화 하이라이트)
* **📌 Go 네이티브 시스템 트레이 & Windows SCM 서비스 자율 감시 고도화 (2026-11-18)**:
  - **동적 ARGB 배지 트레이 아이콘 & 요약 메뉴 (`utils_windows.go`)**: 대기/감시/스캔/경보 4단계 배지 아이콘 실시간 렌더링 및 활성 호스트·침입·충돌·다음 스케줄 요약 메뉴 탑재.
  - **창 없는 조용한 부팅 (`--tray`) & 무인 스케줄러/감시 (`tray_engine.go`)**: Windows 시작프로그램 등록 시 `--tray` 플래그로 창 없이 조용히 상주하며, 우클릭 메뉴·환경설정 모달에서 **정기 스케줄러 일시정지/재개 및 즉시 실행** 양방향 동기화.
  - **Windows SCM 서비스 정식 핸들러 (`--service`)**: `advapi32.dll` `StartServiceCtrlDispatcherW` 구현으로 서비스 시작 지연(Error 1053)을 원천 해결하고 `running` / `stopped` / `not_installed` 상태를 실시간 반영.
  - **고도화된 OS 알림 엔진**: 신규 침입 · IP 충돌 · 대량 오프라인 급감 이벤트별 알림 규칙, 동일 이벤트 쿨다운 중복 억제, 상시/30분/야간 조용한 시간 **방해금지(DND)**, 심각도별 Win32 풍선 알림 및 최근 이벤트 피드 제공.
* **✨ 통합 보고서 센터·모달 분리·UI 구조 개선 (2026-11-18)**:
  - 중복되던 내보내기/스냅샷 비교 흐름을 **`ReportCenterModal`** 과 **`SnapshotDiffModal`** 로 통합하여 상단 헤더를 깔끔하게 정리.
  - 환경설정·트레이·알림·레거시 Windows 도구를 통합한 **`PreferencesTrayModal`** 로 UI 가독성과 제어 효율성 향상.
* **🧠 OUI 시맨틱 분류, Proxy-ARP 비알림 분리 & 12대 DLL 보안 하드닝 (`v2.5.0`)**:
  - `ouiClassifier.ts` 복합 점수 분류 및 LAA 랜덤 MAC 역추적, `conflictDetector.ts` 스카이블루 `Proxy-ARP` 뱃지 분리, `grid_topology_guard.dll`(`v2.6.1`)·IOCP·Async ICMP 배치 및 Deep Audit 동시성 결함 10종 일괄 수정 완료.

---

### 4. 앱 그림 (UI 프리뷰 및 화면 구성)

```text
+---------------------------------------------------------------------------------------+
|  [Grid IP Scanner2 v2.5.0]  [ 192.168.0.1 - 254 ]   [▶ 빠른 스캔]   [📌 트레이]       |
+------------------------------------------------------+--------------------------------+
|  [ 16x16 실시간 시각화 매트릭스 그리드 맵 ]            |  [ 장치 상세 프로필 패널 ]       |
|  [001] [002] [003] ... [251 Proxy-ARP] [254 Proxy-ARP]|  IP: 192.168.0.254 [복사 📋]   |
|  [017] [018 ⚠️] [019] ...                            |  유형: 라우터/L3 스위치 (95%)   |
|  * [🟢 +신규] [🔴 -오프라인] [🟠 !변동] [🟦 Proxy-ARP] |  실제 제조사: Cisco [UPnP]      |
+------------------------------------------------------+--------------------------------+
|  [📌 트레이 컨텍스트 메뉴 & 통합 모달]                                                 |
|  ● 상태: 24/7 무인 감시 중 (에메랄드 배지) · 활성 24 · 침입 0 · 충돌 0                 |
|  ⏰ 스케줄: 일시정지 / 재개 · 즉시 실행   |   🔕 방해금지(DND) / 쿨다운 / 야간 시간    |
|  [📄 통합 보고서 센터 (PDF·Excel·CSV)]   |   [🛡️ Windows SCM 서비스 (--service)]      |
+---------------------------------------------------------------------------------------+
```

* **화면 1: 16x16 매트릭스 시각화 그리드**: 254개 전체 IP 노드 상태와 스카이블루 `Proxy-ARP` 뱃지 vs 붉은 `⚠️` 충돌 경보를 1초 만에 구분.
* **화면 2: 자율 시스템 트레이 & 환경설정 모달**: 실시간 4색 배지 상태 요약, 스케줄러 일시정지/즉시 실행, 침입·충돌·대량 오프라인 알림 임계치, 쿨다운·DND 및 최근 트레이 이벤트 로그 피드 확인.
* **화면 3: 통합 보고서 센터 & 1:1 대조 스튜디오**: PDF·Excel·CSV·JSON·Markdown·HTML 내보내기 및 4색 스냅샷 Diff 대조 지원.

---

### 5. 다운로드
필요하신 운영체제 환경에 맞춰 최신 `v2.5.0` 빌드를 다운로드하세요:

* 📦 **Windows 정식 인스톨러 (권장 / 12대 DLL 분리 설치)**: `Grid_IP_Scanner2_v2.5.0_Setup.exe`  
  *(Windows 제어판 정식 등록, 12개 네이티브 DLL 분리 배치로 백신 오탐 예방, 포그라운드 무클릭 자동 업그레이드, UAC 권한 승계, 24/7 서비스 & 트레이 지원)*
* 🚀 **Windows 무설치 포터블**: `Grid_IP_Scanner2.exe` / `Grid_IP_Scanner2_v2.5.0_Portable.exe`  
  *(설치 과정 없이 USB에서 즉시 실행, `--tray` 조용한 트레이 시작 지원)*
* 📱 **Android 스마트폰 설치 APK**: `Grid_IP_Scanner2_v2.5.0.apk`  
  *(안드로이드 스마트폰/태블릿 직접 설치용 고성능 패키지)*
* 🌐 **모바일 웹 & iOS PWA 패키지**: `Grid_IP_Scanner2_v2.5.0_Mobile_PWA.zip`
* 🔗 **GitHub 공식 릴리즈 다운로드**: [https://github.com/AhBiYout-all/grid-ip-scanner2/releases](https://github.com/AhBiYout-all/grid-ip-scanner2/releases)

> 🛡️ **백신 오탐지 안내**: 본 소프트웨어는 순수 네트워크 진단 도구입니다. 12대 네이티브 DLL이 설치 폴더에 투명하게 분리 설치되는 **정식 인스톨러(`Setup.exe`)** 사용 시 안티바이러스 머신러닝 오탐지를 효과적으로 방지할 수 있습니다.

---

### 6. 버전 정보
* **프로그램 명칭**: Grid IP Scanner2
* **현재 릴리즈 버전**: v2.5.0 (Semantic Versioning 2.0.0 — 2026-11-18 트레이·서비스·UI 고도화 반영)
* **최신 업데이트 일자**: 2026-11-18
* **핵심 엔진**: Go Autonomous Tray & Service Kernel + 12 Native C/C++ DLL Suite (`grid_topology_guard.dll v2.6.1`, IOCP/Async ICMP/Vault v2.6.0) + React 19 & Tailwind CSS v4

---

### 7. 시스템 요구 사항
* **Windows PC**: Windows 7 / 8 / 10 / 11 (32bit & 64bit 지원, 서비스 제어 및 ARP 스캔 시 관리자 권한 권장)
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

* **v2.5.0 · 2026-11-18 (시스템 트레이·서비스·UI 통합 고도화)**:
  - Go 자율 트레이 엔진(`tray_engine.go`), 동적 4색 ARGB `HICON` 배지, Windows SCM 서비스 핸들러(`--service`), 창 없는 부팅(`--tray`), 스케줄러 일시정지/즉시 실행 제어, 쿨다운·DND·야간 조용한 시간 기반 이벤트 OS 알림 구현.
  - 통합 보고서 센터(`ReportCenterModal`) 중심 내보내기 흐름 일원화, 모달 모듈 분리 및 미사용 레거시 브리지 데드코드 정리.
* **v2.5.0 · 2026-11-13 (OUI 시맨틱 · 12-DLL · Proxy-ARP 릴리즈)**:
  - OUI + 포트/mDNS/UPnP 복합 점수 시맨틱 기기 분류 및 IEEE LAA 사설 랜덤 MAC 역추적 엔진(`ouiClassifier.ts`) 탑재.
  - 순수 창작 8번째 네이티브 엔진 `grid_topology_guard.dll`(`v2.6.1`) 및 `Probe_SweepCidrAsyncBatch` / `PortScan_IocpMultiHostSweep` 고속 배치 함수 구축.
  - 12대 네이티브 DLL 경로 고정(`LOAD_LIBRARY_SEARCH_APPLICATION_DIR`), `GVAULT11` PBKDF2-HMAC-SHA256 스택 고속 경로, JSON 음수 포트 방어 및 Deep Audit 결함 10종 일괄 수정.
  - 학교·캠퍼스 게이트웨이 Proxy-ARP 다중 IP 정상 판별(`isGatewayProxyArp`, 비알림 Info) 및 UI 스카이블루 `Proxy-ARP` 인디케이터 뱃지 분리.
* **v2.4.47 (2026-11-11)**:
  - Go 단독 실행 파일 하트비트 단절 시 프로세스 종료 결함 및 Electron `before-quit` 가로채기 버그 수정으로 창 닫기 트레이 최소화(`Close-to-Tray`) 완전 정상화.
* **v2.4.46 (2026-11-10)**:
  - Win32 시스템 트레이 계층형 레거시 대응 서브메뉴(긴급 IP 스캔 & 메모장 보고서, `flushdns`, `ncpa.cpl`, 방화벽 기본 복원) 및 `NIF_INFO` 풍선 도움말 연동.
* **v2.4.45 (2026-11-09)**:
  - UPnP/SSDP XML 디바이스 디스크립션 심층 파싱 & mDNS 휴리스틱 기반 실제 완제품 제조사 정밀 판별 및 칩셋 OUI 2-Tier 병기 표기.
* **v2.4.41 ~ v2.4.44 (2026-11-09)**:
  - MSYS2 GCC 16.1.0 정적 링크 11대 DLL 분리 설치 및 인스톨러 포그라운드 100% 무클릭 자동 언인스톨 파이프라인 개편.
* **v2.4.0 ~ v2.4.26 (2026-10-25 ~ 11-07)**:
  - 정기 자동 스캔 스케줄러, A4 PDF 보안감사 리포트, 4색 스냅샷 Diff 1:1 대조 스튜디오, 원클릭 IP 주소 복사, Android APK 안정화.

---

### 10. 추천 태그
Grid IP Scanner2, IP 스캐너, 네트워크 스캐너, 시스템 트레이 감시, Windows 서비스, 방해금지 알림, Proxy-ARP, LAA 랜덤 MAC, OUI 시맨틱 분류, 네이티브 DLL, IOCP 포트 스캔, 보고서 센터, 스냅샷 비교, A4 보안감사 PDF, AhBiYout
