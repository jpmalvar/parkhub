"""Geração de payload Pix no padrão EMV/BR Code do Banco Central (pagamento simulado)."""
import secrets

PIX_KEY = "pagamentos@parkhub.com.br"
MERCHANT_NAME = "PARKHUB ESTACIONAMENTOS"
MERCHANT_CITY = "SAO PAULO"


def _field(field_id: str, value: str) -> str:
    return f"{field_id}{len(value):02d}{value}"


def crc16_ccitt(payload: str) -> str:
    crc = 0xFFFF
    for byte in payload.encode("utf-8"):
        crc ^= byte << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) if crc & 0x8000 else (crc << 1)
            crc &= 0xFFFF
    return f"{crc:04X}"


def new_txid(ticket_code: str) -> str:
    return f"PH{ticket_code}{secrets.token_hex(6).upper()}"[:25]


def build_payload(amount_cents: int, txid: str) -> str:
    account = _field("00", "br.gov.bcb.pix") + _field("01", PIX_KEY)
    payload = (
        _field("00", "01")
        + _field("26", account)
        + _field("52", "0000")
        + _field("53", "986")
        + (_field("54", f"{amount_cents / 100:.2f}") if amount_cents > 0 else "")
        + _field("58", "BR")
        + _field("59", MERCHANT_NAME[:25])
        + _field("60", MERCHANT_CITY[:15])
        + _field("62", _field("05", txid))
        + "6304"
    )
    return payload + crc16_ccitt(payload)
