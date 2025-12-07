# CooperLoc CRM

Sistema de gerenciamento de rastreadores para franquias CooperLoc.

## Funcionalidades

- **Autenticação de três níveis**: Admin, Matriz e Franqueado
- **Gestão de Rastreadores**: Cadastro, envio e acompanhamento de rastreadores
- **Gestão de Franquias**: Cadastro e gerenciamento de unidades franqueadas
- **Dashboard**: Visão geral do estoque e movimentações
- **Controle de Acesso**: Permissões baseadas em papéis (RBAC)

## Tecnologias

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS, Shadcn/ui, Radix UI
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Estado**: React Query, React Hook Form
- **Validação**: Zod

## Instalação

1. Clone o repositório:
```bash
git clone <repo-url>
cd cooperloc-crm
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.local.example .env.local
```

Edite o arquivo `.env.local` com suas credenciais do Supabase:
```env
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

4. Configure o banco de dados no Supabase:
   - Acesse o SQL Editor no Supabase
   - Execute o script em `supabase/migrations/001_initial_schema.sql`

5. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

O aplicativo estará disponível em `http://localhost:5000`

## Estrutura do Projeto

```
src/
├── components/       # Componentes React reutilizáveis
│   └── ui/          # Componentes base (Shadcn/ui)
├── pages/           # Páginas/rotas da aplicação
│   └── auth/        # Páginas de autenticação
├── hooks/           # Custom hooks React
├── contexts/        # Context providers (Auth)
├── integrations/    # Integrações externas (Supabase)
├── lib/             # Utilitários
└── App.tsx          # Componente principal com rotas
```

## Níveis de Acesso

### Admin
- Acesso total ao sistema
- Gerenciamento de usuários
- Gerenciamento de franquias
- Gerenciamento de rastreadores

### Matriz (CooperLoc)
- Dashboard com visão geral do estoque
- Envio de rastreadores para franquias
- Gerenciamento de franquias

### Franqueado
- Dashboard com rastreadores recebidos
- Atualização de status (instalado/defeito)

## Scripts Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run preview      # Preview do build
npm run lint         # Executa ESLint
```

## Banco de Dados

O schema do banco de dados inclui:

- **profiles**: Perfis de usuários (extensão do auth.users)
- **franchises**: Franquias cadastradas
- **trackers**: Rastreadores com status e localização
- **tracker_movements**: Histórico de movimentações

### Row Level Security (RLS)

Políticas de segurança implementadas:
- Usuários só podem ver dados permitidos pelo seu papel
- Franqueados só veem rastreadores da sua unidade
- Apenas admin pode excluir registros

## Licença

Propriedade da CooperLoc.
