"""repositories/postgres and repositories/mock implement the same interface."""

import inspect
from importlib import import_module

import pytest

from backend.repositories.base import UsersRepository, WorkspaceRepository


def _members(protocol: type) -> dict[str, inspect.Signature]:
    return {
        name: inspect.signature(fn)
        for name, fn in vars(protocol).items()
        if callable(fn) and not name.startswith("_")
    }


def _params(sig: inspect.Signature) -> list[tuple[str, inspect._ParameterKind, bool]]:
    return [(p.name, p.kind, p.default is inspect.Parameter.empty) for p in sig.parameters.values() if p.name != "self"]


@pytest.mark.parametrize("module, protocol", [("users", UsersRepository), ("workspace", WorkspaceRepository)])
@pytest.mark.parametrize("backend", ["postgres", "mock"])
def test_backend_implements_protocol(backend, module, protocol):
    impl = import_module(f"backend.repositories.{backend}.{module}")
    for name, sig in _members(protocol).items():
        fn = getattr(impl, name, None)
        assert callable(fn), f"{backend}.{module}.{name} is missing"
        assert _params(inspect.signature(fn)) == _params(sig), f"{backend}.{module}.{name} signature differs"


@pytest.mark.parametrize("module, protocol", [("users", UsersRepository), ("workspace", WorkspaceRepository)])
def test_no_backend_specific_public_functions(module, protocol):
    """Every public function of a backend is part of the shared interface."""
    expected = set(_members(protocol))
    for backend in ("postgres", "mock"):
        impl = import_module(f"backend.repositories.{backend}.{module}")
        public = {
            name
            for name, fn in vars(impl).items()
            if inspect.isfunction(fn) and fn.__module__ == impl.__name__ and not name.startswith("_")
        }
        assert public == expected, f"{backend}.{module}: {public ^ expected}"
