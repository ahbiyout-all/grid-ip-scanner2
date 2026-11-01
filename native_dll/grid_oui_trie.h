/**
 * Grid IP Scanner2 - Module 4: grid_oui_trie.h
 * High-Performance In-Memory Binary Radix-Trie OUI Lookup Engine (<1µs)
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

#ifndef GRID_OUI_TRIE_H
#define GRID_OUI_TRIE_H

#ifdef __cplusplus
extern "C" {
#endif

#ifdef _WIN32
  #ifdef BUILDING_GRID_OUI_TRIE
    #define OUI_TRIE_API __declspec(dllexport)
  #else
    #define OUI_TRIE_API __declspec(dllimport)
  #endif
#else
  #define OUI_TRIE_API
#endif

OUI_TRIE_API int Oui_GetVersion(void);

OUI_TRIE_API int Oui_Initialize(const char* databasePath);

OUI_TRIE_API int Oui_LookupVendor(const char* macAddress, char* outVendorName, int maxLen);

OUI_TRIE_API int Oui_GetEntryCount(void);

OUI_TRIE_API void Oui_Release(void);

#ifdef __cplusplus
}
#endif

#endif // GRID_OUI_TRIE_H
