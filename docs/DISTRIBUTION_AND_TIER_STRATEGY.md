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
│   - 비상 네이티브 메모장 보고서│ │   - 포트 정밀 분석 & 서비스 식별     │
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
    visualGrid: boolean;    // 기본 16x16 그리드 (모두 허용)
    fastPing: boolean;      // 초고속 Ping 스캔 (모두 허용)
    ouiLookup: boolean;     // 9만 건 OUI 제조사 조회 (모두 허용)
    portScanDeep: boolean;  // 1~65535 포트 정밀 스캔 & 서비스 배너 (Pro+)
    diffCompare: boolean;   // 과거 스캔과 현재 스캔의 차이 비교 (Pro+)
    autoMonitor: boolean;   // 24시간 상시 감시 & 시스템 알림 (Pro+)
    exportReport: boolean;  // PDF/Excel 상세 진단 리포트 (Pro+)
    multiSubnet: boolean;   // 다중 C클래스/B클래스 동시 스캔 (Enterprise)
  };
}
```

### 5.2. 비대칭 암호화(Ed25519) 오프라인 인증 원리
* **인터넷 불필요**: 폐쇄망이나 선박, 공장 자동화 라인에서도 동작해야 하므로 온라인 인증 서버 의존성을 제거합니다.
* **라이선스 키 구조**: `BASE64( JSON_PAYLOAD + ED25519_SIGNATURE )`
* **검증 방식**: 바이너리 내부에 내장된 공개키(Public Key)로 무결성을 검증하여 변조 및 가짜 키 생성을 원천 차단합니다.

---

## 6. 윈도우 인스톨러(Inno Setup) 세부 명세

* **설치 스크립트 위치**: `installer/Grid_IP_Scanner2_Setup.iss`
* **빌드 출력물**: `Grid IP Scanner2 v{VERSION} Setup.exe`
* **주요 자동화 기능**:
  1. **설치 경로**: `{autopf}\Grid IP Scanner2` (64비트 표준 `Program Files`)
  2. **단축 아이콘**: 시작 메뉴 프로그램 그룹 및 바탕화면 바로가기 자동 생성
  3. **Windows 방화벽 사전 조용한 자동 예외 등록**:
     - **기본 앱 이름 규칙**: `Grid IP Scanner2`, `Grid IP Scanner2 (Inbound)`, `Grid IP Scanner2 (Outbound)`
     - **버전 정보 포함 규칙**: `Grid IP Scanner2 v{VERSION}`, `Grid IP Scanner2 v{VERSION} (Inbound)`, `Grid IP Scanner2 v{VERSION} (Outbound)`
     ```cmd
     netsh advfirewall firewall add rule name="Grid IP Scanner2" dir=in action=allow program="{app}\Grid IP Scanner2.exe" enable=yes
     netsh advfirewall firewall add rule name="Grid IP Scanner2 (Inbound)" dir=in action=allow program="{app}\Grid IP Scanner2.exe" enable=yes
     netsh advfirewall firewall add rule name="Grid IP Scanner2 (Outbound)" dir=out action=allow program="{app}\Grid IP Scanner2.exe" enable=yes
     ```
  4. **언인스톨 클린업**: 제어판 제거 시 기본 이름 및 버전 정보 포함 방화벽 규칙 모두 자동 삭제 (Silent clean)
  5. **무인 일괄 설치(Silent Install) 스위치 지원**:
     ```cmd
     Grid_IP_Scanner2_Setup.exe /VERYSILENT /SUPPRESSMSGBOXES /NORESTART
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
* **문서 작성 부서**: Grid IP Scanner2 코어 개발 연구팀
* **소프트웨어 버전**: v2.3.2
* **저작권**: Copyright (c) 2025-2026 AhBiYout (Cisnet). All rights reserved.
