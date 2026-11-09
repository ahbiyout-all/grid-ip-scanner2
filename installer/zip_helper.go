package main

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

func main() {
	if len(os.Args) < 3 {
		fmt.Println("Usage: zip_helper <srcDir> <destZip>")
		os.Exit(1)
	}
	srcDir := os.Args[1]
	destZip := os.Args[2]

	outFile, err := os.Create(destZip)
	if err != nil {
		fmt.Printf("Failed to create zip file: %v\n", err)
		os.Exit(1)
	}
	defer outFile.Close()

	w := zip.NewWriter(outFile)

	err = filepath.Walk(srcDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if path == srcDir {
			return nil
		}
		rel, err := filepath.Rel(srcDir, path)
		if err != nil {
			return nil
		}
		relSlash := filepath.ToSlash(rel)
		lowerRel := strings.ToLower(relSlash)

		// Exclude development, source, build artifacts, git, modules, mobile, and installer folders
		if strings.HasPrefix(lowerRel, "node_modules") ||
			strings.HasPrefix(lowerRel, ".git") ||
			strings.HasPrefix(lowerRel, ".github") ||
			strings.HasPrefix(lowerRel, ".vscode") ||
			strings.HasPrefix(lowerRel, ".aistudio") ||
			strings.HasPrefix(lowerRel, "android") ||
			strings.HasPrefix(lowerRel, "dist_android") ||
			strings.HasPrefix(lowerRel, "installer") ||
			strings.HasPrefix(lowerRel, "winres") ||
			strings.HasPrefix(lowerRel, "src") ||
			strings.HasPrefix(lowerRel, "dist_releases") ||
			strings.HasPrefix(lowerRel, "dist_installer") ||
			strings.HasPrefix(lowerRel, "scripts") ||
			strings.HasPrefix(lowerRel, "portable") ||
			strings.HasPrefix(lowerRel, "go/") ||
			strings.Contains(lowerRel, "/portable/") {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		// Exclude source code files (.go, .ts, .tsx, .c, .h, .bat, .sh, .iss, .isl, .map, .lock)
		if strings.HasSuffix(lowerRel, ".go") ||
			strings.HasSuffix(lowerRel, ".ts") ||
			strings.HasSuffix(lowerRel, ".tsx") ||
			strings.HasSuffix(lowerRel, ".c") ||
			strings.HasSuffix(lowerRel, ".h") ||
			strings.HasSuffix(lowerRel, ".bat") ||
			strings.HasSuffix(lowerRel, ".sh") ||
			strings.HasSuffix(lowerRel, ".iss") ||
			strings.HasSuffix(lowerRel, ".isl") ||
			strings.HasSuffix(lowerRel, ".map") ||
			strings.HasSuffix(lowerRel, ".lock") {
			return nil
		}

		// Exclude build configuration files not needed in production installer
		if strings.EqualFold(filepath.Base(lowerRel), "tsconfig.json") ||
			strings.EqualFold(filepath.Base(lowerRel), "vite.config.ts") ||
			strings.EqualFold(filepath.Base(lowerRel), "capacitor.config.json") ||
			strings.EqualFold(filepath.Base(lowerRel), "metadata.json") ||
			strings.EqualFold(filepath.Base(lowerRel), ".gitignore") ||
			strings.EqualFold(filepath.Base(lowerRel), "package-lock.json") ||
			strings.EqualFold(filepath.Base(lowerRel), "wizard_large.bmp") ||
			strings.EqualFold(filepath.Base(lowerRel), "wizard_small.bmp") {
			return nil
		}

		// Exclude unnecessary docs (PATCH_NOTE.md, WorkLog.md, etc.) - Only keep LICENSE.md
		if strings.HasPrefix(lowerRel, "docs/") && !strings.EqualFold(filepath.Base(lowerRel), "license.md") {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if (strings.HasSuffix(lowerRel, ".md") || strings.HasSuffix(lowerRel, ".txt")) &&
			!strings.EqualFold(filepath.Base(lowerRel), "license.md") &&
			!strings.EqualFold(filepath.Base(lowerRel), "master_oui.txt") {
			return nil
		}

		// Exclude temporary, zip, log or setup executables
		if strings.HasSuffix(lowerRel, ".zip") || strings.HasSuffix(lowerRel, ".tmp") ||
			strings.HasSuffix(lowerRel, ".log") || strings.HasSuffix(lowerRel, "_setup.exe") {
			return nil
		}

		// Exclude portable versioned executables (Grid IP Scanner2 v*.exe) - Installer only installs Grid_IP_Scanner2.exe
		baseLower := strings.ToLower(filepath.Base(relSlash))
		if strings.HasPrefix(baseLower, "grid ip scanner2 v") && strings.HasSuffix(baseLower, ".exe") {
			return nil
		}

		if info.IsDir() {
			w.Create(relSlash + "/")
			return nil
		}
		f, err := w.Create(relSlash)
		if err != nil {
			return err
		}
		in, err := os.Open(path)
		if err != nil {
			return err
		}
		defer in.Close()
		_, err = io.Copy(f, in)
		return err
	})

	if err != nil {
		fmt.Printf("Error walking directory: %v\n", err)
		os.Exit(1)
	}

	w.Close()
	fmt.Printf("[OK] Successfully zipped %s -> %s\n", srcDir, destZip)
}
