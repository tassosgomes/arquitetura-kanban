# Fixtures temporais T02

Contrato: `docs/domain-rules.md`  
Consumidores previstos: T14 (transições/datas), T19 (pertinência/fuso), T25 (retrato/indicadores).  
Formato: cada FX é um caso de teste. Datas civis em `America/Sao_Paulo`. Instantes em ISO-8601 com offset.

## Convenções

- Relógio padrão: `agora = 2026-09-10T15:00:00-03:00` (`hoje = 2026-09-10`, quinta-feira).
- Quando o cenário exige conclusão em 18/09, a fixture declara outro `agora`.
- Universo: somente as atividades listadas em `atividades` (mais cadastros mínimos).
- População `P` = resultado de `consulta_temporal` no `modo` indicado, **sem** outros filtros, salvo `filtros`.
- `status*` / `dim*` = retrato em `fechamento_exclusivo` do período.
- Indicadores: valores esperados **nesse universo**. `—` = não aplicável ao recorte.
- IDs de área/projeto/usuário são estáveis para asserts.

### Cadastros compartilhados

```text
usuarios:
  u-ana: Ana
  u-carlos: Carlos

areas:
  ar-fin: Financeiro
  ar-ti: TI
  ar-rh: RH
  ar-ops: Operações

dominios:
  d-arq: Arquitetura

projetos:
  p-erp: Implantação ERP          (não cancelado)
  p-data: Plataforma de Dados     (não cancelado)
```

### Períodos resolvidos no relógio padrão

| id período | modo | inicioPeriodo | fimPeriodo | fechamento_exclusivo |
| --- | --- | --- | --- | --- |
| `esta-semana` | PERIODO | 2026-09-07 | 2026-09-13 | 2026-09-10T15:00:00-03:00 |
| `semana-passada` | PERIODO | 2026-08-31 | 2026-09-06 | 2026-09-07T00:00:00-03:00 |
| `este-mes` | PERIODO | 2026-09-01 | 2026-09-30 | 2026-09-10T15:00:00-03:00 |
| `mes-passado` | PERIODO | 2026-08-01 | 2026-08-31 | 2026-09-01T00:00:00-03:00 |
| `este-trimestre` | PERIODO | 2026-07-01 | 2026-09-30 | 2026-09-10T15:00:00-03:00 |
| `este-ano` | PERIODO | 2026-01-01 | 2026-12-31 | 2026-09-10T15:00:00-03:00 |
| `ago-2026` | PERIODO | 2026-08-01 | 2026-08-31 | 2026-09-01T00:00:00-03:00 |
| `set-2026` | PERIODO | 2026-09-01 | 2026-09-30 | min(início 01/10, agora) |
| `todas` | TODAS | — | — | agora |
| `sem-planejamento` | SEM_PLANEJAMENTO | — | — | agora |

---

## FX-01 — Atividade agosto–setembro (canônico)

Cobre: exemplo obrigatório 1 e 7 (interseção vs retrato).

```text
id: FX-01
agora: 2026-09-20T12:00:00-03:00
atividade: a-ago-set
  tipo: Ad hoc
  solicitante: ar-fin
  envolvidas: []
  dominio: d-arq
  natureza: Operacional
  papel: Responsável
  responsavel: u-ana
  esforco: M
  dataInicio: 2026-08-25          # preenchida na 1ª entrada em Em andamento
  previsaoTermino: 2026-09-10     # NÃO encerra execução
  dataConclusao: 2026-09-18
  dataCancelamento: null
  statusAtual: Concluído
eventos:
  - { at: 2026-08-20T10:00:00-03:00, tipo: created, status: Backlog, responsavel: u-ana }
  - { at: 2026-08-25T09:00:00-03:00, tipo: status, de: Backlog, para: Em andamento }
      efeitoDatas: dataInicio := 2026-08-25
  - { at: 2026-09-18T16:00:00-03:00, tipo: status, de: Em andamento, para: Concluído }
      efeitoDatas: dataConclusao := 2026-09-18
intervaloExecucaoAtual: [2026-08-25, 2026-09-18]
```

| consulta | em P? | intervalo ∩ período | status* | Kanban coluna (atual) | I-01 | I-02 | I-05 | I-09 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ago-2026` | sim | [25/08, 31/08] | Em andamento | Concluído | 1 | 0 | 1 | 0 |
| `set-2026` | sim | [01/09, 18/09] | Concluído | Concluído | 1 | 1 | 0 | 0 |
| `out-2026` (01–31/10), agora 20/09 **ou** após | não | vazio | — | — | 0 | 0 | 0 | 0 |
| `todas` | sim | — | (não aplica retrato de período) | Concluído | — | — | — | — |
| `sem-planejamento` | não | — | — | — | — | — | — | — |

Notas de assert:

- `previsaoTermino = 2026-09-10` **não** corta o intervalo em 10/09.
- Filtro Kanban `ago-2026` mostra o card na coluna **Concluído** (DE-24), não em Em andamento.
- Dashboard `ago-2026` conta a atividade em **I-05**, não em **I-02**.

Variante no relógio padrão (ainda não concluída):

```text
id: FX-01b
agora: 2026-09-10T15:00:00-03:00
# mesmos eventos até 25/08; evento de 18/09 ainda não ocorreu
statusAtual: Em andamento
dataConclusao: null
intervaloExecucaoAtual: [2026-08-25, 2026-09-10]
```

| consulta | em P? | status* | I-02 | I-05 |
| --- | --- | --- | --- | --- |
| `ago-2026` | sim | Em andamento | 0 | 1 |
| `set-2026` / `este-mes` | sim | Em andamento | 0 | 1 |

---

## FX-02 — Sem data de início

Cobre: exemplo obrigatório 2.

```text
id: FX-02
agora: 2026-09-10T15:00:00-03:00
atividade: a-sem-inicio
  tipo: Ad hoc
  solicitante: ar-ti
  responsavel: u-carlos
  esforco: null
  dataInicio: null
  dataConclusao: null
  statusAtual: A fazer
eventos:
  - { at: 2026-08-15T11:00:00-03:00, tipo: created, status: Backlog }
  - { at: 2026-08-16T09:00:00-03:00, tipo: status, de: Backlog, para: A fazer }
intervaloExecucaoAtual: nulo
```

| consulta | em P? | I-01 |
| --- | --- | --- |
| `ago-2026` | não | 0 |
| `este-mes` | não | 0 |
| `este-ano` | não | 0 |
| `sem-planejamento` | sim | (não é I-01 de período) |
| `todas` | sim | — |

A atividade **não** incrementa `I-01`…`I-09` de nenhum período em modo `PERIODO`.

---

## FX-03 — Aberta (ainda em execução) no período

Cobre: exemplo obrigatório 3.

```text
id: FX-03
agora: 2026-09-10T15:00:00-03:00
atividade: a-aberta
  tipo: Projeto
  projetoId: p-erp
  solicitante: ar-fin
  envolvidas: [ar-ti]
  responsavel: u-ana
  esforco: P
  dataInicio: 2026-09-01
  previsaoTermino: 2026-08-30      # vencida; ignorar para execução
  statusAtual: Em andamento
eventos:
  - { at: 2026-09-01T08:00:00-03:00, tipo: created, status: Em andamento }
      efeitoDatas: dataInicio := 2026-09-01
intervaloExecucaoAtual: [2026-09-01, 2026-09-10]
```

| consulta | em P? | status* | I-01 | I-02 | I-03 | I-04 | I-05 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `este-mes` | sim | Em andamento | 1 | 0 | 1 | 2 | 1 |
| `mes-passado` | não | — | 0 | 0 | 0 | 0 | 0 |
| `esta-semana` | sim | Em andamento | 1 | 0 | 1 | 2 | 1 |
| `semana-passada` | não | — | 0 | 0 | 0 | 0 | 0 |

`previsaoTermino` no passado **não** fecha o intervalo em 30/08 (se fechasse, a atividade cairia em agosto — regressão).

---

## FX-04 — Concluída no mês

Cobre: exemplo obrigatório 4.

```text
id: FX-04
agora: 2026-09-10T15:00:00-03:00
atividade: a-concluida-ago
  tipo: Ad hoc
  solicitante: ar-rh
  responsavel: u-carlos
  esforco: G
  dataInicio: 2026-08-02
  dataConclusao: 2026-08-20
  statusAtual: Concluído
eventos:
  - { at: 2026-08-02T09:00:00-03:00, tipo: created, status: Em andamento, efeitoDatas: dataInicio := 2026-08-02 }
  - { at: 2026-08-20T17:00:00-03:00, tipo: status, de: Em andamento, para: Concluído, efeitoDatas: dataConclusao := 2026-08-20 }
intervaloExecucaoAtual: [2026-08-02, 2026-08-20]
```

| consulta | em P? | status* | I-01 | I-02 | I-05 |
| --- | --- | --- | --- | --- | --- |
| `mes-passado` / `ago-2026` | sim | Concluído | 1 | 1 | 0 |
| `este-mes` | não | — | 0 | 0 | 0 |
| `este-ano` | sim | Concluído | 1 | 1 | 0 |

---

## FX-05 — Reaberta (agosto concluída, setembro reaberta)

Cobre: exemplo obrigatório 5.

```text
id: FX-05
agora: 2026-09-10T15:00:00-03:00
atividade: a-reaberta
  tipo: Ad hoc
  solicitante: ar-ops
  responsavel: u-ana
  esforco: M
  dataInicio: 2026-08-01          # preservado
  dataConclusao: null             # limpa na reabertura
  statusAtual: Em andamento
eventos:
  - { at: 2026-08-01T09:00:00-03:00, tipo: created, status: Em andamento, efeitoDatas: dataInicio := 2026-08-01 }
  - { at: 2026-08-20T18:00:00-03:00, tipo: status, de: Em andamento, para: Concluído, efeitoDatas: dataConclusao := 2026-08-20 }
  - { at: 2026-09-05T10:00:00-03:00, tipo: status, de: Concluído, para: Em andamento, reabertura: true, efeitoDatas: dataConclusao := null }
intervaloExecucaoAtual: [2026-08-01, 2026-09-10]
```

| consulta | em P? | status* | I-01 | I-02 | I-05 | notas |
| --- | --- | --- | --- | --- | --- | --- |
| `ago-2026` | sim | Concluído | 1 | 1 | 0 | conclusão histórica intacta |
| `set-2026` / `este-mes` | sim | Em andamento | 1 | 0 | 1 | não conta como concluída |
| `este-ano` | sim | Em andamento | 1 | 0 | 1 | fechamento = agora, já reaberta |

Asserts T14:

- Evento de 20/08 permanece na timeline.
- `dataInicio` não muda em 05/09.
- Segunda entrada em Em andamento **não** sobrescreve início.
- Contar `a-reaberta` **uma** vez em cada `P` (não duas por ter concluído e reaberto).

---

## FX-06 — Cancelada (terminal) e totais

Cobre: exemplos obrigatórios 6 e 12.

```text
id: FX-06
agora: 2026-09-10T15:00:00-03:00
atividade: a-cancelada
  tipo: Projeto
  projetoId: p-data
  solicitante: ar-ti
  envolvidas: [ar-fin]
  responsavel: u-carlos
  esforco: P
  dataInicio: 2026-08-10
  dataCancelamento: 2026-08-20
  statusAtual: Cancelado
eventos:
  - { at: 2026-08-10T09:00:00-03:00, tipo: created, status: Em andamento, efeitoDatas: dataInicio := 2026-08-10 }
  - { at: 2026-08-20T14:00:00-03:00, tipo: status, de: Em andamento, para: Cancelado, efeitoDatas: dataCancelamento := 2026-08-20 }
intervaloExecucaoAtual: [2026-08-10, 2026-08-20]
transicoesPosteriores: todas rejeitadas (RN-10)
```

| consulta | em P? | status* | I-01 | I-02 | I-03 | I-04 | I-05 | I-09 | D-TIPO | D-AREA |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ago-2026` | sim | Cancelado | 1 | 0 | 1 | 2 | 0 | 1 | Projeto=1 | ar-ti=1, ar-fin=1 |
| `este-mes` | não | — | 0 | 0 | 0 | 0 | 0 | 0 | — | — |

Kanban: não aparece em coluna padrão; aparece na lista/filtro de cancelados se a pertinência ou `Todas` incluir.

### FX-06b — Cancelada sem início (Backlog)

```text
id: FX-06b
atividade: a-cancel-backlog
  dataInicio: null
  dataCancelamento: 2026-08-12
  statusAtual: Cancelado
eventos:
  - { at: 2026-08-11T09:00:00-03:00, tipo: created, status: Backlog }
  - { at: 2026-08-12T09:00:00-03:00, tipo: status, de: Backlog, para: Cancelado }
intervaloExecucaoAtual: nulo
```

| consulta | em P? |
| --- | --- |
| `ago-2026` | não |
| `sem-planejamento` | sim |
| `todas` | sim |

Não incrementa `I-01` de agosto.

### FX-06c — Mix concluída + cancelada nos totais

Universo = `{a-concluida-ago (FX-04), a-cancelada (FX-06)}`. `agora` padrão. Consulta `ago-2026`.

| métrica | esperado |
| --- | --- |
| I-01 | 2 |
| I-02 | 1 |
| I-05 | 0 |
| I-09 | 1 |
| I-03 | 1 (só p-data; FX-04 é ad hoc) |
| D-ESFORCO | G=1, P=1 |

---

## FX-07 — Interseção de execução vs situação histórica no fechamento

Cobre: exemplo obrigatório 7 (explícito). Reusa `a-ago-set` de FX-01 com `agora = 2026-09-20T12:00:00-03:00`.

Duas perguntas independentes; testes separados.

```text
id: FX-07-pertinencia
funcao: pertence_ao_periodo
casos:
  - { periodo: ago-2026, esperado: true }
  - { periodo: set-2026, esperado: true }
  - { periodo: jul-2026, esperado: false }
  - { periodo: out-2026, esperado: false }

id: FX-07-retrato
funcao: status_no_fechamento
casos:
  - { periodo: ago-2026, esperado: Em andamento }
  - { periodo: set-2026, esperado: Concluído }

id: FX-07-kanban
funcao: coluna_atual
casos:
  - { periodoFiltro: ago-2026, esperadoColuna: Concluído }
  - { periodoFiltro: set-2026, esperadoColuna: Concluído }
```

Falha típica a impedir: usar status atual como retrato de agosto, ou usar retrato para escolher a coluna do board.

---

## FX-08 — Correção retroativa de datas

Cobre: exemplo obrigatório 8.

```text
id: FX-08
agora: 2026-09-10T15:00:00-03:00
atividade: a-corrigida
  # estado ATUAL (após correção)
  dataInicio: 2026-08-25
  dataConclusao: 2026-09-05
  statusAtual: Concluído
eventos:
  - { at: 2026-09-01T09:00:00-03:00, tipo: created, status: Em andamento,
      snapshotDatas: { dataInicio: 2026-09-01 } }
  - { at: 2026-09-05T17:00:00-03:00, tipo: status, de: Em andamento, para: Concluído,
      efeitoDatas: dataConclusao := 2026-09-05 }
  - { at: 2026-09-10T11:00:00-03:00, tipo: datas, campo: dataInicio,
      de: 2026-09-01, para: 2026-08-25, ator: u-ana }
intervaloExecucaoAtual: [2026-08-25, 2026-09-05]
```

| instante da consulta | consulta | em P? | I-01 | nota |
| --- | --- | --- | --- | --- |
| após 10/09 11:00 | `ago-2026` | sim | 1 | correção altera relatório passado |
| após 10/09 11:00 | `set-2026` | sim | 1 | |
| (hipótese) antes da correção | `ago-2026` | não | 0 | MVP **não** guarda essa versão; só a linha atual importa |

Asserts:

- Evento de correção tem autor `u-ana`, `occurred_at = 2026-09-10T11:00:00-03:00`, anterior/novo.
- Retrato de agosto: created está **depois** do fechamento de agosto (`2026-09-01T00:00:00-03:00`) → `status* = AUSENTE` (DE-05).
- Portanto em `ago-2026`: `I-01 = 1`, `I-02 = 0`, `I-05 = 0`, atividade **fora** de `D-*`.
- Retrato de setembro (fechamento = agora): `status* = Concluído`, `I-02 = 1`.

Não criar tabela `report_snapshot` nem arquivo versionado.

---

## FX-09 — Dimensões históricas (responsável Ana → Carlos)

Cobre: exemplo obrigatório 9. A mesma regra vale para as demais dimensões.

```text
id: FX-09
agora: 2026-09-10T15:00:00-03:00
atividade: a-troca-resp
  dataInicio: 2026-08-10
  dataConclusao: null
  statusAtual: Em andamento
  responsavelAtual: u-carlos
eventos:
  - { at: 2026-08-10T09:00:00-03:00, tipo: created, status: Em andamento, responsavel: u-ana,
      efeitoDatas: dataInicio := 2026-08-10 }
  - { at: 2026-09-05T09:00:00-03:00, tipo: dimensao, campo: responsavel, de: u-ana, para: u-carlos }
intervaloExecucaoAtual: [2026-08-10, 2026-09-10]
```

| consulta | em P? | responsavel* | D-RESPONSAVEL | filtro retrato Ana | filtro retrato Carlos | filtro Kanban Carlos |
| --- | --- | --- | --- | --- | --- | --- |
| `ago-2026` | sim | u-ana | Ana=1, Carlos=0 | inclui | exclui | (Kanban usa atual) inclui |
| `este-mes` | sim | u-carlos | Ana=0, Carlos=1 | exclui | inclui | inclui |

Kanban com filtro de período `ago-2026` **e** responsável atual Carlos: o card **aparece** (dimensão atual). Dashboard agosto + responsável Carlos: **não** aparece.

### FX-09b — Área solicitante trocada em setembro

```text
id: FX-09b
# mesma linha do tempo de execução de FX-09
eventosExtras:
  - { at: 2026-09-06T09:00:00-03:00, tipo: dimensao, campo: areaSolicitante, de: ar-fin, para: ar-rh }
```

| consulta | areaSolicitante* | I-04 (só esta atividade, sem envolvidas) |
| --- | --- | --- |
| `ago-2026` | ar-fin | 1 (Financeiro) |
| `este-mes` | ar-rh | 1 (RH) |

### FX-09c — Projeto trocado em setembro

```text
id: FX-09c
tipo: Projeto
eventos:
  - created 10/08 com projetoId: p-erp
  - { at: 2026-09-08T09:00:00-03:00, campo: projetoId, de: p-erp, para: p-data }
```

| consulta | projetoId* | I-03 |
| --- | --- | --- |
| `ago-2026` | p-erp | 1 |
| `este-mes` | p-data | 1 |

---

## FX-10 — Projetos distintos e áreas distintas sem multiplicar total

Cobre: exemplo obrigatório 10.

```text
id: FX-10
agora: 2026-09-10T15:00:00-03:00
atividades:
  a1:
    tipo: Projeto
    projetoId: p-erp
    solicitante: ar-fin
    envolvidas: [ar-ti, ar-rh]
    statusAtual: Em andamento
    dataInicio: 2026-09-02
    esforco: M
    eventos:
      - created 2026-09-02T09:00:00-03:00 status Em andamento
  a2:
    tipo: Projeto
    projetoId: p-data
    solicitante: ar-ti
    envolvidas: [ar-rh]            # RH já em a1; TI também é solicitante de a2
    statusAtual: Em andamento
    dataInicio: 2026-09-03
    esforco: null
    eventos:
      - created 2026-09-03T09:00:00-03:00 status Em andamento
intervalo:
  a1: [2026-09-02, 2026-09-10]
  a2: [2026-09-03, 2026-09-10]
consulta: este-mes
```

| métrica | esperado | comentário |
| --- | --- | --- |
| I-01 | 2 | join de envolvidas **não** gera 2+3 linhas de atividade |
| I-03 | 2 | p-erp e p-data |
| I-04 | 3 | `{fin, ti, rh}` |
| I-05 | 2 | |
| D-AREA ar-fin | 1 | só a1 |
| D-AREA ar-ti | 2 | a1 envolvida + a2 solicitante |
| D-AREA ar-rh | 2 | a1 e a2 envolvidas |
| soma D-AREA | 5 | `5 > I-01` — esperado; UI mostra texto canônico |
| D-ESFORCO | M=1, Não informado=1 | |

Regressão SQL: `COUNT(*)` após `JOIN activity_areas` **não** pode alimentar `I-01`. Usar `COUNT(DISTINCT activity_id)`.

### FX-10b — Solicitante repetida nas envolvidas (DE-19)

```text
id: FX-10b
atividade: a-dup-area
  solicitante: ar-fin
  envolvidas: [ar-fin, ar-ti]
  dataInicio: 2026-09-01
  statusAtual: Em andamento
consulta: este-mes
```

| métrica | esperado |
| --- | --- |
| I-01 | 1 |
| I-04 | 2 |
| D-AREA ar-fin | 1 (não 2) |
| D-AREA ar-ti | 1 |

---

## FX-11 — Esforço não informado

Cobre: exemplo obrigatório 11.

```text
id: FX-11
agora: 2026-09-10T15:00:00-03:00
atividades:
  a-p: { esforco: P, dataInicio: 2026-09-01, statusAtual: Em andamento }
  a-m: { esforco: M, dataInicio: 2026-09-01, statusAtual: Em andamento }
  a-g: { esforco: G, dataInicio: 2026-09-01, statusAtual: Em andamento }
  a-nulo: { esforco: null, dataInicio: 2026-09-01, statusAtual: Em andamento }
consulta: este-mes
```

| métrica | esperado |
| --- | --- |
| I-01 | 4 |
| D-ESFORCO P | 1 |
| D-ESFORCO M | 1 |
| D-ESFORCO G | 1 |
| D-ESFORCO Não informado | 1 |

Proibido: omitir `a-nulo`; somar só 3; imputar `M`; usar `COALESCE(esforco, 'M')`.

---

## FX-12 — Cancelados nos totais (conjunto fechado)

Cobre: exemplo obrigatório 12. Universo único para um teste de integração T25.

```text
id: FX-12
agora: 2026-09-10T15:00:00-03:00
consulta: ago-2026
atividades:
  a-conc:  # FX-04
    statusAtual: Concluído
    intervalo: [2026-08-02, 2026-08-20]
  a-canc:  # FX-06
    statusAtual: Cancelado
    intervalo: [2026-08-10, 2026-08-20]
  a-and:   # em andamento em 31/08, ainda aberta
    dataInicio: 2026-08-15
    statusAtual: Em andamento
    intervaloAtual: [2026-08-15, 2026-09-10]
    eventos:
      - created 2026-08-15 Em andamento
  a-bloq:
    dataInicio: 2026-08-18
    statusAtual: Bloqueado
    intervaloAtual: [2026-08-18, 2026-09-10]
    eventos:
      - 2026-08-18 Em andamento (preenche início)
      - 2026-08-25 Em andamento → Bloqueado
  a-fora:  # só setembro
    dataInicio: 2026-09-02
    statusAtual: Em andamento
```

Retrato em `ago-2026`:

| id | em P? | status* |
| --- | --- | --- |
| a-conc | sim | Concluído |
| a-canc | sim | Cancelado |
| a-and | sim | Em andamento |
| a-bloq | sim | Bloqueado |
| a-fora | não | — |

| métrica | esperado |
| --- | --- |
| I-01 | 4 |
| I-02 | 1 |
| I-05 | 1 |
| I-06 | 0 |
| I-07 | 1 |
| I-09 | 1 |
| I-02+I-05+I-06+I-07+I-09 | 4 |

---

## FX-13 — Conclusão direta sem início (não inventar início)

Cobre: exemplo obrigatório 13.

```text
id: FX-13
agora: 2026-09-10T15:00:00-03:00
atividade: a-direct
  dataInicio: null                 # OBRIGATÓRIO permanecer nulo
  dataConclusao: 2026-09-08
  statusAtual: Concluído
eventos:
  - { at: 2026-09-08T09:00:00-03:00, tipo: created, status: Backlog }
  - { at: 2026-09-08T09:05:00-03:00, tipo: status, de: Backlog, para: Concluído,
      efeitoDatas: dataConclusao := 2026-09-08, dataInicio: NAO_ALTERAR }
intervaloExecucaoAtual: nulo
```

| consulta | em P? |
| --- | --- |
| `este-mes` | não |
| `sem-planejamento` | sim |
| `todas` | sim |

Asserts T14:

- Payload da mutação **não** contém `dataInicio` preenchido pelo servidor.
- Não usar `dataConclusao` como início.
- Não usar `createdAt::date`.

### FX-13b — Reabrir conclusão direta para Em andamento (DE-23)

```text
id: FX-13b
# continua FX-13
eventosAdicionais:
  - { at: 2026-09-10T10:00:00-03:00, tipo: status, de: Concluído, para: Em andamento, reabertura: true,
      efeitoDatas: dataConclusao := null, dataInicio := 2026-09-10 }
statusAtual: Em andamento
intervaloExecucaoAtual: [2026-09-10, 2026-09-10]
```

O início preenchido é o da **reabertura**, não 08/09. `este-mes`: entra em `P` com `status*=Em andamento`. Não pertence a agosto.

---

## FX-14 — Limites de mês/ano e fuso America/Sao_Paulo

Cobre: exemplo obrigatório 14.

### FX-14a — Evento ainda em agosto no fuso, já setembro em UTC

```text
id: FX-14a
agora: 2026-09-10T15:00:00-03:00
atividade: a-virada
eventos:
  - { at: 2026-09-01T01:30:00Z, tipo: created, status: Em andamento }
      # SP = 2026-08-31T22:30:00-03:00
      efeitoDatas: dataInicio := 2026-08-31   # NÃO 2026-09-01
statusAtual: Em andamento
intervaloExecucaoAtual: [2026-08-31, 2026-09-10]
```

| consulta | em P? | status* | dataInicio persistida |
| --- | --- | --- | --- |
| `ago-2026` | sim | Em andamento | 2026-08-31 |
| `set-2026` | sim | Em andamento | 2026-08-31 |
| fechamento ago vs evento | evento < `2026-09-01T00:00:00-03:00` | entra no retrato de agosto | |

Regressão: `timestamptz '2026-09-01T01:30:00Z'::date` em sessão UTC resulta `2026-09-01` — **proibido**.

### FX-14b — Primeiro instante de setembro SP

```text
id: FX-14b
evento: { at: 2026-09-01T03:00:00Z }  # = 2026-09-01T00:00:00-03:00
efeitoDatas: dataInicio := 2026-09-01
retrato:
  ago-2026: AUSENTE          # occurred_at == fechamento_exclusivo → não entra (estritamente <)
  set-2026: Em andamento
pertinencia:
  ago-2026: false            # intervalo começa 01/09
  set-2026: true
```

### FX-14c — Último instante de agosto SP

```text
id: FX-14c
evento: { at: 2026-09-01T02:59:59.999Z }  # 2026-08-31T23:59:59.999-03:00
efeitoDatas: dataInicio := 2026-08-31
retrato ago-2026: Em andamento
pertinencia ago-2026: true
pertinencia set-2026: true   # aberta até hoje 10/09
```

### FX-14d — Limite de ano

```text
id: FX-14d
agora: 2026-01-05T12:00:00-03:00
atividade: a-ano
  dataInicio: 2025-12-20
  dataConclusao: 2026-01-03
  statusAtual: Concluído
intervalo: [2025-12-20, 2026-01-03]
```

| consulta (neste agora) | em P? | status* |
| --- | --- | --- |
| ano 2025 (`2025-01-01`…`2025-12-31`), fechamento `2026-01-01T00:00:00-03:00` | sim | Em andamento (se a conclusão 03/01/2026 for o único evento de conclusão) |
| `este-ano` 2026 | sim | Concluído |
| ano 2024 | não | — |

Eventos necessários:

```text
- 2025-12-20T10:00:00-03:00 created Em andamento (dataInicio 2025-12-20)
- 2026-01-03T10:00:00-03:00 Concluído (dataConclusao 2026-01-03)
```

### FX-14e — Esta semana / semana passada no relógio padrão

`hoje = 2026-09-10` → esta semana 07–13/09; semana passada 31/08–06/09.

```text
id: FX-14e
atividades:
  a-semana:
    dataInicio: 2026-09-08
    statusAtual: Em andamento
  a-semana-passada:
    dataInicio: 2026-09-01
    dataConclusao: 2026-09-04
    statusAtual: Concluído
  a-cruzando:
    dataInicio: 2026-09-04
    statusAtual: Em andamento     # intervalo [04/09, 10/09]
```

| atividade | esta-semana | semana-passada |
| --- | --- | --- |
| a-semana | sim | não |
| a-semana-passada | não | sim |
| a-cruzando | sim | sim |

Fechamento semana passada: `2026-09-07T00:00:00-03:00`. Retrato de `a-cruzando` na semana passada = Em andamento (ainda não houve conclusão).

### FX-14f — Início futuro (DE-11)

```text
id: FX-14f
agora: 2026-09-10T15:00:00-03:00
dataInicio: 2026-09-20
statusAtual: A fazer
intervaloExecucaoAtual: nulo
```

| consulta | em P? |
| --- | --- |
| `este-mes` | não |
| `todas` | sim |
| `sem-planejamento` | não |

Em `agora = 2026-09-20T09:00:00-03:00`, intervalo `[20/09, 20/09]`, `este-mes` = sim.

---

## FX-15 — Aguardando retorno no retrato

Complemento de I-06 (não era lista mínima, mas T25 precisa).

```text
id: FX-15
agora: 2026-09-10T15:00:00-03:00
eventos:
  - 2026-08-20 created Em andamento (dataInicio 2026-08-20)
  - 2026-08-28 Em andamento → Aguardando retorno
  - 2026-09-03 Aguardando retorno → Em andamento
intervaloAtual: [2026-08-20, 2026-09-10]
```

| consulta | status* | I-05 | I-06 |
| --- | --- | --- | --- |
| `ago-2026` | Aguardando retorno | 0 | 1 |
| `este-mes` | Em andamento | 1 | 0 |

---

## FX-16 — Herança de projeto (T11/T13; não é indicador)

```text
id: FX-16
projeto p-erp:
  areaResponsavel: ar-fin
  participantes: [u-carlos]
  natureza: Estratégico
  papel: Contribuidor
acao: criar atividade tipo Projeto vinculada a p-erp, usuário não altera prefill
esperadoNaCriacao:
  responsavel: usuarioCriador
  participantes: [u-carlos]
  natureza: Estratégica
  papel: Contribuidor
  areaSolicitante: ar-fin
  dominio: (não herdado — obrigatório informar)
depois:
  alterar projeto.participantes para [u-ana]
  atividade.responsavel permanece usuarioCriador
```

---

## FX-17 — Unicidade de nomes (T09/T11)

```text
id: FX-17
casos:
  - { existenteAtivo: "Financeiro", novo: "financeiro", esperado: rejeitar }
  - { existenteAtivo: "Financeiro", novo: " Financeiro ", esperado: rejeitar }
  - { existenteInativo: "Financeiro", novo: "Financeiro", esperado: aceitar }
  - { projetoCancelado: "ERP", novoProjeto: "ERP", esperado: aceitar }
  - { atividades: ["Revisar API", "Revisar API"], esperado: aceitar }
```

---

## Matriz de cobertura do aceite T02

| Exemplo obrigatório | Fixture |
| --- | --- |
| 1 ago–set | FX-01, FX-07 |
| 2 sem início | FX-02 |
| 3 aberta | FX-03 |
| 4 concluída | FX-04 |
| 5 reaberta | FX-05 |
| 6 cancelada terminal | FX-06 |
| 7 interseção vs retrato | FX-07 |
| 8 correção retroativa | FX-08 |
| 9 dimensões históricas | FX-09, FX-09b, FX-09c |
| 10 projetos/áreas distintos | FX-10, FX-10b |
| 11 esforço não informado | FX-11 |
| 12 cancelados nos totais | FX-06c, FX-12 |
| 13 conclusão direta sem início | FX-13, FX-13b |
| 14 limites mês/ano e fuso | FX-14a–f |

## Ordem sugerida de automação

1. T14: FX-01 (auto datas), FX-05, FX-06 (rejeitar transição), FX-13, FX-13b, FX-14a (data civil do evento).
2. T19: FX-01 pertinência, FX-02, FX-03, FX-04, FX-06b, FX-14d, FX-14e, FX-14f, resolução da tabela de períodos.
3. T25: FX-01 retrato, FX-05, FX-07, FX-08 (DE-05), FX-09, FX-10, FX-11, FX-12, FX-15.
