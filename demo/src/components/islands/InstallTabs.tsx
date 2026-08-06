import { useState } from 'react';
import CopyButton from './CopyButton';

const installCommands = [
  { pm: 'npm', cmd: 'npm install react-driftkit' },
  { pm: 'yarn', cmd: 'yarn add react-driftkit' },
  { pm: 'pnpm', cmd: 'pnpm add react-driftkit' },
];

/**
 * Import examples for one component. The subpath export is named after the
 * component itself (`react-driftkit/SnapDock`), so the name is all we need.
 * Without a component — the home page — fall back to a two-component barrel
 * example, which is the case the barrel import actually exists for.
 */
function importStylesFor(component?: string) {
  const barrelNames = component ?? 'SnapDock, ZoomLens';
  const subpath = component ?? 'SnapDock';
  return [
    {
      key: 'barrel',
      label: 'Barrel',
      code: `import { ${barrelNames} } from 'react-driftkit';`,
    },
    {
      key: 'subpath-named',
      label: 'Per-component (named)',
      code: `import { ${subpath} } from 'react-driftkit/${subpath}';`,
    },
    {
      key: 'subpath-default',
      label: 'Per-component (default)',
      code: `import ${subpath} from 'react-driftkit/${subpath}';`,
    },
  ];
}

export default function InstallTabs({ component }: { component?: string }) {
  const importStyles = importStylesFor(component);
  const [activePm, setActivePm] = useState('npm');
  const [activeImport, setActiveImport] = useState('barrel');
  const active = installCommands.find((c) => c.pm === activePm) ?? installCommands[0];
  const activeImp = importStyles.find((i) => i.key === activeImport) ?? importStyles[0];
  return (
    <>
      <div className="install-tabs">
        <div className="install-tabs-header">
          {installCommands.map(({ pm }) => (
            <button
              key={pm}
              type="button"
              className={`install-tab ${activePm === pm ? 'install-tab--active' : ''}`}
              onClick={() => setActivePm(pm)}
            >
              {pm}
            </button>
          ))}
        </div>
        <div className="install-tabs-body">
          <code>{active.cmd}</code>
          <CopyButton text={active.cmd} />
        </div>
      </div>

      <div className="install-tabs" style={{ marginTop: 16 }}>
        <div className="install-tabs-header">
          {importStyles.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`install-tab ${activeImport === key ? 'install-tab--active' : ''}`}
              onClick={() => setActiveImport(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="install-tabs-body">
          <code>{activeImp.code}</code>
          <CopyButton text={activeImp.code} />
        </div>
      </div>
    </>
  );
}
