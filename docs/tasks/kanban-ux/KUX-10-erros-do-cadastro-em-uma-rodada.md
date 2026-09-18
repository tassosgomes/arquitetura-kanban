# KUX-10 — Erros do cadastro em uma única rodada

- **Prioridade:** P0
- **Complexidade:** `mid` — atravessa schema, camada de aplicação e formulário.
- **Dependências:** nenhuma.
- **Arquivos:** `src/application/activities/schemas.ts`,
  `src/application/activities/assert-associations.ts`,
  `src/ui/activities/ActivityForm.tsx`, `src/ui/forms/FormField.tsx`.

## Problema observado

Submetendo `/activities/new` vazio, o formulário devolve **dois** erros —
`"Informe um título."` e `"Identificador inválido."` — e fica em silêncio sobre Área
solicitante, Natureza, Papel da Arquitetura e Responsável, que também estão vazios.
Só depois de corrigir os dois primeiros e submeter de novo é que os outros quatro
aparecem. São duas rodadas de erro para um formulário que o usuário preencheu uma vez.

A causa é a divisão da validação em duas camadas. Em `createActivityObject`, esses
quatro campos usam as variantes `optional*` (`optionalUuidSchema`,
`optionalNatureSchema`, `optionalArchitectureRoleSchema`), porque podem ser **herdados
do projeto**; a obrigatoriedade só é cobrada depois, em `requireInheritedFields()`
(`assert-associations.ts:172`), que roda no comando — ou seja, nunca no mesmo passe do
Zod. As variantes estritas com mensagem correta (`natureSchema`,
`architectureRoleSchema`) já existem no arquivo e não são usadas na criação.

Dois agravantes no mesmo fluxo:

- `"Identificador inválido."` é o erro de `catalogIdSchema` (`z.string().uuid()`) caindo
  sobre `domainId` vazio. O usuário não digitou identificador nenhum — ele não escolheu
  uma categoria. A mensagem descreve a representação interna, não o que ele vê.
- O formulário tem ~1.900px de altura. Os erros aparecem ancorados nos campos, acima da
  dobra, e **a página não rola até eles**: o usuário clica "Criar atividade", nada muda
  na viewport e ele não tem indício de que houve falha.

## Escopo

- [ ] Fazer com que uma única submissão retorne **todos** os campos inválidos, sem
      regredir a herança de projeto: quando `type = PROJECT` com projeto escolhido, os
      quatro campos continuam podendo vir do projeto; quando `type = AD_HOC`, são
      obrigatórios e devem falhar já na primeira validação.
- [ ] Reaproveitar as mensagens estritas já existentes (`"Selecione a natureza."`,
      `"Selecione o papel da Arquitetura."`) em vez de duplicá-las.
- [ ] Substituir `"Identificador inválido."` por mensagem de domínio do usuário quando o
      campo está vazio (`"Selecione uma categoria."`, `"Selecione a área solicitante."`),
      preservando a mensagem técnica para valor presente e malformado.
- [ ] Após submit com erro: rolar até o primeiro campo inválido e mover o foco para ele.
- [ ] Resumo dos erros no topo do formulário, com âncoras clicáveis para cada campo,
      anunciado por leitor de tela (`role="alert"` / região com `aria-live`).
- [ ] Corrigir a ligação de acessibilidade dos campos: hoje o formulário tem **zero**
      `aria-describedby` e um único `aria-invalid` (no título), embora `FormField` já
      renderize o erro com `id` previsível e documente esse contrato no próprio JSDoc.
      Aplicar `aria-invalid` e `aria-describedby` em todos os controles com erro.

## Aceite

- [ ] Submeter o formulário vazio marca de uma vez os sete campos obrigatórios.
- [ ] Nenhuma mensagem exibida ao usuário contém o termo "identificador".
- [ ] Após submit inválido, o primeiro campo com erro está visível e com foco, sem o
      usuário rolar.
- [ ] Criar atividade de tipo Projeto com Natureza/Papel/Área/Responsável em branco
      continua funcionando quando o projeto fornece esses valores.
- [ ] Leitor de tela anuncia a falha e associa cada mensagem ao seu campo.
- [ ] Os testes existentes de `createActivity` e do schema continuam passando.

## Como validar

1. `/activities/new`, submeter vazio, contar os erros exibidos numa única rodada.
2. Repetir com Tipo = Projeto e um projeto que herda os quatro campos; deve criar.
3. Percorrer o formulário com leitor de tela após um submit inválido.
