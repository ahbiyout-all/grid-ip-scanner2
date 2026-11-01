/**
 * Grid IP Scanner2 - Native Modules Diagnostics & Acceleration Modal
 * Displays real-time status of the 6 specialized native DLL modules and allows live testing.
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

import React, { useState, useEffect } from 'react';
import { X, Cpu, CheckCircle2, AlertCircle, RefreshCw, Zap, Shield, Search, Terminal, Globe, Server } from 'lucide-react';
import { NativeModulesStatus, NativeDiscoveryResult, NativeOsDetectResult, NativeArpSpoofResult } from '../types';
import {
  fetchNativeModulesStatus,
  fetchDeepDiscovery,
  detectHostOS,
  checkArpSpoofing,
} from '../services/nativeModulesService';

interface NativeModulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'gray' | 'beige';
  currentSelectedIp?: string;
  currentSelectedMac?: string;
}

export const NativeModulesModal: React.FC<NativeModulesModalProps> = ({
  isOpen,
  onClose,
  theme = 'dark',
  currentSelectedIp = '192.168.0.1',
  currentSelectedMac = '',
}) => {
  const [status, setStatus] = useState<NativeModulesStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [testIp, setTestIp] = useState(currentSelectedIp);
  const [testMac, setTestMac] = useState(currentSelectedMac);
  const [testOutput, setTestOutput] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    const s = await fetchNativeModulesStatus();
    setStatus(s);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      if (currentSelectedIp) setTestIp(currentSelectedIp);
      if (currentSelectedMac) setTestMac(currentSelectedMac);
    }
  }, [isOpen, currentSelectedIp, currentSelectedMac]);

  if (!isOpen) return null;

  const modules = [
    {
      id: 'probe',
      name: 'grid_probe_engine.dll',
      title: '초고속 비동기 ICMP & L2 ARP 엔진',
      active: status?.probeEngine ?? false,
      desc: 'Win32 IcmpSendEcho2 커널 큐 및 Direct SendARP를 통해 방화벽 차단 기기를 100% 탐지하고 0.1ms 속도로 MAC을 해소합니다.',
      features: ['IcmpSendEcho2 비동기 큐', 'Direct L2 SendARP', '서브밀리초 RTT'],
      tag: 'Phase 1 Core',
    },
    {
      id: 'port',
      name: 'grid_port_iocp.dll',
      title: 'IOCP 기반 고동시성 포트 스캐너',
      active: status?.portIocp ?? false,
      desc: 'Windows I/O Completion Port 스레드 풀을 통해 수천 개 포트를 0.3초 내에 동시 검사하고 RST 패킷을 즉각 감지합니다.',
      features: ['Win32 IOCP 워커 풀', '논블로킹 ConnectEx', 'Zero-overhead RST 감지'],
      tag: 'Phase 3 Infra',
    },
    {
      id: 'discovery',
      name: 'grid_discovery.dll',
      title: '로컬 멀티캐스트 서비스 디스커버리',
      active: status?.discovery ?? false,
      desc: 'mDNS (5353), SSDP/UPnP (1900), NetBIOS (137), LLMNR (5355) 패킷을 분석하여 IoT, TV, 프린터의 모델명을 자동 파싱합니다.',
      features: ['Apple Bonjour (mDNS)', 'SSDP/UPnP M-SEARCH', 'NetBIOS Node Status'],
      tag: 'Phase 2 Smart',
    },
    {
      id: 'trie',
      name: 'grid_oui_trie.dll',
      title: '10만+ IEEE OUI Radix-Trie 색인',
      active: status?.ouiTrie ?? false,
      desc: '16-ary Nibble Radix-Trie 바이너리 인메모리 색인으로 MAC 주소 제조사를 1마이크로초(<1µs, O(1)) 이내에 초고속 검색합니다.',
      features: ['16-ary Nibble Trie', '1µs 미만 Zero-Alloc 검색', 'MA-L/M/S 접두사 지원'],
      tag: 'Phase 2 Memory',
    },
    {
      id: 'banner',
      name: 'grid_banner_grabber.dll',
      title: '심층 프로토콜 배너 및 메타데이터 추출기',
      active: status?.bannerGrabber ?? false,
      desc: 'HTTP Server 헤더, HTML Title, SSH-2.0 식별자, RTSP 카메라 스트림, TLS/SSL ServerHello 메타데이터를 수집합니다.',
      features: ['HTTP Server & Title', 'SSH-2.0 배너 파서', 'RTSP 스트림 & TLS SNI'],
      tag: 'Phase 3 Service',
    },
    {
      id: 'pcap',
      name: 'grid_pcap_analyzer.dll',
      title: '패킷 핑거프린팅 & 이상 패킷 감지',
      active: status?.pcapAnalyzer ?? false,
      desc: 'TCP SYN-ACK 패킷의 초기 TTL과 Window Size를 분석하여 OS(Linux/Windows/Cisco)를 식별하고 ARP 스푸핑을 탐지합니다.',
      features: ['TTL/Window OS 식별', 'ARP 스푸핑 공격 감지', 'Npcap 동적 로딩'],
      tag: 'Phase 4 Security',
    },
  ];

  const handleTestDiscovery = async () => {
    setIsTesting(true);
    setTestOutput(`[*] ${testIp} 대상으로 mDNS/SSDP/NetBIOS 멀티캐스트 탐색 요청 중...`);
    const res = await fetchDeepDiscovery(testIp);
    if (res && res.protocolsDiscovered > 0) {
      setTestOutput(
        `[OK] 디스커버리 성공!\n` +
        `• 호스트명: ${res.hostname || 'None'}\n` +
        `• 모델명: ${res.modelName || 'None'}\n` +
        `• 제조사: ${res.manufacturer || 'None'}\n` +
        `• 작업그룹: ${res.workgroup || 'None'}\n` +
        `• 서비스: ${res.serviceType || 'None'}\n` +
        `• 감지 프로토콜 비트: 0x${res.protocolsDiscovered.toString(16)}`
      );
    } else {
      setTestOutput(`[-] ${testIp}: 멀티캐스트 응답 없음 (호스트가 방화벽 또는 해당 프로토콜 미사용)`);
    }
    setIsTesting(false);
  };

  const handleTestOS = async () => {
    setIsTesting(true);
    setTestOutput(`[*] ${testIp} 대상 TCP SYN-ACK & ICMP TTL OS 핑거프린팅 분석 중...`);
    const res = await detectHostOS(testIp);
    if (res) {
      setTestOutput(
        `[OK] OS 핑거프린팅 결과:\n` +
        `• 추정 OS: ${res.osName}\n` +
        `• 캡처된 TTL: ${res.ttl}\n` +
        `• 분석 상태: ${res.supported ? '정밀 감지 완료' : '일반 표준 노드'}`
      );
    } else {
      setTestOutput(`[-] ${testIp}: OS 핑거프린팅 패킷 응답 시간 초과`);
    }
    setIsTesting(false);
  };

  const handleTestSpoof = async () => {
    if (!testMac) {
      setTestOutput('[!] MAC 주소를 입력해주세요.');
      return;
    }
    setIsTesting(true);
    setTestOutput(`[*] ${testIp} (${testMac}) L2 ARP 패킷 무결성 및 스푸핑 검증 중...`);
    const res = await checkArpSpoofing(testIp, testMac);
    if (res) {
      setTestOutput(
        `[OK] ARP 검증 결과:\n` +
        `• 이상 징후 감지: ${res.spoofingDetected ? '⚠️ 경고 (스푸핑 의심)' : '✅ 정상 (안전)'}\n` +
        `• 진단 내용: ${res.alert}`
      );
    }
    setIsTesting(false);
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border ${
        theme === 'beige' ? 'bg-[#fcf8f2] text-[#5c4a37] border-[#d4be9c]' : 'bg-zinc-900 text-zinc-100 border-zinc-800'
      } overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg tracking-tight">
                  Grid IP Scanner2 네이티브 가속 엔진 허브
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  C / Win32 Native DLLs
                </span>
              </div>
              <p className="text-xs opacity-70 mt-0.5">
                로드맵에 정의된 6대 전용 가속 DLL 모듈의 런타임 상태 및 다이렉트 커널 진단
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadStatus}
              disabled={loading}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-sky-400 border border-white/10 transition-colors"
              title="상태 새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 opacity-70 hover:opacity-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Modules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {modules.map((m) => (
              <div
                key={m.id}
                className={`p-4 rounded-xl border transition-all ${
                  m.active
                    ? 'border-emerald-500/40 bg-emerald-500/5 shadow-md shadow-emerald-500/5'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-black text-sky-400">{m.name}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white/10 opacity-80">
                        {m.tag}
                      </span>
                    </div>
                    <h4 className="font-black text-sm mt-1">{m.title}</h4>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    {m.active ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        로드됨
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-zinc-700 text-zinc-300 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        폴백 가동
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs opacity-75 leading-relaxed mb-3">{m.desc}</p>

                <div className="flex flex-wrap gap-1.5">
                  {m.features.map((f, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-black/30 border border-white/5 opacity-85"
                    >
                      • {f}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Native Diagnostics Console */}
          <div className="p-4 rounded-xl border border-sky-500/30 bg-black/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-sky-400" />
                <h4 className="font-black text-xs uppercase tracking-wider text-sky-400">
                  실시간 네이티브 모듈 진단 콘솔 (Live Probe)
                </h4>
              </div>
              <span className="text-[10px] opacity-60 font-mono">Kernel Direct FFI Bridge</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="opacity-70 font-mono">IP:</span>
                <input
                  type="text"
                  value={testIp}
                  onChange={(e) => setTestIp(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 font-mono text-xs focus:outline-none focus:border-sky-500"
                  placeholder="192.168.0.1"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-70 font-mono">MAC:</span>
                <input
                  type="text"
                  value={testMac}
                  onChange={(e) => setTestMac(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 font-mono text-xs focus:outline-none focus:border-sky-500"
                  placeholder="00:11:22:33:44:55"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={handleTestDiscovery}
                disabled={isTesting || !testIp}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>mDNS/SSDP 디스커버리</span>
              </button>
              <button
                onClick={handleTestOS}
                disabled={isTesting || !testIp}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>OS 핑거프린팅</span>
              </button>
              <button
                onClick={handleTestSpoof}
                disabled={isTesting || !testIp || !testMac}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>ARP 스푸핑 검증</span>
              </button>
            </div>

            {testOutput && (
              <pre className="mt-2 p-3 rounded-lg bg-black/60 border border-white/10 text-emerald-400 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                {testOutput}
              </pre>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs shrink-0 bg-black/20">
          <div className="opacity-60 text-[11px]">
            * Windows 환경에서는 C/Win32 커널 DLL이 직접 호출되며, 기타 환경은 Go 고속 소켓 스택으로 그레이스풀 폴백됩니다.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 font-black transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
