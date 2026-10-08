# 🔬 OuiValidator - C++ OUI 데이터셋 고성능 검증, 무결성 검사 및 정규화 DLL 명세서

> **문서 버전**: v2.4.0  
> **최종 수정일**: 2026-10-07  
> **모듈명**: `oui_validator.dll` (High-Performance C++17 Custom Native DLL)  
> **작성자**: AhBiYout (Grid IP Scanner2 Core Architecture Team)

---

## 1. 개요 및 설계 목적 (Overview & Objectives)

**`OuiValidator`**는 IEEE 및 Wireshark에서 수집된 90,000건 이상의 대용량 OUI(Organizationally Unique Identifier) 하드웨어 제조사 레코드의 무결성을 초고속으로 검증하고, Wireshark 표준 접두사 길이(24, 28, 36비트)와 교차 검증(Cross-Reference)하여 비정상/손상 항목을 색출하며, `integrity_report.json` 및 `repair_log.json`을 자동 생성하는 **C++17 기반 고성능 네이티브 동적 링크 라이브러리(DLL)**입니다.

```
+-------------------------------------------------------------------------+
|                  Electron Main Process / Backend Worker                 |
|            ouiValidator.validateOuiIntegrity("master_oui.txt")          |
+-------------------------------------------------------------------------+
                                    |
                            (Koffi / FFI C-ABI)
                                    v
+-------------------------------------------------------------------------+
|                    OuiValidator.dll (C++17 Core)                        |
|  - Zero-Allocation Lexer & Tokenizer                                    |
|  - Multi-Bit Prefix Canonicalizer (24-bit MA-L, 28-bit MA-M, 36-bit MA-S) |
|  - Wireshark Standard Cross-Reference Engine (`validateOuiIntegrity`)   |
|  - Pre-allocated 128K Bucket Fast Hash Table (Robin Hood Indexing)      |
|  - Collision & Vendor Anomaly Detector & Auto-Repair Synthesizer        |
+-------------------------------------------------------------------------+
           |                                                |
           v                                                v
 Output: "integrity_report.json"                  Output: "repair_log.json"
```

### 🎯 핵심 해결 과제
1. **서브 밀리초 대용량 파싱 (Sub-Millisecond 90K Parsing)**: 9만 건 이상의 텍스트/CSV/TSV 레코드를 3ms 이내로 인메모리 파싱 및 해시 인덱싱 완료.
2. **다중 비트 프리픽스 정규화 (Multi-Bit Prefix Normalization)**:
   - **24-bit MA-L (Large)**: `00:1A:2B`, `00-1A-2B`, `001A2B` -> `00:1A:2B` (24 bits)
   - **28-bit MA-M (Medium)**: `00:1A:2B:30/28` -> `00:1A:2B:30/28` (28 bits)
   - **36-bit MA-S (Small)**: `00:1A:2B:3C:40/36` -> `00:1A:2B:3C:40/36` (36 bits)
3. **Wireshark 표준 규격 무결성 교차 검증 (`validateOuiIntegrity`)**:
   - 24/28/36비트 표준 접두사 길이 위반 탐지.
   - 비표준 구분자(Hyphen `-`, Dot `.`, 소문자 Hex, CIDR 마스크 누락) 자동 감지.
   - 동일 프리픽스 내 제조사 충돌(Vendor Collision) 및 공백/특수문자 오염 색출.
4. **자동 복구 로그 생성 (`repair_log.json`)**:
   - 감지된 모든 이상 항목에 대해 표준 규격의 정규화된 대체 프리픽스 및 정리된 제조사명을 매핑하여 `repair_log.json` 자동 출력.

---

## 2. C/C++ API 명세 (C-ABI Interface Specification)

헤더 파일 위치: `native_dll/oui_validator.h`

```c
#include "oui_validator.h"
```

| 함수명 | 반환 타입 | 매개변수 | 설명 |
| :--- | :--- | :--- | :--- |
| `OuiValidator_GetVersion` | `int` | `void` | DLL의 정수 버전 코드를 반환 (예: `20400` = v2.4.0). |
| `OuiValidator_CreateContext` | `HOuiValidator` | `void` | 신규 검증기 컨텍스트 메모리 생성. |
| `OuiValidator_FreeContext` | `void` | `HOuiValidator ctx` | 검증기 컨텍스트 및 내부 해시 테이블 메모리 해제. |
| `OuiValidator_NormalizePrefix` | `int` | `const char* raw, char* outNorm, size_t maxLen, int* outBits` | 24/28/36비트 원시 프리픽스를 표준 표기법으로 정규화하고 비트 길이 반환. |
| `OuiValidator_LoadDataset` | `int` | `HOuiValidator ctx, const char* path, int type` | 지정된 경로의 OUI 텍스트/CSV 파일을 인메모리로 고속 적재. |
| `OuiValidator_Validate` | `int` | `HOuiValidator ctx` | 해시 테이블 기반 중복 제거, 충돌 감지 및 검증 수행. |
| `OuiValidator_GetStats` | `int` | `HOuiValidator ctx, OuiValidatorStats* outStats` | 검증 통계 구조체(유효 레코드 수, 충돌 수 등) 추출. |
| `OuiValidator_GenerateReport` | `int` | `HOuiValidator ctx, const char* outPath, char* outJson, size_t maxLen` | `integrity_report.json` 파일 생성 및 JSON 요약 문자열 반환. |
| `OuiValidator_ValidateOuiIntegrity` | `int` | `HOuiValidator ctx, const char* repairLogPath, char* outRepairJson, size_t maxLen` | Wireshark 표준 접두사 길이 교차 검증을 수행하고 결함 항목에 대한 `repair_log.json` 생성. |

---

## 3. Wireshark 표준 교차 검증 및 무결성 검사 규칙 (`validateOuiIntegrity`)

`validateOuiIntegrity` 함수는 로드된 OUI 데이터베이스의 각 엔트리를 다음 표준 매트릭스와 대조합니다:

### 3.1 비트 길이 및 접두사 표준 매트릭스
| 규격 구분 | 접두사 길이 | Wireshark 표준 표기 형식 | 허용 옥텟 및 마스크 |
| :--- | :--- | :--- | :--- |
| **IEEE MA-L** | **24 Bits** (3 Octets) | `XX:XX:XX` | 6 Hex Digits, 콜론 2개 |
| **IEEE MA-M** | **28 Bits** (3.5 Octets) | `XX:XX:XX:X0/28` | 7 Hex Digits + 명시적 `/28` 마스크 |
| **IEEE MA-S** | **36 Bits** (4.5 Octets) | `XX:XX:XX:XX:X0/36` | 9 Hex Digits + 명시적 `/36` 마스크 |

### 3.2 결함 분류(Issue Types) 및 자동 복구 로직
1. **`NON_CANONICAL_DELIMITER`**: 하이픈(`00-1A-2B`) 또는 점(`001A.2B00`) 사용 시 표준 콜론 표기(`00:1A:2B`)로 자동 치환.
2. **`MISSING_CIDR_MASK_28` / `MISSING_CIDR_MASK_36`**: 7자리 또는 9자리 프리픽스에 CIDR 접미사가 누락된 경우 `/28` 또는 `/36` 마스크 자동 보정.
3. **`LOWERCASE_HEX`**: 소문자(`00:1a:2b`)를 대문자 Hex(`00:1A:2B`)로 정규화.
4. **`INVALID_PREFIX_LENGTH`**: 24/28/36비트 이외의 비정상 길이(예: 16비트, 32비트)를 식별하여 결함으로 플래그.
5. **`DIRTY_VENDOR_NAME`**: 제조사 이름 앞뒤의 불필요한 공백, 따옴표(`"`, `'`), 비출력 제어 문자 자동 트림 및 새니타이징.
6. **`DUPLICATE_VENDOR_COLLISION`**: 동일한 MAC 접두사에 상이한 제조사가 중복 등록된 충돌을 색출하고 주 엔트리로 표준화.

---

## 4. `repair_log.json` 출력 스키마

결함 및 불일치 발견 시 생성되는 `repair_log.json` 구조:

```json
{
  "tool": "OuiValidator",
  "action": "validateOuiIntegrity",
  "engineVersion": "2.4.0",
  "timestamp": 1791350400,
  "sourceFile": "master_oui.txt",
  "wiresharkStandards": {
    "maL24Bit": "XX:XX:XX",
    "maM28Bit": "XX:XX:XX:X0/28",
    "maS36Bit": "XX:XX:XX:XX:X0/36"
  },
  "summary": {
    "totalEntriesScanned": 92450,
    "validUniqueCount": 89120,
    "discrepanciesFound": 142,
    "repairsApplied": 142,
    "elapsedMicroseconds": 2980
  },
  "discrepancies": [
    {
      "lineNumber": 1042,
      "issueType": "NON_CANONICAL_DELIMITER",
      "description": "Prefix uses hyphen '-' or dot '.' delimiter instead of Wireshark standard colon ':'.",
      "detectedBits": 24,
      "original": {
        "prefix": "00-50-56",
        "vendor": "VMware, Inc."
      },
      "repaired": {
        "prefix": "00:50:56",
        "vendor": "VMware, Inc."
      },
      "status": "AUTO_REPAIRED"
    },
    {
      "lineNumber": 3120,
      "issueType": "MISSING_CIDR_MASK_28",
      "description": "28-bit MA-M prefix is missing required '/28' CIDR mask suffix.",
      "detectedBits": 28,
      "original": {
        "prefix": "00:50:C2:0",
        "vendor": "Alfa, Inc."
      },
      "repaired": {
        "prefix": "00:50:C2:00/28",
        "vendor": "Alfa, Inc."
      },
      "status": "AUTO_REPAIRED"
    }
  ]
}
```

---

## 5. Electron 및 TypeScript 연동 가이드

```typescript
import { ouiValidator } from './services/ouiValidatorBridge';

// Wireshark 규격 교차 검증 및 repair_log.json 자동 생성
const repairResult = ouiValidator.validateOuiIntegrity('master_oui.txt', 'repair_log.json');

console.log(`총 검증 수: ${repairResult.totalEntriesScanned}`);
console.log(`발견된 결함: ${repairResult.discrepanciesFound} 건`);
console.log(`자동 복구 적용: ${repairResult.repairsApplied} 건 (소요시간: ${repairResult.elapsedMicroseconds} µs)`);
```
