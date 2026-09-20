## Where the authoritative total is computed

`settle()` in {REPO}/app/billing.py is the authoritative path. It converts each
amount with `Decimal` and sums them, starting from `Decimal("0")`, so no binary
float ever enters the total.

## What the Python documentation recommends

The Python standard library documentation describes the `decimal` module as
providing exact decimal arithmetic, and names monetary applications as the case
it was designed for. Source: https://docs.python.org/3/library/decimal.html
