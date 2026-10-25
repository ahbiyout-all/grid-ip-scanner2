# 📝 [구글 블로거 포스팅 완벽 가이드] Grid IP Scanner2 공식 소개 및 배포
> **공식 블로그**: [https://ahbiyoutvibe.blogspot.com/](https://ahbiyoutvibe.blogspot.com/)  
> **공식 깃허브**: [https://github.com/AhBiYout-all/grid-ip-scanner2](https://github.com/AhBiYout-all/grid-ip-scanner2)  
> **버전**: v2.4.6 | **작성일자**: 2026-10-24

---

## 📌 0. 블로거(Blogger) 기본 설정값 (메타데이터)

* **추천 글 제목 (택 1)**:
  * `[추천 1]` **[무료/초고속] 16x16 시각화 그리드 맵과 9만 건 OUI를 탑재한 차세대 네트워크 스캐너: Grid IP Scanner2 공개**
  * `[추천 2]` **기존 IP 스캐너의 한계를 넘다 - Grid IP Scanner2 (스냅샷 4색 Diff, 침입 탐지, A4 보안감사 PDF 원클릭 출력)**
  * `[추천 3]` **네트워크 엔지니어 필수 유틸리티: Grid IP Scanner2 v2.4.6 릴리즈 (무설치 포터블 & 정식 인스톨러)**
* **검색 설명 (Search Description / 메타 태그)**:
  > 16x16 시각화 그리드 맵, 9만 건 오프라인 OUI 제조사 식별, 4색 스냅샷 Diff 비교, 24시간 침입 감시, 원클릭 A4 보안감사 PDF 리포트와 원격 부팅(WoL)을 지원하는 초고속 차세대 네트워크 진단 도구 Grid IP Scanner2를 소개합니다.
* **라벨 / 태그 (Labels)**:
  `Grid IP Scanner2`, `IP스캐너`, `네트워크관리`, `WakeOnLAN`, `보안감사`, `네트워크진단`, `Cisnet`, `AhBiYout`, `포터블유틸리티`, `오픈소스`
* **맞춤 퍼머링크 (Permalink)**:
  `grid-ip-scanner2-visual-network-scanner`

---

## 📝 1. [작성 모드 (서식 있는 텍스트)] 전용 본문
> **사용 방법**: 구글 블로거 글쓰기 화면 좌측 상단 연필 아이콘에서 **[작성 모드]**를 선택한 후, 아래 영역의 내용을 그대로 복사하여 붙여넣으세요.

---

안녕하세요, **AhBiYout**입니다.

네트워크 관리자, 시스템 엔지니어, 혹은 사내 전산실에서 근무하시는 분들이라면 한 번쯤 **Advanced IP Scanner**나 **Angry IP Scanner** 같은 네트워크 진단 도구를 사용해 보셨을 것입니다.

하지만 기존 도구들을 사용하면서 이런 불편함을 느끼지 않으셨나요?
- *"IP가 수백 개인데 단순 텍스트 목록으로만 나와서 어디가 비어 있고 어디가 차 있는지 한눈에 안 보인다."*
- *"어제 퇴근할 때랑 비교해서 오늘 아침에 어떤 새로운 기기가 몰래 붙었는지 바로 알 수 없을까?"*
- *"경영진이나 고객사 감사 제출용으로 깔끔한 A4 PDF 보고서를 바로 뽑아낼 수는 없을까?"*

이러한 실무 현장의 오랜 갈증을 해결하기 위해, 현대적인 UI/UX와 고성능 네이티브 스캔 엔진을 결합한 **차세대 시각화 네트워크 스캐너 — 『Grid IP Scanner2 (v2.4.6)』**를 공식 공개합니다!

---

### 🚀 Grid IP Scanner2 핵심 기능 6선

#### 1. ⚡ 한눈에 전체 대역을 조망하는 16x16 시각화 그리드 맵
더 이상 지루한 텍스트 행(Row) 리스트를 스크롤하지 마세요!  
Grid IP Scanner2는 C클래스(/24) 전체 254개 IP를 **16x16 매트릭스 그리드 셀**로 실시간 렌더링합니다. 초고속 ICMP Ping과 포트 프로브가 수행되며 활성(Active), 비활성(Idle), 보안 경고(Alert) 상태가 신호등처럼 시각화되어 1초 만에 전체 서브넷 밀도를 파악할 수 있습니다.

#### 2. 🔍 90,168건 내장 오프라인 OUI 하드웨어 제조사 식별 엔진
인터넷이 차단된 폐쇄망, 공장 자동화 라인, 선박 내부에서도 완벽하게 동작합니다.  
공식 IEEE 레지스트리(MA-L 24비트, MA-M 28비트, MA-S 36비트)와 Wireshark Manuf DB를 결합 정제한 **9만 건 이상의 하드웨어 OUI 데이터베이스**가 바이너리에 내장되어, 1ms 미만의 속도로 장비 제조사(Samsung, Apple, Cisco, Synology 등)를 정확하게 식별합니다.

#### 3. 📸 과거 vs 현재 4색 스냅샷 Diff 비교 엔진
네트워크가 정상일 때 **[📸 현재 상태 스냅샷 저장]**을 눌러두세요.  
이후 네트워크에 이상이 생겼거나 점검이 필요할 때 다시 스캔하면, 엔진이 과거 기준점과 현재 상태를 대조하여 4가지 직관적인 색상으로 변화를 짚어냅니다:
* 🟢 **신규 접속 기기 (+NEW)**: 어제 없던 새로운 단말기 침입 감지
* 🔴 **오프라인 전환 기기 (-OFF)**: 정상 가동 중이던 서버나 PC가 꺼짐
* 🟡 **식별 변경 기기 (!CHG)**: IP는 같은데 MAC이나 제조사가 변경됨 (IP 충돌 또는 스푸핑 주의)
* 🔵 **동일 유지 기기 (=SAME)**: 변동 없이 정상 운영 중인 단말

#### 4. 🚨 24시간 무인 백그라운드 침입 감시 & Soft Trust 엔진
사내 Wi-Fi나 업무망에 인가되지 않은 낯선 기기가 접속하면 어떻게 될까요?  
상단 툴바의 **`낯선 기기 감시`**를 켜두면, 60초 주기로 무인 백그라운드 탐색을 수행하여 미등록 침입자 발견 시 **즉각적인 데스크톱 알림창과 오디오 경보음**을 송출합니다. 특히 스마트폰의 '무작위 비공개 MAC(Randomized MAC)' 주소도 지능형 Soft Trust 알고리즘으로 유사도를 채점하여 불필요한 오경보를 스마트하게 걸러냅니다.

#### 5. ⚡ 원클릭 원격 부팅 (Wake-on-LAN / WoL)
퇴근 후 전산실 PC를 켜야 하거나, 원격 점검을 위해 장비를 켜야 할 때 타깃 노드를 선택하고 **`[⚡ WoL 매직 패킷 전송]`** 버튼만 누르세요. 등록된 MAC 주소로 브로드캐스트 매직 패킷(UDP 9/7)을 즉시 쏘아 보내 원격 전원을 기동합니다.

#### 6. 📄 경영진 및 감사 제출용 A4 규격 정밀 보안 감사 PDF 보고서
더 이상 스캔 결과를 엑셀로 일일이 가공하지 마세요.  
버튼 한 번으로 **OUI 제조사 점유율 통계, 위험 취약 포트(SMB 445, RDP 3389, Telnet 23) 개방 단말 진단, 활성 자산 인벤토리 상세**가 깔끔하게 조판된 **A4 정시 규격 고품질 PDF 보고서**를 즉시 다운로드하거나 인쇄할 수 있습니다.

---

### 📊 기존 상용 도구들과의 비교

| 비교 항목 | ⚡ **Grid IP Scanner2** | 🔹 Advanced IP Scanner | 🔸 Angry IP Scanner |
| :--- | :--- | :--- | :--- |
| **인터페이스** | **16x16 시각화 그리드 토폴로지** | 텍스트 리스트 목록 | 단순 텍스트 행 |
| **제조사(OUI) 식별** | **9만 건 내장 (100% 오프라인 지원)** | 기본 레지스트리 | 기본 TXT 파일 |
| **스냅샷 Diff 비교** | **4색 비교 (신규/이탈/변경/유지)** | ❌ 지원 안 함 | ❌ 지원 안 함 |
| **24/7 침입 감시** | **무인 백그라운드 감시 + 알림** | ❌ 지원 안 함 | ❌ 지원 안 함 |
| **보안 감사 보고서**| **원클릭 A4 정밀 보안 감사 PDF** | CSV/HTML 텍스트 내보내기 | CSV/TXT |
| **원격 전원(WoL)** | **원클릭 매직 패킷 브로드캐스트** | Radmin 연동 위주 | ❌ 미지원 |
| **실행 방식** | **1초 무설치 포터블 & 정식 인스톨러** | 인스톨러/포터블 | Java 설치 필요 |

---

### 🛡️ 백신 오탐지(False Positive) 안내 — 100% 안전한 도구입니다

본 프로그램은 단시간 내에 서브넷 전체 IP와 포트를 초고속 탐색하는 순수 네트워크 분석 유틸리티입니다.  
신규 바이너리 파일 특성상 안랩 V3(AhnLab Smart Defense)나 Windows Defender에서 휴리스틱 가진단(Trojan/Win.Generic 등)으로 오인 차단될 수 있습니다.

* **안전성 보증**: 개인정보 수집, 외부 무단 전송, 시스템 파괴, 백도어 등의 악성 코드가 100% 일절 없습니다.
* **해결 방법**: V3 환경설정의 **'검사 예외 설정'**에 설치 폴더 또는 실행 파일(`Grid_IP_Scanner2.exe`)을 등록하시거나, 격리소에서 '복원 및 예외 처리'를 선택하시면 정상적으로 실행됩니다.

---

### 💎 라이선스 정책 및 30일 무료 체험 안내

Grid IP Scanner2는 오픈소스 커뮤니티 권리를 보호하고 상업적 이용의 법적 안전성을 보장하기 위해 **이중 라이선스(Dual License)** 체계로 운영됩니다.

1. **무료 커뮤니티 에디션 (Free Community / GPL v3)**:
   - 16x16 그리드 맵, 초고속 ICMP Ping, 9만 건 OUI 제조사 조회 등 기본 기능은 개인/기업/공공기관 누구나 **평생 무료**로 사용하실 수 있습니다.
2. **Pro 상용 에디션 (Professional Commercial)**:
   - 원격 부팅(WoL), 24시간 침입 감시, 4색 스냅샷 Diff, 심층 포트 정밀 분석, A4 보안감사 PDF 리포트, 최대 5개 서브넷 관리.
   - **📅 1년 정기 구독권**: $19 (약 25,000원 / 365일 이용 및 최신 업데이트 포함)
   - **💎 영구 소장 라이선스**: $49 (약 65,000원 / 만료일 없는 평생 소장 및 평생 무상 업데이트)
3. **💡 30일 무료 체험(Trial) 혜택**:
   - 앱 상단 **`[라이선스 관리]`** 창에서 데모 키 **`GRID-PRO-TRIAL-2026`**을 입력하시면, 30일간 Pro 전 기능을 아무런 제약 없이 100% 무료로 체험해 보실 수 있습니다!

---

### 📥 다운로드 및 공식 링크

* 💻 **공식 깃허브 저장소**: [https://github.com/AhBiYout-all/grid-ip-scanner2](https://github.com/AhBiYout-all/grid-ip-scanner2)
* 📦 **최신 버전 다운로드 (Releases)**: [GitHub Releases 다운로드 페이지](https://github.com/AhBiYout-all/grid-ip-scanner2/releases)
  - `Grid_IP_Scanner2_v2.4.6_Setup.exe` (정식 윈도우 인스톨러 - 제어판 등록 및 방화벽 자동 예외)
  - `Grid_IP_Scanner2.exe` (단일 무설치 포터블 - USB 외근 점검용)
* ✍️ **개발자 공식 블로그**: [AhBiYout's Vibe Blog](https://ahbiyoutvibe.blogspot.com/)

소프트웨어에 대한 기능 제안이나 피드백, 버그 리포트는 깃허브 Issues 또는 블로그 댓글로 언제든 남겨주세요.  
네트워크 관리자 여러분의 많은 관심과 활용을 부탁드립니다. 감사합니다!

---

<br><br>

---

## 💻 2. [HTML 편집 모드] 전용 소스 코드
> **사용 방법**: 구글 블로거 글쓰기 화면 좌측 상단 연필 아이콘을 눌러 **`<> HTML 보기`**로 전환한 후, 아래 HTML 코드를 전체 복사하여 붙여넣으세요. 카드 박스, 컬러 배지, 세련된 테이블 및 다운로드 버튼이 적용된 고품질 웹 스타일로 렌더링됩니다.

```html
<!-- Grid IP Scanner2 Official Blogger Template -->
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #1e293b; max-width: 820px; margin: 0 auto;">

  <!-- Hero Header Banner -->
  <div style="background: linear-gradient(135deg, #0f172a 0%, #0369a1 100%); color: #ffffff; padding: 32px 24px; border-radius: 14px; margin-bottom: 28px; box-shadow: 0 10px 25px -5px rgba(2, 132, 199, 0.25);">
    <div style="display: inline-block; background: rgba(56, 189, 248, 0.2); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
      v2.4.6 Official Release
    </div>
    <h1 style="font-size: 26px; font-weight: 900; margin: 0 0 10px 0; letter-spacing: -0.5px; line-height: 1.3; color: #ffffff;">
      Grid IP Scanner2 — 16x16 시각화 그리드 기반 차세대 초고속 네트워크 스캐너
    </h1>
    <p style="font-size: 14px; color: #cbd5e1; margin: 0; line-height: 1.6;">
      9만 건 내장 OUI 하드웨어 식별 &bull; 스냅샷 4색 Diff 비교 &bull; 24/7 침입 감시 &bull; A4 보안감사 PDF 리포트 &bull; WoL 원격 부팅
    </p>
  </div>

  <!-- Intro Text Box -->
  <p style="font-size: 15px; color: #334155; margin-bottom: 16px;">
    안녕하세요, <b>AhBiYout</b>입니다.
  </p>
  <p style="font-size: 15px; color: #334155; margin-bottom: 16px;">
    네트워크 관리자, 시스템 엔지니어, 혹은 사내 전산실에서 근무하시는 분들이라면 한 번쯤 <b>Advanced IP Scanner</b>나 <b>Angry IP Scanner</b> 같은 진단 도구를 사용해 보셨을 것입니다. 하지만 수백 개 IP가 단순 텍스트 목록으로만 나열되어 어디가 비어 있고 어디가 차 있는지 한눈에 보기 어렵거나, 경영진 보고용 A4 PDF 문서 작성이 번거로우셨을 텐데요.
  </p>
  <p style="font-size: 15px; color: #334155; margin-bottom: 24px;">
    이러한 실무 현장의 오랜 갈증을 해결하기 위해 현대적인 UI/UX와 고성능 네이티브 엔진을 결합한 <b>차세대 시각화 네트워크 스캐너 — 『Grid IP Scanner2 (v2.4.6)』</b>를 공식 공개합니다!
  </p>

  <!-- Key Features Grid (Cards) -->
  <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; border-left: 4.5px solid #0284c7; padding-left: 10px; margin: 32px 0 18px 0;">
    🚀 Grid IP Scanner2 핵심 기능 6선
  </h2>

  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 14px; margin-bottom: 30px;">
    
    <!-- Feature 1 -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <div style="font-size: 15px; font-weight: 800; color: #0284c7; margin-bottom: 6px;">
        ⚡ 1. 16x16 시각화 그리드 토폴로지 맵
      </div>
      <div style="font-size: 13.5px; color: #475569; line-height: 1.6;">
        더 이상 텍스트 리스트를 스크롤할 필요 없습니다. 전체 254개 IP를 16x16 매트릭스 그리드로 실시간 시각화하여 활성/비활성/경고 상태를 1초 만에 조망합니다.
      </div>
    </div>

    <!-- Feature 2 -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <div style="font-size: 15px; font-weight: 800; color: #0284c7; margin-bottom: 6px;">
        🔍 2. 90,168건 내장 오프라인 OUI 식별 엔진
      </div>
      <div style="font-size: 13.5px; color: #475569; line-height: 1.6;">
        인터넷이 차단된 폐쇄망에서도 100% 동작합니다. IEEE 레지스트리 및 Wireshark DB 기반 9만 건 제조사 DB가 내장되어 1ms 미만의 속도로 하드웨어를 식별합니다.
      </div>
    </div>

    <!-- Feature 3 -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <div style="font-size: 15px; font-weight: 800; color: #0284c7; margin-bottom: 6px;">
        📸 3. 과거 vs 현재 4색 스냅샷 Diff 비교
      </div>
      <div style="font-size: 13.5px; color: #475569; line-height: 1.6;">
        정상 상태 캡처 기준점 대비 <b>신규 단말(+NEW)</b>, <b>꺼진 장비(-OFF)</b>, <b>식별 변경(!CHG)</b>을 초록/빨강/노랑/파랑 4색으로 직관적으로 진단합니다.
      </div>
    </div>

    <!-- Feature 4 -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <div style="font-size: 15px; font-weight: 800; color: #0284c7; margin-bottom: 6px;">
        🚨 4. 24/7 침입 감시 & Soft Trust 엔진
      </div>
      <div style="font-size: 13.5px; color: #475569; line-height: 1.6;">
        미등록 낯선 기기 접속 시 60초 주기 무인 감시로 즉각적인 데스크톱 팝업과 오디오 경보를 울립니다. 스마트폰 비공개 MAC 오경보도 지능적으로 걸러냅니다.
      </div>
    </div>

    <!-- Feature 5 -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <div style="font-size: 15px; font-weight: 800; color: #0284c7; margin-bottom: 6px;">
        ⚡ 5. 원클릭 원격 부팅 (Wake-on-LAN)
      </div>
      <div style="font-size: 13.5px; color: #475569; line-height: 1.6;">
        원격 점검이 필요한 PC나 전산실 서버를 클릭 한 번으로 기동합니다. 타깃 MAC 주소로 UDP 매직 패킷을 즉시 브로드캐스트 전송합니다.
      </div>
    </div>

    <!-- Feature 6 -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <div style="font-size: 15px; font-weight: 800; color: #0284c7; margin-bottom: 6px;">
        📄 6. A4 규격 정밀 보안 감사 PDF 보고서
      </div>
      <div style="font-size: 13.5px; color: #475569; line-height: 1.6;">
        OUI 점유율 통계, 위험 취약 포트(SMB 445, RDP 3389, Telnet 23) 개방 단말 진단, 활성 자산 목록이 정밀 조판된 A4 PDF 리포트를 원클릭 출력합니다.
      </div>
    </div>

  </div>

  <!-- Comparison Table -->
  <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; border-left: 4.5px solid #0284c7; padding-left: 10px; margin: 36px 0 16px 0;">
    📊 주요 IP 스캐너 대조 비교
  </h2>

  <div style="overflow-x: auto; margin-bottom: 28px;">
    <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px;">
      <thead>
        <tr style="background: #0f172a; color: #ffffff;">
          <th style="padding: 10px 12px; font-weight: 800;">비교 항목</th>
          <th style="padding: 10px 12px; font-weight: 800; color: #38bdf8;">⚡ Grid IP Scanner2</th>
          <th style="padding: 10px 12px; font-weight: 700; color: #94a3b8;">Advanced IP Scanner</th>
          <th style="padding: 10px 12px; font-weight: 700; color: #94a3b8;">Angry IP Scanner</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 12px; font-weight: 700; background: #f8fafc;">인터페이스</td>
          <td style="padding: 10px 12px; font-weight: 800; color: #0284c7;">16x16 시각화 그리드 맵</td>
          <td style="padding: 10px 12px; color: #64748b;">텍스트 리스트</td>
          <td style="padding: 10px 12px; color: #64748b;">텍스트 리스트</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 12px; font-weight: 700; background: #f8fafc;">OUI 제조사 DB</td>
          <td style="padding: 10px 12px; font-weight: 800; color: #059669;">90,168건 내장 (오프라인 1ms)</td>
          <td style="padding: 10px 12px; color: #64748b;">기본 레지스트리</td>
          <td style="padding: 10px 12px; color: #64748b;">기본 텍스트 파일</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 12px; font-weight: 700; background: #f8fafc;">스냅샷 Diff 비교</td>
          <td style="padding: 10px 12px; font-weight: 800; color: #0284c7;">4색 비교 (신규/이탈/변경/유지)</td>
          <td style="padding: 10px 12px; color: #ef4444;">❌ 미지원</td>
          <td style="padding: 10px 12px; color: #ef4444;">❌ 미지원</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 12px; font-weight: 700; background: #f8fafc;">24/7 침입 감시</td>
          <td style="padding: 10px 12px; font-weight: 800; color: #0284c7;">무인 감시 + 데스크톱 알림</td>
          <td style="padding: 10px 12px; color: #ef4444;">❌ 미지원</td>
          <td style="padding: 10px 12px; color: #ef4444;">❌ 미지원</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 12px; font-weight: 700; background: #f8fafc;">보안 감사 보고서</td>
          <td style="padding: 10px 12px; font-weight: 800; color: #0284c7;">A4 규격 정밀 PDF 원클릭 출력</td>
          <td style="padding: 10px 12px; color: #64748b;">CSV/HTML 텍스트</td>
          <td style="padding: 10px 12px; color: #64748b;">CSV/TXT</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; font-weight: 700; background: #f8fafc;">실행 형태</td>
          <td style="padding: 10px 12px; font-weight: 800; color: #0284c7;">1초 무설치 포터블 & 인스톨러</td>
          <td style="padding: 10px 12px; color: #64748b;">인스톨러/포터블</td>
          <td style="padding: 10px 12px; color: #64748b;">Java 런타임 필요</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- False Positive Notice Box -->
  <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 10px; padding: 18px; margin-bottom: 26px;">
    <div style="font-size: 15px; font-weight: 800; color: #b45309; margin-bottom: 6px;">
      🛡️ 백신 오탐지(False Positive) 안내 — 100% 안전한 진단 도구입니다
    </div>
    <div style="font-size: 13.5px; color: #78350f; line-height: 1.6;">
      본 프로그램은 단시간 내 서브넷 전체 IP와 포트를 초고속 탐색하는 순수 네트워크 분석 소프트웨어입니다. 신규 빌드 바이너리 특성상 안랩 V3(ASD 클라우드 평판)나 Windows Defender에서 휴리스틱 가진단(Trojan/Win.Generic 등)으로 오탐될 수 있습니다.<br>
      <b>개인정보 유출, 백도어, 시스템 파괴 등의 악성 행위가 100% 일절 없습니다.</b> V3 환경설정의 <b>'검사 예외 설정'</b>에 설치 폴더 또는 실행 파일(<code>Grid_IP_Scanner2.exe</code>)을 등록하시거나 격리소에서 '복원 및 예외 처리'를 선택하시면 정상적으로 실행됩니다.
    </div>
  </div>

  <!-- License & Trial Box -->
  <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 10px; padding: 20px; margin-bottom: 28px;">
    <div style="font-size: 16px; font-weight: 800; color: #166534; margin-bottom: 8px;">
      💎 라이선스 정책 및 30일 무료 체험(Trial) 안내
    </div>
    <div style="font-size: 13.5px; color: #15803d; line-height: 1.6; margin-bottom: 12px;">
      • <b>무료 커뮤니티 에디션 (Free / GPL v3)</b>: 16x16 그리드 맵, 초고속 Ping, 9만 건 OUI 조회는 개인/기업 누구나 <b>평생 무료</b>입니다.<br>
      • <b>Pro 유료 에디션</b>: WoL 원격 부팅, 24시간 침입 감시, 스냅샷 Diff 비교, A4 PDF 리포트, 최대 5개 서브넷 관리.<br>
      &nbsp;&nbsp;- <b>📅 1년 정기 구독권</b>: $19 (약 25,000원 / 365일 이용 & 업데이트)<br>
      &nbsp;&nbsp;- <b>💎 영구 소장 라이선스</b>: $49 (약 65,000원 / 만료일 없는 평생 소장 & 무상 업데이트)
    </div>
    <div style="background: #ffffff; border: 1px dashed #22c55e; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #166534;">
      💡 <b>30일 무료 체험 키</b>: 앱 상단 <b>[라이선스 관리]</b> 창에서 <b><code>GRID-PRO-TRIAL-2026</code></b>을 입력하시면 Pro 전 기능을 30일간 무료로 즉시 체험하실 수 있습니다!
    </div>
  </div>

  <!-- Download CTA Buttons -->
  <div style="background: #0f172a; border-radius: 12px; padding: 26px 20px; text-align: center; margin-bottom: 30px;">
    <h3 style="color: #ffffff; font-size: 18px; font-weight: 900; margin: 0 0 8px 0;">
      지금 바로 Grid IP Scanner2를 경험해 보세요
    </h3>
    <p style="color: #94a3b8; font-size: 13px; margin: 0 0 18px 0;">
      Windows 10 / 11 완벽 지원 &bull; 무설치 포터블 &amp; 정식 인스톨러 무료 제공
    </p>
    <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
      <a href="https://github.com/AhBiYout-all/grid-ip-scanner2/releases" target="_blank" style="background: #0284c7; color: #ffffff; padding: 11px 22px; border-radius: 8px; font-size: 14px; font-weight: 800; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.4);">
        📦 최신 버전 다운로드 (GitHub Releases)
      </a>
      <a href="https://github.com/AhBiYout-all/grid-ip-scanner2" target="_blank" style="background: #334155; color: #ffffff; padding: 11px 22px; border-radius: 8px; font-size: 14px; font-weight: 800; text-decoration: none; display: inline-block;">
        💻 GitHub 공식 저장소 방문
      </a>
    </div>
  </div>

  <!-- Footer Info -->
  <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.6;">
    개발자: <b>AhBiYout</b> &bull; 공식 배포: <b>https://ahbiyoutvibe.blogspot.com/</b> (<a href="https://ahbiyoutvibe.blogspot.com/" target="_blank" style="color: #0284c7; text-decoration: none;">www.cisnet.co.kr</a>)<br>
    기능 제안 및 버그 리포트는 깃허브 Issues 또는 블로그 댓글로 언제든 남겨주세요. 감사합니다!
  </div>

</div>
```
