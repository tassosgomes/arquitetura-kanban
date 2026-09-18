# KUX-13 — Agrupar o formulário e fixar a ação primária

- **Prioridade:** P1
- **Complexidade:** `mid` — reorganiza o layout de um formulário de 635 linhas.
- **Dependências:** KUX-10 (o resumo de erros precisa saber apontar para seções
  colapsadas).
- **Arquivos:** `src/ui/activities/ActivityForm.tsx`, `src/ui/forms/FormField.tsx`.

## Problema observado

`/activities/new` é uma coluna única de 16 campos em ~1.900px — três rolagens completas
de viewport — sem nenhum agrupamento visual. Todos os campos têm o mesmo peso: o título
obrigatório e o campo "Observações" opcional são apresentados da mesma forma, à mesma
largura, na mesma cadência.

O botão "Criar atividade" fica no rodapé do documento. Durante todo o preenchimento ele
está fora da viewport: o usuário não vê a ação que está perseguindo, e não tem noção de
quanto falta.

A ordem atual também separa campos que o usuário pensa junto — "Área solicitante"
aparece antes de "Categoria", e "Responsável" fica a 900px de distância de
"Participantes" só porque entre eles há uma grade de checkbox.

## Escopo

- [ ] Agrupar os campos em três blocos com títulos legíveis, na ordem em que a demanda
      é pensada:
      1. **O que é** — título, descrição, tipo (e projeto, quando aplicável);
      2. **Classificação** — categoria, natureza, papel da Arquitetura, prioridade,
         esforço;
      3. **Pessoas e prazos** — área solicitante, áreas envolvidas, responsável,
         participantes, status, datas, observações.
- [ ] Blocos 2 e 3 colapsáveis, com indicador de preenchimento no cabeçalho
      (ex.: `3 de 4`), abertos por padrão em `create` enquanto houver obrigatório vazio.
- [ ] Rodapé de ação fixo (`sticky`) com o botão primário sempre visível, inclusive
      durante a rolagem.
- [ ] `Cmd/Ctrl+Enter` submete de qualquer campo.
- [ ] Usar duas colunas para os campos curtos de classificação em viewport larga,
      mantendo coluna única abaixo de `md`.
- [ ] Um bloco colapsado que contenha campo inválido abre automaticamente quando o
      resumo de erros de KUX-10 aponta para ele.
- [ ] Não alterar nomes de campo, ordem de tabulação lógica nem o contrato do
      `FormData` enviado à action.

## Aceite

- [ ] A altura do formulário em viewport de 1.080px cai para no máximo duas rolagens.
- [ ] O botão primário está visível em qualquer ponto da rolagem.
- [ ] A ordem de Tab continua seguindo a ordem visual, inclusive com blocos colapsados.
- [ ] Colapsar/expandir é operável por teclado e anunciado (`aria-expanded`).
- [ ] O modo `edit` também se beneficia do agrupamento, sem regressão nos campos que
      ele desabilita (status, data de conclusão).
- [ ] Nenhum teste existente de submissão do formulário quebra.

## Como validar

1. Preencher o formulário inteiro em viewport 1.366×768 contando as rolagens.
2. Submeter com erro dentro de um bloco colapsado e conferir a abertura automática.
3. Percorrer o formulário só com Tab e conferir a ordem.
4. Repetir em viewport de toque (390×844).
