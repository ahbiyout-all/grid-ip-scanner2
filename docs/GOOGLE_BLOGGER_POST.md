# 📝 [구글 블로거 포스팅 완벽 가이드] Grid IP Scanner2 공식 소개 및 배포 (v2.6.0 · 2026-11-21 최신 개편판)
> **공식 블로그**: [https://ahbiyoutvibe.blogspot.com/](https://ahbiyoutvibe.blogspot.com/)  
> **공식 깃허브**: [https://github.com/AhBiYout-all/grid-ip-scanner2](https://github.com/AhBiYout-all/grid-ip-scanner2)  
> **공식 배포사**: [https://ahbiyoutvibe.blogspot.com](https://ahbiyoutvibe.blogspot.com)  
> **현재 버전**: v2.6.0 | **최신 업데이트**: 2026-11-21

---

## 📌 블로거(Blogger) 기본 설정 요약 (메타데이터)
* **맞춤 퍼머링크 (Permalink)**: `grid-ip-scanner2-visual-network-scanner`
* **검색 설명 (Search Description)**:
  > 16x16 시각화 그리드 맵, 3계층 인터랙티브 토폴로지 맵, 네이티브 패킷 정밀 텔레메트리(v2.6.2), 다중 서브넷/VLAN 통합 대시보드(Free 2대역 & 5시트 엑셀 그리드 무료 제공), 자율 시스템 트레이 및 12대 네이티브 C/C++ DLL 엔진을 탑재한 차세대 네트워크 스캐너 Grid IP Scanner2 (v2.6.0)를 소개합니다.

---

# 📝 [작성 모드 (서식 있는 텍스트)] 전용 본문

> **사용 방법**: 구글 블로거 글쓰기 화면 좌측 상단 연필 아이콘에서 **[작성 모드]**를 선택한 후, 아래 영역(`1. 제목`부터 `10. 추천 태그`)의 내용을 그대로 복사하여 붙여넣으세요.  
> *(HTML 태그가 직접 필요한 경우에는 동일 폴더의 `docs/GOOGLE_BLOGGER_POST.html` 파일을 사용하세요.)*  
> 규정 순서: **1. 제목 ➔ 2. 본문 ➔ 3. 업데이트 ➔ 4. 앱 그림 ➔ 5. 다운로드 ➔ 6. 버전 정보 ➔ 7. 시스템 요구 사항 ➔ 8. 제작자 및 공식 채널 안내 ➔ 9. 전체 업데이트 ➔ 10. 추천 태그**

---

### 1. 제목
**[무료/초고속] 16x16 그리드 · 3계층 토폴로지 맵 · 패킷 정밀 텔레메트리 · 다중 서브넷/VLAN 통합 대시보드 · Free 5시트 엑셀 그리드를 탑재한 차세대 네트워크 스캐너: Grid IP Scanner2 (v2.6.0)**

---

### 2. 본문
안녕하세요, **AhBiYout**입니다.

네트워크 관리자, 시스템 엔지니어, 학교·사내 전산 담당자라면 한 번쯤 **Advanced IP Scanner**나 **Angry IP Scanner** 같은 진단 도구를 사용해 보셨을 것입니다. 하지만 기존 도구들은 수백 개의 IP 주소를 단순한 텍스트 행(Row) 리스트로만 나열하여 전체 네트워크의 계층 연결 구조와 유휴 공간을 직관적으로 파악하기 어려웠습니다. 또한 **여러 VLAN/서브넷을 오가며 스캔할 때 이전 결과가 덮어써지거나, 개별 호스트의 TTL/홉 수·TCP 핸드셰이크 지연(RTT/Jitter)·실시간 ARP 스푸핑 여부를 별도 패킷 분석기 없이 곧바로 확인하기 어려운 불편함**이 있었습니다.

이러한 현장의 실질적인 문제를 해결하기 위해 한층 더 진화한 **『Grid IP Scanner2』 (v2.6.0 최신 마이너 릴리즈)**는 C클래스(/24) 전체 254개 IP를 **16x16 매트릭스 그리드 맵**과 **3계층 인터랙티브 토폴로지 맵**으로 실시간 시각화할 뿐만 아니라, **네이티브 패킷 정밀 텔레메트리(`grid_pcap_analyzer.dll v2.6.2`)**, **다중 서브넷 & VLAN 통합 대시보드(로컬 NIC/VLAN 자동 탐색 및 대역별 캐싱)**, **Free 티어 5시트 엑셀 그리드(.xls) & 최대 2개 서브넷 무료 개방**, **Go 자율 시스템 트레이 & Windows SCM 네이티브 서비스**, **OUI 시맨틱 다중 신호 기기 분류 & LAA 랜덤 MAC 역추적**, **게이트웨이 Proxy-ARP 비알림 뱃지 분리**, 그리고 **12대 네이티브 C/C++ DLL 엔진**까지 모두 갖춘 차세대 올인원 네트워크 스캐너입니다.

#### 🚀 Grid IP Scanner2 핵심 기능
* **🗺️ 16x16 시각화 그리드 맵 & 3계층 인터랙티브 토폴로지 맵 (`Grid` | `Topology Map` | `Snapshot Diff`)**:
  - 254개 전체 노드의 활성/비활성/충돌/Proxy-ARP/Diff 상태를 신호등처럼 1초 만에 조망하고, **게이트웨이/코어 라우터 -> 인프라·Proxy-ARP·보안 그룹 -> 단말 노드** 계층을 줌/팬 SVG 맵으로 시각화.
  - Pro 티어에서는 `grid_topology_guard.dll`(`v2.6.1`) 연동 **Topology Security Correlation(충돌·ARP 스푸핑·위험 포트·침입 교차 분석)** 오버레이 제공.
* **🔬 네이티브 패킷 정밀 텔레메트리 (`grid_pcap_analyzer.dll v2.6.2`, `/api/packet-inspect`)**:
  - 장치 상세 프로필 패널에서 원클릭으로 **TTL/초기 TTL/추정 홉 수, TCP 핸드셰이크 RTT(Min/Avg/Max/Jitter), Window 힌트, OS 추정(신뢰도), Live ARP MAC 정합성**을 실시간 분석.
* **🌐 온디맨드 다중 서브넷 및 VLAN 통합 대시보드 (`MultiSubnetBar`, `MultiSubnetModal`, `/api/subnets/discover`)**:
  - 평소에는 깔끔한 단일 대역 화면을 유지하다 상단 **`다중 서브넷·VLAN`**(`VLAN`) 활성화 버튼 클릭 시 화면에 나타나며, **활성 VLAN Tag ID 인디케이터(`활성 태그` + 프로파일별 컬러 VLAN 태그 마커)**로 세그먼트 망을 즉시 식별합니다.
  - 로컬 물리/가상/VPN/VLAN NIC 대역을 자동 탐색해 원클릭으로 등록하고, 대역별 독립 스캔 결과를 캐싱해 무손실 전환(Free 최대 2개 대역 무료).
  - Pro(최대 5개 대역) 및 Enterprise(무제한)에서는 **순차 일괄 스윕(Batch Sweep)** 및 **교차 서브넷 이상 징후 통합 대시보드** 가동.
* **📊 Free 5시트 엑셀 그리드(.xls) & 통합 보고서 센터**:
  - 16x16 IP 그리드 맵 시트를 포함한 **5시트 다중 시트 Excel XML(.xls)**, CSV, JSON, Markdown을 **Free 에디션에서 무료**로 내보내고, Pro 티어에서 A4 최적화 PDF 보안 감사 보고서(Zero Row-Chopping) 및 1:1 스냅샷 Diff 대조 제공.
* **📌 Go 자율 시스템 트레이 & Windows SCM 서비스 (`--tray` / `--service`)**:
  - 4색 동적 ARGB 배지 아이콘, 부팅 시 창 없는 조용한 시작(`--tray`), 10초 무인 자율 스윕, 스케줄러 일시정지/즉시 실행, 쿨다운·방해금지(DND) 이벤트 OS 알림 지원.
* **🟦 게이트웨이 Proxy-ARP 비알림 분리 & OUI 시맨틱 LAA 역추적**:
  - 캠퍼스/기업망 L3 스위치 Proxy-ARP 동일 MAC 응답을 스카이블루 `Proxy-ARP` 뱃지로 분리해 오경보를 차단하고, OUI+포트+mDNS+UPnP 복합 점수로 LAA 랜덤 MAC 기기를 정밀 식별.

---

### 3. 업데이트 (v2.6.0 · 2026-11-20 마이너 릴리즈 하이라이트)
* **🔬 네이티브 패킷 정밀 텔레메트리 (`grid_pcap_analyzer.dll v2.6.2`) & Go 풀스택 프로파일러 신설**:
  - `Pcap_InspectPacketProfileJson` C-ABI 엔진과 `GET/POST /api/packet-inspect` Go 백엔드 엔드포인트를 구축하여 Windows Npcap 미설치 또는 Linux/macOS 환경에서도 TCP SYN RTT 지터, 초기 TTL, 추정 홉 수, OS 핑거프린팅 및 Live ARP 정합성을 즉시 검사합니다.
* **🗺️ 3계층 인터랙티브 토폴로지 맵 & 보안 교차 분석 (`TopologyMapView`) 도입**:
  - 상단 메인 뷰를 `Grid` · `Topology Map` · `Snapshot Diff` 3모드로 확장하고, `POST /api/topology-map` 및 `grid_topology_guard.dll` 연계를 통해 단말 계층 구조와 보안 상관 경보를 한 화면에서 탐색합니다.
* **🌐 온디맨드 다중 서브넷 & VLAN 통합 대시보드 · 순차 일괄 스윕(Batch Sweep) 탑재**:
  - `GET /api/subnets/discover`로 로컬 NIC/VLAN 대역을 자동 발굴하고, 상단 활성화 버튼으로 여닫는 `MultiSubnetBar`의 **VLAN Tag ID 인디케이터** 및 `MultiSubnetModal`을 통해 대역별 결과 캐싱·원클릭 전환 및 Pro+ 순차 일괄 스윕과 교차 서브넷 이상 징후 통합 관제를 제공합니다.
* **⚖️ Free vs Pro/Enterprise 티어 밸런스 개편 (핵심 편의 Free, 대규모 관제 Pro+)**:
  - **Free 티어**: **5시트 Excel Grid(.xls) 내보내기 복원 및 무료 전환**, **최대 2개 서브넷/VLAN 전환·캐싱**, **단일 서브넷 기본 토폴로지 맵**, **단일 호스트 수동 패킷 텔레메트리** 전면 개방.
  - **Pro / Enterprise 티어**: **Pro 5개 대역 / Enterprise 무제한**, **순차 Multi-Subnet Batch Sweep**, **교차 대역 이상 징후 대시보드**, **Topology Security Correlation & Continuous ARP Spoof Guard** 집중 배치.

---

### 4. 앱 그림 (UI 프리뷰 및 화면 구성)

```text
+---------------------------------------------------------------------------------------+
|  [Grid IP Scanner2 v2.6.0]  [Grid | Topology Map | Snapshot Diff]   [▶ 빠른 스캔]     |
|  [🌐 본사 192.168.0.0/24 (24)]  [VLAN10 10.10.10.0/24 (18)]  [+ 대역] [⚡ Batch Sweep] |
+------------------------------------------------------+--------------------------------+
|  [ 16x16 그리드 맵  /  3계층 인터랙티브 토폴로지 ]    |  [ 장치 상세 프로필 & 패킷 ]   |
|  [001 GW] ──┬── [인프라/Proxy-ARP] ── [251] [254]    |  IP: 192.168.0.254 [복사 📋]   |
|             ├── [보안 주의 그룹]   ── [018 ⚠️]       |  🔬 Packet Telemetry [분석 ▶]  |
|             └── [워크스테이션/IoT] ── [024] [031]    |  TTL 64(1홉) · RTT 1.2ms · ARP✓|
+------------------------------------------------------+--------------------------------+
|  [📊 Free 5시트 Excel Grid(.xls)]   [🌐 다중 서브넷 통합 대시보드]   [📌 트레이 감시]  |
+---------------------------------------------------------------------------------------+
```

* **화면 1: 다중 서브넷 바 & 16x16 / 3계층 토폴로지 뷰**: 등록된 서브넷/VLAN 대역을 무손실 캐시로 즉시 전환하고, `Grid`와 `Topology Map`을 넘나들며 게이트웨이-그룹-단말 구조를 시각화.
* **화면 2: 장치 상세 프로필 패킷 텔레메트리**: 선택 호스트의 초기 TTL, 홉 수, TCP 핸드셰이크 RTT(Min/Avg/Max/Jitter), OS 추정 신뢰도 및 Live ARP 스푸핑 검증 결과를 즉석 확인.
* **화면 3: 다중 서브넷 & VLAN 통합 대시보드 + 보고서 센터**: NIC/VLAN 자동 발굴, 순차 Batch Sweep(Pro+), 교차 대역 KPI/이상 징후 관제 및 Free 5시트 Excel Grid(`.xls`) 다운로드 지원.

---

### 5. 다운로드
필요하신 운영체제 환경에 맞춰 최신 `v2.6.0` 빌드를 다운로드하세요:

* 📦 **Windows 정식 인스톨러 (권장 / 12대 DLL 분리 설치)**: `Grid_IP_Scanner2_v2.6.0_Setup.exe`  
  *(Windows 제어판 정식 등록, 12개 네이티브 DLL(`pcap v2.6.2`·`topology_guard v2.6.1` 포함) 분리 배치로 백신 오탐 예방, 포그라운드 무클릭 자동 업그레이드, UAC 권한 승계, 24/7 서비스 & 트레이 지원)*
* 🚀 **Windows 무설치 포터블**: `Grid_IP_Scanner2.exe` / `Grid_IP_Scanner2_v2.6.0_Portable.exe`  
  *(설치 과정 없이 USB에서 즉시 실행, `--tray` 조용한 트레이 시작 지원)*
* 📱 **Android 스마트폰 설치 APK**: `Grid_IP_Scanner2_v2.6.0.apk`  
  *(안드로이드 스마트폰/태블릿 직접 설치용 고성능 패키지)*
* 🌐 **모바일 웹 & iOS PWA 패키지**: `Grid_IP_Scanner2_v2.6.0_Mobile_PWA.zip`
* 🔗 **GitHub 공식 릴리즈 다운로드**: [https://github.com/AhBiYout-all/grid-ip-scanner2/releases](https://github.com/AhBiYout-all/grid-ip-scanner2/releases)

> 🛡️ **백신 오탐지 안내**: 본 소프트웨어는 순수 네트워크 진단 도구입니다. 12대 네이티브 DLL이 설치 폴더에 투명하게 분리 설치되는 **정식 인스톨러(`Setup.exe`)** 사용 시 안티바이러스 머신러닝 오탐지를 효과적으로 방지할 수 있습니다.

---

### 6. 버전 정보
* **프로그램 명칭**: Grid IP Scanner2
* **현재 릴리즈 버전**: v2.6.0 (Semantic Versioning 2.0.0 — 2026-11-21 최신 반영)
* **최신 업데이트 일자**: 2026-11-21
* **핵심 엔진**: Go Parallel & Packet Telemetry Kernel + 12 Native C/C++ DLL Suite (`grid_pcap_analyzer.dll v2.6.2`, `grid_topology_guard.dll v2.6.1`, IOCP/Async ICMP/Vault v2.6.0) + React 19 & Tailwind CSS v4

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

* **v2.6.0 · 2026-11-20 (패킷 텔레메트리 · 3계층 토폴로지 · 다중 서브넷/VLAN · 티어 개편 릴리즈)**:
  - `grid_pcap_analyzer.dll`(`v2.6.2`, `Pcap_InspectPacketProfileJson`) 및 Go `/api/packet-inspect` 프로파일러 탑재로 호스트별 TTL·홉 수·TCP RTT 지터·OS 추정·Live ARP 정합성 측정.
  - 3계층 인터랙티브 토폴로지 맵(`TopologyMapView.tsx`, `/api/topology-map`) 및 Pro 전용 Security Correlation / Continuous ARP Spoof Guard 도입.
  - 다중 서브넷/VLAN 통합 대시보드(`MultiSubnetBar`, `MultiSubnetModal`, `/api/subnets/discover`), 대역별 결과 캐싱 및 Pro+ 순차 Batch Sweep 구축.
  - 5시트 Excel Grid(`.xls`) 및 최대 2개 서브넷/기본 토폴로지/단일 패킷 분석 Free 개방.
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
Grid IP Scanner2, IP 스캐너, 네트워크 스캐너, 토폴로지 맵, 패킷 분석, 다중 서브넷, VLAN 대시보드, 엑셀 그리드, 시스템 트레이 감시, Windows 서비스, Proxy-ARP, LAA 랜덤 MAC, OUI 시맨틱 분류, 네이티브 DLL, A4 보안감사 PDF, AhBiYout
