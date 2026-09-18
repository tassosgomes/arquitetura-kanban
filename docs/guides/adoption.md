# Adoção — homologar com a equipe e substituir a planilha

**Task:** T30  
**Versão:** 1.0  
**Data:** 2026-09-10  
**Status:** Guia escrito. **Homologação com pessoas reais não executada.** **Planilha atual pendente do responsável.** Não há importador genérico neste repositório e nenhum será criado para o MVP.  
**PRD:** [prd.md](../prd.md) §§3, 7–11, 23–24  
**Decisão 12:** [tasks.md](../tasks.md) — cadastrar áreas, projetos e atividades **abertas** antes da virada; concluídas do ano corrente só se o relatório anual precisar delas; carga assistida.  
**Regras de datas e retrato:** [domain-rules.md](../domain-rules.md) (DE-03, DE-04, DE-05, DE-09, DE-23)  
**SSO:** [oidc.md](oidc.md)  
**NFR / cinco usuários (lab):** [nfr-validation.md](nfr-validation.md)  
**Produção:** [production.md](production.md) — login CyberArk e cluster **não validados**  
**Homologação:** [homologation.md](homologation.md) — deploy Vercel **pendente de contas**

O MVP só substitui a planilha como fonte principal quando a equipe usa a aplicação na rotina (PRD §3 e §23). Este arquivo é o roteiro para essa virada. Ele **não** declara a virada feita.

---

## 0. Como usar este guia

1. O responsável entrega a planilha e convoca os cinco integrantes ([§1](#1-o-responsável-providencia)).
2. Preencha a coluna “Na planilha” das tabelas da [§2](#2-campos-da-planilha--campos-do-sistema) com os cabeçalhos **reais**. Não invente nomes de coluna.
3. Prepare cadastros na ordem da [§3](#3-preparação).
4. Carregue na UI e confira a amostra ([§4](#4-carga-assistida-e-conferência)).
5. Leia as [limitações do histórico](#5-limitações-do-histórico-importado) **antes** de arrastar cards “para completar o fluxo”.
6. Os cinco usuários executam o [roteiro](#6-roteiro-dos-cinco-usuários) na URL combinada.
7. Só então a equipe preenche o [checklist de adoção](#7-checklist-de-adoção) (data da virada, dono da cobertura ≥ 90%, relatório em menos de 10 minutos).

Enquanto a planilha e as pessoas não existirem neste processo, **não** marque T30 como aceita. Testes automatizados e o laboratório de T28 **não** medem cobertura de uso.

Ambiente da virada: **produção** (CyberArk + Kubernetes), depois que T29 estiver de pé. Ensaio na homologação Vercel + Logto é opcional e **não** substitui a carga em produção: os bancos são separados.

Nunca cole a planilha completa, e-mails pessoais desnecessários ou segredos neste repositório.

---

## 1. O responsável providencia

Nada disto está no repositório nem foi recebido nesta task:

| Item | Para quê | Ainda não é |
| --- | --- | --- |
| Planilha atual (arquivo, abas, cabeçalhos, data de extração) | mapeamento da §2 e amostra da §4 | inventar colunas ou um CSV “padrão” |
| Lista dos **cinco** integrantes e quem é o gestor/líder | allowlist SSO, responsáveis, roteiro | usuários fictícios no banco |
| Allowlist no IdP (Logto no ensaio, CyberArk na virada) | primeiro login provisiona o usuário local | [oidc.md](oidc.md) |
| URL estável (homologação e/ou produção) e confirmação de que os cinco entram | rotina real | issuer dummy da CI |
| Decisão: o relatório anual de **este ano civil** (fuso `America/Sao_Paulo`) precisa das concluídas já encerradas? | se sim, incluí-las na carga; se não, só abertas | carregar anos anteriores “por garantia” |
| Definição de **atividade relevante** (denominador dos 90%) | cobertura medida no uso | declarar 90% só porque o seed passou |
| Pessoa dona da cobertura após a virada | PRD §23 | “a equipe” sem nome |
| Data candidata da virada e regra de congelar a planilha | fonte principal única | dois sistemas indefinidamente |

A implementação **não** solicita a planilha por um formato de importação. Qualquer aba/coluna serve desde que o responsável complete as tabelas da §2.

---

## 2. Campos da planilha → campos do sistema

A planilha **não foi fornecida**. As tabelas abaixo listam os campos do produto (PRD §§7–11) e o lugar na UI. A coluna **Na planilha** fica para o responsável copiar o cabeçalho ou a célula de origem. Célula vazia = campo ausente na fonte: não inventar valor, salvo o que a UI exige para salvar (aí o time escolhe na hora da carga e anota a premissa).

Rotas (usuário autenticado):

| Cadastro | Onde |
| --- | --- |
| Áreas | Cadastros → Áreas (`/catalogs/areas`) |
| Domínios | Cadastros → Domínios (`/catalogs/domains`) |
| Usuários (somente leitura) | Cadastros → Visão geral (`/catalogs`) |
| Projetos | Projetos → Novo projeto (`/projects/new`) |
| Atividades | Kanban → Nova atividade (`/activities/new`) ou, vinculada, `/projects/<id>/activities` |
| Tarefas | detalhe da atividade (`/activities/<id>`), checklist |
| Entregas de Valor | projeto → Entregas de valor (`/projects/<id>/value-deliveries/new`) |

### 2.1 Área

Entidade cadastrável, não texto livre (PRD §6.5). Nomes ativos únicos ignorando caixa e espaços nas extremidades.

| Conceito | Na planilha (preencher) | Campo no sistema | UI | Obrigatório |
| --- | --- | --- | --- | --- |
| Nome da área da empresa | | `Área.nome` | Cadastros → Áreas → Nova área | sim |
| Área só citada em atividade, sem cadastro próprio | | criar a área **antes** da atividade | mesma tela | sim, se for solicitante ou envolvida |

Não há “código da área” no MVP. Se a planilha tiver sigla e nome, use o **nome** que a equipe reconhece no relatório. Áreas que não existem mais: cadastre e **inative** depois da carga se não devem entrar em associações novas; o histórico permanece legível.

### 2.2 Projeto / iniciativa

Status do projeto é **independente** das atividades (PRD §7). Não derive “projeto concluído” porque todas as atividades estão concluídas, nem o contrário.

| Conceito | Na planilha (preencher) | Campo no sistema | UI | Obrigatório |
| --- | --- | --- | --- | --- |
| Nome da iniciativa | | Nome | Novo projeto | sim |
| Descrição / contexto | | Descrição | idem | não |
| Área dona / demandante do projeto | | Área responsável | select de áreas ativas | sim |
| Ponto focal fora da Arquitetura | | Responsável externo (texto) | idem | não |
| Grupo responsável | | Responsável | **Arquitetura**, grupo virtual fixo | sim, fixo |
| Pessoas do time no projeto | | Participantes | checkboxes; todos os usuários ativos começam marcados | não |
| Arquitetura lidera ou só contribui | | Papel da Arquitetura: Responsável / Contribuidor | select | sim |
| Estratégico vs operacional | | Natureza: Estratégico / Operacional | select | sim |
| Início previsto ou real | | Data de início | `type=date` | não |
| Previsão de término | | Previsão de término | `type=date` | não |
| Situação da iniciativa | | Status: Planejado / Em andamento / Concluído / Cancelado | select | sim |

Projeto na planilha sem correspondente no Kanban: cadastre mesmo assim se a Arquitetura participa — o aceite pede **100% dos projetos com participação da Arquitetura identificáveis**.

Linha da planilha que é só uma demanda pontual, sem iniciativa maior: **não** crie projeto. Vira atividade **Ad hoc**.

### 2.3 Atividade (card do Kanban)

Unidade do board único. Tipo Projeto **exige** vínculo; Ad hoc **não** tem projeto.

| Conceito | Na planilha (preencher) | Campo no sistema | UI | Obrigatório |
| --- | --- | --- | --- | --- |
| Título / demanda | | Título | Nova atividade | sim |
| Detalhe | | Descrição | idem | não |
| É de uma iniciativa ou pontual? | | Tipo: Projeto / Ad hoc | idem | sim |
| Iniciativa | | Projeto (se Tipo = Projeto) | select | se Tipo = Projeto |
| Quem pediu | | Área solicitante | select | sim |
| Outras áreas tocadas | | Áreas envolvidas | checkboxes | não |
| Tema de arquitetura | | Domínio (cadastro; seis iniciais do PRD §9) | select | sim |
| Estratégica vs operacional | | Natureza: Estratégica / Operacional | select | sim |
| Liderança vs contribuição nesta demanda | | Papel da Arquitetura | select | sim |
| Dono do card | | Responsável (um) | select | sim |
| Outros do time no card | | Participantes | checkboxes | não |
| Urgência | | Prioridade: Baixa / Média / Alta / Crítica | select | sim (default na UI: Média, se a fonte não tiver) |
| Tamanho P/M/G | | Esforço: P / M / G ou vazio (Não informado) | select | não |
| Situação **atual** na fonte | | Status do Kanban (ver §2.6) | select **só na criação** | sim |
| Quando começou de fato | | Data de início | `type=date` na criação ou na edição | não na UI; **necessário** para entrar em recorte de execução (I-01 por período) |
| Previsão | | Previsão de término | não encerra execução | não |
| Quando terminou | | Data de conclusão | visível na **edição** se o status já é Concluído | não na criação; preencher na edição quando a fonte tiver a data |
| Notas | | Observações | textarea | não |

Criado por / em e Atualizado por / em são automáticos. Serão o operador da carga e o instante da carga — não o autor histórico da planilha. Não tente forjar isso.

Herança ao criar atividade **vinculada**: a UI sugere participantes, natureza, papel e área responsável do projeto como solicitante. O responsável individual começa com o usuário que criou a atividade e pode ser alterado. Confira contra a linha da planilha e ajuste se for diferente. Mudanças posteriores no projeto **não** sincronizam a atividade.

### 2.4 Tarefas (checklist)

Só existem **dentro** de uma atividade. Sem workflow próprio. Concluir todos os itens **não** conclui a atividade.

| Conceito | Na planilha (preencher) | Campo no sistema | UI | Obrigatório |
| --- | --- | --- | --- | --- |
| Item / subtarefa | | descrição da tarefa | detalhe da atividade → checklist | não (zero tarefas é válido) |
| Feito ou não | | concluída / não concluída | marcar o item | não |
| Ordem | | ordem persistida | arrastar ou botões de ordem | a ordem da carga |

Se a planilha não decompõe o trabalho, **não** invente checklist.

### 2.5 Entregas de Valor

Só existem **ligadas a projeto**. Markdown. Não alteram status do projeto.

| Conceito | Na planilha (preencher) | Campo no sistema | UI | Obrigatório |
| --- | --- | --- | --- | --- |
| Título do registro de valor | | Título | Nova entrega de valor | sim |
| Texto (decisões, benefícios, impacto) | | Conteúdo Markdown | editor | sim |
| Data a que o valor se refere | | Data de referência | `type=date` | sim |

Autor e timestamps são automáticos (quem carregou / quando). Se a planilha não tiver entregas, não crie parágrafos genéricos para “preencher o projeto”.

### 2.6 Vocabulário de status (só o do sistema)

Não há coluna oficial da planilha aqui. Mapeie **um** status atual da fonte para **um** valor abaixo. Se a fonte não distingue “Backlog” de “A fazer”, escolha um e anote a regra. **Não** percorra a cadeia Backlog → A fazer → Em andamento para “montar histórico”.

**Atividade** (colunas do board): Backlog, A fazer, Em andamento, Aguardando retorno, Bloqueado, Concluído. Cancelado é terminal, sem coluna padrão; a criação **não** oferece Cancelado — só o detalhe (Cancelar), e a data de cancelamento vira o **dia da operação**. Por isso **não** carregue canceladas antigas na virada, salvo pedido explícito do time, ciente dessa distorção.

**Projeto:** Planejado, Em andamento, Concluído, Cancelado.

### 2.7 O que não mapear

| Na fonte (se existir) | Por quê |
| --- | --- |
| Sequência de colunas/status passados sem data | o MVP não reconstitui retrato mensal a partir disso sem eventos de auditoria na época; ver §5 |
| Comentários em cadeia, anexos, links de Jira/Azure | fora do MVP (PRD §25) |
| Capacidade, hours, OKR, financeiro | fora do MVP |
| “Período” ou “sprint” como cadastro | o board é único; período é filtro (PRD §13) |
| Vários responsáveis no mesmo card | o MVP exige **um** responsável; os demais vão em Participantes |

---

## 3. Preparação

Faça **antes** de tratar a aplicação como fonte principal. Ordem obrigatória: identidade → catálogos → projetos → atividades abertas → (opcional) concluídas do ano → checklists/entregas.

### 3.1 Identidade e os cinco usuários

1. Confirme allowlist no IdP do ambiente ([oidc.md](oidc.md)).
2. Cada um dos cinco abre a URL, `/login`, **Entrar com SSO**. O primeiro login autorizado cria o usuário local (`issuer` + `subject`).
3. Em Cadastros → Visão geral, confira os cinco **ativos**. Eles serão marcados por padrão como participantes de novos projetos.
4. Quem estiver no IdP mas inativo na aplicação não entra por padrão em novas associações.

Ensaio de teclado/layout: [nfr-validation.md §7](nfr-validation.md#7-teclado-e-layout-checklist-manual). Continua pendente de sessão real até alguém marcar.

### 3.2 Áreas e domínios

1. Liste na planilha (depois do mapeamento) os nomes distintos de área usados em projetos e atividades **que entram na carga**.
2. Cadastre cada área ativa em `/catalogs/areas`.
3. Domínios: o seed já traz os seis do PRD §9 (Arquitetura; Desenvolvimento e Integração; Dados; Segurança e Compliance; Infraestrutura e Operação; IA e Automação). Confira em `/catalogs/domains`. Só crie/renomeie se o time realmente usar outro rótulo; não duplique o mesmo conceito com grafia diferente.

### 3.3 Projetos

Cadastre **todas** as iniciativas com participação da Arquitetura que devem ser identificáveis no dia da virada (abertas e, se o time precisar no relatório do ano, as já encerradas no ano corrente). Use `/projects/new`. Status do projeto = status da iniciativa na fonte, não o da atividade.

### 3.4 Atividades abertas

Conjunto mínimo da decisão 12: tudo que na fonte **não** está concluído nem cancelado e ainda é trabalho da equipe.

Para cada linha:

1. `/activities/new` (ou Nova atividade vinculada no projeto).
2. Preencha os campos da §2.3.
3. **Status = situação atual da planilha**, no select de criação.
4. Se a fonte tiver data de início, preencha no formulário de criação. Se o status for Em andamento e a data de início ficar vazia, a aplicação preenche **hoje** (DE-23). Isso não é transição Backlog → Em andamento; é a regra de início automático. Para não perder a data real, **não deixe o início em branco quando a planilha o tiver**.
5. Não arraste o card pelas colunas para “simular o passado”.

### 3.5 Concluídas do ano corrente (somente se necessário)

Ano corrente = ano civil de `hoje` em `America/Sao_Paulo` na data da carga.

Inclua se o gestor precisar do relatório **Este ano** com as demandas já encerradas na planilha. Caso contrário, deixe-as só na planilha de arquivo e aceite que o anual da aplicação começa na virada.

Como carregar **sem** inventar fluxo:

1. Criar com status **Concluído** e a data de início da fonte, se existir. Criar já concluída **não** inventa data de início (DE-09).
2. Abrir a atividade → Editar → preencher **Data de conclusão** com a data da fonte (o campo só aparece na edição quando o status é Concluído). Corrigir data gera auditoria **agora**; não retroage `occurred_at`.
3. Sem data de início na fonte: **não invente**. A atividade fica acessível em Todas / Sem planejamento e pode entrar em I-02 do recorte cuja fechamento já inclui o evento de criação; **não** entra na população de execução (I-01 por interseção) enquanto o início for nulo.

Não carregue concluídas de anos anteriores só para “completar o arquivo”, salvo decisão explícita do responsável — e as mesmas limitações da §5 valem.

### 3.6 Tarefas e entregas

Depois do card existir: checklist no detalhe; entregas na aba Entregas de valor do projeto, se a fonte tiver conteúdo real.

---

## 4. Carga assistida e conferência

**Não existe** importador, job de CSV nem script de carga neste repositório. Carga = cadastro conferido na UI, em dupla ou com checklist impresso/planilha de trabalho (cópia da fonte + coluna “id na aplicação”).

### 4.1 Passos manuais (operador)

1. Abrir a planilha na data de extração anotada e a aplicação na URL combinada.
2. Seguir a ordem da §3. Uma pessoa cadastra; outra marca “ok / divergência”.
3. Anotar o `id` da atividade (visível no CSV e nas URLs `/activities/<id>`) ao lado da linha da fonte.
4. Se a UI recusar (área inativa, usuário inativo, tipo Projeto sem vínculo, datas invertidas, conclusão no futuro), **não** contorne inventando data: corrija o cadastro prévio ou deixe a linha de fora e registre.

### 4.2 Conferência da amostra

Depois da carga, o time escolhe uma amostra da fonte (sugestão: todas as abertas se forem poucas; senão no mínimo 10 ou 20% das carregadas, o que for maior) e confere na UI:

| Checagem | Onde olhar |
| --- | --- |
| Título, área solicitante, projeto, responsável, prioridade | detalhe da atividade |
| Status atual = status da planilha (não um status “intermediário”) | Kanban (estado **atual**) e detalhe |
| Datas de início/conclusão = fonte, se a fonte as tinha | detalhe; edição se precisar corrigir |
| Projeto com participação da Arquitetura aparece na lista | `/projects` (e Relatórios → projetos associados, mesmo recorte) |
| Checklist e entrega, se existiam na fonte | detalhe / aba do projeto |

Divergência: corrigir na UI (fica auditado) ou registrar “não havia na fonte / premissa X”. Não “completar” o card com transições que a planilha não traz.

### 4.3 O que a conferência **não** prova

- Retrato de um mês **anterior** à carga (dashboard daquele mês) — ver §5.
- Cobertura ≥ 90% no uso diário — isso só depois da virada (§7).
- Relatório gerencial em menos de 10 minutos — cronometrar com pessoa real no roteiro U6/U7.

---

## 5. Limitações do histórico importado

A auditoria grava **instantes reais** (`occurred_at`). Dashboard e relatório reconstroem status e dimensões no **fechamento** do período a partir desses eventos (DE-04). A população temporal usa as **datas civis atuais** de execução (DE-03).

Carga pela UI, hoje, produz em geral **um** evento `created` (e depois `field_changed` se alguém editar datas). Isso **não** é o mesmo que ter vivido Backlog em março e Em andamento em abril.

| Situação | O que o sistema faz | O que **não** fazer |
| --- | --- | --- |
| Criar já em Em andamento / Concluído / Bloqueado / … | um `created` com esse status | criar em Backlog e ir arrastando até o status atual para “ficar parecido com o Kanban cheio” |
| Planilha sem coluna de transições datadas | nada a reproduzir | inventar Backlog → A fazer → Em andamento |
| Datas de início/conclusão preenchidas ou corrigidas na UI | entram no intervalo de execução; a correção é auditada **agora** | achar que o retrato de agosto passa a mostrar o status de agosto |
| Atividade criada depois do fechamento do mês consultado | pode entrar em **I-01** se as datas de execução intersectam o mês (DE-03, DE-05); **não** entra em I-02, I-05, I-06, I-07, I-09 nem nas distribuições `D-*` daquele mês (DE-05) | usar o dashboard de um mês pré-virada como se a planilha tivesse sido o Kanban na época |
| Recorte **Este ano** / período cujo fechamento é **agora** (limitado a hoje, DE-02) | o `created` de hoje entra no retrato atual: concluídas carregadas como Concluído contam em I-02 **desse** recorte | prometer o mesmo para cada mês já fechado antes da carga |
| Cancelar na UI | `dataCancelamento` = hoje; estado terminal | carregar canceladas antigas esperando a data original (não há campo de correção de cancelamento na UI) |
| Criado por / histórico da timeline | operador e instante da carga | autor e dia da célula na planilha |

**Cobertura do histórico após a carga:** o Kanban e o relatório a partir da virada são a fonte operacional. Meses anteriores à virada **não** ganham retrato de status fiel, a menos que a planilha tivesse transições **datadas** — e mesmo nesse caso o MVP **não** permite gravar `occurred_at` no passado. Documente na ata da virada: histórico de status mensal começa na data da carga; datas de execução das concluídas do ano, se carregadas, servem à interseção de I-01, não ao retrato mensal pré-virada.

Essa limitação é aceita de propósito: inventar transições mentiria o retrato (decisão 4) e um importador genérico está fora do escopo (decisão 12 / T30).

---

## 6. Roteiro dos cinco usuários

Objetivo: os cinco membros usam o sistema como rotina (PRD §24), não só o operador da carga. Cada um executa os passos abaixo na **mesma URL** combinada (ensaio em homologação e/ou virada em produção). Marque data, URL, nome e ok/falha. Falha de login = parar e voltar ao [oidc.md](oidc.md); não marcar o roteiro como feito.

Papéis iguais no MVP (sem RBAC sofisticado). O gestor faz os mesmos passos operacionais e, além disso, cronometra U6 e U7.

| # | Passo | O que fazer | Ok quando |
| --- | --- | --- | --- |
| U1 | Login SSO | `/login` → Entrar com SSO → shell com Kanban, Projetos, Dashboard, Book, Cadastros | identidade visível; logout existe; quem não está na allowlist **não** entra |
| U2 | Kanban | `/kanban`: ver as seis colunas; filtrar (ex. responsável = eu, Este mês / Todas); abrir um card | o card é uma atividade; não há board por pessoa/projeto |
| U3 | Atualizar status | arrastar o **próprio** card para outro status **real** do trabalho de hoje, ou no detalhe usar Mover para / Reabrir | a coluna persiste ao recarregar; conflito visível se dois editarem o mesmo card; **não** usar este passo para fabricar histórico da planilha |
| U4 | Checklist | no detalhe: adicionar, marcar ou reordenar um item (RN-06/07) | progresso X/Y muda; status da atividade **não** muda sozinho |
| U5 | Entrega de Valor | num projeto real: aba Entregas de valor → Nova entrega de valor (título, Markdown, data de referência) | visualização renderizada; projeto não muda de status sozinho |
| U6 | Dashboard | `/dashboard`, atalho **Este mês** ou **Este ano**; olhar I-01…I-07 e I-09 e as sete distribuições | totais batem com o recorte; tempo de gerar a visão gerencial anotado (meta PRD: menos de 10 min para o relatório gerencial, incluindo o passo seguinte se for o pacote do gestor) |
| U7 | Relatório, Book e CSV | `/reports` e `/reports/executive` com **os mesmos** período/filtros do dashboard → conferir resumo, páginas por área solicitante e **Exportar CSV** | arquivo UTF-8 com BOM abre no Excel/LibreOffice com acentos; colunas (`id`, `título`, `tipo`, `status`, `projeto`, …); CSV é a seleção completa, não só a página |

Complementos da rotina do PRD §24, no mesmo dia ou no dia seguinte:

- cadastrar **uma** atividade nova do trabalho real (não cópia da planilha), ad hoc ou vinculada;
- abrir o histórico da atividade (`/activities/<id>`) e ver o evento da mudança de status com usuário e hora;
- no Kanban, listar cancelados só se precisarem (filtro), sem esperar coluna Cancelado.

Uso **simultâneo** dos cinco (SSE, conflito): registrar o que aconteceu; metas de laboratório em [nfr-validation.md §5](nfr-validation.md#5-cinco-usuários-simultâneos). Não inventar RPS.

Registro (copiar para a ata; preencher na sessão):

| Integrante | Data | URL | U1 | U2 | U3 | U4 | U5 | U6 | U7 | Notas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | | | | | |
| 2 | | | | | | | | | | |
| 3 | | | | | | | | | | |
| 4 | | | | | | | | | | |
| 5 (gestor/líder) | | | | | | | | | | cronômetro relatório |

---

## 7. Checklist de adoção

Preencher **depois** da carga conferida e do roteiro dos cinco. Itens em branco = virada **não** ocorrida.

### 7.1 Data da virada

| Campo | Valor |
| --- | --- |
| Data em que a aplicação passa a ser a **fonte principal** (America/Sao_Paulo) | _pendente_ |
| URL de produção | _pendente_ (T29) |
| A partir dessa data, a planilha | só leitura / arquivo; sem consolidação manual nova (PRD §24) |
| Janela curta em paralelo (opcional) | _se houver, com fim datado; senão “não”_ |

### 7.2 Responsável pela cobertura ≥ 90%

| Campo | Valor |
| --- | --- |
| Nome de quem acompanha a cobertura | _pendente_ |
| O que conta como **atividade relevante** (denominador) | _ex.: abertas na virada + novas demandas da semana; concluídas do ano só se tiverem sido carregadas_ |
| Meta | ≥ 90% das relevantes **registradas e mantidas** na ferramenta (PRD §23) |
| Como medir | conferência periódica (ex. semanal) da lista combinada do time contra o Kanban/Relatórios; **não** usar `npm test` nem o seed |
| Primeira medição (data e %) | _depois da virada_ |

100% dos projetos com participação da Arquitetura identificáveis: conferir `/projects` contra a lista da fonte na virada, não só as atividades.

### 7.3 Relatório gerencial em menos de 10 minutos

| Campo | Valor |
| --- | --- |
| Quem cronometrou | _pendente_ |
| Recorte (Este mês / Este ano) e filtros | _pendente_ |
| Passos cronometrados | Dashboard + Relatórios + Exportar CSV |
| Tempo | _pendente_ — meta: menos de 10 minutos |
| Observação | se o retrato de meses **pré-carga** parecer “vazio” em I-02/distribuições, isso é a §5, não falha do cronômetro |

### 7.4 Porta de saída da planilha

- [ ] Amostra da §4 conferida contra a fonte.
- [ ] Cinco linhas da tabela da §6 preenchidas com ok em U1–U7.
- [ ] Equipe ciente de que não haverá histórico de transições inventadas.
- [ ] Backup/restore de produção alinhado com a infra **antes** de abandonar a planilha como rede de segurança — [backup-restore.md](backup-restore.md). Pendente se T29 não exerceu restore.

---

## 8. Aceite T30 (honesto)

| Critério da task | Estado nesta entrega |
| --- | --- |
| Guia com mapeamento, preparação, carga/conferência, limites históricos, roteiro dos cinco e checklist | **Escrito** (este arquivo) |
| Importador genérico de planilhas | **Fora de escopo**; não implementado |
| Transições históricas ausentes na planilha | **Não inventadas**; limitação documentada na §5 |
| Planilha mapeada com cabeçalhos reais | **Pendente** do responsável |
| Cinco usuários acessam e executam a rotina | **Pendente** (SSO real e pessoas; T07/T10/T29) |
| Projetos com participação da Arquitetura identificáveis | **Pendente** da carga assistida |
| Amostra confere com a fonte | **Pendente** da planilha e da conferência |
| Relatório gerencial em menos de 10 minutos | **Pendente** de cronometragem com pessoa real |
| Data de adoção + dono da cobertura ≥ 90% | **Pendente** da equipe; cobertura mede **uso**, não teste técnico |
| Login CyberArk / cluster de produção validados | **Não** — [production.md](production.md) |
| Login Logto / Vercel validados | **Não** — [homologation.md](homologation.md) |

**Não declarar T30 como “planilha substituída”.** Declarar: o time tem um roteiro reproduzível de adoção e sabe o que a carga **não** reconstrói. A homologação com pessoas reais e a planilha continuam com o responsável pelo projeto.
