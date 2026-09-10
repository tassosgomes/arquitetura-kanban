# ADR-017 — Markdown seguro (editor + renderização)

**Status:** Aceito
**Data:** 2026-09-10
**Task:** T01
**Consulta npm:** 2026-09-10

## Contexto

Entregas de Valor (US-05/US-06, T23) persistem Markdown e exigem modo edição e modo visualização. O PRD pede renderização segura: HTML, scripts e URLs perigosas não podem executar. CommonMark permite HTML cru; preview sem sanitizar é XSS.

## Decisão

1. **Armazenar apenas a string Markdown.** Nunca HTML sanitizado como fonte da verdade.
2. **Visualização** (página e modo leitura): `react-markdown` 10.1.x + `remark-gfm` 4.x + **`rehype-sanitize` 6.x** (allowlist estilo GitHub; sem `javascript:`).
3. **Edição:** `@uiw/react-md-editor` 4.1.x com o **mesmo** `rehype-sanitize` em `previewOptions.rehypePlugins`.
4. Um único helper `src/ui/markdown` para os dois modos, para não existir preview “sem sanitize”.
5. Persistência e XSS não dependem do editor: o pipeline de visualização é obrigatório mesmo se o Markdown vier de seed/carga (T30).

Não habilitar `rehype-raw` sem sanitize depois. Componentes customizados só com tags já permitidas pelo schema.

## Consequências

- T23 testa payload com `<script>`, `onerror` e `javascript:`.
- Edição de entrega não altera status do projeto (RN-18).
- Optimistic locking da entrega (T12) é independente do editor.

## Alternativas consideradas

| Alternativa | Motivo de recusa |
| --- | --- |
| `dangerouslySetInnerHTML` + marked | XSS fácil de regressar |
| TipTap / Milkdown / MDXEditor | WYSIWYG pesado demais para o MVP |
| Textarea puro sem preview no editor | Atende o PRD, mas pior UX; o editor escolhido é aceitável **com** sanitize |
| DOMPurify no HTML já gerado | Funciona; `rehype-sanitize` age na árvore antes do DOM e combina com `react-markdown` |
