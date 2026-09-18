# KUX-15 — Fixtures de teste visíveis nos seletores do cadastro

- **Prioridade:** P1
- **Complexidade:** `low` — higiene de dados e isolamento de teste; nenhuma mudança de UI.
- **Dependências:** nenhuma.
- **Arquivos:** `src/infrastructure/db/invariants.test.ts`,
  `src/infrastructure/db/audited-transaction.test.ts`,
  configuração de banco de teste (`docs/guides/local-development.md`).

## Problema observado

Os seletores de `/activities/new` oferecem registros que são resíduo de teste de
integração:

- **Responsável** e **Participantes** listam `T12 actor` **três vezes**, mais
  `T06 activity fixture` — quatro das nove opções.
- **Categoria** lista `T06 Domínio cb6c58ef-fb42-41e6-9634-2e9194ada89a`.

Esses rótulos só existem em `invariants.test.ts` e `audited-transaction.test.ts`, que
escrevem no mesmo banco que a aplicação de desenvolvimento lê e não limpam o que criam.
O efeito no cadastro é direto: metade das opções de "Responsável" é lixo, e um nome
repetido três vezes é indistinguível — não há como o usuário escolher "o certo".

Não é um problema de estilo de UI: é dado inválido chegando a um campo obrigatório de
um formulário que já cobra sete obrigatórios.

## Escopo

- [ ] Fazer os testes de integração limparem o que criam, ou rodarem contra um banco
      descartável isolado do banco de desenvolvimento.
- [ ] Nomear fixtures de forma determinística e sem colisão, de modo que uma execução
      repetida não acumule duplicatas (`T12 actor` ×3 é acúmulo, não coincidência).
- [ ] Limpar os registros já existentes na base de desenvolvimento/homologação.
- [ ] Documentar no guia de desenvolvimento local qual banco os testes de integração
      usam e como restaurá-lo.
- [ ] Verificar se o mesmo resíduo aparece em outros seletores (áreas, projetos) e nos
      relatórios.

## Aceite

- [ ] Nenhuma opção de "Responsável", "Participantes" ou "Categoria" contém `T06`,
      `T12`, `fixture` ou um UUID no rótulo.
- [ ] Rodar a suíte de integração duas vezes seguidas não aumenta a contagem de
      usuários nem de categorias visíveis na aplicação.
- [ ] A suíte continua passando após o isolamento.
- [ ] O guia de desenvolvimento local descreve o banco usado pelos testes.

## Como validar

1. Contar as opções de "Responsável" em `/activities/new`, rodar `npm test`, recontar.
2. Conferir `/catalogs/domains` e `/catalogs/areas` atrás dos mesmos resíduos.
3. Restaurar a base seguindo o guia e confirmar que os seletores ficam limpos.
