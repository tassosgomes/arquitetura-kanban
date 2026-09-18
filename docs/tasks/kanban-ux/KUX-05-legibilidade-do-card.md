# KUX-05 — Legibilidade do título e poda de tags

- **Prioridade:** P1
- **Complexidade:** `low`
- **Dependências:** melhor executada junto de KUX-03 (que libera altura no card).
- **Arquivos:** `src/ui/kanban/KanbanCard.tsx`, `src/application/activities/kanban-board.ts`.

## Problema observado

`line-clamp-2` sem atributo `title`. No board real isso produz cards que não
identificam a atividade:

```
"realizar alinhamento sobre todas as…"
"Criar um dashboard que retrate cada…"
"Criar um dashboard que retrate cada…"   ← dois cards, indistinguíveis
"Aguardando retorno do paulo para a…"
```

Piora porque as tags disputam o mesmo espaço: o nome do projeto entra como chip de
texto corrido em `font-mono` (ex.: `Onboard de API no devPortal premium`,
`s3 ( uso interno ou externo )`) ocupando duas linhas logo abaixo de um título que já
foi cortado em duas. O ruído tem mais pixels que o sinal.

O chip de papel ("Responsável" / "Contribuidor") repete-se em quase todos os cards e
por isso não diferencia nada na leitura do board.

## Escopo

- [x] Título com até 3 linhas e `title={card.title}` para leitura completa no hover.
- [x] Chip de projeto truncado por CSS numa linha, com `title` para o nome completo.
- [x] Remover o chip de papel da arquitetura do card, ou reduzi-lo a um marcador
      discreto com rótulo acessível — a informação continua no detalhe da atividade.
- [x] Revisar a hierarquia: título > responsável/prazo > projeto/área > checklist.
- [x] Reduzir o uso de `font-mono` nos chips de conteúdo (nome de projeto e área não
      são código e ficam menos legíveis em mono no tamanho atual).

## Aceite

- [ ] Duas atividades com prefixo de título igual são distinguíveis sem abrir o card.
- [x] Nome longo de projeto não empurra o título nem quebra em duas linhas.
- [x] O nome completo do título e do projeto é acessível no hover e ao leitor de tela.
- [x] O card não perde nenhuma informação hoje exibida sem que a remoção esteja
      registrada nesta task.
- [ ] Contraste do texto secundário permanece AA nos dois temas.

## Como validar

1. Comparar os dois cards "Criar um dashboard que retrate cada…" no Backlog.
2. Conferir os cards com projeto de nome longo em "Concluído".
