<?php

use App\Libraries\EscPosImageService;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * The image->ESC/POS-raster conversion, tested at the byte level against
 * small, deterministic fixture images built with GD in setUp() — pure
 * black/white pixels dither to themselves exactly (the Floyd–Steinberg
 * error term is 0 for a pixel already at 0 or 255), which is what makes an
 * EXACT expected byte string possible to assert here rather than just
 * "something non-empty came back".
 *
 * @internal
 */
final class EscPosImageServiceTest extends CIUnitTestCase
{
    private string $dir;
    private EscPosImageService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->dir = sys_get_temp_dir() . '/escpos_image_test_' . bin2hex(random_bytes(4));
        mkdir($this->dir);
        $this->service = new EscPosImageService();
    }

    protected function tearDown(): void
    {
        foreach (glob($this->dir . '/*') ?: [] as $file) {
            unlink($file);
        }
        rmdir($this->dir);
        parent::tearDown();
    }

    /** @param array<int,array<int,bool>> $blackPixels [y][x] => true means black */
    private function makeFixture(string $name, int $width, int $height, array $blackPixels): string
    {
        $img = imagecreatetruecolor($width, $height);
        $white = imagecolorallocate($img, 255, 255, 255);
        $black = imagecolorallocate($img, 0, 0, 0);
        imagefill($img, 0, 0, $white);

        foreach ($blackPixels as $y => $row) {
            foreach ($row as $x => $isBlack) {
                if ($isBlack) {
                    imagesetpixel($img, $x, $y, $black);
                }
            }
        }

        $path = $this->dir . '/' . $name;
        imagepng($img, $path);
        imagedestroy($img);

        return $path;
    }

    /**
     * maxWidthDots is passed equal to the fixture's own width throughout
     * this group of tests — the output canvas is always exactly
     * maxWidthDots wide (see rasterFromFile's own docblock on why: centering
     * a narrower logo has to be baked into the pixels), so this is what
     * keeps these assertions an exact, uncentered byte-for-byte match
     * rather than needing to account for padding on every side. Centering
     * itself gets its own dedicated test below.
     */
    public function testTwoByTwoCheckerboardPacksToExactExpectedBytes(): void
    {
        // Row 0: black, white. Row 1: white, black.
        $path = $this->makeFixture('checker.png', 2, 2, [
            0 => [0 => true, 1 => false],
            1 => [0 => false, 1 => true],
        ]);

        $result = $this->service->rasterFromFile($path, 2, 2);

        $this->assertNotNull($result);
        $this->assertSame(2, $result['width']);
        $this->assertSame(2, $result['height']);
        // Row 0: bit7=1 (black), bit6=0 (white) -> 0b10000000 = 0x80.
        // Row 1: bit7=0 (white), bit6=1 (black) -> 0b01000000 = 0x40.
        $this->assertSame("\x80\x40", $result['bytes']);
    }

    public function testSolidBlackEightByOneIsAllOnes(): void
    {
        $path = $this->makeFixture('black.png', 8, 1, [0 => array_fill(0, 8, true)]);

        $result = $this->service->rasterFromFile($path, 8, 1);

        $this->assertSame(8, $result['width']);
        $this->assertSame(1, $result['height']);
        $this->assertSame("\xFF", $result['bytes']);
    }

    public function testSolidWhiteEightByOneIsAllZeros(): void
    {
        $path = $this->makeFixture('white.png', 8, 1, [0 => array_fill(0, 8, false)]);

        $result = $this->service->rasterFromFile($path, 8, 1);

        $this->assertSame("\x00", $result['bytes']);
    }

    public function testWidthNotAMultipleOfEightPadsTheLastByte(): void
    {
        // black, white, black — padded with 5 zero bits to fill the byte.
        $path = $this->makeFixture('three.png', 3, 1, [0 => [0 => true, 1 => false, 2 => true]]);

        $result = $this->service->rasterFromFile($path, 3, 1);

        $this->assertSame(3, $result['width']);
        // 0b10100000 = 0xA0.
        $this->assertSame("\xA0", $result['bytes']);
    }

    public function testNeverUpscalesTheLogoContentPastItsOwnSize(): void
    {
        // A 4x4 source into a much larger 384-wide box: the CANVAS is
        // still forced to 384 (for centering — see below), but the logo
        // CONTENT within it must not be blown up past its real 4x4 size.
        $path = $this->makeFixture('small.png', 4, 4, [0 => [0 => true, 1 => false, 2 => false, 3 => false]]);

        $result = $this->service->rasterFromFile($path, 384, 180);

        $this->assertSame(384, $result['width']);
        $this->assertSame(4, $result['height']);
        // Centered: xOffset = (384-4)/2 = 190, so the black pixel at
        // content-x=0 lands at canvas-x=190 -> byte 23 (190÷8=23 r6),
        // bit 7-(190%8) = 7-6 = 1 -> value 0b00000010.
        $bytesPerRow = (int) ceil(384 / 8);
        $row0 = substr($result['bytes'], 0, $bytesPerRow);
        $this->assertSame("\x02", substr($row0, 23, 1));
        // Nothing else on that row is black.
        $this->assertSame(str_repeat("\x00", 23), substr($row0, 0, 23));
        $this->assertSame(str_repeat("\x00", $bytesPerRow - 24), substr($row0, 24));
    }

    public function testNarrowerLogoIsCenteredOnAFullWidthWhiteCanvas(): void
    {
        // Solid black 2x1 into an 8-wide box: content lands at x=3..4 of 8
        // (xOffset = (8-2)/2 = 3, i.e. bits 4 and 3), giving 0b00011000 = 0x18.
        $path = $this->makeFixture('narrow.png', 2, 1, [0 => [0 => true, 1 => true]]);

        $result = $this->service->rasterFromFile($path, 8, 1);

        $this->assertSame(8, $result['width']);
        $this->assertSame(1, $result['height']);
        $this->assertSame("\x18", $result['bytes']);
    }

    public function testDownscalesContentToFitWithinTheBoxPreservingAspectRatio(): void
    {
        $img = imagecreatetruecolor(800, 400);
        imagefill($img, 0, 0, imagecolorallocate($img, 255, 255, 255));
        $path = $this->dir . '/wide.png';
        imagepng($img, $path);
        imagedestroy($img);

        $result = $this->service->rasterFromFile($path, 384, 180);

        // The output canvas is always exactly maxWidthDots regardless of
        // the source's own aspect ratio — height is what actually reflects
        // the fitted content size. Height is the binding constraint here:
        // 800/384 = 2.08x vs 400/180 = 2.22x, so height hits its cap
        // exactly (scale 0.45) while width's own fit comes in under 384.
        $this->assertSame(384, $result['width']);
        $this->assertSame(180, $result['height']); // round(400 * 0.45)
    }

    public function testReturnsNullForAnUnreadableFile(): void
    {
        $path = $this->dir . '/not-an-image.png';
        file_put_contents($path, 'this is not image data');

        $this->assertNull($this->service->rasterFromFile($path));
    }

    public function testByteLengthAlwaysMatchesWidthAndHeight(): void
    {
        $path = $this->makeFixture('mixed.png', 10, 3, []);

        $result = $this->service->rasterFromFile($path, 384, 180);

        $bytesPerRow = (int) ceil($result['width'] / 8);
        $this->assertSame($bytesPerRow * $result['height'], strlen($result['bytes']));
    }
}
