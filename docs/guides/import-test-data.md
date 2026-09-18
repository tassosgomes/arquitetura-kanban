# Importação da massa de teste

O arquivo `docs/massa-dados.normalizada.json` contém 41 projetos, 47 atividades e
18 itens de checklist, derivados de `docs/massa-dados.txt`. Uma duplicata exata
foi removida; a menção isolada a API rematch, sem atividade, não gera projeto.
As decisões de normalização e o texto original de cada entrada estão no JSON.

Os responsáveis são bruno.dias@tasso.dev.br (12 atividades), ira.lee@tasso.dev.br
(12), luiz.gustavo@tasso.dev.br (12) e tasso.gomes@tasso.dev.br (11).
Tasso é o autor da importação. Todos precisam ter feito login no ambiente de
destino e existir como usuários ativos. O importador não cria identidades OIDC.
E-mails com mais de uma identidade ativa interrompem a carga para evitar atribuição ambígua.

## Executar

Na raiz do repositório, configure `DATABASE_URL` no `.env` com a conexão do banco
usado pelo deploy Vercel. Use uma URL completa, sem interpolação de outras
variáveis. Variáveis já exportadas no processo têm precedência sobre `.env`.
O comando imprime somente host, porta e banco para conferir o destino; não a senha.
O schema deve estar com as migrations da versão atual já aplicadas.

```bash
# Validação do JSON sem conexão com banco
npm run db:import:test -- --validate

# Simulação: somente leituras, incluindo usuários e cadastros existentes
npm run db:import:test

# Gravação explícita
npm run db:import:test -- --apply
```

`--dry-run` é equivalente ao modo padrão. `--file caminho.json` seleciona outro
arquivo compatível com o mesmo lote. Flags desconhecidas ou modos conflitantes
são rejeitados. O comando é independente do build e do seed da Vercel.

## Garantias e limites

- Schemas e casos de uso existentes validam e criam áreas, domínios, projetos,
  atividades e checklists, com auditoria e eventos realtime.
- A carga inteira usa uma transação de até cinco minutos. Qualquer falha antes
  do commit desfaz todas as alterações do lote. Nenhuma migration é necessária
  para o importador: o recibo do lote fica em `AuditEvent`, ação `test_data_imported`.
- Um bloqueio transacional impede duas cargas simultâneas. O recibo guarda
  identificador, hash e IDs das atividades na mesma transação. Reexecutar o mesmo
  JSON retorna `already-imported`; mudar um lote já importado gera erro, sem
  atualizar ou duplicar registros. O comando não é um sincronizador incremental.
- Projetos ativos de mesmo nome e mesma área são reutilizados sem alteração dos
  campos existentes. Áreas/domínios inativos e projetos com área divergente
  exigem corrigir o mapeamento. Não há deduplicação contra atividades criadas
  manualmente antes da primeira carga.
- Notificações saem apenas depois do commit. Falha de notificação gera aviso,
  preservando o resultado da importação. Atualize o navegador se necessário.
- Datas são fictícias e fixadas nos 90 dias anteriores a **2026-09-17**.
  Previsões vencidas exercitam indicadores de atraso. Projetos são assumidos
  em andamento, independentemente das atividades. Checklists começam desmarcados.
- Auditoria usa o instante real da carga. Datas fictícias permitem exercitar
  indicadores por datas, mas **não** recriam retratos históricos do Kanban ou
  transições de status anteriores à importação.

O conversor específico `node --import tsx scripts/normalize-test-data.ts YYYY-MM-DD`
imprime o JSON no stdout e permite gerar uma nova referência **antes da primeira
carga**. Ele não escreve no banco. Depois de importar, mantenha o JSON original
para que a verificação do lote permaneça estável.

## Testes isolados

Os testes de integração deste importador usam exclusivamente
`TEST_IMPORT_DATABASE_URL`, apontando para um PostgreSQL local com banco chamado
`fixture_import`, previamente migrado. Eles limpam esse banco entre cenários;
nunca usam `DATABASE_URL` como fallback. Sem essa variável, são pulados.

```bash
npx vitest run src/application/imports
```

Cobrem simulação sem escrita, concorrência, repetição, alteração de lote já
aplicado, rollback de falha intermediária, resolução de usuários, preservação de
projetos existentes e notificação após commit.
