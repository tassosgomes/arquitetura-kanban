# KUX-01 — Altura fixa do board, scroll por coluna e header fixo

- **Prioridade:** P0
- **Complexidade:** `low` — mudança de layout, sem lógica nova.
- **Dependências:** nenhuma.
- **Arquivos:** `src/ui/kanban/KanbanBoard.tsx`.

## Problema observado

Backlog com 25 cards faz a página passar de ~4.500px. Como não há altura fixa nem
scroll por coluna, rolar até o fim do Backlog deixa as outras cinco colunas fora da
tela e o cabeçalho das colunas some (não é `sticky`). A leitura lado a lado — a razão
de existir de um board — se perde a partir de ~6 cards numa coluna.

Efeito colateral no drag: arrastar do fim do Backlog até "Concluído" exige rolar
milhares de pixels com o card na mão.

## Escopo

- [ ] Dar ao contêiner do board altura de viewport (`h-[calc(100dvh-<offset do header>)]`),
      de modo que a página em si não role.
- [ ] `<section>` da coluna com `max-h-full` e a `<ul>` de cards com `overflow-y-auto`.
- [ ] `<header>` da coluna com `sticky top-0` e fundo opaco, para o nome e a contagem
      ficarem visíveis durante o scroll interno.
- [ ] Preservar o scroll horizontal existente do board (`overflow-x-auto`) para telas
      estreitas — as duas direções coexistem.
- [ ] Verificar que o auto-scroll do `@dnd-kit` funciona dentro da coluna com scroll
      próprio ao arrastar um card para perto da borda.

## Aceite

- [ ] Com 25 cards no Backlog, as seis colunas continuam visíveis simultaneamente e
      a página não cresce verticalmente.
- [ ] Rolando dentro do Backlog até o último card, o cabeçalho "Backlog 25" permanece
      visível e as demais colunas permanecem no lugar.
- [ ] Arrastar um card do fim do Backlog para outra coluna não exige rolar a página.
- [ ] Em viewport estreito o board continua rolando horizontalmente, sem scroll duplo
      acidental nem corte de cards.
- [ ] Coluna vazia continua exibindo o estado "Nenhuma atividade nesta coluna." com
      altura mínima coerente.

## Como validar

1. `/kanban` sem filtros, viewport 1440×900: conferir as seis colunas na primeira dobra.
2. Rolar dentro do Backlog até o fim e conferir header fixo.
3. Arrastar o último card do Backlog para "Concluído".
4. Repetir em 390×844.
