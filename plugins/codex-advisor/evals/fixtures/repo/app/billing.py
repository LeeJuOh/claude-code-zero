from decimal import Decimal


def settle(amounts):
    """Authoritative total: Decimal only, never float."""
    return sum((Decimal(a) for a in amounts), Decimal("0"))
