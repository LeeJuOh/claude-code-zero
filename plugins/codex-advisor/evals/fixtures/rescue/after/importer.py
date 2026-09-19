import csv
import logging


def sniff_delimiter(sample):
    return ";" if sample.count(";") > sample.count(",") else ","


def load_rows(path):
    with open(path) as f:
        sample = f.readline()
        f.seek(0)
        delimiter = sniff_delimiter(sample)
        for number, row in enumerate(csv.reader(f, delimiter=delimiter), start=1):
            if len(row) < 2:
                raise ValueError(f"{path}:{number}: row has {len(row)} columns, expected 2")
            logging.info("row %s: %s", number, row)
            yield row[0], row[1]
