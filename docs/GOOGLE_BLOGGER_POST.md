# 📝 [구글 블로거 포스팅 완벽 가이드] Grid IP Scanner2 공식 소개 및 배포
> **공식 블로그**: [https://ahbiyoutvibe.blogspot.com/](https://ahbiyoutvibe.blogspot.com/)  
> **공식 깃허브**: [https://github.com/AhBiYout-all/grid-ip-scanner2](https://github.com/AhBiYout-all/grid-ip-scanner2)  
> **공식 배포사**: [https://www.cisnet.co.kr](https://www.cisnet.co.kr)  
> **최신 버전**: v2.4.6 | **작성일자**: 2026-10-26

---

## 📌 블로거(Blogger) 기본 설정 요약 (메타데이터)
* **맞춤 퍼머링크 (Permalink)**: `grid-ip-scanner2-visual-network-scanner`
* **검색 설명 (Search Description)**:
  > 16x16 시각화 그리드 맵, 9만 건 오프라인 OUI 제조사 식별, 4색 스냅샷 Diff 비교, 24시간 침입 감시, 원클릭 A4 보안감사 PDF 리포트와 원격 부팅(WoL)을 지원하는 초고속 차세대 네트워크 진단 도구 Grid IP Scanner2 (v2.4.6)를 소개합니다.

---

# 📝 [작성 모드 (서식 있는 텍스트)] 전용 본문
> **사용 방법**: 구글 블로거 글쓰기 화면 좌측 상단 연필 아이콘에서 **[작성 모드]**를 선택한 후, 아래 영역의 내용을 그대로 복사하여 붙여넣으세요.
> 규정 순서: **1. 제목 ➔ 2. 본문 ➔ 3. 업데이트 ➔ 4. 앱 그림 ➔ 5. 다운로드 ➔ 6. 버전정보 ➔ 7. 시스템 요구 사항 ➔ 8. 제작자 및 공식 채널 안내 ➔ 9. 전체 업데이트(이전 기록 모두, 기능 개선 내용만 기록) ➔ 10. 추천 태그**

---

### 1. 제목
**[무료/초고속] 16x16 시각화 그리드 맵과 9만 건 OUI를 탑재한 차세대 네트워크 스캐너: Grid IP Scanner2 (v2.4.6)**

---

### 2. 본문
안녕하세요, **AhBiYout (씨아이에스넷 / Cisnet)**입니다.

네트워크 관리자, 시스템 엔지니어, 사내 전산 담당자라면 한 번쯤 **Advanced IP Scanner**나 **Angry IP Scanner** 같은 진단 도구를 사용해 보셨을 것입니다. 하지만 기존 도구들은 수백 개의 IP 주소를 단순한 텍스트 행(Row) 리스트로만 나열하여 전체 네트워크의 유휴 공간과 밀도를 직관적으로 파악하기 어려웠습니다. 또한 어제와 오늘의 네트워크 접속 장비 변화를 비교하거나, 경영진 및 감사 제출용 A4 보고서를 즉시 작성하는 데 큰 번거로움이 있었습니다.

이러한 현장의 갈증을 해소하기 위해 탄생한 **『Grid IP Scanner2』**는 C클래스(/24) 전체 254개 IP를 **16x16 매트릭스 그리드 맵**으로 실시간 시각화하며, 9만 건 이상의 내장 하드웨어 제조사(OUI) 데이터베이스, 4색 스냅샷 Diff 비교, 24/7 침입자 백그라운드 감시, 원클릭 A4 규격 보안감사 PDF 출력, 원격 부팅(Wake-on-LAN)을 제공하는 고성능 네트워크 스캐너입니다.

#### 🚀 Grid IP Scanner2 핵심 기능
* **16x16 시각화 그리드 맵**: 전체 254개 노드의 활성/비활성/경고 상태를 신호등처럼 1초 만에 직관적으로 조망.
* **90,168건 내장 오프라인 OUI 식별**: 인터넷이 차단된 폐쇄망에서도 1ms 미만의 속도로 삼성, 애플, 시스코, 시놀로지 등 하드웨어 제조사 식별.
* **과거 vs 현재 4색 스냅샷 Diff**: 기준점 대비 신규 접속(+NEW), 오프라인 전환(-OFF), 장비 식별 변경(!CHG), 정상 유지(=SAME)를 4색으로 정밀 진단.
* **24시간 무인 백그라운드 침입 감시**: 미등록 낯선 기기 탐지 시 즉각적인 데스크톱 팝업 및 오디오 비프 경보 송출 (스마트폰 비공개 MAC 오경보 방지 Soft Trust 탑재).
* **원클릭 원격 부팅 (WoL)**: 타깃 단말 선택 후 UDP 매직 패킷 브로드캐스트로 원격 전원 켜기 지원.
* **경영진 제출용 A4 보안감사 PDF 리포트**: OUI 점유율 통계, 고위험 취약 포트(445, 3389, 23) 개방 단말 진단, 인벤토리 상세를 페이지당 30개 노드로 최적 조판하여 즉시 출력.

---

### 3. 업데이트 (v2.4.6 최신 릴리즈 하이라이트)
* **Windows 정식 '프로그램 추가/제거(제어판)' 등록**: Windows 10/11 '설정 > 앱 및 기능' 및 제어판에 정식 등록되어 잔존 파일 없이 클린 언인스톨 지원.
* **윈도우 인스톨러(Setup.exe) 및 단일 포터블(Portable .exe) 동시 듀얼 빌드**: 업무용 PC 정식 설치형과 USB 외근 점검용 1초 무설치 포터블을 동시에 제공.
* **안드로이드 APK 스마트폰 직접 설치 호환성 강화**: 패키지 ZipAlign 정렬 및 키서명 안정화로 모바일 기기에서의 파싱/설치 오류 원천 해결.
* **장치 프로필 패널 가독성 전면 개선 및 2단계 폰트 확대 시스템**: 10~12px 표준 가독성 확보 및 원터치 `[가 100%] ↔ [가⁺ 115%]` 확대 스위처 탑재.
* **스냅샷 기준색(하늘/보라/청록/회색)과 추가 스캔(+NEW) 노드의 시각적 대비 극대화**: 미할당 빈 IP 슬롯(245개) 오분류를 바로잡고 신규 노드 에메랄드 펄스 발광 강조.
* **스냅샷 비교 툴바 상단 내용 잘림 원천 차단 (Zero-Clipping Sub-Header)**: 독립 서브헤더 레이어로 승격하여 해상도에 관계없이 항상 조작 버튼 고정.
* **스캔 중 브라우저 창 닫기/새로고침 방지 경고 및 소켓 안전 해제 이벤트 탑재**.

---

### 4. 앱 그림 (UI 프리뷰 및 화면 구성)

```
+---------------------------------------------------------------------------------------+
|  [Grid IP Scanner2 v2.4.6]   [ 192.168.0.1 - 254 ]   [▶ 고속 스캔]   [📸 스냅샷 비교]   |
+------------------------------------------------------+--------------------------------+
|  [ 16x16 실시간 시각화 매트릭스 그리드 맵 ]            |  [ 장치 상세 프로필 패널 ]       |
|                                                      |  [가 100%] [가⁺ 115%]          |
|  [001] [002] [003] [004] [005] [006] ... [016]        |  ----------------------------- |
|  [017] [018] [019] [020] [021] [022] ... [032]        |  IP: 192.168.0.10              |
|  ...                                                 |  MAC: 00:11:32:8A:BC:DE        |
|  [🟢 +신규] [🔴 -오프ライン] [🟡 !변동] [🔵 =기준]        |  제조사: Synology Incorporated |
|                                                      |  개방 포트: 80, 443, 5000       |
|  * 254개 전체 C클래스 IP를 한눈에 밀도 조망            |  [⚡ WoL 매직 패킷 원격 부팅]    |
+------------------------------------------------------+--------------------------------+
|  [📄 A4 정밀 보안감사 PDF 리포트]  [📊 1:1 대조 스튜디오]  [🚨 24/7 낯선 기기 감시: PRO]  |
+---------------------------------------------------------------------------------------+
```

* **화면 1: 16x16 매트릭스 시각화 그리드**: 254개 전체 IP 노드의 실시간 가동 상태를 색상과 애니메이션으로 한눈에 조망.
* **화면 2: 4색 스냅샷 Diff & 1:1 대조 스튜디오**: 과거 기준점과 현재 상태를 나란히 대조하여 신규 침입 기기 및 변경 사항 즉시 식별.
* **화면 3: 장치 상세 프로필 & 원터치 글자 확대**: 선택된 기기의 MAC, OUI 제조사, 호스트명, 개방 포트 확인 및 115% 폰트 확대 지원.
* **화면 4: A4 규격 스마트 페이지네이션 보안 감사 리포트**: 경영진 및 감사 제출용 원클릭 PDF 출력 (페이지당 30개 노드 수납).

---

### 5. 다운로드
필요하신 운영체제 환경에 맞춰 최신 빌드를 다운로드하세요:

* 📦 **Windows 정식 인스톨러**: `Grid_IP_Scanner2_v2.4.6_Setup.exe`  
  *(Windows 제어판 프로그램 추가/제거 정식 등록, 방화벽 규칙 자동 등록, 바탕화면 바로가기 생성)*
* 🚀 **Windows 무설치 포터블**: `Grid_IP_Scanner2.exe` / `Grid_IP_Scanner2_v2.4.6_Portable.exe`  
  *(설치 과정 없이 USB나 외장 드라이브에서 즉시 실행 가능한 단일 실행 바이너리)*
* 📱 **Android 스마트폰 설치 APK**: `Grid_IP_Scanner2_v2.4.6.apk`  
  *(안드로이드 스마트폰/태블릿 직접 설치용 고성능 모바일 패키지)*
* 🌐 **모바일 웹 & iOS PWA 패키지**: `Grid_IP_Scanner2_v2.4.6_Mobile_PWA.zip`  
* 🔗 **GitHub 공식 릴리즈 다운로드**: [https://github.com/AhBiYout-all/grid-ip-scanner2/releases](https://github.com/AhBiYout-all/grid-ip-scanner2/releases)

> 💡 **안드로이드 설치 안내**: 다운로드 후 스마트폰에서 "출처를 알 수 없는 앱 설치 허용(Chrome 또는 파일 관리자)"을 설정하시고, Play 프로텍트 경고가 나타날 경우 "세부정보 보기 ➔ 무시하고 설치"를 누르시면 정상 설치됩니다.  
> 🛡️ **백신 오탐지(False Positive) 안내**: 본 소프트웨어는 순수 네트워크 진단 도구로 악성 행위가 100% 일절 없습니다. 신규 바이너리 특성상 안랩 V3나 Windows Defender에서 오탐될 경우 검사 예외로 등록하시면 안전하게 동작합니다.

---

### 6. 버전정보
* **프로그램 명칭**: Grid IP Scanner2
* **소프트웨어 버전**: v2.4.6
* **출시 일자**: 2026-10-26
* **라이선스 정책**: Dual License (무료 커뮤니티 GPL v3 + Pro 상용 에디션)
* **30일 무료 체험(Trial) 키**: `GRID-PRO-TRIAL-2026`  
  *(앱 상단 [라이선스 관리] 메뉴에 입력 시 30일간 Pro 전 기능을 아무런 제약 없이 무료 체험 가능)*

---

### 7. 시스템 요구 사항
* **Windows 환경**:
  - 운영체제: Windows 10 / Windows 11 (64-bit 권장)
  - 프로세서: Intel / AMD 1.6 GHz 이상 x86/x64
  - 메모리: RAM 2GB 이상 (권장 4GB 이상)
  - 네트워크: 유선 LAN 어댑터 또는 802.11 Wi-Fi 어댑터
* **안드로이드 환경**:
  - 운영체제: Android 7.0 (Nougat, API 레벨 24) 이상
  - 아키텍처: ARM64-v8a, armeabi-v7a, x86_64
* **웹 브라우저 환경**:
  - Chrome, Edge, Safari, Firefox 등 최신 모던 브라우저 (ES2022 이상 지원)

---

### 8. 제작자 및 공식 채널 안내
* **제작자 / 개발자**: AhBiYout
* **공식 배포사**: 씨아이에스넷 (Cisnet, [https://www.cisnet.co.kr](https://www.cisnet.co.kr))
* **공식 구글 블로그**: [https://ahbiyoutvibe.blogspot.com/](https://ahbiyoutvibe.blogspot.com/)
* **공식 GitHub 저장소**: [https://github.com/AhBiYout-all/grid-ip-scanner2](https://github.com/AhBiYout-all/grid-ip-scanner2)
* **공식 이슈 및 기능 제안**: [GitHub Issues 등록 바로가기](https://github.com/AhBiYout-all/grid-ip-scanner2/issues)
* **공식 고객지원 이메일**: `redmunlight@gmail.com`

---

### 9. 전체 업데이트 (이전 기록 모두, 기능 개선 내용만 기록)

* **[v2.4.6] (2026-10-26)**
  - Windows 정식 프로그램 추가/제거(제어판) 등록 및 클린 언인스톨러 지원.
  - 윈도우 인스톨러(Setup.exe) 및 단일 무설치 포터블(Portable .exe) 동시 자동 패키징 파이프라인 탑재.
  - 안드로이드 APK 스마트폰 직접 설치 호환성 강화 및 CI/CD 아티팩트 빌드 파이프라인 무결성 확보.
  - 장치 프로필 패널 가독성 전면 개선 및 2단계 폰트 확대 시스템 탑재 (`[가 100%] ↔ [가⁺ 115%]`).
  - 스냅샷 기준색(하늘/보라/청록/회색)과 추가 스캔(+NEW) 노드의 시각적 대비 극대화 및 미할당 빈 셀 판별 로직 분리.
  - 스냅샷 비교 툴바 상단 내용 잘림 원천 차단 (Zero-Clipping Sub-Header) 및 하단 불필요 설명 제거.
  - 딥 다각도 스냅샷 비교 엔진(Deep Diff v2) 및 1:1 대조 스튜디오 모달 완성.
  - 스냅샷 비교 시 단순 핑 지연 편차 분리 및 MAC/호스트명 정규화를 통한 오탐지 원천 해결.
  - 스캔 중 브라우저 창 닫기/새로고침 방지 경고 및 소켓 안전 해제 이벤트 탑재.

* **[v2.4.5] (2026-10-20)**
  - A4 규격 최적화 스마트 페이지네이션 PDF 보고서 출력 엔진 고도화 (페이지당 30개 노드 수납 및 11mm 프린터 안전 여백 적용).
  - Chromium/Edge 브라우저 엔진 자동 번역 팝업 3중 원천 차단.
  - 루트 원클릭 GitHub 동기화 배시 스크립트(`sync-github.sh`) 제공.
  - SSOT 중앙 집중식 버전 연동 자동화 파이프라인 구축.

* **[v2.4.4] (2026-10-18)**
  - GitHub Actions 러너 Windows 환경 Go 컴파일러 경로 감지 로직 안정화.
  - 클린 소스코드 전용 `.gitignore` 필터링 및 로컬 푸시 유틸리티 격리.
  - A4 PDF 보고서 스마트 페이지네이션 분할 엔진 탑재.

* **[v2.4.3] (2026-10-14)**
  - 24/7 낯선 기기 무인 백그라운드 침입 감시(Intruder Watch) 및 데스크톱 팝업/경보음 기능 탑재.
  - 테스트용 자가 서명(Self-Signed Digital Signature) 유틸리티 제공.
  - 내보내기 및 리포트 드롭다운 메뉴 개선 및 자동 닫힘 최적화.
  - 무인 설치(Silent Install) 옵션 및 Windows 방화벽 인바운드/아웃바운드 규칙 사전 조용 등록.
  - 안랩 V3 ASD 클라우드 평판 및 휴리스틱 오탐지 분석 대응 체계 구축.
  - 모바일(Android APK 및 모바일 PWA) GitHub Actions 자동 배포 파이프라인 연동.

* **[v2.4.2] (2026-10-14)**
  - 원클릭 원격 부팅 (Wake-on-LAN) UDP 매직 패킷 브로드캐스트 전송 엔진 탑재.
  - 오프라인 단말 선택 시 저장된 MAC 주소 기반 원격 기동 연동.

* **[v2.4.1] (2026-10-14)**
  - 4색 스냅샷 Diff 비교 엔진 (초록: 신규, 빨강: 오프라인, 노랑: 장비변동, 파랑: 유지).
  - 30일 무료 Pro 체험 라이선스 시스템(`GRID-PRO-TRIAL-2026`) 도입.
  - 내보내기 통합 드롭다운 팝오버 UI 도입.

* **[v2.4.0] (2026-10-08)**
  - 스마트폰 비공개 MAC(Randomized MAC) 및 DHCP IP 재할당 대응 Soft Trust 유예 시스템.
  - AES-256-GCM 기반 C++/Go 네이티브 암호화 볼트 모듈(`SecureVault.dll`) 연동.
  - 단일 진실 원천(SSOT) 버전 자동 동기화 파이프라인 구축.
  - 고해상도 멀티 레이어 윈도우 ICO(256px~16px) 에셋 생성 파이프라인 탑재.

* **[v2.3.2] (2026-10-05)**
  - Windows 환경 Go 백엔드 컴파일 안정화 및 단일 실행 파일 포트 자동 바인딩.

* **[v2.3.0] (2026-09-28)**
  - IP/MAC 충돌 실시간 탐지 알고리즘 및 경고 배지 적용.
  - 네이티브 OUI 검증 모듈(`OuiValidator.dll`) 연동 및 다크/베이지/그레이 멀티 테마 지원.

* **[v2.2.0] (2026-09-20)**
  - 90,168건 내장 오프라인 IEEE OUI 하드웨어 제조사 식별 데이터베이스 탑재.
  - 1ms 초고속 오프라인 로컬 OUI 룩업 엔진 완성.

* **[v2.1.0] (2026-09-15)**
  - 고위험 포트(21 FTP, 23 Telnet, 445 SMB, 3389 RDP) 심층 취약점 프로브 기능 탑재.
  - 실시간 자산 별칭(Alias) 및 관리자 메모 기능 추가.

* **[v2.0.0] (2026-09-01)**
  - 16x16 매트릭스 그리드 맵(256 노드) 실시간 시각화 인터페이스 도입.
  - 멀티스레드 비동기 ICMP Ping 및 TCP 포트 프로브 고속 네이티브 스캔 엔진.

* **[v1.0.0] (2026-08-15)**
  - 기본 서브넷 IP 탐색 및 활성 단말 리스트업 엔진 최초 개발.

---

### 10. 추천 태그
`Grid IP Scanner2, IP스캐너, 네트워크스캐너, NetworkScanner, IPScanner, 포터블, 침입탐지, WakeOnLAN, 보안감사, WoL, Cisnet, AhBiYout, 패킷분석, IT인벤토리, 네트워크관리`

*(태그 조건 검증: 한글 및 영어 혼합, 총 15개 태그로 20개 이하 충족, 총 135글자로 200글자 이내 충족)*

---
---

# 💻 [HTML 편집 모드] 전용 소스 코드
> **사용 방법**: 구글 블로거 글쓰기 화면 좌측 상단 연필 아이콘을 눌러 **`<> HTML 보기`**로 전환한 후, 아래 HTML 코드를 전체 복사하여 붙여넣으세요.
> 규정 순서: **1. 제목 ➔ 2. 본문 ➔ 3. 업데이트 ➔ 4. 앱 그림 ➔ 5. 다운로드 ➔ 6. 버전정보 ➔ 7. 시스템 요구 사항 ➔ 8. 제작자 및 공식 채널 안내 ➔ 9. 전체 업데이트(이전 기록 모두, 기능 개선 내용만 기록) ➔ 10. 추천 태그**

```html
<!-- Grid IP Scanner2 Official Blogger Template -->
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #1e293b; max-width: 840px; margin: 0 auto;">

  <!-- 1. 제목 -->
  <div style="background: linear-gradient(135deg, #0f172a 0%, #0369a1 100%); color: #ffffff; padding: 32px 24px; border-radius: 14px; margin-bottom: 28px; box-shadow: 0 10px 25px -5px rgba(2, 132, 199, 0.25);">
    <div style="display: inline-block; background: rgba(56, 189, 248, 0.2); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
      v2.4.6 Official Release
    </div>
    <h1 style="font-size: 25px; font-weight: 900; margin: 0 0 10px 0; letter-spacing: -0.5px; line-height: 1.35; color: #ffffff;">
      Grid IP Scanner2 — 16x16 시각화 그리드 기반 차세대 초고속 네트워크 스캐너 (v2.4.6)
    </h1>
    <p style="font-size: 14px; color: #cbd5e1; margin: 0; line-height: 1.6;">
      9만 건 내장 OUI 하드웨어 식별 &bull; 4색 스냅샷 Diff 비교 &bull; 24/7 침입 감시 &bull; A4 보안감사 PDF 리포트 &bull; WoL 원격 부팅 &bull; 정식 인스톨러 &amp; 무설치 포터블
    </p>
  </div>

  <!-- 2. 본문 -->
  <div style="margin-bottom: 30px;">
    <h2 style="font-size: 19px; font-weight: 800; color: #0f172a; border-left: 4.5px solid #0284c7; padding-left: 10px; margin: 0 0 14px 0;">
      📌 본문 소개
    </h2>
    <p style="font-size: 14.5px; color: #334155; margin-bottom: 14px;">
      안녕하세요, <b>AhBiYout (씨아이에스넷 / Cisnet)</b>입니다.
    </p>
    <p style="font-size: 14.5px; color: #334155; margin-bottom: 14px;">
      네트워크 관리자, 시스템 엔지니어, 사내 전산 담당자라면 한 번쯤 <b>Advanced IP Scanner</b>나 <b>Angry IP Scanner</b> 같은 진단 도구를 사용해 보셨을 것입니다. 하지만 기존 도구들은 수백 개의 IP 주소를 단순한 텍스트 행 리스트로만 나열하여 전체 네트워크의 유휴 공간과 밀도를 직관적으로 파악하기 어려웠습니다.
    </p>
    <p style="font-size: 14.5px; color: #334155; margin-bottom: 20px;">
      이러한 현장의 갈증을 해소하기 위해 탄생한 <b>『Grid IP Scanner2』</b>는 C클래스(/24) 전체 254개 IP를 <b>16x16 매트릭스 그리드 맵</b>으로 실시간 시각화하며, 9만 건 이상의 내장 하드웨어 제조사(OUI) 데이터베이스, 4색 스냅샷 Diff 비교, 24/7 침입자 백그라운드 감시, 원클릭 A4 규격 보안감사 PDF 출력, 원격 부팅(Wake-on-LAN)을 제공하는 고성능 네트워크 스캐너입니다.
    </p>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 12px;">
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 9px; padding: 15px;">
        <div style="font-size: 14px; font-weight: 800; color: #0284c7; margin-bottom: 5px;">⚡ 16x16 시각화 그리드 맵</div>
        <div style="font-size: 13px; color: #475569; line-height: 1.5;">254개 전체 C클래스 노드를 16x16 매트릭스로 실시간 렌더링하여 활성/비활성/경고 상태를 1초 만에 직관적으로 조망합니다.</div>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 9px; padding: 15px;">
        <div style="font-size: 14px; font-weight: 800; color: #0284c7; margin-bottom: 5px;">🔍 90,168건 내장 오프라인 OUI 식별</div>
        <div style="font-size: 13px; color: #475569; line-height: 1.5;">인터넷이 없는 폐쇄망에서도 IEEE 레지스트리 기반 9만 건 DB로 1ms 미만의 속도로 하드웨어 제조사를 판별합니다.</div>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 9px; padding: 15px;">
        <div style="font-size: 14px; font-weight: 800; color: #0284c7; margin-bottom: 5px;">📸 과거 vs 현재 4색 스냅샷 Diff</div>
        <div style="font-size: 13px; color: #475569; line-height: 1.5;">기준점 대비 신규 접속(+NEW), 오프라인 전환(-OFF), 식별 변경(!CHG), 정상 유지(=SAME)를 4색으로 정밀 대조합니다.</div>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 9px; padding: 15px;">
        <div style="font-size: 14px; font-weight: 800; color: #0284c7; margin-bottom: 5px;">🚨 24/7 침입 감시 &amp; Soft Trust</div>
        <div style="font-size: 13px; color: #475569; line-height: 1.5;">60초 주기 무인 백그라운드 탐색으로 낯선 기기를 감시하며, 스마트폰 비공개 MAC 오경보를 스마트하게 필터링합니다.</div>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 9px; padding: 15px;">
        <div style="font-size: 14px; font-weight: 800; color: #0284c7; margin-bottom: 5px;">⚡ 원클릭 원격 부팅 (WoL)</div>
        <div style="font-size: 13px; color: #475569; line-height: 1.5;">원격 점검이 필요한 PC나 서버의 전원을 UDP 9/7 매직 패킷 브로드캐스트로 즉시 원격 기동합니다.</div>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 9px; padding: 15px;">
        <div style="font-size: 14px; font-weight: 800; color: #0284c7; margin-bottom: 5px;">📄 A4 규격 정밀 보안 감사 PDF</div>
        <div style="font-size: 13px; color: #475569; line-height: 1.5;">고위험 포트(445, 3389, 23) 개방 진단과 인벤토리 목록을 페이지당 30개 노드로 최적 조판하여 즉시 출력합니다.</div>
      </div>
    </div>
  </div>

  <!-- 3. 업데이트 -->
  <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 10px; padding: 20px; margin-bottom: 30px;">
    <h2 style="font-size: 18px; font-weight: 800; color: #1e40af; margin: 0 0 12px 0;">
      🚀 v2.4.6 최신 업데이트 하이라이트
    </h2>
    <ul style="margin: 0; padding-left: 20px; font-size: 13.5px; color: #1e3a8a; line-height: 1.8;">
      <li><b>Windows 제어판 프로그램 추가/제거 정식 등록</b>: 제어판 및 설정 앱에 정식 등록되어 잔존 파일 없이 완벽한 클린 언인스톨 지원.</li>
      <li><b>인스톨러(Setup.exe) &amp; 무설치 포터블(Portable .exe) 동시 듀얼 빌드</b>: 고정 업무 PC용 정식 설치형과 USB 외근용 1초 무설치 포터블을 나란히 제공.</li>
      <li><b>안드로이드 APK 스마트폰 직접 설치 호환성 강화</b>: 패키지 정렬 및 키서명 개선으로 모바일 폰에서의 파싱/설치 오류 원천 차단.</li>
      <li><b>장치 프로필 패널 가독성 전면 개선</b>: 10~12px 표준 가독성 확보 및 원터치 <code>[가 100%] ↔ [가⁺ 115%]</code> 폰트 확대 스위처 탑재.</li>
      <li><b>스냅샷 기준색과 추가 스캔(+NEW) 노드의 시각적 대비 극대화</b>: 미할당 빈 IP 슬롯(245개) 오분류를 바로잡고 신규 노드 발광 강조.</li>
      <li><b>스냅샷 비교 툴바 상단 내용 잘림 원천 차단</b>: 독립 서브헤더 레이어로 고정하여 스크롤 시에도 조작 패널 100% 유지.</li>
      <li><b>스캔 중 브라우저 창 닫기/새로고침 방지 경고 및 소켓 안전 해제 이벤트 탑재</b>.</li>
    </ul>
  </div>

  <!-- 4. 앱 그림 -->
  <div style="margin-bottom: 30px;">
    <h2 style="font-size: 19px; font-weight: 800; color: #0f172a; border-left: 4.5px solid #0284c7; padding-left: 10px; margin: 0 0 14px 0;">
      🖼️ 앱 그림 (UI 프리뷰)
    </h2>
    <div style="background: #0f172a; border-radius: 10px; padding: 20px; color: #f8fafc; font-family: monospace; font-size: 12px; line-height: 1.5; overflow-x: auto; margin-bottom: 12px;">
      <pre style="margin: 0;">
+---------------------------------------------------------------------------------------+
|  [Grid IP Scanner2 v2.4.6]   [ 192.168.0.1 - 254 ]   [▶ 고속 스캔]   [📸 스냅샷 비교]   |
+------------------------------------------------------+--------------------------------+
|  [ 16x16 실시간 시각화 매트릭스 그리드 맵 ]            |  [ 장치 상세 프로필 패널 ]       |
|                                                      |  [가 100%] [가⁺ 115%]          |
|  [001] [002] [003] [004] [005] [006] ... [016]        |  ----------------------------- |
|  [017] [018] [019] [020] [021] [022] ... [032]        |  IP: 192.168.0.10              |
|  ...                                                 |  MAC: 00:11:32:8A:BC:DE        |
|  [🟢 +신규] [🔴 -오프라인] [🟡 !변동] [🔵 =기준]        |  제조사: Synology Incorporated |
|                                                      |  개방 포트: 80, 443, 5000       |
|  * 254개 전체 C클래스 IP를 한눈에 밀도 조망            |  [⚡ WoL 매직 패킷 원격 부팅]    |
+------------------------------------------------------+--------------------------------+
|  [📄 A4 정밀 보안감사 PDF 리포트]  [📊 1:1 대조 스튜디오]  [🚨 24/7 낯선 기기 감시: PRO]  |
+---------------------------------------------------------------------------------------+
      </pre>
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; font-size: 12.5px; color: #64748b; text-align: center;">
      <div style="background: #f1f5f9; padding: 10px; border-radius: 6px;"><b>그림 1</b>: 16x16 시각화 그리드 맵</div>
      <div style="background: #f1f5f9; padding: 10px; border-radius: 6px;"><b>그림 2</b>: 4색 스냅샷 Diff 스튜디오</div>
      <div style="background: #f1f5f9; padding: 10px; border-radius: 6px;"><b>그림 3</b>: 장치 상세 프로필 &amp; 폰트 확대</div>
      <div style="background: #f1f5f9; padding: 10px; border-radius: 6px;"><b>그림 4</b>: A4 규격 보안감사 PDF 리포트</div>
    </div>
  </div>

  <!-- 5. 다운로드 -->
  <div style="background: #0f172a; border-radius: 12px; padding: 26px 20px; text-align: center; margin-bottom: 30px;">
    <h2 style="color: #ffffff; font-size: 19px; font-weight: 900; margin: 0 0 8px 0;">
      📥 Grid IP Scanner2 다운로드
    </h2>
    <p style="color: #94a3b8; font-size: 13.5px; margin: 0 0 18px 0;">
      Windows 10 / 11, Android 스마트폰, 모바일 PWA 완벽 지원
    </p>
    <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
      <a href="https://github.com/AhBiYout-all/grid-ip-scanner2/releases" target="_blank" style="background: #0284c7; color: #ffffff; padding: 10px 18px; border-radius: 8px; font-size: 13.5px; font-weight: 800; text-decoration: none; display: inline-block;">
        📦 윈도우 인스톨러 (Setup.exe)
      </a>
      <a href="https://github.com/AhBiYout-all/grid-ip-scanner2/releases" target="_blank" style="background: #059669; color: #ffffff; padding: 10px 18px; border-radius: 8px; font-size: 13.5px; font-weight: 800; text-decoration: none; display: inline-block;">
        🚀 무설치 포터블 (Portable .exe)
      </a>
      <a href="https://github.com/AhBiYout-all/grid-ip-scanner2/releases" target="_blank" style="background: #d97706; color: #ffffff; padding: 10px 18px; border-radius: 8px; font-size: 13.5px; font-weight: 800; text-decoration: none; display: inline-block;">
        📱 안드로이드 APK (스마트폰용)
      </a>
      <a href="https://github.com/AhBiYout-all/grid-ip-scanner2" target="_blank" style="background: #334155; color: #ffffff; padding: 10px 18px; border-radius: 8px; font-size: 13.5px; font-weight: 800; text-decoration: none; display: inline-block;">
        💻 GitHub 공식 저장소
      </a>
    </div>
  </div>

  <!-- 6. 버전정보 -->
  <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 18px; margin-bottom: 26px;">
    <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0;">
      ℹ️ 버전정보
    </h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
      <tr><td style="padding: 6px 0; color: #64748b; width: 140px;"><b>소프트웨어 버전</b></td><td style="padding: 6px 0; color: #0f172a; font-weight: 700;">v2.4.6 (Release Date: 2026-10-26)</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;"><b>라이선스 정책</b></td><td style="padding: 6px 0; color: #0f172a;">Dual License (무료 커뮤니티 GPL v3 + Pro 상용 에디션)</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;"><b>30일 무료 체험 키</b></td><td style="padding: 6px 0; color: #0284c7; font-weight: 800;"><code>GRID-PRO-TRIAL-2026</code> (Pro 전 기능 30일간 무료 해금)</td></tr>
    </table>
  </div>

  <!-- 7. 시스템 요구 사항 -->
  <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 18px; margin-bottom: 26px;">
    <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0;">
      🖥️ 시스템 요구 사항
    </h2>
    <ul style="margin: 0; padding-left: 20px; font-size: 13.5px; color: #475569; line-height: 1.7;">
      <li><b>Windows 환경</b>: Windows 10, Windows 11 (64-bit 권장), Intel/AMD x86_64, RAM 2GB 이상</li>
      <li><b>Android 환경</b>: Android 7.0 (Nougat, API 24) 이상 스마트폰 및 태블릿 (ARM64 / x86_64)</li>
      <li><b>웹 브라우저 환경</b>: Chrome, Edge, Safari, Firefox 등 최신 모던 브라우저</li>
      <li><b>네트워크</b>: 유선 이더넷 LAN 또는 Wi-Fi 무선 네트워크 어댑터</li>
    </ul>
  </div>

  <!-- 8. 제작자 및 공식 채널 안내 -->
  <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 18px; margin-bottom: 26px;">
    <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0;">
      👨‍💻 제작자 및 공식 채널 안내
    </h2>
    <ul style="margin: 0; padding-left: 20px; font-size: 13.5px; color: #475569; line-height: 1.7;">
      <li><b>제작자</b>: AhBiYout</li>
      <li><b>공식 배포사</b>: 씨아이에스넷 (Cisnet, <a href="https://www.cisnet.co.kr" target="_blank" style="color: #0284c7;">www.cisnet.co.kr</a>)</li>
      <li><b>공식 구글 블로그</b>: <a href="https://ahbiyoutvibe.blogspot.com/" target="_blank" style="color: #0284c7;">ahbiyoutvibe.blogspot.com</a></li>
      <li><b>공식 GitHub 저장소</b>: <a href="https://github.com/AhBiYout-all/grid-ip-scanner2" target="_blank" style="color: #0284c7;">github.com/AhBiYout-all/grid-ip-scanner2</a></li>
      <li><b>기술 문의 및 버그 제보</b>: GitHub Issues 또는 개발자 이메일 (<code>redmunlight@gmail.com</code>)</li>
    </ul>
  </div>

  <!-- 9. 전체 업데이트 -->
  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 26px;">
    <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0;">
      📜 전체 업데이트 (기능 개선 전체 기록)
    </h2>
    <div style="font-size: 13px; color: #334155; line-height: 1.7;">
      <p style="margin: 0 0 8px 0;"><b>[v2.4.6]</b> Windows 제어판 프로그램 추가/제거 정식 등록, 윈도우 인스톨러/포터블 동시 듀얼 빌드, 안드로이드 APK 스마트폰 직접 설치 호환성 강화, 장치 프로필 패널 가독성 전면 개선 및 2단계 폰트 확대(100%↔115%) 탑재, 스냅샷 기준색과 신규 노드 시각적 대비 극대화 및 미할당 빈 셀 판별 로직 분리, 스냅샷 비교 툴바 상단 잘림 원천 차단(Zero-Clipping Sub-Header), 딥 다각도 스냅샷 비교 엔진(Deep Diff v2) 및 1:1 대조 스튜디오 모달 완성, 스캔 중 브라우저 창 닫기/새로고침 방지 경고 및 소켓 안전 해제 이벤트 탑재.</p>
      <p style="margin: 0 0 8px 0;"><b>[v2.4.5]</b> A4 규격 최적화 스마트 페이지네이션 PDF 보고서 출력 엔진 고도화 (페이지당 30개 노드 수납 및 11mm 프린터 안전 여백), Chromium/Edge 자동 번역 팝업 3중 차단, 루트 원클릭 GitHub 동기화 배시 스크립트(sync-github.sh) 제공.</p>
      <p style="margin: 0 0 8px 0;"><b>[v2.4.4]</b> GitHub Actions 러너 Windows 환경 Go 컴파일러 경로 감지 로직 안정화, 클린 소스코드 전용 .gitignore 필터링 정비, A4 PDF 스마트 페이지네이션 분할 엔진 탑재.</p>
      <p style="margin: 0 0 8px 0;"><b>[v2.4.3]</b> 24/7 낯선 기기 무인 백그라운드 침입 감시(Intruder Watch) 및 데스크톱 알림/경보음 기능 탑재, 자가 서명 유틸리티 제공, 내보내기/리포트 드롭다운 메뉴 개선, 무인 설치(Silent) 및 방화벽 규칙 사전 조용 등록 지원, 안랩 V3 오탐지 대응 가이드 체계 구축, 모바일 패키지 자동 빌드 파이프라인 연동.</p>
      <p style="margin: 0 0 8px 0;"><b>[v2.4.2]</b> 원클릭 원격 부팅 (Wake-on-LAN) UDP 매직 패킷 브로드캐스트 엔진 탑재, 오프라인 단말 MAC 주소 기반 원격 기동 연동.</p>
      <p style="margin: 0 0 8px 0;"><b>[v2.4.1]</b> 4색 스냅샷 Diff 비교 엔진 (초록: 신규, 빨강: 오프라인, 노랑: 변동, 파랑: 유지), 30일 무료 Pro 체험 라이선스 시스템(GRID-PRO-TRIAL-2026) 도입, 내보내기 통합 드롭다운 팝오버 UI 도입.</p>
      <p style="margin: 0 0 8px 0;"><b>[v2.4.0]</b> 스마트폰 비공개 MAC(Randomized MAC) 및 DHCP 대응 Soft Trust 유예 시스템, AES-256-GCM 네이티브 암호화 볼트 모듈(SecureVault.dll) 연동, 단일 진실 원천(SSOT) 버전 동기화 구축, 멀티 레이어 윈도우 ICO 자동 생성 파이프라인 탑재.</p>
      <p style="margin: 0 0 8px 0;"><b>[v2.3.2]</b> Windows 환경 Go 백엔드 컴파일 안정화 및 단일 실행 파일 포트 자동 바인딩.</p>
      <p style="margin: 0 0 8px 0;"><b>[v2.3.0]</b> IP/MAC 충돌 실시간 탐지 알고리즘 및 경고 배지 적용, 네이티브 OUI 검증 모듈(OuiValidator.dll) 연동 및 다크/베이지/그레이 멀티 테마 지원.</p>
      <p style="margin: 0 0 8px 0;"><b>[v2.2.0]</b> 90,168건 내장 오프라인 IEEE OUI 하드웨어 제조사 식별 데이터베이스 탑재, 1ms 초고속 오프라인 로컬 OUI 룩업 엔진 완성.</p>
      <p style="margin: 0 0 8px 0;"><b>[v2.1.0]</b> 고위험 포트(21, 23, 445, 3389) 심층 취약점 프로브 탑재, 실시간 자산 별칭(Alias) 및 관리자 메모 기능 추가.</p>
      <p style="margin: 0 0 8px 0;"><b>[v2.0.0]</b> 16x16 매트릭스 그리드 맵(256 노드) 실시간 시각화 인터페이스 도입, 멀티스레드 비동기 ICMP Ping 및 TCP 포트 프로브 고속 네이티브 스캔 엔진 탑재.</p>
      <p style="margin: 0;"><b>[v1.0.0]</b> 기본 서브넷 IP 탐색 및 활성 단말 리스트업 엔진 최초 개발.</p>
    </div>
  </div>

  <!-- 10. 추천 태그 -->
  <div style="background: #f1f5f9; border: 1px dashed #94a3b8; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px;">
    <div style="font-size: 13px; font-weight: 800; color: #475569; margin-bottom: 6px;">
      🏷️ 추천 태그 (Blogger 라벨 복사용)
    </div>
    <div style="font-size: 13px; color: #0284c7; font-weight: 700; word-break: break-all;">
      Grid IP Scanner2, IP스캐너, 네트워크스캐너, NetworkScanner, IPScanner, 포터블, 침입탐지, WakeOnLAN, 보안감사, WoL, Cisnet, AhBiYout, 패킷분석, IT인벤토리, 네트워크관리
    </div>
  </div>

  <!-- 푸터 저작권 -->
  <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; font-size: 12px; color: #94a3b8; text-align: center;">
    &copy; 2026 AhBiYout &bull; 씨아이에스넷 (Cisnet, <a href="https://www.cisnet.co.kr" target="_blank" style="color: #94a3b8;">www.cisnet.co.kr</a>) &bull; 공식 블로그: <a href="https://ahbiyoutvibe.blogspot.com/" target="_blank" style="color: #94a3b8;">ahbiyoutvibe.blogspot.com</a>
  </div>

</div>
```
