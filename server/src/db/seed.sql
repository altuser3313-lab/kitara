INSERT INTO users (role, full_name, email, phone, date_of_birth, allergies_note, password_hash) VALUES
('customer', 'Maya Khoury',           'customer@katara.demo', '+961 70 442 318', '1998-06-12', 'Penicillin allergy noted in childhood. Confirm with physician before related antibiotics.', ':demo'),
('customer', 'Karim Haddad',          'karim@katara.demo',    '+961 71 338 612', '1991-02-04', NULL, ':demo'),
('customer', 'Nadine Saad',           'nadine@katara.demo',   '+961 78 322 211', '1986-11-23', NULL, ':demo'),
('customer', 'Rami Daher',            'rami@katara.demo',     '+961 03 018 430', '1979-09-30', NULL, ':demo'),
('customer', 'Lina Nassar',           'lina@katara.demo',     '+961 70 142 300', '2000-01-17', NULL, ':demo'),
('pharmacy', 'Achrafieh Pharmacy',    'pharmacy@katara.demo', '01-321258',       NULL, NULL, ':demo'),
('pharmacy', 'Hamra City Pharmacy',   'hamra@katara.demo',    '01-343043',       NULL, NULL, ':demo'),
('pharmacy', 'Alam Pharmacy',         'alam@katara.demo',     '06-626000',       NULL, NULL, ':demo'),
('admin',    'Katara Administrator',  'admin@katara.demo',    '+961 1 000 000',  NULL, NULL, ':demo');

INSERT INTO pharmacies (katara_code, name, license_number, owner_name, phone, email, address, city, latitude, longitude, opening_hours, verification_status, subscription_plan, rating) VALUES
('KT-00018', 'Achrafieh Pharmacy',  'LB-PH-48317', 'Dr. Samer K.', '01-321258', 'achrafieh.pharmacy@gmail.com', 'Adib Ishak Street',              'Beirut',               33.886900, 35.519700, '8:00 AM - 10:00 PM', 'verified', 'Professional', 4.9),
('KT-00019', 'Hamra City Pharmacy', 'LB-PH-77104', 'Dr. Rana M.',  '01-343043', 'hamra.city@hotmail.com',      'Hamra Main Street',              'Beirut',               33.895900, 35.479700, '24/7',               'verified', 'Professional', 4.7),
('KT-00020', 'Mazens Pharmacy',     'LB-PH-33711', 'Dr. Jad H.',   '05-500123', 'mazens.pharmacy@yahoo.com',   'Main Road',                      'Beiteddine, Shouf',    33.693900, 35.580600, '8:30 AM - 8:00 PM',  'verified', 'Starter',      4.6),
('KT-00021', 'Abir Pharmacy',       'LB-PH-51902', 'Dr. Tala R.',  '05-300456', 'abir.pharmacy@gmail.com',     'Town Center',                    'Deir el Qamar, Shouf', 33.693900, 35.556700, '9:00 AM - 9:00 PM',  'verified', 'Starter',      4.5),
('KT-00022', 'Alam Pharmacy',       'LB-PH-66421', 'Dr. Elias N.', '06-626000', 'alam.pharmacy@gmail.com',     'Azmi Street',                    'Tripoli',              34.436700, 35.849700, '8:00 AM - 11:00 PM', 'verified', 'Professional', 4.8),
('KT-00023', 'Al Saray Pharmacy',   'LB-PH-28840', 'Dr. Hadi B.',  '07-727400', 'alsaray.pharmacy@hotmail.com','East Boulevard',                 'Sidon',                33.557100, 35.372900, '8:00 AM - 10:00 PM', 'verified', 'Starter',      4.4),
('KT-00024', 'A. Obeid Pharmacy',   'LB-PH-19335', 'Dr. Nour F.',  '08-804839', 'a.obeid.pharmacy@gmail.com',  'Near Libano Francais Hospital',  'Zahle',                33.846300, 35.901900, '8:30 AM - 9:30 PM',  'verified', 'Professional', 4.7),
('KT-00025', 'Greenline Pharmacy',  'LB-PH-99129', 'Dr. Tala K.',  '05-611234', 'greenline.pharmacy@gmail.com','Main Street',                    'Jounieh',              33.980800, 35.617800, '9:00 AM - 9:00 PM',  'pending',  'Professional', 4.5),
('KT-00026', 'Nova Pharmacy',       'LB-PH-66421', 'Dr. Elias N.', '05-455010', 'nova.pharmacy@gmail.com',     'Hazmieh Boulevard',              'Hazmieh',              33.845600, 35.541900, '8:00 AM - 10:00 PM', 'pending',  'Starter',      4.3);

INSERT INTO pharmacy_staff (pharmacy_id, user_id, staff_role) VALUES
((SELECT id FROM pharmacies WHERE katara_code = 'KT-00018'), (SELECT id FROM users WHERE email = 'pharmacy@katara.demo'), 'owner'),
((SELECT id FROM pharmacies WHERE katara_code = 'KT-00019'), (SELECT id FROM users WHERE email = 'hamra@katara.demo'),    'owner'),
((SELECT id FROM pharmacies WHERE katara_code = 'KT-00022'), (SELECT id FROM users WHERE email = 'alam@katara.demo'),     'owner');

INSERT INTO medications (generic_name, brand_name, strength, dosage_form, category, prescription_required, barcode) VALUES
('Paracetamol + Caffeine',      'Panadol Extra',   '500mg / 65mg', 'Tablet',  'Pain Relief',        FALSE, '5000158108806'),
('Amoxicillin',                 'Amoxicillin',     '500mg',        'Capsule', 'Antibiotic',         TRUE,  '5000158201316'),
('Acetylsalicylic acid',        'Aspirin Protect', '100mg',        'Tablet',  'Cardiovascular',     FALSE, '4013054001561'),
('Metformin',                   'Glucophage',      '850mg',        'Tablet',  'Diabetes',           TRUE,  '3582910077114'),
('Diclofenac potassium',        'Cataflam',        '50mg',         'Tablet',  'Anti-inflammatory',  TRUE,  '5060082930041'),
('Amoxicillin + Clavulanate',   'Augmentin',       '1g',           'Tablet',  'Antibiotic',         TRUE,  '5000158022713'),
('Bisoprolol',                  'Concor',          '5mg',          'Tablet',  'Blood Pressure',     TRUE,  '4013054010235'),
('Ibuprofen',                   'Brufen',          '400mg',        'Tablet',  'Pain Relief',        FALSE, '5000158103108'),
('Esomeprazole',                'Nexium',          '40mg',         'Tablet',  'Gastrointestinal',   TRUE,  '5000158091078'),
('Cetirizine',                  'Zyrtec',          '10mg',         'Tablet',  'Antihistamine',      FALSE, '5413760012345');

INSERT INTO pharmacy_inventory (pharmacy_id, medication_id, sku, batch_number, supplier, quantity_on_hand, reorder_level, cost_price, retail_price, expiry_date, last_stock_count_at)
SELECT
    v.pharmacy_id,
    v.medication_id,
    'KT-' || LPAD(v.pharmacy_id::text, 3, '0') || '-' || LPAD(v.medication_id::text, 3, '0'),
    'B' || LPAD(((v.pharmacy_id * 37 + v.medication_id * 11) % 900 + 100)::text, 4, '0'),
    CASE (v.medication_id % 5)
        WHEN 0 THEN 'Mersaco'
        WHEN 1 THEN 'Droguerie Phenicia'
        WHEN 2 THEN 'Omnipharma'
        WHEN 3 THEN 'Benta Trading'
        ELSE 'UPC Lebanon'
    END,
    v.stock_quantity,
    CASE WHEN v.stock_quantity > 100 THEN 40 ELSE 20 END,
    ROUND(m.unit_price * 0.72, 2),
    m.unit_price,
    DATE '2026-09-01' + ((v.pharmacy_id * 53 + v.medication_id * 29) % 700),
    now() - ((v.pharmacy_id + v.medication_id) || ' days')::interval
FROM (VALUES
    (1, 1, 120), (1, 2, 50), (1, 4, 60), (1, 6, 30), (1, 9, 45),
    (2, 1, 90), (2, 3, 150), (2, 5, 80), (2, 7, 110), (2, 8, 65),
    (3, 2, 40), (3, 3, 110), (3, 4, 30), (3, 6, 25), (3, 10, 50),
    (4, 1, 100), (4, 4, 70), (4, 5, 65), (4, 7, 40), (4, 9, 20),
    (5, 1, 200), (5, 2, 85), (5, 6, 90), (5, 8, 130), (5, 10, 75),
    (6, 3, 60), (6, 5, 95), (6, 7, 50), (6, 9, 40), (6, 10, 60),
    (7, 1, 150), (7, 2, 70), (7, 4, 85), (7, 6, 55), (7, 8, 90)
) AS v(pharmacy_id, medication_id, stock_quantity)
JOIN (VALUES
    (1, 185000.00), (2, 450000.00), (3, 150000.00), (4, 320000.00), (5, 210000.00),
    (6, 620000.00), (7, 280000.00), (8, 175000.00), (9, 490000.00), (10, 240000.00)
) AS m(medication_id, unit_price) ON m.medication_id = v.medication_id;

INSERT INTO prescriptions (customer_user_id, file_name, storage_key, content_type, physician_name, issue_date, expiry_date, verification_status) VALUES
((SELECT id FROM users WHERE email = 'customer@katara.demo'), 'prescription-mansour.pdf', 'seed/prescription-mansour.pdf', 'application/pdf', 'Dr. H. Mansour', '2026-08-18', '2027-02-18', 'valid'),
((SELECT id FROM users WHERE email = 'customer@katara.demo'), 'prescription-khoury.pdf',  'seed/prescription-khoury.pdf',  'application/pdf', 'Dr. R. Khoury',  '2026-03-02', '2026-09-02', 'archived');

INSERT INTO reservations (reference, customer_user_id, pharmacy_id, medication_id, requested_medication_text, quantity, prescription_id, status, created_at, responded_at, collected_at) VALUES
('R-3888', (SELECT id FROM users WHERE email = 'customer@katara.demo'), 1, 6,  'Augmentin 1g',     1, (SELECT id FROM prescriptions WHERE file_name = 'prescription-mansour.pdf'), 'pending',   now() - interval '12 minutes', NULL, NULL),
('R-3887', (SELECT id FROM users WHERE email = 'karim@katara.demo'),    1, NULL,'Lipitor 20mg',    2, NULL, 'pending',   now() - interval '28 minutes', NULL, NULL),
('R-3886', (SELECT id FROM users WHERE email = 'nadine@katara.demo'),   1, 1,  'Panadol Extra',    1, NULL, 'accepted',  now() - interval '1 hour',     now() - interval '35 minutes', NULL),
('R-3885', (SELECT id FROM users WHERE email = 'rami@katara.demo'),     1, 7,  'Concor 5mg',       1, NULL, 'collected', now() - interval '1 day',      now() - interval '22 hours', now() - interval '20 hours'),
('R-3884', (SELECT id FROM users WHERE email = 'lina@katara.demo'),     1, 4,  'Glucophage 850mg', 3, NULL, 'declined',  now() - interval '2 days',     now() - interval '2 days', NULL);

INSERT INTO reservation_events (reservation_id, actor_user_id, event_type, from_status, to_status, message)
SELECT r.id, r.customer_user_id, 'created', NULL, 'pending', 'Reservation request submitted.' FROM reservations r;

INSERT INTO pharmacy_verifications (pharmacy_id, submitted_by, status, submitted_at) VALUES
((SELECT id FROM pharmacies WHERE katara_code = 'KT-00025'), (SELECT id FROM users WHERE email = 'admin@katara.demo'), 'pending', '2026-08-25'),
((SELECT id FROM pharmacies WHERE katara_code = 'KT-00026'), (SELECT id FROM users WHERE email = 'admin@katara.demo'), 'pending', '2026-08-26');

INSERT INTO verification_documents (verification_id, document_type, storage_key, status)
SELECT v.id, d.document_type, 'seed/' || v.id || '-' || d.slug || '.pdf', d.status
FROM pharmacy_verifications v
CROSS JOIN (VALUES
    ('Pharmacy license',    'license',  'received'),
    ('Owner identification','owner-id', 'received'),
    ('Location evidence',   'location', 'review')
) AS d(document_type, slug, status);
