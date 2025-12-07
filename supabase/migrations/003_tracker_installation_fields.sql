-- CooperLoc CRM - Migração: Campos de Instalação do Rastreador
-- Execute este SQL no Supabase SQL Editor

-- =====================================================
-- ADICIONAR CAMPOS DE INSTALAÇÃO NA TABELA TRACKERS
-- =====================================================

-- Campos para informações do cliente/veículo onde o rastreador foi instalado
ALTER TABLE trackers ADD COLUMN IF NOT EXISTS client_cnpj VARCHAR(20);
ALTER TABLE trackers ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
ALTER TABLE trackers ADD COLUMN IF NOT EXISTS client_contact VARCHAR(255);
ALTER TABLE trackers ADD COLUMN IF NOT EXISTS vehicle_chassis VARCHAR(50);
ALTER TABLE trackers ADD COLUMN IF NOT EXISTS vehicle_plate VARCHAR(20);
ALTER TABLE trackers ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50);
ALTER TABLE trackers ADD COLUMN IF NOT EXISTS vehicle_brand VARCHAR(100);
ALTER TABLE trackers ADD COLUMN IF NOT EXISTS vehicle_model VARCHAR(100);
ALTER TABLE trackers ADD COLUMN IF NOT EXISTS vehicle_year VARCHAR(10);
ALTER TABLE trackers ADD COLUMN IF NOT EXISTS installation_month VARCHAR(20);

-- =====================================================
-- RESUMO DOS NOVOS CAMPOS
-- =====================================================
-- client_cnpj: CNPJ do cliente onde foi instalado
-- client_name: Nome da empresa/cliente
-- client_contact: Nome do franqueado/contato responsável
-- vehicle_chassis: Número do chassi do veículo
-- vehicle_plate: Placa do veículo
-- vehicle_type: Tipo do veículo (Carro, Moto, Caminhão, etc)
-- vehicle_brand: Marca do veículo
-- vehicle_model: Modelo do veículo (campo "Moto" na imagem)
-- vehicle_year: Ano do veículo
-- installation_month: Mês de instalação
