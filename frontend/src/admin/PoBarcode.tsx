import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import Box from '@mui/material/Box';

/**
 * The PO number as a scannable Code 128 barcode. Always black bars on a
 * white card, whatever the app theme: scanners need that contrast, and
 * dark bars on a dark background won't read off a screen.
 */
export function PoBarcode({ value, height = 40 }: { value: string; height?: number }) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        height,
        width: 1.5,
        margin: 0,
        fontSize: 11,
        textMargin: 2,
        displayValue: true,
        background: 'transparent',
        lineColor: '#000000',
      });
    } catch {
      // A value Code 128 can't encode (non-ASCII) — leave the card empty rather than crash the view.
    }
  }, [value, height]);

  return (
    <Box
      sx={{
        display: 'inline-flex',
        p: 1,
        bgcolor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid',
        borderColor: 'divider',
        lineHeight: 0,
        '& svg': { display: 'block', maxWidth: '100%', height: 'auto' },
      }}
    >
      <svg ref={svgRef} role="img" aria-label={`Barcode ${value}`} />
    </Box>
  );
}
