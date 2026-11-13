# 🚀 Grid IP Scanner2 - 네이티브 DLL 모듈화 기술 명세서 및 개발 로드맵

> **문서 버전**: v1.0.0  
> **최종 수정일**: 2026-10-28  
> **문서 상태**: 공식 승인 및 배포 준비 (Approved Roadmap)  
> **대상 플랫폼**: Windows PC (x64 / ARM64), Android NDK (JNI), Electron Main Process  

---

## 1. 개요 및 추진 배경 (Executive Summary & Background)

**Grid IP Scanner2**는 모바일(PWA/Android APK)과 데스크톱(Windows PC)을 아우르는 차세대 네트워크 그리드 모니터링 솔루션입니다. 

순수 JavaScript / Node.js 런타임 환경은 뛰어난 생산성과 크로스 플랫폼 호환성을 제공하지만, 네트워크 엔지니어링 및 진단 영역에서는 다음과 같은 구조적 한계에 직면합니다:

1. **OS 커널 스위칭 및 프로세스 스폰 오버헤드**: `ping.exe`, `arp.exe` 등 외부 CLI 프로세스를 실행하고 콘솔 출력을 텍스트 파싱하는 방식은 IP당 20~50ms의 지연과 과도한 CPU 자원을 낭비합니다.
2. **Raw Socket 및 L2(데이터 링크 레이어) 접근 제약**: 샌드박스 보안 모델로 인해 운영체제 커널의 Raw Socket, ARP 테이블, 비동기 ICMP 큐에 직접 접근할 수 없습니다.
3. **이벤트 루프 병목 및 동시성 한계**: 수천 개 포트 스캔이나 대규모 서브넷(/16, /24) 스캔 시 가비지 컬렉션(GC) 및 파일 디스크립터 한계로 인해 네트워크 패킷 누락이 발생합니다.

본 문서는 **Direct Win32 Kernel API, Winsock2 IOCP, 멀티캐스트 패킷 파싱, 인메모리 바이너리 색인**을 C/C++ 및 Rust 기반의 **순수 네이티브 동적 링크 라이브러리(DLL)**로 모듈화하여, 성능과 탐지율을 산업용 등급으로 끌어올리기 위한 **상세 기술 명세(Technical Specifications)**와 **단계별 구현 로드맵(Phased Roadmap)**을 정의합니다.

---

## 2. 네이티브 DLL 아키텍처 다이어그램 (Architecture)

```
┌────────────────────────────────────────────────────────────────────────┐
│             Grid IP Scanner2 UI (React 19 / TypeScript / Vite)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ IPC / WebSocket / Context Bridge
┌───────────────────────────────────▼────────────────────────────────────┐
│               Electron Main Process / Go Native Host                   │
│               - FFI Engine: koffi (or napi-rs)                         │
│               - Fault-Tolerant Fallback Controller                     │
└──────┬───────────────────────┬─────────────────────────┬───────────────┘
       │ C-ABI                 │ C-ABI                   │ C-ABI
┌──────▼────────────────┐┌─────▼──────────────────┐┌──────▼──────────────┐
│ grid_probe_engine.dll ││  grid_discovery.dll    ││  grid_oui_trie.dll   │
├───────────────────────┤├────────────────────────┤├──────────────────────┤
│ - Win32 IcmpSendEcho2 ││ - mDNS (UDP 5353)      ││ - 100K+ IEEE DB Trie │
│ - SendARP (L2 MAC)    ││ - SSDP / UPnP (1900)   ││ - Memory-Mapped IO   │
│ - Winsock2 Non-block  ││ - NetBIOS Name Query   ││ - <1µs Zero Allocation│
└───────────────────────┘└────────────────────────┘└──────────────────────┘
       │                                                 │
┌──────▼─────────────────────────────────────────────────▼──────────────┐
│                   Windows Kernel / NDIS / TCP-IP Stack                 │
│      - iphlpapi.dll  |  ws2_32.dll  |  wpcap.dll (Optional Npcap)      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. DLL 모듈화 대상 6대 핵심 기능 및 상세 기술 명세

### 3.1 [모듈 1] `grid_probe_engine.dll` - 초고속 비동기 ICMP & L2 ARP 엔진
* **역할**: 서브넷 내 생존 장비의 초고속 스위핑 및 방화벽 우회 탐지
* **핵심 커널 API**: `iphlpapi.dll` (`IcmpCreateFile`, `IcmpSendEcho2`, `SendARP`, `GetIpNetTable2`)
* **성능 목표**:
  * 254개 IP(C-Class) 스캔 완료 시간: 기존 8.5초 ➔ **0.8초 이하 (10배 향상)**
  * ICMP 방화벽 차단 기기 탐지율: 기존 65% ➔ **100% (L2 ARP 강제 응답)**
* **C-ABI 인터페이스 명세**:
```c
#ifdef __cplusplus
extern "C" {
#endif

// 단일 IP 초고속 핑 (서브밀리초 RTT 측정)
__declspec(dllexport) int Probe_FastPing(const char* ip, int timeoutMs, double* outRttMs);

// Direct SendARP를 통한 하드웨어 MAC 주소 해소 (방화벽 우회)
__declspec(dllexport) int Probe_ResolveMac(const char* ip, char* outMacBuffer, int bufferLen);

// 서브넷 전체 일괄 비동기 스위핑 (멀티스레드 IcmpSendEcho2 큐)
__declspec(dllexport) int Probe_SweepSubnetAsync(
    const char* startIp,
    int count,
    int timeoutMs,
    void (*onHostDiscovered)(const char* ip, const char* mac, double rttMs, int status)
);

#ifdef __cplusplus
}
#endif
```

---

### 3.2 [모듈 2] `grid_port_iocp.dll` - IOCP 기반 대규모 비동기 포트 스캐너
* **역할**: 주요 인프라 포트(HTTP, HTTPS, SSH, RDP, RTSP, SMB 등) 전수 검사
* **핵심 기술**: Windows I/O Completion Ports (`CreateIoCompletionPort`, `WSASocket`, non-blocking multiplexing)
* **성능 목표**:
  * 단일 타깃 1,000개 웰노운 포트 검사: 기존 15초 ➔ **1.2초 내 완료**
  * 포트 리셋(RST) 패킷 0ms 감지 및 즉시 다음 포트 전환
* **C-ABI 인터페이스 명세**:
```c
// 비동기 멀티 포트 스캔 실행 (IOCP 워커 스레드 풀 구동)
__declspec(dllexport) int PortScan_RunBatch(
    const char* targetIp,
    const int* portList,
    int portCount,
    int timeoutMs,
    int maxConcurrency,
    int* outOpenPorts,
    int* outOpenCount
);
```

---

### 3.3 [모듈 3] `grid_discovery.dll` - 로컬 멀티캐스트 서비스 디스커버리
* **역할**: IoT 기기, 스마트 TV, 프린터, NAS, 공유기 등의 모델명과 호스트명 자동 파싱
* **지원 프로토콜**:
  * **mDNS / Bonjour** (UDP 224.0.0.251:5353) : Apple 기기, 프린터, 스마트 스피커
  * **SSDP / UPnP** (UDP 239.255.255.250:1900) : 스마트 TV, 공유기, NAS, 미디어 서버
  * **NetBIOS Name Service** (UDP 137) : Windows PC 이름, 도메인/작업그룹(Workgroup)
  * **LLMNR** (UDP 224.0.0.252:5355) : 로컬 링크 멀티캐스트 이름 확인
* **C-ABI 인터페이스 명세**:
```c
typedef struct {
    char hostname[128];
    char modelName[128];
    char manufacturer[128];
    char workgroup[64];
    char serviceType[64];
} DeviceDiscoveryInfo;

__declspec(dllexport) int Discovery_ProbeHost(
    const char* targetIp,
    int timeoutMs,
    DeviceDiscoveryInfo* outInfo
);
```

---

### 3.4 [모듈 4] `grid_oui_trie.dll` - 10만+ IEEE OUI 초고속 인메모리 검색 엔진
* **역할**: MAC 주소의 상위 24/28/36비트 제조사 식별자를 메모리 상에서 즉시 조회
* **핵심 기술**: 바이너리 Trie (Radix Tree) + Memory-Mapped File (`CreateFileMapping`, `MapViewOfFile`)
* **성능 목표**:
  * 검색 소요 시간: **1마이크로초(0.001ms) 이하** (O(1) 수준)
  * 메모리 점유율: 3MB 이하 (JSON/JS 객체 방식 대비 80% 절감)
* **C-ABI 인터페이스 명세**:
```c
__declspec(dllexport) int Oui_Initialize(const char* binDatabasePath);
__declspec(dllexport) int Oui_LookupVendor(const char* macAddress, char* outVendorName, int maxLen);
__declspec(dllexport) void Oui_Release(void);
```

---

### 3.5 [모듈 5] `grid_banner_grabber.dll` - 프로토콜 배너 및 웹 메타데이터 추출기
* **역할**: 웹 관리자 콘솔, SSH 버전, RTSP 스트림 이름 등 서비스 상세 정보 추출
* **핵심 기술**: 제로카피 Winsock2 스트림 파서, HTTP HEAD/GET 경량 소켓
* **C-ABI 인터페이스 명세**:
```c
__declspec(dllexport) int Banner_GrabHttp(
    const char* ip, 
    int port, 
    int timeoutMs, 
    char* outServerHeader, 
    char* outHtmlTitle, 
    int maxLen
);
```

---

### 3.6 [모듈 6] `grid_pcap_analyzer.dll` - 패킷 핑거프린팅 & 네트워크 이상 감지 (고급 옵션)
* **역할**: Npcap/WinPcap 연동을 통한 OS 핑거프린팅, IP 충돌 및 ARP 스푸핑 공격 실시간 탐지
* **핵심 기술**: TCP SYN 패킷의 초기 TTL, TCP Window Size, IP DF 플래그 조합 분석

---

### 3.7 [모듈 7] `grid_fingerprint_engine.dll` - AI 휴리스틱 기기 핑거프린팅 엔진 (구현 완료)
* **역할**: 개방 포트, TTL, HTTP/SSH/RTSP 배너 서명, OUI 제조사 정보를 결합해 15개 카테고리(IoT, CCTV/ONVIF, Smart TV, Game Console 등)와 보안 위험도를 0ms 내 판별
* **C-ABI 인터페이스**: `Fingerprint_GetDriverVersion`, `Fingerprint_AnalyzeHost`, `Fingerprint_AnalyzeJson`

---

### 3.8 [모듈 8] `grid_topology_guard.dll` - 순수 창작 서브넷 토폴로지 Diff · 충돌 해시 · LAA 가드 엔진 (구현 완료)
* **역할**: 서브넷 다중 호스트 스냅샷(`current` vs `baseline`)을 대상으로 IP 점유 MAC 변조(IP Takeover), 동일 MAC 다중 IP 점유(Proxy-ARP), IEEE 802.3 LAA 랜덤 MAC vs 가상 NIC(QEMU/Docker/VirtualBox/Hyper-V) 비트 분리, Soft-Trust 유사도 점수를 O(N) FNV-1a 해시로 고속 산출
* **상세 명세 및 기존 DLL 감사 내역**: [`docs/GRID_TOPOLOGY_GUARD_DLL_SPEC.md`](./GRID_TOPOLOGY_GUARD_DLL_SPEC.md) 참조
* **C-ABI 인터페이스**: `Guard_GetDriverVersion`, `Guard_AnalyzeMacProfile`, `Guard_ComputeSimilarity`, `Guard_AnalyzeSubnetTopology`, `Guard_AnalyzeTopologyJson`

---

## 4. 기술 스택 비교 및 언어 선정 기준

| 비교 항목 | C / C++ (MSVC / MinGW) | Rust (`napi-rs`) | Go (`-buildmode=c-shared`) |
| :--- | :--- | :--- | :--- |
| **바이너리 크기** | **매우 작음 (100KB~300KB)** | 보통 (1.5MB~3MB) | 큼 (6MB~12MB, 런타임 내장) |
| **메모리 안전성** | 개발자의 엄격한 버퍼 관리 필요 | **최고 (컴파일 타임 안전성)** | 우수 (GC 기반) |
| **Windows API 친화도**| **100% 네이티브 (`iphlpapi`, `ws2_32`)** | 우수 (`windows-rs` 크레이트) | 보통 (`syscall` / CGO 필요) |
| **CI/CD 빌드 속도** | 빠름 | 보통 (Cargo 빌드 캐싱 필요) | 빠름 (단, CGO 교차 컴파일 복잡) |
| **권장 적용 영역** | **초고속 커널 패킷 제어, IOCP, OUI 색인** | **패킷 파싱, 디스커버리, 고급 알고리즘** | 데스크톱 CLI 백엔드 데몬 |

> **선정 가이드**:  
> 성능과 바이너리 경량화가 절대적인 `grid_probe_engine.dll`과 `grid_oui_trie.dll`은 **순수 C/C++(MinGW/MSVC)**로 구축하고, 프로토콜 파싱이 중요한 `grid_discovery.dll`은 **Rust 또는 C++**로 구현합니다.

---

## 5. 단계별 개발 및 통합 로드맵 (Development Roadmap)

```
2026 Q4 (현재)            2027 Q1                   2027 Q2                   2027 Q3
   [Phase 1]                [Phase 2]                 [Phase 3]                 [Phase 4]
핵심 진단 가속화           디바이스 식별 지능화       대규모 인프라 스캔        크로스 플랫폼(JNI)
- IcmpSendEcho2          - mDNS / SSDP 수집        - IOCP 포트 스캐너         - Android NDK (.so)
- SendARP L2 해소        - IEEE OUI Trie 바이너리   - HTTP/SSH 배너 그래빙    - 실시간 패킷 스니퍼
- Fallback 회로 구축     - 제조사 모델 자동 태깅   - CSV/PDF 대량 익스포트   - 이상 패킷/충돌 감지
```

---

### 📍 Phase 1: 핵심 진단 가속화 및 탐지율 100% 달성 (단기 / v2.5.0 타깃)
* **목표**: 스캔 속도 5배 향상, 방화벽 차단 기기 100% 발굴.
* **구현 과업**:
  1. `grid_probe_engine.dll` 개발 및 빌드 자동화 스크립트(`scripts/build_native_dlls.bat`) 구성.
  2. Windows API `IcmpSendEcho2` 기반 비동기 핑 스윕 큐 구현.
  3. `SendARP`를 결합하여 ICMP 무응답 기기의 MAC 주소 및 온라인 상태 강제 식별.
  4. Electron 및 Go Host 환경 연동용 FFI 브리지(`koffi` 기반) 통합.
  5. **안전장치**: DLL 누락 또는 로드 실패 시 기존 TypeScript 가상 스캐너로 자동 롤백되는 **Fallback 회로** 구현.

---

### 📍 Phase 2: 디바이스 식별 지능화 및 인메모리 색인 (중기 / v2.6.0 타깃)
* **목표**: IP/MAC 외에 기기 모델명, OS 종류, 제조사명을 클릭 없이 그리드에 즉각 출력.
* **구현 과업**:
  1. `grid_oui_trie.dll` 구현: 10만 개 IEEE OUI 텍스트 DB를 1.8MB 크기의 바이너리 Radix-Trie 파일로 컴파일.
  2. `grid_discovery.dll` 개발: mDNS, SSDP, NetBIOS 쿼리를 브로드캐스트하여 로컬 스마트 기기 이름 자동 수집.
  3. UI 연동: 기기 유형(프린터, 공유기, TV, PC, 스마트폰) 아이콘 자동 맵핑 엔진 구축.

---

### 📍 Phase 3: 대규모 네트워크 인프라 스캔 & IOCP 포트 분석 (고도화 / v2.7.0 타깃)
* **목표**: 기업망 및 B/C 클래스 대규모 서브넷의 수만 개 포트 초고속 정밀 진단.
* **구현 과업**:
  1. `grid_port_iocp.dll` 완성: Windows IOCP 스레드 풀을 활용하여 수초 내 1,000+ 포트 스캔.
  2. `grid_banner_grabber.dll`: HTTP 헤더(`Server: Apache/Nginx`), RTSP 카메라 스트림 포트 메타데이터 파싱.
  3. 다중 스레드 스캔 결과 실시간 스트리밍(WebSockets/IPC)을 통한 그리드 UI 무지연 렌더링.

---

### 📍 Phase 4: 모바일 크로스 플랫폼(JNI) 포팅 & 고급 진단 (장기 / v3.0.0 타깃)
* **목표**: Android APK 네이티브 가속 및 Npcap 패킷 분석 기능 완성.
* **구현 과업**:
  1. Android NDK 포팅: C/C++ 소스 코드를 Android ABI(`armeabi-v7a`, `arm64-v8a`)용 `libgrid_net.so`로 컴파일하고 JNI 바인딩 구성.
  2. Npcap 연동: TCP/IP 헤더 시그니처 기반 OS 정밀 핑거프린팅 지원.
  3. ARP 스푸핑 공격 및 내부망 IP 충돌 경보 시스템 도입.

---

## 6. 품질 검증(QA) 및 결함 방지(Fail-Safe) 전략

1. **Memory Leak 원천 차단 (Caller-Allocated Buffer)**:
   * DLL 내부에서 `malloc()` 후 포인터를 반환하는 구조를 지양하고, 호출자(Node.js/Go)가 버퍼를 미리 할당하여 전달하는 **Caller-allocated Memory Protocol** 엄격 적용.
2. **동적 로딩 및 그레이스풀 폴백 (Graceful Fallback)**:
   * Windows x64가 아니거나 DLL 파일이 삭제/변조되었을 때도 프로그램이 크래시되지 않고, 순수 Node.js/Go 소켓 구현체로 즉시 전환.
3. **CI/CD 멀티 빌드 파이프라인**:
   * GitHub Actions Windows 러너에서 MinGW/MSVC를 이용해 DLL을 자동 컴파일하고 디지털 서명(SignTool) 검증 후 릴리스 패키지에 포함.

---

## 7. 결론 및 기대 효과

| 항목 | 기존 (JS / 외부 CLI 파싱) | DLL 모듈화 적용 후 | 향상도 |
| :--- | :--- | :--- | :--- |
| **C-Class(254 IP) 스캔 시간** | 7초 ~ 15초 | **0.8초 미만** | **900% 이상 속도 개선** |
| **방화벽 뒤 기기 탐지율** | 65% ~ 70% | **100% (L2 SendARP 강제 탐색)** | **탐색 사각지대 제로화** |
| **기기 모델명/호스트명 식별** | 수동 입력 또는 AI 추정 | **mDNS/SSDP/NetBIOS 자동 감지** | **완전 자동화** |
| **포트 스캔(100 포트/호스트)** | 3초 ~ 6초 | **0.3초 미만 (IOCP 비동기)** | **대규모 진단 가능** |
| **CPU / 메모리 점유율** | 프로세스 스폰으로 급증 | **인프로세스 C-ABI로 최저 수준** | **시스템 자원 85% 절감** |

본 로드맵에 정의된 단계별 전략을 바탕으로 Grid IP Scanner2는 경량 웹 애플리케이션의 유연성을 유지하면서도, 전문 엔터프라이즈 네트워크 스캐너(Nmap, Angry IP Scanner)를 능가하는 독보적인 성능과 탐지력을 확보하게 됩니다.

---

## 8. 기존 개발 DLL과의 기능 중복 및 차별화 검증 분석 (Gap Analysis & Duplication Audit)

현재 프로젝트 저장소에 이미 구현되어 있는 기존 네이티브 DLL 소스코드(`native_dll/`) 및 명세서(`docs/`)를 전수 조사하여, 로드맵 상의 6대 신규 제안 모듈과의 **중복률, 계승 관계, 차별화 요소**를 분석한 결과입니다.

### 8.1 기존 개발 완료 네이티브 DLL 현황
1. **`grid_net_driver.dll`** (`native_dll/grid_net_driver.c`, `grid_net_driver.h`)
   - `GridNet_FastPing`: Win32 `IcmpSendEcho` 단일 동기 핑 호출
   - `GridNet_GetMacAddress`: Win32 `SendARP` L2 MAC 주소 수집
   - `GridNet_ScanPort`: Winsock2 논블로킹 소켓 단일 포트 검사
   - `GridNet_GetNetBIOSName`: UDP 137 NetBIOS 쿼리 (호스트명/작업그룹 추출)
   - `GridNet_GetServiceBanner`: 단일 HTTP HEAD `Server:` 헤더 추출
   - `GridNet_BatchScanPorts`: `GridNet_ScanPort` 단순 순차 루프 스캔
   - `GridNet_ValidateAndSanitizeOUI`: OUI 텍스트 데이터 해시 테이블 중복 제거
2. **`oui_validator.dll`** (`native_dll/oui_validator.cpp`, `oui_validator.h`)
   - `OuiValidator_Validate / NormalizePrefix`: IEEE MA-L/M/S 정규화
   - `OuiValidator_GenerateReport`: JSON 무결성 보고서 생성
   - `OuiValidator_ValidateOuiIntegrity`: Wireshark 표준 비교 및 `repair_log.json` 자동 수복
3. **`secure_vault.dll` / `grid_vault_driver.dll`** (`native_dll/secure_vault.cpp`, `grid_vault_driver.c`)
   - 하드웨어 가속 AES-256-GCM / DPAPI 암호화, 메모리 와이프, 기기 별칭/스냅샷 금고 암호화

---

### 8.2 제안 6대 모듈 vs 기존 모듈 정밀 비교 매트릭스

| 제안 모듈명 | 기존 구현 모듈 | 중복 판정 | 중복 기능 | 차별화 및 신규 확장 영역 (Architecture Delta) |
| :--- | :--- | :---: | :--- | :--- |
| **모듈 1: `grid_probe_engine.dll`** | `grid_net_driver.dll` | ⚠️ **부분 중복 (약 50%)** | `FastPing` (`IcmpSendEcho`), `SendARP` (MAC 수집) | • 기존: 단일 대상 동기 호출 방식<br>• 신규: `IcmpSendEcho2` 커널 비동기 큐 기반 **서브넷 일괄 비동기 스위핑(`Probe_SweepSubnetAsync`)** 및 동시 멀티캐스트 ARP 처리 |
| **모듈 2: `grid_port_iocp.dll`** | `grid_net_driver.dll` | ⚠️ **개념 중복, 구조 상이** | 포트 스캐닝 기능 (`BatchScanPorts`) | • 기존: 동기 루프 또는 소켓 `select()` (동시 소켓 수 제약)<br>• 신규: **Windows 커널 IOCP (`CreateIoCompletionPort`)** 스레드 풀 기반으로 수천 개 동시 소켓 논블로킹 처리 |
| **모듈 3: `grid_discovery.dll`** | `grid_net_driver.dll` | ⚠️ **일부 중복 (약 20%)** | NetBIOS (UDP 137) 호스트명/작업그룹 조회 | • 기존: UDP 137 NetBIOS만 지원<br>• 신규: **mDNS (UDP 5353, Bonjour), SSDP/UPnP (UDP 1900), LLMNR (UDP 5355)** 등 스마트 기기/IoT 전용 멀티캐스트 서비스 파서 100% 신규 |
| **모듈 4: `grid_oui_trie.dll`** | `oui_validator.dll` | 💡 **역할 분담 (0% 기능 중복)** | OUI 데이터 처리 대상 동일 | • 기존(`oui_validator`): **오프라인/배치 무결성 검증, 이상치 정제, JSON 감사 리포트 생성**<br>• 신규(`grid_oui_trie`): **실시간 런타임 초고속 검색(Radix-Trie 메모리 맵 바이너리 룩업, <1µs)** |
| **모듈 5: `grid_banner_grabber.dll`** | `grid_net_driver.dll` | ⚠️ **일부 중복 (약 25%)** | 기본 HTTP `Server:` 헤더 추출 | • 기존: 단순 HTTP HEAD `Server:` 문자열만 파싱<br>• 신규: **SSH-2.0 배너, RTSP 스트림 메타데이터, SSL/TLS Handshake SNI 인증서 Subject 파싱** 지원 |
| **모듈 6: `grid_pcap_analyzer.dll`** | *(기존 없음)* | 🌟 **중복 없음 (0%, 100% 신규)** | 없음 | • Npcap/WinPcap 커널 바인딩<br>• TCP SYN-ACK TTL/Window Size 기반 OS 핑거프린팅<br>• 실시간 ARP 스푸핑 및 IP 충돌 탐지 |
| *(보안 모듈: `secure_vault.dll`)* | `secure_vault.dll` | 🔒 **독립 유지** | 없음 | • 금고 암호화 전용 모듈로서 네트워크 진단 모듈과 완벽 분리 |

---

### 8.3 아키텍처 정리 및 통합 권고안 (Architectural Recommendation)

1. **기존 `grid_net_driver.dll`의 모놀리식 한계 해소**:
   * 기존 `grid_net_driver.c`는 Ping, ARP, 단순 포트, NetBIOS, 배너, OUI 정제 기능이 단일 파일(All-in-One)에 섞여 있었습니다.
   * 로드맵에 따라 전문 기능별로 분리하거나, `grid_net_driver.dll`을 **`grid_probe_engine` 중심으로 리팩토링 및 고도화**하여 기존 코드를 온전히 계승할 수 있습니다.
2. **코드 재사용을 통한 개발 기간 단축**:
   * `grid_probe_engine.dll`: 기존 `grid_net_driver.c`의 `SendARP` 및 `IcmpSendEcho` 검증 코드를 즉시 베이스라인으로 재활용.
   * `grid_discovery.dll`: 기존 `GridNet_GetNetBIOSName` 파서를 그대로 이식하고 mDNS / SSDP 수신 루프만 추가 확장.
   * `grid_banner_grabber.dll`: 기존 `GridNet_GetServiceBanner`의 소켓 파이프라인을 재사용하여 SSH / RTSP 핸들러 추가.
3. **결론**:
   * 제안된 로드맵의 모듈들은 기존 구현체를 파괴하지 않으며, 기존의 **단일 동기(Synchronous) 프로토타입 구현을 엔터프라이즈급 비동기(Asynchronous / IOCP / Multicast) 전용 엔진으로 진화·완성**시키는 정통 후속 개발 과정입니다.
