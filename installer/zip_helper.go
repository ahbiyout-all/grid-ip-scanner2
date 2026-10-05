package main

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
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
		rel = filepath.ToSlash(rel)
		if info.IsDir() {
			w.Create(rel + "/")
			return nil
		}
		f, err := w.Create(rel)
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
