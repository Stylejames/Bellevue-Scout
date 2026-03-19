import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { PHASE_CONFIG, storeRecordData } from '../lib/RecordData';

function Settings() {
  const [mode, setMode] = useState(
    () => localStorage.getItem('displayMode') ?? 'Light'
  );
  const [scouterName, setScouterName] = useState(
    () => localStorage.getItem('scouterName') ?? ''
  );
  const [clearStatus, setClearStatus] = useState(null);

  function applyMode(newMode) {
    setMode(newMode);
    localStorage.setItem('displayMode', newMode);
    if (newMode === 'Dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  function handleScouterName(value) {
    setScouterName(value);
    localStorage.setItem('scouterName', value);
  }

  async function clearAllData() {
    await Promise.all(Object.values(PHASE_CONFIG).map(phase => storeRecordData(phase, [])));
    setClearStatus('All data cleared.');
  }

  return (
    <Layout header="Settings" tab={2}>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-2">
          <p className="section-label">Scouter Name</p>
          <input
            type="text"
            value={scouterName}
            onChange={(e) => handleScouterName(e.target.value)}
            placeholder="Enter your name"
            className="field-input"
          />
        </div>
        <div className="divider" />
        <div className="flex flex-col gap-2">
          <p className="section-label">Display Mode</p>
          <div className="segment-control">
            {['Light', 'Dark'].map((m) => (
              <button
                key={m}
                onClick={() => applyMode(m)}
                className={`segment-btn py-3 ${mode === m ? 'active' : ''}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="divider" />
        <div className="flex flex-col gap-2">
          <p className="section-label">Data</p>
          <button onClick={clearAllData} className="btn-outline">
            Clear Data
          </button>
          {clearStatus && (
            <p className="text-center text-sm text-[var(--color-muted)]">{clearStatus}</p>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Settings;
