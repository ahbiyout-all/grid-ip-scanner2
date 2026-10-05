# Grid IP Scanner2 - 소프트웨어 버전 관리 규정 (Versioning Policy)

본 문서는 **Grid IP Scanner2** 프로젝트의 소프트웨어 버전 관리(Semantic Versioning: SemVer) 표준 원칙과 코드 수정 시 패치노트 기록 및 문서 관리 지침을 정의합니다.

---

## 📌 1. 시맨틱 버저닝 (Semantic Versioning 2.0.0) 기본 원칙

Grid IP Scanner2의 모든 릴리즈 및 패치는 **`MAJOR.MINOR.PATCH` (예: `v2.2.1`)** 3단계 체계에 따라 엄격히 관리됩니다.

```
      v [ MAJOR ] . [ MINOR ] . [ PATCH ]
           │             │             │
           │             │             └── 버그 수정, 보안 패치, DB 갱신, 세부 최적화 (하위 호환 유지)
           │             └──────────────── 새 기능 추가, 새 모드/플랫폼 지원 (하위 호환 유지)
           └────────────────────────────── 아키텍처 전면 개편, 호환되지 않는 변경 (하위 호환 불가)
```

---

## 🚦 2. 버전 승급 기준 (3단계 상세 구분)

### 🔴 1) MAJOR (X.0.0) - 주 버전 (대규모 개편)
* **적용 시점**: 하위 호환성이 보장되지 않는 대규모 변경 또는 시스템 전면 재설계
* **주요 사례**:
  - v1.x ➡️ v2.0: 단일 스캔 엔진에서 16x16 고유 그리드 맵 + Go 네이티브 하이브리드 아키텍처로 전면 개편
  - 백엔드와 프론트엔드 간의 통신 프로토콜(SSE, REST API 스펙)의 파괴적 변경
  - 지원 운영체제 또는 핵심 런타임의 근본적 전환

### 🟡 2) MINOR (x.Y.0) - 부 버전 (기능 추가)
* **적용 시점**: 기존 버전과의 하위 호환성을 완벽히 유지하면서 새로운 핵심 기능이나 플랫폼 지원이 추가될 때
* **주요 사례**:
  - 새로운 스캔 모드 추가 (예: 초고속 모드, 정밀 모드, 비상 모드)
  - 스마트폰/태블릿 모바일 지원 (Capacitor/Android APK 네이티브 패키징 및 모바일 원격 제어)
  - 5단계 적응형 런처 파이프라인(Edge, Chrome, Whale, Native OS) 도입
  - 신규 보고서 출력 포맷 지원 (Excel, CSV, JSON 등)

### 🟢 3) PATCH (x.y.Z) - 수치 버전 (패치 및 버그 수정)
* **적용 시점**: 기존 기능의 스펙 변경 없이 버그 수정, 안정화, 성능 최적화, 정적 데이터베이스 갱신이 이루어질 때
* **주요 사례**:
  - IEEE OUI 제조사 데이터베이스 갱신 (예: 90,168건 최신화 및 다중 비트 마스크 파서 개선)
  - 포트 충돌 방지 및 프로세스 자동 회수(Safe Relaunch) 로직 개선
  - 네트워크 어댑터 선택 상태 영속 유지(React State Retention) 버그 수정
  - UI 레이아웃 미세 조정, 번역 텍스트 보완, 문서 업데이트

---

## 📝 3. 코드 수정 특이점 발생 시 패치노트 기록 규칙

프로젝트 소스 코드에 의미 있는 변경이나 특이점이 발생할 경우, 다음 절차에 따라 **`docs/PATCH_NOTE.md`**에 즉시 기록하고 버전을 동기화합니다.

### 📋 기록 표준 템플릿
```markdown
### [버전번호] - [패치 타이틀 요약] (YYYY-MM-DD)
* **분류**: `MAJOR` | `MINOR` | `PATCH`
* **배경 및 목적**: 수정 또는 추가가 필요했던 배경
* **주요 변경 사항**:
  - 핵심 구현 내용 1
  - 핵심 구현 내용 2
* **영향을 받는 모듈**: `main.go`, `App.tsx`, `components/...` 등
* **호환성 및 특이점**: 사용자 또는 개발자가 주의해야 할 점
```

---

## 📂 4. `docs/` 폴더 문서 체계 및 관리 지침

`docs/` 폴더는 프로젝트의 모든 기술 사양, 구조, 라이선스, 패치 이력을 중앙 집중식으로 보관하는 11대 공식 문서 체계를 갖추고 있습니다.

| 문서 파일명 | 문서 내용 및 역할 |
|---|---|
| **`docs/README.md`** | 문서 저장소 총괄 가이드 및 색인 목차 |
| **`docs/VERSIONING_POLICY.md`** | SemVer 3단계 버전 관리 규정 및 패치노트 기록 지침 (본 문서) |
| **`docs/PATCH_NOTE.md`** | 전체 버전별 패치 내역, 버그 수정 및 릴리즈 노트 |
| **`docs/WorkLog.md`** | 개발 및 기능 구현 공식 작업 일지 (일자별 변경 상세) |
| **`docs/GRID_IP_SCANNER_2.md`** | 서비스 개요, 기술 사양 및 사용자 매뉴얼 백서 |
| **`docs/FILE_STRUCTURE_GUIDE.md`** | 프로젝트 전체 디렉터리, 컴포넌트 및 아키텍처 가이드 |
| **`docs/GITHUB_GUIDE.md`** | GitHub 공식 연동 및 GitHub Actions CI/CD 자동 배포 가이드 |
| **`docs/DISTRIBUTION_AND_TIER_STRATEGY.md`** | 포터블 & 인스톨러 배포 전략 및 유료화 아키텍처 사양서 |
| **`docs/PROPRIETARY_TECHNOLOGY.md`** | 15대 핵심 독점 기술 및 코어 엔진 기술 명세서 |
| **`docs/OUI_DATABASE_SPEC.md`** | OUI 계층형 데이터베이스 및 이중 미러링 기술 명세서 |
| **`docs/LICENSE.md`** | 오픈소스(GPL v3) 및 상용(Commercial) 이중 라이선스 계약서 |

### 💡 신규 문서 생성 지침
* 새로운 하위 시스템(예: 새로운 프로토콜, 클라우드 연동, CI/CD 배포 파이프라인 등)이 도입되거나 독립된 설명이 필요할 경우, `docs/` 폴더에 즉시 신규 마크다운 문서를 생성하고 `docs/README.md` 인덱스에 등록합니다.
* 모든 문서는 작성 일자, 작성자(AhBiYout), 공식 링크(`ahbiyoutvibe.blogspot.com`, `www.cisnet.co.kr`)를 명시하여 표준성을 유지합니다.

---

## 🔄 5. 단일 진실 공급원(SSOT) 동적 버전 추출 및 8대 타깃 동기화 파이프라인

배포/빌드 스크립트(`.bat`, `.sh`, `.js`) 내 버전 정보 수동 하드코딩을 원천 금지하며, 다단 동적 추출 및 자동 동기화 엔진(`scripts/sync-version.js`)을 통해 전체 시스템 버전을 단 1회 명령으로 동기화합니다.

### 5.1. 다단 동적 버전 추출 순서 (Tiered Dynamic Resolution)
1. **1차 기준 (Primary)**: `package.json` 파일의 `"version"` 프로퍼티 값을 Node.js를 통해 읽어옵니다.
2. **2차 기준 (Fallback)**: `package.json`이 누락되거나 Node 미설치 환경인 경우, `docs/PATCH_NOTE.md` 최상단 헤더(정규식 `\(v?([0-9.]+)\)`)에서 버전 번호를 자동 파싱하여 변수(`%APP_VER%`)에 할당합니다.
3. **3차 기준 (Emergency Default)**: 상기 기준 모두 판독 불가 시 기본값 `2.3.2`를 지정합니다.

### 5.2. 8대 핵심 타깃 일괄 동기화 (Single Source of Truth)
`node scripts/sync-version.js` 실행 시 다음 8개 파일의 버전이 즉시 100% 일치하도록 업데이트됩니다:
1. `package.json` (`"version": "X.Y.Z"`)
2. `winres.json` (PE 메타데이터 `RT_MANIFEST` & `RT_VERSION` quad-version `"X.Y.Z.0"`)
3. `installer/Grid_IP_Scanner2_Setup.iss` (`#define MyAppVersion "X.Y.Z"`)
4. `App.tsx` (사이드바, 모바일 상단 바, 모달 내부 UI 뱃지 및 파일명 레퍼런스)
5. `services/updateChecker.ts` (`export const CURRENT_APP_VERSION = 'X.Y.Z'`)
6. `docs/PATCH_NOTE.md` (최상단 헤더 타이틀 `# Grid IP Scanner2 - Patch Note (vX.Y.Z)`)
7. `docs/README.md` (`최신 vX.Y.Z 버전`)
8. `docs/WorkLog.md` (작업 일지 최신 헤더 동기화 확인)

---
* **문서 제정 및 최신 개정일**: 2026년 10월 4일 (v2.3.2 적용)
* **책임 부서**: Grid IP Scanner2 코어 개발 연구팀 (AhBiYout / [ahbiyoutvibe.blogspot.com](https://ahbiyoutvibe.blogspot.com/))
