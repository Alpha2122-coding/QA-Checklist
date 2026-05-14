import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { Button } from './Button';
import { useTheme } from '../lib/theme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button variant="secondary" type="button" onClick={toggleTheme} icon={theme === 'dark' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}>
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </Button>
  );
}
