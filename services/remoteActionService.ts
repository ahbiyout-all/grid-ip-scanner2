import { RemoteActionType, RemoteActionResult } from '../types';

export const executeRemoteAction = async (ip: string, action: RemoteActionType, port?: number): Promise<RemoteActionResult> => {
  const cleanIp = ip.trim();
  if (!cleanIp) {
    return { success: false, action, message: '유효한 IP 주소가 아닙니다.' };
  }

  // 1. Web browser actions
  if (action === 'web') {
    const webPort = port && port !== 80 ? `:${port}` : '';
    const targetUrl = `http://${cleanIp}${webPort}`;
    try {
      const link = document.createElement('a');
      link.href = targetUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (_) {
      window.location.href = targetUrl;
    }
    return {
      success: true,
      action,
      message: `웹 관리자 페이지로 이동합니다: ${targetUrl}`,
      command: `http://${cleanIp}${webPort}`
    };
  }

  if (action === 'web_ssl') {
    const webPort = port && port !== 443 ? `:${port}` : '';
    const targetUrl = `https://${cleanIp}${webPort}`;
    try {
      const link = document.createElement('a');
      link.href = targetUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (_) {
      window.location.href = targetUrl;
    }
    return {
      success: true,
      action,
      message: `보안 웹(HTTPS) 페이지로 이동합니다: ${targetUrl}`,
      command: `https://${cleanIp}${webPort}`
    };
  }

  // 2. System client actions via Go Backend / Native shell execution
  try {
    const res = await fetch(`/api/remote-action?action=${action}&ip=${encodeURIComponent(cleanIp)}${port ? `&port=${port}` : ''}`, {
      method: 'POST'
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        return {
          success: true,
          action,
          message: data.message || `원격 실행 명령이 전달되었습니다: ${data.command || action}`,
          command: data.command
        };
      }
    }
  } catch (e) {
    // Backend API failed or running in pure web mode - perform protocol fallback
  }

  // 3. Browser-side protocol fallback
  switch (action) {
    case 'rdp': {
      // Generate a dynamic temporary .rdp file download for instant one-click connection
      const rdpContent = `full address:s:${cleanIp}${port ? `:${port}` : ''}\r\nprompt for credentials:i:1\r\nadministrative session:i:1\r\n`;
      const blob = new Blob([rdpContent], { type: 'application/x-rdp' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `connect_${cleanIp.replace(/\./g, '_')}.rdp`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return {
        success: true,
        action,
        message: `원격 데스크톱(RDP) 연결 파일(.rdp)이 생성되었습니다 (mstsc /v:${cleanIp}).`,
        command: `mstsc.exe /v:${cleanIp}`
      };
    }

    case 'ssh': {
      const sshUrl = `ssh://root@${cleanIp}${port && port !== 22 ? `:${port}` : ''}`;
      window.location.href = sshUrl;
      return {
        success: true,
        action,
        message: `기본 SSH 클라이언트(터미널/PuTTY)를 호출합니다: ${sshUrl}`,
        command: `ssh root@${cleanIp}`
      };
    }

    case 'smb': {
      const smbPath = `\\\\${cleanIp}`;
      // In Windows browser, try file protocol or clipboard copy
      try {
        navigator.clipboard?.writeText(smbPath);
      } catch (_) {}
      return {
        success: true,
        action,
        message: `SMB 공유 폴더 경로 (${smbPath})가 클립보드에 복사되었습니다. 파일 탐색기 주소창에 붙여넣어 연결하세요.`,
        command: `explorer.exe ${smbPath}`
      };
    }

    case 'ping': {
      return {
        success: true,
        action,
        message: `Ping 진단 명령: ping -t ${cleanIp}`,
        command: `ping -t ${cleanIp}`
      };
    }

    case 'traceroute': {
      return {
        success: true,
        action,
        message: `경로 추적 명령: tracert -d ${cleanIp}`,
        command: `tracert -d ${cleanIp}`
      };
    }

    default:
      return {
        success: false,
        action,
        message: '지원되지 않는 원격 동작입니다.'
      };
  }
};
