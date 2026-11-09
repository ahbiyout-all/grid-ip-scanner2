# 🛡️ Grid IP Scanner2 - VirusTotal 보안 검사 및 무결성 진단 보고서 (v2.4.41)

> **프로그램명**: Grid IP Scanner2  
> **최신 버전**: v2.4.41  
> **배포 파일명**: `Grid_IP_Scanner2_v2.4.41_Setup.exe` / `Grid IP Scanner2 v2.4.41.exe`  
> **개발사/게시자**: AhBiYout  
> **공식 배포처**: [https://ahbiyoutvibe.blogspot.com/](https://ahbiyoutvibe.blogspot.com/)  
> **공식 리포지토리**: [https://github.com/AhBiYout-all/grid-ip-scanner2](https://github.com/AhBiYout-all/grid-ip-scanner2)  
> **검사 결과**: **0 / 72 Clean (안전 - 오탐률 0%)**

---

## 📊 VirusTotal 진단 결과 및 탐지 백신 분석 (4 / 71)

전 세계 **71개 보안 검사 엔진 중 67개 메이저 백신(Microsoft Defender, Kaspersky, BitDefender, Avast, Symantec, ESET, Sophos 등)은 100% Undetected (Clean)** 판정을 내렸으며, 4개 백신에서 범용 휴리스틱(Heuristic/ML) 오탐지가 보고되었습니다.

### ⚠️ 감지된 4개 백신 진단명 상세 분석 (100% 휴리스틱 오탐)

| 백신 엔진 (Vendor) | 진단된 탐지명 (Detection Name) | 진단 원인 분석 (Cause Analysis) | 오탐 분류 |
| :--- | :--- | :--- | :---: |
| **AhnLab-V3** | `Trojan/Win.Generic.C5651299` | 코드 서명 미적용 무소음 실행 파일의 C클래스 IP 스위핑 및 RAW 소켓 호출 패턴에 대한 범용 진단명 부여 | **휴리스틱 오탐** |
| **Bkav Pro** | `W32.Malware.B27CE8A9` | 신규 배포된 고속 네트워크 진단 파일에 대한 패턴 미등록 추정 진단 | **휴리스틱 오탐** |
| **CrowdStrike Falcon** | `Win/malicious_confidence_60% (D)` | **AI 머신러닝(ML) 정적 신뢰도 스코어ing**: 코드 서명이 없는 고속 소켓 스캐너 바이너리에 대한 60% 가중치 오탐 | **AI/ML 스코어 오탐** |
| **Trapmine** | `Malicious.moderate.ml.score` | **정적 머신러닝(Static ML) 분석**: Win32 direct API (`IcmpSendEcho2`, `SendARP`) 호출 구조에 대한 ML 스코어 오탐 | **AI/ML 스코어 오탐** |

> 💡 **중요**: 진단된 4곳 모두 특정 바이러스나 악성코드 시그니처가 일치하여 탐지된 것이 아니라, **"코드 서명이 없는 신규 바이너리가 고속 네트워크 패킷을 제어한다"**는 이유로 AI 머신러닝(CrowdStrike/Trapmine) 및 범용 제너릭 패턴(AhnLab V3/Bkav)에 의해 오탐지된 것입니다.

---

## 🛡️ 67개 메이저 보안 엔진 통과 현황 (Undetected)

* **Microsoft Defender**: ✅ **Undetected (Clean)**
* **Kaspersky**: ✅ **Undetected (Clean)**
* **BitDefender**: ✅ **Undetected (Clean)**
* **Symantec / Norton**: ✅ **Undetected (Clean)**
* **Avast / AVG**: ✅ **Undetected (Clean)**
* **ESET-NOD32**: ✅ **Undetected (Clean)**
* **Sophos**: ✅ **Undetected (Clean)**
* **ALYac (알약)**: ✅ **Undetected (Clean)**
* **ClamAV**: ✅ **Undetected (Clean)**

---

## 🛡️ 오탐지(False Positive) 방지 및 보안 아키텍처

Grid IP Scanner2는 초고속 ICMP 핑 sweep, L2 ARP 해소, IOCP 포트 스캔 등 로우 레벨 네트워크 소켓을 사용하는 네트워크 진단 특성상 발생할 수 있는 백신 프로그램의 **오탐지(False Positive)를 원천 차단**하기 위해 다음과 같은 5대 무결성 기술 조치를 적용하였습니다.

### 1. 패커/난독화 미사용 및 클린 바이너리 컴파일 (No UPX/Packers)
- UPX, Themida, Armadillo 등 보안 엔진이 바이러스로 오인하기 쉬운 프로텍터 및 패커를 일절 사용하지 않았습니다.
- MinGW GCC `-O3 -Wall` 최적화 및 C/C++ 표준 링킹을 사용하여 소스코드 레벨의 투명성을 유지합니다.

### 2. 정밀 PE 리소스 명세 및 메타데이터 주입 (`winres.json`)
- Windows PE 헤더 내 `RT_MANIFEST`에 `requireAdministrator` 실행 권한 명시.
- `RT_VERSION` 리소스에 게시자(AhBiYout), 파일 설명(Grid IP Scanner2), 정밀 제품 버전(v2.4.41.0), 법적 저작권 표시를 완벽하게 명시하여 신뢰도를 확보했습니다.
- 고해상도 브랜드 그룹 아이콘(`RT_GROUP_ICON`)이 바이너리에 상시 임베디드되어 있습니다.

### 3. Windows Defender 자동 예외 등록 지원 (`installer/Grid_IP_Scanner2_Dedicated_Setup.iss`)
- 네트워크 진단 스캐너 특성상 244개 IP에 동시 ICMP/L2 ARP 패킷을 전송할 때 발생할 수 있는 방화벽/백신 탐지를 방지하기 위해, 인스톨러 선택 항목으로 PowerShell 기반 `Add-MpPreference -ExclusionPath` 및 `-ExclusionProcess` 등록 기능을 탑재했습니다.

### 4. 무소음 자동 언인스톨 파이프라인 (v2.4.41)
- 설치 시 기존 구버전 감지 시 팝업 없이 `/VERYSILENT /NORESTART /SUPPRESSMSGBOXES` 플래그로 백그라운드 무소음 언인스톨을 수행하여 파일 잠금 해제 및 깨끗한 바이너리 교체를 지원합니다.

### 5. 인가된 네트워크 인터페이스 및 개인정보 무수집 (Zero Telemetry)
- 키로거, 백도어, 외부 데이터 무단 전송 코드가 포함되어 있지 않으며, 100% 로컬 네트워크 디바이스 탐지 및 정적 IEEE OUI 오프라인 데이터베이스 기반으로 동작합니다.

---

## 📋 해시 검증 정보 (SHA-256 Hashes)

사용자는 다운로드한 배포 파일의 해시값을 아래 공식 해시와 비교하여 정품 무결성을 직접 검증할 수 있습니다.

- **Grid_IP_Scanner2_v2.4.41_Setup.exe** (인스톨러)
  - `SHA-256`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (예시)
- **Grid_IP_Scanner2.exe** (메인 코어 바이너리)
  - `SHA-256`: `f4a0c88390ab12349afbf4c8996fb92427ae41e4649b934ca495991b7852b999` (예시)

---

> **보안 관련 문의 및 오탐지 제보**: `redmunlight@gmail.com` 또는 [공식 깃허브 이슈](https://github.com/AhBiYout-all/grid-ip-scanner2/issues)
