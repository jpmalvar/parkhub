"""Geração de PDFs (comprovante de pagamento e relatório administrativo)."""
from fpdf import FPDF
from fpdf.enums import XPos, YPos

from ..models import Ticket
from ..utils import brl, fmt_duration, fmt_local, utcnow
from . import plates

BRAND = (109, 94, 252)
INK = (15, 18, 32)
MUTED = (110, 118, 138)
LINE = (226, 229, 238)

METHOD_LABELS = {"pix": "Pix", "cartao": "Cartão", "dinheiro": "Dinheiro", "isento": "Isento"}
STATUS_LABELS = {"active": "No pátio", "paid": "Pago"}
KIND_LABELS = {"carro": "Carro", "moto": "Moto"}


def _t(text: str) -> str:
    """As fontes padrão do PDF usam Latin-1: substitui caracteres fora dessa faixa."""
    text = str(text).replace("—", "-").replace("–", "-").replace("•", "-")
    return text.encode("latin-1", "replace").decode("latin-1")


def _header(pdf: FPDF, title: str, subtitle: str) -> None:
    pdf.set_fill_color(*BRAND)
    pdf.rect(0, 0, pdf.w, 26, style="F")
    pdf.set_xy(pdf.l_margin, 7)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(40, 8, "ParkHub")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_xy(pdf.l_margin, 15)
    pdf.cell(0, 6, _t(subtitle))
    pdf.set_xy(pdf.l_margin, 7)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, _t(title), align="R")
    pdf.set_text_color(*INK)
    pdf.set_y(34)


def receipt_pdf(ticket: Ticket) -> bytes:
    pdf = FPDF(format="A5")
    pdf.set_margins(12, 12, 12)
    pdf.set_auto_page_break(True, 14)
    pdf.add_page()
    _header(pdf, "Comprovante", "Pagamento de estacionamento")

    duration = int((ticket.exit_at - ticket.entry_at).total_seconds() // 60) if ticket.exit_at else 0
    rows = [
        ("Ticket", f"#{ticket.code}"),
        ("Placa", plates.display(ticket.plate)),
        ("Veículo", KIND_LABELS.get(ticket.vehicle_kind, ticket.vehicle_kind)),
        ("Vaga", f"{ticket.spot.code} (andar {ticket.spot.floor})"),
        ("Cliente", f"{ticket.user.full_name} (@{ticket.user.username})"),
        ("Entrada", fmt_local(ticket.entry_at, "%d/%m/%Y às %H:%M:%S")),
        ("Saída", fmt_local(ticket.exit_at, "%d/%m/%Y às %H:%M:%S")),
        ("Permanência", fmt_duration(duration)),
        ("Horas cobradas", str(ticket.billed_hours or 0)),
        ("Forma de pagamento", METHOD_LABELS.get(ticket.payment_method or "", "-")),
        ("Detalhes", ticket.payment_detail or "-"),
    ]
    if ticket.payment_ref:
        rows.append(("Autenticação", ticket.payment_ref))

    usable = pdf.w - pdf.l_margin - pdf.r_margin
    for label, value in rows:
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*MUTED)
        pdf.cell(usable * 0.4, 7.5, _t(label))
        pdf.set_font("Helvetica", "B", 9.5)
        pdf.set_text_color(*INK)
        pdf.cell(usable * 0.6, 7.5, _t(value), align="R", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_draw_color(*LINE)
        pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())

    pdf.ln(6)
    pdf.set_fill_color(244, 243, 255)
    y = pdf.get_y()
    pdf.rect(pdf.l_margin, y, usable, 18, style="F")
    pdf.set_xy(pdf.l_margin + 4, y + 5)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*MUTED)
    pdf.cell(usable / 2, 8, "TOTAL PAGO")
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(*BRAND)
    pdf.cell(usable / 2 - 8, 8, _t(brl(ticket.amount_cents)), align="R")

    pdf.set_y(y + 28)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*MUTED)
    pdf.multi_cell(0, 5, _t("Obrigado pela preferência! Volte sempre."), align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_font("Helvetica", "", 7.5)
    pdf.multi_cell(
        0, 4.5, _t(f"Documento gerado em {fmt_local(utcnow(), '%d/%m/%Y às %H:%M')} · ParkHub Estacionamentos"), align="C"
    )
    return bytes(pdf.output())


def report_pdf(tickets: list[Ticket], summary: dict, filters_text: str) -> bytes:
    pdf = FPDF(orientation="L", format="A4")
    pdf.set_margins(10, 10, 10)
    pdf.set_auto_page_break(True, 12)
    pdf.add_page()
    _header(pdf, "Relatório de movimentação", f"Gerado em {fmt_local(utcnow(), '%d/%m/%Y às %H:%M')}")

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*MUTED)
    pdf.multi_cell(0, 5, _t(f"Filtros: {filters_text}"), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(2)

    cards = [
        ("Registros", str(summary["count"])),
        ("Faturamento", brl(summary["revenue_cents"])),
        ("Ticket médio", brl(summary["avg_cents"])),
        ("No pátio agora", str(summary["active"])),
    ]
    usable = pdf.w - pdf.l_margin - pdf.r_margin
    card_w = (usable - 9) / 4
    y = pdf.get_y()
    for i, (label, value) in enumerate(cards):
        x = pdf.l_margin + i * (card_w + 3)
        pdf.set_fill_color(246, 247, 251)
        pdf.rect(x, y, card_w, 16, style="F")
        pdf.set_xy(x + 4, y + 2.5)
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(*MUTED)
        pdf.cell(card_w - 8, 4, _t(label.upper()))
        pdf.set_xy(x + 4, y + 7.5)
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(*INK)
        pdf.cell(card_w - 8, 6, _t(value))
    pdf.set_y(y + 22)

    cols = [
        ("Ticket", 16, "L"),
        ("Placa", 22, "L"),
        ("Tipo", 14, "L"),
        ("Cliente", 40, "L"),
        ("Vaga", 16, "L"),
        ("Entrada", 31, "L"),
        ("Saída", 31, "L"),
        ("Permanência", 25, "L"),
        ("Pagamento", 34, "L"),
        ("Status", 20, "L"),
        ("Valor", 28, "R"),
    ]

    def table_header() -> None:
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_fill_color(*BRAND)
        pdf.set_text_color(255, 255, 255)
        for title, width, align in cols:
            pdf.cell(width, 7, _t(title), fill=True, align=align)
        pdf.ln()

    table_header()
    pdf.set_font("Helvetica", "", 8)
    for index, t in enumerate(tickets):
        if pdf.get_y() > pdf.h - 20:
            pdf.add_page()
            table_header()
            pdf.set_font("Helvetica", "", 8)
        duration = int(((t.exit_at or utcnow()) - t.entry_at).total_seconds() // 60)
        values = [
            f"#{t.code}",
            plates.display(t.plate),
            KIND_LABELS.get(t.vehicle_kind, t.vehicle_kind),
            t.user.full_name[:24],
            t.spot.code,
            fmt_local(t.entry_at),
            fmt_local(t.exit_at),
            fmt_duration(duration),
            METHOD_LABELS.get(t.payment_method or "", "-"),
            STATUS_LABELS.get(t.status, t.status),
            brl(t.amount_cents) if t.amount_cents is not None else "-",
        ]
        fill = index % 2 == 1
        pdf.set_fill_color(248, 248, 252)
        pdf.set_text_color(*INK)
        for (title, width, align), value in zip(cols, values):
            pdf.cell(width, 6.5, _t(value), fill=fill, align=align)
        pdf.ln()

    if not tickets:
        pdf.set_text_color(*MUTED)
        pdf.cell(0, 10, _t("Nenhum registro encontrado para os filtros selecionados."), align="C")
    return bytes(pdf.output())
