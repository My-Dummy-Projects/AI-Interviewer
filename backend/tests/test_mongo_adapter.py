from db import build_mongo_client


def test_mongo_adapter_supports_insert_and_select():
    client = build_mongo_client()
    table = client.table("user_profiles")

    table.insert({"user_id": "user-1", "email": "user@example.com"}).execute()
    result = table.select("*").eq("user_id", "user-1").execute()

    assert result.data[0]["email"] == "user@example.com"


def test_mongo_adapter_supports_in_filter_and_update():
    client = build_mongo_client()
    table = client.table("interviews")

    table.insert({"id": "int-1", "user_id": "u1", "status": "draft"}).execute()
    table.insert({"id": "int-2", "user_id": "u2", "status": "draft"}).execute()

    table.update({"status": "complete"}).eq("id", "int-1").execute()
    result = table.select("*").in_("id", ["int-1", "int-2"]).execute()

    assert any(item["status"] == "complete" for item in result.data)
    assert any(item["status"] == "draft" for item in result.data)
