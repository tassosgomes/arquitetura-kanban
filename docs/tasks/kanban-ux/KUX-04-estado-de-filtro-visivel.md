# KUX-04 — Estado de filtro visível e aplicação imediata

- **Prioridade:** P1
- **Complexidade:** `mid` — envolve resumo dos filtros ativos e revisão do fluxo de submit.
- **Dependências:** nenhuma.
- **Arquivos:** `src/ui/kanban/KanbanFilters.tsx`, `src/app/(app)/kanban/page.tsx`.

## Problema observado

Com `mine=1` aplicado, o board caiu de 47 para 11 atividades e a barra recolhida
mostrava apenas os presets (nenhum marcado) e o link "Limpar filtros". Nada indica
**quais** filtros estão ativos. Com 11 dimensões combináveis, é fácil esquecer um
filtro ligado e concluir que "a equipe não tem nada em andamento".

Além disso, o botão "Aplicar filtros" fica no canto oposto aos selects: mexer em um
filtro exige atravessar a tela para confirmar.

## Escopo

- [x] Renderizar chips dos filtros ativos na barra, visíveis mesmo com o painel
      recolhido, com o rótulo legível da dimensão e do valor
      (ex.: `Área: Arrecadação`, `Somente minhas`).
- [x] Cada chip remove **apenas** aquele filtro ao ser acionado (navega para a URL sem
      aquele parâmetro), operável por teclado.
- [x] "Limpar filtros" passa a indicar a quantidade (`Limpar tudo (2)`).
- [x] Trocar o contador `"11 atividades no recorte"` por uma forma com denominador
      (`"11 de 47 atividades"`), para o recorte nunca ser confundido com o total.
- [x] Aplicar o filtro na mudança de cada controle, dispensando o botão "Aplicar
      filtros"; se o botão for mantido por causa do período personalizado, deixar
      explícito que só aquele campo exige confirmação.
- [x] Parâmetro de filtro inválido na URL (ex.: `?priority=ALTA`, que hoje é
      descartado em silêncio) deve ser sinalizado ao usuário, não ignorado mudamente.

## Aceite

- [x] Com qualquer filtro ativo e o painel recolhido, os chips mostram exatamente o que
      está aplicado.
- [x] Remover um chip mantém os demais filtros intactos.
- [x] O contador exibe recorte e total.
- [ ] Alterar um select reflete no board sem clique adicional.
- [x] Recarregar a página preserva filtros e chips (estado continua vindo da URL).
- [x] URL com valor inválido não silencia: o usuário entende que aquele filtro não foi
      aplicado.
- [x] Preset ativo continua marcado com `aria-current` quando a combinação corresponder.

## Como validar

1. Aplicar "Somente minhas" + "Área", recolher o painel, conferir os dois chips e o "de 47".
2. Remover um chip e conferir que o outro permanece.
3. Abrir `/kanban?priority=ALTA` e conferir a sinalização do valor inválido.
