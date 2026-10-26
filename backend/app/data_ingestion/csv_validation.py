import csv
from dataclasses import dataclass
from io import TextIOBase
from decimal import Decimal, InvalidOperation


@dataclass(frozen=True)
class IngestionReport:
    dataset_id: str
    valid_rows: tuple[dict[str, str], ...]
    invalid_rows: tuple[dict[str, str], ...]


REQUIRED_FIELDS = {"outlet_id", "transaction_date", "quantity", "unit_price"}


def validate_sales_csv(stream: TextIOBase, dataset_id: str) -> IngestionReport:
    reader = csv.DictReader(stream)
    fields = set(reader.fieldnames or [])
    if not REQUIRED_FIELDS.issubset(fields):
        missing = ", ".join(sorted(REQUIRED_FIELDS - fields))
        raise ValueError(f"missing required CSV fields: {missing}")
    valid, invalid = [], []
    for row in reader:
        try:
            quantity = int(row["quantity"])
            price = Decimal(row["unit_price"])
            if not row["outlet_id"] or quantity < 0 or price < 0:
                raise ValueError
            valid.append(dict(row))
        except (ValueError, InvalidOperation):
            invalid.append(dict(row))
    return IngestionReport(dataset_id=dataset_id, valid_rows=tuple(valid), invalid_rows=tuple(invalid))
