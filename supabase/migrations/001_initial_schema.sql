-- CooperLoc CRM Database Schema
-- Execute this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'matriz', 'franqueado');
CREATE TYPE tracker_status AS ENUM ('estoque', 'enviado', 'instalado', 'defeito');

-- Franchises table
CREATE TABLE IF NOT EXISTS franchises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    phone VARCHAR(20),
    email VARCHAR(255),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role user_role NOT NULL DEFAULT 'franqueado',
    franchise_id UUID REFERENCES franchises(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trackers table
CREATE TABLE IF NOT EXISTS trackers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    model VARCHAR(100),
    status tracker_status DEFAULT 'estoque',
    franchise_id UUID REFERENCES franchises(id) ON DELETE SET NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    installed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tracker movements table (audit trail)
CREATE TABLE IF NOT EXISTS tracker_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracker_id UUID NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
    from_status VARCHAR(50) NOT NULL,
    to_status VARCHAR(50) NOT NULL,
    from_franchise_id UUID REFERENCES franchises(id) ON DELETE SET NULL,
    to_franchise_id UUID REFERENCES franchises(id) ON DELETE SET NULL,
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trackers_status ON trackers(status);
CREATE INDEX IF NOT EXISTS idx_trackers_franchise_id ON trackers(franchise_id);
CREATE INDEX IF NOT EXISTS idx_trackers_serial_number ON trackers(serial_number);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_franchise_id ON profiles(franchise_id);
CREATE INDEX IF NOT EXISTS idx_tracker_movements_tracker_id ON tracker_movements(tracker_id);
CREATE INDEX IF NOT EXISTS idx_tracker_movements_created_at ON tracker_movements(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_franchises_updated_at
    BEFORE UPDATE ON franchises
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trackers_updated_at
    BEFORE UPDATE ON trackers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name, role, franchise_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'franqueado'),
        (NEW.raw_user_meta_data->>'franchise_id')::UUID
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Function to log tracker movements
CREATE OR REPLACE FUNCTION log_tracker_movement()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status OR OLD.franchise_id IS DISTINCT FROM NEW.franchise_id THEN
        INSERT INTO tracker_movements (
            tracker_id,
            from_status,
            to_status,
            from_franchise_id,
            to_franchise_id,
            created_by
        )
        VALUES (
            NEW.id,
            COALESCE(OLD.status::text, 'new'),
            NEW.status::text,
            OLD.franchise_id,
            NEW.franchise_id,
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for tracker movements
CREATE TRIGGER on_tracker_update
    AFTER UPDATE ON trackers
    FOR EACH ROW
    EXECUTE FUNCTION log_tracker_movement();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracker_movements ENABLE ROW LEVEL SECURITY;

-- Franchises policies
CREATE POLICY "Franchises are viewable by authenticated users"
    ON franchises FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Franchises are insertable by admin and matriz"
    ON franchises FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'matriz')
        )
    );

CREATE POLICY "Franchises are updatable by admin and matriz"
    ON franchises FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'matriz')
        )
    );

CREATE POLICY "Franchises are deletable by admin"
    ON franchises FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Profiles policies
CREATE POLICY "Profiles are viewable by authenticated users"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Profiles are insertable during signup"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- Trackers policies
CREATE POLICY "Trackers are viewable by admin and matriz"
    ON trackers FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'matriz')
        )
        OR
        (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'franqueado'
                AND profiles.franchise_id = trackers.franchise_id
            )
        )
    );

CREATE POLICY "Trackers are insertable by admin and matriz"
    ON trackers FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'matriz')
        )
    );

CREATE POLICY "Trackers are updatable by admin, matriz and franchise owner"
    ON trackers FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'matriz')
        )
        OR
        (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'franqueado'
                AND profiles.franchise_id = trackers.franchise_id
            )
        )
    );

CREATE POLICY "Trackers are deletable by admin"
    ON trackers FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Tracker movements policies
CREATE POLICY "Tracker movements are viewable by authenticated users"
    ON tracker_movements FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Tracker movements are insertable by system"
    ON tracker_movements FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Insert some initial data (optional - for testing)
-- Uncomment and modify as needed

-- INSERT INTO franchises (name, city, state, active) VALUES
--     ('CooperLoc Matriz', 'São Paulo', 'SP', true),
--     ('CooperLoc Rio de Janeiro', 'Rio de Janeiro', 'RJ', true),
--     ('CooperLoc Belo Horizonte', 'Belo Horizonte', 'MG', true);
