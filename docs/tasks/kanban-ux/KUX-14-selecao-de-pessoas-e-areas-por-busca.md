# KUX-14 — Seleção de pessoas e áreas por busca

- **Prioridade:** P1
- **Complexidade:** `mid` — novo padrão de controle, reutilizável em outros cadastros.
- **Dependências:** nenhuma (encaixa em KUX-13).
- **Arquivos:** `src/ui/activities/ActivityForm.tsx`, novo componente em `src/ui/forms/`,
  `src/ui/activities/activity-types.ts`.

## Problema observado

"Participantes" e "Áreas envolvidas" são grades de checkbox que renderizam **a base
inteira**. Com os 9 usuários e 9 áreas da massa de teste, cada grade já ocupa ~120px e
as duas juntas respondem por boa parte dos ~1.900px do formulário. O custo cresce
linearmente com o catálogo: numa base com 40 usuários a grade vira uma parede, e a
seleção de dois nomes exige varrer visualmente 40 rótulos.

"Responsável" tem o problema espelhado: é um `<select>` nativo com todos os usuários,
sem busca. Achar uma pessoa exige abrir e rolar.

Em nenhum dos dois controles é possível ver, de relance, **quem já está selecionado** —
a informação está espalhada entre checkboxes marcados no meio da grade.

## Escopo

- [x] Substituir as grades de checkbox por um controle de busca com seleção múltipla:
      campo de texto que filtra a lista e chips removíveis para o que já foi escolhido.
- [x] Mesmo padrão para "Responsável", em seleção única.
- [x] Busca insensível a caixa e a acento, casando nome e e-mail.
- [x] Chips mostram o rótulo legível (`formatUserLabel`) e removem com clique e com
      `Backspace`/`Delete` quando focados.
- [x] Preservar o comportamento atual de itens inativos: não oferecer inativos para
      nova seleção, manter e sinalizar os já vinculados (`ownerInactive`, `areaInactive`,
      `domainInactive` já existem no componente).
- [x] Preservar o prefill vindo do projeto (`applyPrefill`) — participantes herdados
      entram como chips já selecionados.
- [x] Manter o contrato do `FormData`: os mesmos nomes de campo e a mesma forma de lista.
- [x] Componente acessível: `combobox` com `aria-expanded`, navegação por setas,
      `Enter` seleciona, `Esc` fecha, e a contagem de selecionados anunciada.
- [x] Deixar o componente genérico o bastante para reuso nos demais cadastros que hoje
      repetem a grade de checkbox.

## Aceite

- [x] Cada um dos dois campos ocupa altura constante independentemente do tamanho do
      catálogo.
- [x] Digitar "bru" encontra "Bruno Dias"; "IRA" encontra "Ira Lee".
- [x] Os selecionados são visíveis de relance, sem rolar a lista.
- [x] Operável inteiramente por teclado, com leitor de tela anunciando seleção e
      remoção.
- [x] Herança de projeto continua preenchendo participantes na criação.
- [x] Usuário inativo já vinculado continua aparecendo e sinalizado; não aparece como
      opção nova.
- [x] Os testes existentes do formulário continuam passando sem mudança de contrato.

## Como validar

1. Selecionar dois participantes e uma área envolvida; conferir chips e altura.
2. Criar atividade de tipo Projeto e conferir os participantes herdados como chips.
3. Desativar um usuário já vinculado a uma atividade e abrir a edição dela.
4. Repetir a seleção só com teclado.
