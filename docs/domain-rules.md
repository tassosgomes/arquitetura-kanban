# Regras de domínio — workflow, temporalidade e indicadores

**Task:** T02  
**Versão:** 1.0  
**Status:** Contrato para implementação  
**Base:** PRD v1.0 §§12, 15–19, 22 e 28; decisões aprovadas em 10/09/2026 em `docs/tasks.md`  
**Fixtures:** `docs/fixtures/t02-temporal-examples.md`  
**Relógio de referência dos exemplos:** `2026-09-10T15:00:00-03:00` (quinta-feira), salvo quando a fixture declarar outro `agora`.

Este documento é o contrato único e testável das regras aprovadas. Não reabre decisões de produto. Onde o PRD era ambíguo, a interpretação conservadora está em **Decisões de especificação (DE)** e vale para T06, T11, T13, T14, T19, T20, T25, T26 e T27.

Um implementador deve conseguir escrever testes a partir daqui e das fixtures, sem perguntar de novo.

---

## 1. Como ler este contrato

- **Kanban** usa estado e dimensões **atuais**.
- **Dashboard e relatórios** usam a **população** pela interseção de execução (datas correntes, inclusive após correção) e o **retrato** (status e dimensões) no **fechamento** do período, reconstruído pela auditoria.
- **Datas de planejamento/execução** são dias de calendário no fuso `America/Sao_Paulo`. **Auditoria** grava instantes (`timestamptz`).
- Nomes canônicos de status: `Backlog`, `A fazer`, `Em andamento`, `Aguardando retorno`, `Bloqueado`, `Concluído`, `Cancelado`.
- Identificadores de métrica (`I-01` … `I-09`, `D-*`) são estáveis; testes e UI devem usá-los na documentação técnica, não necessariamente na tela.

---

## 2. Decisões de especificação (não são reabertura de produto)

Estas escolhas fecham lacunas operacionais das decisões de 10/09/2026.

| ID | Tema | Interpretação conservadora |
| --- | --- | --- |
| DE-01 | Fim exclusivo do dia | Um dia `D` no fuso cobre `[início_do_dia(D), início_do_dia(D+1))`. Eventos com `occurred_at >= início_do_dia(D+1)` já pertencem a `D+1`. |
| DE-02 | Fechamento limitado a agora | `fechamento_exclusivo = min(início_do_dia(fim_do_período + 1 dia), agora)`. Nunca se reconstrói retrato no futuro. |
| DE-03 | População usa datas correntes | Interseção de execução usa as datas persistidas **atuais** (após correções). Correção retroativa pode alterar relatório passado. Não há versão imutável do relatório. |
| DE-04 | Retrato usa auditoria | Status e dimensões de indicadores/filtros de dashboard e relatório vêm do último evento com `occurred_at < fechamento_exclusivo`. |
| DE-05 | Entidade criada após o fechamento | Se não há evento com `occurred_at < fechamento_exclusivo`, a atividade pode entrar na **população** (datas corrigidas, DE-03), mas **não entra** em indicadores de status no fechamento (`I-02`, `I-05`, `I-06`, `I-07`, `I-09`) nem nas distribuições `D-*` daquele período. Continua em `I-01`. |
| DE-06 | Reabertura | Qualquer transição de `Concluído` para um status do board (exceto `Concluído`) é reabertura: limpa `dataConclusao` atual, preserva `dataInicio` e todos os eventos. O comando explícito “Reabrir” sem destino usa `Em andamento`. `Concluído → Cancelado` não é reabertura; é cancelamento terminal. |
| DE-07 | Cancelamento terminal | De `Cancelado` não há transição. Não existe reabertura de cancelada no MVP (RN-10). |
| DE-08 | Transições no board | Entre os seis status do board, qualquer origem pode ir para qualquer destino. `Cancelado` é alcançável a partir de qualquer status não cancelado. |
| DE-09 | Conclusão direta | Transicionar para `Concluído` a partir de qualquer status do board é permitido. Se `dataInicio` estiver ausente, **não** preenchê-la. |
| DE-10 | Data de cancelamento | Persistida como dia de calendário (`dataCancelamento`), preenchida no cancelamento com a data SP do evento, corrigível com auditoria. É o fim do intervalo quando o **status atual** é `Cancelado`. |
| DE-11 | Início futuro | `dataInicio > hoje` gera intervalo vazio até `hoje >= dataInicio`. A atividade não entra em recortes de execução enquanto o intervalo for vazio. Não é “Sem planejamento”. |
| DE-12 | Conclusão no futuro | Rejeitar `dataConclusao > hoje`. Rejeitar `dataCancelamento > hoje`. `previsaoTermino` pode ser futura. |
| DE-13 | Inversão de intervalo | Rejeitar gravação em que `dataConclusao < dataInicio` ou `dataCancelamento < dataInicio` quando o par existir. |
| DE-14 | Unicidade de nomes | Aplica-se a **Área**, **Domínio** e **Projeto** ativos. Título de atividade **não** é único. Projeto ativo = não cancelado. Área/domínio ativos = não inativados. |
| DE-15 | Herança pontual | Prefill somente na criação da atividade vinculada. Campos não listados na decisão 8 (domínio, prioridade, esforço, áreas envolvidas, datas, título) **não** são herdados. |
| DE-16 | Sem planejamento vs período | `Sem planejamento` e filtro de período de execução são **mutuamente exclusivos**. `Todas` remove o recorte temporal. |
| DE-17 | Filtros históricos | Em dashboard/relatório, filtros de responsável, área, projeto, domínio, natureza, papel, tipo, esforço, prioridade e status usam valores do **retrato**. No Kanban, usam valores **atuais**. A pertinência temporal (estar no período) é a mesma função de interseção. |
| DE-18 | Canceladas em `I-01` | Atividade cancelada **com** intervalo de execução que intersecta o período **entra** em `I-01`, `I-03`, `I-04` e `D-*`. **Não entra** em `I-02`, `I-05`, `I-06`, `I-07`. Entra em `I-09`. |
| DE-19 | Área repetida | Se a solicitante também está em envolvidas, a área conta **uma** vez em `I-04` e **uma** vez no bucket `D-AREA`. |
| DE-20 | Ordenação da auditoria | Empate de `occurred_at`: vence o de maior `id` (ou sequência monotônica equivalente). Retrato = último evento estritamente anterior ao fechamento exclusivo. |
| DE-21 | `hoje` | Data de calendário de `agora` em `America/Sao_Paulo`. |
| DE-22 | Trimestre civil | Q1=jan–mar, Q2=abr–jun, Q3=jul–set, Q4=out–dez, sempre no fuso. Não é trimestre fiscal. |
| DE-23 | Primeira entrada em Em andamento | Qualquer transição cujo **destino** é `Em andamento` e `dataInicio` está ausente preenche `dataInicio`. Isso inclui reabertura para `Em andamento` de uma concluída sem início (preenche o dia da reabertura, não o da conclusão). |
| DE-24 | Status no Kanban | Coluna = status atual. Filtro de período no board **não** muda a coluna para o retrato histórico. |

---

## 3. Glossário

| Termo | Definição operacional |
| --- | --- |
| **Atividade** | Unidade de trabalho e card do Kanban. Pode ser ad hoc ou vinculada a projeto. Nunca é excluída no MVP; pode ser cancelada. |
| **Execução** | Recorte temporal em que a atividade é considerada “em curso” para pertinência a períodos. Determinada só por datas de calendário (início + fim efetivo). Não usa previsão de término. |
| **Intervalo de execução** | Par inclusivo `[dataInicio, dataFimEfetiva]` em datas SP, ou `nulo` se não há `dataInicio` ou se o par está invertido no tempo (DE-11). |
| **População (do período)** | Conjunto de atividades cuja pertinência temporal é verdadeira para a consulta, **depois** dos demais filtros da tela, contando cada atividade **no máximo uma vez**. |
| **Pertinência temporal** | Verdadeiro quando o intervalo de execução **intersecta** o intervalo consultado. Falso quando o intervalo de execução é nulo. |
| **Retrato** | Status e dimensões reconstruídos no fechamento do período (DE-02, DE-04). Usado por dashboard, relatório e exportação. Não é usado para posicionar colunas do Kanban. |
| **Fechamento** | Instante exclusivo até o qual eventos de auditoria entram no retrato (`occurred_at < fechamento_exclusivo`). |
| **Sem planejamento** | Atividades com `dataInicio` nulo, qualquer status (inclusive `Concluído` e `Cancelado`). Fora do recorte de execução. |
| **Todas** | Ausência de recorte temporal. Inclui com e sem `dataInicio`. |
| **Agora** | Instante da consulta (`timestamptz`). |
| **Hoje** | Data de calendário de `agora` em `America/Sao_Paulo` (DE-21). |
| **Dimensão histórica** | Qualquer atributo usado em filtro ou agregação de dashboard/relatório: status, responsável, participantes, solicitante, envolvidas, domínio, natureza, papel, tipo, projeto, esforço, prioridade. |
| **Cadastro ativo** | Área/domínio com `ativo = true`. Projeto com status ≠ `Cancelado`. |

---

## 4. Calendário e fuso

### 4.1 Fuso

- Fuso único da aplicação: `America/Sao_Paulo` (`APP_TIME_ZONE` em `docs/adr/ADR-019-datas-fuso.md`).
- Desde 2019 o Brasil não observa horário de verão; em 2026 o offset é **UTC−03:00 o ano inteiro**. Testes de “DST brasileiro” devem **afirmar a ausência** de mudança de offset, não simulá-la.
- Converter `timestamptz → date` **sempre** neste fuso. É incorreto usar `timestamp::date` em UTC ou a data local do servidor.
- Implementação técnica (T05/T19): `Temporal.PlainDate` para dias, `Temporal.Instant` para auditoria, relógio injetável (`Clock`) conforme ADR-019. Este contrato não substitui o ADR; o ADR não substitui as regras de interseção/retrato daqui.

### 4.2 Tipos

| Dado | Tipo | Significado |
| --- | --- | --- |
| `dataInicio`, `previsaoTermino`, `dataConclusao`, `dataCancelamento` | `DATE` (dia civil SP) | Não são instantes. “25/08/2026” é o dia inteiro em São Paulo. |
| `createdAt`, `updatedAt`, `occurred_at` da auditoria | `TIMESTAMPTZ` | Instante absoluto. Exibição na UI em SP. |
| Período consultado | par de `DATE` inclusivo | `inicioPeriodo` e `fimPeriodo` são dias civis SP. |

### 4.3 Semana

- Semana **segunda → domingo**.
- Segunda = ISO weekday 1. Em JavaScript, `Date#getUTCDay()` / `getDay()` trata domingo como 0: **não** usar isso sem ajuste. Usar calendário no fuso, não o fuso do runtime.

```
segunda(d) = d - (isoWeekday(d) - 1) dias
domingo(d) = segunda(d) + 6 dias
```

### 4.4 Inclusividade

Dias inicial e final do período consultado são **inclusivos**.

```
pertence_ao_dia(d, instante) =
  início_do_dia(d) <= instante < início_do_dia(d + 1 dia)
  // todas as âncoras em America/Sao_Paulo
```

Uma atividade com `dataInicio = 2026-08-31` e `dataFimEfetiva = 2026-08-31` intersecta agosto e **não** intersecta setembro.

### 4.5 Resolução de períodos predefinidos

Seja `hoje` a data SP de `agora`.

| Atalho | `inicioPeriodo` | `fimPeriodo` |
| --- | --- | --- |
| Esta semana | `segunda(hoje)` | `domingo(hoje)` |
| Semana passada | `segunda(hoje) - 7 dias` | `segunda(hoje) - 1 dia` |
| Este mês | primeiro dia do mês de `hoje` | último dia do mês de `hoje` |
| Mês passado | primeiro dia do mês anterior | último dia do mês anterior |
| Este trimestre | primeiro dia do trimestre civil de `hoje` (DE-22) | último dia desse trimestre |
| Este ano | `YYYY-01-01` do ano de `hoje` | `YYYY-12-31` |
| Intervalo personalizado | data inicial informada | data final informada (`>=` inicial) |

`fimPeriodo` de “esta semana / este mês / este trimestre / este ano” pode ser **futuro**. Isso é correto para o recorte de interseção. O retrato, porém, não usa o futuro (seção 5).

---

## 5. Instante de fechamento

O fechamento é um instante exclusivo no fuso.

```
início_do_dia(D) = 00:00:00.000 America/Sao_Paulo na data D

fechamento_exclusivo(inicioPeriodo, fimPeriodo, agora) =
  min(início_do_dia(fimPeriodo + 1 dia), agora)
```

Evento entra no retrato ⇔ `occurred_at < fechamento_exclusivo`.

### 5.1 Tabela com o relógio de referência `agora = 2026-09-10T15:00:00-03:00`

| Tipo | Intervalo de datas (inclusivo) | `fechamento_exclusivo` | Comentário |
| --- | --- | --- | --- |
| Esta semana | 2026-09-07 … 2026-09-13 | `2026-09-10T15:00:00-03:00` | Período ainda aberto; cap em `agora`. |
| Semana passada | 2026-08-31 … 2026-09-06 | `2026-09-07T00:00:00-03:00` | Já encerrada. |
| Este mês | 2026-09-01 … 2026-09-30 | `2026-09-10T15:00:00-03:00` | Cap em `agora`, não 30/09. |
| Mês passado | 2026-08-01 … 2026-08-31 | `2026-09-01T00:00:00-03:00` = `2026-09-01T03:00:00Z` | Já encerrado. |
| Este trimestre (Q3) | 2026-07-01 … 2026-09-30 | `2026-09-10T15:00:00-03:00` | Cap em `agora`. |
| Este ano | 2026-01-01 … 2026-12-31 | `2026-09-10T15:00:00-03:00` | Cap em `agora`. |
| Personalizado passado | 2026-08-01 … 2026-08-31 | `2026-09-01T00:00:00-03:00` | Igual a mês passado. |
| Personalizado que inclui hoje | 2026-09-01 … 2026-09-15 | `2026-09-10T15:00:00-03:00` | Cap em `agora`. |
| Personalizado futuro | 2026-10-01 … 2026-10-31 | `2026-09-10T15:00:00-03:00` | Retrato capado; interseção de execução ainda usa out/26. |

Consultar “agosto” em outubro **não** incorpora eventos de setembro ao retrato de agosto.

### 5.2 Virada UTC vs São Paulo (obrigatório em teste)

| Instante UTC | Instante SP | Data civil SP | Relação com fechamento de agosto 2026 |
| --- | --- | --- | --- |
| `2026-09-01T01:30:00Z` | `2026-08-31T22:30:00-03:00` | 2026-08-31 | **Antes** do fechamento (`< 2026-09-01T00:00:00-03:00`). Entra no retrato de agosto. |
| `2026-09-01T02:59:59.999Z` | `2026-08-31T23:59:59.999-03:00` | 2026-08-31 | Entra no retrato de agosto. |
| `2026-09-01T03:00:00Z` | `2026-09-01T00:00:00-03:00` | 2026-09-01 | **Não** entra no retrato de agosto. É o primeiro instante de setembro. |

Preencher `dataInicio` automaticamente nesse evento de `01:30Z` usa **2026-08-31**, não 2026-09-01.

---

## 6. Intervalo de execução

Válido para atividades **ad hoc e vinculadas a projeto**. A previsão de término **nunca** encerra nem estende a execução.

### 6.1 Algoritmo em prosa

1. Se `dataInicio` é nula → intervalo nulo. Fora de qualquer recorte de execução. Acessível em `Todas` e `Sem planejamento`.
2. Calcular `dataFimEfetiva`:
   - se o **status atual** é `Cancelado` → `dataCancelamento`;
   - senão, se o **status atual** é `Concluído` → `dataConclusao`;
   - senão (aberta: qualquer outro status, inclusive reaberta) → `hoje`.
3. Se `dataFimEfetiva < dataInicio` → intervalo nulo (DE-11).
4. Senão → `[dataInicio, dataFimEfetiva]` com ambos inclusivos.
5. Recalcular sempre que datas ou status atuais mudarem (conclusão, cancelamento, reabertura, correção).

Retornos a `Em andamento` **não** alteram `dataInicio` existente. A primeira entrada em `Em andamento` só preenche `dataInicio` quando estiver ausente.

Conclusão direta sem início: passo 1 se aplica; **não** inventar início.

### 6.2 Pseudocódigo

```
função hoje_sp(agora: Instant): Date
  retornar data_civil(agora, "America/Sao_Paulo")

função intervalo_execucao(a: Atividade, agora: Instant) -> Intervalo|nulo
  se a.dataInicio é nulo
    retornar nulo

  se a.status == Cancelado
    fim := a.dataCancelamento
  senão se a.status == Concluído
    fim := a.dataConclusao
  senão
    fim := hoje_sp(agora)

  se fim é nulo ou fim < a.dataInicio
    retornar nulo

  retornar { inicio: a.dataInicio, fim: fim }   // inclusivo

função intersecta(iv: Intervalo, pInicio: Date, pFim: Date) -> bool
  // iv.inicio <= pFim AND iv.fim >= pInicio
  retornar iv.inicio <= pFim e iv.fim >= pInicio

função pertence_ao_periodo(a, pInicio, pFim, agora) -> bool
  iv := intervalo_execucao(a, agora)
  se iv é nulo
    retornar falso
  retornar intersecta(iv, pInicio, pFim)
```

### 6.3 Tabela resumo do fim efetivo

| Status atual | `dataInicio` | Fim efetivo | Pertence a recortes de execução? |
| --- | --- | --- | --- |
| Qualquer | nulo | — | Não. `Todas` / `Sem planejamento`. |
| Backlog, A fazer, Em andamento, Aguardando retorno, Bloqueado | preenchida | `hoje` | Sim, se intersectar. |
| Concluído | preenchida | `dataConclusao` | Sim, se intersectar. |
| Concluído | nulo | — | Não (conclusão direta). |
| Cancelado | preenchida | `dataCancelamento` | Sim, se intersectar. |
| Cancelado | nulo | — | Não. |

### 6.4 Exemplos mínimos de intervalo

Relógio `agora` com `hoje = 2026-09-10`, salvo indicação.

| Caso | Início | Status atual | Conclusão | Cancelamento | Intervalo |
| --- | --- | --- | --- | --- | --- |
| Aberta | 2026-08-25 | Em andamento | — | — | [25/08, 10/09] |
| Concluída | 2026-08-25 | Concluído | 2026-09-18 | — | [25/08, 18/09] — exige `agora` ≥ 18/09 ou datas já persistidas |
| Cancelada | 2026-08-10 | Cancelado | — | 2026-08-20 | [10/08, 20/08] |
| Sem início | nulo | A fazer | — | — | nulo |
| Conclusão direta | nulo | Concluído | 2026-09-01 | — | nulo |
| Reaberta | 2026-08-01 | Em andamento | nulo (limpa) | — | [01/08, 10/09] |
| Início futuro | 2026-09-20 | A fazer | — | — | nulo em 10/09 |

---

## 7. Transições de status permitidas

### 7.1 Matriz

`R` = reabertura (DE-06). `C` = cancelamento terminal. `—` = proibido. `S` = permitido (mesma família do board).

| De \ Para | Backlog | A fazer | Em andamento | Aguardando retorno | Bloqueado | Concluído | Cancelado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Backlog | S (no-op) | S | S | S | S | S | C |
| A fazer | S | S (no-op) | S | S | S | S | C |
| Em andamento | S | S | S (no-op) | S | S | S | C |
| Aguardando retorno | S | S | S | S (no-op) | S | S | C |
| Bloqueado | S | S | S | S | S (no-op) | S | C |
| Concluído | R | R | R | R | R | no-op | C |
| Cancelado | — | — | — | — | — | — | no-op |

Toda transição válida (exceto no-op) gera evento de auditoria atômico com a mutação (RN-19). No-op não gera evento novo.

### 7.2 Cancelado é terminal (RN-10)

- Acessível a partir de qualquer status não cancelado, inclusive `Concluído`.
- Não ocupa coluna padrão do Kanban; consulta por filtro/lista.
- Após cancelar, o serviço de transição **rejeita** qualquer novo status.
- Cancelar não exclui o registro nem quebra referências (projeto, áreas, histórico).

### 7.3 Reabertura de concluída

Efeitos obrigatórios, nesta ordem lógica (uma transação):

1. Registrar evento de reabertura com status anterior `Concluído` e status novo (destino).
2. `dataConclusao` atual ← nulo.
3. `dataInicio` permanece.
4. Eventos anteriores (incluindo a conclusão histórica) **permanecem**.
5. Não criar início fictício. Se `dataInicio` for nula e o destino for `Em andamento`, aplicar DE-23 (início = dia SP da reabertura).

Contagem: a atividade entra no máximo **uma vez** na população de cada período. Só conta em `I-02` se o **retrato daquele fechamento** for `Concluído`. Limpar a conclusão atual **não** apaga a conclusão no retrato de um período já fechado em que ela estava concluída.

### 7.4 Fluxo ilustrativo (PRD §12)

```
Backlog → A fazer → Em andamento → Aguardando retorno → Em andamento → Concluído
```

Retornos são permitidos. Cada seta é um evento.

---

## 8. Datas automáticas vs correções manuais

### 8.1 Preenchimento automático (T14)

| Evento | Efeito em datas | Não faz |
| --- | --- | --- |
| Primeira transição cujo destino é `Em andamento` e `dataInicio` é nula | `dataInicio` ← data civil SP de `occurred_at` | Não sobrescreve início já informado (manual, herdado de correção, ou preenchido antes). |
| Transição para `Concluído` | `dataConclusao` ← data civil SP de `occurred_at` | Não preenche `dataInicio`. Não usa `previsaoTermino`. |
| Transição para `Cancelado` | `dataCancelamento` ← data civil SP de `occurred_at` | Não preenche `dataInicio` nem `dataConclusao`. |
| Reabertura | `dataConclusao` ← nulo | Não apaga auditoria. Não zera `dataInicio`. |
| Retorno a `Em andamento` com início já existente | nenhum | Não “reinicia” o relógio. |

### 8.2 Edição manual / correção retroativa (T13 + T12)

Permitido corrigir `dataInicio`, `previsaoTermino`, `dataConclusao` (se status atual for `Concluído`) e `dataCancelamento` (se status atual for `Cancelado`), com:

- auditoria de valores anterior/novo, autor e instante da **correção** (não do dia corrigido);
- recálculo imediato do intervalo de execução (DE-03);
- recálculo das populações de períodos afetados na próxima consulta (relatório passado pode mudar);
- validações DE-12 e DE-13.

Não permitido no MVP:

- inventar série de transições históricas que não ocorreram;
- criar snapshot imutável / versão congelada de relatório;
- alterar `occurred_at` de eventos já gravados pelo fluxo normal;
- preencher silenciosamente `dataInicio` na conclusão direta.

### 8.3 Previsão de término

Campo de planejamento. Pode ser nulo ou futuro. **Não** entra no algoritmo da seção 6. Atividade aberta com previsão já vencida continua com fim efetivo = `hoje`.

---

## 9. Filtros temporais, “Sem planejamento” e “Todas”

A consulta temporal compartilhada (T19) devolve pertinência; não decide retrato.

### 9.1 Função compartilhada

```
consulta_temporal(atividades, modo, pInicio, pFim, agora):
  se modo == TODAS
    retornar todas as atividades (ainda sujeitas a outros filtros)
  se modo == SEM_PLANEJAMENTO
    retornar atividades com dataInicio nulo
  se modo == PERIODO
    retornar atividades onde pertence_ao_periodo(...) é verdadeiro
```

`SEM_PLANEJAMENTO` não combina com `PERIODO` (DE-16). UI: escolher um recorte temporal.

### 9.2 Onde a função é usada

| Superfície | Pertinência temporal | Status exibido | Dimensões de filtro |
| --- | --- | --- | --- |
| Kanban / lista operacional | T19 (datas atuais) | Atual (colunas) | Atuais |
| Dashboard | T19 (datas atuais) | Retrato no fechamento | Retrato (DE-17) |
| Relatório e CSV | T19 (datas atuais) | Retrato no fechamento | Retrato (DE-17) |

Assim, a mesma atividade agosto–setembro aparece nos dois meses em **todas** as superfícies (interseção). No Kanban de agosto ela fica na coluna **atual** (ex.: `Concluído`). No dashboard de agosto o retrato é `Em andamento` (se essa era a situação em 31/08).

### 9.3 Atalhos do PRD (interpretação)

| Atalho | Composição |
| --- | --- |
| Todas | `modo = TODAS` |
| Este mês | `modo = PERIODO` + este mês |
| Minha semana | `modo = PERIODO` + esta semana + (responsável **ou** participante = usuário atual, valores **atuais** no Kanban) |
| Bloqueadas | status atual = `Bloqueado` (atalho operacional; no dashboard equivalente usa retrato) |

---

## 10. Retrato histórico e dimensões reconstruídas

### 10.1 Princípio (decisão 4)

- Kanban = agora.
- Dashboard/relatório = situação no **encerramento do período**, limitada a `agora`.
- Mudanças **posteriores** ao fechamento **não** substituem o retrato daquele período.
- Exceção explícita: correção de **datas** altera a **população** (DE-03), não o relógio dos eventos de status/dimensão já gravados.

### 10.2 Reconstrução

No `created` (e em cada mudança), a auditoria deve guardar valor anterior e novo de **todas** as dimensões do retrato, não só o mínimo do PRD §16 (exigência de T12). Snapshot inicial no evento de criação.

```
função valor_no_fechamento(eventos, campo, fechamento_exclusivo) -> valor|AUSENTE
  relevantes := eventos onde occurred_at < fechamento_exclusivo
                e (campo em created.snapshot ou em mudança do campo)
  se relevantes vazio
    retornar AUSENTE   // DE-05
  último := max(relevantes) por (occurred_at, id)
  retornar último.valor_novo_do_campo  // no created, o snapshot inicial
```

Campos obrigatórios no snapshot/auditoria para T25:

`status`, `responsavelId`, `participanteIds`, `areaSolicitanteId`, `areaEnvolvidaIds`, `dominioId`, `natureza`, `papelArquitetura`, `tipo`, `projetoId`, `esforco`, `prioridade`, `dataInicio`, `dataConclusao`, `dataCancelamento`, `previsaoTermino`.

Datas no retrato **não** substituem DE-03 para pertinência. Servem para rastreio e para a UI do relatório (“início informado naquela data”). A pertinência continua nas datas **atuais**.

### 10.3 Status no retrato vs interseção

São perguntas distintas. Testes devem cobrir as duas.

| Pergunta | Função |
| --- | --- |
| A atividade entra neste mês? | `pertence_ao_periodo` (datas atuais) |
| Em que situação ela estava no fim do mês? | `valor_no_fechamento(..., status)` |
| Quem era o responsável no fim do mês? | `valor_no_fechamento(..., responsavelId)` |

Exemplo canônico: início 25/08, conclusão 18/09, sem outros eventos.

- Agosto: pertence = sim; retrato = `Em andamento`.
- Setembro (consulta após 18/09): pertence = sim; retrato = `Concluído`.
- Outubro: pertence = não (intervalo [25/08, 18/09]); retrato nem é calculado para indicadores de outubro.

---

## 11. Dicionário de indicadores

Universo após pertinência temporal **e** filtros da tela = população `P`. Cada atividade em `P` no máximo uma vez (joins de participantes/áreas **não** multiplicam `I-01`).

Notação: `status*` = status no retrato do fechamento consultado. `dim*` = dimensão no retrato. Cancelada com intervalo nulo **não** está em `P` no modo `PERIODO`.

### 11.1 Cartões do PRD §18

#### I-01 — Atividades no período

| Item | Contrato |
| --- | --- |
| Pergunta | Quantas atividades distintas pertencem ao recorte? |
| Conjunto | `P` |
| Numerador | `\|P\|` |
| Exclusões | Fora da pertinência temporal; excluídas por outros filtros. **Não** exclui canceladas que passaram nos filtros. |
| Cancelados | **Inclui** (DE-18), se tiverem interseção de execução. |
| Esforço ausente | Inclui. |
| Observação | `I-01` **não** é `I-02 + I-05`. O exemplo numérico do PRD §19 é ilustrativo. |

#### I-02 — Atividades concluídas

| Item | Contrato |
| --- | --- |
| Pergunta | Quantas estavam `Concluído` no fechamento? |
| Conjunto | `{ a ∈ P \| status*(a) = Concluído }` |
| Exclusões | Reabertas antes do fechamento; canceladas; abertas; `AUSENTE` (DE-05). |
| Cancelados | **Não** inclui. |
| Esforço ausente | Irrelevante; não exclui. |
| Reabertura | Agosto concluída + reaberta em setembro: entra em `I-02` de agosto, não no de setembro. |

#### I-03 — Projetos atendidos

| Item | Contrato |
| --- | --- |
| Pergunta | Quantos projetos distintos foram vinculados às atividades de `P` no retrato? |
| Conjunto | `{ projetoId*(a) \| a ∈ P ∧ tipo*(a) = Projeto ∧ projetoId* ≠ nulo }` |
| Numerador | Cardinalidade do conjunto (distinct). |
| Exclusões | Ad hoc; `projetoId*` nulo; `AUSENTE` (DE-05) não contribui. |
| Cancelados | **Inclui** a atividade cancelada; o projeto conta. |
| Esforço ausente | Irrelevante. |
| Multiplicação | Várias atividades do mesmo projeto = **um** projeto. |

#### I-04 — Áreas atendidas

| Item | Contrato |
| --- | --- |
| Pergunta | Quantas áreas distintas aparecem como solicitante ou envolvida no retrato? |
| Conjunto | união, para todo `a ∈ P`, de `{ areaSolicitante*(a) } ∪ areaEnvolvidaIds*(a)` ignorando nulos |
| Numerador | Distinct de IDs de área. |
| Exclusões | Áreas inativadas **continuam** contando se referenciadas. |
| Cancelados | **Inclui**. |
| Multiplicação | Uma atividade com 1 solicitante + 2 envolvidas distintas adiciona até 3 áreas a `I-04`, mas adiciona **1** a `I-01`. DE-19: solicitante repetida em envolvidas conta uma vez. |
| UI | Explicar na tela das distribuições (não no cartão `I-01`) que a soma por área pode exceder `I-01`. Texto canônico na seção 11.3. |

#### I-05 — Em andamento

| Item | Contrato |
| --- | --- |
| Conjunto | `{ a ∈ P \| status*(a) = Em andamento }` |
| Cancelados | Não. |
| Não inclui | `Aguardando retorno`, `Bloqueado`, `A fazer`, `Backlog`. |

#### I-06 — Aguardando retorno

| Item | Contrato |
| --- | --- |
| Conjunto | `{ a ∈ P \| status*(a) = Aguardando retorno }` |
| Cancelados | Não. |

#### I-07 — Bloqueadas

| Item | Contrato |
| --- | --- |
| Conjunto | `{ a ∈ P \| status*(a) = Bloqueado }` |
| Cancelados | Não. |

#### I-08 — Relatório: “atividades em andamento no período”

Mesma definição de **I-05**. O texto do PRD §19 não cria um segundo algoritmo (não significa “esteve aberta em algum momento”).

#### I-09 — Canceladas no fechamento (apoio aos totais)

Não é cartão obrigatório do PRD; é contrato para não esconder DE-18.

| Item | Contrato |
| --- | --- |
| Conjunto | `{ a ∈ P \| status*(a) = Cancelado }` |
| Uso | Desdobramento de `I-01` (“dos quais N canceladas”) no dashboard/relatório quando `N > 0`. |

Identidade de conferência (não é regra de produto extra):

```
I-01 >= I-02 + I-05 + I-06 + I-07 + I-09
```

A diferença são retratos `Backlog`, `A fazer` ou `AUSENTE` (DE-05).

### 11.2 Distribuições (PRD §18)

Todas sobre `P`, dimensões no retrato, cada atividade no máximo uma vez **por bucket em que se qualifica**. Canceladas **entram**. Esforço nulo **não** exclui a atividade das demais distribuições.

| ID | Dimensão | Buckets | Regra de contagem | Cancelados | Esforço ausente |
| --- | --- | --- | --- | --- | --- |
| D-AREA | Área | uma barra por área do universo `I-04` | Atividade incrementa **cada** área de `{solicitante} ∪ envolvidas`. Soma das barras pode ser `> I-01`. | Inclui | Inclui na(s) área(s) |
| D-DOMINIO | Domínio | um por domínio | 1 atividade → 1 domínio | Inclui | Inclui |
| D-RESPONSAVEL | Responsável principal | um por usuário | Participantes **não** geram barra aqui | Inclui | Inclui |
| D-NATUREZA | Natureza | Estratégica, Operacional | 1 atividade → 1 | Inclui | Inclui |
| D-TIPO | Tipo | Projeto, Ad hoc | 1 atividade → 1 | Inclui | Inclui |
| D-PAPEL | Papel da Arquitetura | Responsável, Contribuidor | 1 atividade → 1 | Inclui | Inclui |
| D-ESFORCO | Esforço | `P`, `M`, `G`, **Não informado** | 1 atividade → 1 bucket. Nunca imputar `M` nem omitir nulos. | Inclui | Bucket **Não informado** |

Filtro por participante: `a ∈ P` se `participanteId` ∈ `participanteIds*` (dashboard) ou atuais (Kanban). O join não duplica `I-01`.

Filtro por área: `a ∈ P` se a área está no conjunto união solicitante ∪ envolvidas (retrato ou atual, conforme a superfície).

### 11.3 Texto canônico na UI (D-AREA / I-04)

> Uma atividade pode aparecer em mais de uma área (solicitante e áreas envolvidas). O total de atividades não é a soma por área.

---

## 12. Herança de projeto (contrato para T11 / T13)

Ao **criar** atividade com `tipo = Projeto` e `projetoId` selecionado, o formulário **sugere** (prefill editável):

| Campo da atividade | Origem no projeto |
| --- | --- |
| Responsável | Usuário criador da atividade (fallback individual, não vem do projeto) |
| Participantes | Participantes do projeto |
| Natureza | Natureza do projeto (Estratégico/Operacional ≡ Estratégica/Operacional) |
| Papel da Arquitetura | Papel da Arquitetura no projeto (Responsável / Contribuidor) |
| Área solicitante | Área responsável do projeto |

Regras:

1. O usuário pode alterar qualquer valor sugerido antes e depois de salvar.
2. Mudanças **posteriores** no projeto **não** sincronizam atividades já criadas (RN-13).
3. Trocar o projeto no rascunho **ainda não salvo** recalcula participantes, natureza, papel e área solicitante; o responsável individual não é sobrescrito. Após persistida, trocar o projeto **não** reaplica herança (conservador: evita sobrescrever edição humana).
4. Atividade ad hoc: sem herança.
5. Não herdar: responsável do projeto, título, descrição, domínio, prioridade, esforço, áreas envolvidas, datas, tarefas, observações.
6. Status da atividade **não** deriva do status do projeto (RN-11). Status do projeto não muda por atividades.

---

## 13. Ciclo de vida de cadastros e unicidade de nomes

### 13.1 Política de remoção

| Entidade | Em vez de excluir | Efeito |
| --- | --- | --- |
| Área | Inativar | Referências antigas permanecem legíveis. Fora das opções de **nova** associação. |
| Domínio | Inativar | Idem. |
| Projeto | Cancelar | Atividades vinculadas permanecem. Não apaga Entregas de Valor. |
| Atividade | Cancelar | RN-10. Histórico preservado. |

Não há `DELETE` de domínio no fluxo normal da aplicação.

### 13.2 Unicidade (DE-14)

Normalização para comparação:

```
chave_nome(s) = casefold(trim(s))
```

- `trim` remove espaços só nas extremidades. Espaços internos são significativos (`"Foo  Bar"` ≠ `"Foo Bar"`).
- `casefold` Unicode (equivalente a comparação case-insensitive). Acentos distinguem (`"Área"` ≠ `"Area"`).
- A restrição vale entre registros **ativos**. Inativo/cancelado não bloqueia recriar o mesmo nome ativo.
- Dois inativos podem compartilhar a chave.
- Título de atividade: sem unicidade.

Exemplos:

| Existente (ativo) | Novo | Resultado |
| --- | --- | --- |
| `Financeiro` | `financeiro` | Rejeitar |
| `Financeiro` | ` Financeiro ` | Rejeitar |
| `Financeiro` (inativo) | `Financeiro` | Aceitar |
| `ERP` (projeto cancelado) | `ERP` | Aceitar |
| Atividade `Revisar API` | outra `Revisar API` | Aceitar |

### 13.3 Usuários

Ciclo de vida de usuário (`isActive`, reatribuição) é T03/T07/T13, não este contrato. Atividades e eventos devem continuar exibindo o nome histórico se o usuário for inativado.

---

## 14. Tabela de exemplos (dado / quando / então)

Detalhe executável: `docs/fixtures/t02-temporal-examples.md`. Resumo normativo:

| # | Dado | Quando | Então |
| --- | --- | --- | --- |
| 1 | Início 25/08, 1ª vez Em andamento 25/08, conclui 18/09 | Consultar agosto e setembro após 18/09 | Pertence aos dois meses. Retrato ago=`Em andamento`, set=`Concluído`. Kanban atual=`Concluído` nos dois filtros. |
| 2 | `dataInicio` nula, status A fazer | Período agosto; Sem planejamento; Todas | Fora de agosto. Entra em Sem planejamento e Todas. `I-01` de agosto não inclui. |
| 3 | Início 01/09, ainda Em andamento em 10/09 | Este mês / mês passado | Entra em setembro (`I-05`). Não entra em agosto. Intervalo `[01/09, 10/09]`. |
| 4 | Concluída com início e conclusão no mesmo mês | Aquele mês | Pertence. `status*=Concluído`. Incrementa `I-01` e `I-02`, não `I-05`. |
| 5 | Concluída em 20/08; reaberta em 05/09 para Em andamento | Agosto; setembro (em 10/09) | Agosto: em `P`, `status*=Concluído`, `I-02`. Setembro: em `P`, `status*=Em andamento`, não `I-02`. `dataInicio` preservado; `dataConclusao` atual nula. |
| 6 | Cancelada em 20/08 com início 10/08 | Agosto | Em `P` e `I-01`/`I-09`/`I-03`/`I-04`/`D-*`. Fora de `I-02`/`I-05`/`I-06`/`I-07`. Transição posterior rejeitada. |
| 7 | Mesma atividade do #1 | Distinguir perguntas | Interseção: sim em ago e set. Retrato: distinto por fechamento. Kanban: coluna atual. |
| 8 | Início gravado 01/09; correção em 10/09 para 25/08 | Relatório de agosto após a correção | Passa a pertencer a agosto (`I-01` muda). Evento de correção auditado com autor e instante 10/09. Sem arquivo congelado de relatório. |
| 9 | Responsável Ana até 04/09; Carlos a partir de 05/09 | Agosto vs setembro | Retrato ago=Ana (filtros e `D-RESPONSAVEL`). Set=Carlos. Estado atual=Carlos. |
| 10 | 2 atividades, 2 projetos, solicitante+envolvidas sobrepostas | Indicadores | `I-01=2`; `I-03=2`; `I-04` = união das áreas; `D-AREA` soma > `I-01`. |
| 11 | Esforço nulo | `D-ESFORCO` | Bucket “Não informado” += 1. Não some da população. Não vira `M`. |
| 12 | Mix concluídas + canceladas | Totais | Canceladas em `I-01` e `I-09`, não em `I-02`. |
| 13 | Backlog → Concluído sem início | Conclusão; recorte de mês | `dataInicio` permanece nulo. `dataConclusao` preenchida. Fora do mês em modo `PERIODO`. Em Sem planejamento / Todas. |
| 14 | Evento `2026-09-01T01:30:00Z` | Datas e fechamento de agosto | Data civil 31/08. Entra no retrato de agosto. Não usar UTC `2026-09-01` como dia. |

---

## 15. Casos de borda

| Caso | Contrato |
| --- | --- |
| Concluir no mesmo dia do início | Intervalo de um dia; intersecta esse dia/mês. |
| Cancelar no mesmo dia do início | Idem, fim = `dataCancelamento`. |
| Cancelar a partir de Concluído | Status atual `Cancelado`; fim = `dataCancelamento`; retratos passados em que estava concluída permanecem `Concluído`. |
| Cancelar do Backlog sem início | Intervalo nulo; só `Todas` / `Sem planejamento`. |
| Reabrir concluída sem início para A fazer | `dataInicio` continua nulo. Para Em andamento: DE-23 preenche hoje. |
| Dois eventos no mesmo instante | DE-20. |
| Consultar período futuro | Interseção pode ser vazia para abertas (fim=`hoje`). Retrato capado em `agora`. |
| Personalizado com fim anterior ao início | Rejeitar na API/UI. |
| Filtro de período no Kanban em item já concluído | Card aparece na coluna `Concluído` se o intervalo intersectar, mesmo consultando mês em que o retrato seria `Em andamento`. |
| Projeto cancelado | Atividades seguem suas próprias regras; `I-03` ainda pode contar o projeto se `projetoId*` existir. |
| Área inativada | Permanece em `I-04` histórico; não selecionável em cadastro novo. |
| Participante e responsável iguais | `I-01` conta 1. Filtro por responsável e por participante podem ambos acertar. |
| Atividade em `P` por correção, criada após o fechamento | `I-01` inclui; status/distribuições ignoram (DE-05). |
| `previsaoTermino` no passado, ainda aberta | Continua aberta; fim = `hoje`. |
| Timezone do processo Node/Java = UTC | Obrigatório passar fuso explícito; testes FX-14 falham se houver `toISOString().slice(0,10)` em instantes próximos à virada. |

---

## 16. Não-objetivos do MVP (este contrato não pede)

- Versões imutáveis / PDF congelado de relatório.
- Lead time, tempo bloqueado, capacidade, comparativo entre períodos.
- Reabertura de `Cancelado`.
- Exclusão física de áreas, domínios, projetos ou atividades.
- Sincronização contínua atividade ↔ projeto.
- Boards por semana/área/pessoa.
- Views salvas.
- Semana começando no domingo.
- Imputação de esforço.
- Multiplicar `I-01` por joins.
- Usar UTC como calendário de negócio.
- Tratar previsão como fim de execução.
- Preencher início fictício na conclusão direta.
- Workflow independente de tarefas (RN-07, RN-20).
- Status do projeto dirigido pelas atividades (RN-11).

---

## 17. Contrato literal para tasks dependentes

### T14 — Transições e datas automáticas

Implementar a matriz §7, os efeitos §8.1, DE-06 a DE-13, DE-23, RN-10. Serviço único para detalhe e Kanban. Transição + auditoria atômicas. Testes mínimos: FX-01 (auto início/conclusão), FX-05 (reabertura), FX-06 (terminal), FX-13 (conclusão direta), FX-14 (fuso no auto-preenchimento).

### T19 — Consulta temporal compartilhada

Implementar §§4–6 e §9. Função pura `intervalo_execucao` + `pertence_ao_periodo` + resolução de atalhos e `fechamento_exclusivo` (mesmo que o retrato seja T25, T19 deve expor o instante de fechamento para reuso). Testes: todos os FX de pertinência, limites de mês/ano e fuso. Não posicionar colunas do Kanban pelo retrato.

### T25 — Agregações gerenciais

Implementar §§10–11 e DE-04, DE-05, DE-17, DE-18, DE-19. Distinct de projetos/áreas; `D-AREA` com texto canônico; bucket de esforço não informado; fixtures de reabertura, cancelamento e mudança posterior de responsável/área/projeto. Mesma `P` do relatório (T27). Joins com `DISTINCT` / `COUNT(DISTINCT atividade_id)` para `I-01`.

### T06 / T12 (encaixe)

Modelo precisa persistir `dataInicio`, `previsaoTermino`, `dataConclusao`, `dataCancelamento` como `DATE`; auditoria com snapshot inicial e mudanças de **todas** as dimensões do §10.2; `occurred_at timestamptz`; ordenação DE-20. Inativação/cancelamento conforme §13.

### T11 / T13

Herança §12. Unicidade §13.2 em projetos. Não reaplicar herança após persistir.

---

## 18. Rastreio das decisões de 10/09/2026

| Decisão | Seções |
| --- | --- |
| 2 Calendário | 4, 5 |
| 3 Execução e datas automáticas | 6, 8, 9 |
| 4 Retrato histórico | 5, 10 |
| 5 Reabertura e conclusão | 7.3, 11 (I-02) |
| 6 Correções retroativas | 8.2, DE-03 |
| 7 Áreas e projetos atendidos | 11 (I-03, I-04, D-AREA) |
| 8 Herança do projeto | 12 |
| 9 Ciclo de vida | 13 |
| RN-10 Cancelado terminal | 7.2, DE-07 |
