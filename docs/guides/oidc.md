# Guia OIDC — Logto (DEV/TEST) e CyberArk (PROD)

**Task:** T03  
**Versão:** 1.0  
**Status:** Procedimento para o responsável pelo projeto. **Login real não validado.**  
**Contrato da aplicação:** [identity.md](../identity.md)  
**Adapter:** Auth.js v5, provedor `id: "corporate"`, `type: "oidc"` ([ADR-015](../adr/ADR-015-auth-js-oidc.md))

Este guia descreve o que criar **fora do repositório**: aplicações OIDC, callbacks, scopes, restrição de usuários e onde colar segredos. Não contém credenciais. Use os placeholders `CHANGEME` e `<…>`.

A implementação Next.js (T07) ainda não existe. Os paths abaixo são os **paths reais** do Auth.js v5 no Next.js com `basePath` `/api/auth` e provedor `corporate`. Não invente `/callback` na raiz nem `/api/auth/callback/logto`.

---

## 0. Como usar este guia

1. Leia a [§1 Paths canônicos](#1-paths-canônicos-authjs-v5) (iguais em todos os ambientes).
2. Crie **duas** aplicações Logto: [§2 Local](#2-logto--ambiente-local) e [§3 Homologação](#3-logto--testes--homologação-vercel). **Não** reutilize client id/secret entre elas.
3. Crie **uma** aplicação CyberArk só para produção: [§4](#4-cyberark--produção).
4. Preencha a [planilha de valores](#5-planilha-de-valores-preencher) e configure segredos só no lugar indicado na [§6](#6-variáveis-e-onde-guardar-segredos).
5. Execute o [roteiro de validação](#7-roteiro-de-validação) **depois** de T07 existir. Enquanto T07 não existir, pare ao gravar issuer, client id e callbacks. **Não** marque o item como validado.

Pré-requisitos de acesso (providenciados pelo responsável):

- Conta de administrador no [Logto Cloud](https://cloud.logto.io/) (tenant do time).
- Acesso de administrador ao portal CyberArk Identity da empresa (produção).
- Permissão para criar variáveis na Vercel (homologação) e secrets no cluster (produção) — T10/T29.

A aplicação **não** usa SDK Logto nem SDK CyberArk. Só OIDC.

---

## 1. Paths canônicos (Auth.js v5)

`APP_URL` = origem pública **sem** barra no final (exemplos: `http://localhost:3000`, `https://<projeto>.vercel.app`, `https://<dns-producao>`).

Documentação Auth.js: callback = `{origem}{basePath}/callback/{id}`. No Next.js o `basePath` padrão é `/api/auth`. O `id` do provedor é `corporate`.

| Uso | URL exata a registrar / usar |
| --- | --- |
| **Redirect URI / callback OIDC** | `{APP_URL}/api/auth/callback/corporate` |
| **Início de login (provedor)** | `{APP_URL}/api/auth/signin/corporate` |
| Página padrão Auth.js (opcional) | `{APP_URL}/api/auth/signin` |
| **Logout local** (cookie da app) | `{APP_URL}/api/auth/signout` |
| **Post-logout redirect** (voltar do IdP) | `{APP_URL}/` |
| Sessão | `{APP_URL}/api/auth/session` |

Exemplos com placeholder (não são URLs de produção reais):

```text
Local callback:     http://localhost:3000/api/auth/callback/corporate
Local login:        http://localhost:3000/api/auth/signin/corporate
Local post-logout:  http://localhost:3000/

Homolog callback:   https://<app-homolog>.vercel.app/api/auth/callback/corporate
Prod callback:      https://<dns-producao>/api/auth/callback/corporate
```

T07 chama `signIn("corporate")` e `signOut()`. O IdP **só** precisa do callback (e do post-logout). Login/logout HTTP acima são rotas do catch-all `src/app/api/auth/[...nextauth]/route.ts`.

Logout no IdP (RP-initiated): redirecionar para o `end_session_endpoint` do discovery, com `post_logout_redirect_uri={APP_URL}/` e, quando o IdP exigir, `client_id` e `id_token_hint`. Se o discovery **não** tiver `end_session_endpoint`, T07 faz só logout local (cookie). Detalhe no [contrato](../identity.md#62-logout-rp-initiated).

Matching de redirect: **string exata**. Sem curingas. Barra final conta. `http` ≠ `https`. `localhost` ≠ `127.0.0.1`.

---

## 2. Logto — ambiente local

Use **Traditional web** (aplicação confidencial com App secret no servidor Next.js). **Não** crie Single Page App, Native, Machine-to-machine nem Protected App.

### 2.1 Criar a aplicação

1. Entre no [Logto Cloud Console](https://cloud.logto.io/) no tenant do time.
2. Vá em **Applications**.
3. **Create application** (ou **Create application** a partir do catálogo).
4. Escolha o tipo **Traditional web**. Se o console pedir um framework, use a opção genérica de Traditional web / “Integrate without SDK” / equivalente — **não** instale `@logto/next`.
5. Nome sugerido (pode alterar): `Arquitetura Kanban — Local`.
6. Crie a aplicação.

### 2.2 Copiar identificadores (sem colar no git)

Na página da aplicação, anote em um gerenciador de senhas / local seguro:

| Campo no console | Variável da app | Placeholder |
| --- | --- | --- |
| App ID | `OIDC_CLIENT_ID` | `CHANGEME` |
| App secret | `OIDC_CLIENT_SECRET` | `CHANGEME` |
| **Issuer endpoint** (ou o `issuer` do JSON de discovery) | `OIDC_ISSUER` | `https://<tenant>.logto.app/oidc` |

Na mesma página existe **OpenID provider configuration endpoint**. Abra-o no browser. Deve ser:

```text
https://<tenant>.logto.app/oidc/.well-known/openid-configuration
```

Se o tenant usar domínio customizado, o host muda; o sufixo `/.well-known/openid-configuration` permanece. Copie o campo JSON `"issuer"` **literalmente** para `OIDC_ISSUER` (em geral `https://<tenant>.logto.app/oidc`, sem barra final).

Confirme no JSON (não precisa copiar para o git):

- `authorization_endpoint`
- `token_endpoint`
- `userinfo_endpoint`
- `jwks_uri`
- `end_session_endpoint` (Logto costuma ser `https://<tenant>.logto.app/oidc/session/end`)

Com discovery saudável, **não** preencha `OIDC_AUTHORIZATION_ENDPOINT` / `OIDC_TOKEN_ENDPOINT`. Só use esses overrides se o well-known for inacessível a partir do container da app.

### 2.3 Redirect, logout e CORS

Ainda na aplicação, salve:

| Campo no console (inglês) | Valor local |
| --- | --- |
| **Redirect URIs** | `http://localhost:3000/api/auth/callback/corporate` |
| **Post sign-out redirect URIs** | `http://localhost:3000/` |
| **CORS allowed origins** | `http://localhost:3000` (opcional; o Logto já libera a origem dos Redirect URIs) |

Não cadastre `http://localhost:3000/callback`. Não cadastre `…/callback/logto`.

Se a app local for exposta em outra origem (ex.: `http://127.0.0.1:3000`), **ou** a URI entra na lista **ou** o time usa só `localhost`. As duas origens são clientes diferentes para o IdP.

### 2.4 Scopes e claims

A aplicação pede (variável `OIDC_SCOPES`):

```text
openid profile email
```

| Scope | Para que serve | Obrigatório no IdP |
| --- | --- | --- |
| `openid` | ID Token + `sub` | sim |
| `profile` | `name` / nome de exibição | não (login funciona sem nome) |
| `email` | claim `email` | não (login funciona sem e-mail) |

**Não** peça `offline_access` (refresh token). A sessão da app é JWT do Auth.js; tokens corporativos não são persistidos.

Claims que a app usa:

| Claim | Uso |
| --- | --- |
| `sub`, `iss` | identidade; sem eles o login falha |
| `email`, `name` (fallbacks no [mapper](../identity.md#31-tabela-claim--campo)) | perfil; ausência não bloqueia |

Não configure RBAC de API resource no Logto para este MVP. Não dependa de `groups` / `roles` para autorizar.

### 2.5 Restringir quem entra (obrigatório)

Por padrão, qualquer usuário **registrado no tenant** Logto pode autenticar na aplicação. Para o MVP (cinco pessoas da Arquitetura):

**A. Desligar cadastro público**

1. **Sign-in & account** (ou **Sign-in experience**) → **Sign-up and sign-in**.
2. Em **Advanced options**, desligue **Enable user registration**.
3. Salve.

Isso vale para o tenant inteiro. Coordene se o mesmo tenant tiver outros apps que precisem de self-signup.

**B. Criar os usuários**

1. **User management** → **Add user**.
2. Informe pelo menos um identificador (e-mail corporativo de cada membro).
3. Guarde a senha inicial **fora do git** e entregue ao usuário (ou peça reset).
4. Repita para os cinco integrantes (e contas de teste do responsável, se quiser).

**C. Allowlist na aplicação (App-level access control)**

Documentação: [App-level access control](https://docs.logto.io/authorization/app-level-access-control).

1. Abra a aplicação `Arquitetura Kanban — Local`.
2. Aba **Rules**.
3. **Add rules** → tipo **Users** (ou **User roles**, se o time preferir um papel “Arquitetura”).
4. Selecione **somente** quem pode usar o Kanban local.
5. Só então ligue **Enable access control**.
6. **Save changes**.

Sem pelo menos uma regra, o Logto impede ligar o controle (para não fechar a app para todo mundo). Com o controle ligado, usuário autenticado no Logto mas **fora** da regra vê “access denied” **antes** da aplicação receber tokens — correto.

Suspender um usuário no Logto também impede o SSO. Inativar **só** na aplicação (`User.isActive`) é o controle local; os dois podem coexistir (ver [política](../identity.md#5-política-de-autorização-do-mvp)).

### 2.6 Variáveis locais

No `.env` / `.env.local` **não versionado** (T05 criará o exemplo):

```text
APP_URL=http://localhost:3000
OIDC_ISSUER=https://<tenant>.logto.app/oidc
OIDC_CLIENT_ID=CHANGEME
OIDC_CLIENT_SECRET=CHANGEME
OIDC_SCOPES=openid profile email
AUTH_SECRET=CHANGEME
```

Gere `AUTH_SECRET` na máquina local, por exemplo:

```bash
openssl rand -base64 32
```

Não reutilize o `AUTH_SECRET` de homologação/produção. Não commite o arquivo.

Docker Compose **não** sobe Logto. A app (container ou `next dev`) precisa alcançar `https://<tenant>.logto.app` na internet.

---

## 3. Logto — testes / homologação (Vercel)

Segunda aplicação OIDC no **mesmo tenant** Logto (recomendado) ou em outro tenant. **Client ID e secret diferentes** dos de local. Nunca copie o secret de desenvolvimento para a Vercel.

### 3.1 Criar a aplicação

1. Logto Console → **Applications** → **Create application**.
2. Tipo: **Traditional web** de novo.
3. Nome sugerido: `Arquitetura Kanban — Homologação`.
4. Crie e copie App ID / App secret para um cofre — depois para as env vars da Vercel, nunca para o git.

### 3.2 Issuer e discovery

Se for o **mesmo tenant** da §2, o `OIDC_ISSUER` é o mesmo; o que muda é client id/secret e `APP_URL`.

Se for **outro tenant**, copie o `"issuer"` do well-known daquele tenant.

Abra e archive (localmente) o JSON:

```text
https://<tenant>.logto.app/oidc/.well-known/openid-configuration
```

### 3.3 Redirect, logout e CORS

Substitua `<app-homolog>.vercel.app` pelo host **estável** de homologação (domínio do projeto ou domínio customizado). T10 fecha o host definitivo.

| Campo | Valor |
| --- | --- |
| **Redirect URIs** | `https://<app-homolog>.vercel.app/api/auth/callback/corporate` |
| **Post sign-out redirect URIs** | `https://<app-homolog>.vercel.app/` |
| **CORS allowed origins** | `https://<app-homolog>.vercel.app` |

HTTPS obrigatório. Não misture a URI de localhost nesta app.

**Previews** `*-<time>.vercel.app` mudam a cada PR. **Não** cadastre curingas (Logto/OIDC não devem aceitar `*`). Decisão T10: SSO **somente** na URL estável de homologação; `AUTH_REDIRECT_PROXY_URL` **não** entra no MVP. Detalhe: [homologation.md](homologation.md).

### 3.4 Scopes, claims e restrição

Iguais à [§2.4](#24-scopes-e-claims) e [§2.5](#25-restringir-quem-entra-obrigatório):

- `OIDC_SCOPES=openid profile email`
- Rules **desta** aplicação (homologação) com os mesmos cinco usuários (ou um subconjunto de teste)
- Cadastro público já desligado no tenant, se a §2.5 foi feita

As Rules são **por aplicação**. Allowlist da app Local não vale automaticamente para Homologação: configure de novo na app `Arquitetura Kanban — Homologação`.

### 3.5 Onde colocar os segredos

No projeto Vercel (T10 detalha o fluxo):

- `APP_URL` = `https://<app-homolog>.vercel.app` (sem barra final)
- `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_SCOPES`, `AUTH_SECRET`

`AUTH_SECRET` de homologação ≠ local ≠ produção.

Não marque “login Logto na Vercel validado” até T07+T10 e um teste humano com usuário da allowlist.

---

## 4. CyberArk — produção

Produção usa **CyberArk Identity via OIDC** (Tech Spec). A aplicação continua agnóstica: mesmas variáveis, mesmo provedor `corporate`.

Nomes de menu no portal variam entre versões e entre Identity Security Platform / Identity Administration. Siga o caminho da documentação oficial de **custom OpenID Connect application**. Se o menu local for diferente, use a busca do portal por “OpenID Connect” / “Web Apps”. **Não** invente nomes internos de políticas, conectores ou tenants da empresa: copie o que o portal mostrar para a planilha da §5.

Documentação de referência (inglês):

- [Add and configure the custom OpenID Connect application](https://docs.cyberark.com/identity/latest/en/content/applications/appscustom/openidaddconfigapp.htm)
- [Configure an OpenID Connect logout](https://docs.cyberark.com/identity/latest/en/content/developer/oidc/oidc-logout/oidc-logout.htm)

### 4.1 O que o administrador precisa criar

Uma **web app OpenID Connect customizada** (não SAML, não OAuth “confidential client” genérico sem OIDC, não widget). Fluxo: **Authorization Code**. Client **com secret** (confidential). PKCE é usado pelo Auth.js e é suportado pelo template OIDC da CyberArk.

Não use as credenciais Logto em produção.

### 4.2 Passos no portal (Identity Administration)

1. Abra o **Identity Administration portal** da empresa.
2. Vá a **Web Apps** (em algumas versões: **Apps > Web Apps** ou **Manage > Identities > Web apps**).
3. **Add Web Apps**.
4. Aba **Custom**.
5. Na linha **OpenID Connect**, **Add** → confirme **Yes** → **Close**.
6. A app abre em **Settings**:
   - **Application ID**: identifique esta app (valor técnico; anote na planilha como `<application-id>`). Não precisa coincidir com o `id` `corporate` do Auth.js.
   - **Name**: nome visível, por exemplo `Gestão de Atividades de Arquitetura`.
   - Desmarque **Show in user app list** se o login for só iniciado pela aplicação (RP-initiated). Pode deixar marcado se quiser o ícone no User Portal.
   - Em **Service Provider Configuration** / Trust, prefira **Login initiated by the app only** (a Next.js começa o SSO).
7. **Save**.

### 4.3 Trust (URLs e secret)

Na página **Trust**:

1. **Resource application URL**: `https://<dns-producao>/` (a origem da app).
2. **Authorized Redirect URIs** — **exato**, um por linha, sem curinga:
   ```text
   https://<dns-producao>/api/auth/callback/corporate
   ```
3. Marque **Enable full URI match** (padrão em apps novas; o CyberArk passou a exigir match exato).
4. **OpenID Connect client secrets**: **Generate New Secret**. Defina expiração se a política da empresa exigir. Copie o valor **uma vez** para o secret store / Kubernetes. Confirme *I've Saved the Secret*. O portal mascara depois.
5. **Authorized Post Logout URIs** — exato:
   ```text
   https://<dns-producao>/
   ```
6. Copie para a planilha (não para o git):
   - **OpenID Connect Client ID** → `OIDC_CLIENT_ID`
   - **OpenID Connect Issuer URL** → `OIDC_ISSUER` (é **por aplicação**; o formato do host pode ser tenant id ou vanity URL — **não adivinhe**, copie o valor do portal)
   - **OpenID Connect Metadata URL** → deve resolver discovery; em geral `{issuer}/.well-known/openid-configuration` ou a URL que o portal exibir

Abra a Metadata URL no browser (rede que o cluster também alcança) e confirme JSON com `authorization_endpoint`, `token_endpoint`, `jwks_uri`. Anote se existe `end_session_endpoint`. Se existir, esse é o logout RP-initiated; copie para `OIDC_LOGOUT_ENDPOINT` só se quiser override (T07 prefere o discovery).

Se o well-known **não** for alcançável a partir dos pods, preencha `OIDC_AUTHORIZATION_ENDPOINT` e `OIDC_TOKEN_ENDPOINT` com os valores do JSON, obtidos numa máquina que alcance o IdP, e registre o bloqueio de rede para a infra (T29).

### 4.4 Tokens e scopes

Página **Tokens**:

- Tempo de vida de ID/access token: o padrão da empresa serve (a sessão da app não depende de renovar access token).
- **Não** emita refresh token para este client, salvo exigência corporativa. A app não persiste refresh token.
- Se a app antiga tiver a opção **Generate access and ID tokens with new structure**, ligue (claims no ID Token, conforme OIDC).

Página **Scope**:

- Garanta que o client possa pedir `openid`, `profile` e `email`.
- Para app interna de primeira parte, **desligue** “Prompt the user for consent” se a política permitir (evita tela extra a cada login). Se a segurança exigir consent, deixe ligado — a app tolera.
- Não crie API scopes só para o Kanban.

Claims esperados no ID Token / userinfo (pedir ao administrador para conferir com um usuário de teste, **sem** colar tokens no git):

| Claim | Obrigatório para a app |
| --- | --- |
| `sub` | sim |
| `iss` (igual ao Issuer URL) | sim |
| `email` | não |
| `name` | não |
| `groups` | não (ignorado na autorização) |

Se `email`/`name` só saírem com script de custom claims, o administrador pode mapeá-los; a app **não** bloqueia login sem eles. Não escreva script CyberArk neste repositório.

### 4.5 Permissions (allowlist de produção)

Página **Permissions**:

1. **Add**.
2. Selecione os usuários, grupos AD/Idaptive ou papéis que correspondem aos **cinco integrantes** (e eventualmente o gestor). Use o agrupamento que a empresa já tiver; **não** invente um nome de grupo neste guia.
3. Permissões típicas para SSO: **View** e **Run**. **Automatically Deploy** só se a app aparecer no User Portal.
4. **Save**.

Quem não estiver em Permissions não completa o SSO — a aplicação não provisiona.

Políticas extras (MFA, IP) na página **Policy** são da operação de identidade da empresa; a app não as implementa.

### 4.6 Variáveis no cluster

No Secret do Kubernetes (T29), **nunca** no manifesto versionado:

```text
APP_URL=https://<dns-producao>
OIDC_ISSUER=<colar Issuer URL do Trust>
OIDC_CLIENT_ID=<colar Client ID>
OIDC_CLIENT_SECRET=CHANGEME
OIDC_SCOPES=openid profile email
AUTH_SECRET=CHANGEME
```

Opcional, só se discovery falhar ou end_session não vier no JSON:

```text
OIDC_AUTHORIZATION_ENDPOINT=https://<issuer-host>/...
OIDC_TOKEN_ENDPOINT=https://<issuer-host>/...
OIDC_USERINFO_ENDPOINT=https://<issuer-host>/...
OIDC_LOGOUT_ENDPOINT=https://<issuer-host>/...
```

Credenciais de produção **nunca** no `.env` local nem na Vercel.

O `User` local de produção será **outro** registro (issuer CyberArk ≠ issuer Logto). Não há fusão por e-mail.

---

## 5. Planilha de valores (preencher)

Copie para um documento interno / cofre. **Não** abra PR com esta tabela preenchida.

| Campo | Local (Logto) | Homologação (Logto) | Produção (CyberArk) |
| --- | --- | --- | --- |
| `APP_URL` | `http://localhost:3000` | `https://<app-homolog>.vercel.app` | `https://<dns-producao>` |
| Tenant / portal | `<tenant>.logto.app` | `<tenant>.logto.app` | `<portal CyberArk>` |
| Nome da aplicação OIDC | `Arquitetura Kanban — Local` | `Arquitetura Kanban — Homologação` | `Gestão de Atividades de Arquitetura` |
| `OIDC_ISSUER` | `https://<tenant>.logto.app/oidc` | `https://<tenant>.logto.app/oidc` | `<Issuer URL do Trust>` |
| Discovery | `{issuer}/.well-known/openid-configuration` | idem | Metadata URL do Trust |
| `OIDC_CLIENT_ID` | `CHANGEME` | `CHANGEME` | `CHANGEME` |
| `OIDC_CLIENT_SECRET` | cofre local | Vercel env | K8s secret |
| Redirect URI | `{APP_URL}/api/auth/callback/corporate` | idem | idem |
| Post-logout | `{APP_URL}/` | idem | idem |
| `OIDC_SCOPES` | `openid profile email` | idem | idem |
| Allowlist | Rules da app Local | Rules da app Homolog | Permissions da web app |
| `end_session_endpoint` presente? | (sim/não) | (sim/não) | (sim/não) |
| Segredos iguais a outro ambiente? | **não** | **não** | **não** |

---

## 6. Variáveis e onde guardar segredos

Lista normativa (Tech Spec) — T07/T05 não devem inventar `AUTH_LOGTO_*`:

```text
OIDC_ISSUER
OIDC_CLIENT_ID
OIDC_CLIENT_SECRET
OIDC_SCOPES
OIDC_AUTHORIZATION_ENDPOINT    # somente se discovery indisponível
OIDC_TOKEN_ENDPOINT            # somente se discovery indisponível
OIDC_USERINFO_ENDPOINT         # opcional
OIDC_LOGOUT_ENDPOINT           # opcional
AUTH_SECRET
APP_URL
```

| Ambiente | Onde configurar | Fora do git |
| --- | --- | --- |
| Local | `.env` / `.env.local` (T05) | sim |
| Homologação | Environment Variables da Vercel (T10) | sim |
| Produção | Secret Kubernetes (T29) | sim |

`.env.example` versionado só com `CHANGEME`. Issues, ADRs e este guia **nunca** recebem secrets reais.

---

## 7. Roteiro de validação

**Não execute a parte “login na UI” antes de T07.** Itens 1–4 podem ser feitos já pelo responsável. Itens 5–9 só após a app existir. Nenhum item abaixo está concluído neste repositório.

### 7.1 Sem a aplicação (agora)

1. Well-known de cada issuer abre e o JSON tem `issuer`, `authorization_endpoint`, `token_endpoint`, `jwks_uri`.
2. `OIDC_ISSUER` é **igual** ao campo `issuer` do JSON (byte a byte, salvo decisão documentada de barra final).
3. Redirect URI cadastrada é `{APP_URL}/api/auth/callback/corporate` para aquele ambiente.
4. Allowlist: só o time (Rules Logto / Permissions CyberArk). Cadastro público Logto desligado.

### 7.2 Depois de T07 (responsável + implementador)

5. Usuário **na** allowlist completa SSO e vê o shell autenticado.
6. Usuário **fora** da allowlist (conta Logto/CyberArk existente, sem Rule/Permission nesta app) **não** entra na aplicação.
7. Mesmo usuário, `User.isActive = false` no banco: login/sessão recusados; histórico de atividades permanece.
8. Alterar o e-mail no IdP e logar de novo: **um** `User`; `email` atualizado.
9. Logout: cookie da app some; se houver `end_session_endpoint`, o IdP também encerra a sessão e volta para `{APP_URL}/`. Se não houver, só o cookie some — anotar como fallback, não como falha de T03.

Evidência: anote data, ambiente e “passou/falhou” na issue. **Não** cole tokens, authorization codes nem secrets.

### 7.3 Diagnóstico rápido (sem secrets)

| Sintoma | Verificação |
| --- | --- |
| `redirect_uri mismatch` / `invalid redirect` | URI no IdP idêntica à que o Auth.js envia (veja a query `redirect_uri` no `/authorize`) |
| Discovery falhou no container | o pod/máquina alcança o well-known? proxy corporativo? |
| Login ok no IdP, 403 na app | `isActive`? mapper sem `sub`? issuer divergente? |
| Dois usuários para a mesma pessoa | issuers diferentes (Logto vs CyberArk) — esperado |
| SSO pula a tela mas entra todo mundo | App-level access control / Permissions desligados |

Não habilite debug que imprima ID Token em log.

---

## 8. Relação com outras tasks

| Task | Uso deste guia |
| --- | --- |
| T05 | `.env.example`, Compose sem IdP, link para §2 |
| T06 | `UNIQUE(oidcIssuer, oidcSubject)` — não precisa das credenciais |
| T07 | adapter + guard; login real só com §2 preenchida |
| T09 / T13 | usuários ativos como opções; inativos sem nova atribuição |
| T10 | [homologation.md](homologation.md): copiar §3 para env Vercel e retestar callbacks |
| T29 | copiar §4 para secrets e DNS de produção |

Contrato normativo: [docs/identity.md](../identity.md).
