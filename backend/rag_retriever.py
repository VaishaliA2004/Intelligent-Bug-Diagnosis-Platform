import json
import os

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


KNOWLEDGE_BASE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "knowledge_base",
    "historical_bugs.json"
)


def load_knowledge_base():
    """
    Load historical resolved bugs from JSON knowledge base.
    """

    if not os.path.exists(KNOWLEDGE_BASE_PATH):
        return []

    try:
        with open(
            KNOWLEDGE_BASE_PATH,
            "r",
            encoding="utf-8"
        ) as file:
            return json.load(file)

    except (
        json.JSONDecodeError,
        OSError
    ):
        return []


def normalize_text(value):
    """
    Safely convert values into searchable text.
    """

    if value is None:
        return ""

    if isinstance(value, list):
        return " ".join(
            str(item)
            for item in value
        )

    return str(value)


def build_bug_text(bug):
    """
    Convert a bug record into one searchable text document.
    """

    fields = [
        bug.get("title", ""),
        bug.get("component", ""),
        bug.get("exception", ""),
        bug.get("description", ""),
        bug.get("root_cause", ""),
        bug.get("resolution", ""),
        bug.get("file", ""),
        bug.get("keywords", ""),
    ]

    return " ".join(
        normalize_text(field)
        for field in fields
        if field
    ).strip()


def get_exception(bug):
    """
    Read exception field safely from either uploaded bug
    records or historical bug records.
    """

    return (
        bug.get("exception")
        or bug.get("exception_type")
        or ""
    ).strip().lower()


def retrieve_similar_bugs(
    bug_record,
    top_k=3
):
    """
    Retrieve similar historical bugs using TF-IDF
    vectorization and cosine similarity.

    Similarity score is returned on a 0-10 scale so
    existing duplicate-detection thresholds continue
    to work.
    """

    historical_bugs = load_knowledge_base()

    if not historical_bugs:
        return []

    query_text = build_bug_text(
        bug_record
    )

    if not query_text:
        return []

    historical_documents = [
        build_bug_text(bug)
        for bug in historical_bugs
    ]

    documents = [
        query_text,
        *historical_documents
    ]

    try:
        vectorizer = TfidfVectorizer(
            lowercase=True,
            stop_words="english",
            ngram_range=(1, 2)
        )

        tfidf_matrix = (
            vectorizer.fit_transform(
                documents
            )
        )

        query_vector = tfidf_matrix[0:1]

        historical_vectors = (
            tfidf_matrix[1:]
        )

        cosine_scores = (
            cosine_similarity(
                query_vector,
                historical_vectors
            )[0]
        )

    except ValueError:
        return []

    query_exception = get_exception(
        bug_record
    )

    results = []

    for index, bug in enumerate(
        historical_bugs
    ):

        cosine_score = float(
            cosine_scores[index]
        )

        historical_exception = (
            get_exception(bug)
        )

        # Semantic/text similarity contributes 75%.
        # Exact exception match contributes 25%.
        exception_match = (
            1.0
            if (
                query_exception
                and historical_exception
                and query_exception
                == historical_exception
            )
            else 0.0
        )

        combined_similarity = (
            cosine_score * 0.75
            + exception_match * 0.25
        )

        # Keep score between 0 and 10.
        similarity_score = round(
            min(
                combined_similarity * 10,
                10
            ),
            2
        )

        results.append(
            {
                "id": bug.get(
                    "id",
                    "Unknown"
                ),
                "title": bug.get(
                    "title",
                    "Unknown Bug"
                ),
                "component": bug.get(
                    "component",
                    "Unknown"
                ),
                "exception": bug.get(
                    "exception",
                    "Unknown"
                ),
                "description": bug.get(
                    "description",
                    ""
                ),
                "root_cause": bug.get(
                    "root_cause",
                    ""
                ),
                "resolution": bug.get(
                    "resolution",
                    ""
                ),
                "cosine_similarity": round(
                    cosine_score,
                    3
                ),
                "similarity_score":
                    similarity_score,
            }
        )

    results.sort(
        key=lambda item:
            item["similarity_score"],
        reverse=True
    )

    return results[:top_k]