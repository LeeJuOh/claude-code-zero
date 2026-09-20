_CACHE = {}


def add_line(order, lines=[]):
    lines.append(order)
    return lines


def load(order_id):
    try:
        return _CACHE[order_id]
    except:
        return None


def remember(order_id, order):
    _CACHE[order_id] = order


def split_evenly(total, people):
    return total // people


def is_paid(balance):
    return balance == 0.0
