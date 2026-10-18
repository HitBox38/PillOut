"""Stable sprite identities shared with the web artwork registry."""

import libsql_client

MEDICINES = (
    ("mercaptopurine", "Mercaptopurine"),
    ("methotrexate", "Methotrexate"),
    ("thioguanine", "Thioguanine"),
    ("imatinib", "Imatinib"),
    ("dasatinib", "Dasatinib"),
    ("temozolomide", "Temozolomide"),
    ("cyclophosphamide", "Cyclophosphamide"),
    ("etoposide", "Etoposide"),
    ("isotretinoin", "Isotretinoin"),
)
AVATARS = (
    ("dog", "Dog"),
    ("cat", "Cat"),
    ("bear", "Bear"),
    ("lion", "Lion"),
    ("rabbit", "Rabbit"),
    ("penguin", "Penguin"),
    ("fox", "Fox"),
)


async def seed_catalog(db: libsql_client.Client) -> None:
    """Insert missing built-ins without overwriting catalog edits or existing rows."""
    for key, name in MEDICINES:
        await db.execute(
            "INSERT OR IGNORE INTO drugs (catalog_key, name, asset_filename) VALUES (?, ?, ?)",
            [key, name, "/art/pills-3.png"],
        )
    for key, name in AVATARS:
        await db.execute(
            "INSERT OR IGNORE INTO avatars (catalog_key, name, filename) VALUES (?, ?, ?)",
            [key, name, "/art/avatars.png"],
        )
