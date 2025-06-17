import React from 'react';
import InventoryManager from '../components/InventoryManager';

const appStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  background: 'linear-gradient(135deg, #f8fafc 0%, #c7d2fe 100%)',
  fontFamily: 'Inter, sans-serif',
};

const titleStyle = {
  fontSize: '3rem',
  fontWeight: 700,
  color: '#3730a3',
  marginBottom: '1rem',
  letterSpacing: '2px',
};

const subtitleStyle = {
  fontSize: '1.5rem',
  color: '#6366f1',
  marginBottom: '2rem',
};

const soonStyle = {
  fontSize: '1.2rem',
  color: '#64748b',
  background: '#fff',
  padding: '0.75rem 2rem',
  borderRadius: '2rem',
  boxShadow: '0 2px 12px rgba(100,116,139,0.08)',
};

const HomePage: React.FC = () => {
  const [showInventory, setShowInventory] = React.useState(false);
  return (
    <div style={appStyle}>
      <div style={titleStyle}>Menurithm MVP</div>
      <div style={subtitleStyle}>AI-powered Restaurant Menu Generator</div>
      <button
        onClick={() => setShowInventory((v) => !v)}
        style={{
          background: '#6366f1',
          color: '#fff',
          padding: '0.75rem 2rem',
          borderRadius: '2rem',
          fontWeight: 600,
          fontSize: '1.1rem',
          marginBottom: '1.5rem',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 2px 12px rgba(100,116,139,0.08)',
        }}
      >
        {showInventory ? 'Hide Inventory Manager' : 'Add/View Inventory'}
      </button>
      {showInventory ? (
        <div className="w-full max-w-5xl bg-white rounded-lg shadow-lg p-4">
          <InventoryManager />
        </div>
      ) : (
        <div style={soonStyle}>Coming Soon 🚀</div>
      )}
    </div>
  );
};

export default HomePage;
