# 📝 [구글 블로거 포스팅 완벽 가이드] Grid IP Scanner2 공식 소개 및 배포 (v2.7.0 · 2026-11-26 최신 개편판)
> **공식 블로그**: [https://ahbiyoutvibe.blogspot.com/](https://ahbiyoutvibe.blogspot.com/)  
> **공식 깃허브**: [https://github.com/AhBiYout-all/grid-ip-scanner2](https://github.com/AhBiYout-all/grid-ip-scanner2)  
> **공식 배포사**: [https://ahbiyoutvibe.blogspot.com](https://ahbiyoutvibe.blogspot.com)  
> **현재 버전**: v2.7.0 | **최신 업데이트**: 2026-11-26

---

## 📌 블로거(Blogger) 기본 설정 요약 (메타데이터)
* **맞춤 퍼머링크 (Permalink)**: `grid-ip-scanner2-visual-network-scanner`
* **검색 설명 (Search Description)**:
  > 16x16 시각화 그리드·고밀도 테이블·3계층 토폴로지 맵, 가변 CIDR(/20~/30) 대역 확장 스캔, 단말별 이력 타임라인 DB, SNMP v2c 스위치 L2 포트 매핑, 다중 단말 일괄 WoL 제어 큐, 85%~130% 통합 글자 배율 조절 및 12대 네이티브 DLL 엔진을 탑재한 차세대 네트워크 스캐너 Grid IP Scanner2 (v2.7.0)를 소개합니다.

---

# 📝 [작성 모드 (서식 있는 텍스트)] 전용 본문

> **사용 방법**: 구글 블로거 글쓰기 화면 좌측 상단 연필 아이콘에서 **[작성 모드]**를 선택한 후, 아래 영역(`1. 제목`부터 `10. 추천 태그`)의 내용을 그대로 복사하여 붙여넣으세요.  
> *(HTML 태그가 직접 필요한 경우에는 동일 폴더의 `docs/GOOGLE_BLOGGER_POST.html` 파일을 사용하세요.)*  
> 규정 순서: **1. 제목 ➔ 2. 본문 ➔ 3. 업데이트 ➔ 4. 앱 그림 ➔ 5. 다운로드 ➔ 6. 버전 정보 ➔ 7. 시스템 요구 사항 ➔ 8. 제작자 및 공식 채널 안내 ➔ 9. 전체 업데이트 ➔ 10. 추천 태그**

---

### 1. 제목
**[무료/초고속] 16x16 그리드 · 고밀도 테이블 · 가변 CIDR(/20~/30) · SNMP L2 스위치 매핑 · 다중 WoL 큐 · 85%~130% 통합 글자 배율을 탑재한 차세대 네트워크 스캐너: Grid IP Scanner2 (v2.7.0)**

---

### 2. 본문
안녕하세요, **AhBiYout**입니다.

네트워크 관리자, 시스템 엔지니어, 학교·사내 전산 담당자라면 한 번쯤 **Advanced IP Scanner**나 **Angry IP Scanner** 같은 진단 도구를 사용해 보셨을 것입니다. 하지만 기존 도구들은 수백 개의 IP 주소를 단순한 텍스트 행(Row)으로만 나열해 전체 대역의 유휴 공간·L2 스위치 연결 구조·단말별 과거 접속 변동 이력을 파악하기 어려웠습니다. 또한 `/22`·`/20` 같은 확장 서브넷을 스캔하거나 여러 대의 PC를 한 번에 원격 부팅(WoL)·점검하고, 노트북부터 고해상도 모니터까지 편안한 글자 크기로 조절하며 관제하기에는 한계가 있었습니다.

이러한 현장의 실무 요구를 한 번에 해결하기 위해 대폭 진화한 **『Grid IP Scanner2』 (v2.7.0 최신 마이너 릴리즈)**는 **16x16 매트릭스 그리드 · 고밀도 테이블 · 3계층 인터랙티브 토폴로지 맵 · 4색 스냅샷 Diff v2** 4종 통합 뷰를 제공할 뿐만 아니라, **가변 CIDR(`/20`–`/30`, 최대 4,094 호스트) 확장 스캔**, **단말별 접속·포트 변동 이력 타임라인 DB**, **SNMP v2c 스위치 포트 및 L2 물리 연결 매핑(RAM 전용 볼트)**, **다중 단말 일괄 WoL/원격 제어 큐**, **85%~130% 앱 전체 UI 통합 글자 배율 조절**, **네이티브 패킷 정밀 텔레메트리(`grid_pcap_analyzer.dll v2.6.2`)**, **다중 서브넷 & VLAN 통합 대시보드**, **Go 자율 시스템 트레이 & Windows SCM 서비스**, 그리고 **12대 네이티브 C/C++ DLL 엔진**을 모두 갖춘 차세대 올인원 네트워크 엔지니어링 스캐너입니다.

#### 🚀 Grid IP Scanner2 핵심 기능
* **🗺️ 4대 통합 워크스페이스 뷰 (`Grid` | `Table` | `Topology Map` | `Snapshot Diff`)**:
  - 16x16 그리드 맵으로 대역 상태를 신호등처럼 1초 만에 조망하고, 정렬·검색·일괄 체크박스 선택에 최적화된 **고밀도 테이블 뷰(`DeviceTableView`)**와 **3계층 줌/팬 SVG 토폴로지 맵**·**4색 스냅샷 Diff v2**를 원클릭 전환.
  - Pro 티어에서는 `grid_topology_guard.dll`(`v2.6.1`) 연동 **Topology Security Correlation(충돌·ARP 스푸핑·위험 포트·침입 교차 분석)** 오버레이 제공.
* **🌐 가변 CIDR (`/20`–`/30`, 최대 4,094 호스트) 확장 스캔 & 세그먼트 블록 분할**:
  - 기존 고정 `/24` 범위를 넘어 `/30`부터 초대형 `/20` 대역까지 자동 계획·청킹 스캔하며, 상단 `CidrBlockBar`에서 `256` 호스트 `/24` 블록 탭(전체·활성 수 표시)을 즉시 전환 (Free `≤/23`, Pro `/22`, Enterprise `/21`–`/20`).
* **📜 단말별 접속·포트 변동 이력 타임라인 DB (`DeviceTimelineTab`)**:
  - Go 로컬 영속 시계열 저장소(`timeline_events.jsonl`)에 `FIRST_SEEN`, `ONLINE`, `OFFLINE`, `IP_CHANGED`, `PORT_OPENED`, `PORT_CLOSED`, `VENDOR_OR_HOST_UPDATED`, `SWITCH_PORT_MOVED` 8종 이벤트를 자동 기록하고 CSV 감사 내보내기 지원 (Free 24시간/50건, Pro 30일, Enterprise 무제한).
* **🔌 SNMP v2c 스위치 포트 & L2 물리 연결 매핑 (`SnmpSwitchConfigModal`)**:
  - Pure-Go `IF-MIB`/`BRIDGE-MIB`/`Q-BRIDGE-MIB`/`LLDP-MIB` 탐색과 디스크·스토리지에 절대 남지 않는 **RAM 전용 자격증명 볼트**로 단말의 스위치 포트·VLAN 연결을 자동 매핑하고 토폴로지 L2 링크·테이블·보고서에 통합 표기 (Pro 최대 2대 / Enterprise 무제한).
* **⚡ 다중 단말 일괄 WoL 및 원격 제어 큐 (`BatchQueueDrawer`)**:
  - 그리드 `Ctrl/Cmd+Click` 또는 테이블 체크박스로 여러 장비를 선택해 **일괄 매직 패킷(WoL)·일괄 Ping·원격 포트 점검**을 비동기 작업 큐로 실행하며, 동시 워커(1–4)·패킷 지연(100–2000ms)·중단·실패 재시도 지원 (Pro 16대 / Enterprise 무제한).
* **🔍 앱 전체 통합 글자 확대·축소 (`85%~130%`, 5% 단위 · `100%` 초기화)**:
  - 상단 헤더 바(데스크톱·모바일)와 장치 상세 프로필 패널 상단에 동기화된 **`[ - | 100% | + ]`** 배율 컨트롤을 제공하며 **`Ctrl/Cmd + +/-/0`** 단축키로 즉시 조절.
  - A4 리포트 미리보기, 인쇄 레이아웃(`@media print`), SVG 토폴로지 맵은 배율 영향에서 격리해 정확한 1:1 출력 품질 유지.
* **🔬 네이티브 패킷 텔레메트리 & Listening Ports 빠른 연결 (`QuickConnectModal`)**:
  - 선택 호스트의 초기 TTL/추정 홉 수, TCP RTT/Jitter, OS 추정, Live ARP 스푸핑 검증을 원클릭 분석하고, **Listening Ports** 뱃지를 클릭해 SSH·RDP·HTTP/HTTPS·SMB·RTSP 등 프로토콜 아이콘·URI 복사·원격 실행 제안.
* **📊 Free 16×16 엑셀 그리드(.xls) & Pro 전체 보고서(5시트) + A4 PDF 센터**:
  - **Free 에디션**은 **16×16 엑셀 그리드 시트(`Grid_16x16`) 전용 `.xls`** 및 일반 범위 CSV·JSON·Markdown·PDF를 무료 생성하며, **Pro / Enterprise**는 요약·그리드·장비 인벤토리·보안 감사·스냅샷 Diff까지 수록된 **5시트 전체 보고서 엑셀 통합문서(`.xls`)** 및 A4 스마트 페이지네이션 PDF 보안 감사 보고서(Zero Row-Chopping) 출력.
* **📌 Go 자율 시스템 트레이 & Windows SCM 서비스 (`--tray` / `--service`) + Proxy-ARP 분리**:
  - 4색 동적 ARGB 배지 아이콘, 창 없는 시작(`--tray`), 10초 무인 자율 스윕, 쿨다운·방해금지(DND) 이벤트 OS 알림, 캠퍼스/기업망 게이트웨이 Proxy-ARP 스카이블루 뱃지 분리 및 OUI 시맨틱 LAA 랜덤 MAC 역추적 제공.

---

### 3. 업데이트 (v2.7.0 · 2026-11-25~26 마이너 릴리즈 하이라이트)
* **🌐 가변 CIDR (`/20`–`/30`) 확장 스캔 · 분할 그리드 & 고밀도 테이블 뷰 (`DeviceTableView`, `CidrBlockBar`)**:
  - `cidr_engine.go` 및 `services/cidrUtils.ts` 도입으로 `/30`~`/20` 최대 4,094 호스트 가변 스캔, `/24` 블록 탭 분할, 컬럼 정렬·빠른 필터·일괄 선택 테이블 뷰를 탑재했습니다.
* **📜 단말별 접속·포트 변동 이력 타임라인 DB (`timeline_store.go`, `DeviceTimelineTab`)**:
  - 스캔 완료 시 단말별 상태·포트·IP·스위치 포트 이동 이력을 8종 시계열 이벤트로 기록하고, 장치 상세 패널 **`[이력 타임라인]`** 탭 및 CSV 감사 내보내기를 제공합니다.
* **🔌 SNMP v2c 스위치 포트 · L2 물리 연결 매핑 (`snmp_l2.go`, `SnmpSwitchConfigModal`)**:
  - Pure-Go SNMPv2c + RAM-only 자격증명 볼트로 스위치 포트 및 VLAN을 매핑해 `TopologyMapView` L2 링크·테이블·보고서 컬럼에 통합 표시합니다.
* **⚡ 다중 단말 일괄 WoL 및 원격 제어 큐 (`batch_queue.go`, `BatchQueueDrawer`)**:
  - `Ctrl/Cmd+Click`·체크박스 다중 선택으로 일괄 WoL·Ping·원격 프로브를 큐에 등록하고 워커 수/지연 시간 조절 및 실패 항목 재시도를 지원합니다.
* **🔍 앱 전체 UI·그리드·테이블 통합 글자 배율 조절 (`85%~130%`, `TextScaleControl`) — *2026-11-26 최신 개선***:
  - 기존 장치 프로필 패널 전용 2단계(`100%/115%`) 버튼을 앱 전체 UI + 16×16 그리드 + 테이블 + 프로필 통합 **`85%~130%` (5% 단위, `100%` 초기화)** 컨트롤로 고도화하고 상단 메인 헤더 바·모바일 바·장치 프로필 패널 양방향 동기화 및 `Ctrl/Cmd + +/-/0` 단축키를 지원합니다.
* **📊 Excel 내보내기 티어 정교화 & Quick Connect 포트 빠른 연결 모달**:
  - **Free 티어**는 **`Grid_16x16` 엑셀 그리드(.xls)** 전용 생성, **Pro / Enterprise**는 **5시트 전체 보고서 엑셀 통합문서(.xls)** 생성으로 역할을 명확화했으며, 장치 상세 프로필의 **Listening Ports** 클릭 시 포트별 권장 프로토콜을 안내하는 `QuickConnectModal`을 추가했습니다.

---

### 4. 앱 그림 (UI 프리뷰 및 화면 구성)

```text
+---------------------------------------------------------------------------------------------------+
| [Grid IP Scanner2 v2.7.0]  [Grid | Table | Topology | Diff]   [- | 100% | +]   [▶ 스캔] [VLAN]   |
| [CIDR 192.168.0.0/22:  전체(142) | .0(48) | .1(52) | .2(31) | .3(11)]                            |
+-----------------------------------------------------------------+---------------------------------+
| [ 16x16 그리드 / 고밀도 테이블 / 3계층 L2 토폴로지 ]            | [ 장치 프로필 | 이력 타임라인 ] |
| [001 GW] ──┬── [Core-SW Gi0/12 · VLAN10] ── [024] [031]        | IP: 192.168.0.24 [복사 📋]      |
|            ├── [보안 주의 그룹] ── [018 ⚠️]                     | 🔌 Switch: Core-SW · Gi0/12     |
| ☑ 3대 선택  [⚡ 일괄 WoL] [📡 일괄 Ping] [🔍 원격 프로브]       | 📜 Timeline: PORT_OPENED 443    |
+-----------------------------------------------------------------+---------------------------------+
| [📊 Free 16x16 Excel Grid / Pro 5시트 전체 보고서]  [🔌 SNMP L2]  [⚡ Batch Queue]  [📌 트레이]  |
+---------------------------------------------------------------------------------------------------+
```

* **화면 1: 가변 CIDR 블록 바 & 4종 통합 워크스페이스**: 상단 **`[ - | 100% | + ]`** 글자 배율 컨트롤로 화면 밀도를 자유롭게 조절하며 `/20`–`/30` 대역의 블록별 그리드·고밀도 테이블·3계층 토폴로지를 넘나들며 실시간 관제.
* **화면 2: 장치 상세 프로필 & 이력 타임라인 + Quick Connect**: 선택 단말의 패킷 텔레메트리(TTL/RTT/OS/Live ARP), L2 스위치 포트 연결 정보, `8종 시계열 이벤트 타임라인` 및 Listening Ports 클릭 빠른 연결을 한 패널에서 즉시 실행.
* **화면 3: SNMP L2 스위치 볼트 & 다중 단말 일괄 제어 큐 + 보고서 센터**: 스위치 MIB 탐색, 다중 단말 일괄 WoL/Ping 큐 진행률 모니터링 및 Free 16×16 Excel Grid(`.xls`) / Pro 5시트 전체 보고서 엑셀·A4 PDF 다운로드 지원.

---

### 5. 다운로드
필요하신 운영체제 환경에 맞춰 최신 `v2.7.0` 빌드를 다운로드하세요:

* 📦 **Windows 정식 인스톨러 (권장 / 12대 DLL 분리 설치)**: `Grid_IP_Scanner2_v2.7.0_Setup.exe`  
  *(Windows 제어판 정식 등록, 12개 네이티브 DLL(`pcap v2.6.2`·`topology_guard v2.6.1` 포함) 분리 배치로 백신 오탐 예방, 포그라운드 무클릭 자동 업그레이드, UAC 권한 승계, 24/7 서비스 & 트레이 지원)*
* 🚀 **Windows 무설치 포터블**: `Grid_IP_Scanner2.exe` / `Grid_IP_Scanner2_v2.7.0_Portable.exe`  
  *(설치 과정 없이 USB에서 즉시 실행, `--tray` 조용한 트레이 시작 지원)*
* 📱 **Android 스마트폰 설치 APK**: `Grid_IP_Scanner2_v2.7.0.apk`  
  *(안드로이드 스마트폰/태블릿 직접 설치용 고성능 패키지)*
* 🌐 **모바일 웹 & iOS PWA 패키지**: `Grid_IP_Scanner2_v2.7.0_Mobile_PWA.zip`
* 🔗 **GitHub 공식 릴리즈 다운로드**: [https://github.com/AhBiYout-all/grid-ip-scanner2/releases](https://github.com/AhBiYout-all/grid-ip-scanner2/releases)

> 🛡️ **백신 오탐지 안내**: 본 소프트웨어는 순수 네트워크 진단 도구입니다. 12대 네이티브 DLL이 설치 폴더에 투명하게 분리 설치되는 **정식 인스톨러(`Setup.exe`)** 사용 시 안티바이러스 머신러닝 오탐지를 효과적으로 방지할 수 있습니다.

---

### 6. 버전 정보
* **프로그램 명칭**: Grid IP Scanner2
* **현재 릴리즈 버전**: v2.7.0 (Semantic Versioning 2.0.0 — 2026-11-26 최신 반영)
* **최신 업데이트 일자**: 2026-11-26
* **핵심 엔진**: Go Parallel Engineering Core (`cidr_engine`, `timeline_store`, `snmp_l2`, `batch_queue`, `tray_engine`) + 12 Native C/C++ DLL Suite + React 19 & Tailwind CSS v4 (Unified Text Scaling)

---

### 7. 시스템 요구 사항
* **Windows PC**: Windows 7 / 8 / 10 / 11 (32bit & 64bit 지원, 서비스 제어·ARP·SNMP 스캔 시 관리자 권한 권장)
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

* **v2.7.0 · 2026-11-25~26 (네트워크 엔지니어링 확장 · 통합 글자 배율 · Excel 티어 분리 릴리즈)**:
  - 가변 CIDR(`/20`–`/30`, 최대 4,094 호스트) 확장 스캔 엔진(`cidr_engine.go`), `/24` 블록 전환 바(`CidrBlockBar`) 및 고밀도 테이블 뷰(`DeviceTableView`) 탑재.
  - 단말별 접속·포트 변동 시계열 타임라인 DB(`timeline_store.go`, `DeviceTimelineTab`, 8종 이벤트) 및 Pure-Go SNMPv2c 스위치 포트/L2 물리 연결 매핑(`snmp_l2.go`, RAM 전용 볼트) 구현.
  - 다중 단말 일괄 WoL·Ping·원격 프로브 비동기 큐(`batch_queue.go`, `BatchQueueDrawer`) 및 Listening Ports 빠른 연결 모달(`QuickConnectModal`) 탑재.
  - **85%~130%(5% 단위) 앱 전체 UI · 그리드 · 테이블 통합 글자 배율 조절 및 `Ctrl/Cmd + +/-/0` 단축키** 적용(`TextScaleControl`), **Free 16×16 엑셀 그리드(.xls) / Pro 5시트 전체 보고서 엑셀 통합문서(.xls)** 분리 완료.
* **v2.6.0 · 2026-11-20~23 (패킷 텔레메트리 · 3계층 토폴로지 · 다중 서브넷/VLAN · 릴리즈 자동화)**:
  - `grid_pcap_analyzer.dll`(`v2.6.2`) 및 Go `/api/packet-inspect` 프로파일러 탑재로 TTL·홉 수·TCP RTT 지터·OS 추정·Live ARP 정합성 측정.
  - 3계층 인터랙티브 토폴로지 맵(`TopologyMapView.tsx`) 및 다중 서브넷/VLAN 통합 대시보드(`MultiSubnetBar`, `MultiSubnetModal`, Batch Sweep) 구축.
  - GitHub Releases 최신 3개 바이너리 유지 정리, Win32 트레이 창 복원 정밀화 및 Deep Audit 4차 C DLL/Go 트레이 API 결함 수정.
* **v2.5.0 · 2026-11-13~18 (자율 트레이 · OUI 시맨틱 · 12-DLL · Proxy-ARP 릴리즈)**:
  - Go 자율 트레이 엔진(`tray_engine.go`), 동적 4색 ARGB `HICON` 배지, Windows SCM 서비스(`--service`), 창 없는 부팅(`--tray`), 쿨다운·DND 알림 구현.
  - OUI + 포트/mDNS/UPnP 복합 점수 시맨틱 기기 분류 및 IEEE LAA 사설 랜덤 MAC 역추적 엔진(`ouiClassifier.ts`) 탑재.
  - 순수 창작 8번째 네이티브 엔진 `grid_topology_guard.dll`(`v2.6.1`), `Probe_SweepCidrAsyncBatch` / `PortScan_IocpMultiHostSweep`, `GVAULT11` PBKDF2-HMAC-SHA256 스택 고속 경로, 학교·기업망 Proxy-ARP 비알림 분리 적용.
* **v2.4.0 ~ v2.4.47 (2026-10-25 ~ 11-11)**:
  - UPnP/SSDP XML 실제 제조사 판별, MSYS2 GCC 16.1.0 정적 링크 DLL 분리 설치, 정기 자동 스캔 스케줄러, A4 PDF 보안감사 리포트, 4색 스냅샷 Diff 1:1 대조 스튜디오, 원클릭 IP 복사, Android APK 안정화.

---

### 10. 추천 태그
Grid IP Scanner2, IP 스캐너, 네트워크 스캐너, 가변 CIDR, SNMP L2 매핑, 타임라인 DB, 일괄 WoL, 글자 확대 축소, 테이블 뷰, 토폴로지 맵, 패킷 분석, 다중 서브넷, VLAN 대시보드, 엑셀 그리드, 시스템 트레이 감시, Proxy-ARP, 네이티브 DLL, A4 보안감사 PDF, AhBiYout
