# Contrato de identidade e autorização

**Task:** T03  
**Versão:** 1.0  
**Status:** Contrato para implementação (T06, T07, T09, T13)  
**Base:** PRD EP-01 / US-01; Tech Spec (OIDC, claim mapping, `User`, autorização); decisão 10 de 10/09/2026; [ADR-015](adr/ADR-015-auth-js-oidc.md); [architecture.md](architecture.md) §8  
**Guia operacional (IdPs):** [guides/oidc.md](guides/oidc.md)

Este documento é o contrato normativo da identidade persistente e da política de acesso do MVP. Não reabre ADR-012, ADR-013 nem ADR-015. Não substitui o provisionamento real no Logto/CyberArk — esse trabalho é do responsável pelo projeto, descrito no guia OIDC.

**Login real não está validado.** Credenciais e issuer de cada ambiente ainda não existem neste repositório.

---

## 1. Fronteira

| Camada | Conhece | Não conhece |
| --- | --- | --- |
| `domain` / `application` | `AuthenticatedIdentity` e o usuário local já autorizado | claims brutos, token, `Account` do Auth.js, nome do IdP |
| `infrastructure/auth` | Auth.js v5, discovery OIDC, claim mapper, sessão | regras de Kanban, Prisma fora dos repositórios |
| IdP (Logto / CyberArk) | quem pode completar o Authorization Code | `User.isActive`, provisionamento local |

Um único provedor Auth.js, `id: "corporate"`, `type: "oidc"`. Troca de IdP = variáveis +, se necessário, ajustes **somente** no mapper. Proibido `if (provider === "logto" | "cyberark")` fora de `src/infrastructure/auth`.

Route Handler: `src/app/api/auth/[...nextauth]/route.ts`.

---

## 2. Tipo `AuthenticatedIdentity`

Confirmado a partir da Tech Spec e da arquitetura. Campos e regras abaixo são o contrato de T07.

```typescript
type AuthenticatedIdentity = {
  subject: string
  issuer: string
  email?: string
  displayName?: string
  groups?: string[]
}
```

| Campo | Origem | Obrigatório após o mapper | Regras |
| --- | --- | --- | --- |
| `subject` | claim `sub` | sim | string não vazia, estável no IdP; nunca o e-mail |
| `issuer` | claim `iss` | sim | string não vazia; deve coincidir com `OIDC_ISSUER` do ambiente (após normalizar barra final) |
| `email` | claim `email` | não | se ausente/inválido, omitir; não bloquear login |
| `displayName` | ver mapper | não | se ausente, omitir; a UI pode cair para um rótulo genérico, não para `sub` |
| `groups` | claim `groups` (ou equivalente mapeado) | não | não é usado para autorização no MVP; pode ficar vazio/`undefined` |

Regras adicionais:

- Identidade primária = `issuer` + `subject`. E-mail **não** identifica.
- O domínio nunca lê o ID Token, o access token nem o objeto de perfil do Auth.js.
- `groups` existe no tipo para não forçar mudança futura; **nenhuma** regra do MVP autoriza ou recusa acesso com base em grupo, papel ou claim extra.
- Após o mapper, `subject` e `issuer` são os únicos campos sem os quais o fluxo aborta.

O command da aplicação recebe a identidade **já resolvida** para o usuário local ativo (`LocalUser`), não o perfil Auth.js.

```typescript
type LocalUser = {
  id: string // UUID do User persistido
  oidcIssuer: string
  oidcSubject: string
  email?: string
  displayName?: string
  isActive: true // invariante após o guard de autorização
}
```

---

## 3. Claim mapper

Único módulo que lê claims: `src/infrastructure/auth/claim-mapper.ts` (T07). Testes unitários usam fixtures, não SDK de IdP (ADR-018).

### 3.1 Tabela claim → campo

| Claim OIDC (nesta ordem de preferência) | Campo | Obrigatório para login | Se ausente |
| --- | --- | --- | --- |
| `sub` | `subject` | **sim** | recusar autenticação |
| `iss` | `issuer` | **sim** | recusar autenticação |
| `email` | `email` | não | omitir o campo |
| `name`, senão `preferred_username`, senão `username` | `displayName` | não | omitir o campo |
| `groups` (array de strings); senão `roles` se vier como array de strings | `groups` | não | omitir / `[]` |

Não mapear:

- `picture`, `phone_number`, `locale`, claims proprietários de Logto/CyberArk, access token, refresh token.
- E-mail a partir de `sub` ou de `preferred_username`.
- Identidade a partir de `email`.

### 3.2 Regras do mapper

1. Entrada: payload já validado do ID Token (e, se o Auth.js buscar userinfo, o perfil mesclado). Saída: somente `AuthenticatedIdentity`.
2. `sub` e `iss` presentes, strings não vazias. Qualquer outro claim pode faltar.
3. Claims opcionais **não bloqueiam** login nem autorização do MVP. Autorização não depende de e-mail, nome ou grupo.
4. `iss` comparado a `OIDC_ISSUER` do ambiente. Divergência → falha de autenticação (não provisionar).
5. `email` só é aceito se parecer um e-mail (contém `@`). Valor inesperado → omitir, não falhar.
6. `groups` / `roles` que não sejam array de strings → omitir, não falhar.
7. Não há ramo por nome de provedor. Diferenças de claim (ex.: Logto `username` vs CyberArk `name`) cabem na tabela de fallback acima.

---

## 4. Provisionamento no primeiro login autorizado

Persistência (T06). Comportamento (T07).

### 4.1 Modelo `User` (contrato, não schema Prisma)

```text
User
----
id                  UUID
oidcIssuer          VARCHAR
oidcSubject         VARCHAR
email               VARCHAR          -- nullable
displayName         VARCHAR          -- nullable
isActive            BOOLEAN          -- default true no insert
createdAt           TIMESTAMPTZ
updatedAt           TIMESTAMPTZ
lastLoginAt         TIMESTAMPTZ      -- nullable até o primeiro login concluído
```

Constraint **obrigatória:** `UNIQUE(oidcIssuer, oidcSubject)`.

Índice de e-mail, se existir, **não** é único.

### 4.2 Algoritmo

No callback de autenticação, depois do mapper, com transação:

1. `SELECT` por `(oidcIssuer, oidcSubject)` = `(identity.issuer, identity.subject)`.
2. **Não encontrado** e o login é considerado autorizado pelo IdP (Authorization Code concluído para o client deste ambiente):
   - `INSERT` com `isActive = true`, `email`/`displayName` do mapper (podem ser nulos), `lastLoginAt = agora`.
   - Esse é o **primeiro login autorizado**. Não há cadastro prévio obrigatório na aplicação.
3. **Encontrado** e `isActive === true`:
   - Atualizar `email` e `displayName` com os valores atuais do mapper (incluindo limpar se o IdP deixou de enviar).
   - Atualizar `lastLoginAt`.
   - **Não** alterar `id`, `oidcIssuer`, `oidcSubject`, `isActive`.
4. **Encontrado** e `isActive === false`: não atualizar perfil para “reativar”; recusar sessão (política §5.4).
5. Emitir sessão Auth.js **somente** após o passo 2 ou 3 ter persistido. Falha de persistência → sem cookie de sessão.

### 4.3 E-mail não funde e não duplica

| Situação | Resultado |
| --- | --- |
| Mesmo `(issuer, subject)`, e-mail mudou no IdP | Atualiza `User.email`. **Não** cria outra linha |
| Mesmo e-mail, `(issuer, subject)` diferentes (ex.: um usuário Logto e outro CyberArk, ou duas contas) | Duas linhas `User`. **Não** fundir |
| E-mail ausente no token, depois presente | Preenche `email` na mesma linha |
| Dois logins com e-mails iguais e `sub` iguais no mesmo issuer | Uma linha (unicidade issuer+subject) |

Não há “conta canônica” por e-mail. Migração Logto → CyberArk cria **outro** `User` (issuer diferente). Histórico antigo permanece no usuário Logto; o usuário CyberArk começa vazio. Fora do MVP: ferramenta de fusão.

### 4.4 O que não persistir

Conforme Tech Spec / ADR-015:

- senha, hash, MFA;
- access token, refresh token;
- claims brutos;
- `id_token` no banco.

`id_token` pode ficar **só na sessão JWT do Auth.js**, e somente se o logout RP-initiated exigir `id_token_hint`. Não gravar na tabela `User`.

---

## 5. Política de autorização do MVP

Sem RBAC sofisticado (PRD §4.2 e §25). Dois controles: **IdP** (quem autentica) e **aplicação** (sessão + `isActive`).

### 5.1 Quem pode autenticar (preferencialmente o IdP)

A allowlist / *app assignment* vive no Identity Provider:

- Logto: Users criados pelo administrador + **App-level access control** (Rules) na aplicação OIDC.
- CyberArk: **Permissions** da web app OIDC (usuários, grupos ou papéis do diretório).

A aplicação **não** implementa lista própria de e-mails no MVP. Se o IdP estiver aberto demais, qualquer pessoa que complete o Authorization Code será provisionada no primeiro login — isso é falha de configuração do IdP, não um “modo convite” da app.

### 5.2 Guard da aplicação (todas as operações)

Toda operação autenticada exige **os dois**:

1. sessão Auth.js válida (cookie HTTP-only, estratégia JWT);
2. `User.isActive === true` **lido no servidor** (banco), não apenas um flag copiado para o JWT no login.

Aplica-se a:

- páginas / layouts do grupo `(app)`;
- Server Actions;
- queries (RSC e funções de leitura);
- Route Handler CSV;
- Route Handler SSE.

Ocultar botões na UI **não** é controle de acesso.

Mapeamento de erros (architecture §7):

| Situação | Erro | HTTP / UI |
| --- | --- | --- |
| Sem sessão ou sessão expirada | `UnauthorizedError` | 401; redirecionar ao login |
| Sessão presente, mas sem autorização / inativo / sem `User` local | `ForbiddenError` | 403; não entrar no shell autenticado |

Revalidar `isActive` a cada request (ou no início de cada action/query/handler). Inativar um usuário deve surtir efeito **antes** da expiração do JWT: se o banco diz `isActive === false`, recusar e invalidar a sessão.

### 5.3 Autenticado no IdP, sem autorização na aplicação

Casos:

| Caso | Como ocorre | Comportamento |
| --- | --- | --- |
| IdP recusou (fora da allowlist / assignment) | Authorization Code não completa | A app não recebe callback de sucesso; nada a provisionar |
| Token válido, mas mapper/`iss` falhou | `sub`/`iss` ausentes ou issuer divergente | Não provisionar; sem sessão; tratar como falha de autenticação |
| Token válido, `User` inexistente, política futura recusar provisionamento | Não há critério extra no MVP | No MVP, IdP ok ⇒ provisionar. Reservado: se T07 introduzir recusa explícita, **não** inserir `User` e responder `ForbiddenError` |
| Cookie Auth.js sem `User` correspondente | callback incompleto, dado apagado | `ForbiddenError`; não criar dados de negócio; T07 deve tornar o caminho feliz atômico |

“Não provisionado” **nunca** é um usuário autenticado com acesso de leitura. Sem `User` ativo não há Kanban, CSV nem SSE.

### 5.4 Usuário local inativo

Operador (ou tarefa futura de cadastro) define `User.isActive = false`. Não há tela de RBAC no MVP; T09/T13 consomem a flag.

Quando `isActive === false`:

- recusar **novo** login (não emitir sessão);
- recusar **sessão existente** em qualquer operação (§5.2);
- **não** excluir o `User` nem eventos de auditoria;
- preservar histórico: atividades e eventos continuam exibindo o nome (atual ou o gravado no evento — T02/T16; inativação não torna o histórico ilegível);
- **não** receber novas atribuições como responsável ou participante (T09 lista só ativos; T13 rejeita inativo em novas associações);
- atividades **abertas** que ainda apontam para esse usuário exigem **reatribuição explícita** por um usuário ativo (decisão 10; implementação T13). O sistema não reatribui sozinho.

Reativar = `isActive = true` de novo. Próximo login autorizado atualiza e-mail/nome e emite sessão. Não criar segundo `User`.

### 5.5 Resumo em uma frase

Completou OIDC no client deste ambiente → provisiona/atualiza por issuer+subject → só opera se `isActive`; inativo e não provisionado não entram; e-mail não é chave; não há papéis.

---

## 6. Callbacks, login e logout (Auth.js v5)

`basePath` padrão do Auth.js no Next.js: `/api/auth`.  
`id` do provedor: `corporate`.  
`APP_URL` = origem pública **sem** barra final e **sem** `/api/auth` (ex.: `http://localhost:3000`).

Documentação Auth.js: callback = `{origin}{basePath}/callback/{id}`.

### 6.1 Paths reais (registrar no IdP e usar em T07)

| Função | Path HTTP real | Quem chama |
| --- | --- | --- |
| Callback OIDC (Redirect URI) | `{APP_URL}/api/auth/callback/corporate` | IdP, após o Authorization Code |
| Início de login (página/rota do provedor) | `{APP_URL}/api/auth/signin/corporate` | browser / Auth.js |
| Página padrão com botão SSO (se T07 não customizar) | `{APP_URL}/api/auth/signin` | Auth.js |
| Logout local (página GET / ação POST) | `{APP_URL}/api/auth/signout` | Auth.js `signOut()` |
| Sessão | `{APP_URL}/api/auth/session` | cliente / `auth()` |
| Erro Auth.js | `{APP_URL}/api/auth/error` | Auth.js |

T07 deve preferir `signIn("corporate")` e `signOut()` exportados da config Auth.js, em vez de mandar o usuário preencher a página HTML padrão. Os paths HTTP acima **existem** porque o Route Handler catch-all os atende; o Redirect URI do IdP **tem** de ser o callback.

UI própria de login/logout (grupo `(auth)`) é T07/T08; se `pages.signIn` for customizado, o **callback OIDC não muda**.

### 6.2 Logout RP-initiated

`signOut()` do Auth.js **só** apaga o cookie da aplicação. Não encerra a sessão no IdP.

T07, quando o discovery (ou `OIDC_LOGOUT_ENDPOINT`) expuser `end_session_endpoint`:

1. Guardar `id_token` na sessão JWT **somente** para este fim (`id_token_hint`).
2. Invalidar o cookie local.
3. Redirecionar o browser para o `end_session_endpoint` com:
   - `id_token_hint` (recomendado pela spec RP-Initiated Logout);
   - `post_logout_redirect_uri` = `{APP_URL}/` (exato, registrado no IdP);
   - `client_id` se o IdP exigir (Logto usa).

**Fallback** (sem `end_session_endpoint`, endpoint inválido, ou IdP recusa o redirect):

- concluir só o logout local;
- redirecionar para `{APP_URL}/` (ou página de login);
- documentar no log de aplicação **sem** token;
- o usuário pode continuar com SSO no IdP até expirar a sessão corporativa — aceitável no MVP se o IdP não oferecer end_session.

Post-logout a registrar no IdP: `{APP_URL}/` (e, se T07 usar outra landing, essa URL exata também).

Não implementar back-channel logout no MVP.

### 6.3 PKCE e client confidencial

Authorization Code + PKCE. Client **confidential** (`OIDC_CLIENT_SECRET` no servidor). Tipo Logto: **Traditional web**, nunca SPA.

---

## 7. Variáveis de ambiente

Somente os nomes da Tech Spec (mais `DATABASE_URL` na subida da app, fora deste contrato).

| Variável | Obrigatória | Conteúdo |
| --- | --- | --- |
| `OIDC_ISSUER` | sim | Valor `issuer` do discovery. Sem barra final, salvo se o documento well-known usar barra |
| `OIDC_CLIENT_ID` | sim | Client ID da aplicação OIDC **deste** ambiente |
| `OIDC_CLIENT_SECRET` | sim | Secret do client confidencial |
| `OIDC_SCOPES` | sim | Lista separada por espaço. Valor alvo: `openid profile email` |
| `OIDC_AUTHORIZATION_ENDPOINT` | só se discovery indisponível | copiar do well-known |
| `OIDC_TOKEN_ENDPOINT` | só se discovery indisponível | copiar do well-known |
| `OIDC_USERINFO_ENDPOINT` | não | se o ID Token não trouxer perfil e o Auth.js precisar |
| `OIDC_LOGOUT_ENDPOINT` | não | `end_session_endpoint`; se vazio, T07 usa o do discovery ou o fallback local |
| `AUTH_SECRET` | sim | segredo de assinatura da sessão Auth.js (gerar localmente; nunca versionar) |
| `APP_URL` | sim | origem pública, sem barra final |

Não usar `AUTH_LOGTO_*`, `AUTH_CYBERARK_*`, nem `NEXTAUTH_URL` como contrato (T07 pode espelhar `APP_URL` internamente para o Auth.js se a lib exigir `AUTH_URL`; isso é detalhe de implementação, **não** nova variável normativa).

`OIDC_SCOPES` não inclui `offline_access` no MVP (não persistimos refresh token).

### 7.1 Onde **não** versionar segredos

| Ambiente | Onde configurar | O que **não** fazer |
| --- | --- | --- |
| Local | arquivo `.env` / `.env.local` fora do git (T05) | commit, wiki, issue, PR, `docs/` |
| Testes / Homologação Vercel | Environment Variables do projeto Vercel (Production/Preview conforme T10) | `.env` no repositório, dashboard público |
| Produção | Secret do Kubernetes (T29) | ConfigMap, imagem, manifesto com valor literal |

Versionar no máximo um `.env.example` com placeholders `CHANGEME` (T05). Este contrato não contém valores reais.

`AUTH_SECRET` e `OIDC_CLIENT_SECRET` são distintos **por ambiente**. Credenciais de desenvolvimento **nunca** iguais às de homologação ou produção.

---

## 8. Ambientes

| Ambiente | Runtime | IdP | Aplicação OIDC | Credenciais |
| --- | --- | --- | --- | --- |
| Local | Docker Compose (`localhost`) | Logto Cloud | app **própria** “local” | só no `.env` local |
| Testes / Homologação | Vercel | Logto Cloud | app **própria** “homologação” | Vercel env |
| Produção | Kubernetes | CyberArk | web app OIDC de produção | K8s secret |

Mesma implementação. Só mudam issuer, client, secret, `APP_URL` e, se o discovery falhar, endpoints manuais.

Previews Vercel com host `*.vercel.app` **não** reutilizam o callback de homologação sem registro explícito. T10 define se o MVP usa URL estável de homologação (recomendado) ou proxy de redirect do Auth.js. T03 não marca preview como ambiente de SSO.

---

## 9. O que T06 deve criar (schema)

- Tabela `User` com os campos da §4.1.
- `UNIQUE(oidcIssuer, oidcSubject)`.
- `email` nullable, **sem** unique.
- `isActive` boolean, default `true` no insert.
- Não criar tabelas de sessão/account do Auth.js (sessão JWT).
- Seeds **não** precisam de usuários reais de SSO.

---

## 10. O que T07 deve implementar (literalmente)

1. Auth.js v5 (`next-auth` canal v5), um provedor `{ id: "corporate", name: "SSO", type: "oidc", issuer, clientId, clientSecret, authorization.params.scope }` lido de `OIDC_*`.
2. Discovery em `{OIDC_ISSUER}/.well-known/openid-configuration`. Endpoints manuais só se `OIDC_AUTHORIZATION_ENDPOINT` / `OIDC_TOKEN_ENDPOINT` estiverem definidos porque o discovery falhou.
3. Route Handler `src/app/api/auth/[...nextauth]/route.ts` exportando `GET`/`POST` dos `handlers`.
4. `claim-mapper.ts` conforme §3; testes com fixtures (sub+iss ok; sem email; sem name; iss divergente; groups malformado).
5. Callback `signIn`/`jwt`: mapper → persistência §4 → recusa se `isActive === false` → sessão com `localUserId`, `issuer`, `subject`, `email`, `displayName`; sem access token; `id_token` só se logout RP-initiated precisar.
6. Guard reutilizável: sessão válida + `User.isActive === true` no banco, usado por páginas protegidas, Server Actions, queries, CSV e SSE. Sem sessão → `UnauthorizedError`. Inativo / sem User → `ForbiddenError`.
7. `signIn("corporate")` na UI de login; `signOut()` + redirect para `end_session` quando houver; fallback §6.2.
8. Não fundir por e-mail; atualizar e-mail no mesmo `User`; testes de unicidade issuer+subject.
9. Domínio recebe só `AuthenticatedIdentity` / `LocalUser`. Zero SDK Logto/CyberArk.
10. Login real com Logto fica para quando o responsável preencher o guia; até lá, testes com fixtures. **Não** declarar US-01 validado sem IdP configurado.

---

## 11. Fora deste contrato

- Implementação Next.js (T07) e schema Prisma (T06).
- RBAC, convites in-app, fusão Logto↔CyberArk, back-channel logout.
- Validação de login real (dependência externa).
