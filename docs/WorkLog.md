# 📝 Grid IP Scanner2 - 작업 로그 (Work Log)


### 20. 스캔 중 창 닫기/새로고침 방지 경고 및 스캔 안전 중지 이벤트 탑재 (BeforeUnload & Safe Abort Guard)
- **사용자 요청**: "스캔 중일 때 브라우저 창을 닫거나 새로고침을 시도하면 경고를 띄우고 스캔을 안전하게 중지하는 이벤트를 App.tsx에 추가하세요."
- **구현 내용 (`App.tsx`)**:
  1. **스캔 상태 실시간 추적 레퍼런스 (`isScanningRef`)**:
     - 윈도우 이벤트 리스너의 클로저 갇힘(stale closure) 현상을 방지하기 위해 `isScanning` 상태를 `isScanningRef`와 항상 동기화.
  2. **창 닫기 및 새로고침 감지 경고 (`beforeunload` 이벤트)**:
     - 스캔이 진행 중(`isScanningRef.current === true`)일 때 브라우저 탭/창 닫기, 새로고침(F5, Ctrl+R, 뒤로 가기) 시도를 즉시 가로채어 브라우저 표준 경고 팝업 호출.
     - 안내 문구: `"현재 네트워크 스캔이 진행 중입니다. 페이지를 벗어나거나 새로고침하면 스캔 작업이 강제 중단됩니다. 계속하시겠습니까?"`
  3. **스캔 안전 중지 및 자원 해제 (`pagehide` & `unload` & `handleStopScan`)**:
     - 사용자가 페이지 이탈을 확정하거나 창을 종료할 때 `stopScanRef.current = true`, `abortControllerRef.current?.abort()`, `updateTimerRef`를 즉각 취소 및 해제하여 백그라운드 SSE 스트림과 Go 엔진 TCP 소켓을 안전하게 정상 종료.
     - 메인 UI의 중지 버튼 및 초기화 로직(`resetScanState`)과도 `handleStopScan()`으로 통합하여 일관된 스캔 라이프사이클 관리 완성.


### 19. 스냅샷 비교 시 동일 장비의 불필요한 '변동(!CHG)' 오탐지(False Positive) 원천 해결 및 별칭(Alias) 독립성 보장
- **사용자 문의**: "스냅샷 비교시에 현재와 정보가 같은 경우에도 정보가 바뀌었다고 하는데 , 별칭 추가 되어서 그런것 일까요?"
- **정밀 원인 분석 (Root Cause Analysis)**:
  1. **사용자 별칭(Alias) 영향 여부 확인 결과**:
     - **결론: 별칭은 변동 판정에 영향을 주지 않음 (영향도 0%)**.
     - 별칭 시스템(`services/deviceAliasManager.ts`)은 로컬 스토리지(`grid_ip_scanner_aliases_v1`)에 저장되는 순수 사용자 정의 표시 라벨(Nickname & Note)이며, 스냅샷 비교 엔진(`computeSnapshotDiff`)의 비교 입력값(`ScanResult`)에는 애초에 별칭 필드가 포함되지 않습니다.
  2. **실제 변동(!CHG) 오탐지(False Positive)의 근본 원인 3가지 규명**:
     - **원인 ① (핑 지연시간 편차의 오탐지 유발 - 핵심 원인)**:
       기존 비교 엔진 코드에서 `Math.abs(curLatency - prevLatency) >= 50`일 경우 `changes` 배열에 추가하고 `changes.length > 0` 조건에 의해 노드 상태를 `changed(!CHG)`로 격상시키고 있었습니다. 네트워크 환경(Wi-Fi 신호, 백그라운드 트래픽)에 의해 2ms ➔ 55ms로 일시적으로 튄 동일 장비가 '장비 정보 변경'으로 잘못 표시되는 문제가 있었습니다.
     - **원인 ② (MAC 주소 포맷 표기 불일치)**:
       일부 환경에서 콜론(`:`) 표기와 하이픈(`-`), 또는 영문 대소문자가 혼재될 경우 단순 문자열 비교 시 동일 장비임에도 `macChanged = true`로 오판단되는 케이스 방지 필요.
     - **원인 ③ (호스트명 플레이스홀더 및 mDNS `.local` 접미사)**:
       NetBIOS/mDNS 응답 시점 차이로 `.local` 접미사가 붙거나, 'Unknown' / 'Hidden Node' 등 임시 플레이스홀더와 실제 호스트명이 대조될 때 호스트명 변경으로 판정되던 문제.
- **해결 및 개선 구현 내용**:
  1. **핑 지연시간 편차를 변동(!CHG) 판정 조건에서 완전 분리 (`services/diffEngine.ts`)**:
     - 지연시간은 보조 성능 지표로만 취급하며, 물리적/논리적 변경(MAC 주소, 호스트명, 제조사, 개방 포트)이 발생하지 않은 상태에서는 핑 편차만으로 절대로 `changed(!CHG)` 상태가 되지 않도록 알고리즘 개편 (`isIdentityOrPortChanged = macChanged || hostnameChanged || vendorChanged || portChanged`).
     - 장비의 실제 속성이 동일하면 무조건 초록색/기준색인 `=SAME (동일 유지)`로 정상 분류됩니다.
  2. **MAC 주소 정규화 엔진 탑재 (`cleanMac`)**:
     - 구분자(`:`, `-`) 및 공백을 모두 제거하고 대문자로 치환 후 비교하여 포맷 차이에 의한 오탐 원천 차단.
  3. **호스트명/제조사 정규화 필터 탑재 (`cleanHost`, `cleanVendor`)**:
     - `.local` 접미사 제거 및 'Unknown', 'Hidden Node', '-' 등의 무의미한 플레이스홀더 간 비교 시 불필요한 변경 트리거 방지.
  4. **스냅샷 1:1 대조 스튜디오(`SnapshotDiffModal.tsx`) 내 별칭 연동 및 안내 강화**:
     - 비교 테이블에 사용자가 등록한 별칭(`🏷️ [별칭]`)을 명확히 시각화하여 사용자가 자신의 메모를 한눈에 확인할 수 있도록 지원.
     - 검색 필터에 별칭 닉네임과 메모를 검색 대상에 포함하여 빠른 장비 탐색 지원.
     - 상단 안내 띠 및 가이드에 "사용자 별칭 및 단순 핑 지연 편차는 변동(!CHG) 판정에 영향을 주지 않습니다"라는 명확한 판정 기준 명시.


### 18. 스냅샷 비교 UI 상단 잘림 원천 차단 및 하단 불필요 설명 제거 (Zero-Clipping Sub-Header)
- **사용자 요청**: "상단 내용이 짤림. 하단에 설명 제거."
- **문제점 진단**:
  1. **상단 내용 잘림 현상**: Diff 제어 패널이 메인 그리드와 동일한 `overflow-y-auto` 스크롤 컨테이너 내부에 배치되어 있어, 그리드가 렌더링되거나 세로 뷰포트가 낮은 디바이스에서 최상단 툴바(카메라 아이콘, 스냅샷 1:1 대조 스튜디오 버튼, 기준점 선택 셀렉터 등)가 상단 헤더 뒤로 밀려 스크롤되어 잘림.
  2. **하단 중복 설명 상자**: Diff 패널 하단에 자리잡고 있던 장문의 안내 텍스트 상자(`diffEmptyDesc`)가 뷰포트 높이를 과도하게 차지하여 세로 스크롤을 유발하고 시각적 산만함을 초래함.
- **개선 및 구현 내용**:
  1. **독립 고정 서브헤더 레이어 승격 (`App.tsx`)**:
     - Diff 제어 툴바를 스크롤 본문 내부에서 메인 `<header>` 직하단의 독립적인 서브헤더(`border-b shrink-0 z-20`) 레이어로 분리 고정.
     - 본문 그리드가 스크롤되더라도 상단 제어 버튼 및 카운터가 항상 상단에 견고하게 고정되어 잘림 현상 원천 차단.
  2. **하단 설명 박스 전면 영구 삭제**:
     - 불필요한 안내 상자를 완전 제거하여 뷰포트 수직 공간을 대폭 확보하고 UI를 전문적이고 정돈된 형태로 개선.
  3. **초고밀도 2행 설계 & 16x16 그리드 단일 뷰포트 수납**:
     - 1행: Diff 상태 식별기, 기준점 드롭다운, 스냅샷 캡처 버튼, 1:1 대조 스튜디오 버튼, 가이드 및 복귀 버튼.
     - 2행: 실시간 4종 카운터 버튼(+NEW, -OFF, !CHG, =SAME), 색상 범례 및 원클릭 기준 색상 스위처.
     - 그리드 높이 예산을 `calc(100vh - 190px)`로 최적화하여 16x16 전체 그리드가 스크롤 없이 단일 화면에 100% 온전히 표시됨.
  4. **SSOT 버전 동기화**: `v2.4.6`으로 9대 핵심 파일 버전 동기화 및 `docs/SNAPSHOT_DIFF_SPEC.md` 개정 완료.


### 17. 스냅샷 비교 방법 전면 개편 (Deep Diff Engine v2 & Snapshot Comparison Studio)
- **사용자 요청**: "스냅샷 비교방법 전면 개선하세요. 지금 방법으로 비교하기가 의미가 있는지 싶네요."
- **문제점 진단 및 개편 배경**:
  1. 기존 방식은 현재 라이브 메모리(`results`)와 단일 기준 스냅샷 간의 1차원적 비교에 국한되어, 저장된 과거 스냅샷 간(스냅샷 A vs 스냅샷 B)의 자유로운 교차 대조가 불가능했음.
  2. 16x16 그리드 상의 색상 변경만으로는 구체적인 변동 사항을 한눈에 조망하기 어렵고, 개별 셀을 일일이 클릭해야만 확인 가능하여 실무적 효용성이 극히 낮았음.
  3. 보안상 핵심인 포트 변동(새로 개방된 취약 포트, 닫힌 포트), RTT 응답속도 급변, IP 충돌/ARP 스푸핑 위험에 대한 정밀 다각도 분석이 누락되어 있었음.
- **구현 내용**:
  1. **딥 다각도 비교 엔진 (`services/diffEngine.ts`)**:
     - **임의의 두 데이터셋 1:1 대조**: `computeSnapshotDiff(targetResults, baselineResults, targetLabel, baselineLabel)`
     - **신규 접속 (+NEW)**: MAC, 제조사, 호스트명, 개방 포트, 응답속도 종합 식별.
     - **오프라인 이탈 (-OFF)**: 장치 전원 차단 / LAN 분리 직전의 이전 상태 및 MAC 추적.
     - **심층 속성/보안 변동 (!CHG & ⚠️ALERT)**:
       - MAC 변경 감지: 동일 IP에 타 장비 연결 또는 ARP 스푸핑 / IP 충돌 강력 경보.
       - 개방 포트 diff: 신규 개방 포트(`+`), 차단 포트(`-`) 정밀 대조 및 고위험 포트(21, 22, 23, 80, 445, 1433, 3306, 3389 등) 노출 시 즉각 경보.
       - 응답 지연시간(RTT) 편차: 40ms 이상 급변 시 네트워크 품질 저하 지표 기록.
     - **스냅샷 라벨 편집 및 전체 관리**: 이름 변경(`updateSnapshotLabel`), 보관 개수 25개로 확장.
     - **CSV 내보내기 (`exportDiffToCSV`)**: 변동 분석 결과를 엑셀 CSV로 원클릭 저장.
  2. **독립 비교 스튜디오 모달 신설 (`components/SnapshotDiffModal.tsx`)**:
     - **소스 선택 및 원클릭 스왑**: 기준점 A(Before)와 비교시점 B(After)를 실시간 스캔 및 보관된 스냅샷 중에서 자유롭게 교차 선택 가능.
     - **6대 핵심 KPI 요약 카드**: 총 변동, 신규, 이탈, 속성변동, 보안경보, 동일 유지.
     - **1:1 Side-by-Side 비교 테이블**: IP, 기준점(A) 상태, 비교점(B) 상태, 변동 상세를 나란히 대조.
     - **보고서 내보내기 & 클립보드 요약 복사**: IT 관리자 보고용 텍스트 복사 및 CSV 다운로드.
     - **메인 그리드 연동**: 테이블의 IP 클릭 시 메인 그리드로 즉시 이동 및 포커스.
  3. **메인 UI 연동 (`App.tsx`)**:
     - 상단 Diff 모드 툴바에 `스냅샷 1:1 대조 스튜디오 (Studio)` 버튼 배치.
     - 우측 디테일 카드 내에도 즉시 스튜디오를 호출할 수 있는 퀵 버튼 추가.


### 16. PDF 문서 IP 리스트 출력 용량 30개로 확장 및 고밀도 A4 레이아웃 최적화
- **사용자 요청**: "pdf문서에 15개 ip리스트를 넣었는데 30개로 증가."
- **구현 내용**:
  1. `services/reportGenerator.ts` 페이지네이션 상수 및 렌더링 엔진 고도화:
     - `exportDeviceListToPDF` (인벤토리/검색/활성/전체 보고서): 1페이지 및 후속 페이지 모두 `DEVICES_PER_FIRST_PAGE = 30`, `DEVICES_PER_SUB_PAGE = 30`으로 균일하게 적용.
     - `exportSecurityAuditReportToPDF` (보안 감사 보고서): 후속 상세 인벤토리 페이지 `DEVICES_PER_SUB_PAGE = 30`으로 확장.
     - 고밀도 초슬림 행 스타일(`padding: 2.2px~2.6px`, `font-size: 8px`, 텍스트 말줄임표 처리)을 적용하여 30개 노드 전체가 출력되어도 A4 높이(1123px) 내에서 여유 있게 수납되며 텍스트나 하단 푸터가 잘리지 않도록 안전 여백 계산 완료.
  2. 문서 동기화:
     - `docs/A4_REPORT_ENGINE_SPEC.md` 및 `docs/PATCH_NOTE.md`에 페이지당 30대 확장 사양 반영.


### 15. 루트 자동 GitHub 동기화 스크립트(sync-github.sh) 신설 및 배포 단계 등록
- **사용자 요청**: "Create a new bash or batch script file named sync-github.sh in the project root that automatically synchronizes the current code state with the remote GitHub repository, including local changes, and suggest adding this as a deployment build step."
- **구현 내용**:
  1. `sync-github.sh` 신설 (프로젝트 루트):
     - Git 및 Node.js 환경 검증
     - `scripts/sync-version.js` 자동 호출로 9대 타깃 버전 무결성 보장
     - `git rm -r --cached .` 및 `git add .`를 통한 클린 소스 스테이징
     - 변경 사항 감지 및 타임스탬프 기반 자동 커밋 생성 (사용자 지정 메시지 인자 지원)
     - 원격 메인 브랜치(`main`) 푸시 및 충돌 시 안전한 rebase 처리
     - 시맨틱 릴리스 태그(`vX.Y.Z`) 발행으로 GitHub Actions CI/CD(Windows 설치파일, Android APK, PWA) 자동 트리거
     - 실행 권한(`chmod +x`) 부여
  2. `package.json` 빌드 및 배포 단계 연동:
     - `"git:sync": "bash sync-github.sh"` 및 `"deploy:git": "bash sync-github.sh"` 스크립트 추가


### 14. v2.4.5 정식 버전업 및 A4 PDF 스마트 페이지네이션 / 번역 팝업 차단 정식 반영
- **버전업 배경**: A4 최적화 스마트 페이지네이션 PDF 엔진 도입, 브라우저 자동 번역 팝업 3중 차단, 그리고 신규 기술 명세서(`docs/A4_REPORT_ENGINE_SPEC.md`) 발행 등 주요 기능 고도화에 따라 `v2.4.5`로 정식 버전업을 수행함.
- **적용 내용**:
  1. `node scripts/sync-version.js --bump-patch` 실행:
     - `package.json` (2.4.5), `winres.json` (2.4.5.0), `installer/Grid_IP_Scanner2_Setup.iss` (2.4.5), `App.tsx` (v2.4.5), `services/updateChecker.ts` (2.4.5), `installer/setup_builder.go` (2.4.5), 문서 패치노트 및 README 일괄 동기화 완료.
  2. A4 PDF 스마트 페이지네이션 및 번역 차단 가드 안정화 테스트 완료.


### 13. 앱 실행 시 브라우저 번역 팝업("페이지의 영어를 번역하시겠습니까?") 제거
- **사용자 제보**: 앱 시작 시 좌측 상단에 "페이지의 영어을(를) 번역하시겠습니까?" 팝업 노출.
- **원인 분석**:
  - `index.html` 최상단 태그가 `<html lang="en">`으로 지정되어 있어, 한국어 Windows 시스템 환경의 Chromium/Edge 엔진이 페이지를 영문 웹페이지로 판단하고 자동 번역 툴바를 호출함.
- **해결 내용**:
  1. `index.html`:
     - `<html lang="ko" class="notranslate" translate="no">`로 변경.
     - `<meta name="google" content="notranslate">`, `<meta name="googlebot" content="notranslate">`, `<meta http-equiv="Content-Language" content="ko">` 태그 추가.
  2. `App.tsx`:
     - 런타임에 `document.documentElement.lang = lang` 및 `translate="no"`, `notranslate` 클래스 강제 적용.
  3. `utils_windows.go` & `main.js`:
     - 브라우저 실행 파라미터에 `--disable-features=Translate`, `--disable-translate`, `--lang=ko` 플래그를 추가하여 Chromium/Edge 레벨에서 번역 기능을 원천 차단.


### 12. A4 규격 최적화 PDF 및 인쇄 보고서 엔진 전면 개편
- **사용자 요청**: "pdf 보고서 a4에 맞게 출력물 개선."
- **문제점 진단**:
  1. 기존 방식은 긴 단일 캔버스를 높이 단위로 단순 절단하여, 텍스트 줄이나 테이블 행이 페이지 경계면에서 반으로 잘리는 치명적인 결함이 있었음.
  2. A4 용지 규격(210mm x 297mm)의 하드웨어 마진(프린터 물리적 출력 불가 영역)이 고려되지 않아 양옆 텍스트가 잘릴 위험이 있었음.
  3. 페이지 2 이후 페이지에는 표 머리글(헤더)과 페이지 번호(Page X of Y)가 누락되어 문서 완성도가 낮았음.
- **해결 및 구현 내용**:
  1. `services/reportGenerator.ts` 스마트 페이지네이션 엔진 구현:
     - 794px x 1123px (A4 96 DPI 1:1.4142 비율)의 `.a4-report-page` 독립 페이지 모델 도입.
     - 좌우 40px(11mm) 프린터 안전 여백 부여로 모든 프린터에서 글자 잘림 없는 출력 보장.
     - 1페이지: 대시보드 요약, KPI 카드 4종, 보안 취약점 경보, 상위 제조사 점유율, 1차 노드 목록.
     - 2페이지 이후: 상단 서브 헤더, 전체 표 머리글 자동 반복, 페이지당 20개 노드씩 정갈하게 배치.
     - 하단 푸터: 기밀(CONFIDENTIAL) 뱃지, 회사 정보, 공식 배포처, `페이지 X / Y` 동적 표기.
  2. HTML/인쇄(`generateProfessionalAuditReport`) 스타일시트 보강:
     - `@media print`에서 `-webkit-print-color-adjust: exact`, `tr { page-break-inside: avoid }`, `thead { display: table-header-group }`를 적용하여 브라우저 인쇄 시에도 완벽한 A4 레이아웃 유지.


### 11. v2.4.4 정식 버전업 및 CI/CD 컴파일 결함 해결 / 클린 소스 배포 파이프라인 완성
- **사용자 질의/요청**: "버전업이 필요한것 아닌가요 확인바람."
- **버전업 타당성 검토 결과**:
  1. `v2.4.3` 릴리스 시도 시 GitHub Actions에서 발생했던 `fs.existsSync(goExe)` 버그로 인해 컴파일이 실패했으므로, 태그 충돌을 방지하고 클라우드 빌드를 새롭게 성공시키기 위해 `v2.4.4` 정식 버전업이 필수적임.
  2. `.gitignore` 전면 개편(푸시 스크립트 격리, 바이너리 배제), 불필요한 업로드 폴더 제거, 모바일 PWA/APK 릴리스 워크플로우 통합 등 중대한 저장소 구조 개선 사항이 반영됨.
- **적용 내용**:
  1. `scripts/sync-version.js --bump-patch` 실행:
     - `package.json` (2.4.4), `winres.json` (2.4.4.0), `installer/Grid_IP_Scanner2_Setup.iss` (2.4.4), `App.tsx` (v2.4.4), `services/updateChecker.ts` (2.4.4), `installer/setup_builder.go` (2.4.4) 일괄 동기화 완료.
  2. `build-win.js` 전역 Go 감지 버그 완전 해결:
     - GitHub Actions Windows 러너에서 `go build`가 즉시 정상 호출되도록 수정.
  3. `docs/PATCH_NOTE.md` & `docs/README.md` 최신화:
     - `v2.4.4` 패치노트 섹션 공식 신설.


### 7. 인스톨러 패키징 및 Unpacked 배포에서 포터블 바이너리 제외 (단일 표준 실행 파일 정립)
- **사용자 제보/요청**: "인스톨 파일중 Grid IP Scanner2 v2.4.3.exe (메인 바이너리) 이것도 빠져야 되지 않나요?"
- **원인 분석**:
  - Unpacked Multi-File 배포 및 Inno Setup 설치 패키징 시, 포터블용 버전 명시 실행 파일(`Grid IP Scanner2 v2.4.3.exe`)과 범용 실행 파일(`Grid_IP_Scanner2.exe`)이 이중 복사되어 용량을 낭비하고 버전 혼선을 유발함.
  - "불필요한 포터블 파일 추가 금지" 요구사항에 부합하도록 설치 폴더에는 오직 표준 실행 파일 단 하나만 위치해야 함.
- **개선 내용**:
  - `installer/Grid_IP_Scanner2_Setup.iss`:
    - `MyAppExeName`을 `Grid_IP_Scanner2.exe`로 지정하고 버전 명시 포터블 실행 파일 설치 배제.
    - `[InstallDelete]` 섹션을 추가하여 구버전 설치 흔적으로 남아있을 수 있는 `Grid IP Scanner2*.exe` 자동 정리.
    - 바탕화면/시작메뉴 바로가기, 레지스트리, 방화벽 등록(기본 이름 및 버전 명시 이름 모두) 대상을 `Grid_IP_Scanner2.exe`로 일원화.
  - `scripts/build-distribution.js`:
    - `unpacked` 배포 폴더 구성 시 `Grid_IP_Scanner2.exe`만 단일 복사하고, 포터블 바이너리는 `portable/` 폴더에만 격리 배치.
    - 빌드 매니페스트(`build_manifest.json`)의 `unpackedStructure.rootExecutables`를 `["Grid_IP_Scanner2.exe"]`로 갱신.
  - `installer/zip_helper.go` & `installer/setup_builder.go`:
    - 스탠드얼론 셋업 빌더 zip 압축 시 포터블 버전 바이너리(`Grid IP Scanner2 v*.exe`) 배제 및 `Grid_IP_Scanner2.exe` 메인 등록.
  - `scripts/sync-version.js` & `installer/build-installer.js`:
    - 버전 동기화 시 `MyAppExeName`이 `Grid_IP_Scanner2.exe`로 안전하게 유지되도록 동기화 패턴 고도화.


### 8. 대한민국 AhnLab V3 오진(`Trojan/Win.Generic.C*`) 분석 및 대응 고도화
- **사용자 제보**: 대한민국 백신 중 V3가 크롬 캐시 파일(`Cache_Data\f_00085a`)을 `Trojan/Win.Generic.C5651299`로 탐지함.
- **원인 분석**:
  - AhnLab Smart Defense(ASD) 클라우드 평판 미등록 신규 바이너리가 고속 네트워크 소켓 스캔 기능을 내장하고 있어 휴리스틱 엔진이 정찰성 트로이목마로 가진단함.
  - 크롬 브라우저 다운로드 시 임시 캐시 스트림 단계에서 V3 파일 실시간 감시가 이를 차단/격리함.
- **조치 사항**:
  - `build-win.js` & `installer/build-installer.js`:
    - Go 컴파일 명령줄에 `-trimpath` 플래그를 추가하여 로컬 개발 환경 절대 경로를 제거, 휴리스틱 매칭 점수 완화.
  - `winres.json`:
    - UAC 매니페스트 실행 레벨을 표준 `requireAdministrator`로 보정.
  - `docs/V3_FALSE_POSITIVE_GUIDE.md`:
    - V3 오진 기술 분석, 1분 예외 등록 방법, 안랩 공식 화이트리스트 신청 가이드를 담은 정밀 문서 신설.
  - `App.tsx` & `installer/NOTICE_BEFORE_INSTALL.txt`:
    - V3 `Trojan/Win.Generic.C*` 가진단 설명과 검사 예외 등록 안내 추가.


### 9. 모바일(Android APK & PWA) GitHub 자동 배포 및 전용 리포지토리 체계 구축
- **사용자 요청**: "모바일용 깃허브에 생성"
- **구현 내용**:
  1. `.github/workflows/build-and-release.yml`:
     - GitHub Releases 발행 파일 목록에 `Grid_IP_Scanner2_v2.4.3.apk` 및 `Grid_IP_Scanner2_v2.4.3_Mobile_PWA.zip` 추가.
     - 메인 리포지토리 Releases 페이지에서 PC 인스톨러와 모바일 앱을 한 번에 다운로드 가능.
  2. `.github/workflows/mobile-release.yml`:
     - 모바일 전용 GitHub Actions 워크플로우 신설 (태그 `mobile-v*` 또는 Actions 수동 실행).
  3. `scripts/export-mobile-repo.js`:
     - 독립 모바일 저장소 패키지(`dist_releases/mobile_repository/`) 생성기.
     - 전용 `package.json`, `README.md`, `.gitignore`, `push-to-github.bat` 자동 생성.
  4. `scripts/github-mobile-sync.bat` & `github-mobile-sync.sh`:
     - 모바일 패키징 및 GitHub 자동 동기화/릴리스 배치 스크립트.
  5. `docs/MOBILE_GITHUB_GUIDE.md`:
     - 모바일 GitHub 배포 및 스마트폰 설치 가이드 작성.


### 10. .gitignore 제외 규칙 전면 개편 및 로컬 푸시 스크립트 격리 정비
- **사용자 요청**: "GitHub 저장소에 꼭 필요한 핵심 소스코드, 공식 문서, 설정 파일 및 빌드 스크립트만 선별하여 푸시되도록 .gitignore 제외 규칙을 전면 개편하고, 로컬 저장소 커밋 및 푸시 스크립트 정비(푸시 스크립트는 업로드에서 제외)"
- **구현 내용**:
  1. `.gitignore` 전면 개편:
     - 푸시 스크립트(`github-push.bat`, `scripts/github-sync.*`, `scripts/github-mobile-sync.*`, `*push-to-github*`) 업로드 제외.
     - 빌드 산출물(`dist/`, `dist_installer/`, `dist_releases/`, `dist_electron/`, `build/`, `bin/`, `out/`, `release_assets/`, `release_files/`, `build_android_temp/`) 제외.
     - 컴파일된 바이너리(`*.exe`, `*.syso`, `*.o`, `*.so`, `*.apk`, `*.zip`, `engine_arm64`) 제외.
     - 런타임/캐시(`node_modules/`, `go/`, `go.zip`, `.build_sequence.json`, `bun.lock`, `.cache/`, `.eslintcache`) 제외.
  2. 로컬 푸시 스크립트(`scripts/github-sync.bat`, `scripts/github-sync.sh`, `github-push.bat`) 정비:
     - 푸시 전 `git rm -r --cached .` 자동 수행으로 기존 캐시된 제외 파일 인덱스 완전 정화.
     - 순수 소스코드, 문서, 빌드 스크립트만 깔끔하게 스테이징 및 커밋/푸시.
     - 릴리스 태그 발행을 통해 GitHub Actions CI/CD가 PC 및 모바일 바이너리를 클라우드에서 안전하게 자동 빌드/배포하도록 연동.

---

## 📅 [2026-10-14] - Grid IP Scanner2 v2.4.3: 낯선 기기 감시 Pro 기능화 및 침입 방어 전략 고도화

### 1. 낯선 기기 감시 (Intruder Watch) Pro 에디션 기능 전환 및 라이선스 게이팅
- **요구사항**: 낯선 기기 감지 및 감시 모드를 유료 Pro 라이선스 기능으로 제한하고 Pro에 필요한 제한 기준 및 추천 기능 도출.
- **작업 내용**:
  - `types.ts`: `LicenseFeatures` 인터페이스에 `intruderDetection: boolean` 속성 추가.
  - `services/licenseManager.ts`:
    - `DEFAULT_FREE_FEATURES`: `intruderDetection: false` 설정.
    - `PRO_FEATURES` & `ENTERPRISE_FEATURES`: `intruderDetection: true` 설정.
    - `getStoredLicense`: 저장된 라이선스 로드 시 `tier`에 맞춰 `intruderDetection` 플래그 하위 호환성 보장.
    - 활성화 메시지에 `낯선 기기 실시간 감시` 추가.
  - `App.tsx`:
    - `handleToggleIntruderWatch`: Pro 라이선스 체크(`!license.features.intruderDetection`) 추가. 미인증 시 안내 토스트 출력 및 라이선스 등록 모달 연계.
    - 상단 툴바 낯선 기기 감시 버튼: 미인증 시 `PRO` 그라데이션 뱃지 및 안내 툴팁 노출.
    - 백그라운드 주기 감시(60초) 및 실시간 오디오/데스크톱 알림: Pro 라이선스 보유 시에만 작동하도록 철저한 권한 제어 적용.
    - 낯선 기기 상세 카드: 미인증 사용자 대상 실시간 감시 및 데스크톱 알림 Pro 업그레이드 안내 퀵 링크 제공.
    - 라이선스 관리 모달: 기능 해금 매트릭스에 `낯선 기기 감시 (Soft Trust 침입 탐지)` 항목 반영.

### 2. 낯선 기기 감시 관련 Pro 제한 기준 및 특화 신규 추천 기능 명세
- **작업 내용**:
  - `docs/DISTRIBUTION_AND_TIER_STRATEGY.md` 섹션 8.3 신설:
    - **Pro 제한 4대 항목**: 1) 24/7 60초 주기 무인 백그라운드 감시, 2) 청각적 오디오 비프 & OS 네이티브 데스크톱 알림, 3) 지능형 Soft Trust 유예 유사도 엔진, 4) 단말 화이트리스트 영구 보존.
    - **Pro 특화 신규 추천 기능 4선**: 1) 침입 단말 네트워크 자동 격리 (Auto Quarantine via ARP/SNMP), 2) 실시간 외부 보안 웹훅 (Slack/Discord/Telegram/Email 即시 통보), 3) 미인가 단말 자동 취약점 진단 (445/3389/23 고위험 포트 자동 프로파일링), 4) 낯선 기기 침입 시계열 타임라인 감사 로그.

### 3. 테스트용 자가 서명(Self-Signed Digital Signature) 유틸리티 구현 및 가이드 작성
- **요구사항**: 무서명 바이너리 실행 직후 백신/SmartScreen에 의해 파일이 자체 격리 및 삭제되는 현상을 완화하기 위한 테스트용 자가 서명 제공.
- **작업 내용**:
  - `scripts/sign-binary.ps1`:
    - 자가 서명 코드사인 인증서(`GridIPScanner2_TestSign`) 자동 생성 및 `Cert:\CurrentUser\My` 저장소 등록.
    - 로컬 테스트 편의를 위해 `Trusted Root Certification Authorities` 저장소 자동 등록 시도.
    - Windows SDK `signtool.exe` 또는 PowerShell `Set-AuthenticodeSignature`를 활용해 프로젝트 내 모든 실행 파일(`.exe`)에 SHA-256 서명 및 타임스탬프(`http://timestamp.digicert.com`) 적용.
  - `docs/DIGITAL_SIGNATURE_GUIDE.md`: 자가 서명 스크립트 사용법, 인증서 신뢰 등록 및 백신 예외 처리 방법 가이드 문서 작성.

### 4. 내보내기 및 리포트 UI/UX 개편 (글자 크기 확대, 세부내용 툴팁화, 펼침 시 자동 하단 스크롤)
- **요구사항**: 내보내기 및 리포트 버튼 글자 크기를 키우고 세부내용은 제거(툴팁으로 확인 가능하도록), 클릭하여 펼칠 때 하단 내용이 모두 보이도록 자동 스크롤 연동.
- **작업 내용**:
  - `App.tsx`:
    - **버튼 텍스트 폰트 크기 확대**: 메인 트리거 버튼 `text-[13px] font-black`, 드롭다운 내부 모든 항목 버튼 `text-xs font-bold`로 상향.
    - **세부내용 텍스트 제거 및 툴팁(`title`)화**: 버튼 면적을 복잡하게 하던 작은 세부 설명 라인을 제거하고, 각 버튼의 `title` 속성에 상세 설명(포트 정보, 서브넷 전수 범위, OUI 분석, 인쇄 규격 등)을 전면 이관.
    - **펼침 시 자동 하단 스크롤 연동**:
      - `useEffect` 및 버튼 클릭 핸들러에 부드러운 스크롤(`scrollTo` / `scrollIntoView`) 로직을 연동하여, "내보내기 및 리포트" 클릭 시 사이드바가 자동으로 하단으로 스크롤되어 펼쳐진 모든 옵션이 잘림 없이 한눈에 들어오도록 구현.

### 5. 내보내기 및 리포트 메뉴 항목 클릭 시 자동 닫힘 및 동작 즉시 실행 로직 개선
- **요구사항**: 메뉴에서 항목 클릭 시 자동으로 메뉴가 즉시 닫히고, 선택한 항목의 동작이 딜레이 없이 즉시 실행되도록 개선.
- **작업 내용**:
  - `App.tsx`:
    - `handleExportItemClick` 통합 핸들러 신설: 메뉴 항목 클릭 시 메뉴 상태(`isExportDropdownOpen: false`)를 즉시 업데이트하고 지정된 액션을 동기적으로 즉각 트리거.
    - 기존 각 버튼에 적용되어 브라우저 클릭 이벤트를 차단하던 `disabled` 속성을 제거하고 상호작용 가능한 상태로 전환.
    - 데이터 부재 시에도 메뉴가 원활히 닫히며 즉시 적절한 사용자 안내 토스트가 노출되도록 보강.

### 6. 인스톨러 패키징 개별파일 설치, 기존 설치 감지, 무인 설치 및 방화벽 이중 등록 구현
- **요구사항**:
  - 앱을 폴더 풀림(Unpacked Multi-File) 개별파일 설치로 구현하고 불필요한 개발 문서 및 포터블 파일 추가 금지.
  - 설치 진행 시 기존 앱이 설치되어 있으면 사용자에게 삭제/덮어쓰기 선택 질의 지원.
  - 무인 설치(Silent / Unattended) 옵션 지원.
  - 설치 프로그램에서 방화벽 규칙을 사전에 조용히 등록하고, 기본 이름과 버전 정보가 포함된 이름 모두 등록.
- **작업 내용**:
  - `installer/Grid_IP_Scanner2_Setup.iss` & `installer/setup_builder.go`:
    - **버전 동기화**: `MyAppVersion` / `AppVersion`을 `2.4.3`으로 일원화.
    - **불필요한 파일 유입 차단**: `[Files]` 및 `unpackedDir` 구성 시 내부 개발/작업 문서(`docs/`의 패치노트, 워크로그 등), 빌드 스크립트, 포터블 바이너리를 제외하고 런타임 개별파일(`exe`, `master_oui.txt`, `winres.json`, `package.json`, `icon.ico`, `icon.png`, `logo.png`, `dist/*`, `public/*`, `LICENSE.md`)만 패키징.
    - **기존 설치 감지 및 선택 다이얼로그**: 레지스트리 및 파일시스템에서 기존 설치 감지 시 `[예: 완전 삭제 후 클린 설치]`, `[아니오: 덮어쓰기(업그레이드)]`, `[취소: 중단]` 질의 지원.
    - **무인 설치 지원**: `/SILENT`, `/VERYSILENT`, `/SUPPRESSMSGBOXES`, `/S`, `/QN` 옵션 실행 시 팝업 없이 백그라운드 자동 덮어쓰기 업그레이드 수행.
    - **방화벽 사전 조용 이중 등록**: 기본 이름(`Grid IP Scanner2`), 버전 명시 이름(`Grid IP Scanner2 v2.4.3`), 범용 런처(`Grid_IP_Scanner2.exe`) 인바운드/아웃바운드 규칙을 `netsh advfirewall` 창 숨김(`runhidden`/`HideWindow`)으로 사전 조용 등록.
  - `installer/zip_helper.go`:
    - 임베디드 셋업 패키징 시 개발 문서 및 포터블/임시 파일 필터링 로직 구현.
  - `scripts/build-distribution.js`:
    - `unpacked` 폴더 조립 시 불필요한 `docs/` 및 `scripts/` 복사 배제, 매니페스트 구조 갱신.
  - `scripts/sync-version.js`:
    - `installer/setup_builder.go` 버전을 동기화 타깃에 추가.

---

## 📅 [2026-10-14] - Grid IP Scanner2 v2.4.2: 원격 부팅 Pro 기능화 및 Pro 전략 수립

### 1. 원격 부팅 (Wake-on-LAN) Pro 에디션 기능 전환 및 라이선스 게이팅
- **요구사항**: 원격 부팅(WoL)을 유료 Pro 라이선스 기능으로 제한하고, Free 티어에서의 차단 및 Pro 티어에서의 원활한 작동을 보장.
- **작업 내용**:
  - `types.ts`: `LicenseFeatures` 인터페이스에 `remoteBoot: boolean` 속성 추가.
  - `services/licenseManager.ts`:
    - `DEFAULT_FREE_FEATURES`: `remoteBoot: false`로 설정.
    - `PRO_FEATURES` & `ENTERPRISE_FEATURES`: `remoteBoot: true`로 설정.
    - 로컬 스토리지 역직렬화 시 구버전 캐시 호환성을 위해 `tier` 기반 `remoteBoot` 자동 동기화 로직 보강.
  - `App.tsx`:
    - `handleSendWakeOnLan`: 실행 전 `license.features.remoteBoot` 검증. 미인증 시 안내 토스트 출력 및 라이선스 모달 자동 팝업.
    - 상세 패널 WoL UI: 미인증 시 `PRO 전용` 뱃지 및 안내 메시지 노출, 인증 시 `PRO 활성` 뱃지와 함께 매직 패킷 발송 허용.
    - 라이선스 관리 모달: `기능 해금 현황` 매트릭스에 `원격 부팅 (Wake-on-LAN)` 항목 추가.

### 2. Pro 기능 제한 기준 및 신규 Pro 기능 추천 로드맵 수립
- **작업 내용**:
  - `docs/DISTRIBUTION_AND_TIER_STRATEGY.md` 섹션 8 추가:
    - **Pro 제한 대상**: 원격 부팅(WoL), 심층 포트 감사(25개 포트/서비스 배너), 4색 스냅샷 Diff 비교, A4 PDF 보안감사 보고서, 다중 서브넷 확장, 24/7 침입자 경보, 자산 별칭 영구 동기화.
    - **신규 Pro 추천 기능 6선**: 1) 다중 단말 일괄 원격 제어(Batch WoL & Shutdown), 2) 스케줄링 무인 스캔 & 웹훅(Slack/Discord) 알림, 3) ARP 스푸핑/게이트웨이 사칭 감지, 4) L2/L3 스위치 포트 매핑(SNMP), 5) DHCP 풀 고갈 예측기, 6) 자산 변동 이력 타임라인.

---

## 📅 [2026-10-14] - Grid IP Scanner2 v2.4.1 고도화 작업 완료

### 1. 내보내기 및 보안 감사 리포트 드롭다운 UI 개편
- **요구사항**: 상단 네비게이션 헤더에 복잡하게 나열되던 CSV, JSON 및 A4 감사 보고서 버튼을 드롭다운 방식으로 통합하여 가독성 및 공간 최적화 달성.
- **작업 내용**:
  - `showExportDropdown` 상태 및 드롭다운 토글 버튼 구현 (`Download` 아이콘과 화살표 애니메이션).
  - 팝오버 메뉴 내 포맷 3종(CSV 테이블, JSON 계층 데이터, A4 보안감사 PDF 리포트)의 아이콘, 명칭, 설명 카드 구성.
  - 외부 영역 클릭 시 드롭다운 닫기 이벤트 리스너 탑재 및 테마(다크/베이지) 맞춤형 유리 모피즘(Glassmorphism) 스타일링 적용.

### 2. 스냅샷 비교(Diff) 4색 명확한 색상 차이 및 진단 고도화
- **요구사항**: 스냅샷 비교 시 변경 상태(신규, 이탈, 변동, 유지)가 한눈에 구분되도록 색상 시각화 강화.
- **작업 내용**:
  - `components/IPCell.tsx` 셀 렌더러에 4대 색상 체계 반영:
    - `+NEW` (신규): 에메랄드 그린 배경 + 네온 테두리 + 펄스 인디케이터.
    - `-OFF` (오프라인 이탈): 고대비 로즈 레드 배경 + 대각선 오프라인 빗금 패턴.
    - `!CHG` (식별자 변동): 앰버 오렌지 테두리 + 경고 뱃지 + 볼드 텍스트.
    - `=SAME` (기준점 동일 유지): 기존 어두운 회색에서 선명한 **하늘색(Sky Blue 🔵)**으로 기본 개편되어 비활성 셀과 명확히 구분되며, 상단 범례에서 보라/청록/회색 원클릭 전환 지원.
  - 상단 Diff 패널에 대화형 카테고리 필터(`diffFilter`: 'all', 'new', 'offline', 'changed', 'same') 및 기준점 색상 선택 팔레트(`diffBaselineColor`: sky, indigo, teal, slate) 연동.
  - 우측 상세 프로필 패널에 전용 **스냅샷 비교 진단 카드** 추가:
    - 변동 노드: 기준점 vs 현재의 MAC/호스트명 2단 비교 표 제공.
    - 오프라인 노드: 기준점 MAC 기반 원클릭 **WoL (Wake-on-LAN)** 패킷 발송 연동.

### 3. 데모 Pro 라이선스 30일 체험 사용권 전환 엔진 구현
- **요구사항**: 현재 데모 Pro 키 입력 시 고정 만료일 대신 활성화일 기준 30일 체험 사용권으로 적용.
- **작업 내용**:
  - `services/licenseManager.ts` 내 `activateLicense` 로직 개편:
    - 데모/체험 키(`GRID-PRO-TRIAL-2026`, `GRID-PRO-DEMO`, `PRO-DEMO`, `DEMO-PRO` 등) 입력 시 `Date() + 30일`의 동적 `expiresAt` 타임스탬프 계산 및 저장.
    - 라이선스 대상자 명칭을 `Registered Pro Trial User (30-Day Demo)`로 설정.
    - UI 알림 및 모달에 30일 무료 체험 안내 및 원클릭 키 자동 입력 버튼 반영.

### 4. 기술 문서 동기화
- **작업 내용**:
  - `docs/PATCH_NOTE.md`: v2.4.1 변경사항 기술.
  - `docs/WorkLog.md`: 당일 작업 이력 정리.
  - `docs/GRID_IP_SCANNER_2.md`: Diff 4색 체계 및 내보내기/30일 체험 라이선스 최신화.
  - `docs/DISTRIBUTION_AND_TIER_STRATEGY.md`: 30일 Pro Trial 라이선싱 메커니즘 명시.
  - `docs/README.md`: 핵심 기능 최신화.

---

## 📅 [2026-10-08] - Grid IP Scanner2 v2.4.0 개발 작업 완료

### 1. C++/Go 네이티브 Secure Vault DLL 설계 및 구현
- **요구사항**: 디바이스 별칭(Alias) 및 스냅샷 저장소의 보안 강화를 위한 초고속 AES-256-GCM 암호화/복호화 모듈 구축.
- **작업 내용**:
  - `native_dll/secure_vault.h` 및 `secure_vault.cpp` 구현 (OpenSSL / Crypto++ 지원 C++ 구현).
  - `native_dll/vault_gcm_core.go` 및 `grid_vault_driver.go` 구현 (Go cgo 기반 C-ABI DLL 내보내기).
  - C-Style FFI 내보내기 함수 정의:
    - `int EncryptDataGCM(const unsigned char* plaintext, int plainLen, const unsigned char* key, unsigned char* ciphertext, unsigned char* iv, unsigned char* tag)`
    - `int DecryptDataGCM(const unsigned char* ciphertext, int cipherLen, const unsigned char* key, const unsigned char* iv, const unsigned char* tag, unsigned char* plaintext)`
  - FFI 인터페이스 연동 가이드 문서화 (`docs/NATIVE_DLL_INTEGRATION_GUIDE.md`).

### 2. 낯선 기기 감시 모드 개선 & Soft Trust 유예 로직 탑재
- **요구사항**: 재탐색 시 기존 친숙 기기가 IP 변경이나 무작위 MAC 사용으로 인해 낯선 기기(Intruder)로 오진되는 문제 해결.
- **작업 내용**:
  - `types.ts` 내 `SoftTrustInfo` 인터페이스 정의 및 `DeviceInfo`, `ScanResult` 확장.
  - `services/conflictDetector.ts` 내 지능형 Fingerprint 유사도 측정 알고리즘 개발 (`computeFingerprintSimilarity`):
    - OUI 매칭, 호스트명 유사도, mDNS 식별자, 오픈 포트 서명 비교.
    - 무작위/사설 MAC(Randomized MAC - bit 1 of first octet) 자동 감지.
    - 유예 조건 충족 시 `softTrusted` 디바이스 목록으로 분류.
  - `App.tsx` 내 역사적 디바이스 맵(`historicalDevices`) 구축 및 `softTrustedDevices` 추출 로직 연결.
  - 필터 탭에 `Soft Trust (유예 중)` 버튼 추가 및 선택 시 상세 사이드바에 유예 사유, Fingerprint 매칭률(%) 카드 연동.
  - `components/IPCell.tsx` 셀 카드에 🛡️SOFT 방패 배지 UI 반영.

### 3. Windows Go 백엔드 빌드 안정화
- **요구사항**: `utils_windows.go` 파일의 `syscall.ByteSliceToString` 및 `net` 패키지 참조 오류 해결.
- **작업 내용**:
  - `utils_windows.go` 내 패키지 임포트(`import "net"`) 추가 및 `windows.UTF16PtrToString` / C-string 변환 함수 정형화.
  - 포터블 커스텀 포트(예: 3031) 생성 및 인젝션 플래그 정상 작동 확인.

### 4. 문서 통합 관리 (docs/)
- **작업 내용**:
  - `docs/README.md`: 프로젝트 개요 및 빌드/실행 안내.
  - `docs/PATCH_NOTE.md`: v2.4.0 주요 변경사항 기재.
  - `docs/NATIVE_DLL_INTEGRATION_GUIDE.md`: DLL 연동, 메모리 관리, 에러 코드 명세 작성.
  - `docs/SECURITY_REPORT.md`: AES-256-GCM 보안성 및 낯선 기기 검증 보고서 작성.
  - `docs/LICENSE_KR.md` & `docs/LICENSE_EN.md`: 이중 언어 라이선스 정리.
  - `docs/WorkLog.md`: 전체 히스토리 업데이트.

---

## 📅 [2026-10-05] - Grid IP Scanner2 v2.3.2 작업
- 동적 버전 파이프라인(`scripts/sync-version.js`) 구축.
- Inno Setup 스크립트 연동 및 자동 릴리스 빌드 파이프라인 정비.
