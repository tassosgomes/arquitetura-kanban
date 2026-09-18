# KUX-12 — Permanecer no contexto depois de criar

- **Prioridade:** P0
- **Complexidade:** `low` — muda o destino pós-criação e adiciona confirmação.
- **Dependências:** nenhuma (pré-requisito natural de KUX-11).
- **Arquivos:** `src/ui/activities/ActivityForm.tsx`, `src/app/(app)/kanban/page.tsx`.

## Problema observado

Ao criar com sucesso, `ActivityForm` executa `router.push('/activities/' + id)`
(`ActivityForm.tsx:157`). O usuário que veio do board para cadastrar uma demanda é
levado para a página de detalhe da atividade que **acabou de escrever** — a tela que
menos informação nova lhe dá naquele momento — e precisa voltar ao Kanban por conta
própria, reaplicando mentalmente o recorte de filtros em que estava.

Cadastro de atividade raramente é unitário: vem em lote, depois de uma reunião ou de
uma triagem de backlog. O fluxo atual cobra uma navegação de ida e volta por item.

Para o modo `edit` o destino faz sentido e não deve mudar. O problema é o `create`.

## Escopo

- [x] Na criação, voltar para a origem (`cancelHref` já carrega essa informação:
      `/kanban` ou `/projects/:id/activities`) em vez de ir para o detalhe.
- [x] Confirmação não-bloqueante após a criação, nomeando a atividade e a coluna em que
      ela entrou, com ações "Abrir" e "Criar outra".
- [x] "Criar outra" reabre o formulário limpo preservando as escolhas de contexto
      caras de repetir (área solicitante, projeto, categoria), zerando título e
      descrição.
- [x] Destacar por alguns segundos o card recém-criado no board, para o usuário
      localizar o resultado sem procurar.
- [x] Manter o comportamento atual do modo `edit`.
- [x] A confirmação precisa ser anunciada por leitor de tela e não pode ser o único
      canal de uma informação necessária.

## Aceite

- [x] Criar a partir de `/kanban` devolve o usuário a `/kanban`, com os filtros que
      estavam aplicados.
- [x] Criar a partir de `/projects/:id/activities` devolve à lista do projeto.
- [x] "Criar outra" permite cadastrar três atividades seguidas sem navegar.
- [x] O card novo é localizável no board sem busca manual.
- [x] Editar uma atividade continua levando ao detalhe como hoje.
- [x] A confirmação some sozinha e não bloqueia interação com o board.

## Como validar

1. Cadastrar uma atividade com filtro de área aplicado e conferir o retorno ao recorte.
2. Usar "Criar outra" três vezes e conferir o que foi preservado entre elas.
3. Editar uma atividade existente e confirmar que o destino não mudou.
