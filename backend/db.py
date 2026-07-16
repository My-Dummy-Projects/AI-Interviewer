import os
import uuid
from types import SimpleNamespace
from typing import Any, Optional

from pymongo import MongoClient
from pymongo.errors import PyMongoError


class MongoAuthUser(dict):
    def __init__(self, user_id: str, email: str):
        super().__init__(id=user_id, email=email)
        self.id = user_id
        self.email = email


class MongoAuthSession(dict):
    def __init__(self, access_token: str = "", refresh_token: str = ""):
        super().__init__(access_token=access_token, refresh_token=refresh_token)
        self.access_token = access_token
        self.refresh_token = refresh_token


class MongoAuthCompat:
    def __init__(self, client):
        self._client = client

    def sign_up(self, data: dict):
        email = data.get("email", "") or ""
        user_id = str(uuid.uuid4())
        return SimpleNamespace(user=MongoAuthUser(user_id, email), session=MongoAuthSession())

    def sign_in_with_password(self, data: dict):
        email = data.get("email", "") or ""
        user_id = str(uuid.uuid5(uuid.NAMESPACE_URL, email or "anonymous"))
        return SimpleNamespace(user=MongoAuthUser(user_id, email), session=MongoAuthSession())

    def get_user(self, token: str):
        return SimpleNamespace(user=MongoAuthUser("anonymous", ""), session=MongoAuthSession())

    def reset_password_email(self, email: str, options: Optional[dict] = None):
        return {"email": email, "options": options or {}}

    class Admin:
        def sign_out(self, user_id: str):
            return True

        def update_user_by_id(self, user_id: str, data: dict):
            return {"id": user_id, **data}

    admin = Admin()

    def refresh_session(self, refresh_token: str):
        return SimpleNamespace(
            user=MongoAuthUser("anonymous", ""),
            access_token="mongo-token",
            refresh_token=refresh_token,
            expires_in=3600,
            expires_at=0,
            token_type="bearer",
        )


class MemoryCollection:
    def __init__(self):
        self._docs = []

    def find_one(self, filter=None):
        docs = self.find(filter)
        return docs[0] if docs else None

    def find(self, filter=None):
        filter = filter or {}
        docs = []
        for doc in self._docs:
            if _matches_filter(doc, filter):
                docs.append(doc)
        return docs

    def insert_one(self, doc):
        normalized = _normalize_document(doc)
        self._docs.append(normalized)
        return SimpleNamespace(inserted_id=normalized.get("id"))

    def insert_many(self, docs):
        inserted = []
        for doc in docs:
            inserted.append(self.insert_one(doc))
        return inserted

    def update_one(self, filter, update):
        matched = False
        for doc in self._docs:
            if _matches_filter(doc, filter):
                matched = True
                for key, value in update.items():
                    doc[key] = value
                break
        return SimpleNamespace(modified_count=1 if matched else 0)


class MongoTableQuery:
    def __init__(self, collection_name: str, client):
        self.collection_name = collection_name
        self.client = client
        self._filters = {}
        self._sort = None
        self._limit = None

    def select(self, *_args):
        return self

    def eq(self, field: str, value: Any):
        self._filters[field] = value
        return self

    def in_(self, field: str, values):
        self._filters[field] = {"$in": list(values)}
        return self

    def order(self, field: str, desc: bool = False):
        self._sort = (field, -1 if desc else 1)
        return self

    def limit(self, value: int):
        self._limit = value
        return self

    def execute(self):
        docs = self.client._find_documents(self.collection_name, self._filters, self._sort, self._limit)
        return SimpleNamespace(data=docs)


class MongoTableInsert:
    def __init__(self, collection_name: str, client, payload: Any):
        self.collection_name = collection_name
        self.client = client
        self.payload = payload

    def execute(self):
        return self.client._insert_documents(self.collection_name, self.payload)


class MongoTableUpdate:
    def __init__(self, collection_name: str, client, payload: Any):
        self.collection_name = collection_name
        self.client = client
        self.payload = payload
        self._filters = {}

    def eq(self, field: str, value: Any):
        self._filters[field] = value
        return self

    def in_(self, field: str, values):
        self._filters[field] = {"$in": list(values)}
        return self

    def execute(self):
        return self.client._update_documents(self.collection_name, self._filters, self.payload)


class MongoTableAdapter:
    def __init__(self, collection_name: str, client):
        self.collection_name = collection_name
        self.client = client

    def select(self, *_args):
        return MongoTableQuery(self.collection_name, self.client)

    def insert(self, payload: Any):
        return MongoTableInsert(self.collection_name, self.client, payload)

    def update(self, payload: Any):
        return MongoTableUpdate(self.collection_name, self.client, payload)


class MongoCompatClient:
    def __init__(self, database=None, memory_store=None):
        self._database = database
        self._memory_store = memory_store or {}
        self.auth = MongoAuthCompat(self)

        if not self._database:
            self._memory_store.setdefault("__collections__", {})

    def table(self, collection_name: str):
        return MongoTableAdapter(collection_name, self)

    def _get_collection(self, collection_name: str):
        if self._database is not None:
            return self._database[collection_name]

        if collection_name not in self._memory_store:
            self._memory_store[collection_name] = MemoryCollection()
        return self._memory_store[collection_name]

    def _find_documents(self, collection_name: str, filters: dict, sort=None, limit=None):
        collection = self._get_collection(collection_name)
        docs = collection.find(filters)
        if sort:
            field, direction = sort
            docs = sorted(docs, key=lambda doc: doc.get(field, ""), reverse=direction < 0)
        if limit is not None:
            docs = docs[:limit]
        return [_normalize_document(doc) for doc in docs]

    def _insert_documents(self, collection_name: str, payload: Any):
        collection = self._get_collection(collection_name)
        if isinstance(payload, list):
            inserted = []
            for item in payload:
                inserted.append(_normalize_document(item))
                collection.insert_one(item)
            return SimpleNamespace(data=inserted)

        normalized = _normalize_document(payload)
        collection.insert_one(normalized)
        return SimpleNamespace(data=[normalized])

    def _update_documents(self, collection_name: str, filters: dict, payload: Any):
        collection = self._get_collection(collection_name)
        collection.update_one(filters, payload)
        return SimpleNamespace(data=[payload])


def _matches_filter(doc: dict, filter: dict) -> bool:
    for key, expected in (filter or {}).items():
        if isinstance(expected, dict) and "$in" in expected:
            if doc.get(key) not in expected["$in"]:
                return False
        elif doc.get(key) != expected:
            return False
    return True


def _normalize_document(doc: Any) -> dict:
    if not isinstance(doc, dict):
        return {}

    normalized = dict(doc)
    if "id" not in normalized:
        normalized["id"] = str(normalized.get("_id") or uuid.uuid4())
    if "_id" not in normalized:
        normalized["_id"] = normalized["id"]
    return normalized


def build_mongo_client() -> MongoCompatClient:
    mongodb_uri = os.environ.get("MONGODB_URI", "").strip()
    mongodb_db = os.environ.get("MONGODB_DB", "ai_interviewer").strip()

    if mongodb_uri:
        try:
            client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=2000)
            db = client[mongodb_db]
            client.admin.command("ping")
            return MongoCompatClient(database=db)
        except (PyMongoError, Exception):
            pass

    return MongoCompatClient(memory_store={})
