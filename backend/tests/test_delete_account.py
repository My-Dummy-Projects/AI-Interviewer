"""Unit tests for the delete-account data purge (no live database)."""
from types import SimpleNamespace

import pytest

from deps import normalize_user_id
from routes_user import get_user_id_candidates, purge_user_data


class FakeDB:
    """Minimal stand-in for the supabase client used by the delete flow."""

    def __init__(self, profile_rows=None):
        self.calls = []
        self.profile_rows = profile_rows or []

    def table(self, name):
        return FakeTable(self, name)


class FakeTable:
    def __init__(self, db, name):
        self._db = db
        self._name = name

    def delete(self):
        db, table = self._db, self._name

        class _DeleteQuery:
            def in_(_self, column, values):
                db.calls.append(("delete", table, column, list(values)))
                return _self

            def execute(_self):
                return SimpleNamespace(data=[])

        return _DeleteQuery()

    def select(self, *_args, **_kwargs):
        db, table = self._db, self._name

        class _SelectQuery:
            def eq(_self, column, value):
                db.calls.append(("select", table, column, value))
                return _self

            def execute(_self):
                rows = db.profile_rows if table == "user_profiles" else []
                return SimpleNamespace(data=rows)

        return _SelectQuery()


def test_purge_deletes_interviews_then_profiles_for_all_candidates():
    db = FakeDB()
    candidates = [
        "aaaaaaaa-1111-1111-1111-111111111111",
        "bbbbbbbb-2222-2222-2222-222222222222",
    ]

    purge_user_data(candidates, client=db)

    assert db.calls == [
        ("delete", "interviews", "user_id", candidates),
        ("delete", "user_profiles", "user_id", candidates),
    ]


def test_purge_is_a_noop_without_candidates():
    db = FakeDB()

    purge_user_data([], client=db)

    assert db.calls == []


def test_purge_propagates_client_errors():
    class BrokenDB:
        def table(self, _name):
            raise RuntimeError("connection lost")

    with pytest.raises(RuntimeError, match="connection lost"):
        purge_user_data(["aaaaaaaa-1111-1111-1111-111111111111"], client=BrokenDB())


def test_candidates_include_email_matched_legacy_profiles():
    db = FakeDB(profile_rows=[{"user_id": "legacy-row-id"}])

    candidates = get_user_id_candidates("user_abcDEF123", "user@example.com", client=db)

    assert candidates == [
        normalize_user_id("user_abcDEF123"),
        normalize_user_id("legacy-row-id"),
    ]
    assert ("select", "user_profiles", "email", "user@example.com") in db.calls


def test_delete_account_route_is_registered():
    from app import app

    paths = app.openapi()["paths"]
    assert "delete" in paths.get("/api/user/account", {})
