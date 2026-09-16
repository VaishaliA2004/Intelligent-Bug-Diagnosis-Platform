from pydantic import BaseModel

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from PyPDF2 import PdfReader

from bug_preprocessing import clean_text, create_bug_record
from backend.triage_agent import triage_bug
from backend.log_analysis_agent import analyze_logs
from backend.root_cause_agent import find_root_cause
from backend.duplicate_detection_agent import detect_duplicate_bug
from backend.remediation_agent import recommend_fix

import io
import json
import os


app = FastAPI(
    title="Intelligent Bug Diagnosis Platform",
    description="Backend API for intelligent bug diagnosis and fix recommendation",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class BugTextRequest(BaseModel):
    text: str


KNOWLEDGE_BASE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "knowledge_base",
    "historical_bugs.json"
)


def extract_text_from_file(
    file: UploadFile,
    content: bytes
):

    filename = file.filename.lower()

    if filename.endswith(".pdf"):

        pdf_file = io.BytesIO(content)

        reader = PdfReader(pdf_file)

        text = ""

        for page in reader.pages:

            page_text = page.extract_text()

            if page_text:
                text += page_text + "\n"

        return text

    elif filename.endswith(".txt"):

        return content.decode(
            "utf-8",
            errors="ignore"
        )

    else:

        raise HTTPException(
            status_code=400,
            detail="Only PDF and TXT files are supported."
        )


def run_diagnostic_pipeline(text):

    if not text.strip():

        raise HTTPException(
            status_code=400,
            detail="Bug report cannot be empty."
        )

    cleaned_text = clean_text(text)

    bug_record = create_bug_record(
        cleaned_text
    )

    triage_result = triage_bug(
        bug_record
    )

    log_analysis_result = analyze_logs(
        bug_record
    )

    root_cause_result = find_root_cause(
        bug_record,
        log_analysis_result
    )

    duplicate_result = detect_duplicate_bug(
        bug_record
    )

    remediation_result = recommend_fix(
        bug_record,
        root_cause_result
    )

    return {
        "bug": bug_record,
        "triage": triage_result,
        "log_analysis": log_analysis_result,
        "root_cause": root_cause_result,
        "duplicate_detection": duplicate_result,
        "remediation": remediation_result
    }


@app.get("/")
def home():

    return {
        "message":
        "Intelligent Bug Diagnosis Platform API is running"
    }


@app.post("/api/analyze-bug")
async def analyze_bug(
    file: UploadFile = File(...)
):

    content = await file.read()

    text = extract_text_from_file(
        file,
        content
    )

    if not text.strip():

        raise HTTPException(
            status_code=400,
            detail="No readable text found in the uploaded file."
        )

    results = run_diagnostic_pipeline(
        text
    )

    return {
        "success": True,
        "filename": file.filename,
        **results
    }


@app.post("/api/analyze-text")
async def analyze_bug_text(
    request: BugTextRequest
):

    text = request.text.strip()

    if not text:

        raise HTTPException(
            status_code=400,
            detail="Bug text cannot be empty."
        )

    results = run_diagnostic_pipeline(
        text
    )

    return {
        "success": True,
        "filename": "Direct Text Input",
        **results
    }


@app.get("/api/knowledge-base")
def get_knowledge_base():

    try:

        if not os.path.exists(
            KNOWLEDGE_BASE_PATH
        ):

            raise HTTPException(
                status_code=404,
                detail="Knowledge base file not found."
            )

        with open(
            KNOWLEDGE_BASE_PATH,
            "r",
            encoding="utf-8"
        ) as file:

            bugs = json.load(file)

        return {
            "success": True,
            "total": len(bugs),
            "bugs": bugs
        }

    except HTTPException:
        raise

    except json.JSONDecodeError:

        raise HTTPException(
            status_code=500,
            detail="Knowledge base JSON is invalid."
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc)
        )