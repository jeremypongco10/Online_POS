<?php

namespace App\Libraries;

/**
 * Turns an uploaded image (the business logo) into the packed 1-bit raster
 * format ESC/POS's `GS v 0` command prints — the piece that lets a
 * Bluetooth thermal printer show the logo at all, since it never goes
 * through a browser's print pipeline (see bluetoothPrinter.ts on the
 * frontend) and so has no other way to rasterize an image.
 *
 * Deliberately server-side, not done in the browser from the uploaded
 * file's own URL: a cross-origin `<canvas>` read of an image without
 * matching CORS headers on that specific response throws (a "tainted
 * canvas"), and the static file server behind /uploads/ doesn't go through
 * the app's own CORS filter at all — only requests actually routed through
 * CodeIgniter do. Converting here, once, and handing the receipt endpoint
 * already-packed bytes sidesteps that entirely: the browser never touches
 * the raw image, only base64 bytes over the same authenticated API call
 * that already carries the rest of the receipt.
 */
class EscPosImageService
{
    /**
     * Fits the image within maxWidthDots x maxHeightDots (never upscales),
     * converts to grayscale, and dithers to black/white with Floyd–Steinberg
     * error diffusion — a flat threshold alone banded badly on the soft
     * edges and gradients real logos tend to have; diffusing the rounding
     * error to the neighbouring pixels is what keeps those readable instead
     * of muddy.
     *
     * The returned bitmap is always exactly maxWidthDots wide, with the
     * fitted logo horizontally centered inside it on a white margin either
     * side, even when the logo itself is narrower — `GS v 0` (the ESC/POS
     * raster-image command this feeds) always prints flush against the left
     * margin and ignores the text-alignment command entirely on real
     * firmware, so "centered" has to already be baked into the pixels
     * themselves rather than left to the printer.
     *
     * @return array{width:int,height:int,bytes:string}|null null if the
     *                                                        file can't be read as an image at all (corrupt upload, GD missing the format)
     */
    public function rasterFromFile(string $absolutePath, int $maxWidthDots = 384, int $maxHeightDots = 180): ?array
    {
        if (! extension_loaded('gd')) {
            return null;
        }

        $data = @file_get_contents($absolutePath);
        if ($data === false) {
            return null;
        }

        $src = @imagecreatefromstring($data);
        if ($src === false) {
            return null;
        }

        $srcWidth = imagesx($src);
        $srcHeight = imagesy($src);
        if ($srcWidth < 1 || $srcHeight < 1) {
            imagedestroy($src);

            return null;
        }

        // Fit within the box, never upscale past the source's own size —
        // a small logo stays small rather than getting blown up into
        // visible dithering noise.
        $scale = min($maxWidthDots / $srcWidth, $maxHeightDots / $srcHeight, 1.0);
        $fittedWidth = max(1, (int) round($srcWidth * $scale));
        $fittedHeight = max(1, (int) round($srcHeight * $scale));

        // White background first, alpha blending on: a transparent PNG's
        // empty areas composite onto white (i.e. print as nothing) instead
        // of keeping an alpha channel this format has no way to express.
        $resized = imagecreatetruecolor($fittedWidth, $fittedHeight);
        imagefill($resized, 0, 0, imagecolorallocate($resized, 255, 255, 255));
        imagesavealpha($src, true);
        imagealphablending($resized, true);
        imagecopyresampled($resized, $src, 0, 0, 0, 0, $fittedWidth, $fittedHeight, $srcWidth, $srcHeight);
        imagedestroy($src);

        // Composited onto a full-width white canvas, centered — see this
        // method's own docblock for why centering has to happen here,
        // in the pixels, rather than left to the printer.
        $width = $maxWidthDots;
        $height = $fittedHeight;
        $canvas = imagecreatetruecolor($width, $height);
        imagefill($canvas, 0, 0, imagecolorallocate($canvas, 255, 255, 255));
        $xOffset = intdiv($width - $fittedWidth, 2);
        imagecopy($canvas, $resized, $xOffset, 0, 0, 0, $fittedWidth, $fittedHeight);
        imagedestroy($resized);

        $gray = $this->toGrayscale($canvas, $width, $height);
        imagedestroy($canvas);

        $bits = $this->ditherFloydSteinberg($gray, $width, $height);
        $bytes = $this->packBits($bits, $width, $height);

        return ['width' => $width, 'height' => $height, 'bytes' => $bytes];
    }

    /** @return float[][] luminance (0-255) per [y][x] */
    private function toGrayscale($image, int $width, int $height): array
    {
        $gray = [];
        for ($y = 0; $y < $height; $y++) {
            $row = [];
            for ($x = 0; $x < $width; $x++) {
                $rgb = imagecolorat($image, $x, $y);
                $r = ($rgb >> 16) & 0xFF;
                $g = ($rgb >> 8) & 0xFF;
                $b = $rgb & 0xFF;
                // Rec. 601 luma weights — the standard grayscale conversion,
                // not a plain average, so a saturated blue logo doesn't read
                // as darker than it visually is.
                $row[] = 0.299 * $r + 0.587 * $g + 0.114 * $b;
            }
            $gray[] = $row;
        }

        return $gray;
    }

    /**
     * @param float[][] $gray mutated in place as the working error-diffusion buffer
     *
     * @return bool[][] true = print (black) dot, per [y][x]
     */
    private function ditherFloydSteinberg(array $gray, int $width, int $height): array
    {
        $bits = [];
        for ($y = 0; $y < $height; $y++) {
            $bits[$y] = array_fill(0, $width, false);
        }

        for ($y = 0; $y < $height; $y++) {
            for ($x = 0; $x < $width; $x++) {
                $old = $gray[$y][$x];
                $new = $old < 128 ? 0 : 255;
                $bits[$y][$x] = ($new === 0);
                $error = $old - $new;

                if ($x + 1 < $width) {
                    $gray[$y][$x + 1] += $error * 7 / 16;
                }
                if ($y + 1 < $height) {
                    if ($x - 1 >= 0) {
                        $gray[$y + 1][$x - 1] += $error * 3 / 16;
                    }
                    $gray[$y + 1][$x] += $error * 5 / 16;
                    if ($x + 1 < $width) {
                        $gray[$y + 1][$x + 1] += $error * 1 / 16;
                    }
                }
            }
        }

        return $bits;
    }

    /**
     * MSB-first, each row padded to a whole byte — exactly what `GS v 0`
     * expects, and what the frontend's EscPosBuilder::rasterImage() decodes
     * back into a printer command. The two sides of this format have to
     * agree byte-for-byte; if either changes, so must the other.
     */
    private function packBits(array $bits, int $width, int $height): string
    {
        $bytesPerRow = (int) ceil($width / 8);
        $out = str_repeat("\0", $bytesPerRow * $height);

        for ($y = 0; $y < $height; $y++) {
            for ($x = 0; $x < $width; $x++) {
                if (! $bits[$y][$x]) {
                    continue;
                }
                $byteIndex = $y * $bytesPerRow + intdiv($x, 8);
                $bitInByte = 7 - ($x % 8);
                $out[$byteIndex] = chr(ord($out[$byteIndex]) | (1 << $bitInByte));
            }
        }

        return $out;
    }
}
