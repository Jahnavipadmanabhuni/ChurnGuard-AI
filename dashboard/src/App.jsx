import { useState, useEffect } from 'react'
import './App.css'

const API_URL = 'https://churnguard-ai-4fyh.onrender.com'

const DEFAULT_EXTRA_FIELDS = {
  gender_Male: true, Partner_Yes: false, Dependents_Yes: false,
  PhoneService_Yes: true, MultipleLines_No_phone_service: false, MultipleLines_Yes: false,
  InternetService_Fiber_optic: true, InternetService_No: false,
  OnlineSecurity_No_internet_service: false, OnlineSecurity_Yes: false,
  OnlineBackup_No_internet_service: false, OnlineBackup_Yes: false,
  DeviceProtection_No_internet_service: false, DeviceProtection_Yes: false,
  TechSupport_No_internet_service: false, TechSupport_Yes: false,
  StreamingTV_No_internet_service: false, StreamingTV_Yes: false,
  StreamingMovies_No_internet_service: false, StreamingMovies_Yes: false,
  PaperlessBilling_Yes: true, PaymentMethod_Credit_card_automatic: false,
  PaymentMethod_Electronic_check: true, PaymentMethod_Mailed_check: false,
}

const RISK_COLORS = { Low: '#34D399', Medium: '#FBBF24', High: '#F87171' }
const RISK_GLOW = { Low: 'rgba(52,211,153,0.4)', Medium: 'rgba(251,191,36,0.4)', High: 'rgba(248,113,113,0.4)' }

function Gauge({ probability, tier }) {
  const radius = 80
  const circumference = Math.PI * radius
  const pct = probability ?? 0
  const filled = circumference * pct
  const color = tier ? RISK_COLORS[tier] : '#3A4453'
  const glow = tier ? RISK_GLOW[tier] : 'transparent'

  return (
    <div className="gauge-wrap" style={{ filter: tier ? `drop-shadow(0 0 24px ${glow})` : 'none' }}>
      <svg viewBox="0 0 200 120" className="gauge-svg">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#1C2430" strokeWidth="16" strokeLinecap="round" />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={color} strokeWidth="16"
          strokeLinecap="round" strokeDasharray={`${filled} ${circumference}`} className="gauge-arc"
        />
      </svg>
      <div className="gauge-readout">
        <span className="gauge-number" style={{ color }}>{tier ? `${(pct * 100).toFixed(1)}%` : '—'}</span>
        <span className="gauge-label">CHURN PROBABILITY</span>
      </div>
    </div>
  )
}

function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 34 34" className="logo-mark">
      <path d="M17 2 L27 12 L17 22 L7 12 Z" fill="url(#g1)" opacity="0.9" />
      <path d="M17 12 L27 22 L17 32 L7 22 Z" fill="url(#g2)" opacity="0.6" />
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5B8DEF" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>
        <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#5B8DEF" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function App() {
  const [form, setForm] = useState({
    customer_tenure_months: 12, monthly_spend: 49.99, support_tickets_last_90d: 0,
    feature_usage_score: 72, days_since_last_login: 3, subscription_plan_encoded: 0,
    is_high_value_customer: 0, SeniorCitizen: 0,
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [impact, setImpact] = useState(null)

  const handleChange = (field, value) => setForm({ ...form, [field]: value })

  const engagementTrend = () => {
    const ticketsNorm = 1 - Math.min(form.support_tickets_last_90d / 5, 1)
    const usageNorm = Math.min(form.feature_usage_score / 100, 1)
    const daysNorm = 1 - Math.min(form.days_since_last_login / 90, 1)
    return (ticketsNorm + usageNorm + daysNorm) / 3
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = { ...DEFAULT_EXTRA_FIELDS, ...form, engagement_trend: engagementTrend() }
      const response = await fetch(`${API_URL}/predict-and-retain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const errBody = await response.json().catch(() => null)
        throw new Error(errBody ? JSON.stringify(errBody.detail) : 'Request failed')
      }
      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError('Could not reach the prediction service. The backend may be waking up — try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setForm({
      customer_tenure_months: 12, monthly_spend: 49.99, support_tickets_last_90d: 0,
      feature_usage_score: 72, days_since_last_login: 3, subscription_plan_encoded: 0,
      is_high_value_customer: 0, SeniorCitizen: 0,
    })
    setResult(null)
    setError(null)
  }

  useEffect(() => {
    fetch(`${API_URL}/business-impact`)
      .then(res => res.json())
      .then(data => setImpact(data))
      .catch(() => setImpact(null))
  }, [])

  return (
    <div className="page">
      <div className="bg-grid" />
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />
      <div className="bg-glow bg-glow-3" />

      <div className="page-inner">
        <header className="top-bar">
          <div className="brand">
            <Logo />
            <div className="brand-text">
              <span className="eyebrow">RETENTION INTELLIGENCE</span>
              <span className="brand-name">ChurnGuard <span className="brand-accent">AI</span></span>
            </div>
          </div>
          <div className="status-pill">
            <span className="status-dot" /> System ready
          </div>
        </header>

        <section className="hero">
          <span className="hero-eyebrow">CUSTOMER RISK CONSOLE</span>
          <h1 className="hero-title">
            Turn churn signals into<br /><span className="hero-highlight">retained revenue.</span>
          </h1>
          <p className="hero-subtitle">
            Feed the model a subscriber's activity, get a risk diagnosis and a recommended retention move in seconds.
          </p>
        </section>

        <div className="console">
          <section className="panel signals-panel">
            <div className="panel-heading">
              <h2 className="panel-title">Signals</h2>
              <span className="panel-sub">Enter the subscriber's activity</span>
            </div>

            <div className="field-grid">
              <label className="field">
                <span>Tenure <em>months</em></span>
                <input type="number" value={form.customer_tenure_months}
                  onChange={e => handleChange('customer_tenure_months', Number(e.target.value))} />
              </label>

              <label className="field">
                <span>Monthly spend <em>USD</em></span>
                <input type="number" value={form.monthly_spend}
                  onChange={e => handleChange('monthly_spend', Number(e.target.value))} />
              </label>

              <label className="field">
                <span>Support tickets <em>90d</em></span>
                <input type="number" min="0" max="5" value={form.support_tickets_last_90d}
                  onChange={e => handleChange('support_tickets_last_90d', Number(e.target.value))} />
              </label>

              <label className="field">
                <span>Days since login</span>
                <input type="number" min="0" value={form.days_since_last_login}
                  onChange={e => handleChange('days_since_last_login', Number(e.target.value))} />
              </label>
            </div>

            <label className="field slider-field">
              <span>Feature usage score <em>{form.feature_usage_score}/100</em></span>
              <input type="range" min="0" max="100" value={form.feature_usage_score}
                onChange={e => handleChange('feature_usage_score', Number(e.target.value))} />
            </label>

            <label className="field">
              <span>Subscription plan</span>
              <select value={form.subscription_plan_encoded}
                onChange={e => handleChange('subscription_plan_encoded', Number(e.target.value))}>
                <option value={0}>Month-to-month</option>
                <option value={1}>One year</option>
                <option value={2}>Two year</option>
              </select>
            </label>

            <div className="toggle-row">
              <label className="toggle">
                <input type="checkbox" checked={!!form.is_high_value_customer}
                  onChange={e => handleChange('is_high_value_customer', e.target.checked ? 1 : 0)} />
                <span className="toggle-track"><span className="toggle-thumb" /></span>
                <span>High-value customer</span>
              </label>
              <label className="toggle">
                <input type="checkbox" checked={!!form.SeniorCitizen}
                  onChange={e => handleChange('SeniorCitizen', e.target.checked ? 1 : 0)} />
                <span className="toggle-track"><span className="toggle-thumb" /></span>
                <span>Senior citizen</span>
              </label>
            </div>

            <div className="btn-row">
              <button className="run-btn" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Running diagnosis…' : (<>Predict &amp; Decide <span className="arrow">→</span></>)}
              </button>
              <button className="reset-btn" onClick={handleReset} disabled={loading}>Reset</button>
            </div>
            {error && <p className="error-text">{error}</p>}
          </section>

          <section className="panel result-panel">
            <div className="panel-heading center">
              <h2 className="panel-title">Diagnosis</h2>
            </div>

            <Gauge probability={result?.churn_probability} tier={result?.risk_tier} />

            <div className="stat-row">
              <div className="stat">
                <span className="stat-label">Risk tier</span>
                <span className="stat-value" style={{ color: result ? RISK_COLORS[result.risk_tier] : '#8B96A5' }}>
                  {result ? result.risk_tier : '—'}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Tenure segment</span>
                <span className="stat-value">{result ? result.tenure_segment : '—'}</span>
              </div>
            </div>

            <div className="action-block">
              <span className="action-label">Recommended action</span>
              <span className="action-value">
                {result ? result.recommended_action : 'Run a diagnosis to see the recommended action.'}
              </span>
            </div>

            <div className="explanation-block">
              <span className="action-label">Explanation</span>
              <p className="explanation">{result ? result.explanation : 'Model explanation will appear here.'}</p>
            </div>
          </section>
        </div>

        {impact && (
          <section className="panel impact-panel">
            <div className="panel-heading">
              <h2 className="panel-title">Batch Business Impact</h2>
              <span className="panel-sub">Measured across {impact.customers_processed} test customers, audited decision by decision</span>
            </div>

            <div className="impact-stats">
              <div className="impact-stat">
                <span className="impact-value">{impact.customers_flagged}</span>
                <span className="impact-label">Customers flagged</span>
              </div>
              <div className="impact-stat">
                <span className="impact-value">{impact.coverage_pct}%</span>
                <span className="impact-label">At-risk MRR identified</span>
              </div>
              <div className="impact-stat">
                <span className="impact-value">${impact.mrr_correctly_flagged.toLocaleString()}</span>
                <span className="impact-label">MRR correctly flagged</span>
              </div>
            </div>

            <div className="scenario-row">
              {Object.entries(impact.mrr_saved_scenarios).map(([rate, amount]) => (
                <div className="scenario-card" key={rate}>
                  <span className="scenario-rate">{rate} retention success</span>
                  <span className="scenario-amount">${amount.toLocaleString()}<span className="scenario-unit">/mo</span></span>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="page-footer">CHURNGUARD AI · Decision engine online</footer>
      </div>
    </div>
  )
}

export default App