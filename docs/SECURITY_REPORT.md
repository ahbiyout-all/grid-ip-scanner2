# 🛡️ Grid IP Scanner2 - 보안 점검 보고서 (Security Audit Report)

> **보안 검증 대상**: Grid IP Scanner2 v2.6.0 (12-DLL Native Architecture + Packet Telemetry & Topology Guard)  
> **점검 항목**: PBKDF2+AES-256-GCM 암호화, 데이터 무결성, 네트워크 격리, DLL 경로 고정·JSON 방어, Live ARP 정규화 검증, Proxy-ARP 비알림 분리, 백신 오진 대응  
> **최종 판정**: ✅ PASS (보안 수준 최우수)

---

## 1. 데이터 보관 및 암호화 점검 (Data Storage & Encryption)

- **PBKDF2-HMAC-SHA256 & AES-256-GCM (`GVAULT11`) 암호화 검증**:
  - 사용자 디바이스 별칭(Alias) 및 스냅샷 DB 보관 시 `grid_vault_driver.dll` / `secure_vault.dll` (`v2.6.0`) C/C++ 네이티브 암호화 엔진을 통과합니다.
  - **`GVAULT11` 하드닝 포맷**: 매 암호화 시 16바이트 CSPRNG 솔트(`BCryptGenRandom` / `CryptGenRandom` / `/dev/urandom`)를 생성해 **PBKDF2-HMAC-SHA256(10,000회 반복)** 키 파생을 수행하며, 256바이트 스택 고속 경로(Fast-Path)로 성능 병목 없이 대용량 항목을 암복호화합니다.
  - GCM(Galois/Counter Mode) 128비트 인증 태그 및 상수시간 태그 검증, 엄격한 Base64 패딩 검증을 적용하여 외부 무단 수정·위변조 시 복호화 단계에서 `VAULT_ERR_AUTH_FAILED (-3)` 오류를 반환하고 즉시 차단합니다.
- **메모리 보안**:
  - 메모리 상의 평문 데이터, 솔트, 파생 키는 연산 직후 `SecureZeroMemory` / `ZeroMemory` / `memset` 프로토콜로 소거하여 메모리 덤프 공격에 대비합니다.

---

## 2. 네트워크 및 데이터 프라이버시 (Network Isolation & Zero Telemetry)

- **외부 전송 통제**:
  - 외부 클라우드나 사외 서버로 어떠한 원격 측정(Telemetry) 데이터도 수집 또는 전송하지 않습니다.
  - 모든 ICMP/ARP/IOCP 스캐닝, OUI/UPnP/mDNS 식별 및 토폴로지 분석은 100% 로컬 네트워크 인터페이스에서 직접 수행됩니다.
- **Port Binding Security**:
  - 로컬 내장 Go 서버는 `127.0.0.1` 루프백 인터페이스에만 바인딩되어 외부 네트워크망에서의 웹 UI 무단 접근을 방지합니다.

---

## 3. 낯선 기기 감시, LAA 역추적 & 게이트웨이 Proxy-ARP 분리

- **OUI 시맨틱 다중 시그널 & `grid_topology_guard.dll` (`v2.6.1`)**:
  - MAC 주소만으로 판단하는 한계를 극복하기 위해 OUI 코드, 호스트명, mDNS 레코드, UPnP XML, 개방 포트 프로필을 복합 점수화하여 사설 랜덤 MAC(LAA)도 교차 역추적합니다.
- **게이트웨이 Proxy-ARP 정상 판별 & Soft Trust Grace Period**:
  - 학교·캠퍼스·기업망의 L3 스위치 Proxy-ARP 또는 가상 게이트웨이(VIP) 동일 MAC 다중 IP 응답은 **`Gateway Proxy-ARP` 비알림 Info**로 안전하게 분리하고, 일반 소비자 브랜드(`asus`, `synology`, `qnap`)는 인프라 예외에서 제외하여 실제 악성 MAC 복제/스푸핑 경보를 은폐하지 않습니다.
- **네이티브 패킷 정밀 텔레메트리 (`grid_pcap_analyzer.dll v2.6.2`) & Live ARP 정규화 대조**:
  - 단일 호스트 패킷 정밀 점검(`/api/packet-inspect`) 시 C99 DLL과 Go 폴백 엔진 모두 콜론(`:`), 하이픈(`-`), 점(`.`), 공백을 제거한 12자리 대문자 Hex 정규화(`normalizeMacHex12`)를 공통 적용하여 포맷 차이에 의한 ARP 스푸핑 오탐(False Positive)을 원천 차단하고, 실질적인 L2 MAC 변조 위험만 정확히 경보합니다.
- **3계층 인터랙티브 토폴로지 & 다중 서브넷/VLAN 대역 격리**:
  - `/api/topology-map` 및 `multiSubnetManager.ts`는 로컬 메모리·저장소 내 서브넷별 독립 스캔 캐시(`grid_subnet_cache_v1`)와 VLAN 태그 메타데이터를 대역 단위로 격리 보관하며 외부 전송 없이 교차 대역 이상 징후를 안전하게 집계합니다.

---

## 4. DLL 바이너리 모듈 보안 (Native Code Security & Path Pinning)

- **Safe DLL Path Pinning (`LoadLibraryExW`)**:
  - 12대 네이티브 DLL 로드 시 `LOAD_LIBRARY_SEARCH_APPLICATION_DIR` 경로 고정 및 `wpcap.dll`의 `LOAD_LIBRARY_SEARCH_SYSTEM32` 고정을 적용해 DLL 하이재킹(DLL Side-Loading) 공격을 원천 차단합니다.
- **JSON 입력 방어 · Loader Lock & 배치 경계 안전화**:
  - 네이티브 C JSON 브리지(`grid_topology_guard.c`, `grid_fingerprint_engine.c`)는 중첩 깊이·따옴표 인식 파서 및 음수 포트(`[-23]`) 방어 로직을 탑재했습니다.
  - Win32 DLL 진입점(`grid_pcap_analyzer.c`, `grid_port_iocp.c`, `grid_net_driver.c`)은 `DLL_PROCESS_DETACH` 시 `lpvReserved == NULL` 동적 언로드 조건에서만 `FreeLibrary`/`WSACleanup`/`DeleteCriticalSection`을 호출해 프로세스 종료 Loader Lock 교착을 차단하며, `grid_port_iocp.c`·`grid_probe_engine.c`는 다중 호스트 작업량(`ipCount` 상한), `qpcFreq` 0-나눗셈 방지 및 `CreateEventA` 할당 검증을 준수합니다.
- **Fallback 안전장치**:
  - DLL 로드 실패 또는 비-Windows 환경 발생 시 Go/WebAssembly 내장 `crypto` 및 순수 Go 토폴로지 모듈로 무중단 폴백하여 가용성을 보장합니다.

---

## 5. A4 최적화 PDF 보안 감사 보고서 무결성 (A4 Audit Report Engine)

- **100% 로컬 클라이언트 생성**:
  - 외부 렌더링 서버나 서드파티 클라우드를 경유하지 않고, `services/reportGenerator.ts` 내장 스마트 페이지네이션 엔진을 통해 브라우저/로컬 메모리 상에서만 PDF 바이너리를 직접 생성합니다.
- **A4 규격 정합성 및 기밀 등급 표기**:
  - 인쇄 시 행 잘림 없는 794x1123px A4 페이지 모델 적용 및 매 페이지 하단 `CONFIDENTIAL` 보안 등급과 동적 페이지 번호 동기화.

---

## 6. 백신 오진(False Positive) 방어 및 V3 대응

- **12대 네이티브 DLL 분리 설치 & 컴파일 경로 난독화 (`-trimpath`)**:
  - 정식 인스톨러(`Setup.exe`) 설치 시 12개 네이티브 DLL을 독립 바이너리로 분리 배치하고, `-trimpath` 및 정적 링크(`-static-libgcc -static-libstdc++`)를 적용해 휴리스틱 오탐 점수를 최소화했습니다.
- **공식 오진 소명 및 예외 가이드**:
  - `docs/V3_FALSE_POSITIVE_GUIDE.md`를 통해 안랩 Smart Defense(ASD) 오탐 분석 및 검사 예외 등록 지침을 제공합니다.

---

## 7. 로컬 HTTP API 메서드 통제 · 서버 타임아웃 및 클라이언트 무결성 (v2.6.0 Deep Audit)

- **상태 변경/OS 명령/매직 패킷 엔드포인트 `POST` 전용 통제 (`main.go`, `tray_engine.go`, `services/nativeModulesService.ts`)**:
  - Wake-on-LAN 브로드캐스트(`/api/wol`), 프로세스 호출(`/api/remote-action`), Windows 시스템 유틸리티 실행(`/api/windows-util` 내 `flushdns`, `ncpa.cpl`, `firewall`, `autostart` 변경, `service-install`, `service-stop`), OUI 캐시 저장(`/api/oui/validate-dll?save=true` — 네이티브/Go 폴백 경로 모두 적용), 창/트레이 제어(`/api/window-closed`, `/api/tray-minimize`, `/api/tray/test-notify`) 엔드포인트에 대해 `GET` 요청 실행을 차단하고 명시적 `POST` 메서드만 허용합니다.
  - `/api/close-to-tray`는 잘못된 JSON 본문이나 비정상 `enabled` 문자열 입력 시 상태가 묵시적으로 켜지지 않도록 `400 Bad Request`를 반환합니다.
  - `/api/info`, `/api/scan`, `/api/native-modules`, `/api/discovery`, `/api/banner-grab`, `/api/os-detect`, `/api/arp-spoof-check`, `/api/subnets/discover`, `/api/tray/*`에 대해 허용된 HTTP 메서드(`GET`/`POST`/`DELETE`/`OPTIONS`) 외 요청을 `405 Method Not Allowed`로 차단하며, `/api/packet-inspect` 및 `/api/banner-grab`은 JSON 구문과 TCP 포트 범위(`0–65535` / `1–65535`) 및 정규화된 IP 입력을 검증합니다.
- **HTTP 서버 헤더 타임아웃 적용 (`main.go`)**:
  - Windows 서비스 및 데스크톱/프리뷰 `http.Server` 인스턴스에 `ReadHeaderTimeout: 10s`를 적용해 장시간 `/api/scan` SSE 스트리밍은 방해하지 않으면서 불완전한 헤더 대기(Slowloris) 연결 점유를 방지합니다.
- **프론트엔드 출력 이스케이프 · 외부 URL 검증 및 스케줄 입력 보강 (`reportCenterService.ts`, `updateChecker.ts`, `ScheduleModal.tsx`)**:
  - `reportCenterService.ts` 인터랙티브 HTML 메타 헤더의 모든 `dataset.subnet` 보간에 `escapeHtml(...)`을 일관 적용하고, `updateChecker.ts`는 GitHub Releases 응답 및 로컬 캐시 URL을 HTTPS + 공식 GitHub 도메인 허용 목록(`github.com`, `objects.githubusercontent.com`, `release-assets.githubusercontent.com`, `codeload.github.com`)으로 검증합니다.
  - `ScheduleModal.tsx`는 3옥텟 IPv4 서브넷 유효성을 저장 전 엄격 검증하며, `utils_windows.go` DIB 픽셀 포인터 처리의 `unsafe.Pointer` 안전성까지 정비했습니다.
- **비파괴적 Windows 방화벽 예외 등록 (`utils_windows.go`)**:
  - 시스템 트레이 메뉴의 방화벽 동작(`IDM_TRAY_FIREWALL`)이 시스템 전체 방화벽 정책을 초기화하던 `netsh advfirewall reset` 대신 관리자 권한 확인 후 `ensureFirewallRulesSilently()`를 호출해 Grid IP Scanner2 예외 규칙만 안전하게 재등록하도록 개선했습니다.
- **Electron 데스크톱 영구 설정 보존 (`main.js`)**:
  - 앱 종료(`terminateApplicationCleanly`, `window-all-closed`) 시 휘발성 HTTP 캐시(`clearCache`)만 비우고 `localStorage` 및 `userData` 디렉터리를 유지해 저장된 별칭, 스냅샷, 스케줄, 다중 서브넷/VLAN 프로파일이 재시작 후에도 손실되지 않도록 보호합니다.
- **네이티브 `DllMain`·SMB 버퍼·트레이 API 입력 경계 & 다중 브라우저 정리 보강 (`v2.6.0` 4차 Audit)**:
  - `name_resolver.go`의 NTLMSSP `TargetInfo` 파싱에 부호 없는 오프셋·길이 경계 검사를 추가하고, `/api/heartbeat` 메서드 통제 및 UAC 관리자 재실행 시 5종 Chromium 앱 창(`Edge`/`Chrome`/`Whale`/`Brave`/`Vivaldi`) 일괄 정리 필터를 적용했습니다.
  - `/api/tray/state`, `/api/tray/config`, `/api/tray/action`, `/api/tray/report-events`에 본문 크기 제한(`io.LimitReader`), 3옥텟 IPv4 서브넷·병합 IP 범위(`startIp <= endIp`)·`HH:MM` 방해금지 시간 검증, 허용 액션 화이트리스트(`400`) 및 이벤트 배치 상한(100건)을 적용했습니다.
  - `scripts/build-distribution.js` 언팩·매니페스트 누락(`grid_topology_guard.dll`)과 `build_all_dlls.bat` 지연 확장 누락을 함께 교정했습니다.

---

© 2026 **Grid IP Scanner2 Security Team**. Confidential Security Audit Record.
