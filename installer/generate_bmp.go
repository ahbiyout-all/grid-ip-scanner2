package main

import (
	"bytes"
	"encoding/binary"
	"image"
	"image/color"
	"image/draw"
	_ "image/png"
	"os"
)

func writeBMP24(path string, img image.Image) error {
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()

	rowSize := (width*3 + 3) &^ 3
	pixelArraySize := rowSize * height
	fileSize := 54 + pixelArraySize

	buf := new(bytes.Buffer)

	// BMP Header (14 bytes)
	buf.WriteString("BM")
	binary.Write(buf, binary.LittleEndian, uint32(fileSize))
	binary.Write(buf, binary.LittleEndian, uint16(0))
	binary.Write(buf, binary.LittleEndian, uint16(0))
	binary.Write(buf, binary.LittleEndian, uint32(54)) // offset

	// DIB Header (BITMAPINFOHEADER - 40 bytes)
	binary.Write(buf, binary.LittleEndian, uint32(40))
	binary.Write(buf, binary.LittleEndian, int32(width))
	binary.Write(buf, binary.LittleEndian, int32(height)) // positive = bottom-up
	binary.Write(buf, binary.LittleEndian, uint16(1))     // planes
	binary.Write(buf, binary.LittleEndian, uint16(24))    // bits per pixel
	binary.Write(buf, binary.LittleEndian, uint32(0))     // BI_RGB (uncompressed)
	binary.Write(buf, binary.LittleEndian, uint32(pixelArraySize))
	binary.Write(buf, binary.LittleEndian, int32(2835))   // 72 DPI
	binary.Write(buf, binary.LittleEndian, int32(2835))
	binary.Write(buf, binary.LittleEndian, uint32(0))
	binary.Write(buf, binary.LittleEndian, uint32(0))

	// Pixel data: bottom-to-top, BGR order
	pad := make([]byte, rowSize-width*3)
	for y := height - 1; y >= 0; y-- {
		for x := 0; x < width; x++ {
			c := img.At(bounds.Min.X+x, bounds.Min.Y+y)
			r, g, b, a := c.RGBA()
			if a == 0 {
				buf.WriteByte(255) // white background for transparent
				buf.WriteByte(255)
				buf.WriteByte(255)
			} else {
				// un-premultiply alpha
				r8 := uint8((r * 255) / a)
				g8 := uint8((g * 255) / a)
				b8 := uint8((b * 255) / a)
				buf.WriteByte(b8)
				buf.WriteByte(g8)
				buf.WriteByte(r8)
			}
		}
		buf.Write(pad)
	}

	return os.WriteFile(path, buf.Bytes(), 0644)
}

func resizeNearest(src image.Image, w, h int) *image.RGBA {
	dst := image.NewRGBA(image.Rect(0, 0, w, h))
	srcBounds := src.Bounds()
	sw := srcBounds.Dx()
	sh := srcBounds.Dy()

	for y := 0; y < h; y++ {
		sy := srcBounds.Min.Y + (y*sh)/h
		for x := 0; x < w; x++ {
			sx := srcBounds.Min.X + (x*sw)/w
			dst.Set(x, y, src.At(sx, sy))
		}
	}
	return dst
}

func main() {
	pngPath := "icon.png"
	if _, err := os.Stat(pngPath); err != nil {
		pngPath = "../icon.png"
	}
	f, err := os.Open(pngPath)
	if err != nil {
		return
	}
	defer f.Close()

	src, _, err := image.Decode(f)
	if err != nil {
		return
	}

	// 1. Wizard Small Image (55x55)
	small := resizeNearest(src, 55, 55)
	_ = writeBMP24("installer/wizard_small.bmp", small)
	_ = writeBMP24("wizard_small.bmp", small)

	// 2. Wizard Large Image (164x314) with branded blue background
	large := image.NewRGBA(image.Rect(0, 0, 164, 314))
	// Fill with deep modern blue gradient background
	draw.Draw(large, large.Bounds(), &image.Uniform{color.RGBA{15, 23, 42, 255}}, image.Point{}, draw.Src)
	// Place 128x128 icon in upper center of large panel
	iconResized := resizeNearest(src, 128, 128)
	draw.Draw(large, image.Rect(18, 50, 18+128, 50+128), iconResized, image.Point{}, draw.Over)

	_ = writeBMP24("installer/wizard_large.bmp", large)
	_ = writeBMP24("wizard_large.bmp", large)
}
