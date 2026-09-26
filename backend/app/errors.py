class DomainError(Exception):
    """Erro de regra de negócio, convertido automaticamente em resposta HTTP."""

    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message
