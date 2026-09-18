# KUX-07 — Busca por título no board

- **Prioridade:** P2
- **Complexidade:** `mid` — novo parâmetro de consulta atravessando filtro e repositório.
- **Dependências:** KUX-04 (o termo deve aparecer como chip junto dos demais filtros).
- **Arquivos:** `src/ui/kanban/KanbanFilters.tsx`, `src/app/(app)/kanban/page.tsx`,
  filtro de listagem de atividades e o repositório correspondente.

## Problema observado

O board tem 47 atividades e 11 filtros de taxonomia, mas **nenhum campo de texto**.
Para achar "aquela atividade do MFA" é preciso saber antes a área, o projeto ou o
responsável dela. Busca por título é o filtro mais usado num Kanban e é o único
ausente.

## Escopo

- [x] Campo de busca por título na barra de filtros, sempre visível (não atrás do
      "Expandir").
- [x] Termo persistido na URL como os demais filtros, para compartilhamento e reload.
- [x] Busca case-insensitive e sem sensibilidade a acento, combinando com os filtros
      já aplicados (não os substitui).
- [x] Aplicar com debounce, sem exigir Enter, mantendo o foco no campo.
- [x] Definir e documentar o escopo do termo: apenas título, ou título + descrição.
- [x] Estado vazio específico: "Nenhuma atividade corresponde a «termo»", com ação de
      limpar apenas a busca.
- [x] Filtrar no servidor, junto da consulta existente — não filtrar no cliente sobre
      um recorte já paginado.

## Aceite

- [x] Digitar "MFA" reduz o board às atividades com o termo no título, preservando os
      demais filtros.
- [x] Acento e caixa não alteram o resultado ("relatorio" encontra "Relatório").
- [x] A URL resultante, colada em outra aba, reproduz o mesmo recorte.
- [x] Limpar a busca restaura o recorte anterior sem perder os outros filtros.
- [x] O termo aparece como chip removível (KUX-04) e entra na contagem de filtros ativos.
- [x] O campo tem rótulo acessível e é alcançável por teclado.

## Como validar

1. Buscar "MFA", "dashboard" e "relatorio" sobre a massa de teste.
2. Combinar busca + "Somente minhas" e conferir a interseção.
3. Conferir o estado vazio com um termo inexistente.
