/**
 * Grid IP Scanner2 - Module 4: grid_oui_trie.c
 * High-Performance In-Memory Binary Radix-Trie OUI Lookup Engine (<1µs)
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

#ifndef BUILDING_GRID_OUI_TRIE
#define BUILDING_GRID_OUI_TRIE
#endif
#include "grid_oui_trie.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

#ifdef _WIN32
#include <windows.h>
#endif

typedef struct TrieNode {
    struct TrieNode* children[16]; // 16-ary nibble trie (0-9, A-F)
    char* vendor;
} TrieNode;

static TrieNode* g_root = NULL;
static int g_entryCount = 0;

#ifdef _WIN32
static CRITICAL_SECTION g_ouiLock;
static volatile LONG g_ouiLockState = 0; /* 0=uninit, 1=initing, 2=ready */

static void EnsureOuiLock(void) {
    if (g_ouiLockState == 2) return;
    if (InterlockedCompareExchange(&g_ouiLockState, 1, 0) == 0) {
        InitializeCriticalSection(&g_ouiLock);
        InterlockedExchange(&g_ouiLockState, 2);
    } else {
        while (g_ouiLockState != 2) Sleep(0);
    }
}
#define OUI_LOCK()   do { EnsureOuiLock(); EnterCriticalSection(&g_ouiLock); } while (0)
#define OUI_UNLOCK() do { LeaveCriticalSection(&g_ouiLock); } while (0)
#else
#define OUI_LOCK()   ((void)0)
#define OUI_UNLOCK() ((void)0)
#endif

static int HexCharToNibble(char c) {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    if (c >= 'A' && c <= 'F') return c - 'A' + 10;
    return -1;
}

static TrieNode* CreateTrieNode(void) {
    return (TrieNode*)calloc(1, sizeof(TrieNode));
}

static void FreeTrieNode(TrieNode* node) {
    if (!node) return;
    for (int i = 0; i < 16; i++) {
        if (node->children[i]) {
            FreeTrieNode(node->children[i]);
            node->children[i] = NULL;
        }
    }
    if (node->vendor) {
        free(node->vendor);
        node->vendor = NULL;
    }
    free(node);
}

int Oui_GetVersion(void) {
    return 20501; /* v2.5.1 audited */
}

int Oui_GetEntryCount(void) {
    OUI_LOCK();
    int count = g_entryCount;
    OUI_UNLOCK();
    return count;
}

static void ReleaseInternal(void) {
    if (g_root) {
        FreeTrieNode(g_root);
        g_root = NULL;
    }
    g_entryCount = 0;
}

void Oui_Release(void) {
    OUI_LOCK();
    ReleaseInternal();
    OUI_UNLOCK();
}

static void TrieInsert(const char* hexPrefix, const char* vendor) {
    if (!g_root) g_root = CreateTrieNode();
    if (!hexPrefix || !vendor || !g_root) return;

    TrieNode* curr = g_root;
    for (int i = 0; hexPrefix[i] != '\0'; i++) {
        int nibble = HexCharToNibble(hexPrefix[i]);
        if (nibble < 0) continue;

        if (!curr->children[nibble]) {
            curr->children[nibble] = CreateTrieNode();
            if (!curr->children[nibble]) return;
        }
        curr = curr->children[nibble];
    }

    if (curr) {
        int isNew = (curr->vendor == NULL);
        if (curr->vendor) free(curr->vendor);
        curr->vendor = (char*)malloc(strlen(vendor) + 1);
        if (curr->vendor) {
            strcpy(curr->vendor, vendor);
            if (isNew) {
                g_entryCount++;
            }
        }
    }
}

static int InitializeInternal(const char* databasePath) {
    ReleaseInternal();
    g_root = CreateTrieNode();

    const char* path = databasePath;
    if (!path || path[0] == '\0') {
        path = "master_oui.txt";
    }

    FILE* fp = fopen(path, "r");
    if (!fp) {
        fp = fopen("../master_oui.txt", "r");
        if (!fp) fp = fopen("./master_oui.txt", "r");
    }

    if (!fp) {
        TrieInsert("00000C", "Cisco Systems, Inc.");
        TrieInsert("000C29", "VMware, Inc.");
        TrieInsert("005056", "VMware, Inc.");
        TrieInsert("00155D", "Microsoft Corporation (Hyper-V)");
        TrieInsert("001A2B", "Ayecom Technology Co., Ltd.");
        TrieInsert("B827EB", "Raspberry Pi Foundation");
        TrieInsert("DCA632", "Raspberry Pi Trading Ltd");
        TrieInsert("001E8C", "ASUSTek Computer Inc.");
        TrieInsert("3C7A8A", "Apple, Inc.");
        TrieInsert("ACBC32", "Apple, Inc.");
        TrieInsert("F4D488", "Samsung Electronics Co., Ltd.");
        return g_entryCount;
    }

    char line[512];
    while (fgets(line, sizeof(line), fp)) {
        size_t len = strlen(line);
        while (len > 0 && (line[len - 1] == '\r' || line[len - 1] == '\n')) {
            line[--len] = '\0';
        }

        if (len < 6 || line[0] == '#') continue;

        /* Extract prefix token before tab/space/'=' and detect optional /28 or /36 CIDR */
        char rawPrefix[64] = {0};
        int rIdx = 0;
        int lineIdx = 0;

        while (line[lineIdx] && line[lineIdx] != '\t' && line[lineIdx] != ' ' && line[lineIdx] != '=') {
            if (rIdx < (int)sizeof(rawPrefix) - 1) {
                rawPrefix[rIdx++] = line[lineIdx];
            }
            lineIdx++;
        }
        rawPrefix[rIdx] = '\0';

        int cidrBits = 0;
        char* slashPos = strchr(rawPrefix, '/');
        if (slashPos) {
            cidrBits = atoi(slashPos + 1);
            *slashPos = '\0'; /* Strip '/28' or '/36' BEFORE hex extraction */
        }

        char hexOnly[32] = {0};
        int hIdx = 0;
        for (int i = 0; rawPrefix[i] != '\0' && hIdx < 16; i++) {
            if (isxdigit((unsigned char)rawPrefix[i])) {
                hexOnly[hIdx++] = (char)toupper((unsigned char)rawPrefix[i]);
            }
        }

        /* Enforce exact IEEE MA-M (7 nibbles) / MA-S (9 nibbles) nibble precision */
        if (cidrBits == 28 && hIdx >= 7) {
            hexOnly[7] = '\0';
            hIdx = 7;
        } else if (cidrBits == 36 && hIdx >= 9) {
            hexOnly[9] = '\0';
            hIdx = 9;
        } else if (cidrBits == 24 && hIdx >= 6) {
            hexOnly[6] = '\0';
            hIdx = 6;
        }

        while (line[lineIdx]) {
            while (line[lineIdx] == ' ' || line[lineIdx] == '\t' || line[lineIdx] == '=' || line[lineIdx] == ':') {
                lineIdx++;
            }
            if (strncmp(&line[lineIdx], "(hex)", 5) == 0) {
                lineIdx += 5;
            } else if (strncmp(&line[lineIdx], "(base 16)", 9) == 0) {
                lineIdx += 9;
            } else {
                break;
            }
        }

        char* vendor = &line[lineIdx];
        /* Wireshark manuf uses "SHORTNAME\tFULL_VENDOR_NAME"; prefer FULL_VENDOR_NAME */
        char* secondTab = strchr(vendor, '\t');
        if (secondTab && secondTab[1] != '\0') {
            char* fullVendor = secondTab + 1;
            while (*fullVendor == ' ' || *fullVendor == '\t') fullVendor++;
            if (*fullVendor != '\0') {
                vendor = fullVendor;
            }
        }

        if (vendor[0] == '"') {
            vendor++;
            size_t vlen = strlen(vendor);
            if (vlen > 0 && vendor[vlen - 1] == '"') {
                vendor[vlen - 1] = '\0';
            }
        }

        if (hIdx >= 6 && strlen(vendor) > 0) {
            TrieInsert(hexOnly, vendor);
        }
    }

    fclose(fp);
    return g_entryCount;
}

int Oui_Initialize(const char* databasePath) {
    OUI_LOCK();
    int cnt = InitializeInternal(databasePath);
    OUI_UNLOCK();
    return cnt;
}

int Oui_LookupVendor(const char* macAddress, char* outVendorName, int maxLen) {
    if (!macAddress || !outVendorName || maxLen < 1) return 0;
    outVendorName[0] = '\0';

    OUI_LOCK();
    if (!g_root) {
        InitializeInternal(NULL);
    }
    if (!g_root) {
        OUI_UNLOCK();
        return 0;
    }

    TrieNode* curr = g_root;
    char* bestVendor = NULL;

    for (int i = 0; macAddress[i] != '\0'; i++) {
        char c = macAddress[i];
        if (c == ':' || c == '-' || c == '.' || c == ' ') continue;

        int nibble = HexCharToNibble(c);
        if (nibble < 0) break;

        if (!curr->children[nibble]) {
            break;
        }

        curr = curr->children[nibble];
        if (curr->vendor) {
            bestVendor = curr->vendor;
        }
    }

    int found = 0;
    if (bestVendor) {
        strncpy(outVendorName, bestVendor, maxLen - 1);
        outVendorName[maxLen - 1] = '\0';
        found = 1;
    }

    OUI_UNLOCK();
    return found;
}
