import { usePersona } from '../context/PersonaContext';
import { inferSegmentFromSignals } from '../lib/persona';

/**
 * Debug overlay for testing persona system.
 * Toggle with Ctrl+Shift+P.
 * Remove this component before production deploy.
 */
export default function PersonaDebug() {
  const { persona, segment, loading, clearPersona } = usePersona();

  const signals = persona?.signals;
  const liveInference = signals ? inferSegmentFromSignals(signals) : null;

  return (
    <div
      style={{
        position: 'fixed', bottom: 12, left: 12, zIndex: 99999,
        background: '#1a1a2e', color: '#eee', padding: 14, borderRadius: 10,
        fontSize: 12, fontFamily: 'monospace', maxWidth: 360, maxHeight: '60vh',
        overflow: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        border: '1px solid #333',
      }}
    >
      <strong style={{ color: '#E37417', marginBottom: 8, display: 'block' }}>Persona Debug</strong>

      <div style={{ marginBottom: 6 }}>
        <span style={{ color: '#888' }}>Status: </span>
        {loading ? <span style={{ color: '#f0ad4e' }}>Loading...</span>
          : persona ? <span style={{ color: '#5cb85c' }}>Active</span>
          : <span style={{ color: '#d9534f' }}>No persona</span>}
      </div>

      {persona && (
        <>
          <div><span style={{ color: '#888' }}>Segment: </span><strong style={{ color: '#E37417' }}>{segment}</strong></div>
          <div><span style={{ color: '#888' }}>Confidence: </span>{(persona.confidence * 100).toFixed(1)}%</div>
          <div><span style={{ color: '#888' }}>Updated: </span>{new Date(persona.updatedAt).toLocaleTimeString()}</div>
        </>
      )}

      {liveInference && (
        <div style={{ marginTop: 6, padding: '4px 0', borderTop: '1px solid #333' }}>
          <span style={{ color: '#888' }}>Live inference: </span>
          <strong>{liveInference.segment}</strong> ({(liveInference.confidence * 100).toFixed(1)}%)
        </div>
      )}

      {signals && (
        <div style={{ marginTop: 6, padding: '4px 0', borderTop: '1px solid #333' }}>
          <div style={{ color: '#888', marginBottom: 4 }}>Signals:</div>
          <div>Categories: {JSON.stringify(signals.categoriesViewed)}</div>
          <div>Price: L{signals.priceRangeClicks.low} M{signals.priceRangeClicks.mid} H{signals.priceRangeClicks.high}</div>
          <div>Filters: {JSON.stringify(signals.filtersUsed)}</div>
          <div>PlanTypes: {JSON.stringify(signals.planTypesViewed)}</div>
          <div>Views: {signals.totalPlanViews} | Compares: {signals.compareCount}</div>
        </div>
      )}

      {!persona && (
        <div style={{ marginTop: 6, color: '#888', fontSize: 11 }}>
          localStorage persona: {localStorage.getItem('simba-persona') ? 'yes' : 'no'}
        </div>
      )}

      <div style={{ marginTop: 8, padding: '4px 0', borderTop: '1px solid #333', color: '#666', fontSize: 10 }}>
        <button
          onClick={() => clearPersona()}
          style={{ background: '#d9534f', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10 }}
        >Reset persona</button>
        <span style={{ marginLeft: 8 }}>Ctrl+Shift+P to close</span>
      </div>
    </div>
  );
}
