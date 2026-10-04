import { ScanResult, LicenseInfo } from '../types';

export const generateProfessionalAuditReport = (
  subnet: string,
  start: number,
  end: number,
  results: Record<string, ScanResult>,
  license: LicenseInfo
): void => {
  const activeDevices = Object.values(results).filter((r) => r.status === 'active');
  const now = new Date();

  // Vendor distribution statistics
  const vendorCounts: Record<string, number> = {};
  let totalOpenPortsCount = 0;
  const highRiskDevices: { ip: string; port: number; name: string }[] = [];

  activeDevices.forEach((d) => {
    const v = d.device?.vendor || 'Unknown Vendor';
    vendorCounts[v] = (vendorCounts[v] || 0) + 1;
    if (d.device?.openPorts) {
      totalOpenPortsCount += d.device.openPorts.length;
      d.device.openPorts.forEach((p) => {
        if ([21, 23, 445, 3389, 5900, 6379].includes(p)) {
          highRiskDevices.push({
            ip: d.ip,
            port: p,
            name: p === 445 ? 'SMB (Ransomware Target)' : p === 3389 ? 'RDP Remote Desktop' : p === 23 ? 'Telnet (Plaintext)' : p === 21 ? 'FTP' : 'VNC/Redis',
          });
        }
      });
    }
  });

  const sortedVendors = Object.entries(vendorCounts).sort((a, b) => b[1] - a[1]);

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>Grid IP Scanner2 - 네트워크 보안 진단 감사 보고서 (${subnet}.0/24)</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #1e293b; background: #fff; line-height: 1.5; padding: 20px; }
    .header-bar { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 25px; }
    .header-title h1 { margin: 0; font-size: 22px; color: #0f172a; letter-spacing: -0.5px; }
    .header-title p { margin: 4px 0 0; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
    .badge-pro { background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 25px; }
    .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; }
    .stat-val { font-size: 24px; font-weight: 900; color: #0f172a; margin-top: 4px; font-family: monospace; }
    .stat-lbl { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .section-title { font-size: 14px; font-weight: 800; color: #0f172a; border-left: 4px solid #0284c7; padding-left: 8px; margin: 25px 0 12px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
    th { background: #f1f5f9; color: #475569; font-weight: 800; text-align: left; padding: 8px 10px; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; }
    td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
    tr:nth-child(even) { background: #f8fafc; }
    .mono { font-family: monospace; font-weight: 700; }
    .risk-high { background: #ffe4e6; color: #e11d48; font-weight: 800; padding: 2px 6px; border-radius: 4px; font-size: 9px; }
    .risk-safe { background: #dcfce7; color: #15803d; font-weight: 700; padding: 2px 6px; border-radius: 4px; font-size: 9px; }
    .footer { margin-top: 35px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center; }
    .print-btn { background: #0284c7; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; margin-bottom: 15px; }
    @media print { .print-btn { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ 보고서 즉시 인쇄 / PDF 저장 (Ctrl + P)</button>
  
  <div class="header-bar">
    <div class="header-title">
      <h1>Grid IP Scanner2 - 로컬 네트워크 정밀 감사 보고서</h1>
      <p>Network Infrastructure & Security Topology Audit Report</p>
    </div>
    <div style="text-align: right;">
      <span class="badge badge-pro">${license.tier.toUpperCase()} EDITION</span>
      <div style="font-size: 10px; color: #64748b; margin-top: 4px;">발행: ${now.toLocaleString()}</div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-lbl">스캔 서브넷</div>
      <div class="stat-val" style="font-size: 18px; color: #0284c7;">${subnet}.0/24</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">활성 노드 탐지</div>
      <div class="stat-val" style="color: #10b981;">${activeDevices.length} <span style="font-size: 12px; color: #94a3b8;">/ ${end - start + 1}</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">식별된 제조사 수</div>
      <div class="stat-val">${sortedVendors.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">주의 포트 개방 노드</div>
      <div class="stat-val" style="color: ${highRiskDevices.length > 0 ? '#e11d48' : '#10b981'};">${highRiskDevices.length}</div>
    </div>
  </div>

  ${
    highRiskDevices.length > 0
      ? `<div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
           <div style="font-weight: 800; font-size: 12px; color: #be123c; margin-bottom: 6px;">⚠️ 보안 주의 포트 개방 알림 (High-Risk Open Ports)</div>
           <div style="font-size: 11px; color: #9f1239;">
             ${highRiskDevices.map((h) => `• <b>${h.ip}</b> (포트 ${h.port} - ${h.name})`).join('<br>')}
           </div>
         </div>`
      : ''
  }

  <div class="section-title">1. 하드웨어 제조사 점유율 (Vendor Breakdown)</div>
  <table style="max-width: 650px;">
    <thead>
      <tr>
        <th>제조사 (Hardware Vendor)</th>
        <th style="width: 100px; text-align: right;">단말기 대수</th>
        <th style="width: 100px; text-align: right;">점유율 (%)</th>
      </tr>
    </thead>
    <tbody>
      ${sortedVendors
        .map(
          ([vendor, cnt]) => `<tr>
            <td style="font-weight: 600;">${vendor}</td>
            <td style="text-align: right;" class="mono">${cnt}대</td>
            <td style="text-align: right;" class="mono">${((cnt / activeDevices.length) * 100).toFixed(1)}%</td>
          </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <div class="section-title">2. 활성 장비 인벤토리 상세 (Active Node Inventory)</div>
  <table>
    <thead>
      <tr>
        <th style="width: 110px;">IP 주소</th>
        <th style="width: 140px;">MAC 주소</th>
        <th>제조사 / 호스트명</th>
        <th style="width: 80px;">응답속도</th>
        <th>개방 포트</th>
      </tr>
    </thead>
    <tbody>
      ${activeDevices
        .map((d) => {
          const dev = d.device;
          return `<tr>
            <td class="mono" style="color: #0284c7;">${d.ip}</td>
            <td class="mono" style="color: #10b981;">${dev?.mac || 'N/A'}</td>
            <td>
              <div style="font-weight: 700;">${dev?.vendor || 'Unknown'}</div>
              <div style="font-size: 10px; color: #64748b;">${dev?.hostname || '-'} ${dev?.webTitle ? `("${dev.webTitle}")` : ''}</div>
            </td>
            <td class="mono">${dev?.latency || 0} ms</td>
            <td>
              ${
                dev?.openPorts && dev.openPorts.length > 0
                  ? dev.openPorts
                      .map((p) =>
                        [21, 23, 445, 3389].includes(p)
                          ? `<span class="risk-high">${p}</span>`
                          : `<span class="risk-safe">${p}</span>`
                      )
                      .join(' ')
                  : '<span style="color: #94a3b8;">-</span>'
              }
            </td>
          </tr>`;
        })
        .join('')}
    </tbody>
  </table>

  <div class="footer">
    <div><b>Grid IP Scanner2</b> | 공식 배포: (주)씨아이에스넷 (www.cisnet.co.kr)</div>
    <div>Licensee: ${license.licensedTo || 'Pro Customer'} | Document Security: Confidential</div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    // If popup blocked, trigger file download fallback
    const link = document.createElement('a');
    link.href = url;
    link.download = `GridIPScanner_Audit_Report_${subnet}_${now.toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
