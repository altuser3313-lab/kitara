# Katara Backend Contract

The frontend is intentionally separated from persistence. The browser should never connect directly to SQL.

## AWS request path

`Next.js (Amplify Hosting) -> API Gateway + Cognito JWT authorizer -> Lambda -> Aurora SQL`

Prescription documents use:

`Next.js -> API Gateway/Lambda -> presigned URL -> S3`

Customer notifications can use EventBridge/SNS/SES/push after reservation state changes.

## Cognito roles

Recommended user-pool groups:

- `customer`
- `pharmacy`
- `admin`

Pharmacy users should also have a backend-owned `pharmacy_id` association. Never trust a pharmacy ID supplied by the browser as proof of ownership.

## Core SQL entities

### users
- id (UUID, PK)
- cognito_sub (unique)
- role
- full_name
- email
- phone
- date_of_birth
- created_at / updated_at

### pharmacies
- id (UUID, PK)
- katara_code
- name
- license_number
- owner_name
- phone / email
- address
- latitude / longitude
- opening_hours (JSON or normalized table)
- verification_status
- subscription_plan
- created_at / updated_at

### pharmacy_staff
- id
- pharmacy_id (FK)
- user_id (FK)
- staff_role
- active

### medications
Master drug catalog.
- id
- generic_name
- brand_name
- strength
- dosage_form
- category
- prescription_required
- barcode / normalized identifiers

### pharmacy_inventory
The pharmacy-owned stock table surfaced in the Inventory page.
- id
- pharmacy_id (FK)
- medication_id (FK)
- sku
- batch_number
- supplier
- quantity_on_hand
- reorder_level
- cost_price
- retail_price
- expiry_date
- last_stock_count_at
- updated_at

### inventory_movements
- id
- pharmacy_inventory_id
- type (receive, dispense, adjust, expire, reserve, release)
- quantity
- reference_id
- performed_by
- created_at

### prescriptions
- id
- customer_user_id
- s3_object_key
- physician_name
- issue_date
- expiry_date
- verification_status
- created_at

### reservations
- id
- customer_user_id
- pharmacy_id
- medication_id or requested_medication_text
- quantity
- prescription_id nullable
- status (pending, accepted, declined, ready, collected, cancelled, expired)
- customer_note
- pharmacy_note
- created_at / responded_at / collected_at

### reservation_events
Append-only history for customer reachout/audit.
- id
- reservation_id
- actor_user_id
- event_type
- from_status / to_status
- message
- created_at

### forecasts
- id
- pharmacy_id
- medication_id
- generated_at
- horizon_days
- predicted_daily_demand
- predicted_stockout_date
- confidence
- recommended_reorder_quantity
- explanation (JSON)

### pharmacy_verifications
- id
- pharmacy_id
- submitted_by
- status
- reviewer_user_id
- review_notes
- submitted_at / reviewed_at

### verification_documents
- id
- verification_id
- document_type
- s3_object_key
- status

## API endpoints anticipated by the frontend

Customer:
- `GET /pharmacies?lat=&lng=&medicine=`
- `GET /pharmacies/{id}`
- `POST /reservations`
- `GET /me/reservations`
- `GET/PATCH /me/profile`
- `GET /me/medication-history`
- `POST /prescriptions/upload-url`
- `POST /prescriptions`
- `GET /prescriptions`
- `POST /ai/substitutes`

Pharmacy:
- `GET /pharmacy/inventory`
- `POST /pharmacy/inventory`
- `PATCH /pharmacy/inventory/{id}`
- `GET /pharmacy/reservations`
- `PATCH /pharmacy/reservations/{id}/status`
- `GET /pharmacy/customer-history/{customerId}`
- `GET /pharmacy/forecasts`
- `POST /pharmacy/forecasts/run`
- `GET/PATCH /pharmacy/profile`
- `GET/POST/PATCH /pharmacy/staff`

Admin:
- `GET /admin/dashboard`
- `GET /admin/pharmacies`
- `GET /admin/pharmacies/{id}`
- `GET /admin/verifications`
- `GET /admin/verifications/{id}`
- `POST /admin/verifications/{id}/approve`
- `POST /admin/verifications/{id}/reject`

## Important authorization rules

1. API Gateway validates Cognito JWTs.
2. Lambda derives the Cognito `sub` and role from verified claims.
3. Pharmacy endpoints derive `pharmacy_id` from the authenticated staff relationship, not request input.
4. Customers only read their own profile, prescriptions, and reservation history.
5. Admin endpoints require the admin group and should be separately logged/audited.
6. S3 prescription objects remain private; the backend issues short-lived signed URLs only after authorization.
7. AI endpoints receive only the minimum patient data needed for the request and should log model/version/output metadata separately from clinical records.
