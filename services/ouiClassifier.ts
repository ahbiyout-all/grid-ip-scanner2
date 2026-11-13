export type OUIBlockType = 'MA-L' | 'MA-M' | 'MA-S' | 'LAA' | 'LAA-VM' | 'PRIVATE' | 'UNKNOWN';

export type DeviceCategoryId =
  | 'windows'
  | 'macos'
  | 'apple_mobile'
  | 'android'
  | 'linux'
  | 'vm'
  | 'iot'
  | 'cctv'
  | 'media'
  | 'router'
  | 'nas'
  | 'printer'
  | 'console'
  | 'generic';

export interface ClassificationEvidence {
  source: 'OUI' | 'LAA' | 'CHIPSET' | 'PORT' | 'MDNS' | 'UPNP' | 'HOSTNAME' | 'WEB' | 'GATEWAY';
  detail: string;
  weight: number;
}

export interface MacStructureAnalysis {
  cleanMac: string;
  ouiPrefix: string;
  ouiBlockType: OUIBlockType;
  isRandomizedMac: boolean;
  isMulticast: boolean;
  knownVirtualNicVendor?: string;
}

export interface HybridClassificationContext {
  ip?: string;
  hostname?: string;
  mdns?: string;
  webTitle?: string;
  upnp?: string;
  snmp?: string;
  mac?: string;
  httpHeaders?: string;
  realVendor?: string;
  chipsetVendor?: string;
  vendorSource?: string;
  ouiBlockType?: string;
  ouiPrefix?: string;
  isRandomizedMac?: boolean;
  lang?: 'ko' | 'en';
}

export interface HybridClassificationResult {
  type: string;
  os: string;
  model?: string;
  deviceCategory: DeviceCategoryId;
  realVendor?: string;
  chipsetVendor?: string;
  vendorSource?: string;
  realVendorConfidence: number;
  chipsetConfidence: number;
  confidenceScore: number;
  priorityRank: number;
  ouiBlockType: OUIBlockType;
  ouiPrefix: string;
  isRandomizedMac: boolean;
  isChipsetOem: boolean;
  classificationReasons: ClassificationEvidence[];
}

const KNOWN_VIRTUAL_PREFIXES: Record<string, { vendor: string; label: string }> = {
  '525400': { vendor: 'QEMU / KVM Virtual NIC', label: 'QEMU/KVM' },
  '0242AC': { vendor: 'Docker Container Bridge', label: 'Docker' },
  '0242': { vendor: 'Docker Container Bridge', label: 'Docker' },
  '0A0027': { vendor: 'Oracle VirtualBox Host-Only', label: 'VirtualBox' },
  '00155D': { vendor: 'Microsoft Hyper-V', label: 'Hyper-V' },
  '000569': { vendor: 'VMware, Inc.', label: 'VMware' },
  '000C29': { vendor: 'VMware, Inc.', label: 'VMware' },
  '001C14': { vendor: 'VMware, Inc.', label: 'VMware' },
  '005056': { vendor: 'VMware, Inc.', label: 'VMware' },
  '080027': { vendor: 'Oracle VirtualBox', label: 'VirtualBox' },
  '00163E': { vendor: 'XenSource / Xen Hypervisor', label: 'Xen' },
  '001C42': { vendor: 'Parallels Desktop', label: 'Parallels' },
};

function formatPrefix(hex: string): string {
  if (!hex) return '';
  const pairs: string[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    pairs.push(hex.slice(i, i + 2));
  }
  return pairs.join(':');
}

export function analyzeMacStructure(
  mac?: string,
  backendBlockType?: string,
  backendPrefix?: string,
  backendIsRandomized?: boolean,
  vendor?: string
): MacStructureAnalysis {
  const cleanMac = (mac || '').toUpperCase().replace(/[^0-9A-F]/g, '');
  if (cleanMac.length < 6) {
    return {
      cleanMac,
      ouiPrefix: backendPrefix || '',
      ouiBlockType: (backendBlockType as OUIBlockType) || 'UNKNOWN',
      isRandomizedMac: Boolean(backendIsRandomized),
      isMulticast: false,
    };
  }

  const firstByte = parseInt(cleanMac.slice(0, 2), 16);
  const isMulticast = (firstByte & 0x01) !== 0;
  const isLAA = (firstByte & 0x02) !== 0 && !isMulticast;

  const prefix6 = cleanMac.slice(0, 6);
  const prefix4 = cleanMac.slice(0, 4);
  const virtualMatch = KNOWN_VIRTUAL_PREFIXES[prefix6] || KNOWN_VIRTUAL_PREFIXES[prefix4];

  if (virtualMatch) {
    return {
      cleanMac,
      ouiPrefix: backendPrefix || formatPrefix(prefix6),
      ouiBlockType: isLAA ? 'LAA-VM' : ((backendBlockType as OUIBlockType) || 'MA-L'),
      isRandomizedMac: false,
      isMulticast,
      knownVirtualNicVendor: virtualMatch.vendor,
    };
  }

  if (backendIsRandomized || isLAA) {
    return {
      cleanMac,
      ouiPrefix: backendPrefix || formatPrefix(prefix6),
      ouiBlockType: 'LAA',
      isRandomizedMac: true,
      isMulticast,
    };
  }

  const lowerV = (vendor || '').toLowerCase();
  if (
    backendBlockType === 'PRIVATE' ||
    lowerV === 'private' ||
    lowerV.includes('ieee registration authority')
  ) {
    return {
      cleanMac,
      ouiPrefix: backendPrefix || formatPrefix(prefix6),
      ouiBlockType: 'PRIVATE',
      isRandomizedMac: false,
      isMulticast,
    };
  }

  let resolvedBlock: OUIBlockType = 'MA-L';
  if (backendBlockType === 'MA-S' || backendBlockType === 'MA-M' || backendBlockType === 'MA-L') {
    resolvedBlock = backendBlockType;
  } else if (lowerV === '' || lowerV.includes('unknown')) {
    resolvedBlock = 'UNKNOWN';
  }

  return {
    cleanMac,
    ouiPrefix: backendPrefix || formatPrefix(prefix6),
    ouiBlockType: resolvedBlock,
    isRandomizedMac: false,
    isMulticast,
  };
}

interface SemanticRule {
  keywords: string[];
  category: DeviceCategoryId;
  weight: number;
  isChipsetOem?: boolean;
  osHint?: string;
  labelKo: string;
  labelEn: string;
}

const OUI_SEMANTIC_RULES: SemanticRule[] = [
  // Virtualization Hypervisors
  {
    keywords: ['vmware', 'virtualbox', 'pcs systemtechnik', 'qemu', 'xen', 'xensource', 'parallels', 'hyper-v', 'proxmox', 'docker'],
    category: 'vm',
    weight: 46,
    osHint: 'Virtual Machine / Hypervisor',
    labelKo: '가상화 하이퍼바이저 OUI',
    labelEn: 'Virtualization Hypervisor OUI',
  },
  // IP Camera / CCTV / NVR
  {
    keywords: [
      'hikvision', 'hangzhou hikvision', 'dahua', 'zhejiang dahua', 'hanwha', 'samsung techwin',
      'axis communications', 'uniview', 'zhejiang uniview', 'reolink', 'foscam', 'amcrest',
      'vivotek', 'pelco', 'idis', 'lorex', 'ezviz', 'imou', 'tiandy', 'annke'
    ],
    category: 'cctv',
    weight: 44,
    osHint: 'Embedded Linux (IP Cam / NVR)',
    labelKo: 'CCTV / IP 카메라 전용 제조사 OUI',
    labelEn: 'Dedicated CCTV / IP Camera Vendor OUI',
  },
  // IoT & Smart Home Silicon / Brands
  {
    keywords: ['espressif', 'tuya', 'nordic semiconductor', 'silicon labs', 'wiznet', 'beken', 'winnermicro', 'hi-flying', 'usr iot'],
    category: 'iot',
    weight: 34,
    isChipsetOem: true,
    osHint: 'Embedded RTOS (IoT)',
    labelKo: 'IoT Wi-Fi/MCU 칩셋 모듈 OUI',
    labelEn: 'IoT Wi-Fi / MCU Silicon OUI',
  },
  {
    keywords: [
      'shelly', 'allterco', 'aqara', 'lumi united', 'sonoff', 'itead', 'signify', 'philips lighting',
      'switchbot', 'meross', 'broadlink', 'yeelight', 'roborock', 'dreame', 'ecobee', 'nabu casa',
      'raspberry pi', 'arduino', 'netatmo', 'ring llc', 'tado', 'govee', 'lifx', 'nanoleaf', 'smartthings', 'ewelink', 'tapo'
    ],
    category: 'iot',
    weight: 42,
    osHint: 'Embedded IoT / Smart Home',
    labelKo: '스마트홈 / IoT 전용 기기 OUI',
    labelEn: 'Smart Home / IoT Vendor OUI',
  },
  // Smart TV / Audio / Media Streaming
  {
    keywords: ['sonos', 'roku', 'bose', 'sound united', 'denon', 'marantz', 'onkyo', 'yamaha', 'lg innotek', 'chromecast', 'nvidia shield'],
    category: 'media',
    weight: 40,
    osHint: 'Smart TV / Media OS',
    labelKo: '스마트 미디어/오디오 OUI',
    labelEn: 'Smart Media / Audio OUI',
  },
  // Game Consoles
  {
    keywords: ['sony interactive', 'playstation', 'nintendo', 'xbox'],
    category: 'console',
    weight: 44,
    osHint: 'Console Firmware',
    labelKo: '게임 콘솔 전용 OUI',
    labelEn: 'Game Console OUI',
  },
  // NAS / Storage
  {
    keywords: ['synology', 'qnap', 'asustor', 'terramaster', 'ixsystems', 'truenas', 'buffalo', 'western digital'],
    category: 'nas',
    weight: 44,
    osHint: 'Linux (NAS)',
    labelKo: 'NAS / 네트워크 스토리지 OUI',
    labelEn: 'NAS Storage Vendor OUI',
  },
  // Network Printers
  {
    keywords: ['canon', 'epson', 'seiko epson', 'brother', 'fuji xerox', 'xerox', 'ricoh', 'kyocera', 'konica minolta', 'zebra technologies', 'lexmark', 'pantum'],
    category: 'printer',
    weight: 42,
    osHint: 'Embedded Print Engine',
    labelKo: '네트워크 프린터/복합기 OUI',
    labelEn: 'Printer / MFP Vendor OUI',
  },
  // Router / AP / Switches
  {
    keywords: [
      'efm networks', 'iptime', 'tp-link', 'ubiquiti', 'cisco', 'meraki', 'aruba',
      'mikrotik', 'netgear', 'd-link', 'zyxel', 'linksys', 'draytek', 'ruckus',
      'fortinet', 'juniper', 'new h3c', 'h3c', 'nokia shanghai bell', 'fiberhome',
      'micas networks', 'cambium', 'sonicwall', 'watchguard', 'peplink'
    ],
    category: 'router',
    weight: 40,
    osHint: 'Network OS / Embedded Linux',
    labelKo: '네트워크 인프라(공유기/AP/스위치) OUI',
    labelEn: 'Router / AP / Switch Vendor OUI',
  },
  // Generic NIC / Wi-Fi Chipset OEMs (must stay lightweight so Product/Port signals win)
  {
    keywords: [
      'realtek', 'intel', 'broadcom', 'qualcomm', 'mediatek', 'atheros', 'marvell',
      'murata', 'azurewave', 'liteon', 'lite-on', 'shenzhen bilian', 'fn-link',
      'chengdu merii', 'cybertan', 'gemtek', 'sparklan', 'foxconn', 'hon hai',
      'compal', 'quanta', 'wistron', 'pegatron', 'luxshare', 'universal scientific', 'texas instruments'
    ],
    category: 'windows',
    weight: 14,
    isChipsetOem: true,
    labelKo: '범용 네트워크 칩셋 OEM (완제품 추가 추론)',
    labelEn: 'Generic NIC Chipset OEM (Deferred to Protocol Signals)',
  },
  // Android Mobile Brands
  {
    keywords: ['xiaomi', 'oneplus', 'oppo', 'vivo', 'realme', 'honor device', 'motorola', 'nothing technology'],
    category: 'android',
    weight: 34,
    osHint: 'Android',
    labelKo: '모바일 단말 제조사 OUI',
    labelEn: 'Mobile Device Vendor OUI',
  },
  // Apple
  {
    keywords: ['apple'],
    category: 'apple_mobile',
    weight: 28,
    osHint: 'Apple iOS / macOS',
    labelKo: 'Apple 하드웨어 OUI',
    labelEn: 'Apple Hardware OUI',
  },
  // Samsung / LG Electronics (Multi-product: Mobile, TV, PC, Appliance)
  {
    keywords: ['samsung'],
    category: 'android',
    weight: 22,
    labelKo: 'Samsung 복합 제품군 OUI (포트/UPnP로 세부 판별)',
    labelEn: 'Samsung Multi-Product OUI',
  },
  {
    keywords: ['lg electronics'],
    category: 'media',
    weight: 20,
    labelKo: 'LG 전자 제품군 OUI (스마트TV/가전/PC)',
    labelEn: 'LG Electronics OUI',
  },
];

function extractSpecificAppleModel(corpus: string): { category: DeviceCategoryId; type: string; os: string; model: string } | null {
  const iphoneModelMatch = corpus.match(/iphone(\d+),(\d+)/i);
  if (iphoneModelMatch) {
    const major = parseInt(iphoneModelMatch[1], 10);
    let mappedModel = 'iPhone';
    if (major === 17) mappedModel = 'iPhone 16 Series';
    else if (major === 16) mappedModel = 'iPhone 15 Series';
    else if (major === 15) mappedModel = 'iPhone 14 Series';
    else if (major === 14) mappedModel = 'iPhone 13 Series';
    else if (major === 13) mappedModel = 'iPhone 12 Series';
    else if (major === 12) mappedModel = 'iPhone 11 Series';
    else if (major === 11) mappedModel = 'iPhone XS/XR';
    else if (major === 10) mappedModel = 'iPhone X/8';
    else if (major <= 9) mappedModel = 'iPhone (Legacy)';
    return { category: 'apple_mobile', type: 'iPhone', os: 'Apple iOS', model: mappedModel };
  }

  if (corpus.includes('iphone')) {
    let iphoneLabel = 'iPhone';
    if (corpus.includes('16 pro max') || corpus.includes('16promax')) iphoneLabel = 'iPhone 16 Pro Max';
    else if (corpus.includes('16 pro') || corpus.includes('16pro')) iphoneLabel = 'iPhone 16 Pro';
    else if (corpus.includes('16 plus') || corpus.includes('16plus')) iphoneLabel = 'iPhone 16 Plus';
    else if (corpus.includes('iphone 16') || corpus.includes('iphone16')) iphoneLabel = 'iPhone 16';
    else if (corpus.includes('15 pro max') || corpus.includes('15promax')) iphoneLabel = 'iPhone 15 Pro Max';
    else if (corpus.includes('15 pro') || corpus.includes('15pro')) iphoneLabel = 'iPhone 15 Pro';
    else if (corpus.includes('15 plus') || corpus.includes('15plus')) iphoneLabel = 'iPhone 15 Plus';
    else if (corpus.includes('iphone 15') || corpus.includes('iphone15')) iphoneLabel = 'iPhone 15';
    else if (corpus.includes('14 pro max') || corpus.includes('14promax')) iphoneLabel = 'iPhone 14 Pro Max';
    else if (corpus.includes('14 pro') || corpus.includes('14pro')) iphoneLabel = 'iPhone 14 Pro';
    else if (corpus.includes('iphone 14') || corpus.includes('iphone14')) iphoneLabel = 'iPhone 14';
    else if (corpus.includes('13 pro max') || corpus.includes('13promax')) iphoneLabel = 'iPhone 13 Pro Max';
    else if (corpus.includes('13 pro') || corpus.includes('13pro')) iphoneLabel = 'iPhone 13 Pro';
    else if (corpus.includes('13 mini') || corpus.includes('13mini')) iphoneLabel = 'iPhone 13 mini';
    else if (corpus.includes('iphone 13') || corpus.includes('iphone13')) iphoneLabel = 'iPhone 13';
    else if (corpus.includes('iphone 12') || corpus.includes('iphone12')) iphoneLabel = 'iPhone 12';
    else if (corpus.includes('iphone 11') || corpus.includes('iphone11')) iphoneLabel = 'iPhone 11';
    else if (corpus.includes('iphone se') || corpus.includes('iphonese')) iphoneLabel = 'iPhone SE';
    return { category: 'apple_mobile', type: 'iPhone', os: 'Apple iOS', model: iphoneLabel };
  }

  if (/ipad(\d+),(\d+)/i.test(corpus) || corpus.includes('ipad')) {
    let ipadLabel = 'iPad';
    if (corpus.includes('ipad pro') || corpus.includes('ipadpro')) ipadLabel = 'iPad Pro';
    else if (corpus.includes('ipad air') || corpus.includes('ipadair')) ipadLabel = 'iPad Air';
    else if (corpus.includes('ipad mini') || corpus.includes('ipadmini')) ipadLabel = 'iPad mini';
    return { category: 'apple_mobile', type: 'iPad', os: 'Apple iPadOS', model: ipadLabel };
  }

  if (corpus.includes('applewatch') || corpus.includes('apple watch')) {
    return { category: 'apple_mobile', type: 'Apple Watch', os: 'watchOS', model: 'Apple Watch' };
  }
  if (corpus.includes('appletv') || corpus.includes('apple tv')) {
    return { category: 'media', type: 'Apple TV', os: 'tvOS', model: 'Apple TV' };
  }
  if (corpus.includes('homepod')) {
    return { category: 'media', type: 'HomePod', os: 'audioOS', model: 'Apple HomePod' };
  }
  if (corpus.includes('macbook')) {
    const macType = corpus.includes('pro') ? 'MacBook Pro' : corpus.includes('air') ? 'MacBook Air' : 'MacBook';
    return { category: 'macos', type: macType, os: 'macOS', model: macType };
  }
  if (corpus.includes('imac')) return { category: 'macos', type: 'iMac', os: 'macOS', model: 'iMac' };
  if (corpus.includes('mac mini') || corpus.includes('macmini')) return { category: 'macos', type: 'Mac mini', os: 'macOS', model: 'Mac mini' };
  if (corpus.includes('mac studio') || corpus.includes('macstudio')) return { category: 'macos', type: 'Mac Studio', os: 'macOS', model: 'Mac Studio' };
  return null;
}

function extractAndroidModel(corpus: string): { type: string; os: string; model: string } | null {
  if (/sm-s93[0-9]/i.test(corpus) || corpus.includes('galaxy s25') || corpus.includes('galaxys25')) {
    const model = corpus.includes('ultra') ? 'Galaxy S25 Ultra' : (corpus.includes('+') || corpus.includes('plus')) ? 'Galaxy S25+' : 'Galaxy S25';
    return { type: 'Galaxy S-Series', os: 'Android (One UI)', model };
  }
  if (/sm-s928/i.test(corpus) || corpus.includes('galaxy s24 ultra') || corpus.includes('s24 ultra')) {
    return { type: 'Galaxy S-Series', os: 'Android (One UI)', model: 'Galaxy S24 Ultra' };
  }
  if (/sm-s926/i.test(corpus) || corpus.includes('galaxy s24+') || corpus.includes('s24 plus') || corpus.includes('s24+')) {
    return { type: 'Galaxy S-Series', os: 'Android (One UI)', model: 'Galaxy S24+' };
  }
  if (/sm-s92[0-9]/i.test(corpus) || corpus.includes('galaxy s24') || corpus.includes('galaxys24')) {
    return { type: 'Galaxy S-Series', os: 'Android (One UI)', model: 'Galaxy S24' };
  }
  if (/sm-s918/i.test(corpus) || corpus.includes('galaxy s23 ultra') || corpus.includes('s23 ultra')) {
    return { type: 'Galaxy S-Series', os: 'Android (One UI)', model: 'Galaxy S23 Ultra' };
  }
  if (/sm-s916/i.test(corpus) || corpus.includes('galaxy s23+') || corpus.includes('s23+')) {
    return { type: 'Galaxy S-Series', os: 'Android (One UI)', model: 'Galaxy S23+' };
  }
  if (/sm-s91[0-9]/i.test(corpus) || corpus.includes('galaxy s23') || corpus.includes('galaxys23')) {
    return { type: 'Galaxy S-Series', os: 'Android (One UI)', model: 'Galaxy S23' };
  }
  if (/sm-s90[0-9]/i.test(corpus) || corpus.includes('galaxy s22') || corpus.includes('galaxys22')) {
    const model = corpus.includes('ultra') ? 'Galaxy S22 Ultra' : 'Galaxy S22';
    return { type: 'Galaxy S-Series', os: 'Android (One UI)', model };
  }
  if (/sm-f9[0-9]{2}/i.test(corpus) || corpus.includes('z fold') || corpus.includes('zfold')) {
    return { type: 'Galaxy Z-Series', os: 'Android (One UI)', model: 'Galaxy Z Fold' };
  }
  if (/sm-f7[0-9]{2}/i.test(corpus) || corpus.includes('z flip') || corpus.includes('zflip')) {
    return { type: 'Galaxy Z-Series', os: 'Android (One UI)', model: 'Galaxy Z Flip' };
  }
  if (/sm-x[0-9]{3}/i.test(corpus) || /sm-t[0-9]{3}/i.test(corpus) || corpus.includes('galaxy tab')) {
    return { type: 'Galaxy Tab', os: 'Android (One UI)', model: 'Galaxy Tab' };
  }
  if (/sm-a[0-9]{3}/i.test(corpus) || corpus.includes('galaxy a')) {
    const aMatch = corpus.match(/sm-a(\d{2,3})/i);
    const model = aMatch ? `Galaxy A${aMatch[1].slice(0, 2)}` : 'Galaxy A-Series';
    return { type: 'Galaxy A-Series', os: 'Android (One UI)', model };
  }
  if (corpus.includes('galaxy')) {
    return { type: 'Galaxy', os: 'Android (One UI)', model: 'Samsung Galaxy' };
  }
  if (corpus.includes('pixel')) {
    let pixelModel = 'Pixel';
    if (corpus.includes('pixel 9 pro')) pixelModel = 'Pixel 9 Pro';
    else if (corpus.includes('pixel 9')) pixelModel = 'Pixel 9';
    else if (corpus.includes('pixel 8 pro')) pixelModel = 'Pixel 8 Pro';
    else if (corpus.includes('pixel 8')) pixelModel = 'Pixel 8';
    else if (corpus.includes('pixel 7')) pixelModel = 'Pixel 7';
    return { type: 'Pixel', os: 'Android', model: pixelModel };
  }
  if (corpus.includes('redmi') || corpus.includes('poco') || corpus.includes('xiaomi') || corpus.includes('hyperos')) {
    const brand = corpus.includes('poco') ? 'POCO (Xiaomi)' : corpus.includes('redmi') ? 'Redmi (Xiaomi)' : 'Xiaomi Phone';
    return { type: 'Xiaomi / Redmi', os: 'Android (HyperOS)', model: brand };
  }
  return null;
}

export function classifyDeviceHybrid(
  vendor: string,
  openPorts: number[] = [],
  s: any,
  context?: HybridClassificationContext
): HybridClassificationResult {
  const isKo = (context?.lang || s?.lang || 'ko') === 'ko';
  const macAnalysis = analyzeMacStructure(
    context?.mac,
    context?.ouiBlockType,
    context?.ouiPrefix,
    context?.isRandomizedMac,
    vendor
  );

  const effectiveVendor = macAnalysis.knownVirtualNicVendor || vendor || '';
  const v = effectiveVendor.toLowerCase();
  const hostname = (context?.hostname || '').toLowerCase();
  const mdns = (context?.mdns || '').toLowerCase();
  const webTitle = (context?.webTitle || '').toLowerCase();
  const upnp = (context?.upnp || '').toLowerCase();
  const snmp = (context?.snmp || '').toLowerCase();
  const httpHeaders = (context?.httpHeaders || '').toLowerCase();
  const contextRealVendor = context?.realVendor || '';
  const contextChipsetVendor = macAnalysis.knownVirtualNicVendor || context?.chipsetVendor || effectiveVendor;
  const contextVendorSource = context?.vendorSource || '';
  const ip = context?.ip || '';

  const corpus = `${hostname} ${mdns} ${webTitle} ${upnp} ${snmp} ${httpHeaders} ${v} ${contextRealVendor}`.toLowerCase();

  // ===========================================================================
  // 1. Vendor / Protocol Priority Hierarchy
  // ===========================================================================
  let determinedRealVendor: string | undefined = contextRealVendor || undefined;
  let determinedVendorSource: string | undefined = contextVendorSource || undefined;
  let realVendorConfidence = 75;
  let chipsetConfidence = macAnalysis.isRandomizedMac ? 45 : (macAnalysis.ouiBlockType === 'MA-S' ? 94 : macAnalysis.ouiBlockType === 'MA-M' ? 90 : macAnalysis.ouiBlockType === 'MA-L' ? 85 : 55);
  let priorityRank = 5;

  const hasUpnpXml = Boolean(
    upnp ||
      contextVendorSource === 'UPNP' ||
      contextVendorSource === 'UPNP_XML' ||
      upnp.includes('<manufacturer>') ||
      upnp.includes('<friendlyname>') ||
      upnp.includes('devicetype')
  );
  const hasMdns = Boolean(
    mdns ||
      contextVendorSource === 'MDNS' ||
      mdns.includes('_airplay._tcp') ||
      mdns.includes('_googlecast._tcp') ||
      mdns.includes('_companion-link._tcp') ||
      mdns.includes('_hap._tcp') ||
      mdns.includes('_ipp._tcp')
  );
  const hasSmb = Boolean(
    hostname.includes('workgroup') ||
      hostname.includes('smb') ||
      contextVendorSource === 'SMB' ||
      contextVendorSource === 'NETBIOS'
  );
  const hasWeb = Boolean(
    webTitle ||
      httpHeaders ||
      contextVendorSource === 'WEB' ||
      contextVendorSource === 'HTTP'
  );

  if (hasUpnpXml) {
    priorityRank = 1;
    realVendorConfidence = 99;
    determinedVendorSource = 'UPnP XML';
    if (!determinedRealVendor && upnp) {
      const xmlMfrMatch = upnp.match(/<manufacturer>(.*?)<\/manufacturer>/i);
      if (xmlMfrMatch && xmlMfrMatch[1]) {
        determinedRealVendor = xmlMfrMatch[1].trim();
      }
    }
  } else if (hasMdns) {
    priorityRank = 2;
    realVendorConfidence = 95;
    determinedVendorSource = 'mDNS TXT';
  } else if (hasSmb) {
    priorityRank = 3;
    realVendorConfidence = 90;
    determinedVendorSource = 'SMB/NetBIOS';
  } else if (hasWeb) {
    priorityRank = 4;
    realVendorConfidence = 85;
    determinedVendorSource = 'HTTP Web';
  } else if (macAnalysis.isRandomizedMac) {
    priorityRank = 5;
    realVendorConfidence = 60;
    determinedVendorSource = 'LAA Backtrack';
  } else {
    priorityRank = 5;
    realVendorConfidence = chipsetConfidence;
    determinedVendorSource = macAnalysis.ouiBlockType !== 'UNKNOWN' ? `IEEE ${macAnalysis.ouiBlockType}` : 'IEEE OUI';
  }

  // ===========================================================================
  // 2. Hybrid Multi-Signal Category Scoring Matrix
  // ===========================================================================
  const scores: Record<DeviceCategoryId, number> = {
    windows: 0,
    macos: 0,
    apple_mobile: 0,
    android: 0,
    linux: 0,
    vm: 0,
    iot: 0,
    cctv: 0,
    media: 0,
    router: 0,
    nas: 0,
    printer: 0,
    console: 0,
    generic: 5,
  };

  const reasonsByCategory: Record<DeviceCategoryId, ClassificationEvidence[]> = {
    windows: [],
    macos: [],
    apple_mobile: [],
    android: [],
    linux: [],
    vm: [],
    iot: [],
    cctv: [],
    media: [],
    router: [],
    nas: [],
    printer: [],
    console: [],
    generic: [],
  };

  const addSignal = (
    cat: DeviceCategoryId,
    source: ClassificationEvidence['source'],
    detail: string,
    weight: number
  ) => {
    scores[cat] += weight;
    reasonsByCategory[cat].push({ source, detail, weight });
  };

  // --- Signal A: IEEE OUI Semantic Matching & Block Precision ---
  let isChipsetOem = false;
  let matchedOemRule = false;

  if (macAnalysis.knownVirtualNicVendor) {
    addSignal(
      'vm',
      'OUI',
      isKo
        ? `가상화 NIC 접두사 (${macAnalysis.ouiPrefix} · ${macAnalysis.knownVirtualNicVendor})`
        : `Virtual NIC Prefix (${macAnalysis.ouiPrefix} · ${macAnalysis.knownVirtualNicVendor})`,
      48
    );
    matchedOemRule = true;
  } else if (macAnalysis.isRandomizedMac) {
    // LAA Randomized MAC: Mobile / Laptop privacy signal + Backtracking
    addSignal(
      'android',
      'LAA',
      isKo ? 'LAA 랜덤 MAC 비트 감지 (모바일/노트북 프라이버시 주소)' : 'LAA Randomized MAC Detected (Mobile/Laptop Privacy)',
      18
    );
    addSignal(
      'apple_mobile',
      'LAA',
      isKo ? 'LAA 랜덤 MAC 비트 감지 (iOS/iPadOS 프라이버시 주소 후보)' : 'LAA Randomized MAC Detected (iOS Privacy Candidate)',
      18
    );
  } else if (v && !v.includes('unknown') && macAnalysis.ouiBlockType !== 'PRIVATE') {
    for (const rule of OUI_SEMANTIC_RULES) {
      if (rule.keywords.some((kw) => v.includes(kw))) {
        matchedOemRule = true;
        if (rule.isChipsetOem) isChipsetOem = true;
        const blockBonus = macAnalysis.ouiBlockType === 'MA-S' ? 8 : macAnalysis.ouiBlockType === 'MA-M' ? 5 : 0;
        addSignal(
          rule.category,
          rule.isChipsetOem ? 'CHIPSET' : 'OUI',
          isKo
            ? `${macAnalysis.ouiBlockType} ${rule.labelKo} (${effectiveVendor})`
            : `${macAnalysis.ouiBlockType} ${rule.labelEn} (${effectiveVendor})`,
          rule.weight + blockBonus
        );
        break;
      }
    }

    if (!matchedOemRule && macAnalysis.ouiBlockType !== 'UNKNOWN') {
      const blockBonus = macAnalysis.ouiBlockType === 'MA-S' ? 6 : macAnalysis.ouiBlockType === 'MA-M' ? 4 : 0;
      addSignal(
        'generic',
        'OUI',
        isKo ? `${macAnalysis.ouiBlockType} 제조사 매칭 (${effectiveVendor})` : `${macAnalysis.ouiBlockType} Vendor Match (${effectiveVendor})`,
        16 + blockBonus
      );
    }
  } else if (macAnalysis.ouiBlockType === 'PRIVATE') {
    addSignal(
      'generic',
      'OUI',
      isKo ? 'IEEE Private 할당 블록 (다목적/익명 제조사)' : 'IEEE Private Block Allocation',
      10
    );
  }

  // --- Signal B: Port Signatures ---
  const hasPort = (p: number) => openPorts.includes(p);

  if (hasPort(554) || hasPort(37777) || hasPort(8899)) {
    const portLabels = [554, 37777, 8899].filter((p) => hasPort(p)).join(', ');
    addSignal(
      'cctv',
      'PORT',
      isKo ? `영상 스트리밍/ONVIF 포트 개방 (${portLabels})` : `RTSP / CCTV Port Signature (${portLabels})`,
      38
    );
  }
  if (hasPort(8000) && (v.includes('hikvision') || corpus.includes('hikvision') || corpus.includes('camera') || corpus.includes('nvr'))) {
    addSignal('cctv', 'PORT', isKo ? 'Hikvision SDK 포트 8000 활성' : 'Hikvision Port 8000 Active', 24);
  }

  if (hasPort(9100) || hasPort(631) || hasPort(515)) {
    const pList = [9100, 631, 515].filter((p) => hasPort(p)).join(', ');
    addSignal(
      'printer',
      'PORT',
      isKo ? `프린터 인쇄 스풀러/IPP 포트 개방 (${pList})` : `Printer JetDirect/IPP Port (${pList})`,
      42
    );
  }

  if (hasPort(1883) || hasPort(8883)) {
    addSignal(
      'iot',
      'PORT',
      isKo ? 'IoT MQTT 브로커/클라이언트 포트 (1883/8883)' : 'IoT MQTT Protocol Port (1883/8883)',
      38
    );
  }

  if (hasPort(62078)) {
    addSignal(
      'apple_mobile',
      'PORT',
      isKo ? 'Apple iOS 모바일 동기화 포트 62078 개방' : 'Apple iOS MobDev Sync Port 62078',
      45
    );
  }

  if (hasPort(445) || hasPort(135) || hasPort(3389)) {
    const winPorts = [445, 135, 3389].filter((p) => hasPort(p)).join(', ');
    addSignal(
      'windows',
      'PORT',
      isKo ? `Windows SMB/RPC/RDP 포트 활성 (${winPorts})` : `Windows SMB/RPC/RDP Port (${winPorts})`,
      hasPort(3389) ? 38 : 34
    );
  }

  if (hasPort(5000) || hasPort(5001)) {
    if (corpus.includes('synology') || corpus.includes('diskstation') || v.includes('synology')) {
      addSignal('nas', 'PORT', isKo ? 'Synology DSM 관리 포트 (5000/5001)' : 'Synology DSM Port (5000/5001)', 32);
    }
  }

  if (hasPort(22)) {
    addSignal('linux', 'PORT', isKo ? 'SSH 원격 쉘 포트 22 개방' : 'SSH Port 22 Active', 26);
    if (scores.nas > 0) addSignal('nas', 'PORT', isKo ? 'NAS SSH 관리 포트 22' : 'NAS SSH Port 22', 12);
    if (scores.vm > 0) addSignal('vm', 'PORT', isKo ? '가상머신 SSH 포트 22' : 'VM SSH Port 22', 12);
  }

  if (hasPort(53) && (hasPort(80) || hasPort(443) || ip.endsWith('.1') || ip.endsWith('.254'))) {
    addSignal(
      'router',
      'PORT',
      isKo ? 'DNS(53) + 웹 관리 콘솔 조합 (게이트웨이/공유기)' : 'DNS(53) + Web Admin Gateway Signature',
      34
    );
  }

  // --- Signal C: mDNS / UPnP / Hostname / Web Backtracking ---
  const appleModel = extractSpecificAppleModel(corpus);
  if (appleModel) {
    addSignal(
      appleModel.category,
      hasMdns ? 'MDNS' : 'HOSTNAME',
      isKo ? `Apple 기기 모델 단서 (${appleModel.model})` : `Apple Model Signature (${appleModel.model})`,
      42
    );
  } else if (mdns.includes('_apple-mobdev2._tcp') || mdns.includes('_companion-link._tcp')) {
    addSignal('apple_mobile', 'MDNS', isKo ? 'Apple mDNS 서비스 레코드 (_companion-link / mobdev2)' : 'Apple mDNS Service Record', 38);
  }

  const androidModel = extractAndroidModel(corpus);
  if (androidModel) {
    addSignal(
      'android',
      hasMdns ? 'MDNS' : 'HOSTNAME',
      isKo ? `Android 단말 모델 단서 (${androidModel.model})` : `Android Model Signature (${androidModel.model})`,
      42
    );
  } else if (corpus.includes('android') || corpus.includes('_android._tcp') || /^android-[a-f0-9]+/i.test(hostname)) {
    addSignal('android', 'HOSTNAME', isKo ? 'Android 호스트명/mDNS 패턴 (android-*)' : 'Android Hostname / mDNS Pattern', 36);
  }

  if (
    mdns.includes('_hap._tcp') ||
    mdns.includes('_matter._tcp') ||
    mdns.includes('_mqtt._tcp') ||
    mdns.includes('_esphomelib._tcp') ||
    corpus.includes('homeassistant') ||
    corpus.includes('esphome') ||
    corpus.includes('tasmota') ||
    corpus.includes('shelly') ||
    corpus.includes('smartthings') ||
    corpus.includes('hue') ||
    corpus.includes('plug') ||
    corpus.includes('sensor') ||
    corpus.includes('thermostat') ||
    corpus.includes('vacuum') ||
    corpus.includes('roborock')
  ) {
    addSignal(
      'iot',
      hasMdns ? 'MDNS' : 'HOSTNAME',
      isKo ? '스마트홈 / IoT 프로토콜 또는 기기명 (_hap/_matter/IoT)' : 'Smart Home / IoT Service Signature',
      38
    );
  }

  if (
    corpus.includes('camera') ||
    corpus.includes('ipcam') ||
    corpus.includes('cctv') ||
    corpus.includes('onvif') ||
    corpus.includes('nvr') ||
    corpus.includes('dvr') ||
    corpus.includes('rtsp') ||
    corpus.includes('tapo c') ||
    corpus.includes('webcam')
  ) {
    addSignal(
      'cctv',
      hasUpnpXml ? 'UPNP' : webTitle ? 'WEB' : 'HOSTNAME',
      isKo ? 'CCTV / 영상 보안 장비 키워드 및 배너 감지' : 'CCTV / NVR / ONVIF Banner Match',
      36
    );
  }

  if (
    mdns.includes('_googlecast._tcp') ||
    mdns.includes('_airplay._tcp') ||
    mdns.includes('_raop._tcp') ||
    mdns.includes('_spotify-connect._tcp') ||
    upnp.includes('mediarenderer') ||
    upnp.includes('mediaserver') ||
    corpus.includes('webos') ||
    corpus.includes('tizen') ||
    corpus.includes('smarttv') ||
    corpus.includes('bravia') ||
    corpus.includes('oled') ||
    corpus.includes('qled') ||
    /\btv\b/i.test(corpus)
  ) {
    addSignal(
      'media',
      hasMdns ? 'MDNS' : hasUpnpXml ? 'UPNP' : 'WEB',
      isKo ? '스마트TV / 미디어 스트리밍 서비스 (Cast/AirPlay/DLNA)' : 'Smart TV / Media Streaming Signature',
      38
    );
  }

  if (
    corpus.includes('diskstation') ||
    corpus.includes('rackstation') ||
    corpus.includes('synology') ||
    corpus.includes('qnap') ||
    corpus.includes('nas') ||
    corpus.includes('truenas')
  ) {
    addSignal(
      'nas',
      hasUpnpXml ? 'UPNP' : webTitle ? 'WEB' : 'HOSTNAME',
      isKo ? 'NAS / 스토리지 웹 타이틀 및 호스트명 매칭' : 'NAS Web Title / Hostname Match',
      36
    );
  }

  if (
    mdns.includes('_ipp._tcp') ||
    mdns.includes('_printer._tcp') ||
    mdns.includes('_pdl-datastream._tcp') ||
    corpus.includes('printer') ||
    corpus.includes('laserjet') ||
    corpus.includes('officejet') ||
    corpus.includes('pixma')
  ) {
    addSignal(
      'printer',
      hasMdns ? 'MDNS' : 'HOSTNAME',
      isKo ? '네트워크 프린터 mDNS / 모델명 단서 (_ipp._tcp)' : 'Network Printer mDNS / Model Match',
      38
    );
  }

  if (
    corpus.includes('router') ||
    corpus.includes('gateway') ||
    corpus.includes('iptime') ||
    corpus.includes('openwrt') ||
    corpus.includes('asuswrt') ||
    corpus.includes('unifi') ||
    upnp.includes('internetgatewaydevice') ||
    ip.endsWith('.1') ||
    ip.endsWith('.254')
  ) {
    const isGw = ip.endsWith('.1') || ip.endsWith('.254');
    addSignal(
      'router',
      hasUpnpXml ? 'UPNP' : isGw ? 'GATEWAY' : 'WEB',
      isGw
        ? isKo ? `서브넷 게이트웨이 후보 IP (${ip}) / 라우터 단서` : `Subnet Gateway Heuristic (${ip}) / Router Signature`
        : isKo ? '공유기/AP 웹 관리 인터페이스 또는 IGD UPnP 감지' : 'Router Admin / UPnP IGD Detected',
      isGw && !corpus.includes('router') && !corpus.includes('iptime') && !corpus.includes('internetgatewaydevice') ? 22 : 34
    );
  }

  if (/^desktop-[a-z0-9]{5,}/i.test(hostname) || /^laptop-[a-z0-9]{5,}/i.test(hostname) || /^win-/i.test(hostname) || corpus.includes('windows')) {
    addSignal(
      'windows',
      'HOSTNAME',
      isKo ? `Windows 호스트명 명명 규칙 (${context?.hostname || 'DESKTOP-*'})` : `Windows Hostname Pattern (${context?.hostname || 'DESKTOP-*'})`,
      32
    );
  }

  if (corpus.includes('ubuntu') || corpus.includes('debian') || corpus.includes('centos') || corpus.includes('proxmox') || corpus.includes('raspberrypi') || corpus.includes('linux')) {
    addSignal(
      corpus.includes('proxmox') ? 'vm' : 'linux',
      'HOSTNAME',
      isKo ? 'Linux / 서버 호스트명 패턴 일치' : 'Linux / Server Hostname Match',
      28
    );
  }

  // ===========================================================================
  // 3. Determine Winning Category & Compute Calibrated Confidence
  // ===========================================================================
  let bestCategory: DeviceCategoryId = 'generic';
  let bestScore = scores.generic;

  for (const cat of Object.keys(scores) as DeviceCategoryId[]) {
    if (cat === 'generic') continue;
    if (scores[cat] > bestScore) {
      bestScore = scores[cat];
      bestCategory = cat;
    }
  }

  // Sort & deduplicate evidence for the winning category (plus LAA / Chipset context if relevant)
  const winningReasons = [...reasonsByCategory[bestCategory]];
  if (macAnalysis.isRandomizedMac && !winningReasons.some((r) => r.source === 'LAA')) {
    winningReasons.push({
      source: 'LAA',
      detail: isKo
        ? `LAA 랜덤 MAC 감지 → 프로토콜 역추적으로 유형 복원`
        : `LAA Random MAC → Restored via protocol backtracking`,
      weight: 12,
    });
  }
  if (isChipsetOem && !winningReasons.some((r) => r.source === 'CHIPSET')) {
    winningReasons.push({
      source: 'CHIPSET',
      detail: isKo
        ? `칩셋 OEM(${effectiveVendor}) 확인 → 상위 신호 우선 적용`
        : `Chipset OEM(${effectiveVendor}) → Deferred to product signals`,
      weight: 10,
    });
  }

  winningReasons.sort((a, b) => b.weight - a.weight);
  const topReasons = winningReasons.slice(0, 6);

  // Calibrated Confidence Score (35% - 99%)
  let confidenceScore = 50;
  if (bestCategory === 'generic') {
    confidenceScore = macAnalysis.isRandomizedMac ? 42 : macAnalysis.ouiBlockType === 'UNKNOWN' ? 38 : 68;
  } else {
    const rawConfidence = Math.min(99, Math.max(52, 42 + Math.round(bestScore * 0.72)));
    confidenceScore = macAnalysis.isRandomizedMac && bestScore < 35 ? Math.min(62, rawConfidence) : rawConfidence;
  }

  // ===========================================================================
  // 4. Resolve Localized Type Label, OS, and Model
  // ===========================================================================
  const dt = s?.deviceTypes || {};
  let typeLabel = dt.generic || (isKo ? '네트워크 노드' : 'Network Node');
  let osLabel = 'Generic';
  let modelLabel: string | undefined = undefined;

  switch (bestCategory) {
    case 'windows':
      typeLabel = hasPort(3389) ? (dt.rdp || (isKo ? '원격 데스크톱' : 'Remote Desktop')) : (dt.windows || 'Windows PC');
      osLabel = 'Windows';
      break;
    case 'macos':
      typeLabel = appleModel?.type || (dt.macos || 'Mac (macOS)');
      osLabel = appleModel?.os || 'macOS';
      modelLabel = appleModel?.model;
      break;
    case 'apple_mobile':
      typeLabel = appleModel?.type || (dt.appleMobile || dt.apple || (isKo ? 'Apple 모바일' : 'Apple Mobile'));
      osLabel = appleModel?.os || 'Apple iOS / iPadOS';
      modelLabel = appleModel?.model;
      break;
    case 'android':
      typeLabel = androidModel?.type || (dt.mobile || (isKo ? '모바일 장치' : 'Mobile Device'));
      osLabel = androidModel?.os || 'Android';
      modelLabel = androidModel?.model || (macAnalysis.isRandomizedMac ? undefined : undefined);
      break;
    case 'linux':
      typeLabel = dt.linux || (isKo ? '리눅스/서버' : 'Linux/Server');
      osLabel = 'Linux';
      break;
    case 'vm':
      typeLabel = dt.vm || (isKo ? '가상머신 / 컨테이너' : 'Virtual Machine / Container');
      osLabel = macAnalysis.knownVirtualNicVendor || 'Hypervisor / VM';
      break;
    case 'iot':
      typeLabel = dt.iot || (isKo ? 'IoT / 스마트홈' : 'IoT / Smart Home');
      osLabel = 'Embedded IoT / RTOS';
      break;
    case 'cctv':
      typeLabel = dt.cctv || (isKo ? 'IP 카메라 / CCTV' : 'IP Camera / CCTV');
      osLabel = 'Embedded Linux (NVR/Cam)';
      break;
    case 'media':
      typeLabel = appleModel?.type || dt.media || (isKo ? '스마트TV / 미디어' : 'Smart TV / Media');
      osLabel = appleModel?.os || 'Smart TV / Media OS';
      modelLabel = appleModel?.model;
      break;
    case 'router':
      typeLabel = dt.router || dt.network || (isKo ? '공유기 / AP / 네트워크' : 'Router / AP');
      osLabel = 'Network OS / Embedded';
      break;
    case 'nas':
      typeLabel = dt.nas || (isKo ? 'NAS 서버' : 'NAS Server');
      osLabel = 'Linux (NAS)';
      break;
    case 'printer':
      typeLabel = dt.printer || (isKo ? '네트워크 프린터' : 'Network Printer');
      osLabel = 'Embedded Print Engine';
      break;
    case 'console':
      typeLabel = dt.console || (isKo ? '게임 콘솔' : 'Game Console');
      osLabel = 'Console OS';
      break;
    default:
      typeLabel = dt.generic || (isKo ? '네트워크 노드' : 'Network Node');
      osLabel = 'Generic';
      break;
  }

  return {
    type: typeLabel,
    os: osLabel,
    model: modelLabel,
    deviceCategory: bestCategory,
    realVendor: determinedRealVendor,
    chipsetVendor: contextChipsetVendor || (macAnalysis.isRandomizedMac ? 'Randomized MAC (LAA)' : effectiveVendor),
    vendorSource: determinedVendorSource,
    realVendorConfidence,
    chipsetConfidence,
    confidenceScore,
    priorityRank,
    ouiBlockType: macAnalysis.ouiBlockType,
    ouiPrefix: macAnalysis.ouiPrefix,
    isRandomizedMac: macAnalysis.isRandomizedMac,
    isChipsetOem,
    classificationReasons: topReasons,
  };
}
