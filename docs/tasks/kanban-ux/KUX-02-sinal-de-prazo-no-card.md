# KUX-02 — Sinal de prazo no card

- **Prioridade:** P0
- **Complexidade:** `low` — a regra de classificação já existe e é testada.
- **Dependências:** nenhuma.
- **Arquivos:** `src/application/activities/kanban-board.ts`, `src/ui/kanban/KanbanCard.tsx`.
- **Reuso:** `classifyDeadlineStatus()` e `DEADLINE_STATUS_LABELS` em
  `src/application/reports/deadline-status.ts` (usados hoje pelo Book executivo).

## Problema observado

Em 18/09/2026 o board exibia cards com previsão 07/09, 08/09, 17/08 e 22/07 — todos
vencidos — com exatamente a mesma cor de uma data futura. A data é renderizada em
`text-outline`, o tom mais apagado da paleta: o dado mais crítico do card é o menos
visível. Não há como identificar atraso sem abrir atividade por atividade.

A regra de negócio para isso já está pronta e não precisa ser reescrita.

## Escopo

- [ ] Incluir o estado de prazo no `toKanbanCard()`, derivado de
      `classifyDeadlineStatus({ status, expectedEndDate, completedDate, today })`.
- [ ] Definir "hoje" pelo calendário civil do projeto (America/Sao_Paulo), conforme
      a decisão 2 de `docs/tasks.md`; não usar `new Date()` do cliente direto.
- [ ] Renderizar o estado no card com cor e rótulo:
      `OVERDUE` (destaque negativo, com dias de atraso), `vence hoje` (atenção),
      `NO_FORECAST` (neutro, "sem previsão"), demais estados no tom neutro atual.
- [ ] Marcador de borda esquerda no card para `OVERDUE`, para leitura do board inteiro
      num relance.
- [ ] Não depender só de cor: manter texto/ícone junto do sinal (contraste AA).

## Aceite

- [ ] Card com previsão anterior a hoje e não concluído exibe atraso com os dias.
- [ ] Card com previsão futura mantém a exibição neutra atual.
- [ ] Card sem previsão exibe "sem previsão" e não é tratado como atrasado.
- [ ] Card concluído não aparece como atrasado no board, mesmo com previsão vencida.
- [ ] O cálculo respeita o fuso do projeto na virada do dia (testar 23:30 e 00:30).
- [ ] A distinção é perceptível sem depender de cor (texto/ícone presentes).

## Como validar

1. `/kanban` na massa de teste e conferir os cards de 07/09 e 22/07 marcados como atraso.
2. Comparar a classificação de uma mesma atividade entre o board e o Book executivo —
   devem coincidir.
3. Teste unitário do mapper cobrindo: vencida, vence hoje, futura, sem previsão, concluída.
