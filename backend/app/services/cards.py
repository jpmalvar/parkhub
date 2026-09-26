"""Validação de cartões para o pagamento simulado. Nenhum dado sensível é armazenado."""
import re
from datetime import date


def luhn_ok(number: str) -> bool:
    digits = [int(d) for d in number][::-1]
    total = 0
    for i, d in enumerate(digits):
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0


def detect_brand(number: str) -> str:
    if re.match(r"^4", number):
        return "Visa"
    if re.match(r"^(5[1-5]|2[2-7])", number):
        return "Mastercard"
    if re.match(r"^3[47]", number):
        return "Amex"
    if re.match(r"^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)", number):
        return "Elo"
    if re.match(r"^(606282|3841)", number):
        return "Hipercard"
    return "Cartão"


def validate_card(number: str, holder: str, expiry: str, cvv: str, today: date | None = None) -> tuple[str, str]:
    """Retorna (bandeira, últimos 4 dígitos) ou lança ValueError com mensagem amigável."""
    number = re.sub(r"\D", "", number or "")
    if not 13 <= len(number) <= 19 or not luhn_ok(number):
        raise ValueError("Número de cartão inválido.")
    if len((holder or "").strip()) < 3:
        raise ValueError("Informe o nome impresso no cartão.")
    match = re.match(r"^(\d{2})/(\d{2})$", (expiry or "").strip())
    if not match:
        raise ValueError("Validade inválida. Use o formato MM/AA.")
    month, year = int(match.group(1)), 2000 + int(match.group(2))
    if not 1 <= month <= 12:
        raise ValueError("Mês de validade inválido.")
    today = today or date.today()
    if (year, month) < (today.year, today.month):
        raise ValueError("Cartão vencido.")
    if not re.match(r"^\d{3,4}$", cvv or ""):
        raise ValueError("CVV inválido.")
    return detect_brand(number), number[-4:]
