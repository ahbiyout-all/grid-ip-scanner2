# 🛡️ Grid Topology Guard Native DLL (`grid_topology_guard.dll`) 기술 명세서 및 기존 DLL 감사 보고서

> **모듈 ID**: Module 8 (Pure Custom Native C-ABI Engine)  
> **라이브러리 파일**: `grid_topology_guard.dll` (`native_dll/grid_topology_guard.h`, `native_dll/grid_topology_guard.c`)  
> **드라이버 버전**: `v2.6.0` (`GUARD_DRIVER_VERSION = 20600`)  
> **연동 엔드포인트**: `POST /api/topology-guard` (`main.go` ↔ `native_modules_bridge.go` / `native_modules_bridge_other.go`)  
> **작성일**: 2026-11-13

---

## 1. 순수 창작 배경 및 아키텍처 공백 해소 (Architectural Gap)

기존 **Grid IP Scanner2**의 11개 DLL은 단일 호스트 단위 계측(Ping/ARP, 포트 스캔, 배너, OS TTL, OUI 단건 조회, 단일 금고 암복호화, 단일 기기 핑거프린팅)에 집중되어 있었습니다. 반면 **다수 호스트 간 상관관계 분석**, 즉 다음 4가지 핵심 연산은 JavaScript(`conflictDetector.ts`, `diffEngine.ts`)에만 의존하고 있었습니다.

1. **서브넷 스냅샷 델타 비교 (`+NEW` / `-OFF` / `!CHG` / `=SAME`)**
2. **동일 IP 내 MAC 변조(IP Takeover / ARP Spoofing) 및 동일 MAC의 다중 IP 점유(Proxy-ARP / MAC Cloning) O(N) 탐색**
3. **IEEE 802.3 LAA(Locally Administered Address) 랜덤 MAC과 가상 머신 NIC(QEMU, Docker, VirtualBox, Hyper-V)의 비트 수준 분리**
4. **DHCP IP 이동 및 스마트폰 랜덤 MAC 회전 환경에서 오탐지를 막기 위한 Soft-Trust 가중 유사도 점수 계산**

**`grid_topology_guard.dll`**은 이 공백을 채우기 위해 외부 의존성 0개(Zero Dependency)의 순수 C99 / C-ABI 엔진으로 신규 창작되었습니다.

---

## 2. 핵심 동작 원리 (Operating Principles)

### 2.1 Bit-Level IEEE 802.3 LAA & Virtual NIC 분리 (`Guard_AnalyzeMacProfile`)
입력된 raw MAC 문자열에서 12자리 Hex 니블을 정규화한 뒤 최상위 옥텟(MSB)과 특수 패턴을 비트 단위로 판별합니다.

- **유효성/특수주소 검사**:
  - `00:00:00:00:00:00` ➔ `GUARD_MAC_FLAG_ZERO` (무효)
  - `FF:FF:FF:FF:FF:FF` ➔ `GUARD_MAC_FLAG_BROADCAST` (브로드캐스트)
  - `firstByte & 0x01` (I/G 비트 = 1) ➔ `GUARD_MAC_FLAG_MULTICAST` (멀티캐스트 제외)
- **IEEE LAA 판정 (`firstByte & 0x02`, U/L 비트 = 1)**:
  - 가상화 하이퍼바이저 프리픽스를 우선 격리 (`GUARD_MAC_FLAG_LAA_VM`):
    - `52:54:00` ➔ QEMU / KVM Virtual NIC
    - `02:42:*` ➔ Docker Container Bridge
    - `0A:00:27` ➔ Oracle VirtualBox NIC
    - `00:15:5D` ➔ Microsoft Hyper-V NIC
  - 위 가상 NIC 프리픽스가 아닌 나머지 `U/L = 1` MAC 주소 ➔ `GUARD_MAC_FLAG_LAA_RANDOM` (iOS/Android/Windows 프라이버시 랜덤 MAC)

### 2.2 O(N) FNV-1a Open-Addressing 서브넷 충돌·토폴로지 해시 (`Guard_AnalyzeSubnetTopology`)
최대 `GUARD_MAX_SUBNET_HOSTS` (512) 호스트에 대해 동적 메모리 크기를 고정한 **1024-슬롯 선형 탐사 해시 테이블** 3종(`baseIpTable`, `curIpTable`, `curMacTable`)을 `calloc`으로 단일 할당하고 작업 종료 시 즉시 `free`합니다.

- **해시 함수**: 32-bit FNV-1a (`offset = 2166136261u`, `prime = 16777619u`, 비트마스크 `& 1023`)
- **동작 파이프라인 (2-Pass)**:
  1. **Pass 1 (인덱싱)**: Baseline 호스트의 IP를 `baseIpTable`에, Current 호스트의 IP와 정규화 MAC 빈도를 각각 `curIpTable` 및 `curMacTable`에 O(N) 적재.
  2. **Pass 2 (Current 호스트 판정)**:
     - `curMacTable` 조회 빈도 > 1 인 경우 ➔ **`GUARD_ANOMALY_MULTI_IP_MAC`** (Proxy-ARP 또는 MAC 복제 충돌).
     - `baseIpTable`에 동일 IP 부재 (`GUARD_DELTA_NEW`) 및 `isTrusted == 0` ➔ Baseline 전체와 `Guard_ComputeSimilarity` 대조:
       - `bestSim >= 50` ➔ **`isSoftTrusted = 1`** (`GUARD_ANOMALY_LAA_CHURN`, 오경보 유예).
       - `bestSim < 50` ➔ **`GUARD_ANOMALY_HARD_INTRUDER`** (미등록 LAA 또는 신규 미승인 단말 경보).
     - `baseIpTable`에 동일 IP 존재 ➔ MAC 불일치 시 **`GUARD_ANOMALY_IP_TAKEOVER`**, 고위험 포트(`21, 22, 23, 80, 445, 1433, 3306, 3389, 5900, 6379, 8080`) 신규 개방 시 **`GUARD_ANOMALY_RISKY_PORT_OPEN`** 할당 후 `GUARD_DELTA_CHANGED` 처리.
  3. **Pass 3 (이탈 호스트 탐지)**: `curIpTable`에 없는 Baseline IP를 `GUARD_DELTA_OFFLINE`으로 기록.
- **정밀 마이크로초 계측**: Windows `QueryPerformanceCounter` / POSIX `clock_gettime(CLOCK_MONOTONIC)`로 순수 C 엔진 실행 소요 시간(`elapsedMicroseconds`)을 반환합니다.

### 2.3 다중 시그널 Soft-Trust 유사도 점수 알고리즘 (`Guard_ComputeSimilarity`)
랜덤 MAC 전환 또는 DHCP 재할당 시 동일 기기 여부를 `0 ~ 100` 점수로 산출합니다.

| 판별 시그널 | 가중치 | 세부 조건 |
| :--- | :---: | :--- |
| **완전 MAC 일치** | `100` (즉시 확정) | I/G=0 유효 유니캐스트 12자리 Hex 일치 |
| **정규화 호스트명 일치** | `+50` | 공백·대소문자·`.local` mDNS 접미사 제거 후 비교 (`unknown`/`-` 제외) |
| **제조사 또는 OUI 옥텟 일치** | `+35` / `+30` | 유효 제조사명 동일(`+35`) 또는 상위 6니블 OUI 동일(`+30`) |
| **개방 포트 프로파일 중첩** | `+10 ~ +25` | `clamp((overlap * 25) / maxPorts, 10, 25)` |
| **LAA 랜덤 MAC 전환 보정** | `+15` | 현재 또는 기준 MAC이 `GUARD_MAC_FLAG_LAA_RANDOM`이고 기본 점수 `> 0`인 경우 |
| **최종 점수 상한** | **Cap `95`** | 비(非)MAC 동일 일치의 과신을 방지하기 위해 95점으로 클램프 |

### 2.4 Caller-Allocates C-ABI & JSON 브리지 (`Guard_AnalyzeTopologyJson`)
Go 백엔드와 DLL 간 서로 다른 힙 관리자로 인한 크래시 및 메모리 누수를 막기 위해 **호출자 버퍼 할당(Caller-Allocates)** 규약을 100% 준수합니다.
- 입력: `const char* inJson` (`{"current":[...],"baseline":[...]}`)
- 출력: Go가 사전 할당한 `outJson` 버퍼(`16,384 bytes`)에 요약 수치와 최대 20건의 핵심 경보(`alerts[]`)를 `json_escape` 처리해 안전하게 기록합니다.

---

## 3. Export API 요약 (`grid_topology_guard.h`)

```c
GRID_GUARD_API int Guard_GetDriverVersion(void);
GRID_GUARD_API int Guard_AnalyzeMacProfile(const char* rawMac, GuardMacProfile* outProfile);
GRID_GUARD_API int Guard_ComputeSimilarity(
    const GuardHostRecord* currentHost,
    const GuardHostRecord* refHost,
    char* outReason,
    int maxReasonLen
);
GRID_GUARD_API int Guard_AnalyzeSubnetTopology(
    const GuardHostRecord* currentHosts, int currentCount,
    const GuardHostRecord* baselineHosts, int baselineCount,
    GuardHostVerdict* outVerdicts, int maxVerdicts,
    GuardTopologySummary* outSummary
);
GRID_GUARD_API int Guard_AnalyzeTopologyJson(
    const char* inJson,
    char* outJson,
    int maxOutLen
);
```

---

## 4. 기존 11개 DLL 전체 감사 및 결함 수정 내역 (Comprehensive Audit Matrix)

신규 DLL 개발과 함께 기존 `native_dll/` 전체 11개 모듈을 정밀 감사하여 다음의 실질적 버그 및 보안/안정성 결함을 수정했습니다.

| 모듈명 | 발견된 주요 결함 (Audit Finding) | 적용된 수정 내역 (Fix Applied) |
| :--- | :--- | :--- |
| **`grid_oui_trie.c`** | • Wireshark `manuf`의 `/28`, `/36` CIDR 표기를 그대로 Hex 니블 추출기에 통과시켜 접두사에 `"28"`/`"36"`이 오염됨<br>• 3컬럼(`PREFIX\tSHORT\tFULL`) 파싱 누락<br>• 멀티스레드 초기화/검색/해제 시 경쟁 상태(Race) | • `/28`, `/36` 비트폭 사전 파싱 후 접두사 길이(`7`/`9` 니블)로 절단<br>• 3컬럼 탭 분리 및 `CRITICAL_SECTION` + `InterlockedCompareExchange` 스레드 안전성 확보 (`v2.5.1`) |
| **`oui_validator.cpp`** | • `serializeReportJson()`의 충돌 리포트에서 `"primary": "..." (Line X)` 형태의 **유효하지 않은 JSON 문법** 출력<br>• 충돌 레코드 `detectedBits`를 `24`로 하드코딩 | • 유효한 JSON 필드 `"primary"`, `"primaryLine"`, `"conflict"`, `"conflictLine"`으로 교정<br>• 3컬럼 `manuf` 파싱 보강 및 실제 `24/28/36`비트 자동 계산 적용 |
| **`grid_fingerprint_engine.h/.c`** | • `EXTRACT_STR` 매크로가 `""` 빈 문자열과 `\"` 이스케이프를 오파싱<br>• `outJson` 직렬화 시 따옴표/제어문자 미이스케이프<br>• Smart TV/Media, Game Console, MQTT/ONVIF 룰 미지원 | • 안전 JSON 문자열 파서 + `json_escape_str` 적용<br>• 카테고리 `13`(Smart TV/Media), `14`(Game Console) 및 MQTT(`1883/8883`), ONVIF(`8899`) 분류 규칙 추가 |
| **`grid_probe_engine.c`** | • `Probe_SweepSubnetAsync`/`Probe_BatchSweep`에서 스레드 안전하지 않은 `inet_ntoa()` 사용<br>• `malloc` 미초기화 구조체에 `strncpy(..., cap-1)` 호출로 NUL 종단 누락 위험<br>• `EnsureQpcInit()` 비원자적 초기화 | • `calloc(1, sizeof(WorkerTask))` 전환 및 비트 시프트 기반 스레드 안전 `snprintf` IP 포맷팅<br>• `InterlockedCompareExchange` 기반 원자적 QPC 초기화 (`v2.5.1`) |
| **`grid_port_iocp.c`** | • `DllMain(DLL_PROCESS_ATTACH)` 내부에서 `WSAStartup` 및 `InitializeCriticalSection` 호출 (Win32 Loader Lock 데드락 위험)<br>• `CreateThread` 실패 시 NULL 핸들이 `WaitForMultipleObjects`에 전달될 수 있음<br>• 결과 포트 배열 미정렬 | • `DllMain` ATTACH의 Winsock 호출 제거 및 원자적 `EnsureWinsock()` 도입<br>• 유효 `HANDLE` 압축 수집 후 `WaitForMultipleObjects` 실행 및 열린 포트 오름차순 정렬 적용 (`v2.5.1`) |
| **`grid_discovery.c`** | • mDNS 응답 파싱 시 12바이트 이후 `_services`/`_dns-sd` 에코 문자열을 호스트명으로 오반환하고 UTF-8 한글(>=0x80) 제거<br>• `strncpy` NUL 종단 누락 위험 및 SSDP `LOCATION:` 폴백 부재 | • DNS 라벨 길이 프리픽스 파서로 보일러플레이트(`_services`, `_dns-sd`, `_udp`, `_tcp`, `local`) 필터링 및 UTF-8 보존<br>• `snprintf` 기반 안전 복사 및 SSDP `LOCATION:` 대소문자 무시 폴백 추가 (`v2.5.1`) |
| **`grid_banner_grabber.c`** | • HTTP `Server:` 추출 시 원본 `response` 버퍼에 직접 `*lineEnd = '\0'`를 덮어써 이후 `<title>` 파싱이 **항상 차단되는 치명적 버그**<br>• 단일 `recv()` 호출로 분할 전송된 `<title>` 유실 | • 버퍼 비파괴 길이 계산 + 대소문자 무시 `banner_stristr()` 적용<br>• `</title>` 도달 또는 버퍼 한도(`8192B`)까지 다중 `recv()` 루프 구현 (`v2.5.1`) |
| **`grid_pcap_analyzer.c`** | • `LoadLibraryA("wpcap.dll")` 로드 후 `FreeLibrary()` 해제 누락<br>• `npcapChecked` 비원자적 접근 | • `DllMain(DLL_PROCESS_DETACH)`에서 `FreeLibrary(hWpcap)` 정리 및 `InterlockedCompareExchange` 적용 (`v2.5.1`) |
| **`grid_vault_driver.c`** | • 소프트웨어 암호화 경로(Mode 2)가 시드 없는 `rand()`로 IV 생성(매 실행 동일 IV 반복)<br>• 단순 키 반복 XOR + IV 미포함 암호문 해시 태그 + `memcmp` 타이밍 누설 | • Windows `CryptGenRandom`(`/dev/urandom`) CSPRNG IV 생성<br>• SHA-256 CTR 블록 스트림(`derivedKey || iv || blockIdx`) + 키 포함 무결성 태그 + 상수시간 태그 검증 적용 (`v2.5.1`) |
| **`grid_net_driver.c`** | • `DllMain(DLL_PROCESS_ATTACH)` 내부 `EnsureWinsock()` 호출 및 비원자적 초기화 | • `DllMain` ATTACH 제거 및 `InterlockedCompareExchange` 상태 머신 적용 (`v2.4.1`) |
| **`scripts/build-dll.js`** | • 기존에 `grid_net_driver.dll` 1종만 컴파일하고 나머지 DLL은 누락 | • 12개 전체 C/C++ DLL 자동 컴파일 및 `root/`, `winres/`, `dist_installer/` 동기화 오케스트레이터로 전면 업그레이드 |
