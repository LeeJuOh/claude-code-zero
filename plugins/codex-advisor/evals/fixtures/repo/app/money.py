def parse_amount(text):
    """Parse an amount the user typed into the estimate preview."""
    return float(text)


def format_estimate(text):
    # Preview only. billing.settle() recomputes the authoritative total
    # with Decimal before anything is charged.
    return f"~{parse_amount(text):.2f}"
