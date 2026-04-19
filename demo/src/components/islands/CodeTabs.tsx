import { useState } from 'react';
import CopyButton from './CopyButton';

export type HighlightedTab = {
  label: string;
  /** Pre-rendered Shiki HTML for the tab's code. */
  html: string;
  /** Raw source used by the copy button. */
  raw: string;
  lang: string;
};

export default function CodeTabs({ tabs }: { tabs: HighlightedTab[] }) {
  const [idx, setIdx] = useState(0);
  const active = tabs[idx];

  return (
    <>
      <div className="tabs">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            type="button"
            className={`tab ${idx === i ? 'tab--active' : ''}`}
            onClick={() => setIdx(i)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="code-block">
        <div className="code-header">
          <span className="code-lang">{active.lang}</span>
          <CopyButton text={active.raw} />
        </div>
        <div
          className={`code-body language-${active.lang}`}
          dangerouslySetInnerHTML={{ __html: active.html }}
        />
      </div>
    </>
  );
}
