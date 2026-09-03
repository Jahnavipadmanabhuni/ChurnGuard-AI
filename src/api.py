from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np

# Load the tuned XGBoost model once, when the server starts
model = joblib.load("../models/xgboost_tuned_final.pkl")

app = FastAPI(title="ChurnGuard AI API")
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class CustomerData(BaseModel):
    SeniorCitizen: int
    customer_tenure_months: int
    monthly_spend: float
    support_tickets_last_90d: int
    feature_usage_score: float
    days_since_last_login: int
    subscription_plan_encoded: int
    gender_Male: bool
    Partner_Yes: bool
    Dependents_Yes: bool
    PhoneService_Yes: bool
    MultipleLines_No_phone_service: bool
    MultipleLines_Yes: bool
    InternetService_Fiber_optic: bool
    InternetService_No: bool
    OnlineSecurity_No_internet_service: bool
    OnlineSecurity_Yes: bool
    OnlineBackup_No_internet_service: bool
    OnlineBackup_Yes: bool
    DeviceProtection_No_internet_service: bool
    DeviceProtection_Yes: bool
    TechSupport_No_internet_service: bool
    TechSupport_Yes: bool
    StreamingTV_No_internet_service: bool
    StreamingTV_Yes: bool
    StreamingMovies_No_internet_service: bool
    StreamingMovies_Yes: bool
    PaperlessBilling_Yes: bool
    PaymentMethod_Credit_card_automatic: bool
    PaymentMethod_Electronic_check: bool
    PaymentMethod_Mailed_check: bool
    is_high_value_customer: int
    engagement_trend: float


# Map API field names (valid Python identifiers) back to the model's actual column names
FIELD_NAME_MAP = {
    "MultipleLines_No_phone_service": "MultipleLines_No phone service",
    "InternetService_Fiber_optic": "InternetService_Fiber optic",
    "OnlineSecurity_No_internet_service": "OnlineSecurity_No internet service",
    "OnlineBackup_No_internet_service": "OnlineBackup_No internet service",
    "DeviceProtection_No_internet_service": "DeviceProtection_No internet service",
    "TechSupport_No_internet_service": "TechSupport_No internet service",
    "StreamingTV_No_internet_service": "StreamingTV_No internet service",
    "StreamingMovies_No_internet_service": "StreamingMovies_No internet service",
    "PaymentMethod_Credit_card_automatic": "PaymentMethod_Credit card (automatic)",
    "PaymentMethod_Electronic_check": "PaymentMethod_Electronic check",
    "PaymentMethod_Mailed_check": "PaymentMethod_Mailed check",
}

# The exact column order the model was trained on
MODEL_COLUMNS = ['SeniorCitizen', 'customer_tenure_months', 'monthly_spend',
                  'support_tickets_last_90d', 'feature_usage_score', 'days_since_last_login',
                  'subscription_plan_encoded', 'gender_Male', 'Partner_Yes', 'Dependents_Yes',
                  'PhoneService_Yes', 'MultipleLines_No phone service', 'MultipleLines_Yes',
                  'InternetService_Fiber optic', 'InternetService_No',
                  'OnlineSecurity_No internet service', 'OnlineSecurity_Yes',
                  'OnlineBackup_No internet service', 'OnlineBackup_Yes',
                  'DeviceProtection_No internet service', 'DeviceProtection_Yes',
                  'TechSupport_No internet service', 'TechSupport_Yes',
                  'StreamingTV_No internet service', 'StreamingTV_Yes',
                  'StreamingMovies_No internet service', 'StreamingMovies_Yes',
                  'PaperlessBilling_Yes', 'PaymentMethod_Credit card (automatic)',
                  'PaymentMethod_Electronic check', 'PaymentMethod_Mailed check',
                  'is_high_value_customer', 'engagement_trend']


def risk_tier(prob):
    if prob < 0.10:
        return "Low"
    elif prob < 0.50:
        return "Medium"
    else:
        return "High"


def recommend_action(tier, is_high_value, tenure_segment):
    if tier == "Low":
        return "No action needed"
    if tier == "High":
        if is_high_value and tenure_segment == "Loyal":
            return "Proactive support outreach"
        elif is_high_value:
            return "Personalized discount"
        else:
            return "Plan downgrade offer"
    if tier == "Medium":
        if is_high_value:
            return "Loyalty reward"
        else:
            return "Proactive support outreach"


def generate_explanation(tier, is_high_value, tenure_segment, prob):
    if tier == "Low":
        return f"Low churn risk ({prob:.1%}). Customer appears stable — no intervention needed."
    if tier == "High" and is_high_value and tenure_segment == "Loyal":
        return f"High churn risk ({prob:.1%}) despite being a loyal, high-value customer — likely an unresolved issue. Recommend direct outreach rather than a discount."
    if tier == "High" and is_high_value:
        return f"High churn risk ({prob:.1%}) in a high-value but not-yet-loyal customer. A personalized discount may reinforce their decision to stay."
    if tier == "High":
        return f"High churn risk ({prob:.1%}) in a lower-value customer. A cheaper plan option may retain them at lower cost."
    if tier == "Medium" and is_high_value:
        return f"Moderate churn risk ({prob:.1%}) in a high-value customer. A loyalty reward can reinforce the relationship."
    return f"Moderate churn risk ({prob:.1%}). A light-touch check-in may catch emerging issues early."


@app.get("/")
def root():
    return {"message": "ChurnGuard AI API is running"}


@app.post("/predict-and-retain")
def predict_and_retain(customer: CustomerData):
    data = customer.dict()
    renamed_data = {}
    for key, value in data.items():
        actual_column_name = FIELD_NAME_MAP.get(key, key)
        renamed_data[actual_column_name] = value

    input_df = pd.DataFrame([renamed_data])[MODEL_COLUMNS]
    prob = float(model.predict_proba(input_df)[0, 1])
    tier = risk_tier(prob)

    tenure_months = customer.customer_tenure_months
    if tenure_months <= 6:
        tenure_segment = "New"
    elif tenure_months <= 24:
        tenure_segment = "Established"
    else:
        tenure_segment = "Loyal"

    is_high_value = bool(customer.is_high_value_customer)
    action = recommend_action(tier, is_high_value, tenure_segment)
    explanation = generate_explanation(tier, is_high_value, tenure_segment, prob)

    return {
        "churn_probability": round(prob, 4),
        "risk_tier": tier,
        "tenure_segment": tenure_segment,
        "is_high_value": is_high_value,
        "recommended_action": action,
        "explanation": explanation
    }
from typing import List

@app.post("/predict-batch")
def predict_batch(customers: List[CustomerData]):
    results = []
    for customer in customers:
        result = predict_and_retain(customer)
        results.append(result)
    return results

@app.get("/business-impact")
def business_impact():
    audit_df = pd.read_csv("../data/audit_log.csv")

    acted_on = audit_df[audit_df["recommended_action"] != "No action needed"]
    true_churners_acted_on = acted_on[acted_on["true_churn_label"] == 1]

    total_mrr_at_risk = audit_df[audit_df["true_churn_label"] == 1]["monthly_spend"].sum()
    mrr_flagged = true_churners_acted_on["monthly_spend"].sum()
    coverage_pct = (mrr_flagged / total_mrr_at_risk * 100) if total_mrr_at_risk > 0 else 0

    return {
        "customers_processed": len(audit_df),
        "customers_flagged": len(acted_on),
        "true_churners_flagged": len(true_churners_acted_on),
        "total_mrr_at_risk": round(float(total_mrr_at_risk), 2),
        "mrr_correctly_flagged": round(float(mrr_flagged), 2),
        "coverage_pct": round(float(coverage_pct), 1),
        "mrr_saved_scenarios": {
            "20%": round(float(mrr_flagged * 0.20), 2),
            "35%": round(float(mrr_flagged * 0.35), 2),
            "50%": round(float(mrr_flagged * 0.50), 2),
        }
    }