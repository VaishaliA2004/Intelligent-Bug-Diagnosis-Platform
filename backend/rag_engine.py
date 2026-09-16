import json
import os


# Location of the historical bug knowledge base
KNOWLEDGE_BASE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "knowledge_base",
    "historical_bugs.json"
)


def load_historical_bugs():
    """
    Load historical bug records from the knowledge base.
    """

    with open(
        KNOWLEDGE_BASE_PATH,
        "r",
        encoding="utf-8"
    ) as file:

        return json.load(file)


def retrieve_similar_bugs(bug_record, top_k=3):
    """
    Retrieve historical bugs that are most similar
    to the current bug.

    Similarity is calculated using matching:
    - exception
    - component
    - keywords
    """

    historical_bugs = load_historical_bugs()

    current_exception = str(
        bug_record.get("exception", "")
    ).lower()

    current_keywords = set(
        str(keyword).lower()
        for keyword in bug_record.get("keywords", [])
    )

    current_title = str(
        bug_record.get("title", "")
    ).lower()

    scored_bugs = []

    for historical_bug in historical_bugs:

        score = 0

        historical_exception = str(
            historical_bug.get("exception", "")
        ).lower()

        historical_component = str(
            historical_bug.get("component", "")
        ).lower()

        historical_keywords = set(
            str(keyword).lower()
            for keyword in historical_bug.get("keywords", [])
        )

        historical_title = str(
            historical_bug.get("title", "")
        ).lower()

        # Exception match
        if current_exception and current_exception == historical_exception:
            score += 5

        # Keyword matches
        keyword_matches = (
            current_keywords & historical_keywords
        )

        score += len(keyword_matches) * 2

        # Title word matches
        current_title_words = set(
            current_title.split()
        )

        historical_title_words = set(
            historical_title.split()
        )

        title_matches = (
            current_title_words & historical_title_words
        )

        score += len(title_matches)

        # Component-related matching
        if historical_component:
            for word in historical_component.split("/"):
                if word.strip().lower() in current_title:
                    score += 2

        scored_bugs.append(
            {
                "bug": historical_bug,
                "score": score
            }
        )

    # Sort by highest similarity score
    scored_bugs.sort(
        key=lambda item: item["score"],
        reverse=True
    )

    # Return top matching bugs
    return scored_bugs[:top_k]