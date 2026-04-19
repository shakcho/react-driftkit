import { useState } from 'react';
import CopyButton from './CopyButton';

const installCommands = [
  { pm: 'npm', cmd: 'npm install react-driftkit' },
  { pm: 'yarn', cmd: 'yarn add react-driftkit' },
  { pm: 'pnpm', cmd: 'pnpm add react-driftkit' },
];

export default function InstallTabs() {
  const [activePm, setActivePm] = useState('npm');
  const active = installCommands.find((c) => c.pm === activePm) ?? installCommands[0];
  return (
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
  );
}
