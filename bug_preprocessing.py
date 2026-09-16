import re
import json

from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize

def clean_text(text):
    """
    Cleans the bug report text by removing
    unnecessary spaces and blank lines.
    """

    # Remove extra spaces
    text = re.sub(r'[ \t]+', ' ', text)

    # Remove unnecessary blank lines
    text = re.sub(r'\n+', '\n', text)

    return text.strip()

def extract_exception(text):
    """
    Extracts the exception name from the bug report.
    """

    pattern = r'([A-Za-z]+Exception|[A-Za-z]+Error)'

    match = re.search(pattern, text)

    if match:
        return match.group(1)

    return "Unknown"
    
def extract_stack_trace(text):
    """
    Extracts lines beginning with 'at' from a Java stack trace.
    """

    lines = text.splitlines()

    stack_trace = []

    for line in lines:
        if line.strip().startswith("at "):
            stack_trace.append(line.strip())

    return stack_trace

def extract_title(text):
    """
    Extracts the bug title from the report.
    """

    match = re.search(r'Title:\s*(.*)', text, re.IGNORECASE)

    if match:
        return match.group(1).strip()

    return "Unknown"

def extract_priority(text):
    """
    Extracts the priority of the bug.
    """

    match = re.search(r'Priority:\s*(.*)', text, re.IGNORECASE)

    if match:
        return match.group(1).strip()

    return "Unknown"

def extract_file_and_line(text):
    """
    Extracts the source file name and line number
    from the stack trace.
    """

    match = re.search(r'\(([^():]+\.java):(\d+)\)', text)

    if match:
        file_name = match.group(1)
        line_number = int(match.group(2))

        return file_name, line_number

    return "Unknown", None

def extract_keywords(text):
    """
    Extracts important keywords from the bug report.
    """

    words = word_tokenize(text)

    stop_words = set(stopwords.words('english'))

    keywords = []

    for word in words:
        if word.isalnum() and word.lower() not in stop_words:
            keywords.append(word.lower())

    return keywords

def create_bug_record(text):
    """
    Creates a structured representation of the bug report.
    """

    file_name, line_number = extract_file_and_line(text)

    bug = {
        "title": extract_title(text),
        "exception": extract_exception(text),
        "priority": extract_priority(text),
        "file": file_name,
        "line": line_number,
        "keywords": extract_keywords(text),
        "stack_trace": extract_stack_trace(text)
    }

    return bug

def save_bug_record(bug):
    """
    Saves the processed bug information as a JSON file.
    """

    with open("processed_bugs/processed_bug.json", "w", encoding="utf-8") as file:
        json.dump(bug, file, indent=4)

    print("\nProcessed bug saved to processed_bugs/processed_bug.json")

if __name__ == "__main__":

    with open("uploads/sample_bug.txt", "r", encoding="utf-8") as file:
        bug_text = file.read()

    cleaned_text = clean_text(bug_text)

    bug_record = create_bug_record(cleaned_text)

    print("\n===== PROCESSED BUG REPORT =====")

    print(json.dumps(bug_record, indent=4))

    save_bug_record(bug_record)