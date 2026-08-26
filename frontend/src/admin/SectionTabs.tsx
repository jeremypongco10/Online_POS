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
        mb: 3,
        minHeight: 40,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '& .MuiTabs-indicator': {
          height: 2.5,
          borderRadius: '2px 2px 0 0',
        },
        '& .MuiTab-root': {
          minHeight: 40,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: 13.5,
          px: 2,
          minWidth: 0,
          color: 'text.secondary',
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
