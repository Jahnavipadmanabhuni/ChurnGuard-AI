# ChurnGuard AI

**Agentic Subscription Churn Recovery System**
Built for the Razorpay AI Builder Internship 2026 — Track 3: AI Revenue Recovery

🔗 **Live demo:** [churn-guard-ai-six.vercel.app](https://churn-guard-ai-six.vercel.app/)
🔗 **API docs:** [churnguard-ai-4fyh.onrender.com/docs](https://churnguard-ai-4fyh.onrender.com/docs)

---

## Problem Statement

Subscription businesses lose recurring revenue when customers cancel — and unlike a single failed transaction, churn is an ongoing, compounding loss. Most businesses respond with a single blanket rule ("send everyone with low usage a 10% discount"), which wastes retention spend on customers who weren't going to leave anyway, and completely misses customers whose real problem isn't price at all.

**ChurnGuard AI** looks at each subscriber individually — usage, support history, tenure, and spend — predicts their probability of churning in the next billing cycle, and recommends a *specific* retention action (personalized discount, plan downgrade, proactive support outreach, or loyalty reward) with a plain-English explanation for why that action was chosen.

## Approach

The system has four layers:

1. **Prediction** — a tuned XGBoost classifier trained on subscriber behavior (tenure, spend, plan type, support tickets, feature usage, login recency) predicts churn probability.
2. **Risk tiering** — probability is mapped to Low / Medium / High risk based on the model's actual score distribution.
3. **Retention agent** — a rule-based decision layer combines risk tier with customer segment (tenure, value) to recommend one of five actions, with a generated explanation.
4. **Business impact & audit** — every decision made across a batch of customers is logged (timestamp, inputs, decision, which rule fired) to a CSV audit trail, and translated into an estimated MRR (monthly recurring revenue) recovery figure.

### Dataset
Base data is the [Telco Customer Churn dataset](https://www.kaggle.com/datasets/blastchar/telco-customer-churn) (Kaggle), reframed into subscription-product language (`Contract` → `subscription_plan`, `MonthlyCharges` → `monthly_spend`, etc.), extended with three synthetic engagement fields — `support_tickets_last_90d`, `feature_usage_score`, `days_since_last_login` — generated with a moderate, realistic correlation to the churn label, since real product-usage telemetry wasn't available for this dataset.

> **Note on synthetic features:** these three fields are the model's strongest predictors by design. In a production deployment with real usage/support data, performance would need to be re-validated — the pipeline and decision logic are what this project demonstrates, not a production-ready accuracy claim.

## Results

| Model | Churn Recall | Precision | ROC-AUC |
|---|---|---|---|
| Logistic Regression (baseline) | 0.93 | 0.83 | 0.981 |
| Random Forest | 0.90 | 0.90 | 0.981 |
| **XGBoost (tuned, final)** | **0.91** | 0.87 | **0.984** |

Class imbalance (~26.5% churn rate) handled via `class_weight='balanced'`. Hyperparameters tuned with `RandomizedSearchCV` (5-fold CV, optimized for recall — since missing an at-risk customer costs more than a false alarm).

### Business Impact (measured on the held-out test set, 1,409 customers)

Every customer was run through the full pipeline in a single audited batch (stopping rule: max one action per customer, every decision logged to `data/audit_log.csv`).

- **586** customers flagged for a retention action
- **98.2%** of at-risk monthly recurring revenue correctly identified (\$26,712 of \$27,215 total)
- Estimated MRR saved, by assumed retention success rate:

| Success rate | Estimated MRR saved / month |
|---|---|
| 20% | \$5,342 |
| 35% | \$9,349 |
| 50% | \$13,356 |

## Tech Stack

| Layer | Tools |
|---|---|
| Data & EDA | Python, Pandas, NumPy, Matplotlib, Seaborn |
| Modeling | scikit-learn (Logistic Regression, Random Forest), XGBoost |
| Imbalance handling | `class_weight='balanced'` |
| Retention agent | Python rule engine |
| Backend / API | FastAPI |
| Frontend | React (Vite) |
| Deployment | Render (API) · Vercel (frontend) |

## Project Structure

```
ChurnGuard AI/
├── data/                    # datasets and audit log
├── models/                  # trained model artifacts (.pkl)
├── src/
│   ├── data_prep_01.ipynb   # Step 1: data cleaning + synthetic features
│   ├── model_training.ipynb # Steps 2–6: EDA, features, imbalance, training, tuning
│   ├── agent.ipynb          # Steps 7 & 10: retention agent, audit trail, business impact
│   └── api.py                # Step 8: FastAPI backend
├── dashboard/                # Step 9: React frontend
└── requirements.txt
```

## Running Locally

### Backend
```bash
cd src
pip install -r ../requirements.txt
uvicorn api:app --reload
```
API available at `http://127.0.0.1:8000` — interactive docs at `/docs`.

### Frontend
```bash
cd dashboard
npm install
npm run dev
```
Dashboard available at `http://localhost:5173`. Create a `.env.local` file in `dashboard/` with:
```
VITE_API_URL=http://127.0.0.1:8000
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/predict-and-retain` | POST | Single customer → churn probability, risk tier, recommended action, explanation |
| `/predict-batch` | POST | Same, for a list of customers |
| `/business-impact` | GET | Aggregate business impact summary from the audit log |

## Key Design Decisions

- **`class_weight='balanced'` over SMOTE** — avoided generating synthetic oversampled rows on top of already-synthetic engagement features, which would have compounded artificiality.
- **XGBoost over Logistic Regression** — matched the project's intended tech stack and had the most headroom for improvement via tuning, despite Logistic Regression's slightly higher out-of-the-box recall.
- **Data-driven risk tier cutoffs** — thresholds (Low < 0.10, Medium 0.10–0.50, High ≥ 0.50) were set from the model's actual predicted-probability distribution rather than arbitrary round numbers.
- **Compliance features** — a stopping rule (max one action per customer) and a full CSV audit trail were added beyond the original spec, so every recommendation is traceable to the exact rule that produced it.

## Author

Jahnavi Padmanabhuni — B.Tech, AI & Data Science, KL University