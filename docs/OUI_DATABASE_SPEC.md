# Grid IP Scanner2 - OUI 데이터베이스 및 동기화 기술 명세서 (OUI Specification)

## 📌 문서 개요
본 문서는 **Grid IP Scanner2 (v2.2.3)**에 탑재된 하드웨어 제조사 식별(OUI: Organizationally Unique Identifier) 데이터베이스 구조, IEEE 및 Wireshark 자동 동기화 알고리즘, 계층적 비트 매칭 로직, 그리고 영구 캐시 관리 기술을 상세히 기술합니다.

---

## 🏗️ 1. OUI 데이터베이스 계층 구조

Grid IP Scanner2는 오프라인 폐쇄망 환경에서도 90,000건 이상의 하드웨어 제조사를 즉시 식별할 수 있도록 다층(Multi-tier) 데이터베이스 구조를 채택하고 있습니다.

```
┌─────────────────────────────────────────────────────────────┐
│                    MAC Address Query                        │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────▼───────────────┐
               │    1단계: MA-S (36-bit) 매칭   │ (9자리 16진수)
               └───────────────┬───────────────┘
                               │ (불일치 시)
               ┌───────────────▼───────────────┐
               │    2단계: MA-M (28-bit) 매칭   │ (7자리 16진수)
               └───────────────┬───────────────┘
                               │ (불일치 시)
               ┌───────────────▼───────────────┐
               │    3단계: MA-L (24-bit) 매칭   │ (6자리 16진수)
               └───────────────┬───────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
   [제조사 이름 반환]                     ["알 수 없음" 표시]
```

### 1) 식별 비트별 규격
* **MA-L (Large / 24-bit)**: 표준 6자리 MAC 접두사 (`00:11:22` ➡️ `001122`)
* **MA-M (Medium / 28-bit)**: 7자리 MAC 접두사 (`04:71:4B:E0/28` ➡️ `04714BE`)
* **MA-S (Small / 36-bit)**: 9자리 MAC 접두사 (`70:B3:D5:02:40/36` ➡️ `70B3D5024`)

---

## 🌐 2. 온라인 자동 동기화 파이프라인 (Auto-Update Engine)

### 1) 이중 미러링(Tiered Fallback) 시스템
IEEE 공식 레지스트리와 Wireshark 정제 미러를 교차 활용하여 네트워크 차단 또는 서버 장애 시에도 무중단 업데이트를 보장합니다.

| 소스 명칭 | 공식 URL | 특징 |
| :--- | :--- | :--- |
| **Wireshark Automated Manuf** | `https://www.wireshark.org/download/automated/data/manuf` | 58,000+건, 서브넷 마스크 및 약어/정식 명칭 포함 |
| **IEEE OUI MA-L** | `https://standards-oui.ieee.org/oui/oui.txt` | 24비트 대형 공식 글로벌 레지스트리 |
| **IEEE OUI MA-M** | `https://standards-oui.ieee.org/oui28/mam.txt` | 28비트 중형 공식 글로벌 레지스트리 |
| **IEEE OUI MA-S** | `https://standards-oui.ieee.org/oui36/oui36.txt` | 36비트 소형/IoT 공식 글로벌 레지스트리 |

### 2) 봇 차단 방어 (User-Agent Spoofing & Header Tuning)
* IEEE 서버는 일반적인 `Go-http-client` 요청을 HTTP 418 / 차단 코드로 거부합니다.
* 이를 해결하기 위해 표준 데스크톱 브라우저 UA(`Mozilla/5.0 ... Chrome/124.0`) 및 명시적 Accept 헤더를 백엔드 전송 파이프라인에 영구 탑재하였습니다.

### 3) 로컬 영구 캐시 (Local Cache Storage)
* **저장 위치**: `%USERPROFILE%\.cisnet_grid\master_oui.txt` (Linux/Container: `~/.cisnet_grid/master_oui.txt`)
* **무결성 검증 (Self-Healing Fallback)**:
  * 온라인 다운로드 후 파일 크기 및 최소 레코드 수(1,000건 이상)를 엄격히 검증합니다.
  * 다운로드된 파일이 손상되었거나 파싱 결과가 비정상적일 경우, 프로그램에 내장된 정적 `master_oui.txt`(90,168건)로 즉시 롤백하여 안전성을 담보합니다.

---

## 📊 3. UI 상태 세분화 및 시각적 안내 체계

사용자가 현재 OUI DB의 상태를 오해하지 않도록 4단계 상태 배지와 세분화된 안내 토스트를 제공합니다:

1. **`준비됨 (오프라인 내장)`** (`bg-emerald-500`): 패키징 시 포함된 9만 건 내장 OUI DB로 고속 스캔 준비가 완료된 상태.
2. **`최신 캐시 적용됨`** (`bg-emerald-500`): 온라인 동기화를 통해 로컬 캐시 디렉터리에 다운로드된 최신 OUI DB가 메모리에 적재된 상태.
3. **`동기화 중...`** (`bg-amber-400` + 애니메이션): IEEE 및 Wireshark 미러로부터 최신 데이터를 수신 및 파싱 중인 상태.
4. **`연결 끊김`** (`bg-red-500`): 로컬 백엔드 통신 오류 등으로 OUI 데이터를 조회할 수 없는 비정상 상태.

---

* **최초 작성일**: 2026년 9월 14일
* **문서 관리자**: AhBiYout (Grid IP Scanner2 코어 개발팀 / [ahbiyoutvibe.blogspot.com](https://ahbiyoutvibe.blogspot.com/))
* **저작권**: Copyright (c) 2025-2026 AhBiYout. All rights reserved.
