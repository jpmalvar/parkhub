# ParkHub · Estacionamento inteligente

Sistema web completo de gestão de estacionamento, evolução do programa de terminal
`SistemaGaragem.py.py`. Mantém as regras originais (3 andares × 15 vagas, tickets a partir do nº 1001,
tarifas por hora para carro e moto, histórico e faturamento) e acrescenta interface moderna, segurança
de verdade, pagamentos, relatórios e atualização em tempo real.

## 🌐 Acesse online

**<https://parkhub-1s5q.onrender.com/>**

Use o **acesso rápido de demonstração** na tela de login para entrar direto como Cliente ou Administrador.
O site está hospedado no plano gratuito do Render: se ficar um tempo sem acessos, o primeiro carregamento
pode levar até 1 minuto.

## Como executar

**Windows, jeito mais fácil:** dê dois cliques em `iniciar.bat`.
Na primeira execução ele cria o ambiente Python, instala as dependências, gera os dados de demonstração
e abre o navegador em <http://localhost:8000>.

**Manualmente:**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
python -m app.demo                 # dados de demonstração (use --reset para recriar)
uvicorn app.main:app --port 8000
```

O frontend já vem compilado em `frontend/dist`. Para desenvolvê-lo:
`cd frontend && npm install && npm run dev` (abre em :5173 com proxy para a API).

### Contas de demonstração

| Perfil        | Usuário   | Senha        |
|---------------|-----------|--------------|
| Cliente       | `cliente` | `cliente123` |
| Administrador | `admin`   | `admin123`   |

A tela de login tem botões de acesso rápido para as duas contas.
Cartão de teste para o pagamento simulado: `4111 1111 1111 1111`, validade futura e qualquer CVV.

## Funcionalidades

### Cliente
- **Mapa interativo da garagem**: planta de cada andar com pista de circulação, vagas exclusivas para motos e carros que entram e saem animados.
- **Estacionar em 3 passos**: veículo → vaga (ou "escolher para mim") → confirmação. A tela avisa em tempo real se alguém ocupar a vaga escolhida.
- **Ticket digital** com QR Code, cronômetro e valor atualizados a cada segundo, além de "onde está meu carro".
- **Pagamento simulado** por Pix (QR Code e copia-e-cola no padrão EMV do Banco Central) ou cartão (validação Luhn, detecção de bandeira e cartão 3D animado), com comprovante em PDF.
- **Histórico de gastos** com filtros, gráfico mensal e **veículos salvos** com placas desenhadas no padrão Mercosul.

### Administração
- **Dashboard** com faturamento diário, comparação com o período anterior, ocupação, horários de pico, formas de pagamento e carros × motos.
- **Mapa ao vivo**: clique em um veículo para ver cliente, tempo e valor, e registrar a saída (inclusive em dinheiro, com cálculo de troco).
- **Busca global (Ctrl + K)** por placa, nº do ticket ou cliente.
- **Relatórios** com filtros, paginação e exportação para **CSV** (compatível com Excel) e **PDF**.
- **Tarifas** editáveis, com simulador e curva de preço.
- **Usuários**: promover, rebaixar, desativar e reativar contas.
- **Log de auditoria**: registra todas as ações relevantes, com usuário, data e IP.

### Regras de cobrança
- Tolerância gratuita configurável (padrão: 15 min).
- Cobrança por hora iniciada, com mínimo de 1 hora (regra do sistema original).
- Teto diário por tipo de veículo (padrão: R$ 60,00 para carro e R$ 30,00 para moto).
- Até 3 veículos estacionados simultaneamente por cliente.

## Segurança
- Senhas com **hash bcrypt**, nunca em texto puro (no original ficavam em `usuarios.txt`).
- Sessão em cookie **HttpOnly** assinado (JWT) e proteção **CSRF** (double-submit cookie).
- **Bloqueio contra força bruta**: 5 tentativas erradas bloqueiam o login por 5 minutos.
- Troca de senha ou de permissão **derruba as outras sessões** abertas.
- Cabeçalhos de segurança: CSP, X-Frame-Options, nosniff e Referrer-Policy.
- Controle de acesso por papel: um cliente não enxerga nem paga o ticket de outro.
- **Índices únicos no banco** impedem, mesmo em requisições simultâneas, duas entradas na mesma vaga ou a mesma placa estacionada duas vezes.

## Problemas do programa original corrigidos
| Original | ParkHub |
|---|---|
| Senhas em texto puro | Hash bcrypt |
| Qualquer usuário podia pagar o ticket de outro | Verificação de dono do ticket |
| `ABC-1234` e `ABC1234` eram placas diferentes | Normalização da placa |
| Dados salvos só ao escolher "Sair" | Banco SQLite transacional |
| Histórico sem tipo de veículo e sem vaga | Histórico completo |
| Vírgulas proibidas em nomes e senhas por causa do `.txt` | Sem restrição |
| f-string aninhada exigia Python 3.12+ | Compatível com Python 3.11+ |

## Arquitetura

```
parkhub/
├── backend/                  FastAPI + SQLAlchemy + SQLite
│   ├── app/
│   │   ├── main.py           app, middlewares de segurança, SPA
│   │   ├── models.py         Usuário, Veículo, Vaga, Ticket, Configuração, Auditoria
│   │   ├── security.py       bcrypt, JWT, CSRF, rate limit, permissões
│   │   ├── services/         regras de negócio (tarifas, placas, Pix, cartões, PDF, tempo real)
│   │   ├── routers/          auth, vagas, tickets, veículos, admin, público + WebSocket
│   │   └── demo.py           gerador de dados de demonstração
│   └── tests/                43 testes automatizados (pytest)
├── frontend/                 React + TypeScript + Vite + Tailwind + Framer Motion + Recharts
│   └── src/
│       ├── components/       mapa da garagem, ticket, placa, cartão 3D, UI
│       ├── pages/            landing, auth, cliente e administração
│       └── lib/              API, tempo real (WebSocket), formatação, tarifas
└── iniciar.bat
```

- **Tempo real**: cada entrada ou saída é transmitida via WebSocket, e todas as telas abertas se atualizam sozinhas (com reconexão automática).
- **API REST documentada**: <http://localhost:8000/api/docs> (Swagger).

## Testes

```bash
cd backend
.venv\Scripts\python -m pytest -q
```

Os testes cobrem regras de tarifa (tolerância, arredondamento, teto diário), placas, cartões, Pix (CRC),
o fluxo completo de estacionar e pagar, CSRF, força bruta, permissões, relatórios e exportações.
