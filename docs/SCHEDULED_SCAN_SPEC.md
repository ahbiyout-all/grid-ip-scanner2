# Grid IP Scanner2 - Automated Recurring Scan Scheduler Specification

## 1. 개요 (Overview)
**Grid IP Scanner2**의 정기 자동 스케줄러(Automated Recurring Scan Scheduler)는 사용자가 수동으로 스캔 버튼을 누르지 않아도, 원하는 주기(15분, 30분, 1시간, 6시간, 매일 24시간 야간점검 등)에 맞춰 백그라운드에서 지정된 서브넷 대역을 자동으로 스캔하고, 결과를 스냅샷 아카이브 및 이력 로그에 영구 저장하는 엔터프라이즈급 자동화 시스템입니다.

---

## 2. 핵심 아키텍처 및 데이터 모델

### 2.1 스케줄 설정 (`ScanSchedule`)
```typescript
export interface ScanSchedule {
  id: string;                      // 스케줄 고유 식별자 (예: sched_1793087318_x9a1c)
  name: string;                    // 사용자 친화적 스케줄 명칭 (예: '본사 3층 1시간 정기 감시')
  enabled: boolean;                // 활성/비활성 토글 상태
  subnet: string;                  // 대상 서브넷 (예: '192.168.0')
  start: number;                   // 시작 IP 오프셋 (1~254)
  end: number;                     // 종료 IP 오프셋 (1~254)
  scanMode: 'fast' | 'standard' | 'precision'; // 스캔 속도/정밀도 모드
  deepScan: boolean;               // 주요 12개 서비스 포트 심층 점검 여부
  intervalType: ScheduleInterval;  // '15m' | '30m' | 'hourly' | 'every_2h' | 'every_6h' | 'every_12h' | 'daily' | 'weekly' | 'custom'
  intervalMinutes: number;         // 환산된 분 단위 주기 (예: 60, 360, 1440 등)
  autoSaveSnapshot: boolean;       // 스캔 완료 시 스냅샷 자동 생성/보관 여부
  snapshotPrefix?: string;         // 스냅샷 라벨 접두어 (기본값: '[Auto-Sched]')
  notifyOnCompletion: boolean;     // 스캔 완료 시 브라우저/시스템 알림 전송
  notifyOnChangesOnly: boolean;    // 신규 장비(+NEW) 또는 오프라인(-OFF) 변동 시에만 알림
  lastRun?: number;                // 최근 실행 타임스탬프 (ms)
  nextRun?: number;                // 다음 실행 예정 타임스탬프 (ms)
  createdAt: number;               // 생성 일시
  updatedAt: number;               // 최근 수정 일시
  totalRuns: number;               // 총 누적 자동 실행 횟수
}
```

### 2.2 실행 이력 로그 (`ScheduledScanRunRecord`)
```typescript
export interface ScheduledScanRunRecord {
  id: string;                      // 실행 기록 ID
  scheduleId: string;              // 연동된 스케줄 ID
  scheduleName: string;            // 실행 당시 스케줄 명칭
  timestamp: number;               // 실행 완료 시각
  subnet: string;                  // 스캔 서브넷
  activeCount: number;             // 응답한 온라인 활성 장치 수
  totalCount: number;              // 전체 검사 대상 수
  durationMs: number;              // 스캔 소요 시간 (밀리초)
  snapshotId?: string;             // 생성된 스냅샷 ID (Diff 모달 바로가기 연동)
  newDevicesCount?: number;        // 기준점 대비 신규 발견 장치 수
  offlineDevicesCount?: number;    // 기준점 대비 오프라인 전환 장치 수
  changedDevicesCount?: number;    // MAC/포트 변조 장치 수
  status: 'success' | 'failed' | 'aborted'; // 실행 결과
  errorMessage?: string;
}
```

---

## 3. 주요 기능 명세

### 3.1 비간섭 무중단 백그라운드 엔진 (`schedulerService.ts`)
- **실시간 주기적 타이머 (5초 Ticker)**: 앱이 브라우저나 데스크톱에서 실행되는 동안 5초 주기로 활성화된 스케줄의 `nextRun` 상태를 검사합니다.
- **스마트 스케줄링 락 (Busy Avoidance)**: 사용자가 수동으로 스캔 중이거나 엔진이 응답하지 않을 때는 무리하게 중복 실행하지 않고 대기 후 안전하게 처리합니다.
- **영구 보존**: 브라우저 로컬 스토리지(`grid_ip_scanner_schedules_v1`, `grid_ip_scanner_schedule_history_v1`)에 안전하게 저장되어 앱을 껐다 켜도 스케줄과 다음 실행 시각이 유지됩니다.

### 3.2 스냅샷 자동 생성 및 Diff 모드 연동
- 스케줄 완료 시 자동으로 `[Auto-Sched] 스케줄명 (HH:MM)` 형태의 스냅샷을 캡처하여 최대 25개까지 히스토리에 보존합니다.
- 저장된 스냅샷은 언제든 상단 `[Diff 모드]` 또는 `[1:1 스튜디오]`에서 기준점이나 비교 타겟으로 불러와 신규 침입 장비 및 네트워크 변경점을 시각적으로 분석할 수 있습니다.

### 3.3 사용자 친화적 UI (`components/ScheduleModal.tsx`)
- **스케줄 목록 탭**: 활성 스케줄 개수, 실시간 남은 시간 카운트다운("24분 12초 후", "대기 중"), 즉시 실행(Run Now) 버튼, 수정 및 삭제.
- **새 스케줄 등록 탭**: 현재 스캐너 서브넷 원클릭 복사, 8종 주기 프리셋 버튼, 사용자 정의 분/시간 입력, 정밀 포트 스캔 및 알림 옵션.
- **실행 이력 탭**: 실행 시각, 소요 시간, 발견된 활성 장비 수, +신규/-오프라인 통계, 스냅샷 바로가기 링크, CSV 다운로드 내보내기.

---

## 4. 검증 결과
- TypeScript 컴파일 검사: 0 Errors (Strict Type-Safe)
- Vite 빌드 검사: `npm run build` 통과 완료
