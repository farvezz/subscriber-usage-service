-- =====================================================================
-- Q3: Subscriber & Usage SQL
-- Dialect: ANSI SQL / PostgreSQL syntax (works with minor tweaks on
-- MySQL and SQLite too; noted inline where a dialect differs).
-- =====================================================================

-- Reference schema (for context; not part of the graded answer, but
-- included so the queries below are runnable standalone).
CREATE TABLE IF NOT EXISTS subscribers (
    id              VARCHAR(10) PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    plan            VARCHAR(20) NOT NULL,
    activation_date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS usage (
    id             SERIAL PRIMARY KEY,          -- MySQL: INT AUTO_INCREMENT
    subscriber_id  VARCHAR(10) NOT NULL REFERENCES subscribers(id),
    call_minutes   INT NOT NULL,
    sms_count      INT NOT NULL,
    data_usage_mb  NUMERIC NOT NULL,
    ts             TIMESTAMP NOT NULL
);

-- ---------------------------------------------------------------------
-- 1. Insert a new subscriber: Fajar, Basic plan, activated 24-Jan-2024.
-- ---------------------------------------------------------------------
INSERT INTO subscribers (id, name, plan, activation_date)
VALUES ('SUB07', 'Fajar', 'Basic', '2024-01-24');


-- ---------------------------------------------------------------------
-- 2. Update Fajar's plan to Premium.
-- Match by id (safer than matching by name, in case of duplicate names).
-- ---------------------------------------------------------------------
UPDATE subscribers
SET plan = 'Premium'
WHERE id = 'SUB07';


-- ---------------------------------------------------------------------
-- 3. Total data usage (sum of dataUsageMB across all snapshots) for all
--    Premium-plan subscribers.
-- ---------------------------------------------------------------------
SELECT
    s.id,
    s.name,
    SUM(u.data_usage_mb) AS total_data_usage_mb
FROM subscribers s
JOIN usage u ON u.subscriber_id = s.id
WHERE s.plan = 'Premium'
GROUP BY s.id, s.name
ORDER BY total_data_usage_mb DESC;


-- ---------------------------------------------------------------------
-- 4. Top 3 subscribers by total data usage across all snapshots.
-- LEFT JOIN so a subscriber with zero usage still appears (as 0), then
-- LIMIT 3. Swap LIMIT for FETCH FIRST 3 ROWS ONLY on strict-ANSI engines.
-- ---------------------------------------------------------------------
SELECT
    s.id,
    s.name,
    COALESCE(SUM(u.data_usage_mb), 0) AS total_data_usage_mb
FROM subscribers s
LEFT JOIN usage u ON u.subscriber_id = s.id
GROUP BY s.id, s.name
ORDER BY total_data_usage_mb DESC
LIMIT 3;


-- ---------------------------------------------------------------------
-- 5. Subquery: subscribers whose average call minutes per snapshot is
--    <= 30.
-- Two equivalent approaches are given; the first (derived table) is
-- generally clearer to read, the second uses HAVING directly.
-- ---------------------------------------------------------------------

-- 5a. Using a subquery in WHERE ... IN
SELECT s.*
FROM subscribers s
WHERE s.id IN (
    SELECT u.subscriber_id
    FROM usage u
    GROUP BY u.subscriber_id
    HAVING AVG(u.call_minutes) <= 30
);

-- 5b. Equivalent, expressed as a derived table join
SELECT s.*, avg_usage.avg_call_minutes
FROM subscribers s
JOIN (
    SELECT subscriber_id, AVG(call_minutes) AS avg_call_minutes
    FROM usage
    GROUP BY subscriber_id
) avg_usage ON avg_usage.subscriber_id = s.id
WHERE avg_usage.avg_call_minutes <= 30;
