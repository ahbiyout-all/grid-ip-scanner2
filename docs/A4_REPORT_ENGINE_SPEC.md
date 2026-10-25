# 📄 Grid IP Scanner2 - A4 규격 최적화 PDF 보고서 및 브라우저 제어 기술 명세서
## (A4 PDF Report Pagination Engine & Browser UI Control Specification)

본 문서는 **Grid IP Scanner2 (v2.4.4)**에 탑재된 **A4 규격 최적화 PDF 보고서 스마트 페이지네이션 엔진**과 **Chromium/Edge 브라우저 번역 팝업 3중 원천 차단 아키텍처**의 기술 사양, 레이아웃 수학적 계산 모델, 프린터 하드웨어 안전 여백 및 구현 원리를 상세히 기술합니다.

---

## 📌 1. A4 규격 최적화 배경 및 물리 규격 (A4 Standard Dimensions)

국제 표준화 기구(ISO 216)의 A4 규격은 가로세로 비율이 정확히 `1 : √2 (약 1.4142)`입니다:

| 단위 | 가로 (Width) | 세로 (Height) | 비고 |
| :--- | :--- | :--- | :--- |
| **밀리미터 (mm)** | **210.0 mm** | **297.0 mm** | 국제 표준 물리 규격 |
| **픽셀 (96 DPI)** | **794 px** | **1123 px** | 웹 렌더링 기준 표준 해상도 |
| **포인트 (72 pt)** | 595.28 pt | 841.89 pt | PostScript / PDF 인쇄 좌표계 |
| **고해상도 (2x Canvas)** | **1588 px** | **2246 px** | 선명한 글자 인쇄를 위한 2배수 렌더링 |

---

## 🔍 2. 기존 방식의 결함 및 스마트 페이지네이션 엔진 도입

### 2.1. 기존 단일 긴 캔버스 분할 방식의 한계
* 과거에는 하나의 무한정 긴 HTML 컨테이너를 렌더링한 후, `heightLeft -= pdfHeight` 수식에 따라 이미지 높이만 잘라 다음 PDF 페이지로 넘겼습니다.
* **치명적 문제점**:
  1. **행/텍스트 중간 잘림**: 테이블의 행(tr)이나 텍스트 한 줄이 페이지 경계면에 걸칠 경우, 글자의 윗부분은 1페이지에, 아랫부분은 2페이지에 잘려 출력되는 치명적 가독성 훼손이 발생했습니다.
  2. **머리글(Header) 누락**: 2페이지 이후부터는 표의 컬럼 제목(IP, MAC, 제조사 등)이 사라져 어떤 열이 무엇을 의미하는지 판독하기 어려웠습니다.
  3. **페이지 번호 미동기화**: 전체 몇 페이지 중 현재 몇 페이지인지 표시할 수 없었습니다.

### 2.2. 독립 `.a4-report-page` 컨테이너 분할 모델 (`services/reportGenerator.ts`)
* 새로운 엔진은 컨텐츠를 렌더링하기 전, **수학적 계산을 통해 완벽한 A4 높이(1123px)를 갖는 독립 페이지 엘리먼트들로 사전에 분할 구성**합니다:

```html
<div class="a4-report-page" style="width: 794px; height: 1123px; min-height: 1123px; max-height: 1123px; padding: 36px 40px 30px 40px; box-sizing: border-box; background: #ffffff; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;">
  <!-- 상단 헤더 및 본문 컨텐츠 (Header & Body) -->
  ...
  <!-- 하단 공식 푸터 및 동적 페이지 번호 (Footer & Page X / Y) -->
</div>
```

* **페이지별 컨텐츠 최적 배치**:
  - **보안 감사 보고서 (Security Audit)**:
    - **1페이지 (Executive Summary)**: 기업 공식 헤더, Pro 라이선스 뱃지, 핵심 KPI 카드 4종, 위험 포트(SMB/RDP/Telnet) 취약점 경보 박스, 상위 5대 하드웨어 제조사 점유율 표, 1차 노드 목록.
    - **2페이지 이후 (Detailed Inventory & Ports)**: 축약형 상단 서브헤더, 표 머리글(thead) 자동 반복, 페이지당 **최대 30개 노드** 고밀도 무결성 정갈 배치.
  - **인벤토리 및 검색/활성/전체 보고서 (Device List / Inventory)**:
    - **모든 페이지 (1페이지 및 이어지는 페이지)**: 페이지당 **정확히 30개 노드** A4 최적 규격 분할 출력 (헤더, 요약 배너, 30개 단말 행, 하단 공식 푸터 무결성 보장).
  - **jsPDF 1:1 매핑**:
    각 `.a4-report-page`를 `html2canvas` 2x 해상도로 캡처하여 `pdf.addImage(imgData, 'PNG', 0, 0, 210, 297)`로 1:1 매핑하므로 잘림 오차가 0%입니다.

---

## 🖨️ 3. 프린터 하드웨어 안전 여백 (11mm Printer Margin Architecture)

* **물리적 한계**: 대부분의 레이저 및 잉크젯 프린터는 용지를 급지하는 롤러 기구의 특성상 용지 끝단 5mm~8mm 영역에는 인쇄를 할 수 없는 '출력 불가 영역(Unprintable Area)'을 갖습니다.
* **Grid IP Scanner2 안전 여백 설계**:
  - **좌우 여백**: `40px` (약 `10.6mm` ~ `11.0mm`)
  - **상단 여백**: `36px` (약 `9.5mm`)
  - **하단 여백**: `30px` (약 `8.0mm`)
  - **결과**: HP, 삼성, 엡손, 캐논 등 시중 모든 프린터에서 100% 비율(실제 크기)로 인쇄해도 외곽 텍스트나 표 테두리가 절대 잘리지 않습니다.

---

## 📊 4. 동적 페이지 번호 및 기밀 등급 푸터

* 매 페이지 하단에 전체 페이지 수를 사전에 계산(`totalPages = 1 + subPagesCount`)하여 다음과 같이 정렬된 푸터가 출력됩니다:
```text
[ Grid IP Scanner2 • 배포: (주)씨아이에스넷 (www.cisnet.co.kr) • 개발: AhBiYout ]
                                    [ CONFIDENTIAL ]   페이지 1 / 3
```

---

## 🌐 5. 브라우저 직접 인쇄(`@media print`) 스타일시트 명세

사용자가 HTML 보고서 화면에서 `Ctrl + P` 또는 [인쇄] 버튼을 눌렀을 때도 동일한 A4 품질을 유지하도록 다음 CSS 규칙을 적용했습니다:
```css
@page {
  size: A4 portrait;
  margin: 12mm 15mm;
}
@media print {
  body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
    padding: 0 !important;
  }
  .actions-bar {
    display: none !important;
  }
  table {
    page-break-inside: auto;
  }
  tr {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  thead {
    display: table-header-group !important;
  }
  tfoot {
    display: table-footer-group !important;
  }
}
```

---

## 🚫 6. Chromium / Edge 브라우저 자동 번역 팝업 3중 차단 아키텍처

앱 시작 시 좌측 상단에 표시되던 "페이지의 영어을(를) 번역하시겠습니까?" 팝업을 차단하기 위한 3중 방어 메커니즘:

1. **HTML 루트 언어 속성 및 번역 방지 클래스 (`index.html`)**:
   ```html
   <html lang="ko" class="notranslate" translate="no">
   ```
2. **검색엔진 및 번역기 제어 메타 태그 (`index.html`)**:
   ```html
   <meta name="google" content="notranslate">
   <meta name="googlebot" content="notranslate">
   <meta http-equiv="Content-Language" content="ko">
   ```
3. **런타임 동적 가드 및 런처 인자 주입 (`App.tsx`, `utils_windows.go`, `main.js`)**:
   - `document.documentElement.lang = 'ko'` 및 `setAttribute('translate', 'no')`
   - Edge / Chrome 실행 커맨드라인에 `--disable-features=Translate`, `--disable-translate`, `--lang=ko` 주입

---

* **작성 부서**: Grid IP Scanner2 코어 개발 연구팀
* **최신 개정일**: 2026년 10월 20일
* **적용 버전**: v2.4.4
* **저작권**: Copyright (c) 2025-2026 AhBiYout. All rights reserved.
