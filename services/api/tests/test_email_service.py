"""email_service.send_password_reset_email — the rule that matters here is
that a SendGrid problem must NEVER break the forgot-password response."""

from types import SimpleNamespace

import email_service


def test_without_credentials_nothing_is_sent(monkeypatch):
    monkeypatch.setattr(email_service, "SENDGRID_API_KEY", "")
    monkeypatch.setattr(email_service, "SENDGRID_FROM_EMAIL", "")
    created = []
    monkeypatch.setattr(email_service, "SendGridAPIClient", lambda key: created.append(key))

    email_service.send_password_reset_email("a@example.com", "http://x/reset?token=t")

    assert created == []  # never even built a client


def test_with_credentials_the_email_goes_to_the_right_person_with_the_link(monkeypatch):
    monkeypatch.setattr(email_service, "SENDGRID_API_KEY", "fake-key")
    monkeypatch.setattr(email_service, "SENDGRID_FROM_EMAIL", "no-reply@example.com")
    sent = []
    fake_client = SimpleNamespace(send=lambda message: sent.append(message))
    monkeypatch.setattr(email_service, "SendGridAPIClient", lambda key: fake_client)

    email_service.send_password_reset_email("a@example.com", "http://x/reset?token=abc123")

    assert len(sent) == 1
    body = sent[0].get()
    assert body["personalizations"][0]["to"][0]["email"] == "a@example.com"
    assert "http://x/reset?token=abc123" in str(body["content"])


def test_a_sendgrid_failure_is_swallowed_and_never_leaks_the_error(monkeypatch, caplog):
    monkeypatch.setattr(email_service, "SENDGRID_API_KEY", "fake-key")
    monkeypatch.setattr(email_service, "SENDGRID_FROM_EMAIL", "no-reply@example.com")

    def exploding_client(key):
        raise RuntimeError("401 Unauthorized: key=SG.super-secret")

    monkeypatch.setattr(email_service, "SendGridAPIClient", exploding_client)

    # Must not raise...
    email_service.send_password_reset_email("a@example.com", "http://x/reset?token=t")

    # ...and the secret from the exception text must not reach the logs.
    assert "super-secret" not in caplog.text
