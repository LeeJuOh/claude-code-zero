import csv


def strip_bom(text):
    return text.lstrip("﻿")


def load_rows(path):
    with open(path) as f:
        for row in csv.reader(f):
            yield row[0], row[1]
