# KUX-17 — Cadastro completo em painel sobre o board

- **Prioridade:** P3
- **Complexidade:** `high` — rota interceptada, foco, histórico e estado do formulário.
- **Dependências:** KUX-11, KUX-12, KUX-13 (o painel só compensa depois que o
  formulário couber nele e o retorno ao board já for o comportamento padrão).
- **Arquivos:** `src/app/(app)/@modal/` (novo), `src/app/(app)/kanban/page.tsx`,
  `src/app/(app)/activities/new/page.tsx`, `src/ui/activities/ActivityForm.tsx`.

## Problema observado

Mesmo resolvidos KUX-10 a KUX-13, "Nova atividade" continua sendo uma **troca de rota**:
o board desaparece enquanto o usuário cadastra. Isso importa porque o board é o contexto
da decisão — é olhando as colunas que a pessoa decide se aquilo é um item novo, se
duplica algo que já está em "Aguardando retorno", ou em que coluna deve nascer.

KUX-11 cobre o caso rápido (quatro campos na coluna). Falta o caso completo: cadastrar
com classificação, participantes e datas **sem perder o board de vista**.

## Escopo

- [x] Abrir `/activities/new` como painel lateral sobre `/kanban`, mantendo o board
      visível e legível ao lado.
- [ ] Manter `/activities/new` funcionando como página cheia em acesso direto, recarga
      e compartilhamento de URL — o painel é a apresentação, não a única rota.
- [ ] Preservar o parâmetro `?projectId=` e o prefill de projeto nas duas formas.
- [x] Gestão de foco: foco entra no painel ao abrir, fica preso enquanto aberto, e
      volta ao elemento de origem ao fechar. `Esc` fecha.
- [ ] Confirmação antes de descartar um formulário com alterações — integrar com
      `useMarkFormDirty`, que o `ActivityForm` já usa.
- [x] Botão/rodapé de ação fixo dentro do painel (herda KUX-13).
- [x] Abaixo de `md`, o painel ocupa a tela inteira; não tentar board + painel lado a
      lado em viewport estreita.
- [x] O board atrás do painel fica inerte (`inert`/`aria-hidden`) enquanto ele está
      aberto.

## Aceite

- [x] Clicar "Nova atividade" no board abre o painel sem trocar de página.
- [ ] Colar `http://localhost:3000/activities/new` numa aba nova abre a página cheia.
- [ ] Voltar no histórico fecha o painel e devolve o board com os filtros intactos.
- [ ] `Esc` com formulário sujo pede confirmação; com formulário limpo fecha direto.
- [x] Leitor de tela não alcança o board enquanto o painel está aberto.
- [x] Em 390×844 o painel ocupa a tela toda e continua utilizável.
- [ ] Nenhuma regressão no fluxo de criação a partir de `/projects/:id/activities`.

## Como validar

1. Abrir o painel, preencher metade, apertar `Esc` e conferir a confirmação.
2. Abrir o painel, usar Voltar do navegador, conferir board e filtros.
3. Acessar a URL direta em aba anônima.
4. Repetir o ciclo completo em viewport de toque.
