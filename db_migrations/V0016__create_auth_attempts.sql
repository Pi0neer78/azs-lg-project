CREATE TABLE IF NOT EXISTS t_p39946729_azs_lg_project.auth_attempts (
  id SERIAL PRIMARY KEY,
  login VARCHAR(255) NOT NULL,
  ip VARCHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_login ON t_p39946729_azs_lg_project.auth_attempts(login, created_at);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip ON t_p39946729_azs_lg_project.auth_attempts(ip, created_at);