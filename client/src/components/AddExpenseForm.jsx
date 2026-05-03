import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const SPLIT_TYPES = [
  { id: 'equal', label: '⚖️ Equal', desc: 'Split evenly' },
  { id: 'exact', label: '💲 Exact', desc: 'Enter amounts' },
  { id: 'percent', label: '% Percent', desc: 'By percentage' },
  { id: 'shares', label: '🔢 Shares', desc: 'By ratio' },
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'SGD', 'AED'];

function Avatar({ member }) {
  if (member.avatar) return <img src={member.avatar} alt={member.name} className="member-avatar" />;
  return <div className="member-avatar placeholder">{member.name[0].toUpperCase()}</div>;
}

export function AddExpenseForm({ me, groups, onSuccess, onError }) {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [paidBy, setPaidBy] = useState(me?.id?.toString() || '');
  const [description, setDescription] = useState('');
  const [total, setTotal] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [splitType, setSplitType] = useState('equal');
  const [splitValues, setSplitValues] = useState({});
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1=group, 2=details, 3=split, 4=confirm

  // When group changes, auto-select all members
  useEffect(() => {
    if (selectedGroup) {
      setSelectedMembers(selectedGroup.members.map((m) => m.id.toString()));
      setSplitValues({});
      setPreview(null);
    }
  }, [selectedGroup]);

  // Reset split values when type or members change
  useEffect(() => {
    setSplitValues({});
    setPreview(null);
    setPreviewError('');
  }, [splitType, selectedMembers.join(',')]);

  const members = selectedGroup?.members.filter((m) => selectedMembers.includes(m.id.toString())) || [];

  function buildSplitPayload() {
    if (splitType === 'equal') {
      return { type: 'equal', users: selectedMembers };
    }
    if (splitType === 'exact') {
      return {
        type: 'exact',
        values: selectedMembers.map((uid) => ({
          user: uid,
          amount: splitValues[uid] || 0,
        })),
      };
    }
    if (splitType === 'percent') {
      return {
        type: 'percent',
        values: selectedMembers.map((uid) => ({
          user: uid,
          percent: splitValues[uid] || 0,
        })),
      };
    }
    if (splitType === 'shares') {
      return {
        type: 'shares',
        values: selectedMembers.map((uid) => ({
          user: uid,
          shares: splitValues[uid] || 1,
        })),
      };
    }
  }

  async function runPreview() {
    if (!total || !description || !paidBy || selectedMembers.length === 0) return;
    try {
      const result = await api.previewExpense({
        total, description,
        groupId: selectedGroup?.id,
        currency, date, paidBy,
        splits: buildSplitPayload(),
      });
      setPreview(result.breakdown);
      setPreviewError('');
    } catch (e) {
      setPreview(null);
      setPreviewError(e.message);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await api.createExpense({
        total, description,
        groupId: selectedGroup?.id,
        currency, date, paidBy,
        splits: buildSplitPayload(),
      });
      onSuccess(`✅ "${description}" added successfully!`);
      // Reset form
      setStep(1);
      setDescription('');
      setTotal('');
      setSplitValues({});
      setPreview(null);
      setSelectedGroup(null);
      setSelectedMembers([]);
    } catch (e) {
      onError(`❌ ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  // --- Computed helpers ---
  const totalNum = parseFloat(total) || 0;
  const exactSum = selectedMembers.reduce((s, uid) => s + (parseFloat(splitValues[uid]) || 0), 0);
  const pctSum = selectedMembers.reduce((s, uid) => s + (parseFloat(splitValues[uid]) || 0), 0);
  const equalShare = members.length > 0 ? (totalNum / members.length).toFixed(2) : '0.00';

  function getMemberName(uid) {
    const m = selectedGroup?.members.find((x) => x.id.toString() === uid.toString());
    return m?.name || uid;
  }

  function toggleMember(uid) {
    setSelectedMembers((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    );
  }

  const canPreview =
    total && description && paidBy && selectedMembers.length > 0 &&
    (splitType !== 'exact' || Math.abs(exactSum - totalNum) < 0.02) &&
    (splitType !== 'percent' || Math.abs(pctSum - 100) < 0.02);

  // ===== RENDER =====
  return (
    <div className="expense-form">
      {/* Step indicator */}
      <div className="steps">
        {['Group', 'Details', 'Split', 'Review'].map((s, i) => (
          <div key={s} className={`step ${step > i + 1 ? 'done' : ''} ${step === i + 1 ? 'active' : ''}`} onClick={() => step > i + 1 && setStep(i + 1)}>
            <div className="step-dot">{step > i + 1 ? '✓' : i + 1}</div>
            <span>{s}</span>
          </div>
        ))}
      </div>

      {/* STEP 1: Group Selection */}
      {step === 1 && (
        <div className="step-content">
          <h2>Choose a group</h2>
          <div className="group-grid">
            {groups.map((g) => (
              <div key={g.id} className={`group-card ${selectedGroup?.id === g.id ? 'selected' : ''}`} onClick={() => setSelectedGroup(g)}>
                <div className="group-icon">{g.name[0].toUpperCase()}</div>
                <div className="group-info">
                  <strong>{g.name}</strong>
                  <span>{g.members.length} members</span>
                </div>
                {selectedGroup?.id === g.id && <div className="check">✓</div>}
              </div>
            ))}
          </div>

          {selectedGroup && (
            <>
              <h3 style={{ marginTop: '2rem' }}>Who's in this expense?</h3>
              <p className="hint-text">Uncheck anyone not involved.</p>
              <div className="member-grid">
                {selectedGroup.members.map((m) => {
                  const active = selectedMembers.includes(m.id.toString());
                  return (
                    <div key={m.id} className={`member-card ${active ? 'selected' : ''}`} onClick={() => toggleMember(m.id.toString())}>
                      <Avatar member={m} />
                      <span>{m.name}</span>
                      {m.id.toString() === me?.id?.toString() && <span className="you-tag">You</span>}
                      <div className={`member-check ${active ? 'on' : ''}`}>{active ? '✓' : '+'}</div>
                    </div>
                  );
                })}
              </div>
              <button className="btn-primary" onClick={() => setStep(2)} disabled={selectedMembers.length < 2}>
                Continue →
              </button>
            </>
          )}
        </div>
      )}

      {/* STEP 2: Expense Details */}
      {step === 2 && (
        <div className="step-content">
          <h2>Expense details</h2>

          <div className="form-row">
            <label>Description</label>
            <input className="form-input" placeholder="e.g. Dinner at Hyderabad House" value={description} onChange={(e) => setDescription(e.target.value)} autoFocus />
          </div>

          <div className="form-row-split">
            <div className="form-row">
              <label>Total Amount</label>
              <div className="amount-input-wrap">
                <select className="currency-select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                <input type="number" className="form-input amount-input" placeholder="0.00" min="0" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} />
              </div>
            </div>

            <div className="form-row">
              <label>Date</label>
              <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <label>Paid by</label>
            <div className="paid-by-grid">
              {members.map((m) => (
                <div key={m.id} className={`paid-by-card ${paidBy === m.id.toString() ? 'selected' : ''}`} onClick={() => setPaidBy(m.id.toString())}>
                  <Avatar member={m} />
                  <span>{m.id.toString() === me?.id?.toString() ? 'You' : m.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="btn-row">
            <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
            <button className="btn-primary" onClick={() => setStep(3)} disabled={!description || !total || !paidBy}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Split Type */}
      {step === 3 && (
        <div className="step-content">
          <h2>How to split?</h2>
          <p className="hint-text">Total: <strong>{currency} {parseFloat(total).toFixed(2)}</strong> among {members.length} people</p>

          {/* Split type tabs */}
          <div className="split-tabs">
            {SPLIT_TYPES.map((t) => (
              <button key={t.id} className={`split-tab ${splitType === t.id ? 'active' : ''}`} onClick={() => setSplitType(t.id)}>
                <span className="split-tab-label">{t.label}</span>
                <span className="split-tab-desc">{t.desc}</span>
              </button>
            ))}
          </div>

          {/* Equal */}
          {splitType === 'equal' && (
            <div className="split-preview-table">
              {members.map((m) => (
                <div key={m.id} className="split-row">
                  <Avatar member={m} />
                  <span className="split-name">{m.id.toString() === me?.id?.toString() ? 'You' : m.name}</span>
                  <span className="split-amount">{currency} {equalShare}</span>
                </div>
              ))}
              <div className="split-total-row">
                <span>Total</span>
                <span>{currency} {totalNum.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Exact */}
          {splitType === 'exact' && (
            <div className="split-inputs">
              {members.map((m) => (
                <div key={m.id} className="split-input-row">
                  <Avatar member={m} />
                  <span className="split-name">{m.id.toString() === me?.id?.toString() ? 'You' : m.name}</span>
                  <div className="split-input-wrap">
                    <span className="split-currency">{currency}</span>
                    <input type="number" className="split-input" min="0" step="0.01" placeholder="0.00"
                      value={splitValues[m.id] || ''}
                      onChange={(e) => setSplitValues((p) => ({ ...p, [m.id]: e.target.value }))}
                    />
                  </div>
                </div>
              ))}
              <div className={`split-sum-bar ${Math.abs(exactSum - totalNum) < 0.02 ? 'ok' : 'warn'}`}>
                <span>Sum: {currency} {exactSum.toFixed(2)}</span>
                <span>Remaining: {currency} {(totalNum - exactSum).toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Percent */}
          {splitType === 'percent' && (
            <div className="split-inputs">
              {members.map((m) => (
                <div key={m.id} className="split-input-row">
                  <Avatar member={m} />
                  <span className="split-name">{m.id.toString() === me?.id?.toString() ? 'You' : m.name}</span>
                  <div className="split-input-wrap">
                    <input type="number" className="split-input" min="0" max="100" step="0.1" placeholder="0"
                      value={splitValues[m.id] || ''}
                      onChange={(e) => setSplitValues((p) => ({ ...p, [m.id]: e.target.value }))}
                    />
                    <span className="split-currency">%</span>
                  </div>
                  <span className="split-computed">= {currency} {((parseFloat(splitValues[m.id]) || 0) / 100 * totalNum).toFixed(2)}</span>
                </div>
              ))}
              <div className={`split-sum-bar ${Math.abs(pctSum - 100) < 0.02 ? 'ok' : 'warn'}`}>
                <span>Total: {pctSum.toFixed(1)}%</span>
                <span>Remaining: {(100 - pctSum).toFixed(1)}%</span>
              </div>
            </div>
          )}

          {/* Shares */}
          {splitType === 'shares' && (
            <div className="split-inputs">
              {(() => {
                const totalSharesAll = members.reduce((s, m) => s + (parseFloat(splitValues[m.id]) || 1), 0);
                return members.map((m) => {
                  const myShares = parseFloat(splitValues[m.id]) || 1;
                  const myAmt = totalSharesAll > 0 ? (myShares / totalSharesAll * totalNum).toFixed(2) : '0.00';
                  return (
                    <div key={m.id} className="split-input-row">
                      <Avatar member={m} />
                      <span className="split-name">{m.id.toString() === me?.id?.toString() ? 'You' : m.name}</span>
                      <div className="split-input-wrap">
                        <input type="number" className="split-input" min="1" step="1" placeholder="1"
                          value={splitValues[m.id] || ''}
                          onChange={(e) => setSplitValues((p) => ({ ...p, [m.id]: e.target.value }))}
                        />
                        <span className="split-currency">shares</span>
                      </div>
                      <span className="split-computed">= {currency} {myAmt}</span>
                    </div>
                  );
                });
              })()}
              <div className="split-sum-bar ok">
                <span>Total shares: {members.reduce((s, m) => s + (parseFloat(splitValues[m.id]) || 1), 0)}</span>
              </div>
            </div>
          )}

          {previewError && <div className="preview-error">{previewError}</div>}

          <div className="btn-row" style={{ marginTop: '2rem' }}>
            <button className="btn-secondary" onClick={() => setStep(2)}>← Back</button>
            <button className="btn-accent" onClick={async () => { await runPreview(); setStep(4); }} disabled={!canPreview}>
              Preview & Confirm →
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Confirm */}
      {step === 4 && (
        <div className="step-content">
          <h2>Confirm Expense</h2>

          <div className="confirm-card">
            <div className="confirm-header">
              <div>
                <div className="confirm-desc">{description}</div>
                <div className="confirm-meta">{date} · {selectedGroup?.name}</div>
              </div>
              <div className="confirm-amount">{currency} {parseFloat(total).toFixed(2)}</div>
            </div>

            <div className="confirm-divider" />

            <div className="confirm-paid">
              Paid by <strong>{getMemberName(paidBy) === me?.first_name + ' ' + (me?.last_name || '') ? 'You' : getMemberName(paidBy)}</strong>
              {' '}· Split {SPLIT_TYPES.find((t) => t.id === splitType)?.desc}
            </div>

            {preview && (
              <div className="confirm-breakdown">
                <h4>Breakdown</h4>
                {preview.map((row) => (
                  <div key={row.user_id} className="confirm-row">
                    <div className="confirm-row-member">
                      <div className="avatar-sm">{getMemberName(row.user_id)[0]}</div>
                      <span>{row.user_id === me?.id?.toString() ? 'You' : getMemberName(row.user_id)}</span>
                    </div>
                    <div className="confirm-row-amounts">
                      {parseFloat(row.paid_share) > 0 && (
                        <span className="paid-badge">Paid {currency} {row.paid_share}</span>
                      )}
                      <span className="owed-badge">Owes {currency} {row.owed_share}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {previewError && <div className="preview-error">{previewError}</div>}
          </div>

          <div className="btn-row" style={{ marginTop: '1.5rem' }}>
            <button className="btn-secondary" onClick={() => setStep(3)}>← Edit</button>
            <button className="btn-primary btn-submit" onClick={handleSubmit} disabled={submitting || !!previewError}>
              {submitting ? 'Adding…' : '✓ Add Expense'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
