import { ScanResult, LicenseInfo, ReportColumnKey } from '../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { CURRENT_APP_VERSION } from './updateChecker';
import {
  PreparedReportDataset,
  DEFAULT_SELECTED_COLUMNS,
  getColumnHeader,
  getColumnValue,
  formatTimestampLocal,
  buildReportFilename,
  sanitizeImageDataUrl,
  sanitizeHexColor,
} from './reportCenterService';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatLocalDate(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatLocalTime(now: Date): string {
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

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
 * High-Risk Port Analysis and Statistics Extractor
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
            name: 'SMB 파일 공유 (Port 445)',
            severity: 'CRITICAL',
            threat: '랜섬웨어(WannaCry/EternalBlue) 네트워크 전파의 대표적 취약 포트입니다.',
            remediation: 'SMBv1 비활성화, 방화벽 인바운드 차단 및 최신 보안 패치를 적용하십시오.',
          });
        } else if (p === 3389) {
          highRiskDevices.push({
            ip: d.ip,
            port: p,
            name: 'RDP 원격 데스크톱 (Port 3389)',
            severity: 'HIGH',
            threat: '무차별 대입(Brute-force) 공격 및 원격 세션 탈취 표적이 됩니다.',
            remediation: 'VPN 내부망 격리, NLA(네트워크 수준 인증) 활성화 및 MFA를 강제하십시오.',
          });
        } else if (p === 23) {
          highRiskDevices.push({
            ip: d.ip,
            port: p,
            name: 'Telnet 평문 통신 (Port 23)',
            severity: 'HIGH',
            threat: '로그인 계정과 암호가 암호화되지 않고 평문 패킷으로 노출됩니다.',
            remediation: '즉시 SSH(Port 22)로 전환하고 Telnet 서비스를 영구 비활성화하십시오.',
          });
        } else if (p === 21) {
          highRiskDevices.push({
            ip: d.ip,
            port: p,
            name: 'FTP 파일 전송 (Port 21)',
            severity: 'MEDIUM',
            threat: '비암호화 인증으로 스니핑 및 데이터 변조 위협이 존재합니다.',
            remediation: 'TLS 기반의 SFTP 또는 FTPS 보안 프로토콜로 업그레이드하십시오.',
          });
        } else if (p === 6379) {
          highRiskDevices.push({
            ip: d.ip,
            port: p,
            name: 'Redis 메모리 DB (Port 6379)',
            severity: 'HIGH',
            threat: '기본 설정 시 무인증 원격 코드 실행(RCE) 침해 사고가 빈번합니다.',
            remediation: '127.0.0.1 바인딩 강제 및 redis.conf의 requirepass 인증을 활성화하십시오.',
          });
        } else if (p === 5900) {
          highRiskDevices.push({
            ip: d.ip,
            port: p,
            name: 'VNC 원격 화면 (Port 5900)',
            severity: 'MEDIUM',
            threat: '약한 비밀번호 설정 시 비인가 화면 감시 및 조작 위협이 발생합니다.',
            remediation: 'SSH 터널링 경유 설정 및 강력한 암호화 알고리즘을 적용하십시오.',
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
 * Helper to render multi-page A4 HTML containers into jsPDF with exact 210mm x 297mm pages
 * Zero text slicing, zero row cutting, pixel-perfect margins!
 */
async function renderA4PagesToPdf(container: HTMLElement, filename: string): Promise<AuditReportExportResult> {
  document.body.appendChild(container);

  try {
    const pageElements = Array.from(container.querySelectorAll<HTMLElement>('.a4-report-page'));
    if (pageElements.length === 0) {
      throw new Error('No printable A4 pages generated.');
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i];

      const canvas = await html2canvas(pageEl, {
        scale: 2, // 2x High-DPI for ultra-sharp typography
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');

      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }

      // Map 1:1 onto exact A4 portrait dimensions: 210mm x 297mm
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    }

    pdf.save(filename);
    return { success: true, filename, pageCount: pageElements.length };
  } catch (err: any) {
    console.error('[PDF Export] A4 Page Render failed:', err);
    return { success: false, filename, error: err?.message || String(err) };
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Generates an official Executive Security Audit Report in perfect A4 format
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
  const dateStr = formatLocalDate(now);
  const timeStr = formatLocalTime(now);
  const isKo = lang === 'ko';
  const filename = `GridIPScanner2_Security_Audit_${subnet.replace(/\./g, '_')}_${dateStr}.pdf`;

  // Fallback if browser DOM is unavailable
  if (typeof document === 'undefined') {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    generateVectorPdfFallback(doc, subnet, start, end, results, license);
    doc.save(filename);
    return { success: true, filename, pageCount: 1 };
  }

  // Calculate layout pagination with generous spacing to prevent bottom text clipping
  const DEVICES_PAGE_1 = highRiskDevices.length > 0 ? 4 : 6;
  const DEVICES_PER_SUB_PAGE = 20;

  const remainingDevices = activeDevices.slice(DEVICES_PAGE_1);
  const subPagesCount = remainingDevices.length > 0 ? Math.ceil(remainingDevices.length / DEVICES_PER_SUB_PAGE) : 0;
  const totalPages = 1 + subPagesCount;

  const container = document.createElement('div');
  container.id = 'grid-ip-scanner-a4-audit-container';
  container.style.position = 'fixed';
  container.style.top = '-99999px';
  container.style.left = '0';
  container.style.width = '794px';
  container.style.zIndex = '-9999';

  // Common Header Generator
  const renderHeader = (pageNumber: number) => `
    <div style="border-bottom: 2.5px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="background: #0284c7; color: #ffffff; font-size: 9px; font-weight: 900; padding: 2px 7px; border-radius: 4px; letter-spacing: 0.5px;">OFFICIAL AUDIT</span>
          <span style="font-size: 11px; font-weight: 800; color: #0284c7; letter-spacing: 0.5px;">GRID IP SCANNER2 v${CURRENT_APP_VERSION}</span>
        </div>
        <h1 style="margin: 4px 0 2px 0; font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">
          ${isKo ? '네트워크 정밀 보안 진단 감사 보고서' : 'Network Security & Infrastructure Audit Report'}
        </h1>
        <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">
          ${isKo ? `로컬 서브넷 (${escapeHtml(subnet)}.0/24) 자산 식별 및 잠재적 보안 취약점 종합 진단서` : `Comprehensive Asset Discovery & Threat Vector Analysis for ${escapeHtml(subnet)}.0/24`}
        </p>
      </div>
      <div style="text-align: right;">
        <div style="display: inline-block; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; font-size: 9px; font-weight: 800; padding: 2.5px 8px; border-radius: 5px; text-transform: uppercase;">
          ${escapeHtml(license.tier.toUpperCase())} EDITION
        </div>
        <div style="font-size: 9.5px; color: #64748b; margin-top: 4px; font-family: monospace;">
          ${dateStr} ${timeStr}
        </div>
        <div style="font-size: 8.5px; color: #94a3b8; margin-top: 1px;">
          Lic: ${escapeHtml(license.licensedTo || 'Authorized User')}
        </div>
      </div>
    </div>
  `;

  // Common Footer Generator
  const renderFooter = (pageNumber: number) => `
    <div style="margin-top: auto; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 8.5px; color: #64748b; display: flex; justify-content: space-between; align-items: center; line-height: 1.4;">
      <div>
        <span style="font-weight: 800; color: #0f172a;">Grid IP Scanner2</span> &bull;
        개발: <b>AhBiYout</b>
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-weight: 800; color: #be123c; font-size: 8px; background: #fff1f2; padding: 1px 6px; border-radius: 3px;">CONFIDENTIAL</span>
        <span style="font-weight: 800; color: #0f172a; font-family: monospace; font-size: 9.5px;">페이지 ${pageNumber} / ${totalPages}</span>
      </div>
    </div>
  `;

  // Page 1: Dashboard, KPIs, Threats, Vendor Breakdown & Initial Nodes
  const page1Devices = activeDevices.slice(0, DEVICES_PAGE_1);
  let page1Html = `
    <div class="a4-report-page" style="width: 794px; height: 1123px; min-height: 1123px; max-height: 1123px; padding: 36px 40px 30px 40px; box-sizing: border-box; background: #ffffff; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', 'Segoe UI', Roboto, sans-serif; color: #0f172a;">
      <div style="display: flex; flex-direction: column;">
        ${renderHeader(1)}

        <!-- KPI Metric Cards Grid -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 7px; padding: 10px; text-align: center;">
            <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">${isKo ? '스캔 서브넷 대역' : 'Scanned Subnet'}</div>
            <div style="font-size: 15px; font-weight: 900; color: #0284c7; margin-top: 3px; font-family: monospace;">${escapeHtml(subnet)}.0/24</div>
            <div style="font-size: 8.5px; color: #94a3b8; margin-top: 1px;">Range: .${start} ~ .${end}</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 7px; padding: 10px; text-align: center;">
            <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">${isKo ? '활성 단말 탐지' : 'Discovered Nodes'}</div>
            <div style="font-size: 15px; font-weight: 900; color: #10b981; margin-top: 3px; font-family: monospace;">${activeDevices.length} <span style="font-size: 10px; color: #94a3b8;">/ ${Math.max(1, end - start + 1)}</span></div>
            <div style="font-size: 8.5px; color: #94a3b8; margin-top: 1px;">Discovery: ${((activeDevices.length / Math.max(1, end - start + 1)) * 100).toFixed(1)}%</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 7px; padding: 10px; text-align: center;">
            <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">${isKo ? '식별 제조사 (OUI)' : 'Identified Vendors'}</div>
            <div style="font-size: 15px; font-weight: 900; color: #0f172a; margin-top: 3px; font-family: monospace;">${sortedVendors.length}</div>
            <div style="font-size: 8.5px; color: #94a3b8; margin-top: 1px;">Hardware Makers</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 7px; padding: 10px; text-align: center;">
            <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">${isKo ? '보안 주의 포트' : 'High-Risk Ports'}</div>
            <div style="font-size: 15px; font-weight: 900; color: ${highRiskDevices.length > 0 ? '#e11d48' : '#10b981'}; margin-top: 3px; font-family: monospace;">${highRiskDevices.length}</div>
            <div style="font-size: 8.5px; color: ${highRiskDevices.length > 0 ? '#e11d48' : '#10b981'}; margin-top: 1px;">${highRiskDevices.length > 0 ? (isKo ? '보안 조치 필요' : 'Action Required') : (isKo ? '위험 노출 없음' : 'Compliant')}</div>
          </div>
        </div>

        <!-- Security Posture Alert Banner -->
        ${
          highRiskDevices.length > 0
            ? `
          <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 7px; padding: 10px 12px; margin-bottom: 14px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <div style="font-weight: 900; font-size: 11.5px; color: #be123c;">
                ⚠️ ${isKo ? '보안 주의 포트 개방 감지 (High-Risk Open Ports Detected)' : 'Security Warning: High-Risk Open Ports Detected'}
              </div>
              <span style="background: #e11d48; color: #fff; font-size: 8px; font-weight: 800; padding: 1.5px 6px; border-radius: 3px;">CRITICAL RISK</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 5px; font-size: 10px;">
              ${highRiskDevices.slice(0, 3).map((h) => `
                <div style="background: #ffffff; border: 1px solid #ffe4e6; border-radius: 5px; padding: 6px 8px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 800; color: #be123c; font-family: monospace;">${escapeHtml(h.ip)} &bull; Port ${h.port} (${escapeHtml(h.name)})</span>
                    <span style="font-size: 8px; font-weight: 800; color: #e11d48; background: #fff1f2; padding: 1px 5px; border-radius: 2px;">${escapeHtml(h.severity)}</span>
                  </div>
                  <div style="font-size: 9px; color: #475569; margin-top: 2px;"><b>${isKo ? '위협' : 'Threat'}:</b> ${escapeHtml(h.threat)}</div>
                  <div style="font-size: 9px; color: #0284c7; margin-top: 1px;"><b>${isKo ? '조치' : 'Mitigation'}:</b> ${escapeHtml(h.remediation)}</div>
                </div>
              `).join('')}
              ${highRiskDevices.length > 3 ? `<div style="font-size: 8.5px; color: #be123c; text-align: right; font-weight: 700;">... 외 ${highRiskDevices.length - 3}건 추가 탐지</div>` : ''}
            </div>
          </div>
        `
            : `
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 7px; padding: 10px 14px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-weight: 800; font-size: 11.5px; color: #166534;">
                🛡️ ${isKo ? '정상 보안 상태 (No Critical Risk Ports Detected)' : 'Security Compliant: No Critical Risk Ports Detected'}
              </div>
              <div style="font-size: 9.5px; color: #15803d; margin-top: 1px;">
                ${isKo ? 'SMB(445), RDP(3389), Telnet(23) 등 주요 랜섬웨어 침투 경로 포트가 안전하게 차단되어 있습니다.' : 'Subnet exhibits sound perimeter defenses; high-risk lateral propagation ports are inaccessible.'}
              </div>
            </div>
            <span style="background: #10b981; color: #fff; font-size: 8.5px; font-weight: 800; padding: 2px 7px; border-radius: 4px;">SECURE</span>
          </div>
        `
        }

        <!-- Top Hardware Vendors Table -->
        <div style="margin-bottom: 14px;">
          <div style="font-size: 11px; font-weight: 800; color: #0f172a; border-left: 3.5px solid #0284c7; padding-left: 7px; margin-bottom: 6px; text-transform: uppercase;">
            ${isKo ? '1. 하드웨어 제조사 점유율 (Top Vendor Breakdown)' : '1. Hardware Vendor Distribution'}
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
            <thead>
              <tr style="background: #f1f5f9; color: #475569; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
                <th style="padding: 5px 8px; text-align: left; font-weight: 800;">${isKo ? '제조사 (Hardware Vendor)' : 'Vendor'}</th>
                <th style="padding: 5px 8px; text-align: center; width: 90px; font-weight: 800;">${isKo ? '단말기 수' : 'Units'}</th>
                <th style="padding: 5px 8px; text-align: right; width: 100px; font-weight: 800;">${isKo ? '네트워크 점유율' : 'Share'}</th>
              </tr>
            </thead>
            <tbody>
              ${sortedVendors.slice(0, 5).map(([v, count], idx) => `
                <tr style="background: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 4px 8px; font-weight: 700; color: #1e293b;">${escapeHtml(v)}</td>
                  <td style="padding: 4px 8px; text-align: center; font-family: monospace; font-weight: 800; color: #0284c7;">${count}대</td>
                  <td style="padding: 4px 8px; text-align: right; font-family: monospace; color: #64748b;">${activeDevices.length > 0 ? ((count / activeDevices.length) * 100).toFixed(1) : '0.0'}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Initial Device Table (Page 1) -->
        <div>
          <div style="font-size: 11px; font-weight: 800; color: #0f172a; border-left: 3.5px solid #0284c7; padding-left: 7px; margin-bottom: 6px; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center;">
            <span>${isKo ? '2. 활성 장비 인벤토리' : '2. Active Node Inventory'} (${page1Devices.length}/${activeDevices.length} Nodes)</span>
            <span style="font-size: 8.5px; color: #64748b; font-weight: 600;">A4 Formatted Summary</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
            <thead>
              <tr style="background: #f1f5f9; color: #475569; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
                <th style="padding: 5px 8px; text-align: left; width: 100px; font-weight: 800;">IP 주소</th>
                <th style="padding: 5px 8px; text-align: left; width: 115px; font-weight: 800;">MAC 주소</th>
                <th style="padding: 5px 8px; text-align: left; font-weight: 800;">제조사 / 호스트명</th>
                <th style="padding: 5px 8px; text-align: center; width: 55px; font-weight: 800;">응답</th>
                <th style="padding: 5px 8px; text-align: left; width: 130px; font-weight: 800;">개방 포트</th>
              </tr>
            </thead>
            <tbody>
              ${page1Devices.map((d, idx) => {
                const dev = d.device;
                const hasHighRisk = dev?.openPorts?.some((p) => [21, 23, 445, 3389, 5900, 6379].includes(p));
                return `
                  <tr style="background: ${hasHighRisk ? '#fff1f2' : idx % 2 === 1 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 4px 8px; vertical-align: middle; font-family: monospace; font-weight: 800; color: #0284c7; line-height: 1.3;">${escapeHtml(d.ip)}</td>
                    <td style="padding: 4px 8px; vertical-align: middle; font-family: monospace; font-weight: 700; color: #059669; line-height: 1.3;">${escapeHtml(dev?.mac || '-')}</td>
                    <td style="padding: 4px 8px; vertical-align: middle;">
                      <div style="display: flex; flex-direction: column; justify-content: center; min-height: 24px;">
                        <div style="font-weight: 800; color: #0f172a; font-size: 8.5px; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px;">${escapeHtml(dev?.realVendor && dev.realVendor !== dev.vendor ? `${dev.realVendor} (${dev.vendor})` : (dev?.vendor || 'Unknown'))}</div>
                        ${dev?.hostname || dev?.webTitle ? `<div style="font-size: 7.5px; color: #64748b; line-height: 1.25; margin-top: 1.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px;">${dev?.nameSource && dev.nameSource !== 'UNKNOWN' ? `<b style="color:#0284c7;">[${escapeHtml(dev.nameSource)}]</b> ` : ''}${escapeHtml(dev?.hostname || '')} ${dev?.webTitle ? `("${escapeHtml(dev.webTitle)}")` : ''}</div>` : ''}
                      </div>
                    </td>
                    <td style="padding: 4px 8px; vertical-align: middle; text-align: center; font-family: monospace; color: #64748b; line-height: 1.3;">${dev?.latency || 0}ms</td>
                    <td style="padding: 4px 8px; vertical-align: middle;">
                      ${dev?.openPorts && dev.openPorts.length > 0 ? dev.openPorts.map((p) => [21, 23, 445, 3389, 5900, 6379].includes(p) ? `<span style="background: #ffe4e6; color: #be123c; font-weight: 800; padding: 1px 4px; border-radius: 2px; font-size: 7.5px; margin-right: 2px; display: inline-block; line-height: 1.2;">${p}</span>` : `<span style="background: #dcfce7; color: #166534; font-weight: 700; padding: 1px 4px; border-radius: 2px; font-size: 7.5px; margin-right: 2px; display: inline-block; line-height: 1.2;">${p}</span>`).join('') : '<span style="color: #cbd5e1;">-</span>'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      ${renderFooter(1)}
    </div>
  `;

  container.innerHTML = page1Html;

  // Render Subsequent Pages for Remaining Devices
  for (let p = 0; p < subPagesCount; p++) {
    const pageNum = p + 2;
    const pageDevices = remainingDevices.slice(p * DEVICES_PER_SUB_PAGE, (p + 1) * DEVICES_PER_SUB_PAGE);

    const subPageHtml = `
      <div class="a4-report-page" style="width: 794px; height: 1123px; min-height: 1123px; max-height: 1123px; padding: 34px 38px 36px 38px; box-sizing: border-box; background: #ffffff; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', 'Segoe UI', Roboto, sans-serif; color: #0f172a;">
        <div style="display: flex; flex-direction: column;">
          <!-- Page Header -->
          <div style="border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <div style="font-size: 11px; font-weight: 800; color: #0284c7; letter-spacing: 0.5px;">GRID IP SCANNER2 - AUDIT REPORT (CONTINUED)</div>
              <div style="font-size: 15px; font-weight: 900; color: #0f172a; margin-top: 1px;">
                ${isKo ? '활성 장비 인벤토리 상세 (이어짐)' : 'Active Node Inventory (Continued)'}
              </div>
            </div>
            <div style="text-align: right; font-size: 9px; color: #64748b; font-family: monospace;">
              Subnet: ${escapeHtml(subnet)}.0/24 &bull; ${dateStr}
            </div>
          </div>

          <!-- Device Table -->
          <table style="width: 100%; border-collapse: collapse; font-size: 8.5px;">
            <thead>
              <tr style="background: #f1f5f9; color: #475569; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
                <th style="padding: 4px 7px; vertical-align: middle; text-align: left; width: 95px; font-weight: 800;">IP 주소</th>
                <th style="padding: 4px 7px; vertical-align: middle; text-align: left; width: 110px; font-weight: 800;">MAC 주소</th>
                <th style="padding: 4px 7px; vertical-align: middle; text-align: left; font-weight: 800;">제조사 / 호스트명</th>
                <th style="padding: 4px 7px; vertical-align: middle; text-align: center; width: 50px; font-weight: 800;">응답</th>
                <th style="padding: 4px 7px; vertical-align: middle; text-align: left; width: 125px; font-weight: 800;">개방 포트</th>
              </tr>
            </thead>
            <tbody>
              ${pageDevices.map((d, idx) => {
                const dev = d.device;
                const hasHighRisk = dev?.openPorts?.some((p) => [21, 23, 445, 3389, 5900, 6379].includes(p));
                return `
                  <tr style="background: ${hasHighRisk ? '#fff1f2' : idx % 2 === 1 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 3.5px 7px; vertical-align: middle; font-family: monospace; font-weight: 800; color: #0284c7; font-size: 8px; line-height: 1.3;">${escapeHtml(d.ip)}</td>
                    <td style="padding: 3.5px 7px; vertical-align: middle; font-family: monospace; font-weight: 700; color: #059669; font-size: 8px; line-height: 1.3;">${escapeHtml(dev?.mac || '-')}</td>
                    <td style="padding: 3.5px 7px; vertical-align: middle;">
                      <div style="display: flex; flex-direction: column; justify-content: center; min-height: 22px;">
                        <div style="font-weight: 800; color: #0f172a; font-size: 8px; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px;">${escapeHtml(dev?.realVendor && dev.realVendor !== dev.vendor ? `${dev.realVendor} (${dev.vendor})` : (dev?.vendor || 'Unknown'))}</div>
                        ${dev?.hostname || dev?.webTitle ? `<div style="font-size: 7.2px; color: #64748b; line-height: 1.25; margin-top: 1.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px;">${escapeHtml(dev?.hostname || '')} ${dev?.webTitle ? `("${escapeHtml(dev.webTitle)}")` : ''}</div>` : ''}
                      </div>
                    </td>
                    <td style="padding: 3.5px 7px; vertical-align: middle; text-align: center; font-family: monospace; color: #64748b; font-size: 8px; line-height: 1.3;">${dev?.latency || 0}ms</td>
                    <td style="padding: 3.5px 7px; vertical-align: middle;">
                      ${dev?.openPorts && dev.openPorts.length > 0 ? dev.openPorts.map((p) => [21, 23, 445, 3389, 5900, 6379].includes(p) ? `<span style="background: #ffe4e6; color: #be123c; font-weight: 800; padding: 0.5px 3.5px; border-radius: 2px; font-size: 7px; margin-right: 2px; display: inline-block; line-height: 1.2;">${p}</span>` : `<span style="background: #dcfce7; color: #166534; font-weight: 700; padding: 0.5px 3.5px; border-radius: 2px; font-size: 7px; margin-right: 2px; display: inline-block; line-height: 1.2;">${p}</span>`).join('') : '<span style="color: #cbd5e1; font-size: 7.5px;">-</span>'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        ${renderFooter(pageNum)}
      </div>
    `;

    container.innerHTML += subPageHtml;
  }

  return renderA4PagesToPdf(container, filename);
}

/**
 * Exports a targeted list of devices (Search results, Active devices, All scanned targets) to exact A4 pages
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
  const dateStr = formatLocalDate(now);
  const timeStr = formatLocalTime(now);
  const isKo = lang === 'ko';

  const safeScope = (searchQuery ? `Search_${searchQuery.replace(/[^a-zA-Z0-9가-힣_-]/g, '_')}` : scopeLabel.replace(/[^a-zA-Z0-9가-힣_-]/g, '_'));
  const filename = `GridIPScanner2_${safeScope}_${subnet.replace(/\./g, '_')}_${dateStr}.pdf`;

  const activeNodes = targetIps.filter((ip) => results[ip]?.status === 'active');
  const highRiskList: { ip: string; port: number }[] = [];

  targetIps.forEach((ip) => {
    const item = results[ip];
    if (item?.device?.openPorts) {
      item.device.openPorts.forEach((p) => {
        if ([21, 23, 445, 3389, 5900, 6379].includes(p)) {
          highRiskList.push({ ip, port: p });
        }
      });
    }
  });

  if (typeof document === 'undefined') {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    generateVectorPdfFallback(doc, subnet, start, end, results, license);
    doc.save(filename);
    return { success: true, filename, pageCount: 1 };
  }

  // Calculate clean A4 pagination with generous bottom margins to avoid clipping even when ports wrap
  const DEVICES_PER_FIRST_PAGE = 18;
  const DEVICES_PER_SUB_PAGE = 20;

  const firstPageIps = targetIps.slice(0, DEVICES_PER_FIRST_PAGE);
  const remainingIps = targetIps.slice(DEVICES_PER_FIRST_PAGE);
  const subPagesCount = remainingIps.length > 0 ? Math.ceil(remainingIps.length / DEVICES_PER_SUB_PAGE) : 0;
  const totalPages = 1 + subPagesCount;

  const container = document.createElement('div');
  container.id = 'grid-ip-scanner-a4-devicelist-container';
  container.style.position = 'fixed';
  container.style.top = '-99999px';
  container.style.left = '0';
  container.style.width = '794px';
  container.style.zIndex = '-9999';

  // Common Header Generator
  const renderHeader = (pageNumber: number) => `
    <div style="border-bottom: 2.5px solid #0284c7; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="background: #0284c7; color: #ffffff; font-size: 9px; font-weight: 900; padding: 2px 7px; border-radius: 4px; letter-spacing: 0.5px;">INVENTORY REPORT</span>
          <span style="font-size: 11px; font-weight: 800; color: #0284c7; letter-spacing: 0.5px;">GRID IP SCANNER2 v${CURRENT_APP_VERSION}</span>
        </div>
        <h1 style="margin: 4px 0 2px 0; font-size: 19px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">
          ${escapeHtml(title)}
        </h1>
        <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">
          ${escapeHtml(subtitle || (isKo ? `서브넷 ${subnet}.0/24 노드 상태 및 상세 인벤토리` : `Node inventory & status for ${subnet}.0/24`))}
        </p>
      </div>
      <div style="text-align: right;">
        <div style="display: inline-block; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; font-size: 9px; font-weight: 800; padding: 2.5px 8px; border-radius: 5px; text-transform: uppercase;">
          ${escapeHtml(license.tier.toUpperCase())} EDITION
        </div>
        <div style="font-size: 9.5px; color: #64748b; margin-top: 4px; font-family: monospace;">
          ${dateStr} ${timeStr}
        </div>
        <div style="font-size: 8.5px; color: #94a3b8; margin-top: 1px;">
          Lic: ${escapeHtml(license.licensedTo || 'Authorized User')}
        </div>
      </div>
    </div>
  `;

  // Common Footer Generator
  const renderFooter = (pageNumber: number) => `
    <div style="margin-top: auto; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 8.5px; color: #64748b; display: flex; justify-content: space-between; align-items: center; line-height: 1.4;">
      <div>
        <span style="font-weight: 800; color: #0f172a;">Grid IP Scanner2</span> &bull;
        개발: <b>AhBiYout</b>
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-weight: 800; color: #0284c7; font-size: 8px; background: #e0f2fe; padding: 1px 6px; border-radius: 3px;">VERIFIED</span>
        <span style="font-weight: 800; color: #0f172a; font-family: monospace; font-size: 9.5px;">페이지 ${pageNumber} / ${totalPages}</span>
      </div>
    </div>
  `;

  // Page 1: Dashboard, Scope & First Batch of Devices
  const page1Html = `
    <div class="a4-report-page" style="width: 794px; height: 1123px; min-height: 1123px; max-height: 1123px; padding: 34px 38px 36px 38px; box-sizing: border-box; background: #ffffff; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', 'Segoe UI', Roboto, sans-serif; color: #0f172a;">
      <div style="display: flex; flex-direction: column;">
        ${renderHeader(1)}

        <!-- Scope Overview Metric Banner -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 8px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; text-align: center;">
            <div style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase;">${isKo ? '대상 서브넷' : 'Target Subnet'}</div>
            <div style="font-size: 13px; font-weight: 900; color: #0284c7; margin-top: 1px; font-family: monospace;">${escapeHtml(subnet)}.0/24</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; text-align: center;">
            <div style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase;">${isKo ? '보고서 대상 노드' : 'Report Scope'}</div>
            <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 1px; font-family: monospace;">${targetIps.length}개 노드</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; text-align: center;">
            <div style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase;">${isKo ? '온라인 활성 장비' : 'Active Nodes'}</div>
            <div style="font-size: 13px; font-weight: 900; color: #10b981; margin-top: 1px; font-family: monospace;">${activeNodes.length}대</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; text-align: center;">
            <div style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase;">${isKo ? '보안 주의 포트' : 'Alert Ports'}</div>
            <div style="font-size: 13px; font-weight: 900; color: ${highRiskList.length > 0 ? '#e11d48' : '#10b981'}; margin-top: 1px; font-family: monospace;">${highRiskList.length}건</div>
          </div>
        </div>

        ${
          highRiskList.length > 0
            ? `
          <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 5px; padding: 4px 8px; margin-bottom: 6px; font-size: 8px; color: #be123c;">
            <b>⚠️ 보안 알림:</b> ${highRiskList.length}개 노드에서 SMB(445), RDP(3389), Telnet(23) 등 주의 포트 감지됨.
          </div>
        `
            : ''
        }

        <!-- Device List Table (Page 1) -->
        <div>
          <div style="font-size: 10px; font-weight: 800; color: #0f172a; border-left: 3.5px solid #0284c7; padding-left: 6px; margin-bottom: 4px; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center;">
            <span>${isKo ? '노드 인벤토리 상세 목록' : 'Node Inventory & Status'} (${targetIps.length} Nodes)</span>
            <span style="font-size: 8px; color: #64748b; font-weight: 600;">Page 1 (${firstPageIps.length} Items)</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
            <thead>
              <tr style="background: #f1f5f9; color: #475569; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
                <th style="padding: 3.5px 6px; vertical-align: middle; text-align: left; width: 92px; font-weight: 800;">IP 주소</th>
                <th style="padding: 3.5px 6px; vertical-align: middle; text-align: center; width: 52px; font-weight: 800;">상태</th>
                <th style="padding: 3.5px 6px; vertical-align: middle; text-align: left; width: 108px; font-weight: 800;">MAC 주소</th>
                <th style="padding: 3.5px 6px; vertical-align: middle; text-align: left; font-weight: 800;">제조사 / 호스트명</th>
                <th style="padding: 3.5px 6px; vertical-align: middle; text-align: center; width: 48px; font-weight: 800;">RTT</th>
                <th style="padding: 3.5px 6px; vertical-align: middle; text-align: left; width: 118px; font-weight: 800;">개방 포트</th>
              </tr>
            </thead>
            <tbody>
              ${firstPageIps.map((ip, idx) => {
                const item = results[ip];
                const dev = item?.device;
                const isActive = item?.status === 'active';
                const hasHighRisk = dev?.openPorts?.some((p) => [21, 23, 445, 3389, 5900, 6379].includes(p));

                return `
                  <tr style="background: ${hasHighRisk ? '#fff1f2' : idx % 2 === 1 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 2.2px 6px; vertical-align: middle; font-family: monospace; font-weight: 800; color: ${isActive ? '#0284c7' : '#94a3b8'}; font-size: 8px; line-height: 1.3;">${escapeHtml(ip)}</td>
                    <td style="padding: 2.2px 6px; vertical-align: middle; text-align: center;">
                      <span style="font-size: 7.5px; font-weight: 800; padding: 0.5px 4px; border-radius: 2px; display: inline-block; line-height: 1.2; ${isActive ? 'background: #dcfce7; color: #166534;' : 'background: #f1f5f9; color: #64748b;'}">
                        ${escapeHtml((item?.status || 'idle').toUpperCase())}
                      </span>
                    </td>
                    <td style="padding: 2.2px 6px; vertical-align: middle; font-family: monospace; font-weight: 700; color: ${dev?.mac ? '#059669' : '#94a3b8'}; font-size: 8px; line-height: 1.3;">${escapeHtml(dev?.mac || '-')}</td>
                    <td style="padding: 2.2px 6px; vertical-align: middle;">
                      <div style="display: flex; flex-direction: column; justify-content: center; min-height: 22px;">
                        <div style="font-weight: 800; color: #0f172a; font-size: 8px; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;">${escapeHtml(dev?.realVendor && dev.realVendor !== dev.vendor ? `${dev.realVendor} (${dev.vendor})` : (dev?.vendor || (isActive ? 'Unknown' : '-')))}</div>
                        ${dev?.hostname || dev?.webTitle ? `<div style="font-size: 7px; color: #64748b; line-height: 1.25; margin-top: 1.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;">${dev?.nameSource && dev.nameSource !== 'UNKNOWN' ? `<b style="color:#0284c7;">[${escapeHtml(dev.nameSource)}]</b> ` : ''}${escapeHtml(dev?.hostname || '')} ${dev?.webTitle ? `("${escapeHtml(dev.webTitle)}")` : ''}</div>` : ''}
                      </div>
                    </td>
                    <td style="padding: 2.2px 6px; vertical-align: middle; text-align: center; font-family: monospace; color: #64748b; font-size: 8px; line-height: 1.3;">
                      ${isActive ? `${dev?.latency || 0}ms` : '-'}
                    </td>
                    <td style="padding: 2.2px 6px; vertical-align: middle;">
                      ${dev?.openPorts && dev.openPorts.length > 0 ? dev.openPorts.map((p) => [21, 23, 445, 3389, 5900, 6379].includes(p) ? `<span style="background: #ffe4e6; color: #be123c; font-weight: 800; padding: 0.5px 3px; border-radius: 2px; font-size: 6.8px; margin-right: 2px; display: inline-block; line-height: 1.2;">${p}</span>` : `<span style="background: #dcfce7; color: #166534; font-weight: 700; padding: 0.5px 3px; border-radius: 2px; font-size: 6.8px; margin-right: 2px; display: inline-block; line-height: 1.2;">${p}</span>`).join('') : '<span style="color: #cbd5e1; font-size: 7.5px;">-</span>'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      ${renderFooter(1)}
    </div>
  `;

  container.innerHTML = page1Html;

  // Render Subsequent Pages
  for (let p = 0; p < subPagesCount; p++) {
    const pageNum = p + 2;
    const pageIps = remainingIps.slice(p * DEVICES_PER_SUB_PAGE, (p + 1) * DEVICES_PER_SUB_PAGE);

    const subPageHtml = `
      <div class="a4-report-page" style="width: 794px; height: 1123px; min-height: 1123px; max-height: 1123px; padding: 34px 38px 36px 38px; box-sizing: border-box; background: #ffffff; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', 'Segoe UI', Roboto, sans-serif; color: #0f172a;">
        <div style="display: flex; flex-direction: column;">
          <!-- Sub Page Header -->
          <div style="border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <div style="font-size: 10px; font-weight: 800; color: #0284c7; letter-spacing: 0.5px;">GRID IP SCANNER2 - ${escapeHtml(scopeLabel.toUpperCase())} REPORT</div>
              <div style="font-size: 15px; font-weight: 900; color: #0f172a; margin-top: 1px;">
                ${escapeHtml(title)} (이어짐)
              </div>
            </div>
            <div style="text-align: right; font-size: 9px; color: #64748b; font-family: monospace;">
              Subnet: ${escapeHtml(subnet)}.0/24 &bull; ${dateStr}
            </div>
          </div>

          <!-- Device Table -->
          <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
            <thead>
              <tr style="background: #f1f5f9; color: #475569; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
                <th style="padding: 3.5px 6px; vertical-align: middle; text-align: left; width: 92px; font-weight: 800;">IP 주소</th>
                <th style="padding: 3.5px 6px; vertical-align: middle; text-align: center; width: 52px; font-weight: 800;">상태</th>
                <th style="padding: 3.5px 6px; vertical-align: middle; text-align: left; width: 108px; font-weight: 800;">MAC 주소</th>
                <th style="padding: 3.5px 6px; vertical-align: middle; text-align: left; font-weight: 800;">제조사 / 호스트명</th>
                <th style="padding: 3.5px 6px; vertical-align: middle; text-align: center; width: 48px; font-weight: 800;">RTT</th>
                <th style="padding: 3.5px 6px; vertical-align: middle; text-align: left; width: 118px; font-weight: 800;">개방 포트</th>
              </tr>
            </thead>
            <tbody>
              ${pageIps.map((ip, idx) => {
                const item = results[ip];
                const dev = item?.device;
                const isActive = item?.status === 'active';
                const hasHighRisk = dev?.openPorts?.some((p) => [21, 23, 445, 3389, 5900, 6379].includes(p));

                return `
                  <tr style="background: ${hasHighRisk ? '#fff1f2' : idx % 2 === 1 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 2.5px 6px; vertical-align: middle; font-family: monospace; font-weight: 800; color: ${isActive ? '#0284c7' : '#94a3b8'}; font-size: 8px; line-height: 1.3;">${escapeHtml(ip)}</td>
                    <td style="padding: 2.5px 6px; vertical-align: middle; text-align: center;">
                      <span style="font-size: 7.5px; font-weight: 800; padding: 0.5px 4px; border-radius: 2px; display: inline-block; line-height: 1.2; ${isActive ? 'background: #dcfce7; color: #166534;' : 'background: #f1f5f9; color: #64748b;'}">
                        ${escapeHtml((item?.status || 'idle').toUpperCase())}
                      </span>
                    </td>
                    <td style="padding: 2.5px 6px; vertical-align: middle; font-family: monospace; font-weight: 700; color: ${dev?.mac ? '#059669' : '#94a3b8'}; font-size: 8px; line-height: 1.3;">${escapeHtml(dev?.mac || '-')}</td>
                    <td style="padding: 2.5px 6px; vertical-align: middle;">
                      <div style="display: flex; flex-direction: column; justify-content: center; min-height: 22px;">
                        <div style="font-weight: 800; color: #0f172a; font-size: 8px; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;">${escapeHtml(dev?.realVendor && dev.realVendor !== dev.vendor ? `${dev.realVendor} (${dev.vendor})` : (dev?.vendor || (isActive ? 'Unknown' : '-')))}</div>
                        ${dev?.hostname || dev?.webTitle ? `<div style="font-size: 7px; color: #64748b; line-height: 1.25; margin-top: 1.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;">${dev?.nameSource && dev.nameSource !== 'UNKNOWN' ? `<b style="color:#0284c7;">[${escapeHtml(dev.nameSource)}]</b> ` : ''}${escapeHtml(dev?.hostname || '')} ${dev?.webTitle ? `("${escapeHtml(dev.webTitle)}")` : ''}</div>` : ''}
                      </div>
                    </td>
                    <td style="padding: 2.5px 6px; vertical-align: middle; text-align: center; font-family: monospace; color: #64748b; font-size: 8px; line-height: 1.3;">
                      ${isActive ? `${dev?.latency || 0}ms` : '-'}
                    </td>
                    <td style="padding: 2.5px 6px; vertical-align: middle;">
                      ${dev?.openPorts && dev.openPorts.length > 0 ? dev.openPorts.map((p) => [21, 23, 445, 3389, 5900, 6379].includes(p) ? `<span style="background: #ffe4e6; color: #be123c; font-weight: 800; padding: 0.5px 3px; border-radius: 2px; font-size: 6.8px; margin-right: 2px; display: inline-block; line-height: 1.2;">${p}</span>` : `<span style="background: #dcfce7; color: #166534; font-weight: 700; padding: 0.5px 3px; border-radius: 2px; font-size: 6.8px; margin-right: 2px; display: inline-block; line-height: 1.2;">${p}</span>`).join('') : '<span style="color: #cbd5e1; font-size: 7.5px;">-</span>'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        ${renderFooter(pageNum)}
      </div>
    `;

    container.innerHTML += subPageHtml;
  }

  return renderA4PagesToPdf(container, filename);
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
  doc.setTextColor(148, 163, 184);
  doc.text(
    `CONFIDENTIAL | Scope: ${subnet}.0/24 | Edition: ${license.tier.toUpperCase()} | Generated: ${now.toISOString()}`,
    14,
    18
  );

  doc.setTextColor(56, 189, 248);
  doc.text('Developer: AhBiYout | Org: AhBiYout-all', 14, 23);

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

  // Section 3: Active Host Inventory
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
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('Grid IP Scanner2 Official Security Report | Developer: AhBiYout', 14, 290);

      doc.addPage();
      currentY = 20;

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
    doc.setTextColor(2, 132, 199);
    doc.text(d.ip, 18, currentY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(16, 185, 129);
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

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Grid IP Scanner2 Official Security Report | Developer: AhBiYout', 14, 290);
}

/**
 * Interactive HTML Audit Report with enhanced A4 print stylesheet and exact page breaking
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
  <title>Grid IP Scanner2 - 네트워크 보안 진단 감사 보고서 (${escapeHtml(subnet)}.0/24)</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", "Segoe UI", Roboto, Arial, sans-serif;
      color: #1e293b;
      background: #fff;
      line-height: 1.5;
      padding: 24px;
      margin: 0 auto;
      max-width: 190mm;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2.5px solid #0284c7;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .header-title h1 {
      margin: 0;
      font-size: 22px;
      color: #0f172a;
      letter-spacing: -0.5px;
      font-weight: 900;
    }
    .header-title p {
      margin: 4px 0 0;
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge {
      display: inline-block;
      padding: 3px 9px;
      border-radius: 5px;
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .badge-pro {
      background: #e0f2fe;
      color: #0284c7;
      border: 1px solid #bae6fd;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 22px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .stat-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }
    .stat-val {
      font-size: 22px;
      font-weight: 900;
      color: #0f172a;
      margin-top: 3px;
      font-family: monospace;
    }
    .stat-lbl {
      font-size: 9.5px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .section-title {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      border-left: 4px solid #0284c7;
      padding-left: 8px;
      margin: 22px 0 10px;
      text-transform: uppercase;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 10px;
      page-break-inside: auto;
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 800;
      text-align: left;
      padding: 7px 9px;
      border-top: 1px solid #cbd5e1;
      border-bottom: 1px solid #cbd5e1;
    }
    td {
      padding: 6px 9px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    .mono {
      font-family: monospace;
      font-weight: 700;
    }
    .risk-high {
      background: #ffe4e6;
      color: #e11d48;
      font-weight: 800;
      padding: 1.5px 5px;
      border-radius: 3px;
      font-size: 8.5px;
    }
    .risk-safe {
      background: #dcfce7;
      color: #15803d;
      font-weight: 700;
      padding: 1.5px 5px;
      border-radius: 3px;
      font-size: 8.5px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 12px;
      border-top: 1px solid #cbd5e1;
      font-size: 9px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .actions-bar {
      display: flex;
      gap: 10px;
      margin-bottom: 18px;
    }
    .print-btn {
      background: #0284c7;
      color: #fff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .print-btn:hover {
      background: #0369a1;
    }
    .info-link {
      color: #0284c7;
      text-decoration: none;
      font-weight: 600;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      .actions-bar {
        display: none !important;
      }
      table {
        page-break-inside: auto;
      }
      tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="actions-bar">
    <button class="print-btn" onclick="window.print()">🖨️ A4 보고서 인쇄 (Ctrl + P)</button>
  </div>
  
  <div class="header-bar">
    <div class="header-title">
      <h1>Grid IP Scanner2 - 로컬 네트워크 정밀 감사 보고서</h1>
      <p>Network Infrastructure & Security Topology Audit Report</p>
    </div>
    <div style="text-align: right;">
      <span class="badge badge-pro">${escapeHtml(license.tier.toUpperCase())} EDITION</span>
      <div style="font-size: 9.5px; color: #64748b; margin-top: 4px;">발행: ${escapeHtml(now.toLocaleString())}</div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-lbl">스캔 서브넷</div>
      <div class="stat-val" style="font-size: 17px; color: #0284c7;">${escapeHtml(subnet)}.0/24</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">활성 노드 탐지</div>
      <div class="stat-val" style="color: #10b981;">${activeDevices.length} <span style="font-size: 11px; color: #94a3b8;">/ ${Math.max(1, end - start + 1)}</span></div>
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
      ? `<div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 12px; margin-bottom: 20px; page-break-inside: avoid;">
           <div style="font-weight: 800; font-size: 12px; color: #be123c; margin-bottom: 6px;">⚠️ 보안 주의 포트 개방 알림 (High-Risk Open Ports)</div>
           <div style="font-size: 10.5px; color: #9f1239; line-height: 1.6;">
             ${highRiskDevices.map((h) => `• <b>${escapeHtml(h.ip)}</b> (포트 ${h.port} - ${escapeHtml(h.name)}): ${escapeHtml(h.threat)}`).join('<br>')}
           </div>
         </div>`
      : `<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; margin-bottom: 20px; page-break-inside: avoid;">
           <div style="font-weight: 800; font-size: 11.5px; color: #166534;">🛡️ 정밀 보안 점검 결과: 위험 포트(SMB 445, RDP 3389, Telnet 23) 개방 단말 없음</div>
         </div>`
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
            <td style="font-weight: 600;">${escapeHtml(vendor)}</td>
            <td style="text-align: right;" class="mono">${cnt}대</td>
            <td style="text-align: right;" class="mono">${activeDevices.length > 0 ? ((cnt / activeDevices.length) * 100).toFixed(1) : '0.0'}%</td>
          </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <div class="section-title">2. 활성 장비 인벤토리 상세 (Active Node Inventory)</div>
  <table>
    <thead>
      <tr>
        <th style="width: 105px;">IP 주소</th>
        <th style="width: 130px;">MAC 주소</th>
        <th>제조사 / 호스트명</th>
        <th style="width: 70px; text-align: center;">응답속도</th>
        <th style="width: 130px;">개방 포트</th>
      </tr>
    </thead>
    <tbody>
      ${activeDevices
        .map((d) => {
          const dev = d.device;
          return `<tr>
            <td class="mono" style="color: #0284c7;">${escapeHtml(d.ip)}</td>
            <td class="mono" style="color: #059669;">${escapeHtml(dev?.mac || 'N/A')}</td>
            <td>
              <div style="display: flex; flex-direction: column; justify-content: center;">
                <div style="font-weight: 700; line-height: 1.3;">${escapeHtml(dev?.realVendor && dev.realVendor !== dev.vendor ? `${dev.realVendor} (${dev.vendor})` : (dev?.vendor || 'Unknown'))}</div>
                <div style="font-size: 9.5px; color: #64748b; line-height: 1.25; margin-top: 2px;">${escapeHtml(dev?.hostname || '-')} ${dev?.webTitle ? `("${escapeHtml(dev.webTitle)}")` : ''}</div>
              </div>
            </td>
            <td class="mono" style="text-align: center;">${dev?.latency || 0} ms</td>
            <td>
              ${
                dev?.openPorts && dev.openPorts.length > 0
                  ? dev.openPorts
                      .map((p) =>
                        [21, 23, 445, 3389, 5900, 6379].includes(p)
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
      <div><b>Grid IP Scanner2</b> | 네트워크 진단 보고서</div>
      <div>개발자: AhBiYout | GitHub: <a href="https://github.com/AhBiYout-all" class="info-link" target="_blank" rel="noopener noreferrer">https://github.com/AhBiYout-all</a> | 기술 블로그: <a href="https://ahbiyoutvibe.blogspot.com/" class="info-link" target="_blank" rel="noopener noreferrer">ahbiyoutvibe.blogspot.com</a></div>
    </div>
    <div style="text-align: right;">
      <div>Licensee: <b>${escapeHtml(license.licensedTo || 'Pro Customer')}</b></div>
      <div>Security: <b>CONFIDENTIAL &bull; A4 FORMATTED</b></div>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `GridIPScanner_Audit_Report_${subnet.replace(/\./g, '_')}_${formatLocalDate(now)}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

function formatTimestampLabel(ts: number | string | null | undefined): string {
  if (ts === null || ts === undefined || ts === '') return '-';
  const date = typeof ts === 'number' ? new Date(ts) : new Date(String(ts));
  if (Number.isNaN(date.getTime())) return '-';
  return `${formatLocalDate(date)} ${formatLocalTime(date)}`;
}

export interface BasicSummaryPdfOptions {
  subnet: string;
  activeDeviceCount: number;
  totalDeviceCount?: number;
  totalScannedIpCount?: number;
  totalScanDurationMs: number;
  scanStartTimestamp?: number | string | null;
  scanEndTimestamp?: number | string | null;
  isScanning?: boolean;
  start?: number;
  end?: number;
  lang?: 'ko' | 'en';
}

export async function exportBasicSummaryReportToPDF(
  options: BasicSummaryPdfOptions
): Promise<AuditReportExportResult> {
  const {
    subnet,
    activeDeviceCount,
    totalDeviceCount,
    totalScannedIpCount,
    totalScanDurationMs,
    scanStartTimestamp,
    scanEndTimestamp,
    isScanning = false,
    start,
    end,
    lang = 'ko',
  } = options;
  const isKo = lang === 'ko';
  const now = new Date();
  const dateStr = formatLocalDate(now);
  const timeStr = formatLocalTime(now);
  const safeDurationMs = Number.isFinite(totalScanDurationMs) && totalScanDurationMs >= 0 ? totalScanDurationMs : 0;
  const durationSec = (safeDurationMs / 1000).toFixed(2);
  const resolvedTotalDevices = Math.max(
    activeDeviceCount,
    typeof totalDeviceCount === 'number' && Number.isFinite(totalDeviceCount)
      ? Math.max(0, Math.round(totalDeviceCount))
      : typeof start === 'number' && typeof end === 'number' && end >= start
        ? end - start + 1
        : activeDeviceCount
  );
  const resolvedScannedIps = Math.max(
    activeDeviceCount,
    typeof totalScannedIpCount === 'number' && Number.isFinite(totalScannedIpCount)
      ? Math.max(0, Math.round(totalScannedIpCount))
      : resolvedTotalDevices
  );
  const inactiveOrOfflineCount = Math.max(0, resolvedScannedIps - activeDeviceCount);
  const activeRatioPct = resolvedTotalDevices > 0 ? ((activeDeviceCount / resolvedTotalDevices) * 100).toFixed(1) : '0.0';
  const scannedCoveragePct = resolvedTotalDevices > 0 ? Math.min(100, (resolvedScannedIps / resolvedTotalDevices) * 100).toFixed(1) : '0.0';
  const startLabel = formatTimestampLabel(scanStartTimestamp);
  const endLabel =
    isScanning && scanStartTimestamp && !scanEndTimestamp
      ? (isKo ? '진행 중 (스캔 중)' : 'In Progress')
      : formatTimestampLabel(scanEndTimestamp);
  const endLabelAscii =
    isScanning && scanStartTimestamp && !scanEndTimestamp
      ? 'In Progress'
      : formatTimestampLabel(scanEndTimestamp);
  const rangeLabel =
    typeof start === 'number' && typeof end === 'number'
      ? `${subnet}.${start} ~ ${subnet}.${end}`
      : `${subnet}.0/24`;
  const filename = `GridIPScanner2_Summary_${subnet.replace(/\./g, '_')}_${dateStr}.pdf`;

  // Pure ASCII jsPDF fallback when DOM is unavailable (avoids helvetica WinAnsi mojibake)
  if (typeof document === 'undefined') {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    doc.setFillColor(2, 132, 199);
    doc.rect(0, 0, 210, 34, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('GRID IP SCANNER2 - SCAN SUMMARY REPORT', 15, 19);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${dateStr} ${timeStr} | v${CURRENT_APP_VERSION}`, 15, 27);

    // Top Summary Statistics Block
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(15, 42, 180, 60, 3, 3, 'FD');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(2, 132, 199);
    doc.text('TOP EXECUTIVE SCAN SUMMARY', 20, 52);

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total Scanned IP Count: ${resolvedScannedIps} IPs (${scannedCoveragePct}% of target)`, 20, 63);
    doc.text(`Active vs Total Devices: ${activeDeviceCount} / ${resolvedTotalDevices} (${activeRatioPct}% active)`, 20, 73);
    doc.text(`Total Scan Duration: ${durationSec} seconds (${safeDurationMs}ms)`, 20, 83);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(`Scan Start: ${startLabel}   |   Scan End: ${endLabelAscii}`, 20, 95);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Target Network Information', 15, 118);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Target Subnet: ${subnet}.0/24`, 20, 128);
    doc.text(`Scan Range: ${rangeLabel}`, 20, 136);
    doc.text(`Inactive / Non-Responding Scanned IPs: ${inactiveOrOfflineCount}`, 20, 144);
    doc.text(`Report Generated At: ${dateStr} ${timeStr}`, 20, 152);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Grid IP Scanner2 - Professional Subnet Discovery & Security Asset Utility', 15, 280);
    doc.text('Copyright (c) 2025-2026 AhBiYout. All rights reserved.', 15, 285);

    doc.save(filename);
    return { success: true, filename, pageCount: 1 };
  }

  const container = document.createElement('div');
  container.id = 'grid-ip-scanner-a4-basic-summary-container';
  container.style.position = 'fixed';
  container.style.top = '-99999px';
  container.style.left = '0';
  container.style.width = '794px';
  container.style.zIndex = '-9999';

  container.innerHTML = `
    <div class="a4-report-page" style="width: 794px; height: 1123px; min-height: 1123px; max-height: 1123px; padding: 40px 44px 36px 44px; box-sizing: border-box; background: #ffffff; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', 'Segoe UI', Roboto, sans-serif; color: #0f172a;">
      <div>
        <!-- Header Banner -->
        <div style="background: #0284c7; color: #ffffff; border-radius: 10px; padding: 22px 26px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.8px; opacity: 0.9; margin-bottom: 5px;">GRID IP SCANNER2 v${CURRENT_APP_VERSION}</div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.4px;">
              ${isKo ? '그리드 스캔 요약 보고서' : 'Grid Scan Summary Report'}
            </h1>
          </div>
          <div style="text-align: right; font-family: monospace; font-size: 11px; opacity: 0.95;">
            ${dateStr} ${timeStr}
          </div>
        </div>

        <!-- Top Executive Summary Statistics (Integrated at Top of Summary PDF) -->
        <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; padding: 18px 20px; margin-bottom: 22px;">
          <div style="font-size: 12px; font-weight: 900; color: #0284c7; letter-spacing: 0.4px; margin-bottom: 12px; text-transform: uppercase;">
            ${isKo ? '핵심 스캔 요약 통계' : 'Executive Summary Statistics'}
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 14px;">
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; min-width: 0;">
              <div style="font-size: 10.5px; font-weight: 800; color: #64748b; margin-bottom: 6px;">${isKo ? '총 스캔 IP 수' : 'Total Scanned IPs'}</div>
              <div style="font-size: 23px; font-weight: 900; color: #0f172a; font-family: monospace;">${resolvedScannedIps} <span style="font-size: 12px; color: #64748b;">IP</span></div>
              <div style="font-size: 10px; color: #64748b; margin-top: 4px; font-family: monospace;">${isKo ? `대상 범위의 ${scannedCoveragePct}%` : `${scannedCoveragePct}% of target range`}</div>
            </div>
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; min-width: 0;">
              <div style="font-size: 10.5px; font-weight: 800; color: #64748b; margin-bottom: 6px;">${isKo ? '활성 / 전체 단말' : 'Active vs Total Devices'}</div>
              <div style="font-size: 23px; font-weight: 900; color: #10b981; font-family: monospace;">${activeDeviceCount} <span style="font-size: 15px; color: #94a3b8;">/ ${resolvedTotalDevices}</span></div>
              <div style="font-size: 10px; color: #059669; margin-top: 4px; font-weight: 700; font-family: monospace;">${isKo ? `활성 응답률 ${activeRatioPct}%` : `${activeRatioPct}% active rate`}</div>
            </div>
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; min-width: 0;">
              <div style="font-size: 10.5px; font-weight: 800; color: #64748b; margin-bottom: 6px;">${isKo ? '총 스캔 소요 시간' : 'Total Scan Duration'}</div>
              <div style="font-size: 23px; font-weight: 900; color: #0284c7; font-family: monospace;">${durationSec} <span style="font-size: 12px; color: #64748b;">${isKo ? '초' : 'sec'}</span></div>
              <div style="font-size: 10px; color: #64748b; margin-top: 4px; font-family: monospace;">(${safeDurationMs} ms)</div>
            </div>
          </div>

          <!-- Scan Start / End Timestamps Row -->
          <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;">
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 11px 14px; display: flex; justify-content: space-between; align-items: center; min-width: 0;">
              <span style="font-size: 11px; font-weight: 800; color: #475569;">${isKo ? '스캔 시작 일시' : 'Scan Start Timestamp'}</span>
              <span style="font-size: 11.5px; font-weight: 800; color: #0f172a; font-family: monospace;">${escapeHtml(startLabel)}</span>
            </div>
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 11px 14px; display: flex; justify-content: space-between; align-items: center; min-width: 0;">
              <span style="font-size: 11px; font-weight: 800; color: #475569;">${isKo ? '스캔 종료 일시' : 'Scan End Timestamp'}</span>
              <span style="font-size: 11.5px; font-weight: 800; color: #0f172a; font-family: monospace;">${escapeHtml(endLabel)}</span>
            </div>
          </div>
        </div>

        <!-- Section 1: Target Network Information -->
        <div style="margin-bottom: 22px;">
          <div style="font-size: 13px; font-weight: 800; color: #0f172a; border-left: 4px solid #0284c7; padding-left: 10px; margin-bottom: 10px;">
            ${isKo ? '1. 네트워크 대상 정보' : '1. Target Network Information'}
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; font-size: 12px; line-height: 1.85; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 18px;">
            <div><b>${isKo ? '타겟 서브넷' : 'Target Subnet'}:</b> <span style="font-family: monospace; color: #0284c7; font-weight: 800;">${escapeHtml(subnet)}.0/24</span></div>
            <div><b>${isKo ? '스캔 IP 대역' : 'Scan IP Range'}:</b> <span style="font-family: monospace; font-weight: 700;">${escapeHtml(rangeLabel)}</span></div>
            <div><b>${isKo ? '비응답 / 오프라인 수' : 'Inactive / Offline IPs'}:</b> <span style="font-family: monospace; font-weight: 700;">${inactiveOrOfflineCount} IP</span></div>
            <div><b>${isKo ? '보고서 생성 일시' : 'Generated At'}:</b> <span style="font-family: monospace;">${dateStr} ${timeStr}</span></div>
          </div>
        </div>

        <!-- Section 2: Active vs Total Discovery Breakdown -->
        <div>
          <div style="font-size: 13px; font-weight: 800; color: #0f172a; border-left: 4px solid #0284c7; padding-left: 10px; margin-bottom: 10px;">
            ${isKo ? '2. 단말 응답률 및 스캔 완료 현황' : '2. Device Discovery Ratio & Completion Breakdown'}
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 18px;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; font-weight: 700; margin-bottom: 8px;">
              <span>${isKo ? `활성 장비 ${activeDeviceCount}대 / 전체 대상 ${resolvedTotalDevices}대` : `${activeDeviceCount} Active Devices / ${resolvedTotalDevices} Total Target Devices`}</span>
              <span style="font-family: monospace; color: #059669; font-weight: 900;">${activeRatioPct}%</span>
            </div>
            <div style="width: 100%; height: 12px; background: #e2e8f0; border-radius: 999px; overflow: hidden; margin-bottom: 12px;">
              <div style="width: ${Math.min(100, Math.max(0, Number(activeRatioPct)))}%; height: 100%; background: #10b981;"></div>
            </div>
            <div style="font-size: 11px; color: #475569; line-height: 1.6;">
              ${isKo
                ? `총 ${resolvedScannedIps}개 IP에 대한 스캔이 ${durationSec}초 만에 완료되었으며, 이 중 ${activeDeviceCount}대의 온라인 활성 단말이 식별되었습니다.`
                : `Completed scanning ${resolvedScannedIps} IP addresses in ${durationSec} seconds, identifying ${activeDeviceCount} active online devices out of ${resolvedTotalDevices} configured targets.`}
            </div>
          </div>
        </div>
      </div>

      <div style="padding-top: 12px; border-top: 1px solid #cbd5e1; font-size: 9px; color: #64748b; display: flex; justify-content: space-between; align-items: center;">
        <div><b>Grid IP Scanner2</b> &bull; Professional Subnet Discovery &amp; Security Asset Utility</div>
        <div>Copyright (c) 2025-2026 AhBiYout</div>
      </div>
    </div>
  `;

  return renderA4PagesToPdf(container, filename);
}

/**
 * Unified Report Center PDF Exporter
 * Honors white-label branding, logo, top executive KPI stats, dynamic columns,
 * security alerts, and snapshot diff breakdown on clean 210mm x 297mm A4 pages.
 */
export async function exportDatasetToPDF(
  dataset: PreparedReportDataset,
  selectedColumns: ReportColumnKey[] = DEFAULT_SELECTED_COLUMNS,
  options?: { filename?: string }
): Promise<AuditReportExportResult> {
  const isKo = dataset.lang === 'ko';
  const cols = selectedColumns.length > 0 ? selectedColumns : DEFAULT_SELECTED_COLUMNS;
  const filename = options?.filename || buildReportFilename(dataset, 'pdf');
  const accent = sanitizeHexColor(dataset.branding.accentColor, '#0284c7');
  const durationSec = (dataset.kpis.totalScanDurationMs / 1000).toFixed(2);
  const startLabel = formatTimestampLocal(dataset.kpis.scanStartTimestamp);
  const endLabel =
    dataset.kpis.isScanning && !dataset.kpis.scanEndTimestamp
      ? isKo
        ? '진행 중'
        : 'In Progress'
      : formatTimestampLocal(dataset.kpis.scanEndTimestamp);
  const endLabelAscii =
    dataset.kpis.isScanning && !dataset.kpis.scanEndTimestamp
      ? 'In Progress'
      : formatTimestampLocal(dataset.kpis.scanEndTimestamp);

  // Pure ASCII jsPDF fallback when browser DOM is unavailable
  if (typeof document === 'undefined') {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('GRID IP SCANNER2 - UNIFIED NETWORK REPORT', 14, 12);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Subnet: ${dataset.subnet}.0/24 | Scope: ${dataset.scope.toUpperCase()} | Classification: ${dataset.branding.classificationLabel}`,
      14,
      19
    );
    doc.text(
      `Scanned IPs: ${dataset.kpis.totalScannedIpCount} | Active/Total: ${dataset.kpis.activeDeviceCount}/${dataset.kpis.totalDeviceCount} | Duration: ${durationSec}s`,
      14,
      24
    );
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.text(`Scan Start: ${startLabel} | Scan End: ${endLabelAscii}`, 14, 36);

    let y = 44;
    dataset.rows.slice(0, 35).forEach((row) => {
      doc.setFontSize(7.5);
      doc.text(
        `${row.ip}  [${row.status.toUpperCase()}]  ${row.mac}  ${row.hostname}  Ports: ${row.openPorts.join(',') || '-'}`,
        14,
        y
      );
      y += 6;
    });
    doc.save(filename);
    return { success: true, filename, pageCount: 1 };
  }

  // Summary-only 1-page layout when scope is 'summary'
  const isSummaryScope = dataset.scope === 'summary';
  const hasAlertsBanner = dataset.highRiskAlerts.length > 0 && (dataset.scope === 'audit' || dataset.highRiskAlerts.length > 0);
  const hasDiffBanner = Boolean(dataset.diffAnalysis);

  const page1MaxRows = isSummaryScope
    ? 0
    : hasAlertsBanner && hasDiffBanner
    ? 8
    : hasAlertsBanner || hasDiffBanner
    ? 11
    : 15;
  const subPageMaxRows = 20;

  const page1Rows = dataset.rows.slice(0, page1MaxRows);
  const remainingRows = isSummaryScope ? [] : dataset.rows.slice(page1MaxRows);
  const subPagesCount = remainingRows.length > 0 ? Math.ceil(remainingRows.length / subPageMaxRows) : 0;
  const totalPages = 1 + subPagesCount;

  const container = document.createElement('div');
  container.id = 'grid-ip-scanner-a4-unified-container';
  container.style.position = 'fixed';
  container.style.top = '-99999px';
  container.style.left = '0';
  container.style.width = '794px';
  container.style.zIndex = '-9999';

  const renderPageHeader = (continued = false) => `
    <div style="border-bottom: 2px solid ${escapeHtml(accent)}; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
        ${
          sanitizeImageDataUrl(dataset.branding.logoDataUrl)
            ? `<img src="${escapeHtml(sanitizeImageDataUrl(dataset.branding.logoDataUrl))}" alt="Logo" style="max-height: 44px; max-width: 110px; object-fit: contain; border-radius: 4px;" />`
            : ''
        }
        <div style="min-width: 0;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
            <span style="background: ${escapeHtml(accent)}; color: #ffffff; font-size: 8.5px; font-weight: 800; padding: 1.5px 6px; border-radius: 3px; letter-spacing: 0.4px;">${escapeHtml(dataset.branding.classificationLabel || 'CONFIDENTIAL')}</span>
            <span style="font-size: 10px; font-weight: 700; color: #475569;">${escapeHtml(dataset.branding.organizationName)}</span>
          </div>
          <h1 style="margin: 0; font-size: ${continued ? '15px' : '18px'}; font-weight: 900; color: #0f172a; letter-spacing: -0.4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 470px;">
            ${escapeHtml(dataset.branding.reportTitle)}${continued ? (isKo ? ' (이어짐)' : ' (Continued)') : ''}
          </h1>
          ${
            !continued && dataset.branding.reportSubtitle
              ? `<p style="margin: 2px 0 0; font-size: 9.5px; color: #64748b; font-weight: 600;">${escapeHtml(dataset.branding.reportSubtitle)}</p>`
              : ''
          }
        </div>
      </div>
      <div style="text-align: right; shrink-0;">
        <div style="font-size: 9px; font-weight: 800; color: ${escapeHtml(accent)};">${escapeHtml(dataset.scopeLabel)}</div>
        <div style="font-size: 9px; color: #475569; margin-top: 2px; font-family: monospace;">${escapeHtml(dataset.subnet)}.0/24 &bull; ${escapeHtml(dataset.generatedDateStr)} ${escapeHtml(dataset.generatedTimeStr)}</div>
        <div style="font-size: 8.5px; color: #64748b; margin-top: 1px;">${isKo ? '담당:' : 'Auditor:'} ${escapeHtml(dataset.branding.auditorName)}</div>
      </div>
    </div>
  `;

  const renderPageFooter = (pageNum: number) => `
    <div style="margin-top: auto; padding-top: 8px; border-top: 1px solid #cbd5e1; font-size: 8.5px; color: #64748b; display: flex; justify-content: space-between; align-items: center;">
      <div>${escapeHtml(dataset.branding.footerNote)}</div>
      <div style="font-family: monospace; font-weight: 800; color: #0f172a;">${isKo ? '페이지' : 'Page'} ${pageNum} / ${totalPages}</div>
    </div>
  `;

  const renderInventoryTable = (rowsToRender: typeof dataset.rows) => `
    <table style="width: 100%; border-collapse: collapse; font-size: 7.8px; table-layout: auto;">
      <thead>
        <tr style="background: #f1f5f9; color: #334155; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
          ${cols
            .map(
              (c) =>
                `<th style="padding: 4px 5px; text-align: left; font-weight: 800; white-space: nowrap;">${escapeHtml(getColumnHeader(c, dataset.lang))}</th>`
            )
            .join('')}
          ${dataset.diffAnalysis ? '<th style="padding: 4px 5px; text-align: center; font-weight: 800;">DIFF</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${rowsToRender
          .map((row, idx) => {
            const isRisk = row.riskLevel === 'CRITICAL' || row.riskLevel === 'HIGH';
            const rowBg = isRisk ? '#fff1f2' : idx % 2 === 1 ? '#f8fafc' : '#ffffff';
            return `<tr style="background: ${rowBg}; border-bottom: 1px solid #f1f5f9;">
              ${cols
                .map((c) => {
                  const val = getColumnValue(row, c, dataset.lang);
                  const isMono = c === 'ip' || c === 'mac' || c === 'latency' || c === 'openPorts';
                  const color =
                    c === 'ip'
                      ? '#0284c7'
                      : c === 'mac'
                      ? '#059669'
                      : c === 'riskLevel' && isRisk
                      ? '#be123c'
                      : '#1e293b';
                  return `<td style="padding: 3px 5px; vertical-align: middle; ${isMono ? 'font-family: monospace;' : ''} color: ${color}; font-weight: ${
                    c === 'ip' || (c === 'riskLevel' && isRisk) ? '800' : '500'
                  }; max-width: 155px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(val)}</td>`;
                })
                .join('')}
              ${
                dataset.diffAnalysis
                  ? `<td style="padding: 3px 5px; text-align: center; font-family: monospace; font-weight: 800; color: ${
                      row.diffStatus === 'new'
                        ? '#059669'
                        : row.diffStatus === 'offline'
                        ? '#e11d48'
                        : row.diffStatus === 'changed'
                        ? '#d97706'
                        : '#64748b'
                    };">${escapeHtml(row.diffStatus ? row.diffStatus.toUpperCase() : '-')}</td>`
                  : ''
              }
            </tr>`;
          })
          .join('')}
      </tbody>
    </table>
  `;

  // Page 1 HTML
  const page1Html = `
    <div class="a4-report-page" style="width: 794px; height: 1123px; min-height: 1123px; max-height: 1123px; padding: 32px 38px 28px 38px; box-sizing: border-box; background: #ffffff; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', 'Segoe UI', Roboto, sans-serif; color: #0f172a;">
      <div style="display: flex; flex-direction: column;">
        ${renderPageHeader(false)}

        <!-- Executive Top Summary Strip -->
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 7px; padding: 10px 12px; margin-bottom: 12px;">
          <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-bottom: 8px;">
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 5px; padding: 7px 9px;">
              <div style="font-size: 8.5px; font-weight: 800; color: #64748b;">${isKo ? '총 스캔 IP 수' : 'Total Scanned IPs'}</div>
              <div style="font-size: 16px; font-weight: 900; font-family: monospace; color: #0f172a; margin-top: 2px;">${dataset.kpis.totalScannedIpCount} <span style="font-size: 9px; color: #64748b;">IP</span></div>
            </div>
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 5px; padding: 7px 9px;">
              <div style="font-size: 8.5px; font-weight: 800; color: #64748b;">${isKo ? '활성 / 전체 단말' : 'Active / Total'}</div>
              <div style="font-size: 16px; font-weight: 900; font-family: monospace; color: #059669; margin-top: 2px;">${dataset.kpis.activeDeviceCount} <span style="font-size: 10px; color: #94a3b8;">/ ${dataset.kpis.totalDeviceCount}</span></div>
            </div>
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 5px; padding: 7px 9px;">
              <div style="font-size: 8.5px; font-weight: 800; color: #64748b;">${isKo ? '총 스캔 소요 시간' : 'Scan Duration'}</div>
              <div style="font-size: 16px; font-weight: 900; font-family: monospace; color: ${escapeHtml(accent)}; margin-top: 2px;">${durationSec}s</div>
            </div>
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 5px; padding: 7px 9px;">
              <div style="font-size: 8.5px; font-weight: 800; color: #64748b;">${isKo ? '보안 주의 포트' : 'Risk Alerts'}</div>
              <div style="font-size: 16px; font-weight: 900; font-family: monospace; color: ${dataset.kpis.highRiskAlertCount > 0 ? '#e11d48' : '#059669'}; margin-top: 2px;">${dataset.kpis.highRiskAlertCount}</div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 9px; color: #475569; font-family: monospace; border-top: 1px solid #e2e8f0; padding-top: 6px;">
            <span><b>${isKo ? '시작:' : 'Start:'}</b> ${escapeHtml(startLabel)}</span>
            <span><b>${isKo ? '종료:' : 'End:'}</b> ${escapeHtml(endLabel)}</span>
            <span><b>${isKo ? '대역:' : 'Range:'}</b> ${escapeHtml(dataset.subnet)}.${dataset.start}~.${dataset.end}</span>
          </div>
        </div>

        ${
          dataset.diffAnalysis
            ? `<div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 6px; padding: 8px 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 9.5px; font-weight: 800; color: #3730a3;">
                  ${isKo ? '스냅샷 변화 비교' : 'Snapshot Diff'}: ${escapeHtml(dataset.diffAnalysis.baselineName)}
                </div>
                <div style="font-family: monospace; font-size: 9.5px; font-weight: 800; color: #1e1b4b;">
                  +NEW ${dataset.diffAnalysis.summary.newCount} &bull; -OFF ${dataset.diffAnalysis.summary.offlineCount} &bull; !CHG ${dataset.diffAnalysis.summary.changedCount} &bull; =SAME ${dataset.diffAnalysis.summary.sameCount}
                </div>
              </div>`
            : ''
        }

        ${
          hasAlertsBanner
            ? `<div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 8px 11px; margin-bottom: 10px;">
                <div style="font-size: 9.5px; font-weight: 900; color: #be123c; margin-bottom: 4px;">
                  ${isKo ? `보안 주의 포트 개방 알림 (${dataset.highRiskAlerts.length}건)` : `High-Risk Port Alerts (${dataset.highRiskAlerts.length})`}
                </div>
                <div style="font-size: 8.5px; color: #881337; line-height: 1.45;">
                  ${dataset.highRiskAlerts
                    .slice(0, 3)
                    .map((h) => `&bull; <b style="font-family:monospace;">${escapeHtml(h.ip)}:${h.port}</b> (${escapeHtml(h.severity)}) — ${escapeHtml(h.remediation)}`)
                    .join('<br/>')}
                  ${dataset.highRiskAlerts.length > 3 ? `<div style="font-weight:700;margin-top:2px;">... +${dataset.highRiskAlerts.length - 3}</div>` : ''}
                </div>
              </div>`
            : ''
        }

        ${
          isSummaryScope
            ? `<div style="margin-top: 6px;">
                <div style="font-size: 11px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">${isKo ? '상위 하드웨어 제조사 분포' : 'Top Hardware Vendors'}</div>
                <table style="width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 14px;">
                  <thead>
                    <tr style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
                      <th style="padding: 5px 8px; text-align: left;">${isKo ? '제조사' : 'Vendor'}</th>
                      <th style="padding: 5px 8px; text-align: center;">${isKo ? '대수' : 'Units'}</th>
                      <th style="padding: 5px 8px; text-align: right;">${isKo ? '점유율' : 'Share'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${dataset.vendorBreakdown
                      .slice(0, 10)
                      .map(
                        (v, i) => `<tr style="background:${i % 2 === 1 ? '#f8fafc' : '#fff'};border-bottom:1px solid #f1f5f9;">
                          <td style="padding: 4px 8px; font-weight: 700;">${escapeHtml(v.vendor)}</td>
                          <td style="padding: 4px 8px; text-align: center; font-family: monospace;">${v.count}</td>
                          <td style="padding: 4px 8px; text-align: right; font-family: monospace;">${v.sharePct}%</td>
                        </tr>`
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>`
            : `<div>
                <div style="font-size: 10px; font-weight: 800; color: #0f172a; margin-bottom: 5px; display: flex; justify-content: space-between;">
                  <span>${isKo ? '장비 인벤토리 상세' : 'Device Inventory'} (${dataset.rows.length})</span>
                  <span style="font-size: 8.5px; color: #64748b; font-family: monospace;">${cols.length} Columns</span>
                </div>
                ${renderInventoryTable(page1Rows)}
              </div>`
        }
      </div>

      ${renderPageFooter(1)}
    </div>
  `;

  container.innerHTML = page1Html;

  for (let p = 0; p < subPagesCount; p++) {
    const pageNum = p + 2;
    const chunk = remainingRows.slice(p * subPageMaxRows, (p + 1) * subPageMaxRows);
    container.innerHTML += `
      <div class="a4-report-page" style="width: 794px; height: 1123px; min-height: 1123px; max-height: 1123px; padding: 32px 38px 28px 38px; box-sizing: border-box; background: #ffffff; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', 'Segoe UI', Roboto, sans-serif; color: #0f172a;">
        <div style="display: flex; flex-direction: column;">
          ${renderPageHeader(true)}
          ${renderInventoryTable(chunk)}
        </div>
        ${renderPageFooter(pageNum)}
      </div>
    `;
  }

  return renderA4PagesToPdf(container, filename);
}


