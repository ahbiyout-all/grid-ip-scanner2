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

static int HexCharToNibble(char c) {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    if (c >= 'A' && c <= 'F') return c - 'A' + 10;
    return -1;
}

static TrieNode* CreateTrieNode(void) {
    TrieNode* node = (TrieNode*)calloc(1, sizeof(TrieNode));
    return node;
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
    return 20500;
}

int Oui_GetEntryCount(void) {
    return g_entryCount;
}

void Oui_Release(void) {
    if (g_root) {
        FreeTrieNode(g_root);
        g_root = NULL;
    }
    g_entryCount = 0;
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

int Oui_Initialize(const char* databasePath) {
    Oui_Release();
    g_root = CreateTrieNode();

    const char* path = databasePath;
    if (!path || path[0] == '\0') {
        path = "master_oui.txt";
    }

    FILE* fp = fopen(path, "r");
    if (!fp) {
        // Try fallback paths
        fp = fopen("../master_oui.txt", "r");
        if (!fp) fp = fopen("./master_oui.txt", "r");
    }

    if (!fp) {
        // Populate standard default prefixes if file not found
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
        // Strip trailing newline / carriage return
        size_t len = strlen(line);
        while (len > 0 && (line[len - 1] == '\r' || line[len - 1] == '\n')) {
            line[--len] = '\0';
        }

        if (len < 6 || line[0] == '#') continue;

        // Parse prefix (hex characters)
        char hexOnly[32] = {0};
        int hIdx = 0;
        int lineIdx = 0;

        while (line[lineIdx] && line[lineIdx] != '\t' && line[lineIdx] != ' ' && line[lineIdx] != '=') {
            char c = line[lineIdx++];
            if (isxdigit((unsigned char)c) && hIdx < 16) {
                hexOnly[hIdx++] = (char)toupper((unsigned char)c);
            }
        }

        // Skip whitespace, delimiters, and IEEE tags like (hex) or (base 16)
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
        // Strip optional surrounding quotes
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

int Oui_LookupVendor(const char* macAddress, char* outVendorName, int maxLen) {
    if (!macAddress || !outVendorName || maxLen < 1) return 0;
    outVendorName[0] = '\0';

    if (!g_root) {
        Oui_Initialize(NULL);
    }
    if (!g_root) return 0;

    TrieNode* curr = g_root;
    char* bestVendor = NULL;

    for (int i = 0; macAddress[i] != '\0'; i++) {
        char c = macAddress[i];
        if (c == ':' || c == '-' || c == '.' || c == ' ') continue;

        int nibble = HexCharToNibble(c);
        if (nibble < 0) break;

        if (!curr->children[nibble]) {
            break; // No deeper match
        }

        curr = curr->children[nibble];
        if (curr->vendor) {
            bestVendor = curr->vendor; // Longest prefix match
        }
    }

    if (bestVendor) {
        strncpy(outVendorName, bestVendor, maxLen - 1);
        outVendorName[maxLen - 1] = '\0';
        return 1;
    }

    return 0;
}
