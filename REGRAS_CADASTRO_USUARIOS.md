# Regras de Cadastro de Usuários - City Scope CRM

## Visão Geral

Este documento descreve as regras completas de cadastro, aprovação e gerenciamento de usuários do sistema City Scope CRM.

---

## 1. Estrutura da Tabela `app_users`

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | UUID | Sim | Identificador único (gerado pelo Supabase Auth) |
| `email` | VARCHAR | Sim | Email do usuário (único) |
| `name` | VARCHAR | Não | Nome completo do usuário |
| `role` | ENUM | Sim | Papel do usuário: `admin`, `master_br`, `regional`, `franchisee` |
| `regional_type` | ENUM | Condicional | Subtipo: `admin` ou `simples` (obrigatório se role='regional') |
| `master_type` | ENUM | Condicional | Subtipo: `admin` ou `simples` (obrigatório se role='master_br') |
| `city_id` | UUID | Condicional | Obrigatório para `regional` e `franchisee` |
| `franchisee_id` | UUID | Condicional | Obrigatório apenas para `franchisee` |
| `status` | ENUM | Sim | Status: `pending`, `active`, `blocked`, `inactive` |
| `plugsign_token` | VARCHAR | Não | Token para assinatura digital |
| `created_at` | TIMESTAMP | Sim | Data de criação (auto) |
| `updated_at` | TIMESTAMP | Não | Data de última atualização |

---

## 2. Hierarquia de Usuários (Roles)

```
                        ADMIN (Sistema)
                            │
                    ┌───────┴───────┐
                    │               │
            MASTER BR (Global)   REGIONAL (Cidade)
                │                   │
        ┌───────┴───────┐    ┌──────┴────────┐
        │               │    │               │
    Master BR       Master BR    Regional     Regional
      Admin          Simples      Admin       Simples
   (Acesso total)  (Read-only)  (Gerencia)   (Limitado)
                                    │
                                FRANCHISEE
                            (Próprio negócio)
```

### Descrição de Cada Role

| Role | Descrição | city_id | franchisee_id |
|------|-----------|---------|---------------|
| **ADMIN** | Acesso total ao sistema | null | null |
| **MASTER BR** | Visualização global, sem restrição geográfica | null | null |
| **REGIONAL** | Gerencia dados de uma cidade específica | Obrigatório | null |
| **FRANCHISEE** | Acesso apenas aos dados da própria franquia | Obrigatório | Obrigatório |

### Subtipos

- **Admin**: Acesso total aos menus do seu escopo
- **Simples**: Acesso apenas aos menus liberados manualmente por um admin

---

## 3. Fluxo de Criação de Usuário

### Passo 1: Registro (Self-Service)

1. Usuário acessa página de login (`/auth`)
2. Clica em "Criar Conta"
3. Preenche **Email** e **Senha**
4. Sistema cria conta no Supabase Auth
5. Registro automático em `app_users` com:
   - `status`: 'pending'
   - `role`: 'regional' (placeholder)
   - Demais campos: null

### Passo 2: Aprovação pelo Administrador

1. Admin acessa painel de gerenciamento de usuários
2. Visualiza usuários com status 'pending'
3. Seleciona usuário e clica "Aprovar"
4. Configura:
   - **Tipo de usuário** (role)
   - **Subtipo** (admin/simples) se aplicável
   - **Cidade** (se regional ou franchisee)
   - **Franqueado** (se franchisee)
5. Sistema atualiza registro para `status: 'active'`

### Passo 3: Configuração de Permissões (para "simples")

Para usuários com subtipo "simples":
1. Admin/Manager acessa gerenciamento de permissões
2. Seleciona menus que o usuário pode acessar
3. Permissões salvas na tabela `user_menu_permissions`

---

## 4. Validações

### Validação de Senha

```
- Mínimo 8 caracteres
- Máximo 128 caracteres
- Deve conter:
  - Pelo menos 1 letra minúscula
  - Pelo menos 1 letra maiúscula
  - Pelo menos 1 número
  - Pelo menos 1 caractere especial (!@#$%^&*...)
- Não pode conter padrões comuns (123, abc, password, admin)
```

### Validação de Email

```
- Obrigatório
- Formato válido de email
- Máximo 254 caracteres
- Convertido para minúsculas
- Único no sistema
```

### Validação por Role

| Role | Validações Específicas |
|------|----------------------|
| **ADMIN** | city_id deve ser null, franchisee_id deve ser null |
| **MASTER BR** | city_id deve ser null, master_type obrigatório |
| **REGIONAL** | city_id obrigatório, regional_type obrigatório |
| **FRANCHISEE** | city_id obrigatório, franchisee_id obrigatório, máx. 3 usuários por franquia |

### Validação de Nome

```
- Mínimo 3 caracteres (se preenchido)
- Máximo 100 caracteres
- Apenas letras, acentos, espaços e hífens
```

---

## 5. Status do Usuário

| Status | Descrição | Comportamento no Login |
|--------|-----------|----------------------|
| `pending` | Aguardando aprovação | Logout automático + mensagem |
| `active` | Aprovado e ativo | Login permitido |
| `blocked` | Bloqueado pelo admin | Logout automático + mensagem |
| `inactive` | Inativo | Logout automático + mensagem |

---

## 6. Tabelas do Banco de Dados

### `app_users`
Tabela principal de usuários do sistema.

```sql
CREATE TABLE app_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(254) UNIQUE NOT NULL,
  name VARCHAR(100),
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'master_br', 'regional', 'franchisee')),
  regional_type VARCHAR(10) CHECK (regional_type IN ('admin', 'simples')),
  master_type VARCHAR(10) CHECK (master_type IN ('admin', 'simples')),
  city_id UUID REFERENCES cities(id),
  franchisee_id UUID REFERENCES franchisees(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'blocked', 'inactive')),
  plugsign_token VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);
```

### `user_menu_permissions`
Permissões granulares de menu para usuários "simples".

```sql
CREATE TABLE user_menu_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES system_menus(id) ON DELETE CASCADE,
  has_access BOOLEAN DEFAULT false,
  granted_by UUID REFERENCES app_users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, menu_id)
);
```

### `system_menus`
Lista de menus do sistema.

```sql
CREATE TABLE system_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  path VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  order_index INTEGER DEFAULT 0,
  role_required VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 7. Permissões por Role

### Acesso a Funcionalidades

| Funcionalidade | Admin | Master BR Admin | Master BR Simples | Regional Admin | Regional Simples | Franchisee |
|----------------|-------|-----------------|-------------------|----------------|------------------|------------|
| Gerenciar Usuários | ✓ | ✓ | ✗ | ✓ (sua cidade) | ✗ | ✗ |
| Ver Todas Cidades | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Ver Dados Cidade | ✓ | ✓ | ✓ | ✓ (sua cidade) | ✓ (sua cidade) | ✗ |
| Ver Dados Franquia | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (sua franquia) |
| Aprovar Usuários | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Gerenciar Permissões | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ |

### Lógica de Verificação

```typescript
// Verificação de permissão de menu
function hasPermission(user: AppUser, menuPath: string): boolean {
  // Admin e Master BR Admin: acesso total
  if (user.role === 'admin') return true;
  if (user.role === 'master_br' && user.master_type === 'admin') return true;

  // Regional Admin: acesso total à sua cidade
  if (user.role === 'regional' && user.regional_type === 'admin') return true;

  // Franchisee: acesso às rotas de franqueado
  if (user.role === 'franchisee') return true;

  // Usuários "simples": verificar permissões específicas
  return checkMenuPermission(user.id, menuPath);
}
```

---

## 8. Ações Administrativas

### Ações Disponíveis

| Ação | Descrição | Quem Pode Executar |
|------|-----------|-------------------|
| **Aprovar Usuário** | Muda status de pending → active | Admin |
| **Bloquear Usuário** | Muda status para blocked | Admin, Master BR Admin |
| **Desbloquear Usuário** | Muda status blocked → active | Admin, Master BR Admin |
| **Editar Usuário** | Altera dados do usuário | Admin |
| **Gerenciar Permissões** | Define acesso a menus | Admin, Master BR Admin, Regional Admin |
| **Resetar Senha** | Envia link de redefinição | Admin |
| **Excluir Usuário** | Remove usuário do sistema | Admin |

### Promoção/Rebaixamento

```typescript
// Promover para Admin
promoteToAdmin(userId): role → 'admin', city_id → null

// Promover para Master BR
promoteToMasterBr(userId, masterType): role → 'master_br', master_type → masterType

// Rebaixar para Regional
demoteToRegional(userId, cityId, regionalType): role → 'regional', city_id → cityId
```

---

## 9. Fluxo de Autenticação

```
1. Usuário insere email/senha
   ↓
2. Supabase valida credenciais
   ↓
3. Se inválidas → erro "Credenciais inválidas"
   ↓
4. Se válidas → busca registro em app_users
   ↓
5. Verifica status:
   ├─ pending → Logout + "Aguardando aprovação"
   ├─ inactive → Logout + "Cadastro inativo"
   ├─ blocked → Logout + "Acesso bloqueado"
   └─ active → Continua
   ↓
6. Valida configuração:
   ├─ (regional || franchisee) && !city_id → "Configuração incompleta"
   └─ franchisee && !franchisee_id → "Configuração incompleta"
   ↓
7. Login bem-sucedido → Carrega dados no contexto
   ↓
8. Redireciona para dashboard
```

---

## 10. Regras de Negócio Especiais

### Limite de Usuários por Franquia
- Máximo de **3 usuários** por franqueado
- Erro ao tentar adicionar 4º usuário

### Token PlugSign
- Usado para assinatura digital
- Verificação: não pode haver 2 regionais da mesma cidade com token

### Usuários "Simples"
- Não têm acesso automático a menus
- Precisam de permissões explícitas
- Permissões gerenciadas por admins do nível superior

---

## 11. Exemplo de Workflow

### Criando um Usuário Regional

1. **Novo usuário faz registro:**
   ```json
   {
     "email": "joao@example.com",
     "role": "regional",
     "status": "pending",
     "city_id": null
   }
   ```

2. **Admin aprova o usuário:**
   ```json
   {
     "email": "joao@example.com",
     "role": "regional",
     "regional_type": "simples",
     "status": "active",
     "city_id": "uuid-cidade-sp"
   }
   ```

3. **Admin configura permissões:**
   ```json
   [
     { "menu_id": "menu-locacoes", "has_access": true },
     { "menu_id": "menu-clientes", "has_access": true },
     { "menu_id": "menu-financeiro", "has_access": false }
   ]
   ```

4. **Usuário faz login:**
   - Vê apenas menus "Locações" e "Clientes"

---

## 12. Arquivos de Referência no Código

| Funcionalidade | Arquivo |
|----------------|---------|
| Hook de Autenticação | `src/hooks/useAuth.tsx` |
| Gerenciamento Admin | `src/pages/AdminUserManagement.tsx` |
| Gerenciamento Master BR | `src/pages/MasterUserManagement.tsx` |
| Gerenciamento Regional | `src/pages/RegionalUserManagement.tsx` |
| Permissões de Menu | `src/hooks/useMenuPermissions.ts` |
| Rota Protegida | `src/components/ProtectedRoute.tsx` |
| Página de Login | `src/pages/Auth.tsx` |

---

## 13. SQL para Criação Inicial

```sql
-- Criar tipos ENUM (se usando PostgreSQL puro)
CREATE TYPE user_role AS ENUM ('admin', 'master_br', 'regional', 'franchisee');
CREATE TYPE user_status AS ENUM ('pending', 'active', 'blocked', 'inactive');
CREATE TYPE user_subtype AS ENUM ('admin', 'simples');

-- Criar tabela app_users
CREATE TABLE app_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(254) UNIQUE NOT NULL,
  name VARCHAR(100),
  role user_role NOT NULL DEFAULT 'regional',
  regional_type user_subtype,
  master_type user_subtype,
  city_id UUID REFERENCES cities(id),
  franchisee_id UUID REFERENCES franchisees(id),
  status user_status NOT NULL DEFAULT 'pending',
  plugsign_token VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT regional_must_have_city CHECK (
    role != 'regional' OR city_id IS NOT NULL
  ),
  CONSTRAINT franchisee_must_have_city_and_franchise CHECK (
    role != 'franchisee' OR (city_id IS NOT NULL AND franchisee_id IS NOT NULL)
  ),
  CONSTRAINT regional_must_have_type CHECK (
    role != 'regional' OR regional_type IS NOT NULL
  ),
  CONSTRAINT master_must_have_type CHECK (
    role != 'master_br' OR master_type IS NOT NULL
  )
);

-- Criar índices
CREATE INDEX idx_app_users_email ON app_users(email);
CREATE INDEX idx_app_users_role ON app_users(role);
CREATE INDEX idx_app_users_status ON app_users(status);
CREATE INDEX idx_app_users_city ON app_users(city_id);
CREATE INDEX idx_app_users_franchisee ON app_users(franchisee_id);

-- Trigger para criar app_user automaticamente após signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.app_users (id, email, status, role)
  VALUES (NEW.id, NEW.email, 'pending', 'regional');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

*Documento criado em: Dezembro 2024*
*Projeto: City Scope CRM - Master Brasil*
