# 🛡️ Grid Topology Guard Native DLL (`grid_topology_guard.dll`) 기술 명세서 및 12대 DLL 감사·하드닝 보고서

> **모듈 ID**: Module 8 (Pure Custom Native C-ABI Engine)  
> **라이브러리 파일**: `grid_topology_guard.dll` (`native_dll/grid_topology_guard.h`, `native_dll/grid_topology_guard.c`)  
> **드라이버 버전**: `v2.6.1` (`GUARD_DRIVER_VERSION = 20601`) | **제품 릴리즈**: `v2.5.0`  
> **연동 엔드포인트**: `POST /api/topology-guard` (`main.go` ↔ `native_modules_bridge.go` / `native_modules_bridge_other.go`)  
> **최신 개정일**: 2026-11-13

---

## 1. 순수 창작 배경 및 아키텍처 공백 해소 (Architectural Gap)

기존 **Grid IP Scanner2**의 11개 DLL은 단일 호스트 단위 계측(Ping/ARP, 포트 스캔, 배너, OS TTL, OUI 단건 조회, 단일 금고 암복호화, 단일 기기 핑거프린팅)에 집중되어 있었습니다. 반면 **다수 호스트 간 상관관계 분석**, 즉 다음 5가지 핵심 연산은 JavaScript(`conflictDetector.ts`, `diffEngine.ts`)에만 의존하고 있었습니다.

1. **서브넷 스냅샷 델타 비교 (`+NEW` / `-OFF` / `!CHG` / `=SAME`)**
2. **동일 IP 내 MAC 변조(IP Takeover / ARP Spoofing) 및 동일 MAC의 다중 IP 점유(Proxy-ARP / MAC Cloning) O(N) 탐색**
3. **게이트웨이/인프라 L3 Proxy-ARP 정상 판별(`GUARD_ANOMALY_INFRA_PROXY_ARP`)과 악성 MAC 복제 경보의 분리**
4. **IEEE 802.3 LAA(Locally Administered Address) 랜덤 MAC과 가상 머신 NIC(QEMU, Docker, VirtualBox, Hyper-V)의 비트 수준 분리**
5. **DHCP IP 이동 및 스마트폰 랜덤 MAC 회전 환경에서 오탐지를 막기 위한 Soft-Trust 가중 유사도 점수 계산**

**`grid_topology_guard.dll`**은 이 공백을 채우기 위해 외부 의존성 0개(Zero Dependency)의 순수 C99 / C-ABI 엔진으로 신규 창작되어 전체 **12대 네이티브 DLL 체계**를 완성했습니다.

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

### 2.2 O(N) FNV-1a Open-Addressing 서브넷 충돌·토폴로지 해시 (`Guard_AnalyzeSubnetTopology` / `Guard_AnalyzeSubnetTopologyEx`)
최대 `GUARD_MAX_SUBNET_HOSTS` (512) 호스트에 대해 동적 메모리 크기를 고정한 **1024-슬롯 선형 탐사 해시 테이블** 3종(`baseIpTable`, `curIpTable`, `curMacTable`)을 `calloc`으로 단일 할당하고 작업 종료 시 즉시 `free`합니다.

- **해시 함수**: 32-bit FNV-1a (`offset = 2166136261u`, `prime = 16777619u`, 비트마스크 `& 1023`)
- **동작 파이프라인 (3-Pass)**:
  1. **Pass 1 (인덱싱)**: Baseline 호스트의 IP를 `baseIpTable`에, Current 호스트의 IP와 정규화 MAC 빈도를 각각 `curIpTable` 및 `curMacTable`에 O(N) 적재.
  2. **Pass 2 (Current 호스트 판정)**:
     - `curMacTable` 조회 빈도 > 1 인 경우:
       - `Guard_AnalyzeSubnetTopologyEx(..., gatewayIp)`로 전달된 게이트웨이 IP·`.1`/`.254` 게이트웨이 대역 또는 엔터프라이즈 L3 인프라 벤더(Cisco/Aruba/Fortinet 등, 소비자 브랜드 `asus`/`synology`/`qnap` 제외)와 연동된 다중 IP 클러스터인 경우 ➔ **`GUARD_ANOMALY_INFRA_PROXY_ARP`** (`isBenignProxyArp = 1`, 비알림 Info로 분류하고 `SoftTrust`/`HardIntruder`가 정상 Proxy-ARP 판정을 덮어쓰지 않도록 보호).
       - 그 외 일반/사설 단말 MAC 공유 ➔ **`GUARD_ANOMALY_MULTI_IP_MAC`** (MAC 복제 충돌 경보).
     - `baseIpTable`에 동일 IP 부재 (`GUARD_DELTA_NEW`) 및 `isTrusted == 0` (단, `isBenignProxyArp == 0`인 경우) ➔ Baseline 전체와 `Guard_ComputeSimilarity` 대조:
       - `bestSim >= 50` ➔ **`isSoftTrusted = 1`** (`GUARD_ANOMALY_LAA_CHURN`, 오경보 유예).
       - `bestSim < 50` ➔ **`GUARD_ANOMALY_HARD_INTRUDER`** (미등록 LAA 또는 신규 미승인 단말 경보).
     - `baseIpTable`에 동일 IP 존재 ➔ MAC 불일치 시 **`GUARD_ANOMALY_IP_TAKEOVER`**, 포트 집합 양방향 변동(고위험 포트 `21, 22, 23, 80, 445, 1433, 3306, 3389, 5900, 6379, 8080` 신규 개방 또는 기존 포트 닫힘) 시 **`GUARD_ANOMALY_RISKY_PORT_OPEN`** / `ports_changed` 기록 후 `GUARD_DELTA_CHANGED` 처리.
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

### 2.4 Caller-Allocates C-ABI & JSON 방어 브리지 (`Guard_AnalyzeTopologyJson`)
Go 백엔드와 DLL 간 서로 다른 힙 관리자로 인한 크래시 및 메모리 누수를 막기 위해 **호출자 버퍼 할당(Caller-Allocates)** 규약을 100% 준수합니다.
- 입력: `const char* inJson` (`{"gatewayIp":"...","current":[...],"baseline":[...]}`) — 중첩 깊이·따옴표 인식 파서로 문자열 내부 특수문자 오파싱 차단 및 음수 포트(`[-23]`) 방어 스킵 적용.
- 출력: Go가 사전 할당한 `outJson` 버퍼(`16,384 bytes`)에 요약 수치(`infraProxyArpCount` 포함)와 최대 20건의 핵심 경보(`alerts[]`)를 `json_escape` 처리해 안전하게 기록합니다.

---

## 3. Export API 요약 (`grid_topology_guard.h` — v2.6.1)

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
GRID_GUARD_API int Guard_AnalyzeSubnetTopologyEx(
    const GuardHostRecord* currentHosts, int currentCount,
    const GuardHostRecord* baselineHosts, int baselineCount,
    const char* gatewayIp,
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

## 4. 전체 12개 DLL 보안·성능 하드닝 및 Deep Audit 결함 수정 내역

신규 배치 스캔 2대 함수(`Probe_SweepCidrAsyncBatch`, `PortScan_IocpMultiHostSweep`) 및 `grid_topology_guard.dll` 구축과 함께 `native_dll/` 전체 12개 모듈을 전수 자아성찰(Deep Audit)하여 보안 취약점과 동시성 결함을 일괄 해결했습니다.

| 모듈명 | 감사 및 보안/성능 이슈 (Audit Finding) | 적용된 수정 및 신규 기능 (Fix & Upgrade) |
| :--- | :--- | :--- |
| **`grid_topology_guard.c` (`v2.6.1`)** | • `+NEW` 정상 Proxy-ARP 판정이 `SoftTrust`/`HardIntruder`에 의해 덮어써지는 현상<br>• `ports_changed` 단방향 비교 및 음수 포트 입력 취약점<br>• 소비자 브랜드(`asus`/`synology`/`qnap`) 인프라 오분류 위험 | • `isBenignProxyArp` 플래그 보존, 양방향 포트 집합 비교, 음수 포트 스킵<br>• `Guard_AnalyzeSubnetTopologyEx(gatewayIp)` 및 `GUARD_ANOMALY_INFRA_PROXY_ARP` 신설 |
| **`grid_probe_engine.c` (`v2.6.0`)** | • 호스트당 `IcmpCreateFile` 반복 오버헤드<br>• `ArpBatchWorker`와 비동기 ICMP 루프 간 `isAlive`/`rttMs` 동시 쓰기 레이스<br>• `WAIT_TIMEOUT` 시 미완료 IRP의 스택 슬랩 덮어쓰기 위험 및 Reply 버퍼 여유 부족 | • **신규 `Probe_SweepCidrAsyncBatch`**: 단일 공유 ICMP 핸들(`IcmpSendEcho2` 64-이벤트 윈도우) + 8-스레드 ARP 풀<br>• 워커는 `mac`/`isArpAlive`만 기록 후 Join 이후 일괄 병합<br>• `WaitForSingleObject(..., 0)` + 핸들 리셋, Reply 슬랙 `+64B`, `_WIN32_WINNT >= 0x0601` |
| **`grid_port_iocp.c` (`v2.6.0`)** | • 다중 호스트 대규모 포트 스캔 시 스레드 폭발 병목<br>• 종료 시 `CancelIoEx` 및 `activeInFlight` 드레인 부재, `(ULONGLONG)` 오버플로, `port == 0` 및 `SO_UPDATE_CONNECT_CONTEXT` 미검증 | • **신규 `PortScan_IocpMultiHostSweep`**: Win32 `CreateIoCompletionPort` + `ConnectEx` 기반 진정한 IOCP 논블로킹 다중 호스트 스위프<br>• `CancelIoEx` + 인플라이트 드레인 대기, `(ULONGLONG)` 캐스트, `port == 0` 스킵, 반환값 검증 |
| **`grid_vault_driver.c` & `secure_vault.cpp` (`v2.6.0`)** | • 10,000회 PBKDF2 루프 내부에서 매 반복마다 CryptoAPI/BCrypt 프로바이더 핸들 2만 회 재오픈 (심각한 성능 병목)<br>• 레거시 솔트 없는 고정 키 파생 및 느슨한 Base64 디코딩 | • **`GVAULT11` 포맷**: 16B CSPRNG 솔트 + PBKDF2-HMAC-SHA256(10,000회)<br>• **256B 스택 고속 경로(Fast-Path)** 로 프로바이더 핸들 재오픈 20,000회 완전 제거<br>• 엄격한 Base64 길이/패딩/문자 검증 적용 |
| **`grid_pcap_analyzer.c`** | • `LoadLibraryA("wpcap.dll")` 경로 하이재킹 가능성 및 핸들 해제 누락 | • `LoadLibraryExW(L"wpcap.dll", NULL, LOAD_LIBRARY_SEARCH_SYSTEM32)` 시스템 경로 고정 및 `FreeLibrary` 정리 |
| **`native_modules_bridge.go`** | • `syscall.NewLazyDLL` 기본 검색 경로 사용 시 DLL 하이재킹 위험 | • 실행 파일 디렉토리 기준 `LoadLibraryExW(LOAD_LIBRARY_SEARCH_APPLICATION_DIR)` 경로 고정 로드 |
| **`grid_fingerprint_engine.h/.c`** | • `EXTRACT_STR`의 이스케이프 오파싱, 제어문자 미이스케이프, 음수 정수 입력 취약점 | • 중첩/따옴표 인식 안전 JSON 파서, 음수 포트 방어, `json_escape_str`, 카테고리 `13`/`14` 지원 |
| **`grid_oui_trie.c` & `oui_validator.cpp`** | • `/28`, `/36` CIDR 표기 접두사 오염 및 유효하지 않은 충돌 리포트 JSON 문법 | • 비트폭 사전 파싱, `CRITICAL_SECTION` 스레드 안전화, 정규 JSON 스키마 교정 |
| **`grid_discovery.c` & `grid_banner_grabber.c`** | • mDNS `_services` 에코 오반환, UTF-8 한글 손실, `Server:` 추출 시 버퍼 파괴 버그 | • DNS 라벨 파서, UTF-8 보존, 비파괴 길이 계산 및 다중 `recv()` 루프 구현 |
| **`scripts/build-dll.js` & `native_dll/build_all_dlls.bat`** | • 단일 DLL만 빌드되던 기존 한계 | • 12개 전체 C/C++ DLL 자동 컴파일 및 루트/`dist_releases/`/`winres/` 동기화 파이프라인 확립 |

