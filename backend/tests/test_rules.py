from datetime import date, datetime, timedelta

import pytest

from app.services import cards, pix, plates
from app.services.pricing import Tariff, compute_quote

T0 = datetime(2026, 1, 1, 8, 0, 0)
CAR = Tariff(hourly_cents=1000, daily_cap_cents=6000, grace_minutes=15)


def q(minutes: float, tariff: Tariff = CAR):
    return compute_quote(T0, T0 + timedelta(minutes=minutes), tariff)


class TestPricing:
    def test_within_grace_is_free(self):
        r = q(15)
        assert r.amount_cents == 0 and r.grace_applied

    def test_after_grace_charges_minimum_one_hour(self):
        r = q(16)
        assert r.billed_hours == 1 and r.amount_cents == 1000

    def test_started_hours_are_rounded_up(self):
        assert q(61).billed_hours == 2
        assert q(120).billed_hours == 2
        assert q(121).amount_cents == 3000

    def test_daily_cap(self):
        r = q(10 * 60)
        assert r.amount_cents == 6000 and r.cap_applied and r.gross_cents == 10000

    def test_multiple_days(self):
        r = q(26 * 60 - 1)  # 26 horas iniciadas = 1 diária + 2h
        assert r.full_days == 1 and r.amount_cents == 6000 + 2000

    def test_without_cap(self):
        r = q(30 * 60, Tariff(500, 0, 0))
        assert r.amount_cents == 30 * 500 and not r.cap_applied

    def test_zero_grace(self):
        assert q(1, Tariff(1000, 0, 0)).amount_cents == 1000


class TestPlates:
    @pytest.mark.parametrize("raw,expected", [("abc-1234", "ABC1234"), ("BRA2E19", "BRA2E19"), (" bra 2e19 ", "BRA2E19")])
    def test_normalize(self, raw, expected):
        assert plates.normalize(raw) == expected

    @pytest.mark.parametrize("raw", ["", "AB1234", "ABCD123", "1234ABC", "ABC12E4"])
    def test_invalid(self, raw):
        with pytest.raises(ValueError):
            plates.normalize(raw)

    def test_display(self):
        assert plates.display("ABC1234") == "ABC-1234"
        assert plates.display("BRA2E19") == "BRA2E19"


class TestCards:
    def test_valid_visa(self):
        assert cards.validate_card("4111 1111 1111 1111", "MARIA S", "12/99", "123") == ("Visa", "1111")

    def test_luhn_failure(self):
        with pytest.raises(ValueError):
            cards.validate_card("4111 1111 1111 1112", "MARIA S", "12/99", "123")

    def test_expired(self):
        with pytest.raises(ValueError, match="vencido"):
            cards.validate_card("5555555555554444", "MARIA S", "01/20", "123", today=date(2026, 1, 1))


def test_pix_payload_has_valid_crc():
    payload = pix.build_payload(1250, "PH1001ABC")
    body, crc = payload[:-4], payload[-4:]
    assert body.endswith("6304") and pix.crc16_ccitt(body) == crc
    assert "540512.50" in payload
