import re


def analyze_logs(bug_record):
    """
    Log Analysis Agent

    Analyzes the structured bug information and stack trace
    to identify:
    - exception type
    - failure point
    - affected code path
    """

    exception_type = bug_record.get("exception", "Unknown")

    file_name = bug_record.get("file", "Unknown")
    line_number = bug_record.get("line", "Unknown")

    stack_trace = bug_record.get("stack_trace", [])

    # Identify the failure point
    if file_name != "Unknown" and line_number != "Unknown":
        failure_point = f"{file_name}:{line_number}"
    elif stack_trace:
        failure_point = stack_trace[0]
    else:
        failure_point = "Failure point could not be determined"

    # Extract method/class path from stack trace
    affected_code_path = []

    for stack_line in stack_trace:

        match = re.search(
            r"at\s+([a-zA-Z0-9_.]+)\(([^)]+)\)",
            stack_line
        )

        if match:
            method = match.group(1)
            location = match.group(2)

            affected_code_path.append(
                f"{method} ({location})"
            )

    # If stack trace could not be parsed
    if not affected_code_path:
        affected_code_path = stack_trace

    return {
        "exception_type": exception_type,
        "failure_point": failure_point,
        "affected_code_path": affected_code_path,
        "stack_trace": stack_trace
    }