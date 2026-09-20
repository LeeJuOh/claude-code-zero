import urllib.request


def fetch_all(urls):
    results = []
    for url in urls:
        for _ in range(5):
            try:
                results.append(urllib.request.urlopen(url).read())
                break
            except OSError:
                continue
    return results
