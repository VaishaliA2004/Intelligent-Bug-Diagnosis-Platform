# Intelligent Bug Diagnosis Platform with Fix Recommendation Assistance

## Overview
This project is an intelligent bug diagnosis platform built using FastAPI and React. It analyzes bug reports, identifies probable root causes, detects similar historical defects, and recommends remediation steps.

## Tech Stack
- Frontend: React + Vite
- Backend: FastAPI
- Language: Python, JavaScript
- File Processing: PyPDF2
- Knowledge Retrieval: TF-IDF + Cosine Similarity
- Machine Learning Library: scikit-learn
- History Storage: Browser localStorage

## Main Features
- Upload TXT or PDF bug reports
- Direct text-based bug analysis
- Sample bug cases for quick testing
- Triage Agent
- Log Analysis Agent
- Root Cause Agent
- Duplicate Detection Agent
- Remediation Agent
- Bug Risk Intelligence score
- Developer Action Plan
- Dashboard
- Bug History
- Searchable Knowledge Base
- Interactive AI Assistant

## Diagnostic Pipeline
1. Triage Agent - identifies severity, priority, and component.
2. Log Analysis Agent - extracts exception, failure point, and affected code path.
3. Root Cause Agent - determines the probable cause using historical defect knowledge.
4. Duplicate Detection Agent - finds similar resolved bugs.
5. Remediation Agent - recommends fix, prevention, and testing guidance.

## Historical Bug Retrieval
The platform uses TF-IDF vectorization and cosine similarity to compare the current bug with resolved historical bugs stored in the knowledge base.

The most relevant historical defects are ranked and used by the Root Cause and Duplicate Detection agents.

## Project Structure
backend/ - FastAPI backend and intelligent agents
frontend/ - React frontend
knowledge_base/ - Historical resolved bugs
uploads/ - Uploaded bug reports
bug_preprocessing.py - Bug text preprocessing
demo_bug.txt - Demo bug report
requirements.txt - Python dependencies

## Backend Setup

Open PowerShell in the project folder.

Create or activate the virtual environment:

.\venv\Scripts\Activate.ps1

Install dependencies:

pip install -r requirements.txt

Run backend:

python -m uvicorn backend.main:app --reload

Backend URL:

http://127.0.0.1:8000

Swagger API:

http://127.0.0.1:8000/docs

## Frontend Setup

Open another terminal:

cd frontend

Install dependencies:

npm install

Run frontend:

npm run dev

Frontend URL:

http://localhost:5173

## Demo Flow
1. Open Analyze Bug.
2. Select Enter Bug Details.
3. Choose the Payment Bug sample.
4. Run Intelligent Analysis.
5. Review results from all five agents.
6. Open Dashboard.
7. Check Bug History.
8. Open Knowledge Base.
9. Open AI Assistant and ask for Root Cause or Recommended Fix.

## Demo Bug
Title: Payment Failure During Checkout

Priority: High

Exception: NullPointerException

File: PaymentService.java

Line: 142

## Expected Output
The platform should identify the payment/checkout component, detect the NullPointerException, locate PaymentService.java:142, retrieve the closest historical payment defect, determine the probable root cause, and provide remediation and testing recommendations.

## Requirements
- Python 3.x
- Node.js
- npm

## Security Note
Do not share or include .env files, API keys, passwords, tokens, virtual environments, node_modules, or cache folders in the submission.
