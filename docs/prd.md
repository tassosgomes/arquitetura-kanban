PRD — Gestão de Atividades de Arquitetura

Versão: 1.0
Status: Fechado para Tech Spec
Tipo: MVP

1. Visão do Produto

Criar uma aplicação interna para que a equipe de Arquitetura organize, acompanhe e registre seu trabalho por meio de um Kanban adaptado à dinâmica da área.

A solução deverá permitir acompanhar tanto projetos estruturados quanto demandas ad hoc, relacionando cada atividade às áreas da empresa envolvidas e permitindo identificar quando Arquitetura atua como responsável pela entrega ou como participante/contribuidora.

Além da gestão operacional, a ferramenta deverá gerar uma visão consolidada da atuação da Arquitetura para a gestão, permitindo responder perguntas como:

Em que a equipe de Arquitetura trabalhou este ano?

Quais áreas mais demandaram Arquitetura?

Quantas iniciativas tiveram participação da equipe?

Em quais temas atuamos?

O que está em andamento, bloqueado ou aguardando terceiros?

Qual é a distribuição entre iniciativas estratégicas e operacionais?

Em quais iniciativas Arquitetura liderou e em quais apenas contribuiu?

Que valor foi entregue nos projetos acompanhados pela área?

O produto será simultaneamente uma ferramenta de trabalho e uma ferramenta de evidência da atuação da área.

2. Problema

A equipe de Arquitetura possui uma dinâmica multidisciplinar e transversal, participando simultaneamente de projetos, iniciativas corporativas e demandas pontuais de diferentes áreas.

Ferramentas tradicionais de gestão de tarefas não representam adequadamente essa dinâmica ou introduzem complexidade desnecessária.

Atualmente, a ausência de um registro centralizado dificulta:

organizar as atividades da equipe;

visualizar carga e trabalho em andamento;

acompanhar dependências e bloqueios;

identificar as áreas atendidas;

diferenciar projetos de demandas pontuais;

registrar a participação da Arquitetura em iniciativas onde ela não é a responsável principal;

recuperar historicamente o que foi executado;

comunicar à gerência o volume, natureza e relevância das atividades realizadas.

A planilha atual fornece uma boa estrutura conceitual, mas não oferece um fluxo operacional adequado para atualização contínua nem uma visão Kanban eficiente.

3. Objetivo do MVP

Criar uma aplicação interna para a equipe de Arquitetura organizar e registrar sua atuação em projetos e demandas ad hoc por meio de um Kanban único, permitindo simultaneamente acompanhar o trabalho operacional e produzir evidências gerenciais sobre onde, como e com que valor a Arquitetura atuou ao longo do tempo.

O MVP será considerado bem-sucedido quando a aplicação puder substituir a planilha atual como fonte principal de acompanhamento da equipe.

4. Usuários

O MVP será utilizado inicialmente por 5 integrantes da equipe de Arquitetura.

4.1 Membro da equipe

Responsável por cadastrar, atualizar e acompanhar atividades e projetos nos quais participa.

4.2 Gestor / Líder de Arquitetura

Utiliza os mesmos recursos operacionais e também acompanha indicadores consolidados, histórico e relatórios da atuação da equipe.

No MVP, não haverá necessidade de um modelo sofisticado de RBAC. O controle de acesso poderá começar de forma simples e evoluir posteriormente.

5. Modelo Conceitual

Área

Projeto / Iniciativa (opcional)
├── Entregas de Valor
└── Atividades
      └── Tarefas

Atividade sem Projeto
└── Demanda Ad hoc

A unidade principal do Kanban será sempre a Atividade.

Projetos organizam contexto e iniciativas maiores. Tarefas permitem decompor atividades quando necessário. Entregas de Valor registram qualitativamente o resultado da atuação da Arquitetura.

6. Conceitos Principais

6.1 Projeto / Iniciativa

Representa uma iniciativa maior na qual a Arquitetura participa.

Pode conter várias atividades e várias Entregas de Valor.

6.2 Atividade

É a unidade principal de trabalho e o card do Kanban.

Pode estar vinculada a um projeto ou existir isoladamente como demanda ad hoc.

6.3 Tarefa

Representa uma decomposição opcional de uma atividade.

No MVP, funciona como um checklist simples, sem workflow independente.

6.4 Entrega de Valor

Registro qualitativo ligado a um projeto, usado para documentar resultados, decisões, benefícios, entregas e impactos gerados pela atuação da Arquitetura.

O conteúdo será armazenado em Markdown.

6.5 Área

Representa uma área da empresa e deverá ser uma entidade cadastrável, não apenas um texto livre.

7. Estrutura de Projeto

Campo

Regra

Nome

Obrigatório

Descrição

Opcional

Área responsável

Obrigatório

Responsável externo

Opcional

Responsável

Grupo virtual fixo: Arquitetura

Participantes

Opcional, múltiplos

Papel da Arquitetura

Responsável / Contribuidor

Natureza

Estratégico / Operacional

Data de início

Opcional

Previsão de término

Opcional

Status

Planejado / Em andamento / Concluído / Cancelado

O status do projeto será independente do status das atividades relacionadas.

8. Estrutura da Atividade

Campo

Regra no MVP

Título

Obrigatório

Descrição

Opcional

Tipo

Projeto / Ad hoc

Projeto/Iniciativa

Obrigatório se Tipo = Projeto

Área solicitante

Obrigatório

Áreas envolvidas

Opcional, múltiplas

Natureza

Estratégica / Operacional

Domínio

Obrigatório

Papel da Arquitetura

Responsável / Contribuidor

Responsável

Um membro principal

Participantes

Zero ou mais

Prioridade

Baixa / Média / Alta / Crítica

Esforço

Opcional: P / M / G

Status

Status do Kanban

Data de início

Opcional

Previsão de término

Opcional

Data de conclusão

Automática ao concluir

Tarefas

Zero ou mais

Observações

Opcional

Criado por / em

Automático

Atualizado por / em

Automático

9. Domínios de Arquitetura

O MVP deverá permitir classificar atividades por domínio.

Categorias iniciais:

Arquitetura;

Desenvolvimento e Integração;

Dados;

Segurança e Compliance;

Infraestrutura e Operação;

IA e Automação.

Essas categorias deverão ser tratadas como cadastro configurável sempre que tecnicamente viável.

10. Tarefas

Uma atividade poderá conter zero ou mais tarefas.

No MVP, cada tarefa terá apenas:

descrição;

status concluída / não concluída;

ordem.

Exemplo:

[x] Levantar integrações existentes
[x] Validar requisitos
[ ] Elaborar diagrama
[ ] Revisar com Segurança
[ ] Apresentar proposta

O sistema poderá exibir o progresso como 3/5, mas a conclusão das tarefas não deverá concluir automaticamente a atividade.

11. Entregas de Valor

Um projeto poderá possuir zero ou mais Entregas de Valor.

Cada Entrega de Valor terá:

Campo

Regra

Título

Obrigatório

Conteúdo Markdown

Obrigatório

Data de referência

Obrigatório

Autor

Automático

Criado em

Automático

Atualizado em

Automático

Exemplo:

# Revisão da arquitetura de integração

## Contexto

Foi realizada a avaliação da proposta de integração do novo ERP.

## Atuação da Arquitetura

- Revisão das integrações propostas
- Definição do padrão de APIs
- Avaliação dos requisitos de observabilidade
- Architecture Review com fornecedor

## Valor entregue

A arquitetura proposta eliminou integrações ponto a ponto e definiu
um padrão reutilizável para os demais sistemas corporativos.

A interface deverá possuir, no mínimo, modo de edição e modo de visualização renderizada.

12. Workflow da Atividade

O fluxo padrão será:

Backlog
   ↓
A fazer
   ↓
Em andamento
   ├── Aguardando retorno
   ├── Bloqueado
   ↓
Concluído

Cancelado será um estado terminal acessível a partir de qualquer outro status, mas não ocupará uma coluna padrão do Kanban.

Uma atividade poderá retornar entre estados.

Exemplo:

Em andamento
     ↓
Aguardando retorno
     ↓
Em andamento
     ↓
Concluído

Toda alteração de status deverá gerar evento de histórico.

13. Board Kanban

O sistema terá um único board Kanban para toda a equipe.

Não existirão boards separados por:

semana;

mês;

área;

projeto;

arquiteto.

Essas dimensões serão tratadas por filtros sobre o mesmo conjunto de cards.

13.1 Colunas

Backlog

A fazer

Em andamento

Aguardando retorno

Bloqueado

Concluído

Cancelado será acessível por filtro/histórico.

13.2 Card

O card deverá apresentar apenas informações essenciais.

Exemplo:

┌───────────────────────────────────┐
│ Definir arquitetura de integração │
│ Implantação ERP                   │
│                                   │
│ Financeiro · João                 │
│ Alta · M · Contribuidor           │
│                                   │
│ ☑ 3/5                 📅 30/09    │
└───────────────────────────────────┘

Ao abrir o card, o usuário terá acesso ao conjunto completo de informações.

13.3 Drag and Drop

O usuário poderá mover atividades entre colunas por drag and drop.

A movimentação deverá alterar o status da atividade e registrar a mudança no histórico.

14. Filtros

O Kanban deverá oferecer filtros por:

período;

área;

projeto;

responsável;

participante;

domínio;

natureza;

prioridade;

papel da Arquitetura;

esforço;

status.

O MVP poderá oferecer atalhos predefinidos como:

Todas;

Minha semana;

Este mês;

Bloqueadas.

Visões personalizadas salvas ficam como evolução futura.

15. Temporalidade

Semana, mês, trimestre e ano serão dimensões de visualização, e não entidades cadastradas.

O sistema deverá utilizar datas das atividades para determinar se elas pertencem a um período.

Uma atividade iniciada em 25/08 e concluída em 18/09 deverá aparecer tanto nas consultas de agosto quanto de setembro.

15.1 Regra de interseção

Uma atividade pertence a um período quando seu intervalo de execução possui interseção com o intervalo consultado.

Filtros de período deverão suportar:

esta semana;

semana passada;

este mês;

mês passado;

este trimestre;

este ano;

período personalizado.

Atividades sem data de início poderão permanecer acessíveis no Backlog e em uma opção como Sem planejamento.

16. Histórico e Auditoria

O sistema deverá registrar alterações relevantes para permitir rastreabilidade e reconstrução histórica.

No MVP, registrar pelo menos:

criação da atividade;

mudança de status;

mudança de responsável;

mudança de prioridade;

alteração de datas;

conclusão;

cancelamento.

Exemplo:

10/09 — atividade criada por Carlos
11/09 — Backlog → Em andamento
13/09 — responsável alterado para Ana
18/09 — Em andamento → Aguardando retorno
23/09 — Aguardando retorno → Concluído

17. Página do Projeto

A página do projeto deverá concentrar o contexto da iniciativa.

Estrutura sugerida:

Projeto: Implantação ERP

[Visão geral] [Atividades] [Entregas de valor] [Histórico]

Visão geral

Metadados do projeto.

Atividades

Todas as atividades relacionadas ao projeto.

Entregas de valor

Relatórios Markdown vinculados ao projeto.

Histórico

Principais eventos relacionados ao projeto.

18. Dashboard Gerencial

A Dashboard deverá responder principalmente:

Quanto estamos fazendo? Onde estamos atuando? Em que situação está o trabalho?

Indicadores iniciais:

Indicador

Exemplo

Atividades no período

127

Atividades concluídas

84

Projetos atendidos

32

Áreas atendidas

14

Em andamento

18

Aguardando retorno

7

Bloqueadas

3

Análises deverão incluir:

atuação por área;

atuação por domínio;

atuação por responsável;

estratégico x operacional;

projeto x ad hoc;

responsável x contribuidor;

distribuição de esforço P/M/G.

Todos os indicadores deverão responder ao filtro temporal selecionado.

19. Relatórios

A Dashboard deverá responder:

Como estamos?

O relatório deverá responder:

O que fizemos?

Exemplo de visão anual:

Atuação da Arquitetura — 2026

152 atividades
41 projetos
17 áreas atendidas
94 atividades concluídas
58 atividades em andamento no período

O relatório deverá permitir consulta detalhada das atividades e exportação.

No MVP, a exportação deverá suportar pelo menos:

CSV; ou

XLSX.

A consolidação automática das principais Entregas de Valor poderá ser adicionada posteriormente.

20. Épicos do MVP

ID

Épico

Objetivo

EP-01

Acesso

Permitir que os membros da equipe utilizem o sistema via SSO

EP-02

Cadastros

Manter áreas, domínios e demais classificações necessárias

EP-03

Projetos

Registrar iniciativas com participação da Arquitetura

EP-04

Entregas de Valor

Registrar resultados qualitativos associados aos projetos

EP-05

Atividades

Criar e administrar o trabalho executado pela equipe

EP-06

Tarefas

Decompor atividades maiores em checklists

EP-07

Kanban

Acompanhar visualmente o fluxo das atividades

EP-08

Filtros e Períodos

Segmentar a visão operacional sem criar múltiplos boards

EP-09

Dashboard

Exibir indicadores gerenciais

EP-10

Relatórios

Consultar e exportar histórico de atuação

EP-11

Histórico

Manter rastreabilidade das principais alterações

21. Histórias de Usuário

ID

História

Critérios principais

US-01

Como membro da Arquitetura, quero acessar a aplicação utilizando minha identidade corporativa

Usuário autenticado via SSO; somente usuários autorizados têm acesso

US-02

Como usuário, quero cadastrar áreas da empresa

Nome obrigatório; não permitir duplicidades ativas

US-03

Como usuário, quero cadastrar um projeto

Deve permitir nome, descrição, área responsável, responsável externo, grupo responsável fixo Arquitetura, participantes, natureza, papel da Arquitetura, datas e status; todos os usuários ativos começam marcados como participantes

US-04

Como usuário, quero visualizar todas as atividades de um projeto

Página do projeto apresenta suas atividades relacionadas

US-05

Como usuário, quero registrar uma Entrega de Valor

Deve possuir título, conteúdo Markdown, data de referência e vínculo obrigatório com projeto

US-06

Como usuário, quero visualizar o Markdown renderizado

Conteúdo deve possuir modo de edição e modo de visualização

US-07

Como usuário, quero criar uma atividade

Deve ser possível criar atividade vinculada a projeto ou como ad hoc

US-08

Como usuário, quero atribuir responsáveis e participantes

Atividade possui um responsável principal e zero ou mais participantes

US-09

Como usuário, quero classificar a atividade

Deve permitir área, domínio, natureza, papel, prioridade e esforço P/M/G opcional

US-10

Como usuário, quero dividir uma atividade em tarefas

Atividade aceita zero ou mais itens de checklist ordenáveis

US-11

Como usuário, quero mover atividades pelo Kanban

Drag-and-drop altera o status da atividade

US-12

Como usuário, quero colocar uma atividade como aguardando retorno ou bloqueada

Ambos devem ser status independentes e registrados no histórico

US-13

Como usuário, quero cancelar uma atividade

Cancelamento deve permanecer registrado, mas não ocupar uma coluna padrão do board

US-14

Como usuário, quero filtrar o Kanban

Filtros devem atuar sobre o mesmo board sem criar boards independentes

US-15

Como usuário, quero visualizar atividades por período

Deve suportar semana, mês, trimestre, ano e intervalo personalizado

US-16

Como gestor, quero visualizar indicadores consolidados

Dashboard deve refletir os filtros/período selecionados

US-17

Como gestor, quero consultar o trabalho realizado durante um período

Relatório deve apresentar atividades e projetos relacionados ao intervalo

US-18

Como gestor, quero exportar os dados

Relatório deverá ser exportável pelo menos para CSV ou XLSX

US-19

Como usuário, quero consultar o histórico de uma atividade

Alterações relevantes devem apresentar data, usuário e mudança realizada

22. Regras de Negócio

Regra

Definição

RN-01

Existirá apenas um Kanban para a equipe

RN-02

Cada card do Kanban representa uma Atividade

RN-03

Uma atividade pode estar vinculada a um Projeto ou ser Ad hoc

RN-04

Uma atividade possui exatamente um responsável principal

RN-05

Uma atividade pode possuir zero ou mais participantes

RN-06

Uma atividade pode possuir zero ou mais tarefas

RN-07

Tarefas são checklists simples e não possuem workflow independente no MVP

RN-08

Semana, mês, trimestre e ano são dimensões de visualização, não cadastros

RN-09

O período de atividade é inferido a partir de suas datas

RN-10

Cancelado é status terminal, mas não é coluna padrão do Kanban

RN-11

Projeto possui status independente das suas atividades

RN-12

Natureza e papel da Arquitetura podem existir em Projeto e Atividade

RN-13

Ao criar atividade vinculada a projeto, participantes, natureza, papel e área solicitante poderão ser herdados do projeto e alterados posteriormente; o responsável individual começa com o usuário criador e não é herdado do projeto

RN-14

Esforço P/M/G é opcional

RN-15

Projeto pode possuir zero ou mais Entregas de Valor

RN-16

Cada Entrega de Valor pertence obrigatoriamente a um único Projeto

RN-17

Conteúdo de Entrega de Valor será armazenado em Markdown

RN-18

Criação ou edição de Entrega de Valor não altera automaticamente o Projeto

RN-19

Alterações relevantes deverão produzir registros de auditoria

RN-20

O número de tarefas concluídas poderá gerar indicador X/Y, mas não determinará automaticamente a conclusão da atividade

23. Critérios de Sucesso

O sucesso do MVP não será medido principalmente por quantidade de cards criados.

O objetivo é que a aplicação se torne a fonte única de acompanhamento da atuação da equipe.

Métricas sugeridas:

≥ 90% das atividades relevantes registradas na ferramenta;

100% dos projetos com participação da Arquitetura identificáveis no sistema;

geração de relatório mensal/gerencial em menos de 10 minutos;

redução ou eliminação da consolidação manual da planilha.

24. Critério de Conclusão do MVP

O MVP estará funcionalmente pronto quando os cinco membros da equipe conseguirem utilizar o sistema como rotina diária para:

cadastrar projetos e atividades;

organizar o trabalho pelo Kanban;

acompanhar tarefas;

registrar Entregas de Valor;

filtrar o trabalho por período e demais dimensões;

consultar histórico;

visualizar indicadores gerenciais;

gerar relatórios;

exportar dados;

sem depender da consolidação manual da planilha atual.

25. Fora do Escopo do MVP

Ficam inicialmente fora:

integração com Jira;

integração com Azure DevOps;

notificações por e-mail ou Teams;

comentários e menções;

anexos;

subtarefas com workflow próprio;

dependências sofisticadas;

planejamento de capacidade;

timesheet;

gestão financeira;

OKRs;

gestão completa de sprints;

customização livre de workflow;

permissões sofisticadas;

automações do tipo “se X então Y”;

aplicativo mobile;

views personalizadas salvas;

PDF executivo automático;

templates obrigatórios para Entregas de Valor.

26. Requisitos Não Funcionais

O MVP deverá considerar:

interface responsiva para uso em desktop e notebook;

autenticação corporativa via SSO;

persistência relacional;

histórico/auditoria das alterações relevantes;

boa performance para o volume esperado de uma equipe de 5 usuários;

proteção adequada das rotas autenticadas;

renderização segura de Markdown;

processo automatizado de build e deploy;

manutenibilidade do código;

possibilidade de evolução futura sem dependência da planilha atual.

27. Decisões Técnicas Preliminares

Estas decisões ficam registradas no PRD, mas seu detalhamento pertence ao Tech Spec.

Tema

Decisão preliminar

Aplicação

Next.js

UI

Tailwind CSS

Banco

PostgreSQL

Autenticação

SSO

CI/CD

GitHub Actions

Ficam para o Tech Spec:

ORM;

arquitetura do Next.js;

provedor e fluxo de SSO;

estratégia de API / Server Actions;

modelo relacional;

migrations;

segurança;

observabilidade;

estratégia de branches;

ambientes;

pipeline;

deploy;

testes;

biblioteca de drag and drop;

estratégia de renderização de Markdown.

28. Riscos

Complexidade excessiva

Há risco de o produto interno reproduzir a complexidade das ferramentas que motivaram a criação de uma solução própria.

Mitigação: manter o MVP deliberadamente simples e validar novas funcionalidades com uso real.

Baixa disciplina de atualização

Indicadores e relatórios só serão confiáveis se as atividades forem mantidas atualizadas.

Mitigação: reduzir o número de campos obrigatórios e tornar a atualização pelo Kanban rápida.

Excesso de granularidade

Transformar cada pequena ação em atividade pode gerar ruído.

Mitigação: manter tarefas como checklist dentro das atividades.

Classificações inconsistentes

Áreas, domínios e demais categorias livres podem prejudicar os relatórios.

Mitigação: utilizar cadastros controlados sempre que possível.

Relatórios historicamente incorretos

Consultar apenas o estado atual pode impedir reconstrução da atuação em períodos anteriores.

Mitigação: registrar eventos relevantes desde o MVP.

29. Evoluções Futuras

Possíveis evoluções após validação do MVP:

views personalizadas e salvas;

templates de Entrega de Valor;

relatório executivo em PDF;

consolidação automática das Entregas de Valor;

comentários e menções;

anexos;

integrações com ferramentas corporativas;

notificações;

métricas de lead time;

métricas de tempo bloqueado;

capacidade da equipe;

indicadores históricos comparativos;

automações de workflow;

busca avançada;

API para integrações externas.

30. Resumo das Decisões de Produto

O MVP terá:

um único Kanban;

Atividade como card;

Projeto opcional;

demandas ad hoc;

tarefas opcionais em formato checklist;

responsável principal e múltiplos participantes;

classificação por área, domínio, natureza, papel, prioridade e esforço;

esforço P/M/G opcional;

filtros por semana, mês, trimestre, ano e intervalo customizado;

períodos como visualização, não como entidades;

status Backlog, A fazer, Em andamento, Aguardando retorno, Bloqueado e Concluído;

Cancelado como estado terminal;

histórico de alterações;

projetos com responsável externo;

Entregas de Valor em Markdown vinculadas a projetos;

dashboard gerencial;

relatórios por período;

exportação CSV/XLSX;

autenticação SSO.

31. Status do Documento

PRD v1.0 — Fechado para Tech Spec.
