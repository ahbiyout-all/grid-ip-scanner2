# 📦 Grid IP Scanner2 - 배포 전략 및 유료화 아키텍처 기술 사양서
## (Distribution Strategy, Installer vs. Portable, and Monetization Architecture)

본 문서는 **Grid IP Scanner2**의 무료(Community) 및 유료(Pro / Enterprise) 사용자를 위한 배포 모델, 포터블(Portable)과 인스톨러(Installer) 앱의 기술적 비교 분석, 그리고 단일 바이너리 기반의 기능 플래그(Feature Gate) & 비대칭 암호화 라이선싱 아키텍처를 총망라한 개발 및 릴리즈 가이드입니다.

---

## 1. 개요 및 배경

네트워크 스캐너 유틸리티 시장에서 사용자는 크게 **두 가지 집단**으로 양분됩니다:
1. **무료 사용자 (일반 사용자 및 가벼운 점검)**: "설치 없이 다운로드 즉시 1초 만에 실행되어 빠르게 IP를 확인하는 가벼움"을 최우선으로 여깁니다.
2. **유료 사용자 (기업 IT 관리자, 전산팀, 시스템 엔지니어)**: "사내 보안 감사 통과, 시작메뉴 등록, PC 부팅 시 24시간 백그라운드 상주 모니터링, 일괄 자동 배포"를 필수로 요구합니다.

따라서 Grid IP Scanner2는 무료 사용자에게는 극강의 접근성을 가진 **단일 무설치 포터블(.exe)**을 제공하여 바이럴을 극대화하고, 유료 사용자에게는 전문성을 갖춘 **정식 윈도우 인스톨러(Setup.exe)**를 메인으로 제공하되 **외근·출장용 포터블(.zip)**을 듀얼 번들로 제공하는 하이브리드 전략을 채택합니다.

---

## 2. 포터블(Portable) vs 인스톨러(Installer) 비교 분석

| 비교 항목 | 🚀 포터블 에디션 (무설치 단일 파일) | 📦 인스톨러 에디션 (정식 설치형 패키지) |
| :--- | :--- | :--- |
| **타깃 사용자** | 무료 커뮤니티 사용자, 현장 긴급 점검 엔지니어 | 유료 Pro/Enterprise 고객, 기업 IT 관리자, 사내 전산팀 |
| **설치 및 배포** | 다운로드 후 즉시 더블클릭 실행 (Zero-Install) | Inno Setup 기반 정규 윈도우 설치 마법사 제공 |
| **시스템 흔적** | 레지스트리 미등록, 파일 삭제 시 완전 제거 | `Program Files` 배치, 제어판 '프로그램 추가/제거' 등재 |
| **기업 보안 감사** | '미인가 실행 파일'로 EDR/DLP에 탐지될 위험 존재 | 정식 게시자·버전 명시로 기업 소프트웨어 자산 관리 통과 |
| **상시 모니터링** | 사용자가 매번 직접 실행해야 함 | 부팅 시 시스템 트레이 자동 실행 (24시간 백그라운드 감시) |
| **방화벽 설정** | 첫 스캔 시 윈도우 보안 경고 팝업 발생 가능 | 설치 과정에서 Windows Defender 방화벽 인바운드 자동 허용 |
| **일괄 무인 배포** | 개별 PC 수동 복사 필요 | `/VERYSILENT` 스위치를 통한 Active Directory GPO 대량 배포 |
| **업데이트 방식** | 수동 재다운로드 (인앱 원클릭 교체 기능 지원 예정) | 백그라운드 자동 업데이트 또는 인스톨러 재실행으로 갱신 |

---

## 3. 유료 사용자에게 인스톨러가 필수적인 핵심 사유

1. **기업 컴플라이언스 및 자산 관리 (Asset Management)**
   * 기업 전산망에서는 사내 보안 솔루션이 설치되지 않은 무설치 exe의 실행을 차단하는 경우가 많습니다. 제어판에 정식 등록되는 인스톨러는 기업 구매의 제1 선결 조건입니다.
2. **지불 가치에 대한 신뢰도 (Perceived Commercial Value)**
   * 유료 결제 고객에게 완성도 높은 설치 마법사(라이선스 동의, 설치 폴더 선택, 바로가기 생성)는 "신뢰할 수 있는 전문 소프트웨어"라는 확신을 제공합니다.
3. **24/7 침입 탐지 및 상시 모니터링 활성화**
   * 유료 핵심 기능인 "신규 단말기 감지 알림", "IP 충돌 경고"는 PC가 켜질 때마다 백그라운드(시스템 트레이)에서 항상 동작해야 유효합니다.
4. **Active Directory / GPO 사내 일괄 배포**
   * 대규모 사업장(50~500석) 관리자는 전산실에서 명령어 한 줄로 전사 PC에 소프트웨어를 조용히 설치(`Silent Install`)할 수 있어야 합니다.

---

## 4. 하이브리드 제품 티어 및 배포 매트릭스

```
┌────────────────────────────────────────────────────────────────────────┐
│                        공식 배포 웹사이트 / GitHub                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌───────────────────────────────┐ ┌──────────────────────────────────────┐
│ 🆓 Free Community Edition     │ │ 💎 Pro / Enterprise Edition          │
│ • 파일명: Grid_IP_Scanner2.exe│ │ • 구매 방식: 라이선스 키 결제        │
│ • 형태: 단일 무설치 포터블    │ │ • 다운로드 제공 (듀얼 번들):         │
│ • 핵심 기능:                  │ │   1) [권장] 정식 인스톨러 (Setup.exe)│
│   - 16x16 시각화 그리드 맵    │ │      - 제어판, 방화벽, 부팅 자동실행 │
│   - 고속 ICMP Ping 스캔       │ │   2) [보너스] 엔지니어용 포터블 (.zip)│
│   - 9만 건 오프라인 OUI 제조사│ │      - 외근/출장 시 USB 점검용       │
│   - 5단계 적응형 런처         │ │ • 독점 유료 기능:                    │
│   - 비상 네이티브 메모장 보고서│ │   - 원격 부팅 (Wake-on-LAN)          │
│                               │ │   - 낯선 기기 감시 (Intruder Watch)  │
│                               │ │   - 포트 정밀 분석 & 서비스 식별     │
│                               │ │   - 과거/현재 스캔 Diff 비교         │
│                               │ │   - 24시간 실시간 백그라운드 감시    │
│                               │ │   - PDF/Excel 정밀 진단 리포트 출력  │
│                               │ │   - C클래스 다중 서브넷(/16, /23 등) │
└───────────────────────────────┘ └──────────────────────────────────────┘
```

---

## 5. 선(先)개발 후 순차 개방 아키텍처 (Feature Flag & Licensing)

무료 에디션과 유료 에디션의 소스코드를 분리하지 않고, **단일 통합 코드베이스**에서 비대칭 암호키를 통해 기능을 제어합니다.

### 5.1. 라이선스 티어 및 기능 플래그 정의 (`types.ts`)
```typescript
export type LicenseTier = 'free' | 'pro' | 'enterprise';

export interface LicenseInfo {
  tier: LicenseTier;
  licensedTo: string;       // 구매자 이메일 또는 기업명
  licenseKey: string;       // 암호학적 서명 키
  issuedAt: string;         // 발급일자
  expiresAt?: string;       // 만료일자 (영구 라이선스는 undefined)
  maxSubnets: number;       // 허용 서브넷 수 (Free: 1, Pro: 5, Enterprise: 무제한)
  features: {
    visualGrid: boolean;        // 기본 16x16 그리드 (모두 허용)
    fastPing: boolean;          // 초고속 Ping 스캔 (모두 허용)
    ouiLookup: boolean;         // 9만 건 OUI 제조사 조회 (모두 허용)
    portScanDeep: boolean;      // 1~65535 포트 정밀 스캔 & 서비스 배너 (Pro+)
    diffCompare: boolean;       // 과거 스캔과 현재 스캔의 차이 비교 (Pro+)
    autoMonitor: boolean;       // 24시간 상시 감시 & 시스템 알림 (Pro+)
    exportReport: boolean;      // PDF/Excel 상세 진단 리포트 (Pro+)
    multiSubnet: boolean;       // 다중 C클래스/B클래스 동시 스캔 (Enterprise)
    remoteBoot: boolean;        // 원격 부팅 (Wake-on-LAN / WoL 매직 패킷) (Pro+)
    intruderDetection: boolean; // 낯선 기기 실시간 감시 & Soft Trust 침입 탐지 (Pro+)
  };
}
```

### 5.2. 비대칭 암호화(Ed25519) 오프라인 인증 원리
* **인터넷 불필요**: 폐쇄망이나 선박, 공장 자동화 라인에서도 동작해야 하므로 온라인 인증 서버 의존성을 제거합니다.
* **라이선스 키 구조**: `BASE64( JSON_PAYLOAD + ED25519_SIGNATURE )`
* **검증 방식**: 바이너리 내부에 내장된 공개키(Public Key)로 무결성을 검증하여 변조 및 가짜 키 생성을 원천 차단합니다.

### 5.3. 30일 Pro 체험 라이선스(Trial License) 발급 정책
* **체험 라이선스 키**: `GRID-PRO-TRIAL-2026`, `GRID-PRO-DEMO`, `PRO-DEMO`, `DEMO-PRO` 등 데모 키 규격 지원.
* **동적 30일 유효기간 산정**:
  - 활성화 시점(`new Date()`) 기준으로 `expiresAt`을 30일 뒤로 동적 계산하여 로컬 저장소에 안전하게 보관.
  - 고정된 만료일로 인한 기한 경과 오류를 방지하고 사용자가 처음 데모 키를 입력한 시점부터 30일간 온전한 평가 기간을 보장.
* **체험판 제공 혜택**:
  - Pro 에디션 전 기능(4색 스냅샷 Diff 비교 분석, 25개 심층 포트 스캐닝, A4 보안감사 PDF 리포트 생성, 최대 5개 서브넷 관리)을 30일간 무제한 이용.
  - 만료 시 자동으로 무료 커뮤니티 티어로 안전하게 전환되며 기존 스캔 데이터는 손실 없이 보존됨.

---

## 6. 윈도우 인스톨러(Inno Setup & Go Fallback) 세부 명세

* **설치 스크립트 & 빌더 위치**: `installer/Grid_IP_Scanner2_Setup.iss`, `installer/build-installer.js`, `installer/setup_builder.go`
* **빌드 출력물**: `Grid_IP_Scanner2_v{VERSION}_Setup.exe`
* **주요 자동화 및 폴백 기능**:
  1. **Dual-Compiler 인스톨러 엔진**: Inno Setup 6(ISCC)이 시스템에 설치되어 있으면 정규 Inno Setup 인스톨러를 빌드하고, 미설치 환경에서는 고성능 Go 스탠드얼론 인스톨러 빌더(`setup_builder.go`)로 자동 전환하여 100% 보장 빌드.
  2. **공식 안내 대화상자 & 프로세스 정지**: 설치 시작 시 안내 팝업을 출력하고, 기존에 실행 중인 `Grid IP Scanner2` 프로세스를 안전 정지(`taskkill /F`)하여 파일 잠금 현상 방지.
  3. **설치 경로 및 AppData 자동 폴백**: 기본 `{autopf}\Grid IP Scanner2` (64비트 표준 `Program Files`)에 배치하며, 쓰기 권한 제한 시 `%LOCALAPPDATA%\Programs\Grid IP Scanner2`로 자동 대체 설치.
  4. **단축 아이콘**: 시작 메뉴 프로그램 그룹 및 바탕화면 바로가기 자동 생성.
  5. **Windows 방화벽 사전 조용한 자동 예외 등록**:
     - **기본 앱 이름 규칙**: `Grid IP Scanner2`, `Grid IP Scanner2 (Inbound)`, `Grid IP Scanner2 (Outbound)`
     - **버전 정보 포함 규칙**: `Grid IP Scanner2 v{VERSION}`, `Grid IP Scanner2 v{VERSION} (Inbound)`, `Grid IP Scanner2 v{VERSION} (Outbound)`
     ```cmd
     netsh advfirewall firewall add rule name="Grid IP Scanner2" dir=in action=allow program="{app}\Grid IP Scanner2.exe" enable=yes profile=any
     netsh advfirewall firewall add rule name="Grid IP Scanner2 (Inbound)" dir=in action=allow program="{app}\Grid IP Scanner2.exe" enable=yes profile=any
     netsh advfirewall firewall add rule name="Grid IP Scanner2 (Outbound)" dir=out action=allow program="{app}\Grid IP Scanner2.exe" enable=yes profile=any
     ```
  6. **언인스톨 클린업**: 제어판 제거 시 기본 이름 및 버전 정보 포함 방화벽 규칙 모두 자동 삭제 (Silent clean)
  7. **무인 일괄 설치(Silent Install) 스위치 지원**:
     ```cmd
     Grid_IP_Scanner2_v2.3.2_Setup.exe /VERYSILENT /SUPPRESSMSGBOXES /NORESTART
     ```

---

## 7. 개발 준비 및 단계별 실행 로드맵

1. **1단계 (기반 구축 - 완료)**:
   * 포터블/인스톨러 배포 전략 공식 기술 문서화 (`docs/DISTRIBUTION_AND_TIER_STRATEGY.md`)
   * 시스템 공유 타입에 `LicenseTier`, `FeatureFlag`, `LicenseInfo` 인터페이스 탑재 (`types.ts`)
   * Inno Setup 인스톨러 컴파일러 스크립트 작성 (`installer/Grid_IP_Scanner2_Setup.iss`)
   * 인스톨러 자동 패키징 빌드 오케스트레이터 작성 (`installer/build-installer.js`)
2. **2단계 (고급 기능 선개발, 기능 플래그 및 배포 파이프라인 연동 - 완료)**:
   * 과거-현재 스캔 스냅샷 비교(Diff) 엔진 개발 (`services/diffEngine.ts`)
   * 상세 포트 스캐너 및 서비스 배너 탐지 모듈 고도화 (`services/portScanner.ts`)
   * A4 규격 전문 보안 감사 보고서 생성기 연동 (`services/reportGenerator.ts`)
   * 비대칭 암호키(Ed25519) 오프라인 라이선스 매니저 및 UI 해금 컴포넌트 개발 (`services/licenseManager.ts`)
   * GitHub Releases 기반 실시간 자동 업데이트 체계 및 안드로이드 APK 생성 파이프라인 완성
   * 스마트 엣지-투-엣지 아이콘 크롭, 6단계 멀티레이어 ICO 및 PE 리소스 직접 패칭 파이프라인 완비
3. **3단계 (상용 릴리즈 & 스토어/결제 연동 - 진행 중)**:
   * Gumroad / Paddle 디지털 결제 연동 (라이선스 키 자동 발급)
   * 공식 블로그 및 홈페이지(www.cisnet.co.kr)에 듀얼 다운로드 센터 개설 및 배포

---

## 8. Pro 기능 제한 기준 및 신규 Pro 기능 추천 전략 (Feature Tiering & Roadmap)

기업 및 전문 IT 관리자가 기꺼이 구매를 결정할 수 있도록 **"무료 사용자의 편의성은 유지하되, 전문 관리·보안·자동화 영역을 확실한 Pro/Enterprise 독점 기능으로 분리"**하는 기준 및 신규 기능 로드맵입니다.

### 8.1. 🔒 Pro 기능으로 제한할 핵심 항목 (Core Pro Restrictions)

| 구분 | 기능명 | Free 티어 제한 | Pro / Enterprise 제공 가치 |
| :--- | :--- | :--- | :--- |
| **원격 관리** | **원격 부팅 (Wake-on-LAN)** | ❌ 전송 불가 (Pro 잠김 팝업) | ⚡ 타깃 장비 MAC으로 UDP 9/7 매직 패킷 브로드캐스트 즉각 원격 전원 기동 |
| **침입 감시** | **낯선 기기 실시간 감시 (Intruder Watch)** | ❌ 감시 모드 잠김 (수동 스캔 목록만) | 🚨 60초 주기 무인 백그라운드 감시, 신규 단말 접속 시 비프음 & OS 데스크톱 알림 |
| **보안 진단** | **심층 포트 정밀 보안 감사** | ❌ 기본 Ping 및 상태만 조회 | 🛡️ 25개 주요 포트 전수 감사, SMB 랜섬웨어 표적, RDP, Telnet 등 위험 포트 진단 |
| **자산 추적** | **스냅샷 4색 Diff 비교 분석** | ❌ 일회성 현재 스캔만 지원 | 🔍 과거 스캔 대비 신규(+NEW), 이탈(-OFF), 식별변경(!CHG) 상태 진단 및 필터링 |
| **감사 증빙** | **보안 감사 보고서 내보내기** | ❌ 기본 CSV만 제공 | 📄 A4 규격 출력용 고품질 PDF 보안 감사 진단서 및 자산 인벤토리 보고서 생성 |
| **규모 확장** | **다중 서브넷 스캔 한도** | 1개 서브넷(`/24`)으로 고정 | 🏢 Pro: 최대 5개 서브넷, Enterprise: 무제한 다중 C클래스/B클래스 동시 관리 |
| **유예 평가** | **지능형 Soft Trust 유예 시스템** | 단순 낯선 기기로 일괄 표시 | 🛡️ MAC 무작위화/OUI/호스트명 유사도 채점(0~100%)을 통한 지능형 오경보 방지 |
| **자산 보존** | **장비 별칭 및 관리자 메모** | 브라우저 세션 임시 저장 | 💾 오프라인 로컬 볼트 영구 저장 및 네트워크 장비 변경 이력 타임라인 유지 |

---

### 8.2. 🚀 Pro 에디션에 필요한 신규 추천 기능 6선 (Recommended New Pro Features)

#### 1. ⚡ 다중 단말 일괄 원격 제어 (Batch WoL & Batch Remote Actions)
* **기능 개요**: 단일 단말기뿐만 아니라 전산실, 연구실, PC방 등 서브넷 내 전체 혹은 다중 선택된 단말기를 클릭 한 번으로 일괄 원격 부팅(`Batch WoL`).
* **확장 제어**: 일괄 원격 재부팅(`Restart`) 및 일괄 종료(`Shutdown`) 스크립트 실행 (PowerShell / WMI / SSH 브릿지 연동).
* **기대 효과**: 퇴근 후 전산실 점검 또는 출근 전 일괄 전원 기동 작업 시간 대폭 단축.

#### 2. ⏰ 스케줄링 무인 백그라운드 스캔 & 외부 알림 (Scheduled Scan & Webhook)
* **기능 개요**: 사용자가 창을 켜두지 않아도 5분/10분/1시간 단위로 무인 백그라운드 자동 스캔 수행.
* **외부 연동**: 신규 미인가 단말기(사내 Wi-Fi 무단 접속자) 발견 시 **Slack, Discord, Telegram, 사내 Webhook, Email**로 실시간 경보 메시지 자동 발송.
* **기대 효과**: 24/7 침입 탐지 시스템(IDS) 대용으로 유료 구매 동기 극대화.

#### 3. 🛡️ ARP 스푸핑(변조) & 게이트웨이 사칭 실시간 감지 (Anti-ARP Spoofing Guard)
* **기능 개요**: 네트워크 상에서 동일 MAC 주소가 서로 다른 IP를 응답하거나, 기본 게이트웨이(공유기/라우터)의 IP를 가로채는 중간자 공격(MITM/ARP Cache Poisoning) 실시간 탐지.
* **경보 체계**: 스푸핑 공격 의심 노드 발생 시 붉은색 플래시 경보와 함께 해당 IP 격리 안내 출력.
* **기대 효과**: 병원, 금융, 제조 공장 등 보안 컴플라이언스가 엄격한 기업 고객 유치.

#### 4. 🗺️ L2/L3 스위치 포트 매핑 및 물리 토폴로지 시각화 (SNMP Switch Port Mapper)
* **기능 개요**: 사내 스위칭 허브(Cisco, HPE, 넷기어 등)의 SNMP v2c/v3를 조회하여, 해당 IP/MAC이 허브 몇 번 포트(`GigabitEthernet 1/0/12`)에 물리적으로 꽂혀 있는지 자동 매핑.
* **토폴로지 맵**: 스위치-라우터-PC 간의 연결 계층을 시각적 노드 트리로 렌더링.
* **기대 효과**: 배선실 패치코드 추적 업무를 수십 초 만에 해결하여 네트워크 엔지니어 필수 도구 등극.

#### 5. 📊 DHCP 풀 고갈 예측 및 서브넷 사용률 분석기 (DHCP Pool Monitor)
* **기능 개요**: 전체 서브넷 254개 IP 중 동적 할당 가능 IP와 고정 할당 IP의 사용률 실시간 분석.
* **사전 경고**: 사용률이 임계치(85% / 95%)를 초과할 경우 "IP 고갈 경고(IP Exhaustion Alert)" 팝업으로 추가 대역 증설 가이드 제시.
* **기대 효과**: 대규모 사내 행사나 유동 인구가 많은 오피스에서 네트워크 장애 사전 차단.

#### 6. 📜 자산 이력 타임라인 및 감사 로그 (Asset Audit Timeline & History)
* **기능 개요**: 각 IP/MAC 별로 최초 발견 일시, 마지막 온라인 확인 일시, IP 변경 이력, 개방 포트 변경 내역을 시계열 타임라인으로 영구 기록.
* **내보내기**: 정보보호관리체계(ISMS), ISO 27001 등 기업 보안 심사 제출용 연간/월간 자산 변동 리포트 원클릭 엑셀 출력.

#### 7. 🌐 멀티 서브넷 통합 일괄 병렬 스캔 (Multi-Subnet Concurrent Batch Scan)
* **기능 개요**: 등록된 최대 5개(또는 무제한) 서브넷 대역을 버튼 한 번으로 동시에 병렬 스캔하여 전체 인벤토리 일괄 취합.
* **기대 효과**: 각 대역별로 수동 전환할 필요 없이 전사 네트워크 자산 현황을 수초 만에 파악.

#### 8. 🗂️ 서브넷별 자산 그룹화 및 VLAN 태깅 (Subnet Tagging & Grouping)
* **기능 개요**: 사무실망, 서버실망, 게스트망 등 서브넷 대역별로 라벨을 부여하고 그리드 뷰에서 대역별 필터링 제공.
* **기대 효과**: 복잡한 사내 대규모 IP 대역에서 특정 네트워크 자산만 빠르게 격리 및 분석.

#### 9. 📄 멀티 서브넷 통합 보안 감사 보고서 (Enterprise Consolidated PDF Report)
* **기능 개요**: 관리 중인 모든 서브넷의 위험 포트 감지 내역과 자산 통계를 하나로 묶은 종합 기업 보안 감사 PDF 리포트 생성.
* **기대 효과**: ISMS 및 보안 심사 제출용 증빙 자료 작성 소요 시간 단축.

#### 10. 🌍 글로벌 다국어 문서 및 UI 자동 감지 현지화 (Multi-Language Auto-Detection Localization)
* **기능 개요**: 
  - **문서(GitHub)**: 브라우저 언어 감지 및 폴더 분리 구조(KR/EN)를 통한 GitHub 공식 문서 다국어 자동 전환.
  - **웹/앱 UI**: 사용자 접속 환경(브라우저 언어)을 실시간 감지하여 첫 실행 시 영문 또는 한글 UI 자동 적용 및 수동 전환 지원.
* **기대 효과**: 글로벌 사용자(해외 전산 담당자 및 오픈소스 기여자) 진입 장벽 제거 및 글로벌 배포 확대.

---

### 8.3. 🚨 낯선 기기 감시(Intruder Detection & Soft Trust) Pro 특화 세부 전략

#### 🔒 1. 낯선 기기 감지 중 Pro로 제한하는 핵심 항목
1. **백그라운드 60초 주기 무인 감시 (Intruder Watch Periodic Scanning)**:
   - Free 사용자는 수동으로 스캔 버튼을 누를 때만 화면에 표기되나, Pro 사용자는 상단 툴바의 `낯선 기기 감시(PRO)`를 활성화하여 24시간 무인 백그라운드 스캔 상시 가동.
2. **청각적 오디오 비프 & OS 네이티브 데스크톱 팝업 알림 (Audio Chime & OS Notification)**:
   - 미등록 기기 침입 시 즉각적인 경보 사운드 송출 및 Windows/OS 작업표시줄 알림창 연동.
3. **지능형 Soft Trust 유예 엔진 (Soft Trust Grace Period Similarity Engine)**:
   - 사설/무작위 MAC(Randomized MAC), DHCP IP 갱신 단말에 대해 OUI 및 호스트명 유사도 점수(0~100%)를 자동 채점하여 불필요한 보안 피로도(오경보) 차단.
4. **전체 단말 원클릭 신뢰 화이트리스트 영구 보존 (Batch Trust & Permanent Whitelist)**:
   - 정상 단말을 로컬 볼트에 영구 등록하고 침입자만 정확하게 선별 격리.

#### 💡 2. 낯선 기기 감지 고도화를 위한 Pro 전용 신규 추천 기능
1. **침입 단말 네트워크 자동 격리 (Rogue Device Auto Quarantine)**:
   - 인가되지 않은 낯선 기기가 감지되는 즉시 SNMP를 통해 L2 스위치 포트를 비활성화하거나 ARP 차단 패킷을 전송하여 사내망 침투 원천 차단.
2. **실시간 외부 보안 채널 웹훅 연동 (Instant Security Webhook)**:
   - 미등록 낯선 기기 접속 즉시 사내 전산 담당자 Slack / Discord / Telegram 채널로 `[IP, MAC, OUI 제조사, 호스트명, 최초 접속 시간]` JSON 경보 발송.
3. **미인가 단말 즉시 자동 취약점 진단 (Automatic Rogue Vulnerability Probe)**:
   - 낯선 기기가 잡히는 즉시 백그라운드에서 445(SMB 랜섬웨어 표적), 3389(RDP 원격데스크톱), 23(Telnet) 등 위험 포트를 스캔하여 위험 등급(High/Medium/Low) 즉각 산출.
4. **낯선 기기 침입 시계열 타임라인 감사 로그 (Intruder Audit History)**:
   - 언제 어떤 낯선 기기가 접속했고 언제 망에서 이탈했는지를 시계열 그래프로 추적하고 보안 감사 제출용 PDF로 원클릭 출력.

---

* **문서 작성 부서**: Grid IP Scanner2 코어 개발 연구팀
* **소프트웨어 버전**: v2.4.4
* **저작권**: Copyright (c) 2025-2026 AhBiYout  All rights reserved.

