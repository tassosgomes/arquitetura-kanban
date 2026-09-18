# KUX-09 — Badge de prioridade só na exceção

- **Prioridade:** P3
- **Complexidade:** `low`
- **Dependências:** nenhuma.
- **Arquivos:** `src/ui/kanban/KanbanCard.tsx`, `src/ui/activities/priority-tone.ts`.

## Problema observado

Praticamente todo card da massa de teste é "Média". O badge de prioridade é o elemento
mais colorido e mais destacado do canto superior direito do card, mas repetido em quase
100% dos cards ele não diferencia nada — vira ruído que compete com o título por
atenção. Ele só carrega informação quando é **Alta** ou **Crítica**.

Mesma lógica de KUX-02: reservar saturação para a exceção.

## Escopo

- [x] Exibir o badge com destaque apenas para `HIGH` e `CRITICAL`.
- [x] Representar `MEDIUM` e `LOW` de forma discreta (marcador neutro) ou omitir do card.
- [x] Se omitido, garantir que a prioridade continue acessível — no detalhe da atividade
      e como texto para leitor de tela no card.
- [x] Revisar os tons em `PRIORITY_TONE` para que `CRITICAL` se distinga de `HIGH` nos
      dois temas.
- [x] Não usar somente cor para distinguir prioridade (rótulo ou ícone presente).

## Aceite

- [ ] Num board majoritariamente "Média", os cards Alta/Crítica saltam à vista.
- [x] A informação de prioridade não é perdida para quem usa leitor de tela.
- [ ] Contraste AA mantido em tema claro e escuro.
- [ ] A mudança não conflita com o sinal de prazo de KUX-02 (dois destaques no mesmo
      card devem continuar legíveis, não competir).

## Como validar

1. `/kanban` sem filtros: localizar visualmente os cards de prioridade alta em menos de
   dois segundos.
2. Conferir um card Alta **e** atrasado, para validar a convivência dos dois sinais.
