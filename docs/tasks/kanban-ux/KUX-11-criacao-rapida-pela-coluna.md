# KUX-11 — Criação rápida pela coluna do board

- **Prioridade:** P0
- **Complexidade:** `mid` — novo componente de criação e reuso da action existente.
- **Dependências:** KUX-10 (a validação precisa devolver tudo de uma vez antes de
  espalhar pontos de criação); combina com KUX-12.
- **Arquivos:** `src/ui/kanban/KanbanBoard.tsx`, novo componente em `src/ui/kanban/`,
  `src/app/actions/activities.ts`.

## Problema observado

Registrar uma atividade custa hoje: sair do board, navegar para `/activities/new`,
percorrer 16 campos em ~1.900px de altura, submeter, corrigir duas rodadas de erro
(KUX-10), ser redirecionado para `/activities/:id` (KUX-12) e voltar ao board a pé.

Sete desses campos são obrigatórios, e quatro deles — Categoria, Natureza, Papel da
Arquitetura, Esforço — são **taxonomia de classificação**, não captura. Quem está numa
reunião anotando uma demanda ainda não sabe se ela é "Estratégica" ou "Operacional";
sabe o título e para quem vai. O formulário exige classificar no instante em que o
usuário só quer capturar, e é aí que o fluxo trava.

O board já carrega contexto suficiente para dispensar boa parte disso: a coluna define
o `status`, o usuário logado é o responsável provável, e o tipo default é Ad hoc.

## Escopo

- [x] Afordância de criação no header de cada coluna do board (ex.: `⊕`), com rótulo
      acessível indicando a coluna (`"Nova atividade em Backlog"`).
- [x] Formulário inline no topo da coluna, com o mínimo para um registro válido:
      título, responsável, área solicitante e categoria.
- [x] `status` vem da coluna acionada; `type = AD_HOC`; `priority = MEDIUM`;
      responsável pré-preenchido com o usuário logado — todos alteráveis.
- [x] `Enter` cria; `Esc` cancela e devolve o foco à afordância que abriu.
- [x] Segunda ação "Criar e detalhar", que cria e leva ao formulário completo da
      atividade recém-criada.
- [x] Reusar `createActivityAction` e as mesmas regras de auditoria — sem caminho
      paralelo de escrita, sem contornar validação.
- [x] Card criado aparece na coluna sem recarregar a página, com o mesmo tratamento
      otimista/rollback já usado em `persistMove`.
- [x] Deixar explícito no formulário que os campos de classificação ficam pendentes e
      onde completá-los.

## Aceite

- [x] Criar uma atividade a partir do board não navega para fora de `/kanban`.
- [x] A atividade criada nasce na coluna em que o `⊕` foi acionado.
- [x] Erro de servidor no envio mantém o que o usuário digitou, sem perder o texto.
- [x] Todo o fluxo é operável só com teclado, do `⊕` ao card criado.
- [x] Atividade criada por esse caminho é indistinguível, no banco e na auditoria, de
      uma criada por `/activities/new`.
- [x] Filtros ativos no board não são perdidos ao criar.
- [x] Se a atividade criada não corresponder ao filtro vigente, o usuário é avisado em
      vez de o card sumir em silêncio.

## Como validar

1. Criar três atividades seguidas em colunas diferentes, cronometrando contra o fluxo
   atual de `/activities/new`.
2. Criar com "Somente minhas" ativo e com um filtro de área que exclua a nova atividade.
3. Repetir o fluxo inteiro sem mouse.
4. Conferir o registro de auditoria da atividade criada pelo board.
