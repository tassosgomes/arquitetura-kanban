# ADR-016 — Drag and drop com @dnd-kit

**Status:** Aceito
**Data:** 2026-09-10
**Task:** T01
**Consulta npm:** 2026-09-10

## Contexto

O Kanban move atividades entre colunas por arrastar e soltar (US-11, T18). A mudança chama o mesmo command de status da T14, com auditoria e optimistic locking. Não há ranking persistido entre cards. Deve existir alternativa por teclado/formulário.

## Decisão

Usar a linha estável **@dnd-kit**:

| Pacote | Versão alvo (10/09/2026) |
| --- | --- |
| `@dnd-kit/core` | 6.3.1 |
| `@dnd-kit/sortable` | 10.0.0 (peer `@dnd-kit/core ^6.3.0`) |
| `@dnd-kit/utilities` | 3.2.2 |

Escopo de UI:

- Pointer e teclado via sensores do kit.
- Drop em coluna → `ChangeActivityStatus` + `version`.
- Falha/`ConflictError` restaura a posição persistida (T18).
- Checklist ordenável (T15) pode reutilizar `@dnd-kit/sortable`; a ordem das **tarefas** é persistida, a dos cards do board não.

Não usar `@dnd-kit/react` 0.5.x (rewrite pré-1.0). Reavaliar só depois de 1.0 estável.

## Consequências

- DnD fica em Client Components em `src/ui/kanban`.
- A biblioteca não importa serviços de aplicação; o handler da página faz a ponte.
- Acessibilidade do board não depende só do arraste (T08/T18).

## Alternativas consideradas

| Alternativa | Motivo de recusa |
| --- | --- |
| `@dnd-kit/react` 0.5 | APIs pré-1.0, risco de quebra |
| `@hello-pangea/dnd` | Bom para listas; menos flexível para colunas sem ranking |
| HTML Drag and Drop nativo | Acessibilidade e React 19 mais trabalhosos |
| `react-beautiful-dnd` | Projeto original encerrado |
