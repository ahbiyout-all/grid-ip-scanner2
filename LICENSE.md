# GRID IP SCANNER2 - DUAL LICENSE & COMPLIANCE AGREEMENT

본 문서는 **Grid IP Scanner2 (v2.2.3)**의 공식 라이선스 고지서입니다. Grid IP Scanner2는 오픈소스 커뮤니티 권리를 보호하고 상업적 이용의 법적 안전성을 완벽히 보장하기 위해 **이중 라이선스 (Dual Licensing)** 정책을 엄격히 채택하여 배포됩니다.

---

## 1. 이중 라이선스 모델 (Dual Licensing Structure)

본 소프트웨어는 사용자와 배포자의 이용 목적에 따라 두 가지 라이선스 형태 중 하나를 선택하여 적용받을 수 있습니다.

### 💡 [선택 A] GNU 일반 공중 사용 허가서 (GNU GPL v3.0) - 커뮤니티 에디션
* **대상**: 개인 사용자, 학술 연구원, 혹은 오픈소스 기여 목적으로 본 소프트웨어를 그대로 사용 또는 수정하고자 하는 경우.
* **주요 조건**: 
  - 본 소프트웨어를 수정하여 배포할 경우, 전체 파생 저작물의 소스코드를 동일한 GPL v3 라이선스로 대중에 무상 공개해야 합니다 (Copyleft 의무).
  - 본 라이선스를 준수하는 범위 내에서는 누구나 자유롭게 무상으로 이용하고 기능 개선을 제안할 수 있습니다.

### 💎 [선택 B] 독점 상용 라이선스 (Proprietary Commercial License) - 상업용 에디션
* **대상**: 소스코드를 공개하지 않은 채 솔루션을 독점적으로 판매하고자 하거나, 프로그램 이름을 자사 브랜드로 변경(Rebranding/White-labeling)하여 유료 패키징 상품으로 납품 및 재배포하려는 기업 또는 개인.
* **주요 조건**:
  - 저작권자(**AhBiYout**)로부터 상용 라이선스 권리를 취득하는 계약입니다.
  - 소스코드 비공개 권리가 완벽하게 보장되며, 독점 상업화, 임대, 상용 패키지 유료 판매, 기술 지원 서비스를 포함하여 상업적 비즈니스 권리를 법적 분쟁 없이 100% 투명하게 행사할 수 있습니다.

---

## 2. 하부 라이브러리 법적 준수 명세 (Upstream Compliance)

Grid IP Scanner2의 프론트엔드 및 백엔드 하부 구조를 이루는 오픈소스 라이브러리들은 검증된 허용형 오픈소스 라이선스 표준을 엄격히 준수합니다.

### 🛡️ MIT License 및 허용형 라이선스 준수 대상
* **프론트엔드 구성 요소**: `React 18`, `TypeScript`, `Tailwind CSS`, `Lucide Icons`, `framer-motion`
* **백엔드 구성 요소**: `Go (Golang) Runtime`, `Express (Node.js) dev dependency`
* **라이선스 법적 효력**:
  - 위의 핵심 프레임워크와 라이브러리들은 모두 극도의 유연성을 부여하는 **MIT License** 또는 이와 유사한 초허용형 라이선스(Permissive License)에 의거하여 배포됩니다.
  - MIT 라이선스는 **"상업적 목적의 재배포, 변경, 서브라이선스 부여, 유료 판매"**를 원천적으로 무제한 허용합니다.
  - 따라서 상용 라이선스 취득 하에 Grid IP Scanner2를 독점 유료 패키지로 포장하여 영리적 목적으로 판매하더라도, 상위 라이브러리의 저작권 및 상표권을 전적으로 준수하고 있으므로 어떠한 라이선스 침해 분쟁이나 권리 주장의 위험이 일체 발생하지 않습니다.

---

## 3. 하드웨어 제조사 OUI 데이터베이스 귀속 (OUI Registry & Upstream Compliance)

* **데이터 소스 및 규격**: 본 프로그램에 내장된 맥주소(MAC Address) 분석용 OUI 데이터베이스는 IEEE 공식 레지스트리(MA-L 24비트, MA-M 28비트, MA-S 36비트), Wireshark Automated Manuf Database 및 Ringmast4r OUI-Master-Database(MIT)를 수집, 교차 검증 및 정제하여 최신 90,168건 이상의 레코드로 탑재하였습니다.
* **온라인 업데이트 이중 미러링(Tiered Fallback)**: Wireshark Automated Manuf 미러 및 IEEE 공식 레지스트리를 통한 합법적 실시간 동기화를 지원합니다.
* **법적 권리 및 고지 의무 준수**: 원본 데이터베이스 저작자 및 업스트림 프로젝트의 라이선스 규정과 저작권 고지 요건을 100% 충족하므로, 상용 패키징 유료 판매 및 서비스 제공에서 권리적 하자가 전혀 없는 무결한 데이터 상태를 보증합니다.

---

## 4. 무단 도용 및 권리 침해 금지 경고 (Legal Warning)

오픈소스 라이선스(GPL v3)의 범위를 벗어나 소스코드를 공개하지 않은 상태에서, 저작권자의 명시적인 사전 상용 라이선스 계약 승인 없이 본 프로그램의 핵심 알고리즘(Safe Relaunch, 16x16 State Pipeline, Tiered OUI Mirroring 등), UI 스타일링 레이아웃 및 리소스를 무단으로 도용하여 상업적으로 변형, 재판매, 또는 배포하는 행위는 **국내 저작권법 및 국제 지적재산권 협약(UCC/WIPO)**에 의해 엄격히 금지됩니다. 이를 위반할 시 민형사상의 엄중한 법적 책임 및 손해배상 청구가 즉각 수반됩니다.

---

### 📞 라이선스 계약 및 취득 문의
* **저작권자 / 기술 개발자**: AhBiYout
* **소속 / 파트너사**: Cisnet ([www.cisnet.co.kr](http://www.cisnet.co.kr))
* **공식 블로그**: [ahbiyoutvibe.blogspot.com](https://ahbiyoutvibe.blogspot.com/)

*Copyright (c) 2025-2026 AhBiYout. All rights reserved.*
