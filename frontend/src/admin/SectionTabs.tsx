import type { ReactNode } from 'react';
import Tabs from '@mui/material/Tabs';

interface Props<T extends string> {
  value: T;
  onChange: (value: T) => void;
  children: ReactNode;
}

/** Classic underline-style tab switcher — the shared look for every tabbed admin screen (Customers, Team, Products, etc). */
export function SectionTabs<T extends string>({ value, onChange, children }: Props<T>) {
  return (
    <Tabs
      value={value}
      onChange={(_, v) => onChange(v)}
      variant="scrollable"
      scrollButtons="auto"
      allowScrollButtonsMobile
      sx={{
        mb: 3.5,
        minHeight: 48,
        borderBottom: '1px solid',
        borderColor: 'divider',
        // Pulled out to the page card's edges so the rule under the tabs
        // spans the full card, then padded back in so the tabs themselves
        // still line up with the content below. The negative margins match
        // AdminLayout's card padding exactly — an inset rule stopping short
        // of both edges reads as an unfinished divider rather than a
        // section break.
        mx: { xs: -2, sm: -2.5, md: -3 },
        px: { xs: 2, sm: 2.5, md: 3 },
        '& .MuiTabs-indicator': {
          height: 2.5,
          borderRadius: '2px 2px 0 0',
        },
        // Sized to sit under the page title as a real second level of
        // navigation rather than a caption strip: 48px rows with 20px of
        // padding either side, which is what gives each tab room to be
        // read and hit rather than aimed at.
        '& .MuiTab-root': {
          minHeight: 48,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: 14,
          px: 2.5,
          minWidth: 0,
          color: 'text.secondary',
          '&:hover': { color: 'text.primary' },
        },
        '& .Mui-selected': {
          color: 'primary.main !important',
        },
      }}
    >
      {children}
    </Tabs>
  );
}
