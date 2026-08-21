import { useColorScheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';

/** Toggles light/dark, overriding the OS preference the app follows by default. Choice persists (MUI stores it in localStorage). */
export function ThemeToggle() {
  const { mode, systemMode, setMode } = useColorScheme();
  const resolved = mode === 'system' ? systemMode : mode;

  return (
    <Tooltip title={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton
        size="small"
        onClick={() => setMode(resolved === 'dark' ? 'light' : 'dark')}
        aria-label="Toggle color mode"
        sx={{ color: 'text.secondary' }}
      >
        {resolved === 'dark' ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}
