from backend.rag_retriever import retrieve_similar_bugs


def recommend_fix(bug_record, root_cause_result):
    """
    Remediation Agent

    Recommends a practical fix using the identified root cause
    and historical defect resolutions.
    """

    similar_bugs = retrieve_similar_bugs(
        bug_record,
        top_k=3
    )

    root_cause = root_cause_result.get(
        "root_cause",
        ""
    )

    # Use the strongest historical match when available
    if similar_bugs:
        best_match = similar_bugs[0]

        historical_resolution = best_match.get(
            "resolution",
            ""
        )

        recommendation = (
            f"Recommended fix based on historical bug "
            f"{best_match['id']} ({best_match['title']}): "
            f"{historical_resolution}"
        )

        prevention = (
            "Add input validation and null checks before "
            "accessing objects involved in the failing operation."
        )

        testing = (
            "Add a test case that reproduces the failure condition "
            "and verifies that the application handles the invalid "
            "or missing object safely."
        )

        confidence = "High"

    else:
        recommendation = (
            f"Recommended fix based on the identified root cause: "
            f"{root_cause}"
        )

        prevention = (
            "Add appropriate validation and error handling "
            "around the failing operation."
        )

        testing = (
            "Add a regression test covering the identified "
            "failure condition."
        )

        confidence = "Medium"

    return {
        "recommended_fix": recommendation,
        "prevention": prevention,
        "testing_recommendation": testing,
        "confidence": confidence,
        "historical_reference": (
            similar_bugs[0] if similar_bugs else None
        )
    }