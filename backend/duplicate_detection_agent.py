from backend.rag_retriever import retrieve_similar_bugs


def detect_duplicate_bug(bug_record):
    """
    Duplicate Detection Agent

    Searches the historical bug knowledge base and determines
    whether the current bug is similar to an existing bug.
    """

    # Retrieve similar historical bugs
    similar_bugs = retrieve_similar_bugs(
        bug_record,
        top_k=3
    )

    # No similar bugs found
    if not similar_bugs:
        return {
            "is_duplicate": False,
            "confidence": "Low",
            "message": "No similar historical bugs were found.",
            "similar_bugs": []
        }

    # Best matching historical bug
    best_match = similar_bugs[0]

    similarity_score = best_match.get(
        "similarity_score",
        0
    )

    # Determine duplicate status
    if similarity_score >= 7:
        is_duplicate = True
        confidence = "High"
        message = (
            f"The current bug is highly similar to historical "
            f"bug {best_match['id']} ({best_match['title']})."
        )

    elif similarity_score >= 5:
        is_duplicate = True
        confidence = "Medium"
        message = (
            f"The current bug has a moderate similarity to "
            f"historical bug {best_match['id']} "
            f"({best_match['title']})."
        )

    else:
        is_duplicate = False
        confidence = "Low"
        message = (
            "The current bug does not strongly match any "
            "historical defect."
        )

    return {
        "is_duplicate": is_duplicate,
        "confidence": confidence,
        "message": message,
        "best_match": best_match,
        "similar_bugs": similar_bugs
    }