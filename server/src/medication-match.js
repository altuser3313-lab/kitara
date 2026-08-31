export const MEDICATION_MATCH = `(
     $1::text ILIKE '%' || m.brand_name || '%'
  OR $1::text ILIKE '%' || m.generic_name || '%'
  OR m.brand_name ILIKE '%' || $1::text || '%'
  OR m.generic_name ILIKE '%' || $1::text || '%'
  OR m.category ILIKE '%' || $1::text || '%'
)`;

export const MEDICATION_RANK = `CASE
    WHEN lower(trim(m.brand_name || ' ' || COALESCE(m.strength, ''))) = lower(trim($1::text)) THEN 0
    WHEN lower(m.brand_name)   = lower(trim($1::text)) THEN 1
    WHEN lower(m.generic_name) = lower(trim($1::text)) THEN 2
    WHEN $1::text ILIKE '%' || m.brand_name || '%' THEN 3
    WHEN m.brand_name ILIKE '%' || $1::text || '%' THEN 4
    WHEN m.generic_name ILIKE '%' || $1::text || '%' THEN 5
    ELSE 6
  END`;
