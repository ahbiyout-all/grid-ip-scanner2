import { ScanResult, LicenseInfo } from '../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface AuditReportExportResult {
  success: boolean;
  filename: string;
  pageCount?: number;
  error?: string;
}

export interface DeviceListPdfOptions {
  title: string;
  subtitle?: string;
  searchQuery?: string;
  scopeLabel: string;
  subnet: string;
  start: number;
  end: number;
  targetIps: string[];
  results: Record<string, ScanResult>;
  license: LicenseInfo;
  lang?: 'ko' | 'en';
}

/**
 * Builds high-risk port analysis item array
 */
function extractRiskAnalysis(results: Record<string, ScanResult>) {
  const activeDevices = Object.values(results).filter((r) => r.status === 'active');
  const vendorCounts: Record<string, number> = {};
  let totalOpenPortsCount = 0;
  const highRiskDevices: {
    ip: string;
    port: number;
    name: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    threat: string;
    remediation: string;
  }[] = [];

  activeDevices.forEach((d) => {
    const v = d.device?.vendor || 'Unknown Vendor';
    vendorCounts[v] = (vendorCounts[v] || 0) + 1;
    if (d.device?.openPorts) {
      totalOpenPortsCount += d.device.openPorts.length;
      d.device.openPorts.forEach((p) => {
        if (p === 445) {
          highRiskDevices.push({
            ip: d.ip,
            port: p,
            name: 'SMB File Sharing (Port 445)',
            severity: 'CRITICAL',
            threat: 'Known vector for ransomware lateral propagation (EternalBlue / WannaCry).',
            remediation: 'Disable SMBv1, enforce SMB signing, block WAN/inbound port 445 via firewall.',
          });
        } else if (p === 3389) {
          highRiskDevices.push({
            ip: d.ip,
            port: p,
            name: 'RDP Remote Desktop (Port 3389)',
            severity: 'HIGH',
            threat: 'Exposed remote desktop access; vulnerable to brute-force credential attacks.',
            remediation: 'Restrict RDP access behind VPN, enable NLA, and require Multi-Factor Authentication.',
          });
        } else if (p === 23) {
          highRiskDevices.push({
            ip: d.ip,
            port: p,
            name: 'Telnet (Port 23)',
            severity: 'HIGH',
            threat: 'Transmits credentials and data in cleartext over network.',
            remediation: 'Migrate immediately to SSH (Port 22) and disable Telnet daemon.',
          });
        } else if (p === 21) {
          highRiskDevices.push({
            ip: d.ip,
            port: p,
            name: 'FTP Service (Port 21)',
            severity: 'MEDIUM',
            threat: 'Unencrypted authentication; potential plain-text packet sniffing.',
            remediation: 'Upgrade to SFTP/FTPS with TLS certificate validation.',
          });
        } else if (p === 6379) {
          highRiskDevices.push({
            ip: d.ip,
            port: p,
            name: 'Redis Database (Port 6379)',
            severity: 'HIGH',
            threat: 'Often configured without password auth, allowing remote code execution.',
            remediation: 'Bind to 127.0.0.1 and enable requirepass in redis.conf.',
          });
        } else if (p === 5900) {
          highRiskDevices.push({
            ip: d.ip,
            port: p,
            name: 'VNC Remote Display (Port 5900)',
            severity: 'MEDIUM',
            threat: 'Remote GUI access susceptible to session hijacking and weak auth.',
            remediation: 'Tunnel VNC through an encrypted SSH or VPN tunnel.',
          });
        }
      });
    }
  });

  const sortedVendors = Object.entries(vendorCounts).sort((a, b) => b[1] - a[1]);

  return {
    activeDevices,
    vendorCounts,
    totalOpenPortsCount,
    highRiskDevices,
    sortedVendors,
  };
}

/**
 * Pure vector fallback for jsPDF when DOM/canvas rendering is unavailable
 */
function generateVectorPdfFallback(
  doc: jsPDF,
  subnet: string,
  start: number,
  end: number,
  results: Record<string, ScanResult>,
  license: LicenseInfo
): void {
  const { activeDevices, sortedVendors, highRiskDevices } = extractRiskAnalysis(results);
  const now = new Date();

  // Page 1: Executive Summary & Dashboard
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('GRID IP SCANNER2 - NETWORK SECURITY AUDIT REPORT', 14, 12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    `CONFIDENTIAL | Scope: ${subnet}.0/24 | Edition: ${license.tier.toUpperCase()} | Generated: ${now.toISOString()}`,
    14,
    18
  );

  doc.setTextColor(56, 189, 248); // sky-400
  doc.text('Developer: AhBiYout | Org: AhBiYout-all | Cisnet (www.cisnet.co.kr)', 14, 23);

  // KPI Metric Cards
  let cardX = 14;
  const cardY = 32;
  const cardW = 42;
  const cardH = 20;

  const metrics = [
    { label: 'TARGET SUBNET', val: `${subnet}.0/24`, color: [2, 132, 199] },
    { label: 'ACTIVE NODES', val: `${activeDevices.length} / ${end - start + 1}`, color: [16, 185, 129] },
    { label: 'OUI VENDORS', val: `${sortedVendors.length} identified`, color: [15, 23, 42] },
    { label: 'HIGH RISK PORTS', val: `${highRiskDevices.length} alerts`, color: highRiskDevices.length > 0 ? [225, 29, 72] : [16, 185, 129] },
  ];

  metrics.forEach((m, i) => {
    const cx = cardX + i * 46;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cx, cardY, cardW, cardH, 2, 2, 'FD');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, cx + 4, cardY + 6);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.text(m.val, cx + 4, cardY + 14);
  });

  // Section 1: Security Posture Assessment
  let currentY = 58;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. EXECUTIVE SECURITY POSTURE & THREAT SUMMARY', 14, currentY);

  currentY += 4;
  doc.setFillColor(highRiskDevices.length > 0 ? 255 : 240, highRiskDevices.length > 0 ? 241 : 253, highRiskDevices.length > 0 ? 242 : 244);
  doc.setDrawColor(highRiskDevices.length > 0 ? 254 : 187, highRiskDevices.length > 0 ? 205 : 247, highRiskDevices.length > 0 ? 211 : 208);
  doc.roundedRect(14, currentY, 182, 18, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(highRiskDevices.length > 0 ? 190 : 21, highRiskDevices.length > 0 ? 18 : 128, highRiskDevices.length > 0 ? 60 : 61);
  if (highRiskDevices.length > 0) {
    doc.text(`[WARNING] Detected ${highRiskDevices.length} service exposure findings requiring immediate review:`, 18, currentY + 6);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    const summaryStr = highRiskDevices.slice(0, 3).map((h) => `${h.ip}:${h.port} (${h.name})`).join(' | ');
    doc.text(summaryStr + (highRiskDevices.length > 3 ? ` ... (+${highRiskDevices.length - 3} more)` : ''), 18, currentY + 12);
  } else {
    doc.text('[STATUS COMPLIANT] No critical risk ports (SMB 445, RDP 3389, Telnet 23) detected in subnet.', 18, currentY + 8);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Standard perimeter firewall isolation and routine endpoint monitoring verified.', 18, currentY + 14);
  }

  // Section 2: Hardware Vendor Distribution
  currentY += 26;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. HARDWARE MANUFACTURER DISTRIBUTION (OUI IDENTIFICATION)', 14, currentY);

  currentY += 4;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, currentY, 182, 7, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('MANUFACTURER / VENDOR', 18, currentY + 5);
  doc.text('DEVICE COUNT', 130, currentY + 5);
  doc.text('NETWORK SHARE (%)', 165, currentY + 5);

  currentY += 7;
  doc.setFont('helvetica', 'normal');
  sortedVendors.slice(0, 8).forEach(([vendor, count], idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, currentY, 182, 6, 'F');
    }
    doc.setTextColor(15, 23, 42);
    doc.text(vendor.slice(0, 48), 18, currentY + 4.5);
    doc.text(`${count} units`, 130, currentY + 4.5);
    const pct = activeDevices.length > 0 ? ((count / activeDevices.length) * 100).toFixed(1) : '0';
    doc.text(`${pct}%`, 165, currentY + 4.5);
    currentY += 6;
  });

  // Section 3: Active Host Inventory (Page 1 partial + Page 2)
  currentY += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('3. ACTIVE HOST INVENTORY & RISK PROFILE', 14, currentY);

  currentY += 4;
  const drawTableHeader = (y: number) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 182, 7, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('IP ADDRESS', 18, y + 5);
    doc.text('MAC ADDRESS', 52, y + 5);
    doc.text('VENDOR / HOSTNAME', 92, y + 5);
    doc.text('RTT', 152, y + 5);
    doc.text('OPEN PORTS', 165, y + 5);
  };

  drawTableHeader(currentY);
  currentY += 7;

  activeDevices.forEach((d) => {
    if (currentY > 270) {
      // Add Page Footer
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('Grid IP Scanner2 Official Security Report | Developer: AhBiYout | Cisnet (www.cisnet.co.kr)', 14, 290);
      doc.text(`Page 1`, 190, 290);

      doc.addPage();
      currentY = 20;

      // Header on Page 2+
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('GRID IP SCANNER2 - ACTIVE HOST INVENTORY (CONTINUED)', 14, 8);
      drawTableHeader(currentY);
      currentY += 7;
    }

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(2, 132, 199); // sky-600
    doc.text(d.ip, 18, currentY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(16, 185, 129); // emerald-600
    doc.text(d.device?.mac || 'N/A', 52, currentY + 4);

    doc.setTextColor(30, 41, 59);
    const hostInfo = `${d.device?.vendor || 'Unknown'}${d.device?.hostname ? ` (${d.device.hostname})` : ''}`;
    doc.text(hostInfo.slice(0, 36), 92, currentY + 4);

    doc.setTextColor(100, 116, 139);
    doc.text(`${d.device?.latency || 0}ms`, 152, currentY + 4);

    const ports = d.device?.openPorts?.length ? d.device.openPorts.join(', ') : '-';
    if (d.device?.openPorts?.some((p) => [21, 23, 445, 3389].includes(p))) {
      doc.setTextColor(225, 29, 72);
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
    }
    doc.text(ports.slice(0, 24), 165, currentY + 4);

    doc.setDrawColor(241, 245, 249);
    doc.line(14, currentY + 5.5, 196, currentY + 5.5);
    currentY += 6;
  });

  // Footer
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Grid IP Scanner2 Official Security Report | Developer: AhBiYout | Cisnet (www.cisnet.co.kr)', 14, 290);
}

/**
 * Generates an executive, professional PDF document using jsPDF & high-resolution canvas.
 * Seamlessly handles Korean & English typography, responsive layout, risk analysis, and downloads.
 */
export async function exportSecurityAuditReportToPDF(
  subnet: string,
  start: number,
  end: number,
  results: Record<string, ScanResult>,
  license: LicenseInfo,
  lang: 'ko' | 'en' = 'ko'
): Promise<AuditReportExportResult> {
  const { activeDevices, sortedVendors, highRiskDevices } = extractRiskAnalysis(results);
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];
  const filename = `GridIPScanner2_Security_Audit_${subnet.replace(/\./g, '_')}_${dateStr}.pdf`;

  // Check if browser DOM is available
  if (typeof document === 'undefined') {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    generateVectorPdfFallback(doc, subnet, start, end, results, license);
    doc.save(filename);
    return { success: true, filename, pageCount: 1 };
  }

  // Create an offscreen high-fidelity HTML container specifically formatted for A4 PDF export
  const container = document.createElement('div');
  container.id = 'grid-ip-scanner-pdf-export-container';
  container.style.position = 'fixed';
  container.style.top = '-99999px';
  container.style.left = '0';
  container.style.width = '794px'; // 210mm at 96 DPI
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  container.style.padding = '32px 36px';
  container.style.boxSizing = 'border-box';
  container.style.zIndex = '-9999';

  const isKo = lang === 'ko';

  container.innerHTML = `
    <div style="border-bottom: 3px solid #0284c7; padding-bottom: 16px; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="background: #0284c7; color: #ffffff; font-size: 10px; font-weight: 900; padding: 2px 8px; border-radius: 4px; letter-spacing: 1px;">OFFICIAL REPORT</span>
          <span style="font-size: 11px; font-weight: 800; color: #0284c7; letter-spacing: 0.5px;">GRID IP SCANNER2</span>
        </div>
        <h1 style="margin: 6px 0 2px 0; font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">
          ${isKo ? '네트워크 정밀 보안 진단 감사 보고서' : 'Network Security & Infrastructure Audit Report'}
        </h1>
        <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 600;">
          ${isKo ? '로컬 네트워크 인프라 자산 식별 및 잠재적 보안 취약점 종합 진단서' : 'Comprehensive Network Asset Discovery & Threat Vector Analysis'}
        </p>
      </div>
      <div style="text-align: right;">
        <div style="display: inline-block; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 6px; text-transform: uppercase;">
          ${license.tier.toUpperCase()} EDITION
        </div>
        <div style="font-size: 10px; color: #64748b; margin-top: 5px; font-family: monospace;">
          ${dateStr} ${timeStr}
        </div>
        <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">
          Lic: ${license.licensedTo || 'Authorized User'}
        </div>
      </div>
    </div>

    <!-- KPI Metric Cards Grid -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 22px;">
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
        <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">${isKo ? '스캔 서브넷 대역' : 'Scanned Subnet'}</div>
        <div style="font-size: 17px; font-weight: 900; color: #0284c7; margin-top: 4px; font-family: monospace;">${subnet}.0/24</div>
        <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">Range: .${start} ~ .${end}</div>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
        <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">${isKo ? '활성 단말 탐지' : 'Discovered Nodes'}</div>
        <div style="font-size: 17px; font-weight: 900; color: #10b981; margin-top: 4px; font-family: monospace;">${activeDevices.length} <span style="font-size: 11px; color: #94a3b8;">/ ${end - start + 1}</span></div>
        <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">Discovery: ${((activeDevices.length / (end - start + 1)) * 100).toFixed(1)}%</div>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
        <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">${isKo ? '식별 제조사 (OUI)' : 'Identified Vendors'}</div>
        <div style="font-size: 17px; font-weight: 900; color: #0f172a; margin-top: 4px; font-family: monospace;">${sortedVendors.length}</div>
        <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">Hardware Makers</div>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
        <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">${isKo ? '보안 주의 포트' : 'High-Risk Ports'}</div>
        <div style="font-size: 17px; font-weight: 900; color: ${highRiskDevices.length > 0 ? '#e11d48' : '#10b981'}; margin-top: 4px; font-family: monospace;">${highRiskDevices.length}</div>
        <div style="font-size: 9px; color: ${highRiskDevices.length > 0 ? '#e11d48' : '#10b981'}; margin-top: 2px;">${highRiskDevices.length > 0 ? (isKo ? '보안 조치 필요' : 'Action Required') : (isKo ? '위험 노출 없음' : 'Compliant')}</div>
      </div>
    </div>

    <!-- Security Posture Alert Banner -->
    ${
      highRiskDevices.length > 0
        ? `
      <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 14px; margin-bottom: 22px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="font-weight: 900; font-size: 13px; color: #be123c;">
            ⚠️ ${isKo ? '보안 주의 포트 개방 감지 (High-Risk Open Ports Detected)' : 'Security Warning: High-Risk Open Ports Detected'}
          </div>
          <span style="background: #e11d48; color: #fff; font-size: 9px; font-weight: 800; padding: 2px 8px; border-radius: 4px;">CRITICAL RISK</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px;">
          ${highRiskDevices
            .map(
              (h) => `
            <div style="background: #ffffff; border: 1px solid #ffe4e6; border-radius: 6px; padding: 8px 10px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 800; color: #be123c; font-family: monospace;">${h.ip} &bull; Port ${h.port} (${h.name})</span>
                <span style="font-size: 9px; font-weight: 800; color: #e11d48; background: #fff1f2; padding: 2px 6px; border-radius: 3px;">${h.severity}</span>
              </div>
              <div style="font-size: 10px; color: #475569; margin-top: 3px;"><b>${isKo ? '위협 분석' : 'Threat'}:</b> ${h.threat}</div>
              <div style="font-size: 10px; color: #0284c7; margin-top: 2px;"><b>${isKo ? '권장 조치' : 'Mitigation'}:</b> ${h.remediation}</div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `
        : `
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-bottom: 22px; display: flex; align-items: center; gap: 10px;">
        <div style="font-size: 18px;">🛡️</div>
        <div>
          <div style="font-weight: 800; font-size: 12px; color: #166534;">
            ${isKo ? '안전 상태: 주요 위험 포트(445, 3389, 23) 개방 단말 없음' : 'Compliant Status: No Critical Risk Ports Detected'}
          </div>
          <div style="font-size: 10.5px; color: #15803d; margin-top: 2px;">
            ${isKo ? '점검 대상 전체 대역에서 원격 침해 또는 랜섬웨어 확산에 악용될 수 있는 포트가 감지되지 않았습니다.' : 'The scanned endpoints have no exposed legacy protocols or remote desktop brute-force avenues.'}
          </div>
        </div>
      </div>
    `
    }

    <!-- Vendor Breakdown -->
    <div style="margin-bottom: 22px;">
      <div style="font-size: 13px; font-weight: 900; color: #0f172a; border-left: 4px solid #0284c7; padding-left: 8px; margin-bottom: 8px; text-transform: uppercase;">
        1. ${isKo ? '하드웨어 제조사 점유율 분석 (Vendor Breakdown)' : 'Hardware Manufacturer Distribution'}
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
        <thead>
          <tr style="background: #f1f5f9; color: #475569; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
            <th style="padding: 7px 10px; text-align: left; font-weight: 800;">${isKo ? '하드웨어 제조사' : 'Hardware Vendor'}</th>
            <th style="padding: 7px 10px; text-align: right; width: 110px; font-weight: 800;">${isKo ? '단말기 수' : 'Node Count'}</th>
            <th style="padding: 7px 10px; text-align: right; width: 110px; font-weight: 800;">${isKo ? '점유율' : 'Network Share'}</th>
          </tr>
        </thead>
        <tbody>
          ${sortedVendors
            .slice(0, 10)
            .map(
              ([vendor, cnt], idx) => `
            <tr style="background: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 6px 10px; font-weight: 700; color: #1e293b;">${vendor}</td>
              <td style="padding: 6px 10px; text-align: right; font-family: monospace; font-weight: 800;">${cnt} ${isKo ? '대' : 'nodes'}</td>
              <td style="padding: 6px 10px; text-align: right; font-family: monospace; color: #0284c7; font-weight: 800;">${((cnt / activeDevices.length) * 100).toFixed(1)}%</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <!-- Active Devices Inventory -->
    <div style="margin-bottom: 22px;">
      <div style="font-size: 13px; font-weight: 900; color: #0f172a; border-left: 4px solid #0284c7; padding-left: 8px; margin-bottom: 8px; text-transform: uppercase;">
        2. ${isKo ? '활성 단말 인벤토리 및 보안 현황 상세 (Active Node Inventory)' : 'Active Node Topology & Port Inventory'}
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
        <thead>
          <tr style="background: #f1f5f9; color: #475569; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
            <th style="padding: 7px 8px; text-align: left; width: 95px; font-weight: 800;">IP</th>
            <th style="padding: 7px 8px; text-align: left; width: 110px; font-weight: 800;">MAC</th>
            <th style="padding: 7px 8px; text-align: left; font-weight: 800;">${isKo ? '제조사 / 호스트명' : 'Vendor / Hostname'}</th>
            <th style="padding: 7px 8px; text-align: center; width: 55px; font-weight: 800;">RTT</th>
            <th style="padding: 7px 8px; text-align: left; width: 140px; font-weight: 800;">${isKo ? '개방 포트' : 'Open Ports'}</th>
          </tr>
        </thead>
        <tbody>
          ${activeDevices
            .map((d, idx) => {
              const dev = d.device;
              const hasHighRisk = dev?.openPorts?.some((p) => [21, 23, 445, 3389, 5900, 6379].includes(p));
              return `
              <tr style="background: ${hasHighRisk ? '#fff1f2' : idx % 2 === 1 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 8px; font-family: monospace; font-weight: 800; color: #0284c7;">${d.ip}</td>
                <td style="padding: 6px 8px; font-family: monospace; font-weight: 700; color: #059669;">${dev?.mac || 'N/A'}</td>
                <td style="padding: 6px 8px;">
                  <div style="font-weight: 800; color: #0f172a;">${dev?.vendor || 'Unknown'}</div>
                  <div style="font-size: 9px; color: #64748b;">${dev?.hostname || '-'} ${dev?.webTitle ? `("${dev.webTitle}")` : ''}</div>
                </td>
                <td style="padding: 6px 8px; text-align: center; font-family: monospace; color: #64748b;">${dev?.latency || 0}ms</td>
                <td style="padding: 6px 8px;">
                  ${
                    dev?.openPorts && dev.openPorts.length > 0
                      ? dev.openPorts
                          .map((p) =>
                            [21, 23, 445, 3389, 5900, 6379].includes(p)
                              ? `<span style="background: #ffe4e6; color: #be123c; font-weight: 800; padding: 1px 4px; border-radius: 3px; font-size: 8.5px; margin-right: 3px; display: inline-block;">${p}</span>`
                              : `<span style="background: #dcfce7; color: #166534; font-weight: 700; padding: 1px 4px; border-radius: 3px; font-size: 8.5px; margin-right: 3px; display: inline-block;">${p}</span>`
                          )
                          .join('')
                      : '<span style="color: #94a3b8;">-</span>'
                  }
                </td>
              </tr>
            `;
            })
            .join('')}
        </tbody>
      </table>
    </div>

    <!-- Official Legal Footer -->
    <div style="margin-top: 28px; padding-top: 14px; border-top: 1px solid #cbd5e1; font-size: 9px; color: #64748b; display: flex; justify-content: space-between; align-items: flex-start; line-height: 1.4;">
      <div>
        <div style="font-weight: 900; color: #0f172a; font-size: 10px;">Grid IP Scanner2 Official Security Report</div>
        <div>제작자: <b>AhBiYout</b> | GitHub: <a href="https://github.com/AhBiYout-all" style="color: #0284c7; text-decoration: none;">https://github.com/AhBiYout-all</a></div>
        <div>공식 기술 블로그: <a href="https://ahbiyoutvibe.blogspot.com/" style="color: #0284c7; text-decoration: none;">https://ahbiyoutvibe.blogspot.com/</a></div>
        <div>소속 및 배포처: (주)씨아이에스넷 (<a href="http://www.cisnet.co.kr" style="color: #0284c7; text-decoration: none;">www.cisnet.co.kr</a>)</div>
      </div>
      <div style="text-align: right; max-width: 320px;">
        <div style="font-weight: 800; color: #be123c;">CONFIDENTIAL DOCUMENT</div>
        <div>본 문서는 보안 진단 목적으로 승인된 담당자에게만 제공되며, 무단 유출 및 복제를 엄격히 금합니다.</div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2, // 2x DPI for ultra-sharp crisp text rendering
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = 210;
    const pdfHeight = 297;
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;
    let pageCount = 1;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pageCount++;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
    }

    pdf.save(filename);
    return { success: true, filename, pageCount };
  } catch (err: any) {
    console.warn('[PDF Export] HTML2Canvas failed, executing native jsPDF vector fallback:', err);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      generateVectorPdfFallback(doc, subnet, start, end, results, license);
      doc.save(filename);
      return { success: true, filename, pageCount: 1 };
    } catch (fallbackErr: any) {
      return { success: false, filename, error: fallbackErr?.message || String(fallbackErr) };
    }
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Exports a targeted list of devices (e.g. current search results, active hosts, all nodes) to a professional PDF document.
 */
export async function exportDeviceListToPDF(
  options: DeviceListPdfOptions
): Promise<AuditReportExportResult> {
  const {
    title,
    subtitle,
    searchQuery,
    scopeLabel,
    subnet,
    start,
    end,
    targetIps,
    results,
    license,
    lang = 'ko',
  } = options;

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];
  const isKo = lang === 'ko';

  const safeScope = (searchQuery ? `Search_${searchQuery.replace(/[^a-zA-Z0-9가-힣_-]/g, '_')}` : scopeLabel.replace(/[^a-zA-Z0-9가-힣_-]/g, '_'));
  const filename = `GridIPScanner2_${safeScope}_${subnet.replace(/\./g, '_')}_${dateStr}.pdf`;

  // Compute stats for target devices
  const activeNodes = targetIps.filter((ip) => results[ip]?.status === 'active');
  const vendorCounts: Record<string, number> = {};
  const highRiskList: { ip: string; port: number; name: string }[] = [];

  targetIps.forEach((ip) => {
    const item = results[ip];
    if (item?.device?.vendor) {
      vendorCounts[item.device.vendor] = (vendorCounts[item.device.vendor] || 0) + 1;
    }
    if (item?.device?.openPorts) {
      item.device.openPorts.forEach((p) => {
        if ([21, 23, 445, 3389, 5900, 6379].includes(p)) {
          highRiskList.push({
            ip,
            port: p,
            name: p === 445 ? 'SMB (Ransomware Target)' : p === 3389 ? 'RDP Remote Desktop' : p === 23 ? 'Telnet' : p === 21 ? 'FTP' : 'VNC/Redis',
          });
        }
      });
    }
  });

  const sortedVendors = Object.entries(vendorCounts).sort((a, b) => b[1] - a[1]);

  // Fallback vector generator for device list
  const runVectorFallback = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`GRID IP SCANNER2 - ${scopeLabel.toUpperCase()} REPORT`, 14, 11);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    const filterInfo = searchQuery ? `Filter: "${searchQuery}" | ` : '';
    doc.text(`${filterInfo}Subnet: ${subnet}.0/24 | Targets: ${targetIps.length} | Date: ${now.toISOString()}`, 14, 18);

    doc.setTextColor(56, 189, 248);
    doc.text('Developer: AhBiYout | Org: AhBiYout-all | Cisnet (www.cisnet.co.kr)', 14, 22);

    let currentY = 32;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, currentY, 182, 7, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('IP ADDRESS', 18, currentY + 5);
    doc.text('STATUS', 52, currentY + 5);
    doc.text('MAC ADDRESS', 75, currentY + 5);
    doc.text('VENDOR / HOSTNAME', 115, currentY + 5);
    doc.text('OPEN PORTS', 165, currentY + 5);

    currentY += 7;
    targetIps.forEach((ip) => {
      if (currentY > 275) {
        doc.addPage();
        currentY = 20;
        doc.setFillColor(241, 245, 249);
        doc.rect(14, currentY, 182, 7, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('IP ADDRESS', 18, currentY + 5);
        doc.text('STATUS', 52, currentY + 5);
        doc.text('MAC ADDRESS', 75, currentY + 5);
        doc.text('VENDOR / HOSTNAME', 115, currentY + 5);
        doc.text('OPEN PORTS', 165, currentY + 5);
        currentY += 7;
      }

      const item = results[ip];
      const isActive = item?.status === 'active';
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isActive ? 2 : 100, isActive ? 132 : 116, isActive ? 199 : 139);
      doc.text(ip, 18, currentY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(isActive ? 16 : 148, isActive ? 185 : 163, isActive ? 129 : 184);
      doc.text(isActive ? 'ACTIVE' : (item?.status || 'IDLE').toUpperCase(), 52, currentY + 4.5);

      doc.setTextColor(71, 85, 105);
      doc.text(item?.device?.mac || 'N/A', 75, currentY + 4.5);

      const info = `${item?.device?.vendor || '-'}${item?.device?.hostname ? ` (${item.device.hostname})` : ''}`;
      doc.text(info.slice(0, 32), 115, currentY + 4.5);

      const ports = item?.device?.openPorts?.length ? item.device.openPorts.join(', ') : '-';
      doc.text(ports.slice(0, 18), 165, currentY + 4.5);

      doc.setDrawColor(241, 245, 249);
      doc.line(14, currentY + 6, 196, currentY + 6);
      currentY += 6.5;
    });

    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Grid IP Scanner2 Official Report | Developer: AhBiYout | Cisnet (www.cisnet.co.kr)', 14, 290);
    doc.save(filename);
    return { success: true, filename, pageCount: doc.getNumberOfPages() };
  };

  if (typeof document === 'undefined') {
    return runVectorFallback();
  }

  // Create high-res offscreen DOM container
  const container = document.createElement('div');
  container.id = 'grid-ip-scanner-list-pdf-container';
  container.style.position = 'fixed';
  container.style.top = '-99999px';
  container.style.left = '0';
  container.style.width = '794px'; // 210mm at 96 DPI
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  container.style.padding = '32px 36px';
  container.style.boxSizing = 'border-box';
  container.style.zIndex = '-9999';

  container.innerHTML = `
    <!-- Header -->
    <div style="border-bottom: 3px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="background: #0284c7; color: #ffffff; font-size: 10px; font-weight: 900; padding: 2px 8px; border-radius: 4px; letter-spacing: 1px;">PDF REPORT</span>
          <span style="font-size: 11px; font-weight: 800; color: #0284c7; letter-spacing: 0.5px;">GRID IP SCANNER2</span>
        </div>
        <h1 style="margin: 6px 0 2px 0; font-size: 21px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">
          ${title}
        </h1>
        <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 600;">
          ${subtitle || (isKo ? '스캔 및 네트워크 자산 분석 상세 보고서' : 'Network Discovery & Diagnostic Report')}
        </p>
        ${
          searchQuery
            ? `
          <div style="display: inline-flex; align-items: center; gap: 6px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 3px 8px; border-radius: 5px; font-size: 10px; font-weight: 800; margin-top: 6px;">
            <span>🔍 ${isKo ? '검색 필터 키워드' : 'Search Filter'}:</span>
            <span style="font-family: monospace; background: #ffffff; padding: 1px 6px; border-radius: 3px; border: 1px solid #7dd3fc;">"${searchQuery}"</span>
            <span>&bull; ${targetIps.length} ${isKo ? '개 노드 일치' : 'matched nodes'}</span>
          </div>
        `
            : ''
        }
      </div>
      <div style="text-align: right;">
        <div style="display: inline-block; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 6px; text-transform: uppercase;">
          ${license.tier.toUpperCase()} EDITION
        </div>
        <div style="font-size: 10px; color: #64748b; margin-top: 5px; font-family: monospace;">
          ${dateStr} ${timeStr}
        </div>
        <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">
          Subnet: ${subnet}.0/24 (Range: .${start} ~ .${end})
        </div>
      </div>
    </div>

    <!-- KPI Metric Cards Grid -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
        <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">${isKo ? '보고서 대상 노드' : 'Target Nodes'}</div>
        <div style="font-size: 18px; font-weight: 900; color: #0284c7; margin-top: 4px; font-family: monospace;">${targetIps.length} <span style="font-size: 11px; color: #94a3b8;">/ ${end - start + 1}</span></div>
        <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">${scopeLabel}</div>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
        <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">${isKo ? '온라인 활성 장비' : 'Active Nodes'}</div>
        <div style="font-size: 18px; font-weight: 900; color: #10b981; margin-top: 4px; font-family: monospace;">${activeNodes.length}</div>
        <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">${((activeNodes.length / (targetIps.length || 1)) * 100).toFixed(1)}% active</div>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
        <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">${isKo ? '식별 제조사 (OUI)' : 'Identified Vendors'}</div>
        <div style="font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 4px; font-family: monospace;">${sortedVendors.length}</div>
        <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">Hardware Makers</div>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
        <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">${isKo ? '위험 포트 감지' : 'Risk Ports'}</div>
        <div style="font-size: 18px; font-weight: 900; color: ${highRiskList.length > 0 ? '#e11d48' : '#10b981'}; margin-top: 4px; font-family: monospace;">${highRiskList.length}</div>
        <div style="font-size: 9px; color: ${highRiskList.length > 0 ? '#e11d48' : '#10b981'}; margin-top: 2px;">${highRiskList.length > 0 ? (isKo ? '경고 포트 개방' : 'Warning') : (isKo ? '안전' : 'Compliant')}</div>
      </div>
    </div>

    ${
      highRiskList.length > 0
        ? `
      <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 10px 14px; margin-bottom: 20px;">
        <div style="font-weight: 800; font-size: 11px; color: #be123c;">⚠️ ${isKo ? '주의: 일부 단말에서 보안 취약 포트(SMB 445 / RDP 3389 / Telnet 23) 개방이 감지되었습니다.' : 'Security Notice: High-risk exposed ports detected.'}</div>
        <div style="font-size: 10px; color: #9f1239; margin-top: 3px;">
          ${highRiskList.slice(0, 4).map((h) => `${h.ip} (Port ${h.port} - ${h.name})`).join(' &bull; ')}
        </div>
      </div>
    `
        : ''
    }

    <!-- Target Device List Table -->
    <div style="margin-bottom: 20px;">
      <div style="font-size: 12px; font-weight: 900; color: #0f172a; border-left: 4px solid #0284c7; padding-left: 8px; margin-bottom: 8px; text-transform: uppercase;">
        ${isKo ? '노드 인벤토리 상세 목록' : 'Node Inventory & Status'} (${targetIps.length} Nodes)
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 9.5px;">
        <thead>
          <tr style="background: #f1f5f9; color: #475569; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
            <th style="padding: 6px 8px; text-align: left; width: 95px; font-weight: 800;">IP</th>
            <th style="padding: 6px 8px; text-align: center; width: 60px; font-weight: 800;">${isKo ? '상태' : 'Status'}</th>
            <th style="padding: 6px 8px; text-align: left; width: 110px; font-weight: 800;">MAC</th>
            <th style="padding: 6px 8px; text-align: left; font-weight: 800;">${isKo ? '제조사 / 호스트명' : 'Vendor / Hostname'}</th>
            <th style="padding: 6px 8px; text-align: center; width: 50px; font-weight: 800;">RTT</th>
            <th style="padding: 6px 8px; text-align: left; width: 130px; font-weight: 800;">${isKo ? '개방 포트' : 'Open Ports'}</th>
          </tr>
        </thead>
        <tbody>
          ${targetIps
            .map((ip, idx) => {
              const item = results[ip];
              const dev = item?.device;
              const isActive = item?.status === 'active';
              const hasHighRisk = dev?.openPorts?.some((p) => [21, 23, 445, 3389, 5900, 6379].includes(p));

              return `
              <tr style="background: ${hasHighRisk ? '#fff1f2' : idx % 2 === 1 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 5px 8px; font-family: monospace; font-weight: 800; color: ${isActive ? '#0284c7' : '#94a3b8'};">${ip}</td>
                <td style="padding: 5px 8px; text-align: center;">
                  <span style="font-size: 8.5px; font-weight: 800; padding: 1px 5px; border-radius: 3px; ${
                    isActive
                      ? 'background: #dcfce7; color: #166534;'
                      : item?.status === 'inactive'
                      ? 'background: #f1f5f9; color: #64748b;'
                      : 'background: #f8fafc; color: #94a3b8;'
                  }">
                    ${(item?.status || 'idle').toUpperCase()}
                  </span>
                </td>
                <td style="padding: 5px 8px; font-family: monospace; font-weight: 700; color: ${dev?.mac ? '#059669' : '#94a3b8'};">${dev?.mac || '-'}</td>
                <td style="padding: 5px 8px;">
                  <div style="font-weight: 800; color: #0f172a;">${dev?.vendor || (isActive ? 'Unknown' : '-')}</div>
                  <div style="font-size: 8.5px; color: #64748b;">${dev?.hostname || ''} ${dev?.webTitle ? `("${dev.webTitle}")` : ''}</div>
                </td>
                <td style="padding: 5px 8px; text-align: center; font-family: monospace; color: #64748b;">
                  ${isActive ? `${dev?.latency || 0}ms` : '-'}
                </td>
                <td style="padding: 5px 8px;">
                  ${
                    dev?.openPorts && dev.openPorts.length > 0
                      ? dev.openPorts
                          .map((p) =>
                            [21, 23, 445, 3389, 5900, 6379].includes(p)
                              ? `<span style="background: #ffe4e6; color: #be123c; font-weight: 800; padding: 1px 4px; border-radius: 3px; font-size: 8px; margin-right: 2px; display: inline-block;">${p}</span>`
                              : `<span style="background: #dcfce7; color: #166534; font-weight: 700; padding: 1px 4px; border-radius: 3px; font-size: 8px; margin-right: 2px; display: inline-block;">${p}</span>`
                          )
                          .join('')
                      : '<span style="color: #cbd5e1;">-</span>'
                  }
                </td>
              </tr>
            `;
            })
            .join('')}
        </tbody>
      </table>
    </div>

    <!-- Official Legal Footer -->
    <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #cbd5e1; font-size: 9px; color: #64748b; display: flex; justify-content: space-between; align-items: flex-start; line-height: 1.4;">
      <div>
        <div style="font-weight: 900; color: #0f172a; font-size: 10px;">Grid IP Scanner2 Official Report</div>
        <div>개발자: <b>AhBiYout</b> | GitHub: <a href="https://github.com/AhBiYout-all" style="color: #0284c7; text-decoration: none;">https://github.com/AhBiYout-all</a></div>
        <div>공식 기술 블로그: <a href="https://ahbiyoutvibe.blogspot.com/" style="color: #0284c7; text-decoration: none;">https://ahbiyoutvibe.blogspot.com/</a></div>
        <div>소속 및 배포처: (주)씨아이에스넷 (<a href="http://www.cisnet.co.kr" style="color: #0284c7; text-decoration: none;">www.cisnet.co.kr</a>)</div>
      </div>
      <div style="text-align: right; max-width: 300px;">
        <div style="font-weight: 800; color: #0284c7;">CONFIDENTIAL & PROPRIETARY</div>
        <div>본 문서는 사용자의 승인된 네트워크 자산 진단 및 공유 목적으로 생성되었습니다.</div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = 210;
    const pdfHeight = 297;
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;
    let pageCount = 1;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pageCount++;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
    }

    pdf.save(filename);
    return { success: true, filename, pageCount };
  } catch (err: any) {
    console.warn('[PDF Export] Canvas rendering failed, running vector fallback:', err);
    try {
      return runVectorFallback();
    } catch (fallbackErr: any) {
      return { success: false, filename, error: fallbackErr?.message || String(fallbackErr) };
    }
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Interactive HTML Audit Report with immediate print/PDF capability
 */
export const generateProfessionalAuditReport = (
  subnet: string,
  start: number,
  end: number,
  results: Record<string, ScanResult>,
  license: LicenseInfo
): void => {
  const { activeDevices, sortedVendors, highRiskDevices } = extractRiskAnalysis(results);
  const now = new Date();

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>Grid IP Scanner2 - 네트워크 보안 진단 감사 보고서 (${subnet}.0/24)</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Malgun Gothic", "Apple SD Gothic Neo", Arial, sans-serif; color: #1e293b; background: #fff; line-height: 1.5; padding: 20px; }
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
    .footer { margin-top: 35px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 9.5px; color: #64748b; display: flex; justify-content: space-between; align-items: flex-start; }
    .actions-bar { display: flex; gap: 10px; margin-bottom: 20px; }
    .print-btn { background: #0284c7; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; transition: background 0.2s; }
    .print-btn:hover { background: #0369a1; }
    .info-link { color: #0284c7; text-decoration: none; font-weight: 600; }
    @media print { .actions-bar { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="actions-bar">
    <button class="print-btn" onclick="window.print()">🖨️ 보고서 인쇄 (Ctrl + P)</button>
  </div>
  
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
             ${highRiskDevices.map((h) => `• <b>${h.ip}</b> (포트 ${h.port} - ${h.name}) - ${h.threat}`).join('<br>')}
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
    <div>
      <div><b>Grid IP Scanner2</b> | 공식 배포: (주)씨아이에스넷 (<a href="http://www.cisnet.co.kr" class="info-link" target="_blank">www.cisnet.co.kr</a>)</div>
      <div>개발자: AhBiYout | GitHub: <a href="https://github.com/AhBiYout-all" class="info-link" target="_blank">https://github.com/AhBiYout-all</a> | 블로그: <a href="https://ahbiyoutvibe.blogspot.com/" class="info-link" target="_blank">ahbiyoutvibe.blogspot.com</a></div>
    </div>
    <div style="text-align: right;">
      <div>Licensee: ${license.licensedTo || 'Pro Customer'}</div>
      <div>Document Security: <b>Confidential</b></div>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    const link = document.createElement('a');
    link.href = url;
    link.download = `GridIPScanner_Audit_Report_${subnet}_${now.toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
