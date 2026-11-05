"""Data access layer.

``DATA_BACKEND`` picks the implementation (see config.py):

- ``postgres``: SQL against Supabase / PostgreSQL (``repositories/postgres``).
- ``mock``: static sample data, nothing is stored (``repositories/mock``).

Both expose the same functions, so callers just use ``repositories.users`` and
``repositories.workspace``.
"""

from importlib import import_module

from ..config import get_settings

_backend = get_settings().data_backend

users = import_module(f".{_backend}.users", __name__)
workspace = import_module(f".{_backend}.workspace", __name__)

__all__ = ["users", "workspace"]
