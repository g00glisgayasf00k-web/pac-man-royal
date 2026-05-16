type Tab = 'solo' | 'online';

type Props = {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
};

export function ArcadeModeSelect({ tab, onTabChange }: Props) {
  return (
    <div className="arcade-mode-select">
      <p className="section-label">— GAME MODE —</p>
      <div className="arcade-mode-tabs">
        <button
          type="button"
          className={tab === 'solo' ? 'active' : ''}
          onClick={() => onTabChange('solo')}
        >
          SOLO VS AI
        </button>
        <button
          type="button"
          className={tab === 'online' ? 'active' : ''}
          onClick={() => onTabChange('online')}
        >
          ONLINE
        </button>
      </div>
    </div>
  );
}

export function tabToGameMode(tab: Tab): 'local' | 'online' {
  return tab === 'solo' ? 'local' : 'online';
}

export type { Tab as ArcadeModeTab };
