/**
 * Grid IP Scanner2 - Module 5: grid_banner_grabber.h
 * Deep Protocol Banner Grabber & Metadata Extractor (HTTP, SSH, RTSP, TLS)
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

#ifndef GRID_BANNER_GRABBER_H
#define GRID_BANNER_GRABBER_H

#ifdef __cplusplus
extern "C" {
#endif

#ifdef _WIN32
  #ifdef BUILDING_GRID_BANNER_GRABBER
    #define BANNER_API __declspec(dllexport)
  #else
    #define BANNER_API __declspec(dllimport)
  #endif
#else
  #define BANNER_API
#endif

typedef struct {
    char serverHeader[128];
    char htmlTitle[128];
    char sshBanner[128];
    char rtspServer[128];
    char tlsSubject[128];
    int detectedProtocol; // 1=HTTP, 2=SSH, 3=RTSP, 4=TLS/HTTPS
} DeepBannerResult;

BANNER_API int Banner_GetVersion(void);

BANNER_API int Banner_GrabHttp(
    const char* ip,
    int port,
    int timeoutMs,
    char* outServerHeader,
    char* outHtmlTitle,
    int maxLen
);

BANNER_API int Banner_GrabSsh(
    const char* ip,
    int port,
    int timeoutMs,
    char* outSshBanner,
    int maxLen
);

BANNER_API int Banner_GrabRtsp(
    const char* ip,
    int port,
    int timeoutMs,
    char* outRtspServer,
    int maxLen
);

BANNER_API int Banner_GrabTlsSni(
    const char* ip,
    int port,
    int timeoutMs,
    char* outSubject,
    int maxLen
);

BANNER_API int Banner_GrabDeepAll(
    const char* ip,
    int port,
    int timeoutMs,
    DeepBannerResult* outResult
);

#ifdef __cplusplus
}
#endif

#endif // GRID_BANNER_GRABBER_H
