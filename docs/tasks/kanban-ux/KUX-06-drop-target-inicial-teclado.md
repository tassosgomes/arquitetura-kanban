# KUX-06 — Corrigir alvo inicial do drag por teclado

- **Prioridade:** P2
- **Complexidade:** `mid` — depende do comportamento de colisão do `@dnd-kit` no início do drag.
- **Dependências:** nenhuma.
- **Arquivos:** `src/ui/kanban/KanbanBoard.tsx`, `src/ui/kanban/kanban-keyboard-coordinates.ts`.

## Problema observado

Reproduzido duas vezes em 18/09/2026: com foco na alça de um card do **Backlog**,
pressionar `Espaço` já destaca a coluna **"A fazer"** como alvo, e não a coluna de
origem. Consequências:

- `Espaço` → `Espaço` move o card uma coluna sem o usuário ter navegado.
- `Espaço` → `→` pula "A fazer" e cai em "Em andamento".

A lógica de `kanban-keyboard-coordinates.ts` está correta (`adjacentKanbanColumnStatus`
avança exatamente uma coluna). O defeito está no `over` inicial resolvido no
`onDragStart`, que não corresponde à coluna atual do card.

Este é o único item da iniciativa que pode **alterar dados** por engano — trate como
correção, não como ajuste cosmético.

## Escopo

- [ ] Reproduzir com teste automatizado antes de corrigir.
- [ ] Garantir que, ao pegar o card, o alvo destacado seja a coluna de origem.
- [ ] Confirmar que soltar sobre a coluna de origem não dispara mutação
      (`planKanbanStatusMove` deve resultar em no-op).
- [ ] Revisar a `collisionDetection` (`pointerWithin` → `closestCorners`) para o caso
      do drag iniciado por teclado, em que não há ponteiro.
- [ ] Verificar o comportamento nas colunas das pontas (Backlog e Concluído): `←` no
      primeiro e `→` no último não devem sair do board.

## Aceite

- [ ] `Espaço` na alça destaca a coluna atual do card.
- [ ] `Espaço` → `Espaço` mantém o card onde estava e não gera evento de auditoria.
- [ ] `→` move exatamente uma coluna por vez, em todas as colunas.
- [ ] `Escape` continua cancelando e devolvendo o card à origem.
- [ ] Os anúncios de leitor de tela (`kanbanAnnouncements`) refletem a coluna correta
      em `onDragStart` e `onDragOver`.

## Como validar

1. Teste automatizado cobrindo pegar/soltar sem navegar, e um passo por seta.
2. Verificação manual com leitor de tela conferindo o anúncio inicial.
3. Conferir na auditoria que o no-op não gerou registro de mudança de status.
