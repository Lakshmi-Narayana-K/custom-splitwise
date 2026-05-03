import { useState } from 'react';
import { useData } from './hooks/useData';
import { AddExpenseForm } from './components/AddExpenseForm';
import { Toast } from './components/Toast';
import './index.css';

export default function App() {
  const { me, groups, loading, error } = useData();
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader" />
        <p>Connecting to Splitwise…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <div className="error-icon">⚠️</div>
        <h2>Connection Error</h2>
        <p>{error}</p>
        <p className="hint">Make sure your server is running and .env is configured.</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="14" fill="#1CC29F"/>
              <text x="14" y="19" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">S</text>
            </svg>
            <span>Splitwise</span>
          </div>
          {me && (
            <div className="user-badge">
              {me.picture?.medium
                ? <img src={me.picture.medium} alt={me.first_name} className="avatar" />
                : <div className="avatar-placeholder">{me.first_name?.[0]}</div>
              }
              <span>{me.first_name} {me.last_name}</span>
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        <div className="page-title">
          <h1>Add an Expense</h1>
          <p>Choose a group, pick members, and split the bill your way.</p>
        </div>
        <AddExpenseForm me={me} groups={groups} onSuccess={(msg) => showToast(msg)} onError={(msg) => showToast(msg, 'error')} />
      </main>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
