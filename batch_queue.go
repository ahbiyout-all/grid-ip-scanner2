package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net"
	"sort"
	"strings"
	"sync"
	"time"
)

type BatchQueueTargetInput struct {
	IP       string `json:"ip"`
	MAC      string `json:"mac,omitempty"`
	Hostname string `json:"hostname,omitempty"`
	Port     int    `json:"port,omitempty"`
	Protocol string `json:"protocol,omitempty"`
}

type BatchQueueCreateRequest struct {
	Action         string                  `json:"action"` // batch_wol | batch_ping | batch_remote_probe | batch_remote_launch
	Label          string                  `json:"label,omitempty"`
	Concurrency    int                     `json:"concurrency,omitempty"`
	DelayMs        int                     `json:"delayMs,omitempty"`
	VerifyWake     bool                    `json:"verifyWake,omitempty"`
	VerifyDelaySec int                     `json:"verifyDelaySec,omitempty"`
	Targets        []BatchQueueTargetInput `json:"targets"`
}

type BatchQueueTarget struct {
	ID          string `json:"id"`
	IP          string `json:"ip"`
	MAC         string `json:"mac,omitempty"`
	Hostname    string `json:"hostname,omitempty"`
	Port        int    `json:"port,omitempty"`
	Protocol    string `json:"protocol,omitempty"`
	Status      string `json:"status"` // pending | running | success | failed | verified_online | skipped | cancelled
	LatencyMs   int    `json:"latencyMs,omitempty"`
	Message     string `json:"message,omitempty"`
	Attempts    int    `json:"attempts"`
	UpdatedAtMs int64  `json:"updatedAtMs"`
}

type BatchQueueJob struct {
	ID             string              `json:"id"`
	Action         string              `json:"action"`
	Label          string              `json:"label"`
	Status         string              `json:"status"` // queued | running | completed | cancelled | partial_failed
	Concurrency    int                 `json:"concurrency"`
	DelayMs        int                 `json:"delayMs"`
	VerifyWake     bool                `json:"verifyWake,omitempty"`
	VerifyDelaySec int                 `json:"verifyDelaySec,omitempty"`
	CreatedAtMs    int64               `json:"createdAtMs"`
	StartedAtMs    int64               `json:"startedAtMs,omitempty"`
	FinishedAtMs   int64               `json:"finishedAtMs,omitempty"`
	TotalTargets   int                 `json:"totalTargets"`
	CompletedCount int                 `json:"completedCount"`
	SuccessCount   int                 `json:"successCount"`
	FailedCount    int                 `json:"failedCount"`
	Targets        []*BatchQueueTarget `json:"targets"`
}

type BatchQueueManager struct {
	mu      sync.RWMutex
	jobs    map[string]*BatchQueueJob
	cancels map[string]context.CancelFunc
	probeFn func(ctx context.Context, ip string, port int, timeoutMs int) (bool, int, string)
	wolFn   func(mac string, ip string) (int, error)
}

var (
	defaultBatchQueueMgr     *BatchQueueManager
	defaultBatchQueueMgrOnce sync.Once
)

func getBatchQueueManager() *BatchQueueManager {
	defaultBatchQueueMgrOnce.Do(func() {
		defaultBatchQueueMgr = newBatchQueueManager()
	})
	return defaultBatchQueueMgr
}

func newBatchQueueManager() *BatchQueueManager {
	return &BatchQueueManager{
		jobs:    make(map[string]*BatchQueueJob),
		cancels: make(map[string]context.CancelFunc),
		wolFn:   sendWakeOnLan,
		probeFn: defaultBatchTargetProbe,
	}
}

func defaultBatchTargetProbe(ctx context.Context, ip string, port int, timeoutMs int) (bool, int, string) {
	t0 := time.Now()
	if port > 0 && port <= 65535 {
		d := &net.Dialer{Timeout: time.Duration(timeoutMs) * time.Millisecond}
		conn, err := d.DialContext(ctx, "tcp", net.JoinHostPort(ip, fmt.Sprintf("%d", port)))
		lat := int(time.Since(t0).Milliseconds())
		if err != nil {
			return false, lat, err.Error()
		}
		_ = conn.Close()
		return true, lat, fmt.Sprintf("TCP/%d reachable (%dms)", port, lat)
	}
	res := scanIPQuickWithHints(ctx, ip, timeoutMs, nil)
	if res.Alive {
		return true, res.Latency, fmt.Sprintf("Host online (RTT %dms)", res.Latency)
	}
	return false, 0, "Host did not respond"
}

func newBatchID(prefix string) string {
	var rnd [4]byte
	_, _ = rand.Read(rnd[:])
	return fmt.Sprintf("%s_%d_%s", prefix, time.Now().UTC().UnixMilli(), hex.EncodeToString(rnd[:]))
}

func cloneBatchJob(job *BatchQueueJob) BatchQueueJob {
	cp := *job
	cp.Targets = make([]*BatchQueueTarget, len(job.Targets))
	for i, t := range job.Targets {
		tCopy := *t
		cp.Targets[i] = &tCopy
	}
	return cp
}

func (m *BatchQueueManager) CreateAndStartJob(req BatchQueueCreateRequest, status LicenseStatusResponse) (BatchQueueJob, int, error) {
	if !status.Features.BatchOpsQueue || status.Features.BatchQueueMaxTargets <= 0 {
		return BatchQueueJob{}, 403, errors.New("Multi-device batch WoL and remote control queue requires PRO or Enterprise edition.")
	}

	action := strings.TrimSpace(strings.ToLower(req.Action))
	switch action {
	case "batch_wol", "batch_ping", "batch_remote_probe", "batch_remote_launch":
	default:
		return BatchQueueJob{}, 400, fmt.Errorf("unsupported batch action: %s", req.Action)
	}

	if len(req.Targets) == 0 {
		return BatchQueueJob{}, 400, errors.New("at least one target device is required")
	}
	if len(req.Targets) > status.Features.BatchQueueMaxTargets {
		return BatchQueueJob{}, 403, fmt.Errorf("target count (%d) exceeds %s tier limit (%d)",
			len(req.Targets), strings.ToUpper(status.Tier), status.Features.BatchQueueMaxTargets)
	}

	concurrency := req.Concurrency
	if concurrency < 1 {
		concurrency = 2
	} else if concurrency > 4 {
		concurrency = 4
	}
	delayMs := req.DelayMs
	if delayMs < 100 {
		delayMs = 150
	} else if delayMs > 2000 {
		delayMs = 2000
	}
	verifyDelay := req.VerifyDelaySec
	if req.VerifyWake {
		if verifyDelay < 1 {
			verifyDelay = 4
		} else if verifyDelay > 20 {
			verifyDelay = 20
		}
	}

	nowMs := time.Now().UTC().UnixMilli()
	targets := make([]*BatchQueueTarget, 0, len(req.Targets))
	for i, in := range req.Targets {
		ip := strings.TrimSpace(in.IP)
		parsed := net.ParseIP(ip)
		if parsed == nil || parsed.To4() == nil {
			return BatchQueueJob{}, 400, fmt.Errorf("invalid IPv4 target at index %d: %q", i, in.IP)
		}
		port := in.Port
		if port < 0 || port > 65535 {
			return BatchQueueJob{}, 400, fmt.Errorf("invalid port %d for target %s", port, parsed.String())
		}
		targets = append(targets, &BatchQueueTarget{
			ID:          fmt.Sprintf("tgt_%d", i+1),
			IP:          parsed.String(),
			MAC:         strings.TrimSpace(in.MAC),
			Hostname:    strings.TrimSpace(in.Hostname),
			Port:        port,
			Protocol:    strings.TrimSpace(in.Protocol),
			Status:      "pending",
			UpdatedAtMs: nowMs,
		})
	}

	label := strings.TrimSpace(req.Label)
	if label == "" {
		label = fmt.Sprintf("%s (%d targets)", strings.ToUpper(action), len(targets))
	}

	jobID := newBatchID("bjob")
	job := &BatchQueueJob{
		ID:             jobID,
		Action:         action,
		Label:          label,
		Status:         "queued",
		Concurrency:    concurrency,
		DelayMs:        delayMs,
		VerifyWake:     req.VerifyWake,
		VerifyDelaySec: verifyDelay,
		CreatedAtMs:    nowMs,
		TotalTargets:   len(targets),
		Targets:        targets,
	}

	ctx, cancel := context.WithCancel(context.Background())

	m.mu.Lock()
	m.jobs[jobID] = job
	m.cancels[jobID] = cancel
	m.mu.Unlock()

	go m.executeJob(ctx, jobID, targets)

	return cloneBatchJob(job), 200, nil
}

func (m *BatchQueueManager) executeJob(ctx context.Context, jobID string, runTargets []*BatchQueueTarget) {
	m.mu.Lock()
	job, ok := m.jobs[jobID]
	if !ok {
		m.mu.Unlock()
		return
	}
	job.Status = "running"
	if job.StartedAtMs == 0 {
		job.StartedAtMs = time.Now().UTC().UnixMilli()
	}
	action := job.Action
	concurrency := job.Concurrency
	delayMs := job.DelayMs
	verifyWake := job.VerifyWake
	verifyDelay := job.VerifyDelaySec
	m.mu.Unlock()

	workCh := make(chan *BatchQueueTarget, len(runTargets))
	for _, t := range runTargets {
		workCh <- t
	}
	close(workCh)

	var wg sync.WaitGroup
	for w := 0; w < concurrency; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for tgt := range workCh {
				if ctx.Err() != nil {
					m.mu.Lock()
					tgt.Status = "cancelled"
					tgt.Message = "Cancelled by user"
					tgt.UpdatedAtMs = time.Now().UTC().UnixMilli()
					m.mu.Unlock()
					continue
				}

				m.mu.Lock()
				tgt.Status = "running"
				tgt.Attempts++
				tgt.UpdatedAtMs = time.Now().UTC().UnixMilli()
				m.mu.Unlock()

				var nextStatus, nextMsg string
				var latencyMs int

				switch action {
				case "batch_wol":
					if normalizeTimelineMac(tgt.MAC) == "" {
						nextStatus = "failed"
						nextMsg = "Missing valid MAC address for Wake-on-LAN"
					} else {
						sent, err := m.wolFn(tgt.MAC, tgt.IP)
						if err != nil {
							nextStatus = "failed"
							nextMsg = err.Error()
						} else {
							nextStatus = "success"
							nextMsg = fmt.Sprintf("Magic Packet sent (%d broadcasts)", sent)
							if verifyWake {
								timer := time.NewTimer(time.Duration(verifyDelay) * time.Second)
								select {
								case <-ctx.Done():
									timer.Stop()
									nextStatus = "cancelled"
									nextMsg = "Aborted during wake verification"
								case <-timer.C:
									alive, lat, _ := m.probeFn(ctx, tgt.IP, tgt.Port, 1000)
									latencyMs = lat
									if alive {
										nextStatus = "verified_online"
										nextMsg = fmt.Sprintf("Magic Packet sent & verified online (%dms)", lat)
									} else {
										nextMsg = fmt.Sprintf("Magic Packet sent (%d); target still booting after %ds", sent, verifyDelay)
									}
								}
							}
						}
					}
				case "batch_ping":
					alive, lat, msg := m.probeFn(ctx, tgt.IP, 0, 900)
					latencyMs = lat
					if alive {
						nextStatus = "success"
						nextMsg = msg
					} else {
						nextStatus = "failed"
						nextMsg = msg
					}
				case "batch_remote_probe", "batch_remote_launch":
					probePort := tgt.Port
					if probePort <= 0 {
						probePort = 80
					}
					alive, lat, msg := m.probeFn(ctx, tgt.IP, probePort, 1000)
					latencyMs = lat
					if alive {
						nextStatus = "success"
						nextMsg = msg
					} else {
						nextStatus = "failed"
						nextMsg = msg
					}
				}

				m.mu.Lock()
				tgt.Status = nextStatus
				tgt.LatencyMs = latencyMs
				tgt.Message = nextMsg
				tgt.UpdatedAtMs = time.Now().UTC().UnixMilli()
				m.recomputeCountersLocked(job)
				m.mu.Unlock()

				if delayMs > 0 {
					select {
					case <-ctx.Done():
					case <-time.After(time.Duration(delayMs) * time.Millisecond):
					}
				}
			}
		}()
	}

	wg.Wait()

	m.mu.Lock()
	defer m.mu.Unlock()
	if job, exists := m.jobs[jobID]; exists {
		m.recomputeCountersLocked(job)
		job.FinishedAtMs = time.Now().UTC().UnixMilli()
		if ctx.Err() != nil {
			job.Status = "cancelled"
		} else if job.FailedCount > 0 {
			job.Status = "partial_failed"
		} else {
			job.Status = "completed"
		}
		delete(m.cancels, jobID)
	}
}

func (m *BatchQueueManager) recomputeCountersLocked(job *BatchQueueJob) {
	completed, succ, fail := 0, 0, 0
	for _, t := range job.Targets {
		switch t.Status {
		case "success", "verified_online":
			completed++
			succ++
		case "failed", "cancelled", "skipped":
			completed++
			if t.Status == "failed" {
				fail++
			}
		}
	}
	job.CompletedCount = completed
	job.SuccessCount = succ
	job.FailedCount = fail
}

func (m *BatchQueueManager) ListJobs() []BatchQueueJob {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]BatchQueueJob, 0, len(m.jobs))
	for _, j := range m.jobs {
		out = append(out, cloneBatchJob(j))
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAtMs > out[j].CreatedAtMs })
	return out
}

func (m *BatchQueueManager) GetJob(jobID string) (BatchQueueJob, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	j, ok := m.jobs[jobID]
	if !ok {
		return BatchQueueJob{}, false
	}
	return cloneBatchJob(j), true
}

func (m *BatchQueueManager) CancelJob(jobID string) (BatchQueueJob, error) {
	m.mu.Lock()
	j, ok := m.jobs[jobID]
	if !ok {
		m.mu.Unlock()
		return BatchQueueJob{}, errors.New("batch job not found")
	}
	cancel, hasCancel := m.cancels[jobID]
	m.mu.Unlock()

	if hasCancel && cancel != nil {
		cancel()
	}
	time.Sleep(20 * time.Millisecond)

	m.mu.Lock()
	defer m.mu.Unlock()
	for _, t := range j.Targets {
		if t.Status == "pending" {
			t.Status = "cancelled"
			t.Message = "Cancelled"
			t.UpdatedAtMs = time.Now().UTC().UnixMilli()
		}
	}
	j.Status = "cancelled"
	m.recomputeCountersLocked(j)
	return cloneBatchJob(j), nil
}

func (m *BatchQueueManager) RetryFailedJob(jobID string) (BatchQueueJob, error) {
	m.mu.Lock()
	j, ok := m.jobs[jobID]
	if !ok {
		m.mu.Unlock()
		return BatchQueueJob{}, errors.New("batch job not found")
	}
	if j.Status == "running" {
		m.mu.Unlock()
		return BatchQueueJob{}, errors.New("job is still running")
	}
	var retryTargets []*BatchQueueTarget
	nowMs := time.Now().UTC().UnixMilli()
	for _, t := range j.Targets {
		if t.Status == "failed" || t.Status == "cancelled" {
			t.Status = "pending"
			t.Message = "Queued for retry"
			t.UpdatedAtMs = nowMs
			retryTargets = append(retryTargets, t)
		}
	}
	if len(retryTargets) == 0 {
		m.mu.Unlock()
		return cloneBatchJob(j), errors.New("no failed targets to retry")
	}
	j.Status = "queued"
	j.FinishedAtMs = 0
	m.recomputeCountersLocked(j)
	ctx, cancel := context.WithCancel(context.Background())
	m.cancels[jobID] = cancel
	cp := cloneBatchJob(j)
	m.mu.Unlock()

	go m.executeJob(ctx, jobID, retryTargets)
	return cp, nil
}
