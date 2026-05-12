# Feature: Transferência de saldo entre grupos

## Problema

Usuários frequentemente compartilham contas em mais de um grupo com a mesma
pessoa (ex.: "Casa" e "Viagens" com o mesmo parceiro). Hoje os saldos ficam
isolados por grupo: A pode dever R$ 200 em Casa e ter R$ 150 a receber em
Viagens, sem forma de consolidar. A funcionalidade permite mover (parte ou
todo) o saldo devido entre membros de um grupo para outro grupo onde os dois
também são membros.

## Conceito

Devedor inicia uma transferência. Sistema cria um par de despesas espelhadas:
- **Origem**: lançamento que zera (ou reduz) a dívida no grupo de origem.
- **Destino**: lançamento equivalente que cria a dívida no grupo de destino.

As duas pontas ficam ligadas por um `transfer_id` compartilhado e ambas têm
`category = 'transfer'` para identificação. A transferência só "efetiva" (gera
o par) após o credor aprovar.

## Regras

1. **Elegibilidade do destino**: um grupo só aparece como destino se o pagador
   E o credor são membros ativos (`members.is_active = true`, ligados via
   `user_id`).
2. **Valor**: aceita parcial. Validado: `0 < valor ≤ |saldo| no grupo origem`.
3. **Moeda**: usa a `default_currency` de cada grupo. Quando origem ≠ destino,
   converte usando `convertAmountForDate(amount, fromCcy, toCcy, transferDate)`.
   A taxa usada é exibida no preview antes de confirmar e gravada nos dois
   lançamentos.
4. **Consentimento**: estados `pending` → `approved` (gera as despesas) ou
   `rejected` (descartada). Só o credor (contraparte) pode aprovar/rejeitar;
   só o pagador (iniciador) pode cancelar enquanto pendente.
5. **Reversão**: aprovada vira imutável. Para "desfazer", o usuário cria uma
   transferência inversa.

## Schema

Nova tabela `balance_transfers`:

```sql
CREATE TABLE balance_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  to_group_id   UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  from_member_id UUID NOT NULL REFERENCES members(id), -- devedor (iniciador)
  to_member_id   UUID NOT NULL REFERENCES members(id), -- credor (aprovador)
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  from_currency  TEXT NOT NULL,
  to_currency    TEXT NOT NULL,
  exchange_rate  NUMERIC(12,6),               -- null quando moedas iguais
  converted_amount NUMERIC(12,2),             -- amount * exchange_rate
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','rejected','cancelled')),
  note           TEXT,
  source_expense_id UUID REFERENCES expenses(id), -- preenchido após approve
  target_expense_id UUID REFERENCES expenses(id), -- preenchido após approve
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at    TIMESTAMPTZ
);
```

RLS: visível para qualquer usuário ativo em `from_group_id` ou `to_group_id`.
INSERT permitido se o usuário é o devedor (`from_member_id.user_id`).
UPDATE para `approved`/`rejected` permitido somente se o usuário é o credor
(`to_member_id.user_id`). UPDATE para `cancelled` permitido somente para o
devedor enquanto `status = 'pending'`.

## Geração das despesas espelhadas (no `approve`)

Despesa **origem** (em `from_group_id`):
- `description`: "Transferência para [nome do grupo destino]"
- `amount`: valor; `currency`: `from_currency`
- `paid_by`: `to_member_id` (credor "paga" para zerar a dívida)
- split: 100% para `from_member_id` (devedor consome o crédito)
- `category`: `transfer`

Despesa **destino** (em `to_group_id`):
- `description`: "Transferência de [nome do grupo origem]"
- `amount`: `converted_amount` (ou `amount` se mesma moeda); `currency`: `to_currency`
- `paid_by`: equivalente do `from_member_id` no grupo destino
- split: 100% para o equivalente do `to_member_id` no grupo destino
- `category`: `transfer`

Identificação do "equivalente" no destino: `members.user_id` igual.

## UI

1. Em `Dashboard` → `BalanceCard`: novo botão "Transferir saldo" quando o
   saldo do usuário com algum membro é diferente de zero E existe pelo menos
   um grupo destino elegível.
2. Modal `TransferBalanceDialog`:
   - Selecionar contraparte (pré-selecionada se só houver uma).
   - Selecionar grupo destino (lista filtrada).
   - Input de valor (pré-preenchido com saldo absoluto, editável).
   - Preview da conversão quando moedas diferem.
   - Campo opcional de nota.
   - Botão "Solicitar transferência".
3. Notificação/badge para o credor ver pendências (reaproveitar padrão de
   `invitations` se possível).
4. Tela `PendingTransfers` (ou seção em settings) com aprovar/rejeitar.
5. Para o iniciador: botão "Cancelar" enquanto pendente.

## Out of scope (v1)

- Transferência envolvendo 3+ pessoas em um mesmo lançamento.
- Histórico de transferências como tela dedicada (mostradas apenas como
  despesas com `category = transfer` por enquanto).
- Notificação por email — só in-app.

## Plano de implementação

1. Migration `007_balance_transfers.sql` (tabela + RLS + índice em
   `from_group_id`, `to_group_id`, `status`).
2. `src/types/transfer.ts` — tipos TS.
3. `src/services/transferService.ts` — `createTransfer`, `approveTransfer`
   (transação que insere as duas despesas + atualiza status), `rejectTransfer`,
   `cancelTransfer`, `listEligibleTargetGroups`, `listPendingTransfers`.
4. UI: `TransferBalanceDialog`, gatilho no `BalanceCard`, lista de pendentes.
5. i18n nos 5 locales.
6. Smoke manual: A→B em moedas iguais, A→B em moedas diferentes, parcial,
   rejeição, cancelamento.
