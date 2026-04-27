/**
 * ShortcutBar — Displays keyboard shortcut hints.
 */
export default function ShortcutBar() {
  const shortcuts = [
    { key: 'R', action: 'Record' },
    { key: 'S', action: 'Stop' },
    { key: '↵', action: 'Clean' },
    { key: '␣', action: 'Play' },
  ];

  return (
    <div className="shortcut-bar">
      {shortcuts.map(({ key, action }) => (
        <div key={key} className="shortcut-item">
          <kbd className="shortcut-key">{key}</kbd>
          <span className="shortcut-action">{action}</span>
        </div>
      ))}
    </div>
  );
}
