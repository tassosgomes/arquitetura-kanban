# KUX-03 — "Mover para" sob demanda

- **Prioridade:** P0
- **Complexidade:** `low` — visibilidade condicional, sem mudar o mecanismo de mover.
- **Dependências:** nenhuma (combina bem com KUX-05).
- **Arquivos:** `src/ui/kanban/KanbanCard.tsx`.

## Problema observado

O `<select>` "Mover para" é renderizado aberto em **todos** os cards do board — 47 na
massa de teste — e ocupa ~45px, cerca de 35% da altura útil de cada card. É custo
visual permanente por uma ação que o usuário executa poucas vezes ao dia, e é
redundante com a alça de arrastar e com o detalhe da atividade.

Ele **não pode simplesmente sumir**: é a alternativa acessível ao drag and drop
exigida pelo aceite de T18.

## Escopo

- [x] Ocultar visualmente o bloco "Mover para" no estado de repouso do card.
- [x] Revelar em `:hover`, em `:focus-within` e enquanto o card estiver com foco de
      teclado — mantendo o `<select>` sempre no DOM (`sr-only`, não `display:none`,
      não `hidden`) para leitor de tela e navegação por Tab.
- [x] Garantir que revelar o controle não altere a altura do card a ponto de deslocar
      os cards vizinhos (reservar espaço ou sobrepor).
- [x] Manter `aria-label` atual (`Mover <título> para`) e a `key` que reseta o select
      após cada movimentação.
- [x] Não aplicar aos cards da lista de canceladas (que já não têm o controle).

## Aceite

- [x] Em repouso, o card não exibe o rótulo "Mover para" nem a caixa de seleção.
- [x] Navegando só por teclado, é possível alcançar e operar o "Mover para" de qualquer
      card, e ele fica visível quando recebe foco.
- [x] Leitor de tela continua anunciando o controle e suas opções.
- [x] Mover por esse controle continua persistindo o status, com o mesmo tratamento de
      erro e rollback de hoje.
- [ ] A altura média do card cai de forma perceptível (mais cards por dobra).
- [x] Em dispositivo sem hover (toque), existe um caminho explícito para o controle —
      toque no card/afordância dedicada, nunca um controle inalcançável.

## Como validar

1. Conferir densidade antes/depois na mesma viewport (quantos cards cabem no Backlog).
2. Percorrer o board só com Tab/Shift+Tab e mover um card pelo select.
3. Repetir em viewport de toque (390×844) e confirmar acesso ao controle.
