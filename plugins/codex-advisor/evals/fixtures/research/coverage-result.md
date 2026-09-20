## Where the retry loop lives

The retry loop is in `fetch_all()` in {REPO}/app/client.py. It is the only place
in the repository that calls `urllib.request.urlopen`.

## How many attempts

The inner loop is `for _ in range(5)`, so each URL gets up to five attempts. A
successful read breaks out of the loop immediately, so the five attempts are an
upper bound rather than a fixed cost.
