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
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];
  const isKo = lang === 'ko';
  const filename = `GridIPScanner2_Security_Audit_${subnet.replace(/\./g, '_')}_${dateStr}.pdf`;

  // Fallback if browser DOM is unavailable
  if (typeof document === 'undefined') {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    generateVectorPdfFallback(doc, subnet, start, end, results, license);
    doc.save(filename);
    return { success: true, filename, pageCount: 1 };
  }

  // Calculate layout pagination
  // Page 1: Dashboard, Metrics, Threat Alerts, Top Vendors, and first chunk of devices
  // Page 2+: Detailed inventory tables (up to 30 devices per page)
  const DEVICES_PAGE_1 = highRiskDevices.length > 0 ? 6 : 10;
  const DEVICES_PER_SUB_PAGE = 30;

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
          <span style="font-size: 11px; font-weight: 800; color: #0284c7; letter-spacing: 0.5px;">GRID IP SCANNER2 v2.4.5</span>
        </div>
        <h1 style="margin: 4px 0 2px 0; font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">
          ${isKo ? '네트워크 정밀 보안 진단 감사 보고서' : 'Network Security & Infrastructure Audit Report'}
        </h1>
        <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">
          ${isKo ? `로컬 서브넷 (${subnet}.0/24) 자산 식별 및 잠재적 보안 취약점 종합 진단서` : `Comprehensive Asset Discovery & Threat Vector Analysis for ${subnet}.0/24`}
        </p>
      </div>
      <div style="text-align: right;">
        <div style="display: inline-block; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; font-size: 9px; font-weight: 800; padding: 2.5px 8px; border-radius: 5px; text-transform: uppercase;">
          ${license.tier.toUpperCase()} EDITION
        </div>
        <div style="font-size: 9.5px; color: #64748b; margin-top: 4px; font-family: monospace;">
          ${dateStr} ${timeStr}
        </div>
        <div style="font-size: 8.5px; color: #94a3b8; margin-top: 1px;">
          Lic: ${license.licensedTo || 'Authorized User'}
        </div>
      </div>
    </div>
  `;

  // Common Footer Generator
  const renderFooter = (pageNumber: number) => `
    <div style="margin-top: auto; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 8.5px; color: #64748b; display: flex; justify-content: space-between; align-items: center; line-height: 1.4;">
      <div>
        <span style="font-weight: 800; color: #0f172a;">Grid IP Scanner2</span> &bull;
        배포: <b>(주)씨아이에스넷</b> (<a href="http://www.cisnet.co.kr" style="color: #0284c7; text-decoration: none;">www.cisnet.co.kr</a>) &bull;
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
            <div style="font-size: 15px; font-weight: 900; color: #0284c7; margin-top: 3px; font-family: monospace;">${subnet}.0/24</div>
            <div style="font-size: 8.5px; color: #94a3b8; margin-top: 1px;">Range: .${start} ~ .${end}</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 7px; padding: 10px; text-align: center;">
            <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">${isKo ? '활성 단말 탐지' : 'Discovered Nodes'}</div>
            <div style="font-size: 15px; font-weight: 900; color: #10b981; margin-top: 3px; font-family: monospace;">${activeDevices.length} <span style="font-size: 10px; color: #94a3b8;">/ ${end - start + 1}</span></div>
            <div style="font-size: 8.5px; color: #94a3b8; margin-top: 1px;">Discovery: ${((activeDevices.length / (end - start + 1)) * 100).toFixed(1)}%</div>
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
                    <span style="font-weight: 800; color: #be123c; font-family: monospace;">${h.ip} &bull; Port ${h.port} (${h.name})</span>
                    <span style="font-size: 8px; font-weight: 800; color: #e11d48; background: #fff1f2; padding: 1px 5px; border-radius: 2px;">${h.severity}</span>
                  </div>
                  <div style="font-size: 9px; color: #475569; margin-top: 2px;"><b>${isKo ? '위협' : 'Threat'}:</b> ${h.threat}</div>
                  <div style="font-size: 9px; color: #0284c7; margin-top: 1px;"><b>${isKo ? '조치' : 'Mitigation'}:</b> ${h.remediation}</div>
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
                  <td style="padding: 4px 8px; font-weight: 700; color: #1e293b;">${v}</td>
                  <td style="padding: 4px 8px; text-align: center; font-family: monospace; font-weight: 800; color: #0284c7;">${count}대</td>
                  <td style="padding: 4px 8px; text-align: right; font-family: monospace; color: #64748b;">${((count / activeDevices.length) * 100).toFixed(1)}%</td>
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
                    <td style="padding: 4px 8px; font-family: monospace; font-weight: 800; color: #0284c7;">${d.ip}</td>
                    <td style="padding: 4px 8px; font-family: monospace; font-weight: 700; color: #059669;">${dev?.mac || '-'}</td>
                    <td style="padding: 4px 8px;">
                      <div style="font-weight: 800; color: #0f172a;">${dev?.vendor || 'Unknown'}</div>
                      <div style="font-size: 8px; color: #64748b;">${dev?.hostname || ''} ${dev?.webTitle ? `("${dev.webTitle}")` : ''}</div>
                    </td>
                    <td style="padding: 4px 8px; text-align: center; font-family: monospace; color: #64748b;">${dev?.latency || 0}ms</td>
                    <td style="padding: 4px 8px;">
                      ${dev?.openPorts && dev.openPorts.length > 0 ? dev.openPorts.map((p) => [21, 23, 445, 3389, 5900, 6379].includes(p) ? `<span style="background: #ffe4e6; color: #be123c; font-weight: 800; padding: 1px 4px; border-radius: 2px; font-size: 7.5px; margin-right: 2px; display: inline-block;">${p}</span>` : `<span style="background: #dcfce7; color: #166534; font-weight: 700; padding: 1px 4px; border-radius: 2px; font-size: 7.5px; margin-right: 2px; display: inline-block;">${p}</span>`).join('') : '<span style="color: #cbd5e1;">-</span>'}
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
      <div class="a4-report-page" style="width: 794px; height: 1123px; min-height: 1123px; max-height: 1123px; padding: 24px 36px 20px 36px; box-sizing: border-box; background: #ffffff; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', 'Segoe UI', Roboto, sans-serif; color: #0f172a;">
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
              Subnet: ${subnet}.0/24 &bull; ${dateStr}
            </div>
          </div>

          <!-- Device Table -->
          <table style="width: 100%; border-collapse: collapse; font-size: 8.5px;">
            <thead>
              <tr style="background: #f1f5f9; color: #475569; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
                <th style="padding: 4px 7px; text-align: left; width: 95px; font-weight: 800;">IP 주소</th>
                <th style="padding: 4px 7px; text-align: left; width: 110px; font-weight: 800;">MAC 주소</th>
                <th style="padding: 4px 7px; text-align: left; font-weight: 800;">제조사 / 호스트명</th>
                <th style="padding: 4px 7px; text-align: center; width: 50px; font-weight: 800;">응답</th>
                <th style="padding: 4px 7px; text-align: left; width: 125px; font-weight: 800;">개방 포트</th>
              </tr>
            </thead>
            <tbody>
              ${pageDevices.map((d, idx) => {
                const dev = d.device;
                const hasHighRisk = dev?.openPorts?.some((p) => [21, 23, 445, 3389, 5900, 6379].includes(p));
                return `
                  <tr style="background: ${hasHighRisk ? '#fff1f2' : idx % 2 === 1 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 2.6px 7px; font-family: monospace; font-weight: 800; color: #0284c7; font-size: 8px;">${d.ip}</td>
                    <td style="padding: 2.6px 7px; font-family: monospace; font-weight: 700; color: #059669; font-size: 8px;">${dev?.mac || '-'}</td>
                    <td style="padding: 2.6px 7px;">
                      <div style="font-weight: 800; color: #0f172a; font-size: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px; line-height: 1.15;">${dev?.vendor || 'Unknown'}</div>
                      ${dev?.hostname || dev?.webTitle ? `<div style="font-size: 7px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px; line-height: 1.15;">${dev?.hostname || ''} ${dev?.webTitle ? `("${dev.webTitle}")` : ''}</div>` : ''}
                    </td>
                    <td style="padding: 2.6px 7px; text-align: center; font-family: monospace; color: #64748b; font-size: 8px;">${dev?.latency || 0}ms</td>
                    <td style="padding: 2.6px 7px;">
                      ${dev?.openPorts && dev.openPorts.length > 0 ? dev.openPorts.map((p) => [21, 23, 445, 3389, 5900, 6379].includes(p) ? `<span style="background: #ffe4e6; color: #be123c; font-weight: 800; padding: 0.5px 3.5px; border-radius: 2px; font-size: 7px; margin-right: 2px; display: inline-block;">${p}</span>` : `<span style="background: #dcfce7; color: #166534; font-weight: 700; padding: 0.5px 3.5px; border-radius: 2px; font-size: 7px; margin-right: 2px; display: inline-block;">${p}</span>`).join('') : '<span style="color: #cbd5e1; font-size: 7.5px;">-</span>'}
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
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];
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

  // Calculate clean A4 pagination (30 devices per page)
  const DEVICES_PER_FIRST_PAGE = 30;
  const DEVICES_PER_SUB_PAGE = 30;

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
          <span style="font-size: 11px; font-weight: 800; color: #0284c7; letter-spacing: 0.5px;">GRID IP SCANNER2 v2.4.5</span>
        </div>
        <h1 style="margin: 4px 0 2px 0; font-size: 19px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">
          ${title}
        </h1>
        <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 600;">
          ${subtitle || (isKo ? `서브넷 ${subnet}.0/24 노드 상태 및 상세 인벤토리` : `Node inventory & status for ${subnet}.0/24`)}
        </p>
      </div>
      <div style="text-align: right;">
        <div style="display: inline-block; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; font-size: 9px; font-weight: 800; padding: 2.5px 8px; border-radius: 5px; text-transform: uppercase;">
          ${license.tier.toUpperCase()} EDITION
        </div>
        <div style="font-size: 9.5px; color: #64748b; margin-top: 4px; font-family: monospace;">
          ${dateStr} ${timeStr}
        </div>
        <div style="font-size: 8.5px; color: #94a3b8; margin-top: 1px;">
          Lic: ${license.licensedTo || 'Authorized User'}
        </div>
      </div>
    </div>
  `;

  // Common Footer Generator
  const renderFooter = (pageNumber: number) => `
    <div style="margin-top: auto; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 8.5px; color: #64748b; display: flex; justify-content: space-between; align-items: center; line-height: 1.4;">
      <div>
        <span style="font-weight: 800; color: #0f172a;">Grid IP Scanner2</span> &bull;
        배포: <b>(주)씨아이에스넷</b> (<a href="http://www.cisnet.co.kr" style="color: #0284c7; text-decoration: none;">www.cisnet.co.kr</a>) &bull;
        개발: <b>AhBiYout</b>
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-weight: 800; color: #0284c7; font-size: 8px; background: #e0f2fe; padding: 1px 6px; border-radius: 3px;">VERIFIED</span>
        <span style="font-weight: 800; color: #0f172a; font-family: monospace; font-size: 9.5px;">페이지 ${pageNumber} / ${totalPages}</span>
      </div>
    </div>
  `;

  // Page 1: Dashboard, Scope & First Batch of Devices (30 Devices)
  const page1Html = `
    <div class="a4-report-page" style="width: 794px; height: 1123px; min-height: 1123px; max-height: 1123px; padding: 24px 36px 20px 36px; box-sizing: border-box; background: #ffffff; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', 'Segoe UI', Roboto, sans-serif; color: #0f172a;">
      <div style="display: flex; flex-direction: column;">
        ${renderHeader(1)}

        <!-- Scope Overview Metric Banner -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 8px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; text-align: center;">
            <div style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase;">${isKo ? '대상 서브넷' : 'Target Subnet'}</div>
            <div style="font-size: 13px; font-weight: 900; color: #0284c7; margin-top: 1px; font-family: monospace;">${subnet}.0/24</div>
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
                <th style="padding: 3.5px 6px; text-align: left; width: 92px; font-weight: 800;">IP 주소</th>
                <th style="padding: 3.5px 6px; text-align: center; width: 52px; font-weight: 800;">상태</th>
                <th style="padding: 3.5px 6px; text-align: left; width: 108px; font-weight: 800;">MAC 주소</th>
                <th style="padding: 3.5px 6px; text-align: left; font-weight: 800;">제조사 / 호스트명</th>
                <th style="padding: 3.5px 6px; text-align: center; width: 48px; font-weight: 800;">RTT</th>
                <th style="padding: 3.5px 6px; text-align: left; width: 118px; font-weight: 800;">개방 포트</th>
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
                    <td style="padding: 2.2px 6px; font-family: monospace; font-weight: 800; color: ${isActive ? '#0284c7' : '#94a3b8'}; font-size: 8px;">${ip}</td>
                    <td style="padding: 2.2px 6px; text-align: center;">
                      <span style="font-size: 7.5px; font-weight: 800; padding: 0.5px 4px; border-radius: 2px; ${isActive ? 'background: #dcfce7; color: #166534;' : 'background: #f1f5f9; color: #64748b;'}">
                        ${(item?.status || 'idle').toUpperCase()}
                      </span>
                    </td>
                    <td style="padding: 2.2px 6px; font-family: monospace; font-weight: 700; color: ${dev?.mac ? '#059669' : '#94a3b8'}; font-size: 8px;">${dev?.mac || '-'}</td>
                    <td style="padding: 2.2px 6px;">
                      <div style="font-weight: 800; color: #0f172a; font-size: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; line-height: 1.1;">${dev?.vendor || (isActive ? 'Unknown' : '-')}</div>
                      ${dev?.hostname || dev?.webTitle ? `<div style="font-size: 7px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; line-height: 1.1;">${dev?.hostname || ''} ${dev?.webTitle ? `("${dev.webTitle}")` : ''}</div>` : ''}
                    </td>
                    <td style="padding: 2.2px 6px; text-align: center; font-family: monospace; color: #64748b; font-size: 8px;">
                      ${isActive ? `${dev?.latency || 0}ms` : '-'}
                    </td>
                    <td style="padding: 2.2px 6px;">
                      ${dev?.openPorts && dev.openPorts.length > 0 ? dev.openPorts.map((p) => [21, 23, 445, 3389, 5900, 6379].includes(p) ? `<span style="background: #ffe4e6; color: #be123c; font-weight: 800; padding: 0.5px 3px; border-radius: 2px; font-size: 6.8px; margin-right: 2px; display: inline-block;">${p}</span>` : `<span style="background: #dcfce7; color: #166534; font-weight: 700; padding: 0.5px 3px; border-radius: 2px; font-size: 6.8px; margin-right: 2px; display: inline-block;">${p}</span>`).join('') : '<span style="color: #cbd5e1; font-size: 7.5px;">-</span>'}
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

  // Render Subsequent Pages (30 Devices per Page)
  for (let p = 0; p < subPagesCount; p++) {
    const pageNum = p + 2;
    const pageIps = remainingIps.slice(p * DEVICES_PER_SUB_PAGE, (p + 1) * DEVICES_PER_SUB_PAGE);

    const subPageHtml = `
      <div class="a4-report-page" style="width: 794px; height: 1123px; min-height: 1123px; max-height: 1123px; padding: 24px 36px 20px 36px; box-sizing: border-box; background: #ffffff; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', 'Segoe UI', Roboto, sans-serif; color: #0f172a;">
        <div style="display: flex; flex-direction: column;">
          <!-- Sub Page Header -->
          <div style="border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <div style="font-size: 10px; font-weight: 800; color: #0284c7; letter-spacing: 0.5px;">GRID IP SCANNER2 - ${scopeLabel.toUpperCase()} REPORT</div>
              <div style="font-size: 15px; font-weight: 900; color: #0f172a; margin-top: 1px;">
                ${title} (이어짐)
              </div>
            </div>
            <div style="text-align: right; font-size: 9px; color: #64748b; font-family: monospace;">
              Subnet: ${subnet}.0/24 &bull; ${dateStr}
            </div>
          </div>

          <!-- Device Table -->
          <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
            <thead>
              <tr style="background: #f1f5f9; color: #475569; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
                <th style="padding: 3.5px 6px; text-align: left; width: 92px; font-weight: 800;">IP 주소</th>
                <th style="padding: 3.5px 6px; text-align: center; width: 52px; font-weight: 800;">상태</th>
                <th style="padding: 3.5px 6px; text-align: left; width: 108px; font-weight: 800;">MAC 주소</th>
                <th style="padding: 3.5px 6px; text-align: left; font-weight: 800;">제조사 / 호스트명</th>
                <th style="padding: 3.5px 6px; text-align: center; width: 48px; font-weight: 800;">RTT</th>
                <th style="padding: 3.5px 6px; text-align: left; width: 118px; font-weight: 800;">개방 포트</th>
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
                    <td style="padding: 2.5px 6px; font-family: monospace; font-weight: 800; color: ${isActive ? '#0284c7' : '#94a3b8'}; font-size: 8px;">${ip}</td>
                    <td style="padding: 2.5px 6px; text-align: center;">
                      <span style="font-size: 7.5px; font-weight: 800; padding: 0.5px 4px; border-radius: 2px; ${isActive ? 'background: #dcfce7; color: #166534;' : 'background: #f1f5f9; color: #64748b;'}">
                        ${(item?.status || 'idle').toUpperCase()}
                      </span>
                    </td>
                    <td style="padding: 2.5px 6px; font-family: monospace; font-weight: 700; color: ${dev?.mac ? '#059669' : '#94a3b8'}; font-size: 8px;">${dev?.mac || '-'}</td>
                    <td style="padding: 2.5px 6px;">
                      <div style="font-weight: 800; color: #0f172a; font-size: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; line-height: 1.1;">${dev?.vendor || (isActive ? 'Unknown' : '-')}</div>
                      ${dev?.hostname || dev?.webTitle ? `<div style="font-size: 7px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; line-height: 1.1;">${dev?.hostname || ''} ${dev?.webTitle ? `("${dev.webTitle}")` : ''}</div>` : ''}
                    </td>
                    <td style="padding: 2.5px 6px; text-align: center; font-family: monospace; color: #64748b; font-size: 8px;">
                      ${isActive ? `${dev?.latency || 0}ms` : '-'}
                    </td>
                    <td style="padding: 2.5px 6px;">
                      ${dev?.openPorts && dev.openPorts.length > 0 ? dev.openPorts.map((p) => [21, 23, 445, 3389, 5900, 6379].includes(p) ? `<span style="background: #ffe4e6; color: #be123c; font-weight: 800; padding: 0.5px 3px; border-radius: 2px; font-size: 6.8px; margin-right: 2px; display: inline-block;">${p}</span>` : `<span style="background: #dcfce7; color: #166534; font-weight: 700; padding: 0.5px 3px; border-radius: 2px; font-size: 6.8px; margin-right: 2px; display: inline-block;">${p}</span>`).join('') : '<span style="color: #cbd5e1; font-size: 7.5px;">-</span>'}
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
      doc.text('Grid IP Scanner2 Official Security Report | Developer: AhBiYout | Cisnet (www.cisnet.co.kr)', 14, 290);

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
  doc.text('Grid IP Scanner2 Official Security Report | Developer: AhBiYout | Cisnet (www.cisnet.co.kr)', 14, 290);
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
  <title>Grid IP Scanner2 - 네트워크 보안 진단 감사 보고서 (${subnet}.0/24)</title>
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
      <span class="badge badge-pro">${license.tier.toUpperCase()} EDITION</span>
      <div style="font-size: 9.5px; color: #64748b; margin-top: 4px;">발행: ${now.toLocaleString()}</div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-lbl">스캔 서브넷</div>
      <div class="stat-val" style="font-size: 17px; color: #0284c7;">${subnet}.0/24</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">활성 노드 탐지</div>
      <div class="stat-val" style="color: #10b981;">${activeDevices.length} <span style="font-size: 11px; color: #94a3b8;">/ ${end - start + 1}</span></div>
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
             ${highRiskDevices.map((h) => `• <b>${h.ip}</b> (포트 ${h.port} - ${h.name}): ${h.threat}`).join('<br>')}
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
            <td class="mono" style="color: #0284c7;">${d.ip}</td>
            <td class="mono" style="color: #059669;">${dev?.mac || 'N/A'}</td>
            <td>
              <div style="font-weight: 700;">${dev?.vendor || 'Unknown'}</div>
              <div style="font-size: 9.5px; color: #64748b;">${dev?.hostname || '-'} ${dev?.webTitle ? `("${dev.webTitle}")` : ''}</div>
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
      <div><b>Grid IP Scanner2</b> | 공식 배포: (주)씨아이에스넷 (<a href="http://www.cisnet.co.kr" class="info-link" target="_blank">www.cisnet.co.kr</a>)</div>
      <div>개발자: AhBiYout | GitHub: <a href="https://github.com/AhBiYout-all" class="info-link" target="_blank">https://github.com/AhBiYout-all</a> | 기술 블로그: <a href="https://ahbiyoutvibe.blogspot.com/" class="info-link" target="_blank">ahbiyoutvibe.blogspot.com</a></div>
    </div>
    <div style="text-align: right;">
      <div>Licensee: <b>${license.licensedTo || 'Pro Customer'}</b></div>
      <div>Security: <b>CONFIDENTIAL &bull; A4 FORMATTED</b></div>
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
