# KUX-08 — Card arrastável e alvo de toque adequado

- **Prioridade:** P2
- **Complexidade:** `low`
- **Dependências:** KUX-01 (o scroll por coluna muda o contexto do arraste).
- **Arquivos:** `src/ui/kanban/KanbanCard.tsx`.

## Problema observado

A afordância de arrastar é apenas a alça `drag_indicator`: `opacity-40` em `sm:`,
16px de ícone e cerca de 24×24px de área clicável — abaixo do mínimo de 44px para
toque. O card em si não é arrastável, então quem tenta arrastar pelo corpo do card
não obtém resposta e conclui que o board não move por drag.

Em telas de toque, o ícone fica opaco por padrão, mas nada comunica que aquilo é uma alça.

## Escopo

- [ ] Tornar o card inteiro arrastável, iniciando o drag em qualquer área que não seja
      link, botão ou o select de mover.
- [ ] Manter a alça como indicação visual, com opacidade maior em repouso e área de
      toque de ao menos 44×44px.
- [ ] Preservar a `activationConstraint` de 8px, para clique no card continuar abrindo
      o detalhe sem disparar arraste acidental.
- [ ] `cursor: grab` / `grabbing` sobre toda a superfície arrastável.
- [ ] Conferir que arrastar não entra em conflito com o scroll vertical da coluna em
      toque (`touch-action`).

## Aceite

- [ ] Arrastar pelo corpo do card move a atividade entre colunas.
- [ ] Clicar (sem mover) no card continua abrindo o detalhe da atividade.
- [ ] O alvo de toque da alça atinge 44×44px.
- [ ] Em dispositivo de toque, rolar a coluna verticalmente não inicia um arraste.
- [ ] A rota por teclado (foco na alça + Espaço) permanece intacta.

## Como validar

1. Arrastar pelo corpo e pela alça em 1440×900.
2. Clicar no título e confirmar navegação para o detalhe.
3. Em 390×844, rolar a coluna e depois arrastar um card.
