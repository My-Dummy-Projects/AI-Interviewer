import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from deps import extract_user_email_from_claims


def test_extract_user_email_from_clerk_email_claim():
    claims = {"sub": "user_123", "email": "user@example.com"}
    assert extract_user_email_from_claims(claims) == "user@example.com"


def test_extract_user_email_from_primary_email_claim():
    claims = {"sub": "user_123", "primary_email": "user@example.com"}
    assert extract_user_email_from_claims(claims) == "user@example.com"


def test_extract_user_email_from_email_addresses_array():
    claims = {"sub": "user_123", "email_addresses": [{"email_address": "user@example.com"}]}
    assert extract_user_email_from_claims(claims) == "user@example.com"
