DROP TABLE IF EXISTS verification_documents CASCADE;
DROP TABLE IF EXISTS pharmacy_verifications CASCADE;
DROP TABLE IF EXISTS reservation_events CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS pharmacy_inventory CASCADE;
DROP TABLE IF EXISTS medications CASCADE;
DROP TABLE IF EXISTS pharmacy_staff CASCADE;
DROP TABLE IF EXISTS pharmacies CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id             SERIAL PRIMARY KEY,
    cognito_sub    VARCHAR(255) UNIQUE,
    role           VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'pharmacy', 'admin')),
    full_name      VARCHAR(255) NOT NULL,
    email          VARCHAR(255) NOT NULL UNIQUE,
    phone          VARCHAR(50),
    date_of_birth  DATE,
    allergies_note TEXT,
    password_hash  TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pharmacies (
    id                  SERIAL PRIMARY KEY,
    katara_code         VARCHAR(20) NOT NULL UNIQUE,
    name                VARCHAR(255) NOT NULL,
    license_number      VARCHAR(50),
    owner_name          VARCHAR(255),
    phone               VARCHAR(50),
    email               VARCHAR(255),
    address             VARCHAR(255),
    city                VARCHAR(100),
    latitude            NUMERIC(9, 6),
    longitude           NUMERIC(9, 6),
    opening_hours       VARCHAR(100),
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    subscription_plan   VARCHAR(50) NOT NULL DEFAULT 'Starter',
    rating              NUMERIC(2, 1) DEFAULT 4.5,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pharmacy_staff (
    id          SERIAL PRIMARY KEY,
    pharmacy_id INT NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    staff_role  VARCHAR(50) NOT NULL DEFAULT 'pharmacist',
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (pharmacy_id, user_id)
);

CREATE TABLE medications (
    id                    SERIAL PRIMARY KEY,
    generic_name          VARCHAR(255) NOT NULL,
    brand_name            VARCHAR(255) NOT NULL,
    strength              VARCHAR(100),
    dosage_form           VARCHAR(50),
    category              VARCHAR(100),
    prescription_required BOOLEAN NOT NULL DEFAULT FALSE,
    barcode               VARCHAR(50)
);

CREATE TABLE pharmacy_inventory (
    id                  SERIAL PRIMARY KEY,
    pharmacy_id         INT NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    medication_id       INT NOT NULL REFERENCES medications(id),
    sku                 VARCHAR(50),
    batch_number        VARCHAR(50),
    supplier            VARCHAR(100),
    quantity_on_hand    INT NOT NULL DEFAULT 0,
    reorder_level       INT NOT NULL DEFAULT 20,
    cost_price          NUMERIC(12, 2),
    retail_price        NUMERIC(12, 2),
    expiry_date         DATE,
    last_stock_count_at TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (pharmacy_id, medication_id, batch_number)
);

CREATE TABLE inventory_movements (
    id                    SERIAL PRIMARY KEY,
    pharmacy_inventory_id INT NOT NULL REFERENCES pharmacy_inventory(id) ON DELETE CASCADE,
    type                  VARCHAR(20) NOT NULL
                          CHECK (type IN ('receive', 'dispense', 'adjust', 'expire', 'reserve', 'release')),
    quantity              INT NOT NULL,
    reference_id          VARCHAR(50),
    performed_by          INT REFERENCES users(id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE prescriptions (
    id                  SERIAL PRIMARY KEY,
    customer_user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name           VARCHAR(255),
    storage_key         VARCHAR(500),
    content_type        VARCHAR(100),
    physician_name      VARCHAR(255),
    issue_date          DATE,
    expiry_date         DATE,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (verification_status IN ('pending', 'valid', 'rejected', 'archived')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reservations (
    id                         SERIAL PRIMARY KEY,
    reference                  VARCHAR(20) NOT NULL UNIQUE,
    customer_user_id           INT NOT NULL REFERENCES users(id),
    pharmacy_id                INT NOT NULL REFERENCES pharmacies(id),
    medication_id              INT REFERENCES medications(id),
    requested_medication_text  VARCHAR(255),
    quantity                   INT NOT NULL DEFAULT 1,
    prescription_id            INT REFERENCES prescriptions(id),
    status                     VARCHAR(20) NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'accepted', 'declined', 'ready', 'collected', 'cancelled', 'expired')),
    customer_note              TEXT,
    pharmacy_note              TEXT,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at               TIMESTAMPTZ,
    collected_at               TIMESTAMPTZ
);

CREATE TABLE reservation_events (
    id             SERIAL PRIMARY KEY,
    reservation_id INT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    actor_user_id  INT REFERENCES users(id),
    event_type     VARCHAR(50) NOT NULL,
    from_status    VARCHAR(20),
    to_status      VARCHAR(20),
    message        TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pharmacy_verifications (
    id               SERIAL PRIMARY KEY,
    pharmacy_id      INT NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    submitted_by     INT REFERENCES users(id),
    status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewer_user_id INT REFERENCES users(id),
    review_notes     TEXT,
    submitted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at      TIMESTAMPTZ
);

CREATE TABLE verification_documents (
    id              SERIAL PRIMARY KEY,
    verification_id INT NOT NULL REFERENCES pharmacy_verifications(id) ON DELETE CASCADE,
    document_type   VARCHAR(100) NOT NULL,
    storage_key     VARCHAR(500),
    status          VARCHAR(20) NOT NULL DEFAULT 'received'
                    CHECK (status IN ('received', 'review', 'rejected'))
);

CREATE INDEX idx_inventory_pharmacy   ON pharmacy_inventory (pharmacy_id);
CREATE INDEX idx_inventory_medication ON pharmacy_inventory (medication_id);
CREATE INDEX idx_reservations_pharmacy ON reservations (pharmacy_id, status);
CREATE INDEX idx_reservations_customer ON reservations (customer_user_id);
CREATE INDEX idx_staff_user            ON pharmacy_staff (user_id);
CREATE INDEX idx_events_reservation    ON reservation_events (reservation_id);
