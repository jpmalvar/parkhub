"""Validação e normalização de placas brasileiras (padrão antigo e Mercosul)."""
import re

_OLD = re.compile(r"^[A-Z]{3}[0-9]{4}$")
_MERCOSUL = re.compile(r"^[A-Z]{3}[0-9][A-Z][0-9]{2}$")

INVALID_PLATE_MESSAGE = "Placa inválida. Use o padrão antigo (ABC-1234) ou Mercosul (BRA2E19)."


def clean(raw: str | None) -> str:
    return re.sub(r"[^A-Za-z0-9]", "", raw or "").upper()


def is_valid(plate: str) -> bool:
    return bool(_OLD.match(plate) or _MERCOSUL.match(plate))


def normalize(raw: str | None) -> str:
    """Remove hífens/espaços e padroniza em maiúsculas. Lança ValueError se inválida.

    Corrige o bug do sistema original, onde 'ABC-1234' e 'ABC1234' eram tratadas como placas diferentes.
    """
    plate = clean(raw)
    if not is_valid(plate):
        raise ValueError(INVALID_PLATE_MESSAGE)
    return plate


def plate_format(plate: str) -> str:
    return "antiga" if _OLD.match(plate) else "mercosul"


def display(plate: str) -> str:
    return f"{plate[:3]}-{plate[3:]}" if _OLD.match(plate) else plate
