# KUX-16 — Controles de escolha curta no cadastro

- **Prioridade:** P2
- **Complexidade:** `low` — troca de controle, sem mudança de contrato.
- **Dependências:** KUX-13 (o agrupamento define onde esses campos ficam).
- **Arquivos:** `src/ui/activities/ActivityForm.tsx`, novo componente em `src/ui/forms/`.

## Problema observado

Cinco campos do cadastro são `<select>` nativo para conjuntos de duas a quatro opções
curtas e estáveis:

| Campo | Opções |
| --- | --- |
| Tipo | Ad hoc, Projeto |
| Natureza | Estratégica, Operacional |
| Papel da Arquitetura | Responsável, Contribuidor |
| Prioridade | Baixa, Média, Alta, Crítica |
| Esforço | –, P, M, G |

Um `<select>` cobra dois cliques e esconde as opções até o segundo. Para "Esforço", que
tem três letras como rótulo, o controle é maior do que todo o conteúdo que ele
representa. O usuário também não consegue comparar as opções sem abrir cada campo — o
que importa em "Natureza" e "Papel", cuja escolha depende de entender o par.

"Tipo" tem agravante próprio: ele é o campo que decide se o seletor de Projeto aparece,
e um `<select>` de duas opções esconde essa bifurcação.

## Escopo

- [x] Substituir esses cinco `<select>` por controle segmentado (grupo de rádios
      estilizado), mantendo `<input type="radio">` reais por baixo.
- [x] Manter os mesmos `name`, os mesmos valores enviados e o mesmo `defaultValue`
      inicial — o `FormData` recebido pela action não muda.
- [x] Não usar somente cor para distinguir a opção ativa (peso, borda ou marcador).
- [x] Navegação por setas dentro do grupo, `Tab` entra e sai do grupo como um único
      parada, conforme o padrão de radiogroup.
- [x] `aria-invalid` e a mensagem de erro (KUX-10) aplicados ao grupo, não a um rádio
      isolado.
- [x] Manter `<select>` onde a lista é longa ou vem de catálogo (Categoria, Área,
      Responsável, Status) — esses são escopo de KUX-14, não deste.
- [x] Avaliar se "Esforço" pode exibir o significado de P/M/G (tooltip ou texto de
      apoio); hoje as letras não são autoexplicativas.

## Aceite

- [x] Escolher prioridade ou esforço custa um clique.
- [x] Todas as opções de cada campo são visíveis sem abrir nada.
- [x] Navegação por setas funciona e o leitor de tela anuncia grupo, rótulo e opção
      selecionada.
- [ ] Contraste AA da opção ativa em tema claro e escuro.
- [x] Trocar "Tipo" para Projeto continua revelando o seletor de projeto e aplicando o
      prefill.
- [x] Os testes de submissão do formulário passam sem alteração.

## Como validar

1. Preencher os cinco campos contando cliques, antes e depois.
2. Operar cada grupo só com setas do teclado.
3. Conferir os dois temas com a opção ativa e com erro de validação no grupo.
