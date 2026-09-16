from backend.rag_retriever import retrieve_similar_bugs


def find_root_cause(bug_record, log_analysis):
    """
    Root Cause Agent with RAG.

    Uses historical bug records to identify similar defects
    and improve root cause analysis.
    """

    exception = bug_record.get("exception", "")
    title = bug_record.get("title", "")
    file_name = bug_record.get("file", "")
    line = bug_record.get("line", "")

    failure_point = log_analysis.get("failure_point", "")
    affected_path = log_analysis.get("affected_code_path", [])
    log_exception = log_analysis.get("exception_type", "")

    # Retrieve similar historical bugs
    similar_bugs = retrieve_similar_bugs(
        bug_record,
        top_k=3
    )

    # Default root cause
    root_cause = (
        "The root cause could not be determined from "
        "the available information."
    )

    confidence = "Low"

    # Use the best historical match
    if similar_bugs:

        best_match = similar_bugs[0]

        root_cause = (
            f"Based on the current bug and similar historical defect "
            f"{best_match['id']} ({best_match['title']}), the probable "
            f"root cause is: {best_match['root_cause']}"
        )

        confidence = "High"

    elif exception == "NullPointerException":

        root_cause = (
            f"A null object reference is being accessed in "
            f"{file_name} at line {line}. The application attempts "
            f"to use an object before checking whether it has been "
            f"initialized."
        )

        confidence = "High"

    elif exception:

        root_cause = (
            f"The probable root cause is related to the "
            f"{exception} exception occurring at the identified "
            f"failure point."
        )

        confidence = "Medium"

    return {
        "root_cause": root_cause,
        "confidence": confidence,
        "failure_point": failure_point,
        "affected_code_path": affected_path,
        "historical_matches": similar_bugs,
        "reasoning": (
            f"The analysis considered the bug title '{title}', "
            f"exception '{exception or log_exception}', "
            f"failure point '{failure_point}', and historical "
            f"defect matches retrieved from the knowledge base."
        )
    }