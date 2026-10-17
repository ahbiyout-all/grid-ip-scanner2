# 🔏 Grid IP Scanner2 - 테스트용 자가 서명(Self-Signed Digital Signature) 가이드

이 문서는 상용 코드사인 인증서 구입 전, **테스트 및 검증용 자가 서명(Self-Signed Certificate)**을 생성하고 Grid IP Scanner2 실행 파일(.exe)에 적용하여 백신 및 SmartScreen 오탐지를 완화하는 방법을 설명합니다.

---

## 1. 테스트 자가 서명 스크립트 위치
프로젝트 루트의 `scripts/sign-binary.ps1` 스크립트를 사용하면 자동으로 자가 서명 인증서를 생성하고, 프로젝트 내 모든 빌드된 실행 파일(`Grid IP Scanner2 v2.4.0.exe`, `Grid_IP_Scanner2.exe` 등)에 전자 서명을 적용할 수 있습니다.

### 실행 방법 (PowerShell)
```powershell
# PowerShell을 관리자 권한으로 실행 후 프로젝트 루트에서 실행
Set-ExecutionPolicy Unrestricted -Scope Process
.\scripts\sign-binary.ps1
```

---

## 2. 동작 원리
1. **인증서 자동 생성**: `New-SelfSignedCertificate` cmdlet을 사용하여 `GridIPScanner2_TestSign` 주체(Subject)를 가진 코드사인용(CodeSigningCert) 인증서를 현재 사용자 개인 저장소(`Cert:\CurrentUser\My`)에 생성합니다.
2. **신뢰된 루트 저장소 등록**: 로컬 테스트 편의를 위해 현재 사용자의 `Trusted Root Certification Authorities` 저장소에도 인증서를 자동으로 등록합니다.
3. **디지털 서명 적용**: Windows SDK의 `signtool.exe` (또는 PowerShell `Set-AuthenticodeSignature`)를 사용하여 SHA-256 해시 알고리즘과 타임스탬프 서버(`http://timestamp.digicert.com`)를 연동하여 실행 파일에 서명합니다.

---

## 3. 주의 사항
* 자가 서명된 인증서는 개발자 로컬 환경 및 테스트 목적으로 제작되었으므로, 타인의 PC에서 다운로드 시 초기 스마트스크린(SmartScreen) 경고가 발생할 수 있습니다.
* 완벽한 경고 해소를 위해서는 향후 정식 상용 EV 코드사인 인증서(DigiCert, Sectigo 등) 발급을 권장합니다.
