/**
 * Grid IP Scanner2 - Module 7: grid_fingerprint_engine.c
 * High-Performance Native Device Fingerprinting & Security Risk Assessment Engine
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

#ifndef BUILDING_GRID_FINGERPRINT_ENGINE
#define BUILDING_GRID_FINGERPRINT_ENGINE
#endif
#include "grid_fingerprint_engine.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

#ifdef _WIN32
#include <windows.h>
#endif

// ============================================================================
// Internal String Utilities
// ============================================================================
static void safe_strcpy(char* dest, const char* src, size_t destSize) {
    if (!dest || destSize == 0) return;
    if (!src) {
        dest[0] = '\0';
        return;
    }
    snprintf(dest, destSize, "%s", src);
}

static int stristr_local(const char* haystack, const char* needle) {
    if (!haystack || !needle || needle[0] == '\0') return 0;
    size_t nlen = strlen(needle);
    size_t hlen = strlen(haystack);
    if (nlen > hlen) return 0;

    for (size_t i = 0; i <= hlen - nlen; i++) {
        size_t j = 0;
        for (; j < nlen; j++) {
            if (tolower((unsigned char)haystack[i + j]) != tolower((unsigned char)needle[j])) {
                break;
            }
        }
        if (j == nlen) return 1;
    }
    return 0;
}

static int has_port(const HostFingerprintProfile* profile, int port) {
    if (!profile || profile->openPortCount <= 0) return 0;
    for (int i = 0; i < profile->openPortCount && i < 64; i++) {
        if (profile->openPorts[i] == port) return 1;
    }
    return 0;
}

// ============================================================================
// Driver Version
// ============================================================================
int Fingerprint_GetDriverVersion(void) {
    return FP_DRIVER_VERSION;
}

// ============================================================================
// Heuristic Device Classification Implementation
// ============================================================================
int Fingerprint_ClassifyDevice(
    const HostFingerprintProfile* p,
    DeviceClassificationResult* out
) {
    if (!p || !out) return 0;
    memset(out, 0, sizeof(DeviceClassificationResult));

    // Default Fallback
    out->categoryCode = DEVICE_CAT_UNKNOWN;
    safe_strcpy(out->categoryName, "일반 네트워크 장비 (Generic Node)", sizeof(out->categoryName));
    safe_strcpy(out->detectedOS, "Unknown OS", sizeof(out->detectedOS));
    safe_strcpy(out->hardwareModel, "Unknown Device", sizeof(out->hardwareModel));
    out->confidencePercent = 40;

    const char* v = p->vendor;
    const char* h = p->hostname;
    const char* s = p->serverHeader;
    const char* ssh = p->sshBanner;
    const char* rtsp = p->rtspServer;
    const char* wg = p->workgroup;
    int ttl = p->ttl;

    // 1. Network Printer / MFP Classification
    if (has_port(p, 9100) || has_port(p, 515) || has_port(p, 631) ||
        stristr_local(v, "HP") || stristr_local(v, "Canon") || stristr_local(v, "Epson") ||
        stristr_local(v, "Brother") || stristr_local(v, "Xerox") || stristr_local(v, "Fuji") ||
        stristr_local(h, "PRINTER") || stristr_local(h, "MFP") || stristr_local(s, "HP-ChaiSOE")) {
        if (has_port(p, 9100) || has_port(p, 631) || has_port(p, 515)) {
            out->categoryCode = DEVICE_CAT_PRINTER_MFP;
            safe_strcpy(out->categoryName, "네트워크 프린터 / 복합기 (Printer/MFP)", sizeof(out->categoryName));
            safe_strcpy(out->detectedOS, "Embedded RTOS / Printer Microcode", sizeof(out->detectedOS));
            snprintf(out->hardwareModel, sizeof(out->hardwareModel), "%s Network Printer", strlen(v) > 0 ? v : "Office");
            out->confidencePercent = 95;
            return 1;
        }
    }

    // 2. IP Camera / NVR Surveillance System
    if (has_port(p, 554) || has_port(p, 37777) || has_port(p, 8000) || has_port(p, 8899) ||
        strlen(rtsp) > 0 || stristr_local(v, "Hikvision") || stristr_local(v, "Dahua") ||
        stristr_local(v, "Axis") || stristr_local(v, "Hanwha") || stristr_local(v, "Uniview") ||
        stristr_local(s, "App-webs") || stristr_local(s, "DVRDVS-Webs") || stristr_local(h, "CAM") || stristr_local(h, "IPC")) {
        if (has_port(p, 554) || has_port(p, 37777) || has_port(p, 8899) || has_port(p, 8000) || stristr_local(v, "Hikvision") || stristr_local(v, "Dahua")) {
            out->categoryCode = DEVICE_CAT_IP_CAMERA;
            safe_strcpy(out->categoryName, "CCTV / IP 카메라 / NVR (Surveillance)", sizeof(out->categoryName));
            safe_strcpy(out->detectedOS, "Embedded Linux (IP Camera Firmware)", sizeof(out->detectedOS));
            snprintf(out->hardwareModel, sizeof(out->hardwareModel), "%s Surveillance Unit", strlen(v) > 0 ? v : "IP");
            out->confidencePercent = 95;
            return 1;
        }
    }

    // 2.5 Smart TV / Media & Game Console
    if (has_port(p, 8008) || has_port(p, 8009) || has_port(p, 9080) || stristr_local(v, "Sonos") ||
        stristr_local(v, "Roku") || stristr_local(h, "bravia") || stristr_local(h, "webos") || stristr_local(h, "tizen") ||
        stristr_local(h, "apple-tv") || stristr_local(h, "chromecast")) {
        out->categoryCode = DEVICE_CAT_MEDIA_TV;
        safe_strcpy(out->categoryName, "스마트TV / 미디어 스트리밍 (Smart TV/Media)", sizeof(out->categoryName));
        safe_strcpy(out->detectedOS, "Smart TV / Media OS", sizeof(out->detectedOS));
        snprintf(out->hardwareModel, sizeof(out->hardwareModel), "%s Media Device", strlen(v) > 0 ? v : "Smart");
        out->confidencePercent = 90;
        return 1;
    }

    if (stristr_local(v, "Nintendo") || stristr_local(v, "Valve") || stristr_local(h, "playstation") ||
        stristr_local(h, "ps5") || stristr_local(h, "xbox") || stristr_local(h, "nintendo")) {
        out->categoryCode = DEVICE_CAT_GAME_CONSOLE;
        safe_strcpy(out->categoryName, "게임 콘솔 (Game Console)", sizeof(out->categoryName));
        safe_strcpy(out->detectedOS, "Console OS", sizeof(out->detectedOS));
        snprintf(out->hardwareModel, sizeof(out->hardwareModel), "%s Gaming Console", strlen(v) > 0 ? v : "Console");
        out->confidencePercent = 90;
        return 1;
    }

    // 2.7 IoT / Smart Home (MQTT / Espressif / Tuya / Hue / HomeAssistant)
    if (has_port(p, 1883) || has_port(p, 8883) || stristr_local(v, "Espressif") || stristr_local(v, "Tuya") ||
        stristr_local(v, "Signify") || stristr_local(v, "Shelly") || stristr_local(h, "homeassistant") || stristr_local(h, "esp-")) {
        out->categoryCode = DEVICE_CAT_IOT_SMART_DEVICE;
        safe_strcpy(out->categoryName, "IoT / 스마트홈 센서 (IoT Device)", sizeof(out->categoryName));
        safe_strcpy(out->detectedOS, "Embedded IoT / RTOS", sizeof(out->detectedOS));
        snprintf(out->hardwareModel, sizeof(out->hardwareModel), "%s Smart IoT Node", strlen(v) > 0 ? v : "IoT");
        out->confidencePercent = 92;
        return 1;
    }

    // 3. NAS / Network Storage
    if (has_port(p, 5000) || has_port(p, 5001) || stristr_local(s, "Synology") || stristr_local(v, "Synology") ||
        (has_port(p, 8080) && stristr_local(s, "QNAP")) || stristr_local(v, "QNAP") || stristr_local(h, "DISKSTATION") ||
        stristr_local(h, "NAS") || stristr_local(s, "TrueNAS")) {
        out->categoryCode = DEVICE_CAT_NAS_STORAGE;
        safe_strcpy(out->categoryName, "NAS / 네트워크 스토리지 (Storage)", sizeof(out->categoryName));
        if (stristr_local(v, "Synology") || has_port(p, 5000) || has_port(p, 5001) || stristr_local(s, "Synology")) {
            safe_strcpy(out->detectedOS, "Synology DSM (Linux Embedded)", sizeof(out->detectedOS));
            safe_strcpy(out->hardwareModel, "Synology DiskStation NAS", sizeof(out->hardwareModel));
        } else if (stristr_local(v, "QNAP") || stristr_local(s, "QNAP")) {
            safe_strcpy(out->detectedOS, "QTS / QuTS hero (Linux)", sizeof(out->detectedOS));
            safe_strcpy(out->hardwareModel, "QNAP Turbo NAS", sizeof(out->hardwareModel));
        } else {
            safe_strcpy(out->detectedOS, "Storage Appliance OS", sizeof(out->detectedOS));
            safe_strcpy(out->hardwareModel, "Network Attached Storage", sizeof(out->hardwareModel));
        }
        out->confidencePercent = 95;
        return 1;
    }

    // 4. Virtualization Hypervisor / Container Host
    if (has_port(p, 902) || has_port(p, 8006) || stristr_local(v, "VMware") || stristr_local(v, "QEMU") ||
        stristr_local(v, "VirtualBox") || stristr_local(v, "Hyper-V") || stristr_local(s, "VMware") || stristr_local(s, "Proxmox")) {
        out->categoryCode = DEVICE_CAT_VIRTUAL_MACHINE;
        safe_strcpy(out->categoryName, "가상화 하이퍼바이저 / VM 호스트 (Virtualization)", sizeof(out->categoryName));
        if (has_port(p, 902) || stristr_local(s, "VMware") || stristr_local(v, "VMware")) {
            safe_strcpy(out->detectedOS, "VMware ESXi / vSphere", sizeof(out->detectedOS));
            safe_strcpy(out->hardwareModel, "VMware Virtual Platform", sizeof(out->hardwareModel));
        } else if (has_port(p, 8006) || stristr_local(s, "Proxmox")) {
            safe_strcpy(out->detectedOS, "Proxmox VE (Debian Linux)", sizeof(out->detectedOS));
            safe_strcpy(out->hardwareModel, "Proxmox Virtual Environment", sizeof(out->hardwareModel));
        } else {
            safe_strcpy(out->detectedOS, "Virtual Machine Guest", sizeof(out->detectedOS));
            safe_strcpy(out->hardwareModel, "Hypervisor Guest Instance", sizeof(out->hardwareModel));
        }
        out->confidencePercent = 90;
        return 1;
    }

    // 5. Database Server
    if (has_port(p, 3306) || has_port(p, 5432) || has_port(p, 1433) || has_port(p, 1521) ||
        has_port(p, 27017) || has_port(p, 6379)) {
        if (!has_port(p, 135) && !has_port(p, 445) && !has_port(p, 80) && !has_port(p, 443)) {
            out->categoryCode = DEVICE_CAT_DATABASE_SERVER;
            safe_strcpy(out->categoryName, "데이터베이스 서버 (Dedicated DB Server)", sizeof(out->categoryName));
            if (has_port(p, 3306)) safe_strcpy(out->hardwareModel, "MySQL / MariaDB Service", sizeof(out->hardwareModel));
            else if (has_port(p, 5432)) safe_strcpy(out->hardwareModel, "PostgreSQL Database Engine", sizeof(out->hardwareModel));
            else if (has_port(p, 1433)) safe_strcpy(out->hardwareModel, "Microsoft SQL Server", sizeof(out->hardwareModel));
            else if (has_port(p, 6379)) safe_strcpy(out->hardwareModel, "Redis In-Memory Key-Value DB", sizeof(out->hardwareModel));
            else safe_strcpy(out->hardwareModel, "Database Node", sizeof(out->hardwareModel));
            safe_strcpy(out->detectedOS, ttl <= 64 ? "Linux Server OS" : "Enterprise Server OS", sizeof(out->detectedOS));
            out->confidencePercent = 88;
            return 1;
        }
    }

    // 6. Router / Default Gateway / AP
    if (has_port(p, 53) || stristr_local(v, "Cisco") || stristr_local(v, "Ubiquiti") ||
        stristr_local(v, "MikroTik") || stristr_local(v, "TP-Link") || stristr_local(v, "EFM Networks") ||
        stristr_local(v, "ipTIME") || stristr_local(h, "gateway") || stristr_local(h, "router") ||
        stristr_local(s, "RouterOS") || stristr_local(s, "mini_httpd") || stristr_local(s, "uhttpd") ||
        stristr_local(s, "OpenWrt") || stristr_local(s, "DD-WRT")) {
        if (has_port(p, 53) || stristr_local(v, "ipTIME") || stristr_local(s, "RouterOS") || stristr_local(v, "Ubiquiti") || stristr_local(v, "MikroTik")) {
            out->categoryCode = DEVICE_CAT_ROUTER_GATEWAY;
            safe_strcpy(out->categoryName, "유무선 공유기 / 게이트웨이 (Router/AP)", sizeof(out->categoryName));
            if (stristr_local(v, "ipTIME") || stristr_local(v, "EFM Networks")) {
                safe_strcpy(out->detectedOS, "ipTIME Firmware (Embedded Linux)", sizeof(out->detectedOS));
                safe_strcpy(out->hardwareModel, "ipTIME Wi-Fi Router / AP", sizeof(out->hardwareModel));
            } else if (stristr_local(s, "RouterOS") || stristr_local(v, "MikroTik")) {
                safe_strcpy(out->detectedOS, "MikroTik RouterOS", sizeof(out->detectedOS));
                safe_strcpy(out->hardwareModel, "MikroTik Core Router", sizeof(out->hardwareModel));
            } else if (stristr_local(v, "Ubiquiti")) {
                safe_strcpy(out->detectedOS, "UniFi OS (Embedded Linux)", sizeof(out->detectedOS));
                safe_strcpy(out->hardwareModel, "Ubiquiti UniFi AP / Gateway", sizeof(out->hardwareModel));
            } else {
                safe_strcpy(out->detectedOS, "Embedded Linux Router Gateway", sizeof(out->detectedOS));
                snprintf(out->hardwareModel, sizeof(out->hardwareModel), "%s Gateway Router", strlen(v) > 0 ? v : "Network");
            }
            out->confidencePercent = 92;
            return 1;
        }
    }

    // 7. Apple Device (Mac / iPhone / iPad / Apple TV)
    if (stristr_local(v, "Apple") || (has_port(p, 5353) && (stristr_local(h, ".local") || stristr_local(h, "Mac") || stristr_local(h, "iPhone")))) {
        out->categoryCode = DEVICE_CAT_APPLE_DEVICE;
        safe_strcpy(out->categoryName, "Apple 장치 (Mac / iPhone / AppleTV)", sizeof(out->categoryName));
        if (stristr_local(h, "MacBook") || stristr_local(h, "Mac-mini") || stristr_local(h, "iMac")) {
            safe_strcpy(out->detectedOS, "macOS (Apple Darwin)", sizeof(out->detectedOS));
            safe_strcpy(out->hardwareModel, "Apple Mac Workstation", sizeof(out->hardwareModel));
        } else if (stristr_local(h, "iPhone") || stristr_local(h, "iPad")) {
            safe_strcpy(out->detectedOS, "iOS / iPadOS", sizeof(out->detectedOS));
            safe_strcpy(out->hardwareModel, "Apple Mobile Device", sizeof(out->hardwareModel));
        } else {
            safe_strcpy(out->detectedOS, "Apple Darwin (macOS/iOS)", sizeof(out->detectedOS));
            safe_strcpy(out->hardwareModel, "Apple Ecosystem Device", sizeof(out->hardwareModel));
        }
        out->confidencePercent = 90;
        return 1;
    }

    // 8. Windows PC & Windows Server
    if (has_port(p, 135) || has_port(p, 139) || has_port(p, 445) || has_port(p, 3389) ||
        has_port(p, 5357) || strlen(wg) > 0 || (ttl > 64 && ttl <= 128)) {
        if (has_port(p, 88) || has_port(p, 389) || has_port(p, 636) || has_port(p, 3268) || stristr_local(h, "DC") || stristr_local(h, "SRV") || stristr_local(h, "SERVER")) {
            out->categoryCode = DEVICE_CAT_WINDOWS_SERVER;
            safe_strcpy(out->categoryName, "Windows 서버 / 도메인 컨트롤러 (Server)", sizeof(out->categoryName));
            safe_strcpy(out->detectedOS, "Windows Server (Active Directory / IIS)", sizeof(out->detectedOS));
            safe_strcpy(out->hardwareModel, "Enterprise Windows Host", sizeof(out->hardwareModel));
            out->confidencePercent = 93;
            return 1;
        } else if (has_port(p, 135) || has_port(p, 445) || (ttl > 64 && ttl <= 128)) {
            out->categoryCode = DEVICE_CAT_WINDOWS_PC;
            safe_strcpy(out->categoryName, "Windows 데스크톱 / 노트북 (PC)", sizeof(out->categoryName));
            safe_strcpy(out->detectedOS, "Windows 10 / 11 (NT Kernel)", sizeof(out->detectedOS));
            safe_strcpy(out->hardwareModel, "PC / Workstation", sizeof(out->hardwareModel));
            out->confidencePercent = 88;
            return 1;
        }
    }

    // 9. Linux Server / Appliance
    if (has_port(p, 22) || (ttl > 0 && ttl <= 64)) {
        out->categoryCode = DEVICE_CAT_LINUX_SERVER;
        safe_strcpy(out->categoryName, "Linux 서버 / 어플라이언스 (Linux Node)", sizeof(out->categoryName));
        if (stristr_local(ssh, "Ubuntu")) safe_strcpy(out->detectedOS, "Ubuntu Linux Server", sizeof(out->detectedOS));
        else if (stristr_local(ssh, "Debian")) safe_strcpy(out->detectedOS, "Debian GNU/Linux", sizeof(out->detectedOS));
        else if (stristr_local(ssh, "CentOS") || stristr_local(ssh, "Red Hat")) safe_strcpy(out->detectedOS, "RHEL / Rocky Linux", sizeof(out->detectedOS));
        else safe_strcpy(out->detectedOS, "Linux Kernel (TTL 64)", sizeof(out->detectedOS));
        safe_strcpy(out->hardwareModel, "Server / Linux System", sizeof(out->hardwareModel));
        out->confidencePercent = 82;
        return 1;
    }

    return 1;
}

// ============================================================================
// Security Vulnerability & Risk Assessment Implementation
// ============================================================================
int Fingerprint_AssessSecurityRisk(
    const HostFingerprintProfile* p,
    SecurityRiskResult* outRisk
) {
    if (!p || !outRisk) return 0;
    memset(outRisk, 0, sizeof(SecurityRiskResult));

    int score = 0;
    int count = 0;
    char vuln[512] = {0};
    char rec[256] = "현재 감지된 고위험 포트가 없으며 기본 방화벽 규칙을 유지하십시오.";

    #define APPEND_VULN(desc) do { \
        if (strlen(vuln) + strlen(desc) + 4 < sizeof(vuln)) { \
            if (count > 0) strcat(vuln, "; "); \
            strcat(vuln, desc); \
            count++; \
        } \
    } while (0)

    // Critical Security Risks (+35 points each)
    if (has_port(p, 23)) {
        score += 35;
        APPEND_VULN("[CRITICAL] Telnet(23) 비암호화 원격 터미널 노출 (패킷 스니핑/자격증명 탈취 위험)");
        safe_strcpy(rec, "즉시 Telnet을 비활성화하고 암호화된 SSH(22)로 교체하세요.", sizeof(rec));
    }

    if (has_port(p, 6379)) {
        score += 35;
        APPEND_VULN("[CRITICAL] Redis(6379) 비인증 외부 노출 위험 (원격 임의 코드 실행 및 RCE 공격 표적)");
        safe_strcpy(rec, "Redis에 비밀번호(requirepass)를 설정하고 로컬호스트(127.0.0.1)로 바인딩을 제한하세요.", sizeof(rec));
    }

    if (has_port(p, 27017)) {
        score += 35;
        APPEND_VULN("[CRITICAL] MongoDB(27017) 데이터베이스 외부 노출 (인증 누락 및 데이터 탈취 위험)");
    }

    if (has_port(p, 9200)) {
        score += 30;
        APPEND_VULN("[CRITICAL] Elasticsearch(9200) REST API 노출 (인증 미적용 시 클러스터 데이터 삭제 가능)");
    }

    if (has_port(p, 21)) {
        score += 25;
        APPEND_VULN("[HIGH] FTP(21) 비암호화 파일 전송 포트 개방 (평문 비밀번호 노출 / 익명 로그인 점검 필요)");
        if (score <= 35) safe_strcpy(rec, "FTP 대신 SFTP/SCP(포트 22) 또는 FTPS(암호화) 프로토콜을 사용하십시오.", sizeof(rec));
    }

    // High Risks (+20~25 points)
    if (has_port(p, 5900)) {
        score += 25;
        APPEND_VULN("[HIGH] VNC(5900) 비암호화 원격 데스크톱 개방 (화면 스크린 및 키보드 입력 가로채기 취약)");
    }

    if (has_port(p, 554)) {
        score += 20;
        APPEND_VULN("[HIGH] RTSP(554) 비디오 스트리밍 개방 (기본 관리자 계정 해킹 및 실시간 영상 유출 주의)");
    }

    if (has_port(p, 445)) {
        score += 20;
        APPEND_VULN("[HIGH] SMB/CIFS(445) 윈도우 파일 공유 개방 (랜섬웨어 확산 및 이터널블루 표적 주의)");
        if (score <= 40) safe_strcpy(rec, "공용 네트워크 또는 외부 인터넷으로 445 포트가 노출되지 않도록 방화벽 차단을 적용하세요.", sizeof(rec));
    }

    if (has_port(p, 1433) || has_port(p, 3306) || has_port(p, 5432) || has_port(p, 1521)) {
        score += 15;
        APPEND_VULN("[MEDIUM] RDBMS 데이터베이스 포트 직접 개방 (사내망 전용 서브넷 분리 권장)");
    }

    // Medium Risks (+10~15 points)
    if (has_port(p, 3389)) {
        score += 15;
        APPEND_VULN("[MEDIUM] RDP(3389) 원격 데스크톱 개방 (무차별 대입 공격 및 BlueKeep 계열 취약점 유의)");
    }

    if (has_port(p, 80) && !has_port(p, 443)) {
        score += 10;
        APPEND_VULN("[LOW] HTTP(80) 비암호화 웹 서비스 단독 운영 (HTTPS 암호화 적용 권장)");
    }

    if (has_port(p, 161)) {
        score += 10;
        APPEND_VULN("[LOW] SNMP(161) 네트워크 관리 포트 개방 (기본 'public' 커뮤니티 스트링 변경 필요)");
    }

    // Normalize Score (Cap at 100)
    if (score > 100) score = 100;
    outRisk->riskScore = score;
    outRisk->vulnerabilityCount = count;
    safe_strcpy(outRisk->vulnerabilityList, vuln, sizeof(outRisk->vulnerabilityList));
    safe_strcpy(outRisk->recommendation, rec, sizeof(outRisk->recommendation));

    // Set Level
    if (score == 0) {
        outRisk->riskLevel = RISK_LEVEL_CLEAN;
        safe_strcpy(outRisk->riskLevelName, "CLEAN", sizeof(outRisk->riskLevelName));
    } else if (score <= 20) {
        outRisk->riskLevel = RISK_LEVEL_LOW;
        safe_strcpy(outRisk->riskLevelName, "LOW", sizeof(outRisk->riskLevelName));
    } else if (score <= 50) {
        outRisk->riskLevel = RISK_LEVEL_MEDIUM;
        safe_strcpy(outRisk->riskLevelName, "MEDIUM", sizeof(outRisk->riskLevelName));
    } else if (score <= 80) {
        outRisk->riskLevel = RISK_LEVEL_HIGH;
        safe_strcpy(outRisk->riskLevelName, "HIGH", sizeof(outRisk->riskLevelName));
    } else {
        outRisk->riskLevel = RISK_LEVEL_CRITICAL;
        safe_strcpy(outRisk->riskLevelName, "CRITICAL", sizeof(outRisk->riskLevelName));
    }

    return 1;
}

// ============================================================================
// Combined Analysis Full Host
// ============================================================================
int Fingerprint_AnalyzeFullHost(
    const HostFingerprintProfile* profile,
    DeviceClassificationResult* outClass,
    SecurityRiskResult* outRisk
) {
    if (!profile || !outClass || !outRisk) return 0;
    Fingerprint_ClassifyDevice(profile, outClass);
    Fingerprint_AssessSecurityRisk(profile, outRisk);
    return 1;
}

// ============================================================================
// JSON Bridge Interface (Fast C to Go/JS Interop)
// ============================================================================
static void json_escape_str(const char* src, char* dst, size_t cap) {
    if (!dst || cap == 0) return;
    if (!src) { dst[0] = '\0'; return; }
    size_t j = 0;
    for (size_t i = 0; src[i] != '\0' && j + 2 < cap; i++) {
        unsigned char c = (unsigned char)src[i];
        if (c == '"' || c == '\\') {
            if (j + 3 >= cap) break;
            dst[j++] = '\\';
            dst[j++] = (char)c;
        } else if (c == '\n') {
            if (j + 3 >= cap) break;
            dst[j++] = '\\'; dst[j++] = 'n';
        } else if (c == '\r') {
            if (j + 3 >= cap) break;
            dst[j++] = '\\'; dst[j++] = 'r';
        } else if (c == '\t') {
            if (j + 3 >= cap) break;
            dst[j++] = '\\'; dst[j++] = 't';
        } else if (c >= 0x20) {
            dst[j++] = (char)c;
        }
    }
    dst[j] = '\0';
}

/* Finds top-level JSON key value pointer inside a JSON object without matching substrings inside string values */
static const char* find_json_value(const char* json, const char* key) {
    if (!json || !key) return NULL;
    size_t klen = strlen(key);
    const char* p = json;
    int depth = 0;

    while (*p) {
        if (*p == '{' || *p == '[') {
            depth++;
            p++;
        } else if (*p == '}' || *p == ']') {
            depth--;
            p++;
        } else if (*p == '"') {
            const char* strStart = p + 1;
            p++;
            while (*p && *p != '"') {
                if (*p == '\\' && *(p + 1) != '\0') p += 2;
                else p++;
            }
            size_t tokLen = (size_t)(p - strStart);
            if (*p == '"') p++;

            const char* after = p;
            while (*after && (*after == ' ' || *after == '\t' || *after == '\r' || *after == '\n')) after++;
            if (depth == 1 && *after == ':' && tokLen == klen && strncmp(strStart, key, klen) == 0) {
                after++;
                while (*after && (*after == ' ' || *after == '\t' || *after == '\r' || *after == '\n')) after++;
                return after;
            }
        } else {
            p++;
        }
    }
    return NULL;
}

static void extract_json_str_safe(const char* json, const char* key, char* target, size_t cap) {
    if (!target || cap == 0) return;
    target[0] = '\0';
    const char* val = find_json_value(json, key);
    if (!val || *val != '"') return;
    val++;
    size_t idx = 0;
    while (*val && *val != '"' && idx < cap - 1) {
        if (*val == '\\' && *(val + 1) != '\0') {
            val++;
            char esc = *val++;
            if (esc == 'n') target[idx++] = '\n';
            else if (esc == 'r') target[idx++] = '\r';
            else if (esc == 't') target[idx++] = '\t';
            else target[idx++] = esc;
        } else {
            target[idx++] = *val++;
        }
    }
    target[idx] = '\0';
}

int Fingerprint_AnalyzeJson(
    const char* inJson,
    char* outJson,
    int maxOutLen
) {
    if (!inJson || !outJson || maxOutLen < 128) return 0;

    HostFingerprintProfile prof;
    memset(&prof, 0, sizeof(prof));

    extract_json_str_safe(inJson, "ip", prof.ip, sizeof(prof.ip));
    extract_json_str_safe(inJson, "mac", prof.mac, sizeof(prof.mac));
    extract_json_str_safe(inJson, "vendor", prof.vendor, sizeof(prof.vendor));
    extract_json_str_safe(inJson, "hostname", prof.hostname, sizeof(prof.hostname));
    extract_json_str_safe(inJson, "workgroup", prof.workgroup, sizeof(prof.workgroup));
    extract_json_str_safe(inJson, "serverHeader", prof.serverHeader, sizeof(prof.serverHeader));
    extract_json_str_safe(inJson, "sshBanner", prof.sshBanner, sizeof(prof.sshBanner));
    extract_json_str_safe(inJson, "rtspServer", prof.rtspServer, sizeof(prof.rtspServer));

    const char* ttlVal = find_json_value(inJson, "ttl");
    if (ttlVal && (isdigit((unsigned char)*ttlVal) || *ttlVal == '-')) {
        prof.ttl = atoi(ttlVal);
    }

    const char* portsVal = find_json_value(inJson, "openPorts");
    if (portsVal && *portsVal == '[') {
        const char* p = portsVal + 1;
        while (*p && *p != ']' && prof.openPortCount < 64) {
            while (*p == ' ' || *p == ',' || *p == '\t') p++;
            if (*p == '-') {
                p++;
                while (isdigit((unsigned char)*p)) p++;
            } else if (isdigit((unsigned char)*p)) {
                int portNum = atoi(p);
                if (portNum > 0 && portNum <= 65535) {
                    prof.openPorts[prof.openPortCount++] = portNum;
                }
                while (isdigit((unsigned char)*p)) p++;
            } else {
                p++;
            }
        }
    }

    DeviceClassificationResult cls;
    SecurityRiskResult risk;
    Fingerprint_AnalyzeFullHost(&prof, &cls, &risk);

    char escCat[256], escOs[256], escModel[256], escVuln[1024], escRec[512];
    json_escape_str(cls.categoryName, escCat, sizeof(escCat));
    json_escape_str(cls.detectedOS, escOs, sizeof(escOs));
    json_escape_str(cls.hardwareModel, escModel, sizeof(escModel));
    json_escape_str(risk.vulnerabilityList, escVuln, sizeof(escVuln));
    json_escape_str(risk.recommendation, escRec, sizeof(escRec));

    int written = snprintf(outJson, maxOutLen,
        "{"
        "\"categoryCode\":%d,"
        "\"categoryName\":\"%s\","
        "\"detectedOS\":\"%s\","
        "\"hardwareModel\":\"%s\","
        "\"confidencePercent\":%d,"
        "\"riskLevel\":\"%s\","
        "\"riskScore\":%d,"
        "\"vulnerabilityCount\":%d,"
        "\"vulnerabilities\":\"%s\","
        "\"recommendation\":\"%s\""
        "}",
        cls.categoryCode,
        escCat,
        escOs,
        escModel,
        cls.confidencePercent,
        risk.riskLevelName,
        risk.riskScore,
        risk.vulnerabilityCount,
        escVuln,
        escRec
    );

    return (written > 0 && written < maxOutLen) ? 1 : 0;
}

#ifdef _WIN32
BOOL WINAPI DllMain(HINSTANCE hinstDLL, DWORD fdwReason, LPVOID lpvReserved) {
    (void)hinstDLL;
    (void)lpvReserved;
    switch (fdwReason) {
        case DLL_PROCESS_ATTACH:
            break;
        case DLL_PROCESS_DETACH:
            break;
    }
    return TRUE;
}
#endif
