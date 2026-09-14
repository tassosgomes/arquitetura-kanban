# Plano de execução do MVP

Base: [PRD v1.0](prd.md) e [Tech Spec v1.0](techspec.md).

Este backlog divide o projeto em entregas incrementais. Cada task pode virar uma issue; seus critérios de aceite delimitam a conclusão. Todas começam pendentes. Dependências indicam tasks que precisam estar concluídas antes da implementação final; levantamento e desenho podem começar antes.

O repositório contém apenas documentação neste momento. O plano inclui a fundação da aplicação, além das funcionalidades de produto. Não há estimativas de prazo: elas devem ser feitas após as decisões iniciais e a primeira entrega funcional.

## Análise dos documentos

- O PRD define 11 épicos e 19 histórias, com Atividade como unidade do único Kanban. As entregas abaixo preservam esse modelo e evitam transformar períodos ou checklists em workflows separados.
- A Tech Spec define Next.js, PostgreSQL, OIDC independente de provedor, Logto em desenvolvimento/homologação, CyberArk em produção, Docker Compose, Vercel e Kubernetes. O PRD acrescenta Tailwind CSS e GitHub Actions.
- A Tech Spec também exige optimistic locking, SSE com LISTEN/NOTIFY, replay persistido por Last-Event-ID, retenção de sete dias e CSV UTF-8 com BOM. Esses itens fazem parte deste backlog, embora alguns não apareçam nas histórias do PRD.
- Apesar do status “Fechado para Desenvolvimento”, o arquivo técnico não detalha ORM, modelo relacional completo, contratos de aplicação, biblioteca de autenticação, estratégia de testes, nem os ADRs anteriores ao ADR-012. Esses detalhes precisam ser consolidados sem presumir decisões ausentes.
- Temporalidade e histórico exigem atenção: consultar o estado atual das atividades não basta para afirmar qual era a situação do trabalho em um período passado.

## Decisões aprovadas em 10/09/2026

Estas decisões foram aprovadas pelo responsável pelo projeto após a análise do PRD e da Tech Spec. Complementam os documentos de origem e orientam as tasks; a aprovação das regras não significa que a implementação esteja concluída.

| # | Tema | Decisão aprovada | Tasks |
| --- | --- | --- | --- |
| 1 | Base técnica | Next.js App Router com TypeScript, Prisma, serviços de aplicação compartilhados, Server Actions para mutações e Route Handlers para autenticação, CSV e SSE. Bibliotecas específicas e versões serão registradas em T01. | T01, T05, T06 |
| 2 | Calendário | Fuso America/Sao_Paulo; semana de segunda a domingo; dias inicial e final inclusivos. Auditoria armazena instantes; datas de planejamento representam dias do calendário. | T02, T19 |
| 3 | Execução e datas automáticas | Regra válida para atividades ad hoc e vinculadas a projetos: primeira entrada em Em andamento preenche início quando ausente; concluir preenche conclusão. Retornos a Em andamento preservam o início existente. Atividade aberta possui intervalo até hoje; concluída até sua conclusão; cancelada até seu cancelamento. Previsão não encerra execução. Sem início fica fora do recorte de execução e acessível em Todas e Sem planejamento. | T02, T13, T14, T19 |
| 4 | Retrato histórico | Kanban mostra estado atual. Dashboard e relatórios mostram a situação no encerramento do período, limitada a hoje, reconstruindo status e dimensões históricas relevantes a partir da auditoria. Mudanças posteriores não substituem o retrato anterior. | T02, T06, T12, T25–T27 |
| 5 | Reabertura e conclusão | Concluídas podem ser reabertas: limpar conclusão atual, preservar início e eventos anteriores. Contar cada atividade uma vez na população do período; ela só conta como concluída se estiver concluída no fechamento consultado. Cancelado é terminal. | T02, T14, T25 |
| 6 | Correções retroativas | Permitir correções de datas com auditoria e recálculo do intervalo de execução. Uma correção pode alterar relatório passado; manter autoria e momento da correção. Não criar versões imutáveis dos relatórios no MVP. | T02, T12, T19, T27 |
| 7 | Áreas e projetos atendidos | Projetos distintos das atividades selecionadas; áreas distintas considerando solicitante e envolvidas. Uma atividade pode aparecer em várias áreas na distribuição, com explicação na tela, sem multiplicar o total de atividades. | T02, T25, T26 |
| 8 | Herança do projeto | Sugerir participantes, natureza, papel e área responsável como solicitante ao criar atividade vinculada. Iniciar o responsável individual com o usuário criador, permitir alteração e não sincronizar mudanças posteriores do projeto. | T11, T13 |
| 9 | Ciclo de vida | Inativar áreas e domínios; cancelar projetos e atividades em vez de excluir. Preservar referências antigas. Impedir nomes ativos duplicados ignorando caixa e espaços nas extremidades. | T06, T09, T11, T14 |
| 10 | Autorização | Restringir acesso no IdP e conferir isActive no servidor. Provisionar usuário no primeiro login autorizado por issuer + subject. Inativos preservam histórico, não recebem novas atribuições e exigem reatribuição explícita das atividades abertas. | T03, T07, T09, T13 |
| 11 | Realtime | Validar SSE e LISTEN/NOTIFY nos runtimes antes de fechar hospedagem do hub. Preservar SSE, replay e retenção de sete dias; documentar eventual ajuste de infraestrutura com base na prova técnica. | T04, T21, T29 |
| 12 | Adoção da planilha | Cadastrar áreas, projetos e atividades abertas antes da adoção; trazer concluídas do ano corrente quando necessário para relatório anual completo. Carga assistida, sem importador genérico. | T30 |

### Exemplos do retrato histórico

- Atividade entra em Em andamento em 25/08 e é concluída em 18/09: aparece em agosto como Em andamento e em setembro como Concluído, se não houver outras mudanças até cada fechamento.
- Atividade concluída em agosto e reaberta em setembro: o retrato de agosto continua Concluído; o de setembro reflete o status no fechamento de setembro. Limpar a conclusão atual não apaga a conclusão histórica.
- Responsável alterado de Ana para Carlos em setembro: o retrato de agosto usa Ana nos filtros e agrupamentos. A mesma regra vale para as demais dimensões necessárias aos indicadores.
- Uma correção retroativa de data é uma exceção explícita ao retrato: pode corrigir a população de um relatório anterior, mas permanece auditada. O relatório é reconstruído, não um arquivo congelado.

### Detalhamento técnico ainda necessário

T01 deverá escolher bibliotecas OIDC, DnD e Markdown, ferramentas de teste, versões e estratégia de branches dentro da arquitetura aprovada. T02 deverá converter as regras aprovadas em contratos e exemplos de borda, incluindo conclusão direta sem início informado e validação de datas corrigidas. Esses casos não autorizam preencher silenciosamente um início fictício. T04 deverá produzir a evidência de viabilidade do realtime. Não é necessário reabrir as decisões de produto já aprovadas para realizar esse detalhamento.

## Complexidade para alocação de modelos

A classificação estima a dificuldade de raciocínio e implementação da task completa, considerando suas dependências concluídas. Não representa prazo, prioridade ou tempo de espera por acesso externo. Os níveis são categorias do backlog, não nomes de modelos nem configurações de esforço de raciocínio de uma ferramenta.

| Nível | Critério | Perfil de modelo para alocação |
| --- | --- | --- |
| `low` | Escopo delimitado, padrões e contratos prontos, pouca decisão transversal. | Modelo de execução de tarefas simples, com contexto das dependências e critérios de aceite. |
| `mid` | Integração de componentes, múltiplas validações e tratamento de falhas conhecidas. | Modelo com boa capacidade de implementação e depuração em vários arquivos. |
| `high` | Arquitetura, segurança, integridade histórica, concorrência ou investigação com incerteza elevada. | Modelo com maior capacidade de raciocínio e análise de interações entre sistemas. |

A classificação se aplica ao escopo inteiro: produzir apenas o guia de uma task `high` não conclui sua implementação ou validação. Se surgirem decisões estruturais numa task `low`/`mid`, revisar a classificação ou separar o novo escopo. Todos os níveis mantêm os mesmos critérios de qualidade e aceite.

### Visão rápida

| Complexidade | Quantidade | Tasks |
| --- | --- | --- |
| `low` | 4 | T08, T09, T16, T24 |
| `mid` | 12 | T05, T10, T11, T13, T15, T17, T18, T20, T23, T26, T27, T30 |
| `high` | 14 | T01, T02, T03, T04, T06, T07, T12, T14, T19, T21, T22, T25, T28, T29 |

## Entregas e ordem sugerida

| Entrega | Resultado demonstrável | Tasks |
| --- | --- | --- |
| M0 — Contratos definidos | Regras críticas e abordagem técnica documentadas; riscos de acesso e realtime investigados | T01–T04 |
| M1 — Acesso e base utilizável | Ambiente reproduzível, login real e cadastros em homologação | T05–T10 |
| M2 — Trabalho registrado | Projetos, atividades, checklists, auditoria e proteção contra edição concorrente | T11–T16 |
| M3 — Operação no Kanban | Board único, filtros temporais e atualização entre sessões | T17–T22 |
| M4 — Evidências e gestão | Entregas de Valor, página completa do projeto, dashboard e relatório exportável | T23–T27 |
| M5 — Adoção | Produção validada e rotina dos cinco usuários homologada | T28–T30 |

A ordem não obriga execução estritamente sequencial. Após M2, Entregas de Valor podem avançar junto do Kanban. Infraestrutura de produção pode ser preparada assim que seus contratos estiverem definidos. M0 não deve se tornar um redesenho amplo: registrar apenas decisões necessárias para implementar o MVP.

## M0 — Contratos e riscos

### T01 — Consolidar arquitetura e ferramentas

- **Complexidade:** `high` — Decisões transversais de arquitetura e ferramentas orientam toda a implementação.
- **Referência:** PRD §§26–27; Tech Spec, Arquitetura Consolidada.
- **Dependências:** nenhuma.
- **Escopo:** documentar a arquitetura aprovada (App Router, TypeScript, Prisma, Server Actions e Route Handlers), organização de código, acesso a dados, migrations, contratos de leitura/mutação, validação, tratamento de erros, autenticação, UI, DnD, Markdown, testes e branches. Registrar versões escolhidas durante a implementação.
- **Aceite:** decisões registradas na documentação técnica; separação entre apresentação, serviços de aplicação e infraestrutura; domínio sem dependência de SDK/claims de IdP; comandos e verificações esperados definidos.

### T02 — Especificar regras aprovadas de workflow, temporalidade e indicadores

- **Complexidade:** `high` — Exige consistência entre retrato histórico, reaberturas, correções de datas e contagens.
- **Referência:** PRD §§12, 15–19, 22 e 28.
- **Dependências:** nenhuma.
- **Escopo:** formalizar as decisões aprovadas sobre datas, retrato histórico, contagens, herança de projeto e ciclo de vida de cadastros, sem reabrir sua aprovação. Especificar indicadores e filtros com exemplos de entrada e resultado esperado.
- **Aceite:** exemplos cobrem atividade de agosto a setembro, sem início, aberta, concluída, reaberta e cancelada; distinguem interseção de execução de situação histórica; definem datas retroativas, dimensões históricas, projetos e áreas distintos, esforço não informado e cancelados nos totais. Cancelado permanece terminal conforme RN-10.

### T03 — Definir contrato de identidade e autorização

- **Complexidade:** `high` — Define fronteiras de segurança, identidade persistente e autorização entre provedores.
- **Referência:** EP-01 / US-01; Tech Spec, OIDC, Claim Mapping e Autorização.
- **Dependências:** T01.
- **Escopo:** definir configuração, identidade normalizada, provisionamento e política de acesso. Levantar issuer, aplicações OIDC, callbacks e claims necessários por ambiente, sem registrar segredos no repositório.
- **Guia obrigatório:** Gerar `docs/guides/oidc.md` com seções separadas para Logto DEV/TEST e CyberArk PROD: criação das aplicações, issuer/discovery, callbacks e logout conforme rotas implementadas, scopes, claims, restrição de usuários, variáveis, local de configuração de segredos e roteiro de validação. O responsável pelo projeto providenciará as configurações e acessos.
- **Aceite:** identidade usa issuer + subject; claims opcionais não bloqueiam acesso salvo necessidade de autorização; política impede acesso de usuário autenticado sem autorização e de usuário local inativo; configuração e pré-requisitos externos estão documentados.

### T04 — Validar arquitetura de realtime nos ambientes previstos

- **Complexidade:** `high` — Investiga limitações de runtime e conexões persistentes, com replay e múltiplas réplicas.
- **Referência:** Tech Spec, SSE, LISTEN/NOTIFY, Replay e Ambientes.
- **Dependências:** T01.
- **Escopo:** realizar prova mínima de conexão, desconexão e retomada nos runtimes previstos; definir hub, conexões PostgreSQL, publicação após commit e comportamento entre réplicas. Levantar limites do runtime e proxies antes de consolidar o desenho.
- **Guia obrigatório:** Gerar `docs/guides/realtime-validation.md` antes da prova externa, com recursos/acessos necessários, conexão PostgreSQL direta ou pool compatível, configuração do runtime/proxy, passos de execução e evidências esperadas por ambiente. O responsável pelo projeto providenciará os recursos.
- **Aceite:** evidência de viabilidade ou limitação por ambiente; desenho define Last-Event-ID, ordenação, reconexão e ressincronização quando cursor expirar; eventual adequação necessária da arquitetura fica explícita antes de T21. Não considerar a prova como implementação final.

## M1 — Fundação, acesso e cadastros

### T05 — Criar aplicação e ambiente local reproduzível

- **Complexidade:** `mid` — Integra aplicação, banco, containers e configuração a partir da arquitetura definida.
- **Referência:** PRD §§26–27; Tech Spec, Docker Compose.
- **Dependências:** T01.
- **Escopo:** iniciar Next.js e Tailwind, estrutura de camadas, configuração validada, exemplo de variáveis e Compose com app e PostgreSQL. Documentar configuração do Logto externo.
- **Guia obrigatório:** Gerar `docs/guides/local-development.md` com pré-requisitos, variáveis, Compose, migrations/seeds, inicialização e diagnóstico; referenciar o guia OIDC para a configuração externa do Logto.
- **Aceite:** com variáveis preenchidas, novo checkout inicia pelo procedimento documentado; banco persiste entre reinícios; nenhum IdP local é necessário; build, lint e verificação de tipos possuem comandos executáveis; segredos ficam fora do versionamento.

### T06 — Implementar modelo relacional, migrations e seeds

- **Complexidade:** `high` — Modelagem precisa preservar integridade, histórico reconstruível e concorrência entre entidades.
- **Referência:** PRD §§5–11, 16 e 22; Tech Spec, User, AuditEvent, RealtimeEvent e Optimistic Locking.
- **Dependências:** T02, T03, T04, T05.
- **Escopo:** modelar usuários, áreas, domínios, projetos, participantes, atividades, áreas envolvidas, tarefas ordenadas, Entregas de Valor, auditoria, eventos realtime e versões para concorrência. Definir índices para consultas previstas.
- **Aceite:** migrations criam banco vazio; restrições garantem integridade e unicidade issuer/subject; vínculo atividade/projeto respeita tipo; seeds idempotentes incluem os seis domínios do PRD; relacionamentos e campos obrigatórios constam em diagrama ou descrição; inativação/exclusão preserva histórico conforme T02.

### T07 — Implementar login, sessão e autorização no servidor

- **Complexidade:** `high` — Autenticação e sessão exigem tratamento correto de falhas e autorização no servidor.
- **Referência:** EP-01 / US-01; Tech Spec, Estratégia de sessão.
- **Dependências:** T03, T06.
- **Escopo:** fluxo OIDC Authorization Code, validação pelo adapter, discovery e configuração alternativa quando necessária, mapper, usuário local, sessão e logout. Aplicar autorização em páginas protegidas, leituras, mutações e endpoints.
- **Aceite:** login real com Logto funciona; sessão expirada, identidade não autorizada e usuário inativo são recusados; alteração de e-mail não duplica usuário; usuários com mesmo e-mail e identidades diferentes não são fundidos; domínio recebe somente identidade normalizada; tokens desnecessários não são persistidos; testes cobrem falhas de sessão e autorização.

### T08 — Criar navegação e estrutura visual autenticada

- **Complexidade:** `low` — Navegação e componentes visuais seguem padrões definidos, com autenticação já disponível.
- **Referência:** PRD §§4, 13, 17–19 e 26.
- **Dependências:** T05, T07.
- **Escopo:** navegação para Kanban, projetos, dashboard, relatórios e cadastros; identificação do usuário e logout; componentes reutilizáveis de formulário e feedback.
- **Aceite:** navegação utilizável em desktop e notebook, inclusive por teclado; estados de carregamento, vazio e erro definidos; páginas protegidas exigem sessão; formulários apresentam erros junto aos campos.

### T09 — Implementar cadastros de áreas e domínios

- **Complexidade:** `low` — Cadastros convencionais com validações delimitadas e infraestrutura de acesso pronta.
- **Referência:** EP-02 / US-02; PRD §§6.5 e 9.
- **Dependências:** T06, T07, T08.
- **Escopo:** listar, criar, editar e inativar áreas e domínios; disponibilizar usuários autorizados/ativos como opções de responsáveis e participantes, sem gestão sofisticada de permissões.
- **Aceite:** nomes obrigatórios; áreas ativas duplicadas são rejeitadas segundo normalização definida; seis domínios iniciais editáveis; referências antigas continuam legíveis após inativação; registros inativos não aparecem para novas associações conforme T02.

### T10 — Configurar CI e primeira entrega em homologação

- **Complexidade:** `mid` — Integra pipeline, migrations, ambiente externo e procedimentos de recuperação.
- **Referência:** PRD §26; Tech Spec, Ambientes.
- **Dependências:** T05, T06, T07.
- **Escopo:** GitHub Actions para verificações e build; fluxo de deploy Vercel, banco e credenciais separados; estratégia de execução controlada de migrations.
- **Guia obrigatório:** Gerar `docs/guides/homologation.md` com projeto Vercel, PostgreSQL, credenciais separadas, variáveis, GitHub Actions, migrations, callbacks, validação e recuperação do deploy. O responsável pelo projeto providenciará contas, recursos e acessos.
- **Aceite:** falha de verificação bloqueia o fluxo de entrega definido; homologação executa login Logto e acesso ao banco; configuração por ambiente documentada; logs não expõem segredos; fluxo de migration e recuperação de deploy está descrito. Credenciais e recursos externos indisponíveis são registrados como dependências, não como validações concluídas.

## M2 — Projetos e atividades com integridade

### T11 — Implementar cadastro e consulta de projetos

- **Complexidade:** `mid` — Formulários e relacionamentos múltiplos exigem validação consistente das regras do projeto.
- **Referência:** EP-03 / US-03; PRD §7; RN-11–13.
- **Dependências:** T09.
- **Escopo:** listagem, criação, edição e visão geral com todos os campos do PRD: área, grupo responsável fixo Arquitetura, responsável externo, participantes, natureza, papel, datas e status.
- **Aceite:** campos obrigatórios e relacionamentos validados no servidor; todos os quatro status suportados; status do projeto não muda por alterações de atividades; responsável externo é opcional; edição respeita política de ciclo de vida de T02.

### T12 — Implementar infraestrutura transacional de auditoria e concorrência

- **Complexidade:** `high` — Atomicidade, versões e auditoria completa precisam funcionar sob edições simultâneas.
- **Referência:** EP-11 / US-19; RN-19; Tech Spec, AuditEvent e Optimistic Locking.
- **Dependências:** T06, T07.
- **Escopo:** criar mecanismo compartilhado de atualização por versão e gravação de eventos com ator, instante, entidade e valores anteriores/novos suficientes para T02, incluindo estado inicial e alterações de todas as dimensões usadas no retrato histórico, não apenas o mínimo de eventos do PRD. Aplicar aos fluxos de edição existentes e definir contrato para os próximos.
- **Aceite:** edição com versão antiga é rejeitada sem sobrescrever dados; rollback não deixa evento órfão; falha ao gravar auditoria impede mutação auditável; eventos não podem ser editados pelo fluxo normal da aplicação; teste com duas edições simultâneas demonstra o conflito.

### T13 — Implementar criação, edição e detalhe de atividades

- **Complexidade:** `mid` — Reúne muitos campos, vínculos e herança inicial usando serviços de integridade já implementados.
- **Referência:** EP-05 / US-07–09; PRD §8; RN-02–05, 12–14.
- **Dependências:** T11, T12.
- **Escopo:** formulário e consultas com todos os campos do PRD, projeto opcional conforme tipo, um responsável, participantes, solicitante, áreas envolvidas, classificações, esforço opcional, datas e observações. Aplicar herança inicial conforme T02.
- **Aceite:** ad hoc e atividade de projeto são criadas; Tipo Projeto exige vínculo; há exatamente um responsável; valores herdados podem ser alterados sem sincronização automática posterior; criado/atualizado por/em são preenchidos no servidor; criação e alterações relevantes geram auditoria; conflito de edição é informado e permite recarregar os dados.

### T14 — Implementar transições de status e datas automáticas

- **Complexidade:** `high` — Transições, datas automáticas e reabertura afetam diretamente a integridade histórica.
- **Referência:** US-11–13; PRD §§12 e 16; RN-10.
- **Dependências:** T13.
- **Escopo:** serviço único de mudança de status usado pelo detalhe e futuramente pelo board; conclusão, cancelamento e retornos permitidos; início automático na primeira entrada em Em andamento quando ausente, preservação do início nas retomadas e tratamento de datas conforme T02, tanto para ad hoc quanto para atividades de projeto.
- **Aceite:** seis status do board e Cancelado suportados; cancelamento disponível a partir de qualquer outro status e terminal; primeira entrada em Em andamento registra início quando ausente, sem sobrescrever início existente; concluir registra data automática; cada mudança válida registra antes/depois, autor e instante; versões antigas não alteram status; reabertura de concluída segue T02; transição e auditoria são atômicas.

### T15 — Implementar checklist ordenável

- **Complexidade:** `mid` — Ordenação persistente e alterações concorrentes exigem mais que um checklist visual.
- **Referência:** EP-06 / US-10; RN-06–07 e 20.
- **Dependências:** T13.
- **Escopo:** adicionar, editar, remover, marcar/desmarcar e reordenar tarefas; exibir progresso X/Y.
- **Aceite:** ordem persiste após recarregar; atividade aceita zero tarefas; conclusão de todos os itens não altera status da atividade; progresso reflete os itens persistidos; atualizações concorrentes não eliminam mudanças silenciosamente.

### T16 — Exibir histórico da atividade

- **Complexidade:** `low` — Apresenta eventos já persistidos com contrato definido, sem implementar reconstrução histórica.
- **Referência:** EP-11 / US-19; PRD §16.
- **Dependências:** T14.
- **Escopo:** timeline legível com criação, status, responsável, prioridade, datas, conclusão e cancelamento; consulta limitada/paginada conforme volume.
- **Aceite:** eventos mostram usuário, data e mudança; sequência permite identificar conclusão e reabertura; campos alterados são compreensíveis sem ler JSON; inativação de referências não torna eventos ilegíveis; acesso é autorizado no servidor.

## M3 — Kanban, filtros e colaboração

### T17 — Implementar board único e cards

- **Complexidade:** `mid` — Compõe colunas e cards com dados relacionados, estados de tela e navegação para detalhes.
- **Referência:** EP-07; PRD §13; RN-01–02.
- **Dependências:** T14, T15, T08.
- **Escopo:** seis colunas padrão e cards com título, projeto quando houver, área, responsável, prioridade, esforço opcional, papel, checklist e previsão; abertura do detalhe.
- **Aceite:** cada card representa uma atividade; não existem boards por período/pessoa/projeto; Cancelado não ocupa coluna padrão; estados vazios e erros são tratados; card abre todos os dados da atividade.

### T18 — Implementar movimentação no Kanban

- **Complexidade:** `mid` — Integra drag and drop, acessibilidade e recuperação de falhas usando o serviço de transições.
- **Referência:** EP-07 / US-11–13; PRD §13.3.
- **Dependências:** T17.
- **Escopo:** drag and drop entre colunas usando T14; feedback visual, tratamento de falha e alternativa por teclado/formulário.
- **Aceite:** movimento persiste status e auditoria; falha ou conflito restaura/recarrega posição e informa o usuário; conclusão preenche data; cancelar permanece disponível no detalhe; reordenar visualmente não exige ranking persistido entre cards, pois o PRD não o especifica.

### T19 — Implementar consulta temporal compartilhada

- **Complexidade:** `high` — Interseções, fuso, datas ausentes e correções históricas precisam produzir consultas consistentes.
- **Referência:** EP-08 / US-15; PRD §15; RN-08–09.
- **Dependências:** T02, T14.
- **Escopo:** implementar regra de interseção e resolução de esta semana, semana passada, este mês, mês passado, este trimestre, este ano e intervalo personalizado; opção Sem planejamento.
- **Aceite:** testes cobrem os exemplos de T02, limites de mês/ano e fuso; atividade iniciada em 25/08 e concluída em 18/09 aparece em agosto e setembro; datas ausentes e cancelamento têm comportamento explícito; consulta reutilizável pelo board, dashboard e relatórios.

### T20 — Implementar filtros combináveis e acesso a cancelados

- **Complexidade:** `mid` — Combina muitas dimensões sobre uma consulta temporal pronta e trata cancelados separadamente.
- **Referência:** EP-08 / US-14–15; PRD §§13–15.
- **Dependências:** T17, T19.
- **Escopo:** período, área, projeto, responsável, participante, domínio, natureza, prioridade, papel, esforço e status; limpar filtros; exibição de cancelados por lista/visão filtrada sem criar coluna padrão. Atalhos Todas, Minha semana, Este mês e Bloqueadas são opcionais.
- **Aceite:** filtros combinam sobre o mesmo conjunto de atividades; responsável e participante são dimensões distintas; Sem planejamento é acessível; cancelados podem ser consultados e abertos; totais/estados vazios refletem os filtros; não há cadastro de períodos ou views salvas.

### T21 — Implementar publicação, SSE e replay persistente

- **Complexidade:** `high` — Requer publicação transacional, replay sem perda, ordenação, reconexão e comunicação entre réplicas.
- **Referência:** Tech Spec, Audit + Realtime, Replay e retenção.
- **Dependências:** T04, T12, T14, T15.
- **Escopo:** persistir RealtimeEvent na transação da mutação; sinalizar via LISTEN/NOTIFY após commit; stream autenticado, cursor, reconexão e replay; incluir mutações colaborativas existentes e contrato para as futuras.
- **Aceite:** duas sessões recebem atualizações confirmadas; transação revertida não publica mudança; reconexão recupera eventos por Last-Event-ID sem perda na passagem de replay para stream; duplicatas são toleradas; cursor fora da retenção provoca ressincronização; sessão inválida não acessa stream; réplicas compartilham eventos conforme T04.

### T22 — Integrar realtime às telas e proteger edições abertas

- **Complexidade:** `high` — Concilia eventos remotos, cache, filtros e formulários locais sem perder edições.
- **Referência:** Tech Spec, Realtime e Optimistic Locking.
- **Dependências:** T18, T20, T21.
- **Escopo:** atualizar/invalidate dados do board, detalhes e consultas afetadas; sinalizar alterações remotas durante edição; reconectar após falhas.
- **Aceite:** criação, movimento e checklist de outra sessão aparecem sem recarregamento manual; filtros continuam aplicados; formulário aberto não perde texto silenciosamente; salvamento obsoleto informa conflito; reconexão recompõe estado atual quando replay não estiver disponível.

## M4 — Evidências, indicadores e exportação

### T23 — Implementar Entregas de Valor em Markdown

- **Complexidade:** `mid` — Integra editor, renderização segura, vínculo com projeto e proteção de edições concorrentes.
- **Referência:** EP-04 / US-05–06; PRD §11; RN-15–18.
- **Dependências:** T11, T12, T08.
- **Escopo:** listar, criar, editar e visualizar entregas vinculadas a projeto; título, Markdown, data de referência, autor e timestamps; renderização segura. Integrar ao contrato de eventos se T21 já estiver disponível, ou concluir essa integração em T28.
- **Aceite:** projeto, título, conteúdo e data obrigatórios; autor e timestamps automáticos; edição e visualização renderizada disponíveis; HTML/scripts e URLs perigosas não executam; alteração da entrega não modifica automaticamente metadados/status do projeto; edição concorrente não sobrescreve silenciosamente.

### T24 — Completar página do projeto

- **Complexidade:** `low` — Compõe consultas e telas existentes no contexto do projeto, com contratos já definidos.
- **Referência:** EP-03 / US-04; PRD §17.
- **Dependências:** T16, T20, T23.
- **Escopo:** reunir visão geral, atividades relacionadas, Entregas de Valor e principais eventos relacionados ao projeto. Histórico pode agregar eventos existentes conforme contrato T02, sem inventar auditoria não registrada.
- **Aceite:** atividades vinculadas, inclusive concluídas/canceladas, são consultáveis; entregas abrem editor/visualização; eventos identificam entidade de origem; dados respeitam o projeto selecionado e estado vazio; navegação permite voltar ao contexto do projeto.

### T25 — Implementar agregações gerenciais

- **Complexidade:** `high` — Reconstrói dimensões no fechamento e evita duplicidades nas agregações e filtros históricos.
- **Referência:** EP-09 / US-16; PRD §18.
- **Dependências:** T19, T20, T16.
- **Escopo:** consultas para atividades no período, concluídas, projetos atendidos, áreas atendidas, em andamento, aguardando retorno e bloqueadas; distribuições por área, domínio, responsável, natureza, tipo, papel e esforço.
- **Aceite:** resultados seguem o dicionário de T02; joins de participantes/áreas não multiplicam atividades; esforço ausente aparece de forma explícita; fixtures com reabertura, cancelamento e mudanças posteriores de responsável/área/projeto validam o retrato no fechamento, inclusive filtros e agrupamentos históricos; os mesmos filtros produzem população coerente com o relatório.

### T26 — Implementar dashboard gerencial

- **Complexidade:** `mid` — Apresenta agregações prontas com filtros, visualizações e atualização dos dados.
- **Referência:** EP-09 / US-16; PRD §18.
- **Dependências:** T25, T08.
- **Escopo:** cards de indicadores e visualizações das sete distribuições; seleção temporal e demais filtros definidos; explicação curta de métricas quando necessária.
- **Aceite:** todos os indicadores respondem ao período; datas e semântica da visão são visíveis; totais correspondem a T25; loading, vazio e falha tratados; tela utilizável em notebook; alteração remota invalida dados pertinentes após integração de realtime.

### T27 — Implementar relatório detalhado e exportação CSV

- **Complexidade:** `mid` — Integra consulta histórica pronta, paginação e exportação completa com tratamento correto do CSV.
- **Referência:** EP-10 / US-17–18; PRD §19; Tech Spec, CSV UTF-8 BOM.
- **Dependências:** T25, T24.
- **Escopo:** relatório temporal com resumo, atividades e projetos associados, filtros, paginação e exportação completa da seleção. Definir colunas e formato de datas; proteger células contra interpretação indevida de fórmulas em planilhas.
- **Aceite:** relatório e dashboard concordam para a mesma definição e filtros; exportação inclui todos os resultados, não apenas a página; arquivo possui BOM, acentos, aspas, delimitadores e quebras de linha corretos; endpoint exige autorização; CSV corresponde ao conjunto consultado; XLSX não é necessário para este MVP.

## M5 — Operação e adoção

### T28 — Validar fluxos integrados e requisitos não funcionais

- **Complexidade:** `high` — Valida e diagnostica falhas entre segurança, concorrência, realtime e fluxos completos.
- **Referência:** PRD §§24, 26 e 28; Tech Spec, Segurança, Concorrência e Realtime.
- **Dependências:** T10, T22, T24, T26, T27.
- **Escopo:** executar testes integrados/E2E dos fluxos principais; completar atualização realtime nas telas de M4; avaliar uso simultâneo por cinco usuários, consultas com massa representativa, navegação por teclado e layout desktop/notebook; corrigir falhas encontradas.
- **Aceite:** fluxo login → projeto → atividade → checklist → Kanban → entrega → relatório/CSV validado; testes de autorização direta, conflito, auditoria atômica, replay e Markdown seguro passam; metas de desempenho e massa usadas são registradas antes da medição; não restam falhas impeditivas para rotina diária.

### T29 — Preparar e validar produção no Kubernetes

- **Complexidade:** `high` — Combina Kubernetes, OIDC de produção, SSE, migrations e recuperação operacional.
- **Referência:** PRD §26; Tech Spec, Ambientes, CyberArk, Cleanup e Backup.
- **Dependências:** T10, T21, T28.
- **Escopo:** imagem de produção, manifests/configuração, secrets externos, probes, pipeline, migrations controladas, SSE através do ingress e múltiplas réplicas; CyberArk via configuração; CronJob de limpeza de eventos realtime acima de sete dias; logs e diagnóstico operacional; procedimento de rollback e restauração com infraestrutura.
- **Guia obrigatório:** Gerar `docs/guides/production.md` e `docs/guides/backup-restore.md` antes das etapas externas correspondentes: cluster, namespace, registry, DNS/TLS, ingress/SSE, secrets, PostgreSQL, CyberArk (referenciando guia OIDC), pipeline, migrations, CronJob, observabilidade, rollout/rollback e exercício de restauração. O responsável pelo projeto providenciará infraestrutura e coordenará backup/restore.
- **Aceite:** build/deploy reproduzíveis; login e autorização CyberArk verificados; SSE/replay funcionam entre réplicas; cleanup é repetível e não remove auditoria; falhas são diagnosticáveis sem expor tokens; responsável por backup e procedimento de restore confirmados com infraestrutura; rollout, rollback e tratamento de migrations documentados. Provisionamento e validação real dependem dos acessos externos identificados em M0.

### T30 — Homologar com a equipe e substituir a planilha

- **Complexidade:** `mid` — Exige conferência de carga, limites do histórico importado e homologação com usuários reais.
- **Referência:** PRD §§3, 23–24.
- **Dependências:** T29.
- **Escopo:** preparar roteiro e guia curto; validar com cinco integrantes; executar carga assistida/cadastro conferido de áreas, projetos e atividades abertas; incluir concluídas do ano corrente quando necessário para a visão anual completa. Não inventar transições históricas ausentes na planilha: documentar a cobertura e as limitações do histórico importado. Importador genérico de planilhas não faz parte do escopo definido.
- **Guia obrigatório:** Gerar `docs/guides/adoption.md` com campos da planilha a mapear, preparação/carga/conferência dos dados, limitações históricas, roteiro dos cinco usuários e checklist de adoção. O responsável pelo projeto fornecerá a planilha e coordenará os usuários.
- **Aceite:** cinco usuários acessam e executam sua rotina; projetos com participação da Arquitetura estão identificáveis; amostra de atividades confere com a fonte anterior; relatório gerencial é produzido em menos de dez minutos; equipe define data de adoção da aplicação como fonte principal e responsável por acompanhar cobertura de pelo menos 90% das atividades relevantes. Cobertura deve ser medida no uso, não declarada apenas por testes técnicos.

## Dependências externas e responsabilidade

O responsável pelo projeto (usuário) providenciará todos os acessos, contas, credenciais, recursos de infraestrutura, dados da planilha e participação da equipe abaixo. A implementação deverá gerar os guias nas tasks indicadas antes de solicitar o provisionamento correspondente. Os caminhos dos guias são entregáveis planejados; os arquivos ainda serão produzidos durante a execução das tasks.

| Dependência | Necessária para | Preparação possível antes do acesso |
| --- | --- | --- |
| Aplicação Logto, credenciais e callbacks de desenvolvimento/testes | T07, T10 | Adapter, configuração e testes locais com fixtures |
| Projeto Vercel e PostgreSQL de homologação | T04, T10 | Build e pipeline preparados no repositório |
| CyberArk, claims e política de acesso corporativa | T03, T29 | Contrato OIDC e configuração documentados |
| Cluster, ingress, registry, secrets e PostgreSQL gerenciado | T29 | Imagem, manifests e runbook |
| Infraestrutura responsável por backup/restore | T29 | Procedimento e pontos de validação descritos |
| Planilha atual e disponibilidade dos cinco usuários | T30 | Roteiro de homologação e mapeamento dos campos do PRD |

A ausência de credenciais não impede trabalho independente, mas impede declarar concluído o aceite que exige integração real.

## Rastreabilidade das histórias

| Épico | Histórias | Tasks principais |
| --- | --- | --- |
| EP-01 Acesso | US-01 | T03, T07, T29 |
| EP-02 Cadastros | US-02 | T06, T09 |
| EP-03 Projetos | US-03, US-04 | T11, T24 |
| EP-04 Entregas de Valor | US-05, US-06 | T23 |
| EP-05 Atividades | US-07, US-08, US-09 | T13, T14 |
| EP-06 Tarefas | US-10 | T15 |
| EP-07 Kanban | US-11, US-12, US-13 | T14, T17, T18 |
| EP-08 Filtros e Períodos | US-14, US-15 | T02, T19, T20 |
| EP-09 Dashboard | US-16 | T25, T26 |
| EP-10 Relatórios | US-17, US-18 | T27 |
| EP-11 Histórico | US-19 | T12, T16 |

## Critério comum de conclusão de cada task

- Critérios de aceite atendidos e evidência de validação registrada na issue/PR.
- Operações protegidas no servidor e dados validados onde a task introduzir entradas ou acesso.
- Alterações de esquema acompanhadas de migration; configuração e comportamento novo documentados quando aplicável.
- Verificações automatizadas existentes passam. Testes adicionais priorizam regras de negócio, autorização, integridade, temporalidade e concorrência; não é necessário criar testes que apenas reproduzam detalhes da implementação.
- Quando houver guia obrigatório, ele inclui pré-requisitos, passos reproduzíveis, valores a obter, onde configurar segredos, validação e diagnóstico. Não contém credenciais reais. A documentação deve permitir que o responsável pelo projeto providencie os recursos sem precisar deduzir etapas.
- Nenhum item dependente de integração externa é marcado como validado apenas por mock.

Permanecem fora do MVP os itens do PRD §25, incluindo integrações Jira/Azure DevOps, notificações, comentários, anexos, permissões sofisticadas, views salvas e PDF executivo automático. Realtime e optimistic locking permanecem no plano porque foram decisões explícitas da Tech Spec.
