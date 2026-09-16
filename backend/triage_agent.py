def triage_bug(bug):
    """
    Triage Agent:
    Classifies the bug based on exception, priority,
    affected file, title, and keywords.
    """

    exception = bug.get("exception", "").lower()
    priority = bug.get("priority", "").lower()
    title = bug.get("title", "").lower()
    file_name = bug.get("file", "").lower()
    keywords = bug.get("keywords", [])

    # Determine severity
    if priority == "high":
        severity = "Critical"
    elif priority == "medium":
        severity = "Major"
    else:
        severity = "Minor"

    # Determine component
    if any(word in title or word in file_name for word in
           ["payment", "checkout", "billing"]):
        component = "Payment / Checkout"

    elif any(word in title or word in file_name for word in
             ["login", "auth", "user"]):
        component = "Authentication"

    elif any(word in title or word in file_name for word in
             ["database", "db", "sql"]):
        component = "Database"

    elif any(word in title or word in file_name for word in
             ["api", "controller", "service"]):
        component = "Backend Service"

    else:
        component = "Unknown"

    # Generate reasoning
    reasoning = (
        f"The bug is classified as {severity} because its priority is "
        f"{priority or 'not specified'}. "
        f"The affected component is identified as {component} based on "
        f"the bug title, file name, and available error information. "
        f"The detected exception is {bug.get('exception', 'Unknown')}."
    )

    return {
        "severity": severity,
        "priority": bug.get("priority", "Unknown"),
        "component": component,
        "reasoning": reasoning
    }