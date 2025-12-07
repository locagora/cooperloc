-- CooperLoc CRM - Migração: Sistema de Aprovação de Usuários
-- Execute este SQL no Supabase SQL Editor

-- =====================================================
-- 1. CRIAR TIPO ENUM PARA STATUS DO USUÁRIO
-- =====================================================

-- Criar enum para status do usuário
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('pending', 'active', 'blocked', 'inactive');
    END IF;
END $$;

-- =====================================================
-- 2. ADICIONAR COLUNA STATUS NA TABELA PROFILES
-- =====================================================

-- Adicionar coluna status (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'status'
    ) THEN
        ALTER TABLE profiles ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
    END IF;
END $$;

-- Adicionar constraint de check para status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'profiles' AND constraint_name = 'profiles_status_check'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_status_check
        CHECK (status IN ('pending', 'active', 'blocked', 'inactive'));
    END IF;
END $$;

-- =====================================================
-- 3. ATUALIZAR USUÁRIOS EXISTENTES
-- =====================================================

-- Definir todos os usuários existentes como 'active' (já estavam no sistema)
UPDATE profiles SET status = 'active' WHERE status IS NULL OR status = 'pending';

-- =====================================================
-- 4. CRIAR ÍNDICE PARA PERFORMANCE
-- =====================================================

-- Índice para busca por status
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- =====================================================
-- 5. ATUALIZAR TRIGGER DE CRIAÇÃO DE PERFIL
-- =====================================================

-- Atualizar função para criar perfil com status 'pending' no signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name, role, franchise_id, status)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'franqueado',  -- Role padrão para novos usuários
        NULL,          -- Sem franquia até aprovação
        'pending'      -- Status pendente até aprovação do admin
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar trigger (se já existir, substitui)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- 6. POLÍTICAS RLS PARA GERENCIAMENTO DE USUÁRIOS
-- =====================================================

-- Política para admin poder atualizar qualquer perfil
DROP POLICY IF EXISTS "Admin can update any profile" ON profiles;
CREATE POLICY "Admin can update any profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Política para admin poder ver todos os perfis
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
CREATE POLICY "Admin can view all profiles"
    ON profiles FOR SELECT
    TO authenticated
    USING (
        -- Admin pode ver todos
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
        OR
        -- Usuário pode ver o próprio perfil
        id = auth.uid()
    );

-- =====================================================
-- 7. VIEW PARA FACILITAR CONSULTAS DE USUÁRIOS
-- =====================================================

-- Criar view com informações completas dos usuários
CREATE OR REPLACE VIEW users_with_franchise AS
SELECT
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.status,
    p.franchise_id,
    p.created_at,
    p.updated_at,
    f.name as franchise_name,
    f.city as franchise_city,
    f.state as franchise_state
FROM profiles p
LEFT JOIN franchises f ON p.franchise_id = f.id;

-- =====================================================
-- RESUMO DAS ALTERAÇÕES
-- =====================================================
--
-- 1. Adicionado campo 'status' na tabela profiles
--    Valores possíveis: 'pending', 'active', 'blocked', 'inactive'
--
-- 2. Usuários existentes definidos como 'active'
--
-- 3. Novos usuários (via signup) serão criados com:
--    - status: 'pending'
--    - role: 'franqueado'
--    - franchise_id: NULL
--
-- 4. Admin pode aprovar/bloquear usuários atualizando o status
--
-- =====================================================
